import * as THREE from 'three';
import type { MatchState } from '@/sim/MatchState';
import { Building } from '@/sim/entities/Entity';
import { buildBuilding } from './art';
import { buildScaffoldMesh } from './art/buildings';

interface Tracked {
  mesh: THREE.Group;
  scaffold: THREE.Group | null;
  wasComplete: boolean;
  /** Fortress tier / house level baked into the current mesh. */
  variant: number;
  /** Banner cloth meshes (tagged by primitives.banner) for the flutter pass. */
  cloths: THREE.Object3D[];
  /** World-space chimney tip, if this building smokes. */
  smokeAt: THREE.Vector3 | null;
  nextPuffMs: number;
}

/** Local chimney offsets per mesh key (buildings that emit smoke). */
const SMOKERS: Record<string, [number, number, number]> = {
  forge: [0.6, 2.5, -0.4],
  blacksmith: [-0.6, 2.3, -0.4],
  fireOilFoundry: [0.7, 2.3, 0.6],
  sunfireYard: [0.8, 1.1, 0.8],
};

const MAX_PUFFS = 64;

interface Puff {
  x: number;
  y: number;
  z: number;
  bornMs: number;
  lifeMs: number;
  drift: number;
}

/**
 * One Group per building (buildings are few). Under-construction buildings
 * show a scaffold and the real mesh rises from the ground as progress grows.
 * Also runs the ambient-life pass: fluttering banners and chimney smoke.
 */
export class BuildingView {
  readonly root = new THREE.Group();
  private tracked = new Map<number, Tracked>();
  private state: MatchState;
  private puffs: Puff[] = [];
  private puffMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  /** Optional fog filter: return false to hide (enemy building in fog). */
  visibleFilter: ((b: Building) => boolean) | null = null;

  constructor(state: MatchState) {
    this.state = state;
    this.puffMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.3, 6, 5),
      new THREE.MeshLambertMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.4, depthWrite: false }),
      MAX_PUFFS,
    );
    this.puffMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.puffMesh.frustumCulled = false;
    this.puffMesh.count = 0;
    this.root.add(this.puffMesh);
  }

  /** Current visual variant: fortress tier or house level. */
  private variantOf(b: Building): number {
    if (b.def.kind === 'fortress') return this.state.players[b.player]?.tier ?? 1;
    return b.level;
  }

  /** Chimney tip for smoking buildings (level-3 houses smoke too). */
  private smokeOffset(b: Building): [number, number, number] | null {
    if (b.def.mesh === 'house' && b.level >= 3) return [0.6, 3.0, -0.4];
    return SMOKERS[b.def.mesh] ?? null;
  }

  update(timeMs = performance.now()): void {
    const seen = new Set<number>();
    for (const b of this.state.buildings) {
      if (b.dead) continue;
      seen.add(b.id);
      let t = this.tracked.get(b.id);
      const variant = this.variantOf(b);
      if (t && t.variant !== variant) {
        // Keep grew a tier / house leveled up: swap in the bigger mesh.
        t.mesh.removeFromParent();
        t.scaffold?.removeFromParent();
        this.tracked.delete(b.id);
        t = undefined;
      }
      if (!t) {
        const color = this.state.players[b.player]?.faction.colorPrimary ?? 0x888888;
        const faction = this.state.players[b.player]?.faction.id ?? '';
        const mesh = buildBuilding(b.def.mesh, faction, color, {
          tier: variant,
          level: variant,
          footprint: b.def.footprint as [number, number],
        });
        mesh.position.set(b.pos.x, 0, b.pos.y);
        const scaffold = b.underConstruction ? buildScaffoldMesh(b.def.footprint) : null;
        if (scaffold) {
          scaffold.position.set(b.pos.x, 0, b.pos.y);
          this.root.add(scaffold);
        }
        this.root.add(mesh);
        const cloths: THREE.Object3D[] = [];
        mesh.traverse((o) => {
          if (o.userData.bannerCloth) cloths.push(o);
        });
        const off = this.smokeOffset(b);
        const smokeAt = off ? new THREE.Vector3(b.pos.x + off[0], off[1], b.pos.y + off[2]) : null;
        t = { mesh, scaffold, wasComplete: b.complete, variant, cloths, smokeAt, nextPuffMs: timeMs + Math.random() * 1500 };
        this.tracked.set(b.id, t);

      }

      const visible = this.visibleFilter ? this.visibleFilter(b) : true;
      t.mesh.visible = visible;
      if (t.scaffold) t.scaffold.visible = visible && b.underConstruction;

      if (b.underConstruction) {
        // Building rises out of the ground with progress.
        const p = Math.max(0.05, b.progress);
        t.mesh.scale.y = p;
        t.mesh.position.y = 0;
      } else {
        t.mesh.scale.y = 1;
        if (!t.wasComplete) {
          t.wasComplete = true;
          if (t.scaffold) {
            t.scaffold.removeFromParent();
            t.scaffold = null;
          }
        }
        // Banners flutter in the wind.
        for (const cloth of t.cloths) {
          const phase = cloth.userData.flutterPhase as number;
          cloth.rotation.y = Math.sin(timeMs * 0.0021 + phase) * 0.22;
          cloth.rotation.x = Math.sin(timeMs * 0.0033 + phase * 1.7) * 0.08;
        }
        // Chimneys puff lazily while the building works.
        if (visible && t.smokeAt && timeMs >= t.nextPuffMs && this.puffs.length < MAX_PUFFS) {
          t.nextPuffMs = timeMs + 1100 + Math.random() * 900;
          this.puffs.push({
            x: t.smokeAt.x,
            y: t.smokeAt.y,
            z: t.smokeAt.z,
            bornMs: timeMs,
            lifeMs: 2400 + Math.random() * 800,
            drift: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    // Remove destroyed buildings.
    for (const [id, t] of this.tracked) {
      if (!seen.has(id)) {
        t.mesh.removeFromParent();
        t.scaffold?.removeFromParent();
        this.tracked.delete(id);
      }
    }

    // Smoke puffs rise, drift, swell, and vanish.
    let count = 0;
    this.puffs = this.puffs.filter((p) => {
      const age = (timeMs - p.bornMs) / p.lifeMs;
      if (age >= 1) return false;
      if (count < MAX_PUFFS) {
        this.dummy.position.set(
          p.x + Math.cos(p.drift) * age * 0.7,
          p.y + age * 2.2,
          p.z + Math.sin(p.drift) * age * 0.7,
        );
        this.dummy.rotation.set(0, 0, 0);
        // Swell while rising, then shrink out instead of popping.
        const swell = 0.5 + age * 1.4;
        this.dummy.scale.setScalar(age > 0.75 ? swell * (1 - (age - 0.75) / 0.25) : swell);
        this.dummy.updateMatrix();
        this.puffMesh.setMatrixAt(count++, this.dummy.matrix);
      }
      return true;
    });
    this.puffMesh.count = count;
    this.puffMesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}

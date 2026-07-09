import * as THREE from 'three';
import type { MatchState } from '@/sim/MatchState';
import { Building } from '@/sim/entities/Entity';
import { buildBuildingMesh, buildScaffoldMesh } from './meshes/buildingMeshes';
import { banner } from './meshes/primitives';
import { factionSlug, glbModelsEnabled, loadModelById, loadModelForMesh } from './assets/ModelLibrary';

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

interface PropSpec {
  id: string;
  x: number;
  z: number;
  fitSize: number;
  y?: number;
  rotation?: number;
}

const BUILDING_PROPS: Record<string, Record<string, PropSpec[]>> = {
  european: {
    keepEuropean: [
      { id: 'european_banner_prop', x: -1.5, z: -1.3, fitSize: 0.65, rotation: -0.25 },
      { id: 'european_banner_prop', x: 1.5, z: -1.3, fitSize: 0.65, rotation: 0.25 },
    ],
    guildHall: [{ id: 'universal_barrel', x: -1.0, z: 0.9, fitSize: 0.45 }],
    stable: [{ id: 'universal_wood_crate', x: 1.1, z: 0.7, fitSize: 0.45, rotation: 0.7 }],
  },
  middle_eastern: {
    keepMiddleEastern: [
      { id: 'middle_eastern_fire_pot_prop', x: -1.2, z: -1.1, fitSize: 0.45 },
      { id: 'middle_eastern_fire_pot_prop', x: 1.2, z: -1.1, fitSize: 0.45 },
    ],
    bazaar: [
      { id: 'universal_wood_crate', x: -1.0, z: 0.8, fitSize: 0.45 },
      { id: 'universal_barrel', x: 1.0, z: 0.8, fitSize: 0.45 },
    ],
    fireOilFoundry: [
      { id: 'middle_eastern_fire_pot_prop', x: -0.9, z: 0.9, fitSize: 0.5 },
      { id: 'middle_eastern_fire_pot_prop', x: 0.9, z: 0.9, fitSize: 0.5 },
    ],
    domeTower: [{ id: 'middle_eastern_fire_pot_prop', x: 0.0, z: -0.95, fitSize: 0.42 }],
  },
  asian: {
    keepAsian: [
      { id: 'asian_lantern_prop', x: -1.3, z: -1.1, fitSize: 0.35 },
      { id: 'asian_lantern_prop', x: 1.3, z: -1.1, fitSize: 0.35 },
    ],
    temple: [
      { id: 'asian_lantern_prop', x: -0.9, z: 0.9, fitSize: 0.35 },
      { id: 'asian_lantern_prop', x: 0.9, z: 0.9, fitSize: 0.35 },
    ],
    imperialAcademy: [{ id: 'asian_lantern_prop', x: 0.0, z: -1.1, fitSize: 0.35 }],
    bambooWatchpost: [{ id: 'asian_lantern_prop', x: 0.6, z: -0.6, fitSize: 0.3 }],
  },
  african: {
    keepAfrican: [
      { id: 'african_banner_textile', x: -1.4, z: -1.2, fitSize: 0.6 },
      { id: 'african_banner_textile', x: 1.4, z: -1.2, fitSize: 0.6 },
    ],
    drumCircle: [
      { id: 'african_war_drum_prop', x: -0.8, z: 0.5, fitSize: 0.45 },
      { id: 'african_war_drum_prop', x: 0.8, z: 0.5, fitSize: 0.45 },
    ],
    herdingGrounds: [{ id: 'african_round_hut', x: 1.2, z: -0.8, fitSize: 1.0 }],
    warriorLodge: [{ id: 'african_banner_textile', x: 0.0, z: -1.0, fitSize: 0.55 }],
    sunfireYard: [{ id: 'african_war_drum_prop', x: -1.0, z: 0.9, fitSize: 0.45 }],
  },
};

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

  private attachAssetProps(b: Building, t: Tracked, faction: string): void {
    const props = BUILDING_PROPS[factionSlug(faction)]?.[b.def.mesh];
    if (!props?.length) return;
    for (const spec of props) {
      loadModelById(spec.id, { fitSize: spec.fitSize }).then((prop) => {
        if (!prop || this.tracked.get(b.id) !== t) return;
        prop.position.x += spec.x;
        prop.position.y += spec.y ?? 0;
        prop.position.z += spec.z;
        prop.rotation.y += spec.rotation ?? 0;
        t.mesh.add(prop);
      });
    }
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
        const mesh = buildBuildingMesh(b.def.mesh, color, { tier: variant, level: variant });
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

        // Manifest GLB upgrade: swap the procedural placeholder once loaded.
        // Failed loads simply keep the placeholder.
        if (glbModelsEnabled()) {
          const faction = this.state.players[b.player]?.faction.id ?? '';
          const fitSize = Math.max(b.def.footprint[0], b.def.footprint[1]);
          const current = t;
          loadModelForMesh(b.def.mesh, faction, { teamColor: color, fitSize }).then((model) => {
            if (!model || this.tracked.get(b.id) !== current) return;
            current.mesh.clear();
            current.mesh.add(model);
            current.cloths.length = 0;
            // GLB swap drops the procedural team banner; keeps get it back so
            // bases stay readable as friend or foe at a glance.
            if (b.def.mesh.startsWith('keep')) {
              const half = fitSize / 2;
              const teamBanner = banner(color, 2.4, half * 0.85, half * 0.85);
              current.mesh.add(teamBanner);
              teamBanner.traverse((o) => {
                if (o.userData.bannerCloth) current.cloths.push(o);
              });
            }
            this.attachAssetProps(b, current, faction);
          });
        }
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

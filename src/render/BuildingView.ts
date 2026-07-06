import * as THREE from 'three';
import type { MatchState } from '@/sim/MatchState';
import { Building } from '@/sim/entities/Entity';
import { buildBuildingMesh, buildScaffoldMesh } from './meshes/buildingMeshes';

interface Tracked {
  mesh: THREE.Group;
  scaffold: THREE.Group | null;
  wasComplete: boolean;
}

/**
 * One Group per building (buildings are few). Under-construction buildings
 * show a scaffold and the real mesh rises from the ground as progress grows.
 */
export class BuildingView {
  readonly root = new THREE.Group();
  private tracked = new Map<number, Tracked>();
  private state: MatchState;
  /** Optional fog filter: return false to hide (enemy building in fog). */
  visibleFilter: ((b: Building) => boolean) | null = null;

  constructor(state: MatchState) {
    this.state = state;
  }

  update(): void {
    const seen = new Set<number>();
    for (const b of this.state.buildings) {
      if (b.dead) continue;
      seen.add(b.id);
      let t = this.tracked.get(b.id);
      if (!t) {
        const color = this.state.players[b.player]?.faction.colorPrimary ?? 0x888888;
        const mesh = buildBuildingMesh(b.def.mesh, color);
        mesh.position.set(b.pos.x, 0, b.pos.y);
        const scaffold = b.underConstruction ? buildScaffoldMesh(b.def.footprint) : null;
        if (scaffold) {
          scaffold.position.set(b.pos.x, 0, b.pos.y);
          this.root.add(scaffold);
        }
        this.root.add(mesh);
        t = { mesh, scaffold, wasComplete: b.complete };
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
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}

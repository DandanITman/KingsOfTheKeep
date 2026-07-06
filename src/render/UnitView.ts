import * as THREE from 'three';
import { lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';
import type { Unit } from '@/sim/entities/Entity';
import { getArchetypeGeometry } from './meshes/unitMeshes';

const MAX_INSTANCES = 400;

interface ArchetypePool {
  body: THREE.InstancedMesh | null;
  team: THREE.InstancedMesh | null;
}

const bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const teamMaterial = new THREE.MeshLambertMaterial();

/**
 * Instanced unit rendering: one body InstancedMesh (vertex colors) plus one
 * team InstancedMesh (per-instance color) per archetype. Whole armies render
 * in a handful of draw calls; animation is a cheap procedural bob baked into
 * the instance matrices.
 */
export class UnitView {
  readonly root = new THREE.Group();
  private pools = new Map<string, ArchetypePool>();
  private state: MatchState;
  private dummy = new THREE.Object3D();
  private teamColors: THREE.Color[];
  /** Per-frame list of visible unit ids (set by fog logic; null = all). */
  visibleFilter: ((unit: Unit) => boolean) | null = null;

  constructor(state: MatchState) {
    this.state = state;
    this.teamColors = state.players.map((p) => new THREE.Color(p.faction.colorPrimary));
  }

  private pool(meshKey: string): ArchetypePool {
    let pool = this.pools.get(meshKey);
    if (!pool) {
      const geo = getArchetypeGeometry(meshKey);
      const body = geo.body ? new THREE.InstancedMesh(geo.body, bodyMaterial, MAX_INSTANCES) : null;
      const team = geo.team ? new THREE.InstancedMesh(geo.team, teamMaterial, MAX_INSTANCES) : null;
      for (const m of [body, team]) {
        if (!m) continue;
        m.castShadow = true;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.frustumCulled = false;
        this.root.add(m);
      }
      pool = { body, team };
      this.pools.set(meshKey, pool);
    }
    return pool;
  }

  update(alpha: number, timeMs: number): void {
    // Reset counts.
    const counts = new Map<string, number>();
    for (const pool of this.pools.values()) {
      if (pool.body) pool.body.count = 0;
      if (pool.team) pool.team.count = 0;
    }

    for (const unit of this.state.units) {
      if (unit.dead) continue;
      if (this.visibleFilter && !this.visibleFilter(unit)) continue;
      const meshKey = unit.def.mesh;
      const pool = this.pool(meshKey);
      const i = counts.get(meshKey) ?? 0;
      if (i >= MAX_INSTANCES) continue;
      counts.set(meshKey, i + 1);

      const x = lerp(unit.prevPos.x, unit.pos.x, alpha);
      const z = lerp(unit.prevPos.y, unit.pos.y, alpha);
      const moving = Math.abs(unit.pos.x - unit.prevPos.x) + Math.abs(unit.pos.y - unit.prevPos.y) > 0.005;
      const bob = moving ? Math.abs(Math.sin(timeMs * 0.012 + unit.id * 1.7)) * 0.07 : 0;

      this.dummy.position.set(x, bob, z);
      this.dummy.rotation.set(0, -unit.facing, moving ? Math.sin(timeMs * 0.012 + unit.id) * 0.05 : 0);
      const s = 0.9;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();

      if (pool.body) {
        pool.body.setMatrixAt(i, this.dummy.matrix);
        pool.body.count = i + 1;
      }
      if (pool.team) {
        pool.team.setMatrixAt(i, this.dummy.matrix);
        pool.team.setColorAt(i, this.teamColors[unit.player] ?? this.teamColors[0]);
        pool.team.count = i + 1;
      }
    }

    for (const pool of this.pools.values()) {
      if (pool.body) pool.body.instanceMatrix.needsUpdate = true;
      if (pool.team) {
        pool.team.instanceMatrix.needsUpdate = true;
        if (pool.team.instanceColor) pool.team.instanceColor.needsUpdate = true;
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}

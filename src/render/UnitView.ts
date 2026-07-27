import * as THREE from 'three';
import { lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';
import { ContactShadows } from './art/ContactShadows';
import { unitHeight, unitRadius, wallWalkHeight } from './art/scale';
import type { Unit } from '@/sim/entities/Entity';
import { getArchetypeGeometry } from './art/units';

const MAX_INSTANCES = 400;

interface ArchetypePool {
  body: THREE.InstancedMesh | null;
  team: THREE.InstancedMesh | null;
  action: THREE.InstancedMesh | null;
  pivot: { x: number; y: number; z: number };
  /** Scale that brings this archetype's baked geometry to its contract height. */
  scale: number;
}

/** Height of a baked archetype's static layers, used to honour the contract. */
function measureArchetypeHeight(geo: { body: THREE.BufferGeometry | null; team: THREE.BufferGeometry | null }): number {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const g of [geo.body, geo.team]) {
    if (!g) continue;
    g.computeBoundingBox();
    if (!g.boundingBox) continue;
    minY = Math.min(minY, g.boundingBox.min.y);
    maxY = Math.max(maxY, g.boundingBox.max.y);
  }
  return Number.isFinite(minY) && Number.isFinite(maxY) ? maxY - minY : 0;
}

const bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const teamMaterial = new THREE.MeshLambertMaterial();

interface Anim {
  /** Rotation of the action layer around its pivot (radians, - = forward). */
  swing: number;
  /** Forward body offset (melee strikes lunge into the target). */
  lunge: number;
}

/**
 * Procedural task animation: what a unit's weapon/tool layer is doing this
 * frame. Reads the sim task directly — chopping while gathering, hammering
 * while building, strike/windup cycles keyed to the attack cooldown.
 */
function taskAnim(unit: Unit, timeMs: number, moving: boolean): Anim {
  const t = timeMs * 0.001;
  const phase = unit.id * 1.7;
  const task = unit.task;

  if (task.kind === 'gather') {
    if (task.phase === 'gathering') {
      // Overhead chop/pick swing.
      return { swing: -0.5 + Math.sin(t * 7 + phase) * 0.9, lunge: 0 };
    }
    return { swing: moving ? Math.sin(t * 8 + phase) * 0.25 : 0, lunge: 0 };
  }
  if (task.kind === 'build' || task.kind === 'repair') {
    if (!moving) return { swing: -0.4 + Math.sin(t * 10 + phase) * 0.7, lunge: 0 };
    return { swing: Math.sin(t * 8 + phase) * 0.25, lunge: 0 };
  }
  if (task.kind === 'fight' || unit.garrisonedIn !== null) {
    const period = Math.max(0.4, unit.def.attackPeriodSecs);
    const p = Math.min(1, Math.max(0, unit.attackCooldown / period)); // 1 = just fired
    if (unit.def.range > 0.9) {
      // Ranged: sharp recoil right after the shot, then a slow re-draw.
      const recoil = p > 0.78 ? (p - 0.78) / 0.22 : 0;
      return { swing: 0.2 - recoil * 0.85 + Math.sin(t * 2.5 + phase) * 0.05, lunge: 0 };
    }
    // Melee: snap from windup into an extended strike the moment the hit
    // lands (cooldown resets to full), then recover and wind up again.
    if (p > 0.62) {
      const k = (p - 0.62) / 0.38;
      return { swing: -1.5 * k, lunge: k * 0.28 };
    }
    return { swing: 0.7 * (1 - p / 0.62), lunge: 0 };
  }
  // Walking: arms swing; idle: still.
  return { swing: moving ? Math.sin(t * 8 + phase) * 0.3 : 0, lunge: 0 };
}

/**
 * Instanced unit rendering: one body InstancedMesh (vertex colors), one team
 * InstancedMesh (per-instance color), and one action InstancedMesh (weapons /
 * tools, swung procedurally around a per-archetype pivot) per archetype.
 * Whole armies render in a handful of draw calls.
 */
export class UnitView {
  readonly root = new THREE.Group();
  private shadows = new ContactShadows();
  private pools = new Map<string, ArchetypePool>();
  private state: MatchState;
  private dummy = new THREE.Object3D();
  private actionLocal = new THREE.Matrix4();
  private actionMat = new THREE.Matrix4();
  private teamColors: THREE.Color[];
  /** Per-frame list of visible unit ids (set by fog logic; null = all). */
  visibleFilter: ((unit: Unit) => boolean) | null = null;
  private lastTimeMs = 0;

  constructor(state: MatchState) {
    this.root.add(this.shadows.mesh);
    this.state = state;
    this.teamColors = state.players.map((p) => new THREE.Color(p.faction.colorPrimary));
  }

  /** Pools are keyed by archetype AND faction — the two factions in a match
   *  render the same archetype as visibly different units. */
  private pool(meshKey: string, faction: string): ArchetypePool {
    const key = `${meshKey}:${faction}`;
    let pool = this.pools.get(key);
    if (!pool) {
      const geo = getArchetypeGeometry(meshKey, faction);
      const body = geo.body ? new THREE.InstancedMesh(geo.body, bodyMaterial, MAX_INSTANCES) : null;
      const team = geo.team ? new THREE.InstancedMesh(geo.team, teamMaterial, MAX_INSTANCES) : null;
      const action = geo.action ? new THREE.InstancedMesh(geo.action, bodyMaterial, MAX_INSTANCES) : null;
      for (const m of [body, team, action]) {
        if (!m) continue;
        m.castShadow = true;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.frustumCulled = false;
        this.root.add(m);
      }
      // Derive the render scale from the contract rather than a magic 0.9, so
      // every archetype ends up the height it declares.
      const measured = measureArchetypeHeight(geo);
      const scale = measured > 1e-4 ? unitHeight(meshKey) / measured : 1;
      pool = { body, team, action, pivot: geo.pivot, scale };
      this.pools.set(key, pool);
    }
    return pool;
  }

  update(alpha: number, timeMs: number): void {
    this.lastTimeMs = timeMs;
    // Reset counts.
    const counts = new Map<string, number>();
    for (const pool of this.pools.values()) {
      if (pool.body) pool.body.count = 0;
      if (pool.team) pool.team.count = 0;
      if (pool.action) pool.action.count = 0;
    }

    this.shadows.begin();

    for (const unit of this.state.units) {
      if (unit.dead) continue;
      if (this.visibleFilter && !this.visibleFilter(unit)) continue;
      const meshKey = unit.def.mesh;

      let x = lerp(unit.prevPos.x, unit.pos.x, alpha);
      let z = lerp(unit.prevPos.y, unit.pos.y, alpha);
      const moving = Math.abs(unit.pos.x - unit.prevPos.x) + Math.abs(unit.pos.y - unit.prevPos.y) > 0.005;
      const anim = taskAnim(unit, timeMs, moving);

      let y = moving ? Math.abs(Math.sin(timeMs * 0.012 + unit.id * 1.7)) * 0.07 : 0;
      // Garrisoned archers stand on the keep's walls.
      if (unit.garrisonedIn !== null) {
        const tier = this.state.players[unit.player]?.tier ?? 1;
        y = wallWalkHeight(tier);
      } else {
        // Contact shadow on the ground. Skipped for garrisoned units, who are
        // standing on a roof rather than on the terrain.
        this.shadows.add(x, z, unitRadius(meshKey));
      }
      if (anim.lunge > 0) {
        x += Math.cos(unit.facing) * anim.lunge;
        z += Math.sin(unit.facing) * anim.lunge;
      }

      const teamColor = this.teamColors[unit.player] ?? this.teamColors[0];
      const faction = this.state.players[unit.player]?.faction.id ?? '';
      const poolKey = `${meshKey}:${faction}`;
      const pool = this.pool(meshKey, faction);
      const i = counts.get(poolKey) ?? 0;
      if (i >= MAX_INSTANCES) continue;
      counts.set(poolKey, i + 1);

      this.dummy.position.set(x, y, z);
      this.dummy.rotation.set(0, -unit.facing, moving ? Math.sin(timeMs * 0.012 + unit.id) * 0.05 : 0);
      const s = pool.scale;
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
      if (pool.action) {
        // Swing the weapon layer around its pivot in unit-local space.
        this.actionLocal.makeRotationZ(anim.swing);
        this.actionLocal.setPosition(pool.pivot.x, pool.pivot.y, pool.pivot.z);
        this.actionMat.multiplyMatrices(this.dummy.matrix, this.actionLocal);
        pool.action.setMatrixAt(i, this.actionMat);
        pool.action.count = i + 1;
      }
    }

    this.shadows.end();

    for (const pool of this.pools.values()) {
      if (pool.body) pool.body.instanceMatrix.needsUpdate = true;
      if (pool.action) pool.action.instanceMatrix.needsUpdate = true;
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

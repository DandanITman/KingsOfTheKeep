import * as THREE from 'three';
import { lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';
import type { Unit } from '@/sim/entities/Entity';
import { getArchetypeGeometry } from './meshes/unitMeshes';
import { glbModelsEnabled, loadModelForUnit, modelIdForUnit } from './assets/ModelLibrary';

const MAX_INSTANCES = 400;
const MAX_IMPORTED_UNITS = 80;

interface ArchetypePool {
  body: THREE.InstancedMesh | null;
  team: THREE.InstancedMesh | null;
  action: THREE.InstancedMesh | null;
  pivot: { x: number; y: number; z: number };
}

interface ImportedUnit {
  modelId: string;
  model: THREE.Group | null;
  baseY: number;
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

function importedUnitFitSize(meshKey: string): number {
  switch (meshKey) {
    case 'lightCavalry':
    case 'cavalry':
    case 'knight':
    case 'paladin':
    case 'horseArcher':
    case 'camelRider':
    case 'camelArcher':
      return 1.45;
    case 'elephant':
      return 2.5;
    case 'beast':
      return 2.0;
    case 'cart':
    case 'ram':
    case 'catapult':
    case 'trebuchet':
    case 'ballista':
    case 'bombard':
    case 'siegeTower':
    case 'rocketCart':
      return 1.8;
    case 'banner':
    case 'drum':
    case 'monk':
    case 'support':
      return 1.05;
    default:
      return 0.9;
  }
}

/**
 * Instanced unit rendering: one body InstancedMesh (vertex colors), one team
 * InstancedMesh (per-instance color), and one action InstancedMesh (weapons /
 * tools, swung procedurally around a per-archetype pivot) per archetype.
 * Whole armies render in a handful of draw calls.
 */
export class UnitView {
  readonly root = new THREE.Group();
  private importedRoot = new THREE.Group();
  private pools = new Map<string, ArchetypePool>();
  private importedUnits = new Map<number, ImportedUnit>();
  private failedModelIds = new Set<string>();
  private state: MatchState;
  private dummy = new THREE.Object3D();
  private actionLocal = new THREE.Matrix4();
  private actionMat = new THREE.Matrix4();
  private teamColors: THREE.Color[];
  /** Per-frame list of visible unit ids (set by fog logic; null = all). */
  visibleFilter: ((unit: Unit) => boolean) | null = null;
  private useImportedModels = glbModelsEnabled();

  constructor(state: MatchState) {
    this.state = state;
    this.teamColors = state.players.map((p) => new THREE.Color(p.faction.colorPrimary));
    this.root.add(this.importedRoot);
  }

  private pool(meshKey: string): ArchetypePool {
    let pool = this.pools.get(meshKey);
    if (!pool) {
      const geo = getArchetypeGeometry(meshKey);
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
      pool = { body, team, action, pivot: geo.pivot };
      this.pools.set(meshKey, pool);
    }
    return pool;
  }

  private importedUnitFor(unit: Unit, teamColor: THREE.Color): ImportedUnit | null {
    if (!this.useImportedModels) return null;
    const modelId = modelIdForUnit(unit.def.id, unit.def.mesh, unit.def.faction);
    if (!modelId || this.failedModelIds.has(modelId)) return null;

    let imported = this.importedUnits.get(unit.id);
    if (imported && imported.modelId !== modelId) {
      imported.model?.removeFromParent();
      this.importedUnits.delete(unit.id);
      imported = undefined;
    }

    if (!imported) {
      if (this.importedUnits.size >= MAX_IMPORTED_UNITS) return null;
      imported = { modelId, model: null, baseY: 0 };
      this.importedUnits.set(unit.id, imported);
      loadModelForUnit(unit.def.id, unit.def.mesh, unit.def.faction, {
        teamColor: teamColor.getHex(),
        fitSize: importedUnitFitSize(unit.def.mesh),
      })
        .then((model) => {
          const current = this.importedUnits.get(unit.id);
          if (!current || current.modelId !== modelId) {
            model?.removeFromParent();
            return;
          }
          if (!model) {
            this.failedModelIds.add(modelId);
            this.importedUnits.delete(unit.id);
            return;
          }
          current.model = model;
          current.baseY = model.position.y;
          model.visible = false;
          this.importedRoot.add(model);
        })
        .catch(() => {
          this.failedModelIds.add(modelId);
          this.importedUnits.delete(unit.id);
        });
    }

    return imported.model ? imported : null;
  }

  update(alpha: number, timeMs: number): void {
    // Reset counts.
    const counts = new Map<string, number>();
    const seen = new Set<number>();
    for (const pool of this.pools.values()) {
      if (pool.body) pool.body.count = 0;
      if (pool.team) pool.team.count = 0;
      if (pool.action) pool.action.count = 0;
    }

    for (const unit of this.state.units) {
      if (unit.dead) continue;
      seen.add(unit.id);
      const imported = this.importedUnits.get(unit.id);
      if (this.visibleFilter && !this.visibleFilter(unit)) {
        if (imported?.model) imported.model.visible = false;
        continue;
      }
      const meshKey = unit.def.mesh;

      let x = lerp(unit.prevPos.x, unit.pos.x, alpha);
      let z = lerp(unit.prevPos.y, unit.pos.y, alpha);
      const moving = Math.abs(unit.pos.x - unit.prevPos.x) + Math.abs(unit.pos.y - unit.prevPos.y) > 0.005;
      const anim = taskAnim(unit, timeMs, moving);

      let y = moving ? Math.abs(Math.sin(timeMs * 0.012 + unit.id * 1.7)) * 0.07 : 0;
      // Garrisoned archers stand on the keep's walls.
      if (unit.garrisonedIn !== null) {
        const tier = this.state.players[unit.player]?.tier ?? 1;
        y = 2.7 + (tier - 1) * 0.4;
      }
      if (anim.lunge > 0) {
        x += Math.cos(unit.facing) * anim.lunge;
        z += Math.sin(unit.facing) * anim.lunge;
      }

      const teamColor = this.teamColors[unit.player] ?? this.teamColors[0];
      const importedReady = this.importedUnitFor(unit, teamColor);
      if (importedReady?.model) {
        importedReady.model.visible = true;
        importedReady.model.position.set(x, y + importedReady.baseY, z);
        importedReady.model.rotation.set(0, -unit.facing, 0);
      }

      const pool = this.pool(meshKey);
      const i = counts.get(meshKey) ?? 0;
      if (i >= MAX_INSTANCES) continue;
      counts.set(meshKey, i + 1);

      this.dummy.position.set(x, y, z);
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
      if (pool.action) {
        // Swing the weapon layer around its pivot in unit-local space.
        this.actionLocal.makeRotationZ(anim.swing);
        this.actionLocal.setPosition(pool.pivot.x, pool.pivot.y, pool.pivot.z);
        this.actionMat.multiplyMatrices(this.dummy.matrix, this.actionLocal);
        pool.action.setMatrixAt(i, this.actionMat);
        pool.action.count = i + 1;
      }
    }

    for (const [id, imported] of this.importedUnits) {
      if (!seen.has(id)) {
        imported.model?.removeFromParent();
        this.importedUnits.delete(id);
      }
    }

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

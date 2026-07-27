import * as THREE from 'three';
import { lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';
import { ContactShadows } from './art/ContactShadows';
import { unitHeight, unitRadius, wallWalkHeight } from './art/scale';
import type { Unit } from '@/sim/entities/Entity';
import { getArchetypeGeometry } from './meshes/unitMeshes';
import { glbModelsEnabled, loadModelForUnit, modelIdForUnit } from './assets/ModelLibrary';

const MAX_INSTANCES = 400;
const MAX_IMPORTED_UNITS = 120;

interface ArchetypePool {
  body: THREE.InstancedMesh | null;
  team: THREE.InstancedMesh | null;
  action: THREE.InstancedMesh | null;
  pivot: { x: number; y: number; z: number };
  /** Scale that brings this archetype's baked geometry to its contract height. */
  scale: number;
}

/** Semantic animation states derived from the sim task. */
type ClipRole = 'idle' | 'walk' | 'attack' | 'shoot' | 'work';

/**
 * Clip-name patterns per role, tried in order (matched case-insensitively
 * against the clip name with any `Armature|` prefix stripped). Covers the
 * Quaternius humanoid rig (Idle/Walk/Run/Sword_Slash/Interact/Gun_Shoot) and
 * the animal rig (Idle/Walk/Gallop/Attack_Headbutt).
 */
const CLIP_ROLE_PATTERNS: Record<ClipRole, string[]> = {
  idle: ['idle_neutral', 'idle'],
  walk: ['walk', 'run', 'gallop'],
  attack: ['sword_slash', 'attack_headbutt', 'attack_kick', 'punch_left', 'attack'],
  shoot: ['gun_shoot', 'shoot', 'sword_slash', 'attack'],
  work: ['interact', 'sword_slash', 'punch_left', 'attack'],
};

/** Cavalry reads better galloping than walking at RTS move speeds. */
const GALLOP_MESHES = new Set(['lightCavalry', 'cavalry', 'knight', 'paladin', 'horseArcher', 'camelRider', 'camelArcher']);

interface ImportedUnit {
  modelId: string;
  model: THREE.Group | null;
  baseY: number;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
  actions: Partial<Record<ClipRole, THREE.AnimationAction | null>>;
  active: ClipRole | null;
}

/** Best clip for a semantic role, matched by normalized name, or null. */
function findRoleClip(clips: THREE.AnimationClip[], role: ClipRole, meshKey: string): THREE.AnimationClip | null {
  const patterns =
    role === 'walk' && GALLOP_MESHES.has(meshKey) ? ['gallop', 'run', 'walk'] : CLIP_ROLE_PATTERNS[role];
  const norm = (name: string) => name.slice(name.indexOf('|') + 1).toLowerCase();
  for (const pat of patterns) {
    const clip =
      clips.find((c) => norm(c.name) === pat) ?? clips.find((c) => norm(c.name).startsWith(pat));
    if (clip) return clip;
  }
  return null;
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
 * Target height in world units for an imported unit model, taken straight from
 * the shared scale contract.
 *
 * These used to be a separate set of numbers roughly twice the procedural ones,
 * so once a battle passed the 120-model import cap the same unit type rendered
 * at two different sizes side by side. One source of truth removes that.
 */
function importedUnitHeight(meshKey: string): number {
  return unitHeight(meshKey);
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
  private lastTimeMs = 0;

  constructor(state: MatchState) {
    this.root.add(this.shadows.mesh);
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
      // Derive the render scale from the contract rather than a magic 0.9, so
      // every archetype ends up the height it declares.
      const measured = measureArchetypeHeight(geo);
      const scale = measured > 1e-4 ? unitHeight(meshKey) / measured : 1;
      pool = { body, team, action, pivot: geo.pivot, scale };
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
      imported = { modelId, model: null, baseY: 0, mixer: null, clips: [], actions: {}, active: null };
      this.importedUnits.set(unit.id, imported);
      loadModelForUnit(unit.def.id, unit.def.mesh, unit.def.faction, {
        teamColor: teamColor.getHex(),
        fitHeight: importedUnitHeight(unit.def.mesh),
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
          // Yaw first, then local pitch/roll for the procedural gait of
          // unrigged models.
          model.rotation.order = 'YXZ';
          // Only drive a mixer when the core locomotion roles resolve —
          // models with junk/partial clip sets keep the procedural gait.
          const clips = (model.userData.clips as THREE.AnimationClip[] | undefined) ?? [];
          const meshKey = unit.def.mesh;
          if (clips.length > 0 && (findRoleClip(clips, 'walk', meshKey) || findRoleClip(clips, 'idle', meshKey))) {
            current.clips = clips;
            current.mixer = new THREE.AnimationMixer(model);
          }
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

  /** Find (and cache) the AnimationAction for a semantic role, or null. */
  private actionFor(imp: ImportedUnit, role: ClipRole, meshKey: string): THREE.AnimationAction | null {
    if (role in imp.actions) return imp.actions[role] ?? null;
    const clip = findRoleClip(imp.clips, role, meshKey);
    const action = clip && imp.mixer ? imp.mixer.clipAction(clip) : null;
    imp.actions[role] = action;
    return action;
  }

  /** Crossfade the unit's skeletal animation to `role`. */
  private playRole(imp: ImportedUnit, role: ClipRole, unit: Unit): void {
    if (imp.active === role || !imp.mixer) return;
    const next = this.actionFor(imp, role, unit.def.mesh);
    if (!next) return;
    const prev = imp.active ? imp.actions[imp.active] : null;
    // Desync identical units and roughly match attack loops to the sim's
    // attack period so strikes read as deliberate rather than frantic.
    const clip = next.getClip();
    if (role === 'attack' || role === 'shoot') {
      const period = Math.max(0.4, unit.def.attackPeriodSecs);
      next.timeScale = Math.min(2.2, Math.max(0.6, clip.duration / period));
    } else if (role === 'walk') {
      next.timeScale = 1.15;
    } else {
      next.timeScale = 0.9 + (unit.id % 5) * 0.05;
    }
    next.reset();
    next.time = ((unit.id * 0.37) % 1) * clip.duration;
    next.fadeIn(0.16).play();
    if (prev && prev !== next) prev.fadeOut(0.16);
    imp.active = role;
  }

  update(alpha: number, timeMs: number): void {
    const dt = this.lastTimeMs === 0 ? 0.016 : Math.min(0.1, (timeMs - this.lastTimeMs) / 1000);
    this.lastTimeMs = timeMs;
    // Reset counts.
    const counts = new Map<string, number>();
    const seen = new Set<number>();
    for (const pool of this.pools.values()) {
      if (pool.body) pool.body.count = 0;
      if (pool.team) pool.team.count = 0;
      if (pool.action) pool.action.count = 0;
    }

    this.shadows.begin();

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
      const importedReady = this.importedUnitFor(unit, teamColor);
      if (importedReady?.model) {
        const model = importedReady.model;
        model.visible = true;
        if (importedReady.mixer) {
          // Skeletal animation: pick the semantic state and let the clip do
          // the moving — no procedural bob on top.
          const task = unit.task;
          const role: ClipRole = moving
            ? 'walk'
            : task.kind === 'fight' || unit.garrisonedIn !== null
              ? unit.def.range > 0.9
                ? 'shoot'
                : 'attack'
              : (task.kind === 'gather' && task.phase === 'gathering') || task.kind === 'build' || task.kind === 'repair'
                ? 'work'
                : 'idle';
          this.playRole(importedReady, role, unit);
          importedReady.mixer.update(dt);
          const groundY = unit.garrisonedIn !== null ? y : 0;
          model.position.set(x, groundY + importedReady.baseY, z);
          model.rotation.set(0, -unit.facing, 0);
        } else {
          // Unrigged model: procedural gait — walk bob + roll, chop/strike
          // pitch from the task animation.
          model.position.set(x, y + importedReady.baseY, z);
          model.rotation.set(
            -anim.swing * 0.12,
            -unit.facing,
            moving ? Math.sin(timeMs * 0.008 + unit.id * 1.7) * 0.05 : 0,
          );
        }
        // The GLB replaces the procedural placeholder entirely.
        continue;
      }

      const pool = this.pool(meshKey);
      const i = counts.get(meshKey) ?? 0;
      if (i >= MAX_INSTANCES) continue;
      counts.set(meshKey, i + 1);

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

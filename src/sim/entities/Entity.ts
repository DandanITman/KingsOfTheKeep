import type { Vec2 } from '@/core/mathUtils';
import type { GatherResource, UnitDef, BuildingDef } from '@/data/types';
import type { EntityId, FlagType, PlayerId } from '../commands';

export const NEUTRAL_PLAYER = -1;

let nextId = 1;
export function resetEntityIds(): void {
  nextId = 1;
}

export abstract class Entity {
  readonly id: EntityId;
  player: PlayerId;
  pos: Vec2;
  prevPos: Vec2;
  hp: number;
  maxHp: number;
  dead = false;
  /** Facing angle in radians (render interpolates). */
  facing = 0;

  constructor(player: PlayerId, pos: Vec2, hp: number) {
    this.id = nextId++;
    this.player = player;
    this.pos = { ...pos };
    this.prevPos = { ...pos };
    this.hp = hp;
    this.maxHp = hp;
  }
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------

export type UnitTask =
  | { kind: 'idle' }
  | { kind: 'move'; dest: Vec2; path: Vec2[] | null; attackMove: boolean; pinned?: boolean }
  | { kind: 'macroMove'; dest: Vec2 }
  | { kind: 'gather'; nodeId: EntityId; phase: 'toNode' | 'gathering' | 'toDropoff'; timer: number; pinned?: boolean }
  | { kind: 'build'; buildingId: EntityId; pinned?: boolean }
  | { kind: 'repair'; buildingId: EntityId; pinned?: boolean }
  | { kind: 'fight'; targetId: EntityId; returnTo?: Vec2 }
  | { kind: 'rout' }
  | { kind: 'trade'; phase: 'outbound' | 'returning'; fromId: EntityId; toId: EntityId }
  | { kind: 'garrison'; buildingId: EntityId };

export type Assignment = 'attack' | 'defend' | 'reserve';

export class Unit extends Entity {
  readonly defId: string;
  readonly def: UnitDef;
  task: UnitTask = { kind: 'idle' };
  assignment: Assignment = 'defend';
  morale: number;
  attackCooldown = 0;
  /** Carried resources for workers. */
  carrying: { resource: GatherResource; amount: number } | null = null;
  /** Target the macro layer currently steers this unit toward. */
  macroTargetFlagId: EntityId | null = null;
  /** Guard post entity id for defenders. */
  guardPostId: EntityId | null = null;
  /** Ticks until removal for temporary (ability-summoned) units. */
  temporaryTicks: number | null = null;
  /** Steering velocity smoothing. */
  vel: Vec2 = { x: 0, y: 0 };

  constructor(player: PlayerId, pos: Vec2, def: UnitDef, baseMorale: number) {
    super(player, pos, def.hp);
    this.defId = def.id;
    this.def = def;
    this.morale = baseMorale;
    if (def.role === 'worker') this.assignment = 'reserve';
  }
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------

export interface TrainQueueItem {
  unitId: string;
  ticksRemaining: number;
  totalTicks: number;
}

export interface ResearchItem {
  upgradeId: string;
  ticksRemaining: number;
  totalTicks: number;
}

export class Building extends Entity {
  readonly defId: string;
  readonly def: BuildingDef;
  /** Construction progress 0..1; 1 = complete and functional. */
  progress: number;
  underConstruction: boolean;
  trainQueue: TrainQueueItem[] = [];
  research: ResearchItem | null = null;
  rallyPoint: Vec2 | null = null;
  attackCooldown = 0;
  /** Cached placement efficiency for economy buildings (0.5/0.75/1). */
  efficiency = 1;
  /** Origin cell of the footprint (top-left) on the nav grid. */
  cell: { x: number; y: number };

  constructor(player: PlayerId, pos: Vec2, def: BuildingDef, cell: { x: number; y: number }, complete: boolean) {
    super(player, pos, def.hp);
    this.defId = def.id;
    this.def = def;
    this.cell = cell;
    this.progress = complete ? 1 : 0;
    this.underConstruction = !complete;
    if (!complete) this.hp = Math.max(1, Math.round(def.hp * 0.1));
  }

  get complete(): boolean {
    return !this.underConstruction;
  }
}

// ---------------------------------------------------------------------------
// Resource node
// ---------------------------------------------------------------------------

export class ResourceNode extends Entity {
  readonly resource: GatherResource;
  readonly nodeType: 'gold' | 'stone' | 'forest' | 'berries' | 'farm';
  amount: number;

  constructor(pos: Vec2, nodeType: ResourceNode['nodeType'], amount: number) {
    super(NEUTRAL_PLAYER, pos, 1);
    this.nodeType = nodeType;
    this.resource =
      nodeType === 'forest' ? 'wood' : nodeType === 'berries' || nodeType === 'farm' ? 'food' : nodeType;
    this.amount = amount;
  }
}

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

export class Flag extends Entity {
  readonly flagType: FlagType;
  /** Sequence number among this player's flags of the same type. */
  order: number;
  /** Temporary flags (emergency buttons) expire. */
  expiresTick: number | null = null;

  constructor(player: PlayerId, pos: Vec2, flagType: FlagType, order: number) {
    super(player, pos, 1);
    this.flagType = flagType;
    this.order = order;
  }
}

// ---------------------------------------------------------------------------
// Projectiles
// ---------------------------------------------------------------------------

export class Projectile extends Entity {
  targetId: EntityId;
  targetPos: Vec2;
  speed: number;
  damage: number;
  pierce: boolean;
  splash: number;
  bonusVsBuildings: number;
  sourcePlayer: PlayerId;
  arc: 'flat' | 'lob';

  constructor(opts: {
    player: PlayerId;
    pos: Vec2;
    targetId: EntityId;
    targetPos: Vec2;
    speed: number;
    damage: number;
    pierce: boolean;
    splash: number;
    bonusVsBuildings: number;
    arc: 'flat' | 'lob';
  }) {
    super(opts.player, opts.pos, 1);
    this.sourcePlayer = opts.player;
    this.targetId = opts.targetId;
    this.targetPos = { ...opts.targetPos };
    this.speed = opts.speed;
    this.damage = opts.damage;
    this.pierce = opts.pierce;
    this.splash = opts.splash;
    this.bonusVsBuildings = opts.bonusVsBuildings;
    this.arc = opts.arc;
  }
}

// ---------------------------------------------------------------------------
// Map objectives (shrines, trade posts, relics, watch hills)
// ---------------------------------------------------------------------------

export class ObjectivePoint extends Entity {
  readonly objType: 'shrine' | 'tradePost' | 'watchHill' | 'relic';
  /** Player currently holding it, or NEUTRAL_PLAYER. */
  owner: PlayerId = NEUTRAL_PLAYER;
  captureProgress = 0;
  /** Cumulative held seconds per player (shrine victory mode). */
  heldSecs = new Map<PlayerId, number>();

  constructor(pos: Vec2, objType: ObjectivePoint['objType']) {
    super(NEUTRAL_PLAYER, pos, 1);
    this.objType = objType;
  }
}

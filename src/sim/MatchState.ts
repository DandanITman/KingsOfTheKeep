import { Rng } from '@/core/Rng';
import { SpatialHash } from '@/core/SpatialHash';
import { EventBus } from '@/core/EventBus';
import type { Vec2 } from '@/core/mathUtils';
import type {
  Cost,
  FactionDef,
  GatherResource,
  MapDef,
  MatchSetup,
  Resource,
  Tier,
  UnitRole,
} from '@/data/types';
import { MORALE_BASE, STARTING_COMMAND_CAP } from '@/data/balance';
import type { Command, EntityId, PlayerId, Stance } from './commands';
import {
  Building,
  Entity,
  Flag,
  ObjectivePoint,
  Projectile,
  ResourceNode,
  Unit,
} from './entities/Entity';
import { ModifierStack } from './ModifierStack';
import { NavGrid } from './path/NavGrid';
import { FlowFieldCache } from './path/FlowField';
import { FogOfWar } from './systems/FogSystem';

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

export interface CardSlot {
  cardId: string;
  cooldownTicks: number;
}

export interface PlayerState {
  id: PlayerId;
  faction: FactionDef;
  isBot: boolean;
  resources: Record<Resource, number>;
  commandUsed: number;
  commandCap: number;
  tier: Tier;
  /** Card bar: the player's deck, always visible, each with cooldown state. */
  cards: CardSlot[];
  completedUpgrades: Set<string>;
  mods: ModifierStack;
  stanceAttack: boolean;
  stanceDefend: boolean;
  attackAlloc: Record<UnitRole, number>;
  defendAlloc: Record<UnitRole, number>;
  workerRatios: Record<GatherResource, number>;
  /** Emergency overrides. */
  fullAssaultUntilTick: number | null;
  defeated: boolean;
  /** Score for timed-score mode. */
  score: number;
  fortressId: EntityId | null;
  /** Positions of recent ally deaths (morale) with expiry ticks. */
  recentDeaths: { pos: Vec2; expiresTick: number }[];
  /** Positions where our entities recently took damage (threat map). */
  recentThreats: { pos: Vec2; expiresTick: number }[];
  /** Index of the attack flag the army is currently marching to. */
  attackFlagIndex: number;
  /** Next flag order counter. */
  flagOrderCounter: number;
}

export function defaultAlloc(): Record<UnitRole, number> {
  return { worker: 0, infantry: 40, ranged: 30, cavalry: 20, siege: 10, support: 100 };
}

export function defaultDefendAlloc(): Record<UnitRole, number> {
  return { worker: 0, infantry: 60, ranged: 70, cavalry: 80, siege: 90, support: 0 };
}

export function defaultWorkerRatios(): Record<GatherResource, number> {
  return { food: 30, wood: 30, stone: 20, gold: 20 };
}

// ---------------------------------------------------------------------------
// Timed area effects (abilities)
// ---------------------------------------------------------------------------

export interface ActiveAreaEffect {
  kind: 'dot' | 'repair' | 'visionSuppress' | 'reveal' | 'income';
  player: PlayerId;
  pos: Vec2;
  radius: number;
  /** dps for dot, hp/sec for repair, amount/sec for income. */
  rate: number;
  expiresTick: number;
  resource?: string;
}

// ---------------------------------------------------------------------------
// Match state
// ---------------------------------------------------------------------------

export class MatchState {
  readonly setup: MatchSetup;
  readonly map: MapDef;
  readonly rng: Rng;
  readonly bus: EventBus;
  readonly nav: NavGrid;

  tick = 0;
  timeSecs = 0;

  entities = new Map<EntityId, Entity>();
  units: Unit[] = [];
  buildings: Building[] = [];
  nodes: ResourceNode[] = [];
  flags: Flag[] = [];
  projectiles: Projectile[] = [];
  objectives: ObjectivePoint[] = [];

  players: PlayerState[] = [];

  /** Per-tick rebuilt hash of living units. */
  unitHash = new SpatialHash(3);
  /** Rebuilt when buildings change. */
  buildingHash = new SpatialHash(6);
  buildingHashDirty = true;

  commandQueue: Command[] = [];
  activeEffects: ActiveAreaEffect[] = [];
  /** Budgeted A* computations per tick. */
  pathComputationsThisTick = 0;
  flows: FlowFieldCache;
  fog: FogOfWar;

  /** Per-player memory of enemy buildings seen in fog. */
  seenBuildings: Map<EntityId, { pos: Vec2; defId: string; player: PlayerId }>[] = [];

  winner: PlayerId | null = null;
  endReason = '';

  constructor(setup: MatchSetup, map: MapDef, bus: EventBus) {
    this.setup = setup;
    this.map = map;
    this.bus = bus;
    this.rng = new Rng(setup.seed);
    this.nav = new NavGrid(map);
    this.flows = new FlowFieldCache();
    this.fog = new FogOfWar(map.worldSize[0], map.worldSize[1]);
  }

  // --- entity management ---

  addUnit(unit: Unit): Unit {
    this.entities.set(unit.id, unit);
    this.units.push(unit);
    return unit;
  }

  addBuilding(b: Building): Building {
    this.entities.set(b.id, b);
    this.buildings.push(b);
    this.buildingHashDirty = true;
    return b;
  }

  addNode(n: ResourceNode): ResourceNode {
    this.entities.set(n.id, n);
    this.nodes.push(n);
    return n;
  }

  addFlag(f: Flag): Flag {
    this.entities.set(f.id, f);
    this.flags.push(f);
    return f;
  }

  addProjectile(p: Projectile): Projectile {
    this.entities.set(p.id, p);
    this.projectiles.push(p);
    return p;
  }

  addObjective(o: ObjectivePoint): ObjectivePoint {
    this.entities.set(o.id, o);
    this.objectives.push(o);
    return o;
  }

  unit(id: EntityId): Unit | null {
    const e = this.entities.get(id);
    return e instanceof Unit && !e.dead ? e : null;
  }

  building(id: EntityId): Building | null {
    const e = this.entities.get(id);
    return e instanceof Building && !e.dead ? e : null;
  }

  node(id: EntityId): ResourceNode | null {
    const e = this.entities.get(id);
    return e instanceof ResourceNode && !e.dead ? e : null;
  }

  /** Remove dead entities from arrays and the id map (end of tick). */
  sweepDead(): void {
    const sweep = <T extends Entity>(arr: T[]): T[] => {
      let changed = false;
      for (const e of arr) {
        if (e.dead) {
          this.entities.delete(e.id);
          changed = true;
        }
      }
      return changed ? arr.filter((e) => !e.dead) : arr;
    };
    this.units = sweep(this.units);
    const before = this.buildings.length;
    this.buildings = sweep(this.buildings);
    if (this.buildings.length !== before) this.buildingHashDirty = true;
    this.nodes = sweep(this.nodes);
    this.flags = sweep(this.flags);
    this.projectiles = sweep(this.projectiles);
  }

  // --- player helpers ---

  player(id: PlayerId): PlayerState {
    return this.players[id];
  }

  enemyOf(id: PlayerId): PlayerState {
    return this.players[id === 0 ? 1 : 0];
  }

  canAfford(player: PlayerId, cost: Cost): boolean {
    const p = this.players[player];
    for (const [res, amt] of Object.entries(cost)) {
      if ((p.resources[res as Resource] ?? 0) < (amt ?? 0)) return false;
    }
    return true;
  }

  payCost(player: PlayerId, cost: Cost): boolean {
    if (!this.canAfford(player, cost)) return false;
    const p = this.players[player];
    for (const [res, amt] of Object.entries(cost)) {
      p.resources[res as Resource] -= amt ?? 0;
    }
    return true;
  }

  refund(player: PlayerId, cost: Cost, fraction = 1): void {
    const p = this.players[player];
    for (const [res, amt] of Object.entries(cost)) {
      p.resources[res as Resource] += Math.floor((amt ?? 0) * fraction);
    }
  }

  /**
   * Cumulative gross income per player/resource (spending excluded). The HUD
   * samples this over a rolling window to show "+N /min" rates.
   */
  incomeTally: Partial<Record<Resource, number>>[] = [];

  addResource(player: PlayerId, resource: Resource, amount: number): void {
    this.players[player].resources[resource] += amount;
    this.players[player].score += amount * 0.01;
    const tally = (this.incomeTally[player] ??= {});
    tally[resource] = (tally[resource] ?? 0) + amount;
  }

  /**
   * The player's main fortress. `fortressId` is a cache of the primary keep; if
   * that one has fallen we rescan for any other fortress the player still holds
   * and re-cache it. Without the rescan, owning a second fortress did nothing —
   * `VictorySystem` treats a null result as defeat, so the original keep was
   * always the sole loss condition no matter what else you had built.
   */
  fortressOf(player: PlayerId): Building | null {
    const id = this.players[player].fortressId;
    if (id !== null) {
      const cached = this.building(id);
      if (cached && !cached.dead) return cached;
    }
    // Only finished keeps count — otherwise dropping a foundation would be
    // enough to stave off defeat indefinitely.
    for (const b of this.buildings) {
      if (b.dead || b.player !== player || b.def.kind !== 'fortress' || !b.complete) continue;
      this.players[player].fortressId = b.id;
      return b;
    }
    this.players[player].fortressId = null;
    return null;
  }
}

export function createPlayerState(
  id: PlayerId,
  faction: FactionDef,
  isBot: boolean,
  startingResources: Record<string, number>,
): PlayerState {
  const mods = new ModifierStack();
  for (const bonus of faction.bonuses) mods.add(bonus, `faction:${faction.id}`);
  return {
    id,
    faction,
    isBot,
    resources: {
      food: startingResources.food ?? 0,
      wood: startingResources.wood ?? 0,
      stone: startingResources.stone ?? 0,
      gold: startingResources.gold ?? 0,
      influence: startingResources.influence ?? 0,
    },
    commandUsed: 0,
    commandCap: STARTING_COMMAND_CAP,
    tier: 1,
    cards: [],
    completedUpgrades: new Set(),
    mods,
    stanceAttack: false,
    stanceDefend: true,
    attackAlloc: defaultAlloc(),
    defendAlloc: defaultDefendAlloc(),
    workerRatios: defaultWorkerRatios(),
    fullAssaultUntilTick: null,
    defeated: false,
    score: 0,
    fortressId: null,
    recentDeaths: [],
    recentThreats: [],
    attackFlagIndex: 0,
    flagOrderCounter: 0,
  };
}

export { MORALE_BASE };
export type { Stance };

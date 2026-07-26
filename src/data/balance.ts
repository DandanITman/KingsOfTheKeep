/**
 * Global gameplay tunables. Every cross-cutting number the sim uses lives
 * here so balance passes touch data, not code.
 */

import type { Resource, UnitRole } from './types';

export const TICK_RATE = 10; // sim ticks per second
export const TICK_SECS = 1 / TICK_RATE;

// --- Match start (GDD §13.2) ---
export const STARTING_RESOURCES: Record<'standard' | 'rich', Partial<Record<Resource, number>>> = {
  standard: { food: 300, wood: 300, stone: 150, gold: 100, influence: 0 },
  rich: { food: 600, wood: 600, stone: 300, gold: 200, influence: 0 },
};
export const STARTING_WORKERS = 5;
export const STARTING_COMMAND_CAP = 30;
export const MAX_COMMAND_CAP = 200;

// --- Economy ---
export const GATHER_TRIP_AMOUNT = 10; // carried per trip
export const GATHER_SECS: Record<string, number> = {
  food: 6,
  wood: 7,
  stone: 8,
  gold: 8,
};
/** Economy building efficiency by distance to node (fraction of gatherRadius). */
export const CAMP_EFFICIENCY_NEAR = 1.0; // within 50% of radius
export const CAMP_EFFICIENCY_MID = 0.75; // within 100%
export const CAMP_EFFICIENCY_FAR = 0.5; // beyond (still valid, warned yellow)
export const WORKER_REASSIGN_SECS = 2;
export const FARM_FOOD_PER_SEC = 0.45; // per staffed farm worker slot
export const MARKET_TRADE_RATE = 0.65; // sell 100 → get 65 of target
export const MARKET_PASSIVE_GOLD_PER_MIN = 6;

// --- Combat ---
/** damage = max(1, atk * counterMult * moraleMult * modMult - armor). */
export const COUNTER_TABLE: Partial<Record<UnitRole, Partial<Record<UnitRole, number>>>> = {
  infantry: { ranged: 1.3, siege: 1.5 },
  ranged: { infantry: 1.25 },
  cavalry: { ranged: 1.75, siege: 1.75, worker: 1.5, support: 1.4 },
  siege: {},
  support: {},
};
/**
 * Extra tag-based counters (spear vs cavalry etc), applied multiplicatively on
 * top of `COUNTER_TABLE`. Every predicate present must match for `mult` to
 * apply; omitted predicates are wildcards.
 */
export const TAG_COUNTERS: {
  attackerTag?: string;
  attackerRole?: UnitRole;
  defenderRole?: UnitRole;
  defenderTag?: string;
  mult: number;
}[] = [
  { attackerTag: 'spear', defenderRole: 'cavalry', mult: 2.0 },
  { attackerTag: 'antiCavalry', defenderRole: 'cavalry', mult: 1.8 },
  { attackerTag: 'skirmisher', defenderRole: 'ranged', mult: 1.5 },
  // Shields blunt arrows: the archer is the ATTACKER and the shielded unit the
  // DEFENDER. This used to be written the other way round (`attackerTag:
  // 'shielded', defenderRole: 'ranged'`), which made shield units deal 30% less
  // damage to archers — the opposite of the intent recorded in its own comment.
  { attackerRole: 'ranged', defenderTag: 'shielded', mult: 0.7 },
];
export const TARGET_ACQUIRE_PERIOD_TICKS = 5;
export const PROJECTILE_SPEED = 22; // world units/sec
export const SIEGE_PROJECTILE_SPEED = 14;
export const RETALIATE_LEASH = 10; // how far idle/defend units chase attackers

// --- Morale (GDD §21) ---
export const MORALE_BASE = 70;
export const MORALE_MIN_MULT = 0.75;
export const MORALE_ROUT_THRESHOLD = 20;
export const MORALE_RECOVER_THRESHOLD = 40;
export const MORALE_FORTRESS_RADIUS = 24;
export const MORALE_FORTRESS_BONUS = 10;
export const MORALE_ALLY_DEATH_PENALTY = 4;
export const MORALE_DEATH_MEMORY_SECS = 8;
export const MORALE_REGEN_PER_SEC = 1.2;
export const MORALE_UPDATE_PERIOD_TICKS = 10;

// --- Buildings ---
export const CONSTRUCTION_BASE_RATE = 1; // hp fraction progress = builders^0.5 * dt / buildSecs
export const REPAIR_HP_PER_SEC = 6;
export const REPAIR_COST_FRACTION = 0.25; // of build cost per full repair
export const BUILDING_REFUND_FRACTION = 0.5; // refunded if cancelled/destroyed during construction

// --- Macro ---
export const MACRO_RECONCILE_SECS = 0.5;
export const MARCH_REGROUP_FRACTION = 0.7;
export const MARCH_FLAG_RADIUS = 8;
export const ASSAULT_FLAG_RADIUS = 14;
export const DEFEND_LEASH_RADIUS = 18;
export const HARASS_SPEED_THRESHOLD = 4.5;
export const EMERGENCY_FULL_ASSAULT_SECS = 60;

// --- Fortress garrison & ballista (castle defense) ---
/** Ranged units that can mount the fortress walls per tier (tier 1 = none). */
export const FORTRESS_GARRISON_SLOTS: Record<number, number> = { 1: 0, 2: 4, 3: 6, 4: 8 };
/** Extra attack range garrisoned archers gain from elevation. */
export const GARRISON_RANGE_BONUS = 2.5;
/** Tier-4 fortress rooftop ballista. */
export const FORTRESS_BALLISTA = { damage: 55, range: 17, periodSecs: 4.0, splash: 1.2 };

// --- House upgrades (level 2 and 3) ---
export const HOUSE_UPGRADES: { cost: Partial<Record<Resource, number>>; hp: number; command: number; name: string }[] = [
  { cost: { wood: 80, stone: 20 }, hp: 150, command: 4, name: 'Homestead' },
  { cost: { wood: 120, stone: 60, gold: 40 }, hp: 250, command: 6, name: 'Manor' },
];

// --- Vision ---
export const FOG_CELL = 2; // world units per fog cell
export const FOG_UPDATE_PERIOD_TICKS = 3;

// --- Victory modes ---
export const SHRINE_HOLD_SECS = 240; // cumulative to win shrine mode
export const SHRINE_CAPTURE_RADIUS = 10;
export const SURVIVAL_WAVES = 8;
export const SURVIVAL_WAVE_INTERVAL_SECS = 90;
export const TIMED_SCORE_SECS = 20 * 60;
/** Annihilation mode: no defeat check at all before this point in the match. */
export const ANNIHILATION_GRACE_SECS = 300;

// --- Influence ---
export const INFLUENCE_TIER3_PER_MIN = 4;
export const INFLUENCE_TIER4_PER_MIN = 8;
export const INFLUENCE_SHRINE_PER_MIN = 6;

// --- Progression ---
export const REWARD_WIN: Record<'easy' | 'medium' | 'hard', number> = { easy: 100, medium: 175, hard: 300 };
export const REWARD_LOSS = 40;
export const PACK_PRICE = 100;
export const PACK_SIZE = 5;
export const DUST_PER_DUPE: Record<string, number> = { common: 5, uncommon: 10, rare: 25, epic: 60, legendary: 150 };
export const CRAFT_COST: Record<string, number> = { common: 20, uncommon: 40, rare: 100, epic: 250, legendary: 600 };

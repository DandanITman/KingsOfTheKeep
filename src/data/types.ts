/**
 * Core data schemas for Kings of the Keep (GDD §45).
 * All card/unit/building/faction/map content is data conforming to these
 * types — the sim interprets data, it never special-cases individual cards.
 */

import type { Vec2 } from '@/core/mathUtils';

// ---------------------------------------------------------------------------
// Identifiers & shared enums
// ---------------------------------------------------------------------------

export type FactionId = 'european' | 'asian' | 'african' | 'middleEastern' | 'neutral';
export const PLAYABLE_FACTIONS: FactionId[] = ['european', 'asian', 'african', 'middleEastern'];

export type Resource = 'food' | 'wood' | 'stone' | 'gold' | 'influence';
export const GATHER_RESOURCES = ['food', 'wood', 'stone', 'gold'] as const;
export type GatherResource = (typeof GATHER_RESOURCES)[number];

export type Cost = Partial<Record<Resource, number>>;

/** Coarse role buckets used by macro allocation sliders and counters. */
export type UnitRole = 'worker' | 'infantry' | 'ranged' | 'cavalry' | 'siege' | 'support';
export const MILITARY_ROLES: UnitRole[] = ['infantry', 'ranged', 'cavalry', 'siege', 'support'];

export type UnitTag =
  | 'spear'
  | 'heavy'
  | 'shielded'
  | 'skirmisher'
  | 'elite'
  | 'beast'
  | 'mobileRanged'
  | 'hero'
  | 'defensive'
  | 'trade'
  | 'builder'
  | 'antiCavalry'
  | 'fire';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type CardType =
  | 'fortress'
  | 'civilian'
  | 'economyBuilding'
  | 'militaryBuilding'
  | 'upgradeBuilding'
  | 'unit'
  | 'defense'
  | 'ability'
  | 'factionPower'
  | 'hero';

export type Tier = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Modifiers (upgrades, faction bonuses, timed buffs all share this shape)
// ---------------------------------------------------------------------------

/**
 * A stat path names what is modified, e.g. 'gatherRate.wood', 'unit.damage',
 * 'unit.infantry.armor', 'building.hp', 'trainSpeed', 'buildSpeed'.
 */
export type StatPath = string;

export interface ModifierOp {
  stat: StatPath;
  op: 'mul' | 'add';
  value: number;
}

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

export type UnitFilter = {
  roles?: UnitRole[];
  tags?: UnitTag[];
  ally?: boolean; // true = affects caster's units, false = enemy's
};

export type AbilityEffect =
  | { type: 'damageArea'; radius: number; damage: number; vs: 'units' | 'buildings' | 'all'; dot?: { dps: number; secs: number } }
  | { type: 'buff'; radius?: number; filter?: UnitFilter; stat: StatPath; op: 'mul' | 'add'; value: number; durationSecs: number }
  | { type: 'moraleChange'; radius: number; amount: number; ally: boolean }
  | { type: 'visionSuppress'; radius: number; durationSecs: number }
  | { type: 'reveal'; radius: number; durationSecs: number }
  | { type: 'spawnUnits'; unitId: string; count: number; temporarySecs?: number }
  | { type: 'repair'; radius: number; hpPerSec: number; durationSecs: number }
  | { type: 'productionBoost'; mul: number; durationSecs: number }
  | { type: 'gatherBoost'; resource?: GatherResource; mul: number; durationSecs: number }
  | { type: 'incomeBurst'; resource: Resource; amountPerSec: number; durationSecs: number };

export interface AbilityDef {
  target: 'point' | 'area' | 'global' | 'armyGroup';
  radius?: number;
  effects: AbilityEffect[];
  vfx: string;
  sfx: string;
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export interface CardRequirements {
  tier?: Tier;
  buildingId?: string;
}

export interface Card {
  id: string;
  name: string;
  faction: FactionId;
  type: CardType;
  rarity: Rarity;
  deckPoints: number;
  description: string;
  /** Key into the procedural icon glyph renderer. */
  icon: string;
  requirements?: CardRequirements;
  /** Exactly one payload depending on type: */
  unitId?: string;
  buildingId?: string;
  ability?: AbilityDef;
  /** Ability/power cards: cast cost & cooldown (unit/building cards defer to their defs). */
  cost?: Cost;
  cooldownSecs?: number;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export interface UnitDef {
  id: string;
  name: string;
  faction: FactionId;
  role: UnitRole;
  tags: UnitTag[];
  hp: number;
  armor: number;
  pierceArmor: number;
  damage: number;
  attackPeriodSecs: number;
  /** <= 0.8 is melee; larger values are ranged and spawn projectiles. */
  range: number;
  bonusVsBuildings?: number;
  speed: number;
  los: number;
  commandCost: number;
  cost: Cost;
  trainSecs: number;
  /** Building id that trains this unit ('' for starting workers/spawned units). */
  trainedAt: string;
  moraleAura?: { radius: number; bonus: number };
  /** Passive income for trade units (gold per completed loop etc). */
  tradeGoldPerTrip?: number;
  healPerSec?: number;
  hero?: { activeCardId: string; respawnSecs: number };
  mesh: string;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

export type BuildingKind = 'fortress' | 'economy' | 'military' | 'upgrade' | 'defense' | 'special';

export interface BuildingDef {
  id: string;
  name: string;
  faction: FactionId;
  kind: BuildingKind;
  hp: number;
  armor: number;
  /** Footprint in nav cells (width, height). */
  footprint: [number, number];
  cost: Cost;
  buildSecs: number;
  requirements?: { tier?: Tier };
  trains?: string[];
  researches?: string[];
  dropoffFor?: GatherResource[];
  /** Economy buildings: max distance to matching resource nodes for efficiency. */
  gatherRadius?: number;
  /** Which resource node type this building works (farms generate their own). */
  gatherResource?: GatherResource;
  /** Farms: passive food per second when staffed. */
  passiveIncome?: { resource: Resource; perSec: number };
  commandProvided?: number;
  influencePerMin?: number;
  attack?: { damage: number; range: number; periodSecs: number; pierce?: boolean };
  aura?: { radius: number; effects: ModifierOp[]; moraleBonus?: number };
  /** Fortress only: ordered tier upgrade ids. */
  tierUpgrades?: string[];
  /** Walls/gates: enemy-blocking; gate lets owner units through. */
  isWall?: boolean;
  isGate?: boolean;
  los?: number;
  mesh: string;
}

// ---------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Building id where this is researched. */
  building: string;
  tier: Tier;
  cost: Cost;
  researchSecs: number;
  effects: ModifierOp[];
  /** Fortress tier upgrades set this to the tier reached. */
  grantsTier?: Tier;
  icon: string;
}

// ---------------------------------------------------------------------------
// Factions
// ---------------------------------------------------------------------------

export interface BotPersonality {
  eco: number;
  aggro: number;
  tech: number;
  raid: number;
  siege: number;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  description: string;
  fortressCardId: string;
  workerUnitId: string;
  colorPrimary: number;
  colorAccent: number;
  bonuses: ModifierOp[];
  botPersonality: BotPersonality;
}

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

export type Biome = 'grass' | 'desert' | 'savanna' | 'mountain';

export interface MapResourceSpot {
  type: 'gold' | 'stone' | 'forest' | 'berries';
  pos: Vec2;
  amount: number;
}

export interface MapObjective {
  type: 'shrine' | 'tradePost' | 'watchHill' | 'relic';
  pos: Vec2;
}

export interface MapBlocker {
  pos: Vec2;
  radius: number;
  kind: 'cliff' | 'water' | 'rocks';
}

export interface MapDef {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  description: string;
  /** World units; nav grid is worldSize (1 cell = 1 unit). */
  worldSize: [number, number];
  spawns: Vec2[];
  terrain: { seed: number; biome: Biome };
  resources: MapResourceSpot[];
  objectives?: MapObjective[];
  blockers?: MapBlocker[];
}

// ---------------------------------------------------------------------------
// Decks & save data
// ---------------------------------------------------------------------------

export interface Deck {
  id: string;
  name: string;
  faction: FactionId;
  cardIds: string[];
}

export const DECK_MAX_POINTS = 50;
export const DECK_MAX_CARDS = 20;

export interface DisplayOptions {
  quality: 'low' | 'medium' | 'high';
  shadows: 'off' | 'low' | 'high';
  cameraSpeed: number;
  uiScale: number;
  edgeScroll: boolean;
  healthBars: 'always' | 'damaged' | 'selected';
  unitLabels: 'off' | 'important' | 'all';
}

export interface AudioOptions {
  master: number;
  music: number;
  sfx: number;
  ui: number;
  ambience: number;
  muteUnfocused: boolean;
}

export interface GameplayOptions {
  autoAssignCivilians: boolean;
  beginnerTips: boolean;
  pauseOnMenu: boolean;
  attackBehavior: 'aggressive' | 'balanced' | 'conservative';
  defendBehavior: 'holdWalls' | 'patrolBase' | 'protectEconomy';
}

export interface MatchStats {
  matches: number;
  wins: number;
  losses: number;
  byFaction: Record<string, { wins: number; losses: number }>;
  difficultyCleared: { easy: boolean; medium: boolean; hard: boolean };
  unitsTrained: number;
  keepsDestroyed: number;
  resourcesGathered: number;
  packsOpened: number;
  fastestWinSecs: number | null;
}

export interface SaveData {
  version: number;
  profile: { name: string; icon: string };
  currency: number;
  dust: number;
  /** cardId -> copies owned. */
  collection: Record<string, number>;
  decks: Deck[];
  stats: MatchStats;
  options: { display: DisplayOptions; audio: AudioOptions; gameplay: GameplayOptions };
}

// ---------------------------------------------------------------------------
// Match setup (Play screen -> MatchSim)
// ---------------------------------------------------------------------------

export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type VictoryMode = 'fortress' | 'shrines' | 'survival' | 'timedScore' | 'annihilation';

export interface MatchSetup {
  mapId: string;
  playerFaction: FactionId;
  botFaction: FactionId;
  botDifficulty: BotDifficulty;
  playerDeckId: string;
  botDeckId: string;
  speed: number;
  startingResources: 'standard' | 'rich';
  victoryMode: VictoryMode;
  seed: number;
}

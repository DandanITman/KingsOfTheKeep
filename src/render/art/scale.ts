/**
 * THE SCALE CONTRACT.
 *
 * Every number here is a height in world units (1 unit = 1 nav cell). This
 * module exists because the imported-model bug that made units float and render
 * ~2.5x oversized came from scale being an opaque multiplier — `s = 0.9` here,
 * `fitSize: 1.45` there — with no stated meaning and nothing checking it.
 *
 * The rules:
 *   1. Sizes are declared as heights, never as scale factors.
 *   2. Nothing auto-fits to a measured bound. Blind normalization is what
 *      produced the original bug; `tests/art.test.ts` asserts instead, so a
 *      mis-sized mesh fails the build rather than being silently rescaled.
 *   3. Every mesh is grounded — its lowest point sits at y = 0.
 *
 * The values below match the scale the game has always rendered at (measured
 * from the existing procedural builders), with a few deliberate corrections
 * noted inline.
 */

/** Reference infantry height. Everything else is read against this. */
export const MAN = 1.05;

/** A mesh's lowest point must sit within this of y = 0. */
export const GROUND_EPS = 0.04;

/** Allowed relative error between a builder's measured height and its declaration. */
export const HEIGHT_TOL = 0.12;

export const UNIT_HEIGHT: Record<string, number> = {
  // On foot. The visual baseline.
  worker: 1.0,
  swordsman: MAN,
  spearman: MAN,
  shieldman: 1.08,
  archer: MAN,
  crossbow: MAN,
  support: 1.06,
  monk: 1.06,
  banner: 1.05,
  drum: 1.05,
  champion: 1.22,

  // Mounted — must clear infantry unambiguously at RTS camera distance.
  lightCavalry: 1.5,
  horseArcher: 1.5,
  cavalry: 1.47,
  knight: 1.47,
  paladin: 1.55,
  camelRider: 1.6,
  camelArcher: 1.6,

  // Beasts and constructs.
  beast: 1.55,
  golem: 1.6,
  elephant: 1.96,

  // Siege. These were conspicuously squat — a catapult at 0.63 was shorter than
  // a kneeling man — so the throwing arms and frames now stand up properly.
  cart: 0.8,
  ram: 1.2,
  bombard: 1.0,
  ballista: 1.1,
  rocketCart: 1.3,
  catapult: 1.4,
  trebuchet: 2.4,
  siegeTower: 2.8,
};

export const BUILDING_HEIGHT: Record<string, number> = {
  // Walls and small works.
  woodenWall: 1.7,
  stoneWall: 1.92,
  gate: 2.6,
  alarmBell: 2.0,

  // Economy. The three gathering camps used to sit at ~1.0 — squat identical
  // boxes with no silhouette. They stand taller now so their headframes,
  // derricks and log piles actually read.
  farm: 1.4,
  house: 2.1,
  lumberCamp: 2.0,
  miningCamp: 2.3,
  quarry: 2.4,
  storehouse: 2.0,
  market: 2.2,
  bazaar: 2.4,
  caravanserai: 2.8,
  herdingGrounds: 2.2,
  drumCircle: 2.2,

  // Military.
  barracks: 2.4,
  archeryRange: 2.4,
  stable: 2.4,
  siegeWorkshop: 2.8,
  forge: 2.8,
  blacksmith: 2.7,
  warAcademy: 3.0,
  guildHall: 2.9,
  temple: 3.2,
  imperialAcademy: 3.1,
  warriorLodge: 2.9,
  fireworkFoundry: 2.8,
  fireOilFoundry: 2.8,
  sunfireYard: 2.6,
  cathedral: 5.2,

  // Defence.
  watchTower: 4.0,
  bambooWatchpost: 4.0,
  ballistaTower: 4.4,
  domeTower: 4.2,
  fortressTower: 5.0,

  // Keeps. Raised from a measured 4.65: at a 5x5 footprint a keep needs to be
  // about as tall as it is wide before it reads as a castle rather than a hall.
  keepEuropean: 5.6,
  keepAsian: 5.6,
  keepAfrican: 5.6,
  keepMiddleEastern: 5.6,
};

/** Keep height by fortress tier — each upgrade visibly grows the silhouette. */
export function keepHeight(tier: number): number {
  return 5.6 + 0.7 * (Math.max(1, Math.min(4, tier)) - 1);
}

/** House height by upgrade level (Hut / Homestead / Manor). */
export function houseHeight(level: number): number {
  return [2.1, 2.7, 3.2][Math.max(1, Math.min(3, level)) - 1];
}

/**
 * Where garrisoned archers stand on a keep. One definition — `UnitView` and
 * `OverlayCanvas` previously carried three different hardcoded guesses.
 */
export function wallWalkHeight(tier: number): number {
  return keepHeight(tier) * 0.62;
}

/** Where a health bar floats above an entity of the given height. */
export function barHeight(entityHeight: number): number {
  return entityHeight + 0.35;
}

/** Declared height for a unit archetype, falling back to the infantry baseline. */
export function unitHeight(meshKey: string): number {
  return UNIT_HEIGHT[meshKey] ?? MAN;
}

/** Ground radius used for contact shadows and selection decals. */
export function unitRadius(meshKey: string): number {
  const h = unitHeight(meshKey);
  switch (meshKey) {
    case 'elephant':
      return 0.85;
    case 'siegeTower':
    case 'trebuchet':
    case 'catapult':
    case 'ram':
    case 'bombard':
    case 'ballista':
    case 'rocketCart':
    case 'cart':
      return 0.6;
    case 'lightCavalry':
    case 'cavalry':
    case 'knight':
    case 'paladin':
    case 'horseArcher':
    case 'camelRider':
    case 'camelArcher':
      return 0.5;
    default:
      return 0.3 * (h / MAN);
  }
}

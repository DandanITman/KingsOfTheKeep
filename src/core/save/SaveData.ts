import type { SaveData } from '@/data/types';

export const SAVE_VERSION = 1;

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    profile: { name: 'Lord Commander', icon: 'crown' },
    currency: 500,
    dust: 0,
    collection: {},
    decks: [],
    stats: {
      matches: 0,
      wins: 0,
      losses: 0,
      byFaction: {},
      difficultyCleared: { easy: false, medium: false, hard: false },
      unitsTrained: 0,
      keepsDestroyed: 0,
      resourcesGathered: 0,
      packsOpened: 0,
      fastestWinSecs: null,
    },
    options: {
      display: {
        quality: 'high',
        shadows: 'low',
        cameraSpeed: 1,
        uiScale: 1,
        edgeScroll: true,
        healthBars: 'damaged',
        unitLabels: 'important',
      },
      audio: {
        master: 0.8,
        music: 0.6,
        sfx: 0.8,
        ui: 0.7,
        ambience: 0.5,
        muteUnfocused: true,
      },
      gameplay: {
        autoAssignCivilians: true,
        beginnerTips: true,
        pauseOnMenu: true,
        attackBehavior: 'balanced',
        defendBehavior: 'holdWalls',
      },
    },
  };
}

/**
 * Ordered migration chain: migrations[n] upgrades a version-n save to n+1.
 * Card ids are stable strings so collections/decks survive migrations.
 */
type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

export const migrations: Migration[] = [
  // v0 (pre-release) -> v1: no shipped v0 saves exist; regenerate.
  () => defaultSave() as unknown as Record<string, unknown>,
];

export function migrate(raw: Record<string, unknown>): SaveData {
  let data = raw;
  let version = typeof data.version === 'number' ? data.version : 0;
  while (version < SAVE_VERSION) {
    data = migrations[version](data);
    version = typeof data.version === 'number' ? (data.version as number) : version + 1;
  }
  // Backfill any newly-added fields from defaults, one level into each section.
  // A top-level-only backfill left a save carrying a partial `options` object
  // (say `{}`, or one missing `display`) untouched, and the app then died at
  // boot dereferencing `options.display.uiScale` with no way to recover.
  // Depth 3 reaches individual settings: save -> options -> display -> uiScale.
  const def = defaultSave() as unknown as Record<string, unknown>;
  backfill(data, def, 3);
  return data as unknown as SaveData;
}

/** Recursively fill missing keys from `defaults`, descending `depth` levels. */
function backfill(target: Record<string, unknown>, defaults: Record<string, unknown>, depth: number): void {
  for (const key of Object.keys(defaults)) {
    const fallback = defaults[key];
    const current = target[key];
    if (current === undefined || current === null) {
      target[key] = fallback;
    } else if (depth > 1 && isPlainObject(current) && isPlainObject(fallback)) {
      backfill(current, fallback, depth - 1);
    }
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

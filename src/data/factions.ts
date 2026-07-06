import type { FactionDef, FactionId } from './types';

export const FACTIONS: Record<Exclude<FactionId, 'neutral'>, FactionDef> = {
  european: {
    id: 'european',
    name: 'European',
    description:
      'Balanced, defensive, armored, reliable. Strong walls, heavy infantry, knights, and late-game upgrades.',
    fortressCardId: 'eu_crown_keep',
    workerUnitId: 'eu_serf_worker',
    colorPrimary: 0x3d6f9a,
    colorAccent: 0xd4af37,
    bonuses: [
      { stat: 'building.defense.hp', op: 'mul', value: 1.15 },
      { stat: 'unit.infantry.armor', op: 'add', value: 1 },
    ],
    botPersonality: { eco: 1.0, aggro: 0.8, tech: 1.2, raid: 0.6, siege: 1.0 },
  },
  asian: {
    id: 'asian',
    name: 'Asian',
    description:
      'Mobile, disciplined, technical, flexible. Fast repositioning, precision archers, formations, rocket siege.',
    fortressCardId: 'as_jade_palace',
    workerUnitId: 'as_village_worker',
    colorPrimary: 0xb3392e,
    colorAccent: 0x7ec8a9,
    bonuses: [
      { stat: 'unit.speed', op: 'mul', value: 1.08 },
      { stat: 'unit.ranged.damage', op: 'mul', value: 1.08 },
    ],
    botPersonality: { eco: 1.0, aggro: 1.1, tech: 1.1, raid: 0.9, siege: 0.9 },
  },
  african: {
    id: 'african',
    name: 'African',
    description:
      'Resilient, mobile, resourceful, pressure-based. Fast infantry, skirmishers, war beasts, morale drums.',
    fortressCardId: 'af_golden_hearth',
    workerUnitId: 'af_hearth_worker',
    colorPrimary: 0xc07820,
    colorAccent: 0x8a4b26,
    bonuses: [
      { stat: 'gatherRate', op: 'mul', value: 1.08 },
      { stat: 'unit.infantry.speed', op: 'mul', value: 1.08 },
    ],
    botPersonality: { eco: 1.05, aggro: 1.25, tech: 0.85, raid: 1.3, siege: 0.8 },
  },
  middleEastern: {
    id: 'middleEastern',
    name: 'Middle Eastern',
    description:
      'Trade, cavalry, siege, control, and powerful abilities. Gold economy, camel counters, great bombards.',
    fortressCardId: 'me_crescent_citadel',
    workerUnitId: 'me_town_worker',
    colorPrimary: 0x2e8a5c,
    colorAccent: 0xe8d9b0,
    bonuses: [
      { stat: 'gatherRate.gold', op: 'mul', value: 1.15 },
      { stat: 'unit.cavalry.trainSpeed', op: 'mul', value: 1.1 },
    ],
    botPersonality: { eco: 1.15, aggro: 0.9, tech: 1.0, raid: 1.1, siege: 1.25 },
  },
};

export function factionList(): FactionDef[] {
  return Object.values(FACTIONS);
}

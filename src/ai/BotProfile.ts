import type { BotDifficulty, FactionId, UnitRole } from '@/data/types';
import { FACTIONS } from '@/data/factions';

export interface BotProfile {
  /** Seconds between planner passes. */
  plannerIntervalSecs: number;
  /** Target worker count as a function of match minutes. */
  workerTarget: (minutes: number) => number;
  /** Army value (total command cost) that triggers an attack wave. */
  attackTriggerValue: number;
  /** Earliest attack time (seconds). */
  earliestAttackSecs: number;
  /** Desired army composition weights per role. */
  compWeights: Partial<Record<UnitRole, number>>;
  /** Gather-rate handicap/boost (mild, per GDD difficulty design). */
  ecoMultiplier: number;
  /** Chance per planner pass to research an available upgrade. */
  upgradeChance: number;
  /** Whether the bot uses ability cards. */
  useAbilities: boolean;
  /** Whether the bot raids economy with harass flags. */
  raids: boolean;
  /** Whether the bot counters the player's composition. */
  counters: boolean;
  /** Tier-up timing (seconds) for tiers 2/3/4. */
  tierTimings: [number, number, number];
  /** Fraction of army kept home when attacking. */
  attackAllocation: number;
}

const BASE_COMP: Partial<Record<UnitRole, number>> = { infantry: 4, ranged: 3, cavalry: 2, siege: 1 };

export function createBotProfile(difficulty: BotDifficulty, faction: FactionId): BotProfile {
  const personality = FACTIONS[faction as keyof typeof FACTIONS]?.botPersonality ?? {
    eco: 1,
    aggro: 1,
    tech: 1,
    raid: 0.5,
    siege: 1,
  };

  const comp: Partial<Record<UnitRole, number>> = { ...BASE_COMP };
  comp.siege = (comp.siege ?? 1) * personality.siege;
  comp.cavalry = (comp.cavalry ?? 2) * (personality.raid > 1 ? 1.4 : 1);

  switch (difficulty) {
    case 'easy':
      return {
        plannerIntervalSecs: 6,
        workerTarget: (m) => Math.min(14, 6 + Math.floor(m * 1.2)),
        attackTriggerValue: 28,
        earliestAttackSecs: 420 / personality.aggro,
        compWeights: comp,
        ecoMultiplier: 0.85,
        upgradeChance: 0.15,
        useAbilities: false,
        raids: false,
        counters: false,
        tierTimings: [360, 900, 9999],
        attackAllocation: 70,
      };
    case 'medium':
      return {
        plannerIntervalSecs: 3,
        workerTarget: (m) => Math.min(20, 7 + Math.floor(m * 1.8 * personality.eco)),
        attackTriggerValue: 36,
        earliestAttackSecs: 300 / personality.aggro,
        compWeights: comp,
        ecoMultiplier: 1.0,
        upgradeChance: 0.35,
        useAbilities: false,
        raids: personality.raid > 1,
        counters: false,
        tierTimings: [240, 600, 1100],
        attackAllocation: 80,
      };
    case 'hard':
      return {
        plannerIntervalSecs: 1.5,
        workerTarget: (m) => Math.min(26, 8 + Math.floor(m * 2.4 * personality.eco)),
        attackTriggerValue: 44,
        earliestAttackSecs: 240 / personality.aggro,
        compWeights: comp,
        ecoMultiplier: 1.1,
        upgradeChance: 0.6,
        useAbilities: true,
        raids: true,
        counters: true,
        tierTimings: [180, 480, 900],
        attackAllocation: 85,
      };
  }
}

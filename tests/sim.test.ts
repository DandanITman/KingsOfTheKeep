/**
 * Headless sim tests: proves sim/ runs without a DOM (the sim-purity
 * boundary) and exercises a fast-forwarded bot-vs-bot match per faction.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/EventBus';
import { MatchSim } from '@/sim/MatchSim';
import { BotController } from '@/ai/BotController';
import { createBotProfile } from '@/ai/BotProfile';
import { counterMultiplier } from '@/sim/systems/CombatSystem';
import { Unit } from '@/sim/entities/Entity';
import { getUnit } from '@/data/units';
import { migrate, defaultSave } from '@/core/save/SaveData';
import type { MatchSetup } from '@/data/types';
import { PLAYABLE_FACTIONS } from '@/data/types';

function makeSetup(overrides: Partial<MatchSetup> = {}): MatchSetup {
  return {
    mapId: 'greenvaleCrossing',
    playerFaction: 'european',
    botFaction: 'european',
    botDifficulty: 'medium',
    playerDeckId: 'starter',
    botDeckId: 'preset',
    speed: 1,
    startingResources: 'standard',
    victoryMode: 'fortress',
    seed: 12345,
    ...overrides,
  };
}

describe('headless sim', () => {
  it('initializes and ticks without a DOM', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    for (let i = 0; i < 600; i++) sim.tick();
    expect(sim.state.tick).toBe(600);
    expect(sim.state.units.length).toBeGreaterThan(0);
    // Workers should have gathered something by 60s.
    const p = sim.state.players[0];
    const total = p.resources.food + p.resources.wood + p.resources.stone + p.resources.gold;
    expect(total).toBeGreaterThan(850); // starting 850 + gathered
  });

  it.each(PLAYABLE_FACTIONS)('faction %s economy works under bot control', (faction) => {
    const sim = new MatchSim(makeSetup({ botFaction: faction, playerFaction: faction, seed: 777 }), new EventBus());
    const bot = new BotController(sim, createBotProfile('medium', faction));
    for (let i = 0; i < 3000; i++) {
      bot.update();
      sim.tick();
    }
    const botWorkers = sim.state.units.filter((u) => !u.dead && u.player === 1 && u.def.role === 'worker');
    const botBuildings = sim.state.buildings.filter((b) => !b.dead && b.player === 1);
    expect(botWorkers.length, `${faction} bot workers`).toBeGreaterThan(6);
    expect(botBuildings.length, `${faction} bot buildings`).toBeGreaterThan(3);
  });

  it('a hard bot defeats an idle player', () => {
    const sim = new MatchSim(makeSetup({ botDifficulty: 'hard', seed: 42 }), new EventBus());
    const bot = new BotController(sim, createBotProfile('hard', 'european'));
    let ticks = 0;
    while (sim.state.winner === null && ticks < 18000) {
      bot.update();
      sim.tick();
      ticks++;
    }
    expect(sim.state.winner).toBe(1);
  }, 30000);
});

describe('combat math', () => {
  it('spearmen counter cavalry', () => {
    const spear = new Unit(0, { x: 0, y: 0 }, getUnit('eu_levy_spearman'), 70);
    const knight = new Unit(1, { x: 1, y: 0 }, getUnit('eu_knight'), 70);
    expect(counterMultiplier(spear, knight)).toBeGreaterThanOrEqual(2);
    // And not the other way around.
    expect(counterMultiplier(knight, spear)).toBeLessThan(2);
  });

  it('cavalry counters ranged', () => {
    const knight = new Unit(0, { x: 0, y: 0 }, getUnit('eu_knight'), 70);
    const archer = new Unit(1, { x: 1, y: 0 }, getUnit('eu_shortbow_archer'), 70);
    expect(counterMultiplier(knight, archer)).toBeGreaterThan(1.5);
  });
});

describe('save migration', () => {
  it('regenerates corrupt/ancient saves and backfills fields', () => {
    const migrated = migrate({ some: 'garbage' });
    expect(migrated.version).toBe(defaultSave().version);
    expect(migrated.options.display.quality).toBeDefined();
  });
});

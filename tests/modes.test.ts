/** Victory mode and special-content tests. */
import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/EventBus';
import { MatchSim } from '@/sim/MatchSim';
import { Unit } from '@/sim/entities/Entity';
import { applyDamage } from '@/sim/systems/damage';
import { getUnit } from '@/data/units';
import type { MatchSetup } from '@/data/types';
import { SURVIVAL_WAVE_INTERVAL_SECS, TICK_RATE, TIMED_SCORE_SECS } from '@/data/balance';

function makeSetup(overrides: Partial<MatchSetup> = {}): MatchSetup {
  return {
    mapId: 'twinKeepsValley',
    playerFaction: 'european',
    botFaction: 'asian',
    botDifficulty: 'medium',
    playerDeckId: 'starter',
    botDeckId: 'preset',
    speed: 1,
    startingResources: 'standard',
    victoryMode: 'fortress',
    seed: 999,
    ...overrides,
  };
}

describe('victory modes', () => {
  it('survival mode spawns escalating waves', () => {
    const bus = new EventBus();
    let waves = 0;
    bus.on('waveStarted', () => waves++);
    const sim = new MatchSim(makeSetup({ victoryMode: 'survival' }), bus);
    const ticks = Math.round(SURVIVAL_WAVE_INTERVAL_SECS * 2.2 * TICK_RATE);
    for (let i = 0; i < ticks && sim.state.winner === null; i++) sim.tick();
    expect(waves).toBeGreaterThanOrEqual(2);
    const attackers = sim.state.units.filter((u) => !u.dead && u.player === 1 && u.def.role !== 'worker');
    expect(attackers.length).toBeGreaterThan(0);
  }, 30000);

  it('timed score mode ends at the time limit with the higher score winning', () => {
    const sim = new MatchSim(makeSetup({ victoryMode: 'timedScore' }), new EventBus());
    sim.state.players[0].score = 500;
    sim.state.timeSecs = TIMED_SCORE_SECS - 2;
    for (let i = 0; i < 60 && sim.state.winner === null; i++) sim.tick();
    expect(sim.state.winner).toBe(0);
  });

  it('shrine capture accrues hold time and influence', () => {
    const sim = new MatchSim(makeSetup({ victoryMode: 'shrines' }), new EventBus());
    const shrine = sim.state.objectives.find((o) => o.objType === 'shrine')!;
    expect(shrine).toBeDefined();
    const guard = new Unit(0, { ...shrine.pos }, getUnit('eu_levy_spearman'), 70);
    guard.task = { kind: 'idle' };
    sim.state.addUnit(guard);
    const before = sim.state.players[0].resources.influence;
    for (let i = 0; i < 120; i++) sim.tick();
    expect(shrine.owner).toBe(0);
    expect(shrine.heldSecs.get(0) ?? 0).toBeGreaterThan(5);
    expect(sim.state.players[0].resources.influence).toBeGreaterThan(before);
  });

  it('heroes are unique on the field and recharge on death', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const p = sim.state.players[0];
    p.cards.push({ cardId: 'card_hero_lion_duke', cooldownTicks: 0 });
    p.resources.gold = 1000;
    p.resources.food = 1000;
    p.tier = 3;
    sim.enqueue({ kind: 'playCard', player: 0, cardId: 'card_hero_lion_duke' });
    sim.tick();
    const hero = sim.state.units.find((u) => u.defId === 'hero_lion_duke');
    expect(hero).toBeDefined();

    sim.enqueue({ kind: 'playCard', player: 0, cardId: 'card_hero_lion_duke' });
    sim.tick();
    expect(sim.state.units.filter((u) => !u.dead && u.defId === 'hero_lion_duke').length).toBe(1);

    applyDamage(sim.state, hero!, 99999, { sourcePlayer: 1, trueDamage: true });
    sim.tick();
    const slot = p.cards.find((c) => c.cardId === 'card_hero_lion_duke')!;
    expect(slot.cooldownTicks).toBeGreaterThan(0);
  });
});

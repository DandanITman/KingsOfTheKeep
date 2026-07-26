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
import { Building, Unit } from '@/sim/entities/Entity';
import { getUnit } from '@/data/units';
import { ANNIHILATION_GRACE_SECS } from '@/data/balance';
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

function makeSim(overrides: Partial<MatchSetup> = {}): { sim: MatchSim } {
  return { sim: new MatchSim(makeSetup(overrides), new EventBus()) };
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

  it('shields blunt arrows rather than weakening the shield unit', () => {
    const archer = new Unit(0, { x: 0, y: 0 }, getUnit('eu_shortbow_archer'), 70);
    const shieldman = new Unit(1, { x: 1, y: 0 }, getUnit('eu_shieldman'), 70);
    const swordsman = new Unit(1, { x: 1, y: 0 }, getUnit('eu_militia_swordsman'), 70);
    // Archers do less to a shielded target than to an unshielded one...
    expect(counterMultiplier(archer, shieldman)).toBeLessThan(counterMultiplier(archer, swordsman));
    // ...and the shield unit is not itself penalised for attacking archers.
    expect(counterMultiplier(shieldman, archer)).toBeGreaterThanOrEqual(1);
  });
});

describe('damage over time', () => {
  it('applies dotOnHit from ranged attacks, not just melee', () => {
    const { sim } = makeSim();
    const state = sim.state;
    // A ranged unit that carries dotOnHit, firing at an enemy in range.
    const shooter = state.addUnit(
      new Unit(0, { x: 20, y: 20 }, getUnit('me_fire_siphon_team'), 70),
    );
    const victim = state.addUnit(new Unit(1, { x: 22, y: 20 }, getUnit('eu_levy_spearman'), 70));
    shooter.task = { kind: 'fight', targetId: victim.id, returnTo: { ...shooter.pos } };

    // Long enough for the shot to fire and the projectile to land.
    for (let i = 0; i < 60 && victim.dots.length === 0; i++) sim.tick();

    expect(victim.dots.length).toBeGreaterThan(0);
    expect(victim.dots[0].dps).toBe(getUnit('me_fire_siphon_team').dotOnHit!.dps);
  });
});

describe('fortress loss condition', () => {
  it('does not concede while the player still holds another finished fortress', () => {
    const { sim } = makeSim();
    const state = sim.state;
    const original = state.fortressOf(0)!;
    expect(original).toBeTruthy();

    // A second, completed keep well away from the first.
    const second = new Building(
      0,
      { x: original.pos.x + 20, y: original.pos.y + 20 },
      original.def,
      { x: Math.round(original.pos.x) + 20, y: Math.round(original.pos.y) + 20 },
      true,
    );
    state.addBuilding(second);

    // Raze the original.
    original.hp = 0;
    original.dead = true;

    expect(state.fortressOf(0)?.id).toBe(second.id);
    for (let i = 0; i < 30; i++) sim.tick();
    expect(state.winner).toBeNull();
  });

  it('concedes once every fortress is gone', () => {
    const { sim } = makeSim();
    const state = sim.state;
    const fortress = state.fortressOf(0)!;
    fortress.hp = 0;
    fortress.dead = true;

    expect(state.fortressOf(0)).toBeNull();
    for (let i = 0; i < 30; i++) sim.tick();
    expect(state.winner).toBe(1);
  });
});

describe('annihilation mode', () => {
  it('does not eliminate a player who can still afford to rebuild', () => {
    const { sim } = makeSim({ victoryMode: 'annihilation' });
    const state = sim.state;
    // Past the grace period, no army, no military buildings — but the starting
    // resources cover a barracks, so this is a slow start, not an annihilation.
    state.timeSecs = ANNIHILATION_GRACE_SECS + 60;
    for (const u of state.units) if (u.def.role !== 'worker') u.dead = true;
    for (const b of state.buildings) if (b.def.kind === 'military') b.dead = true;
    state.players[0].resources.food = 9999;
    state.players[0].resources.wood = 9999;
    state.players[0].resources.gold = 9999;
    state.players[0].resources.stone = 9999;

    for (let i = 0; i < 30; i++) sim.tick();
    expect(state.winner).toBeNull();
  });
});

describe('order queue', () => {
  it('queued orders run in sequence; an unqueued order discards them', () => {
    const { sim } = makeSim();
    const state = sim.state;
    const unit = state.addUnit(new Unit(0, { x: 30, y: 30 }, getUnit('eu_levy_spearman'), 70));

    sim.enqueue({ kind: 'directOrder', player: 0, unitIds: [unit.id], dest: { x: 34, y: 30 }, attackMove: false });
    sim.enqueue({ kind: 'directOrder', player: 0, unitIds: [unit.id], dest: { x: 38, y: 30 }, attackMove: false, queue: true });
    sim.tick();
    expect(unit.orders).toHaveLength(1);
    expect(unit.task.kind).toBe('move');

    // Run until the first leg completes and the queue advances.
    for (let i = 0; i < 400 && unit.orders.length > 0; i++) sim.tick();
    expect(unit.orders).toHaveLength(0);

    // A plain order wipes anything still pending.
    sim.enqueue({ kind: 'directOrder', player: 0, unitIds: [unit.id], dest: { x: 44, y: 30 }, attackMove: false, queue: true });
    sim.tick();
    expect(unit.orders.length + (unit.task.kind === 'move' ? 1 : 0)).toBeGreaterThan(0);
    sim.enqueue({ kind: 'directOrder', player: 0, unitIds: [unit.id], dest: { x: 30, y: 30 }, attackMove: false });
    sim.tick();
    expect(unit.orders).toHaveLength(0);
  });

  it('stop clears the queue and hold position is a toggle', () => {
    const { sim } = makeSim();
    const state = sim.state;
    const unit = state.addUnit(new Unit(0, { x: 30, y: 30 }, getUnit('eu_levy_spearman'), 70));

    sim.enqueue({ kind: 'directOrder', player: 0, unitIds: [unit.id], dest: { x: 40, y: 30 }, attackMove: false });
    sim.enqueue({ kind: 'directOrder', player: 0, unitIds: [unit.id], dest: { x: 50, y: 30 }, attackMove: false, queue: true });
    sim.tick();
    expect(unit.orders).toHaveLength(1);

    sim.enqueue({ kind: 'stopUnits', player: 0, unitIds: [unit.id] });
    sim.tick();
    expect(unit.orders).toHaveLength(0);
    expect(unit.holdPosition).toBe(false);

    sim.enqueue({ kind: 'holdPosition', player: 0, unitIds: [unit.id] });
    sim.tick();
    expect(unit.holdPosition).toBe(true);
    sim.enqueue({ kind: 'holdPosition', player: 0, unitIds: [unit.id] });
    sim.tick();
    expect(unit.holdPosition).toBe(false);
  });

  it('a holding unit does not chase a target the same unit would otherwise close on', () => {
    // Control: an ordinary unit closes the gap...
    const free = (() => {
      const { sim } = makeSim();
      const u = sim.state.addUnit(new Unit(0, { x: 30, y: 30 }, getUnit('eu_militia_swordsman'), 70));
      sim.state.addUnit(new Unit(1, { x: 36, y: 30 }, getUnit('eu_militia_swordsman'), 70));
      const startX = u.pos.x;
      for (let i = 0; i < 60; i++) sim.tick();
      return Math.abs(u.pos.x - startX);
    })();
    expect(free).toBeGreaterThan(1);

    // ...while the same setup on hold stays put.
    const { sim } = makeSim();
    const holder = sim.state.addUnit(new Unit(0, { x: 30, y: 30 }, getUnit('eu_militia_swordsman'), 70));
    // Well outside melee reach but inside line of sight.
    sim.state.addUnit(new Unit(1, { x: 36, y: 30 }, getUnit('eu_militia_swordsman'), 70));
    sim.enqueue({ kind: 'holdPosition', player: 0, unitIds: [holder.id] });
    sim.tick();

    const startX = holder.pos.x;
    for (let i = 0; i < 60; i++) sim.tick();
    expect(Math.abs(holder.pos.x - startX)).toBeLessThan(0.5);
  });
});

describe('save migration', () => {
  it('regenerates corrupt/ancient saves and backfills fields', () => {
    const migrated = migrate({ some: 'garbage' });
    expect(migrated.version).toBe(defaultSave().version);
    expect(migrated.options.display.quality).toBeDefined();
  });

  it('backfills partially-populated option sections without losing user data', () => {
    const current = defaultSave();
    const migrated = migrate({
      ...(current as unknown as Record<string, unknown>),
      // A same-version save whose options object is present but incomplete used
      // to survive migration untouched and then crash the app at boot.
      options: { display: { quality: 'low' } },
      decks: [{ id: 'deck_1', name: 'Mine', faction: 'european', cardIds: [] }],
    });
    expect(migrated.options.display.quality).toBe('low'); // user's choice preserved
    expect(migrated.options.display.uiScale).toBeDefined(); // missing sibling filled
    expect(migrated.options.audio.master).toBeDefined(); // missing section filled
    expect(migrated.options.gameplay.beginnerTips).toBeDefined();
    expect(migrated.decks).toHaveLength(1); // user data untouched
  });
});

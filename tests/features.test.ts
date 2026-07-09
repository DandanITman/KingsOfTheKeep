/**
 * Feature tests for castle garrison/ballista, house upgrades, exclusive
 * stances, and attacker en-route target acquisition.
 */
import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/EventBus';
import { MatchSim } from '@/sim/MatchSim';
import { Building, Unit } from '@/sim/entities/Entity';
import { getBuilding } from '@/data/buildings';
import { getUnit } from '@/data/units';
import { FORTRESS_BALLISTA } from '@/data/balance';
import type { MatchSetup } from '@/data/types';

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
    seed: 999,
    ...overrides,
  };
}

describe('fortress garrison', () => {
  it('archers mount the keep at tier 2 and shoot nearby enemies', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    s.players[0].tier = 2;
    const fortress = s.fortressOf(0)!;
    const archerDef = getUnit('eu_shortbow_archer');
    for (let i = 0; i < 3; i++) {
      s.addUnit(new Unit(0, { x: fortress.pos.x + 6 + i, y: fortress.pos.y }, archerDef, 70));
    }
    sim.enqueue({ kind: 'garrisonRanged', player: 0, buildingId: fortress.id });
    for (let i = 0; i < 150; i++) sim.tick();
    const mounted = s.units.filter((u) => !u.dead && u.garrisonedIn === fortress.id);
    expect(mounted.length).toBe(3);

    // An enemy walks up: garrisoned archers open fire.
    const enemy = s.addUnit(new Unit(1, { x: fortress.pos.x + 7, y: fortress.pos.y }, getUnit('eu_militia_swordsman'), 70));
    for (let i = 0; i < 50; i++) sim.tick();
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
  });

  it('dismounts everyone on command', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    s.players[0].tier = 2;
    const fortress = s.fortressOf(0)!;
    s.addUnit(new Unit(0, { x: fortress.pos.x + 6, y: fortress.pos.y }, getUnit('eu_shortbow_archer'), 70));
    sim.enqueue({ kind: 'garrisonRanged', player: 0, buildingId: fortress.id });
    for (let i = 0; i < 150; i++) sim.tick();
    expect(s.units.some((u) => u.garrisonedIn === fortress.id)).toBe(true);
    sim.enqueue({ kind: 'ungarrison', player: 0, buildingId: fortress.id });
    sim.tick();
    expect(s.units.some((u) => u.garrisonedIn === fortress.id)).toBe(false);
  });

  it('tier-4 fortress fires ballista bolts', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    s.players[0].tier = 4;
    const fortress = s.fortressOf(0)!;
    s.addUnit(new Unit(1, { x: fortress.pos.x + 9, y: fortress.pos.y }, getUnit('eu_militia_swordsman'), 70));
    let sawBallistaBolt = false;
    for (let i = 0; i < 60 && !sawBallistaBolt; i++) {
      sim.tick();
      sawBallistaBolt = s.projectiles.some((p) => p.player === 0 && p.splash === FORTRESS_BALLISTA.splash);
    }
    expect(sawBallistaBolt).toBe(true);
  });
});

describe('house upgrades', () => {
  it('upgrading a house raises level, hp, and command cap', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    const def = getBuilding('house');
    const house = new Building(0, { x: 30, y: 30 }, def, { x: 29, y: 29 }, true);
    s.addBuilding(house);
    sim.recomputeCommand();
    const capBefore = s.players[0].commandCap;
    const hpBefore = house.maxHp;

    sim.enqueue({ kind: 'upgradeHouse', player: 0, buildingId: house.id });
    sim.tick();
    expect(house.level).toBe(2);
    expect(house.maxHp).toBeGreaterThan(hpBefore);
    expect(s.players[0].commandCap).toBe(capBefore + 4);

    sim.enqueue({ kind: 'upgradeHouse', player: 0, buildingId: house.id });
    sim.tick();
    expect(house.level).toBe(3);

    // Max level: further upgrades are ignored.
    sim.enqueue({ kind: 'upgradeHouse', player: 0, buildingId: house.id });
    sim.tick();
    expect(house.level).toBe(3);
  });
});

describe('stances', () => {
  it('attack and defend are exclusive via setStance', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    expect(s.players[0].stanceAttack).toBe(false);
    expect(s.players[0].stanceDefend).toBe(true);
    sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: true });
    sim.tick();
    expect(s.players[0].stanceAttack).toBe(true);
    expect(s.players[0].stanceDefend).toBe(false);
    sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: false });
    sim.tick();
    expect(s.players[0].stanceAttack).toBe(false);
    expect(s.players[0].stanceDefend).toBe(true);
  });

  it('defend cancels full assault override', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    sim.enqueue({ kind: 'emergency', player: 0, action: 'fullAssault' });
    sim.tick();
    expect(s.players[0].stanceAttack).toBe(true);
    expect(s.players[0].fullAssaultUntilTick).not.toBeNull();

    sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: false });
    sim.tick();
    expect(s.players[0].stanceAttack).toBe(false);
    expect(s.players[0].stanceDefend).toBe(true);
    expect(s.players[0].fullAssaultUntilTick).toBeNull();
  });

  it('attack command sends a small army toward the enemy fortress without flags', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    const home = s.fortressOf(0)!;
    const enemy = s.fortressOf(1)!;
    const soldier = s.addUnit(new Unit(0, { x: home.pos.x + 8, y: home.pos.y }, getUnit('eu_militia_swordsman'), 70));
    s.players[0].attackAlloc.infantry = 50;

    sim.enqueue({ kind: 'setStance', player: 0, stance: 'attack', enabled: true });
    for (let i = 0; i < 6; i++) sim.tick();

    expect(soldier.assignment).toBe('attack');
    expect(soldier.task.kind).toBe('macroMove');
    if (soldier.task.kind === 'macroMove') {
      expect(soldier.task.dest).toEqual(enemy.pos);
    }
  });

  it('stop emergency cancels marching and fighting macro orders', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    const soldier = s.addUnit(new Unit(0, { x: 36, y: 40 }, getUnit('eu_militia_swordsman'), 70));
    soldier.assignment = 'attack';
    soldier.task = { kind: 'macroMove', dest: { x: 80, y: 80 } };
    s.players[0].stanceAttack = true;
    s.players[0].stanceDefend = false;

    sim.enqueue({ kind: 'emergency', player: 0, action: 'stop' });
    sim.tick();

    expect(s.players[0].stanceAttack).toBe(false);
    expect(s.players[0].stanceDefend).toBe(true);
    expect(soldier.assignment).toBe('defend');
    expect(soldier.task.kind).toBe('idle');
  });
});

describe('attacker targeting', () => {
  it('marching attackers engage enemy buildings on the way', () => {
    const sim = new MatchSim(makeSetup(), new EventBus());
    const s = sim.state;
    const tower = new Building(1, { x: 40, y: 40 }, getBuilding('watchTower'), { x: 39, y: 39 }, true);
    s.addBuilding(tower);
    const soldier = s.addUnit(new Unit(0, { x: 36, y: 40 }, getUnit('eu_militia_swordsman'), 70));
    s.players[0].stanceAttack = true;
    s.players[0].stanceDefend = false;
    soldier.assignment = 'attack';
    soldier.task = { kind: 'macroMove', dest: { x: 80, y: 80 } };
    for (let i = 0; i < 10; i++) sim.tick();
    expect(soldier.task.kind).toBe('fight');
  });
});

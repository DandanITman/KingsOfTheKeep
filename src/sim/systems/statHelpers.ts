import type { MatchState } from '../MatchState';
import type { Building, Unit } from '../entities/Entity';

/**
 * Unified stat reads: base value → player ModifierStack (faction bonuses,
 * upgrades, global timed buffs) → per-unit timed buffs.
 */
export function unitStat(
  state: MatchState,
  unit: Unit,
  base: number,
  stat: 'damage' | 'armor' | 'pierceArmor' | 'range' | 'attackSpeed' | 'speed' | 'trainSpeed',
): number {
  const paths = [`unit.${stat}`, `unit.${unit.def.role}.${stat}`];
  let value = state.players[unit.player].mods.apply(base, paths);
  for (const buff of unit.buffs) {
    if (buff.expiresTick <= state.tick) continue;
    if (paths.includes(buff.stat)) {
      value = buff.op === 'add' ? value + buff.value : value * buff.value;
    }
  }
  return value;
}

export function buildingStat(
  state: MatchState,
  b: Building,
  base: number,
  stat: 'armor' | 'attackDamage',
): number {
  return state.players[b.player].mods.apply(base, [`building.${stat}`]);
}

export function pruneUnitBuffs(state: MatchState): void {
  if (state.tick % 10 !== 0) return;
  for (const u of state.units) {
    if (u.buffs.length > 0) u.buffs = u.buffs.filter((b) => b.expiresTick > state.tick);
    if (u.dots.length > 0) u.dots = u.dots.filter((d) => d.expiresTick > state.tick);
  }
}

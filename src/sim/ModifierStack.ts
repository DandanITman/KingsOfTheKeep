import type { ModifierOp, StatPath } from '@/data/types';

interface ActiveModifier extends ModifierOp {
  /** Tick after which this modifier expires (null = permanent). */
  expiresTick: number | null;
  source: string;
}

/**
 * Per-player stack of stat modifiers from faction bonuses, upgrades, and
 * timed ability buffs. All sim stat reads flow through `apply`.
 *
 * Stat paths are hierarchical: a read of ['unit.damage', 'unit.infantry.damage']
 * collects modifiers matching any provided path. Adds apply before muls.
 */
export class ModifierStack {
  private mods: ActiveModifier[] = [];

  add(op: ModifierOp, source: string, expiresTick: number | null = null): void {
    this.mods.push({ ...op, expiresTick, source });
  }

  removeBySource(source: string): void {
    this.mods = this.mods.filter((m) => m.source !== source);
  }

  prune(tick: number): void {
    this.mods = this.mods.filter((m) => m.expiresTick === null || m.expiresTick > tick);
  }

  apply(base: number, paths: StatPath[]): number {
    let add = 0;
    let mul = 1;
    for (const m of this.mods) {
      if (!paths.includes(m.stat)) continue;
      if (m.op === 'add') add += m.value;
      else mul *= m.value;
    }
    return (base + add) * mul;
  }

  /** Debug/UI: list active modifiers matching a path prefix. */
  list(prefix = ''): ActiveModifier[] {
    return this.mods.filter((m) => m.stat.startsWith(prefix));
  }
}

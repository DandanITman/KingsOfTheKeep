import { dist } from '@/core/mathUtils';
import { TICK_RATE } from '@/data/balance';
import type { MatchState } from '../MatchState';
import { Building, Unit } from '../entities/Entity';
import { stepToward } from './moveHelpers';

/**
 * Healer support units (monks etc.) mend the most wounded nearby ally, and
 * trade units (caravans, trade carts) run market↔fortress loops for gold.
 */
export function supportSystem(state: MatchState): void {
  // Healing, once per second.
  if (state.tick % TICK_RATE === 0) {
    for (const u of state.units) {
      if (u.dead || !u.def.healPerSec) continue;
      let target: Unit | null = null;
      let worst = 1;
      for (const v of state.units) {
        if (v.dead || v.player !== u.player || v.id === u.id) continue;
        if (dist(u.pos, v.pos) > 8) continue;
        const frac = v.hp / v.maxHp;
        if (frac < worst) {
          worst = frac;
          target = v;
        }
      }
      if (target) {
        target.hp = Math.min(target.maxHp, target.hp + u.def.healPerSec);
      }
    }
  }

  // Trade loops.
  for (const u of state.units) {
    if (u.dead || !u.def.tradeGoldPerTrip) continue;
    if (u.task.kind !== 'trade') {
      // Establish a route: fortress ↔ farthest own market/trade building.
      const fortress = state.fortressOf(u.player);
      if (!fortress) continue;
      let best: Building | null = null;
      let bestD = 0;
      for (const b of state.buildings) {
        if (b.dead || !b.complete || b.player !== u.player) continue;
        if (b.def.trainKey !== 'market' && !b.defId.includes('bazaar') && !b.defId.includes('caravanserai')) continue;
        const d = dist(fortress.pos, b.pos);
        if (d > bestD) {
          bestD = d;
          best = b;
        }
      }
      if (best && best.id !== fortress.id) {
        u.task = { kind: 'trade', phase: 'outbound', fromId: fortress.id, toId: best.id };
      }
      continue;
    }

    const task = u.task;
    const from = state.building(task.fromId);
    const to = state.building(task.toId);
    if (!from || !to) {
      u.task = { kind: 'idle' };
      continue;
    }
    const dest = task.phase === 'outbound' ? to : from;
    const arrive = Math.max(...dest.def.footprint) / 2 + 1.2;
    if (stepToward(state, u, dest.pos, arrive)) {
      if (task.phase === 'returning') {
        // Completed a loop: pay out gold scaled by route length.
        const routeLen = dist(from.pos, to.pos);
        const gold = u.def.tradeGoldPerTrip * Math.max(0.5, Math.min(2.5, routeLen / 40));
        state.addResource(u.player, 'gold', gold);
      }
      task.phase = task.phase === 'outbound' ? 'returning' : 'outbound';
    }
  }
}

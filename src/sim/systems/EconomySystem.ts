import { MARKET_PASSIVE_GOLD_PER_MIN, TICK_RATE } from '@/data/balance';
import type { MatchState } from '../MatchState';

const PERIOD_TICKS = TICK_RATE; // once per second

/**
 * Passive income: tax collectors and similar units, markets, and
 * influence-generating buildings.
 */
export function economySystem(state: MatchState): void {
  if (state.tick % PERIOD_TICKS !== 0) return;

  for (const u of state.units) {
    if (u.dead || !u.def.passiveIncome) continue;
    state.addResource(u.player, u.def.passiveIncome.resource, u.def.passiveIncome.perMin / 60);
  }

  for (const b of state.buildings) {
    if (b.dead || !b.complete) continue;
    if (b.def.id === 'market' || b.def.id === 'me_grand_bazaar') {
      const mult = state.players[b.player].mods.apply(1, ['marketIncome']);
      state.addResource(b.player, 'gold', (MARKET_PASSIVE_GOLD_PER_MIN / 60) * mult);
    }
    if (b.def.influencePerMin) {
      state.addResource(b.player, 'influence', b.def.influencePerMin / 60);
    }
    if (b.def.passiveIncome && b.def.passiveIncome.perSec > 0) {
      state.addResource(b.player, b.def.passiveIncome.resource, b.def.passiveIncome.perSec);
    }
  }
}

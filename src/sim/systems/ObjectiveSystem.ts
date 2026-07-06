import {
  INFLUENCE_SHRINE_PER_MIN,
  INFLUENCE_TIER3_PER_MIN,
  INFLUENCE_TIER4_PER_MIN,
  SHRINE_CAPTURE_RADIUS,
  TICK_RATE,
} from '@/data/balance';
import type { PlayerId } from '../commands';
import type { MatchState } from '../MatchState';
import { NEUTRAL_PLAYER } from '../entities/Entity';

/**
 * Map objectives (GDD §35.3) and Influence income: shrines and trade posts
 * are captured by uncontested military presence; holders earn Influence/gold.
 * Fortress tiers 3+ trickle Influence. Runs once per second.
 */
export function objectiveSystem(state: MatchState): void {
  if (state.tick % TICK_RATE !== 0) return;

  // Capture logic for shrines, trade posts, and relics.
  for (const obj of state.objectives) {
    if (obj.objType === 'watchHill') continue; // handled by fog system
    const present = new Set<PlayerId>();
    for (const u of state.units) {
      if (u.dead || u.player < 0 || u.def.role === 'worker') continue;
      const dx = u.pos.x - obj.pos.x;
      const dy = u.pos.y - obj.pos.y;
      if (dx * dx + dy * dy <= SHRINE_CAPTURE_RADIUS * SHRINE_CAPTURE_RADIUS) present.add(u.player);
    }
    if (present.size === 1) {
      const holder = [...present][0];
      if (obj.owner !== holder) {
        obj.owner = holder;
        if (obj.objType === 'shrine') {
          state.bus.emit('alert', {
            kind: 'shrineCaptured',
            message: holder === 0 ? 'You hold a shrine — Influence flows.' : 'The enemy holds a shrine!',
            pos: obj.pos,
            player: 0,
          });
        }
      }
    } else if (present.size > 1) {
      obj.owner = NEUTRAL_PLAYER;
    }

    // Income + hold-time accrual.
    if (obj.owner >= 0) {
      obj.heldSecs.set(obj.owner, (obj.heldSecs.get(obj.owner) ?? 0) + 1);
      if (obj.objType === 'shrine') {
        state.addResource(obj.owner, 'influence', INFLUENCE_SHRINE_PER_MIN / 60);
      } else if (obj.objType === 'tradePost') {
        state.addResource(obj.owner, 'gold', 12 / 60);
      } else if (obj.objType === 'relic') {
        state.addResource(obj.owner, 'gold', 6 / 60);
        state.addResource(obj.owner, 'food', 6 / 60);
        state.addResource(obj.owner, 'influence', 2 / 60);
      }
    }
  }

  // Fortress-tier Influence trickle.
  for (const p of state.players) {
    if (p.defeated) continue;
    if (p.tier >= 4) state.addResource(p.id, 'influence', INFLUENCE_TIER4_PER_MIN / 60);
    else if (p.tier >= 3) state.addResource(p.id, 'influence', INFLUENCE_TIER3_PER_MIN / 60);
  }
}

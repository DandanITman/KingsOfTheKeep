import { dist } from '@/core/mathUtils';
import {
  MORALE_ALLY_DEATH_PENALTY,
  MORALE_BASE,
  MORALE_FORTRESS_BONUS,
  MORALE_FORTRESS_RADIUS,
  MORALE_RECOVER_THRESHOLD,
  MORALE_REGEN_PER_SEC,
  MORALE_ROUT_THRESHOLD,
  MORALE_UPDATE_PERIOD_TICKS,
} from '@/data/balance';
import type { MatchState } from '../MatchState';
import { Unit } from '../entities/Entity';

interface AuraSource {
  pos: { x: number; y: number };
  radius: number;
  bonus: number;
}

/**
 * Morale (GDD §21): units seek an environmental morale target — raised by
 * fortress proximity, banners, and morale-aura buildings; lowered by recent
 * nearby ally deaths. Below the rout threshold units flee home until they
 * recover.
 */
export function moraleSystem(state: MatchState): void {
  if (state.tick % MORALE_UPDATE_PERIOD_TICKS !== 0) return;
  const dtSecs = MORALE_UPDATE_PERIOD_TICKS / 10;

  for (const playerId of [0, 1]) {
    const p = state.players[playerId];
    // Collect aura sources once per player.
    const auras: AuraSource[] = [];
    const fortress = state.fortressOf(playerId);
    if (fortress) auras.push({ pos: fortress.pos, radius: MORALE_FORTRESS_RADIUS, bonus: MORALE_FORTRESS_BONUS });
    for (const b of state.buildings) {
      if (b.dead || b.player !== playerId || !b.complete || !b.def.aura?.moraleBonus) continue;
      auras.push({ pos: b.pos, radius: b.def.aura.radius, bonus: b.def.aura.moraleBonus });
    }
    for (const u of state.units) {
      if (u.dead || u.player !== playerId || !u.def.moraleAura) continue;
      auras.push({ pos: u.pos, radius: u.def.moraleAura.radius, bonus: u.def.moraleAura.bonus });
    }

    const regen = MORALE_REGEN_PER_SEC * p.mods.apply(1, ['moraleRegen']) * dtSecs;

    for (const u of state.units) {
      if (u.dead || u.player !== playerId) continue;
      if (u.def.role === 'worker') continue;

      let target = MORALE_BASE;
      for (const aura of auras) {
        if (dist(u.pos, aura.pos) <= aura.radius) target += aura.bonus;
      }
      for (const death of p.recentDeaths) {
        if (death.expiresTick > state.tick && dist(u.pos, death.pos) < 10) {
          target -= MORALE_ALLY_DEATH_PENALTY;
        }
      }
      target = Math.max(0, Math.min(100, target));

      // Seek target: fast drops, slower recovery.
      if (u.morale > target) {
        u.morale = Math.max(target, u.morale - 8 * dtSecs);
      } else {
        u.morale = Math.min(target, u.morale + regen);
      }

      // Rout behavior.
      if (u.task.kind !== 'rout' && u.morale < MORALE_ROUT_THRESHOLD) {
        u.task = { kind: 'rout' };
      } else if (u.task.kind === 'rout' && u.morale >= MORALE_RECOVER_THRESHOLD) {
        u.task = { kind: 'idle' };
      }
    }
  }
}

import {
  SHRINE_CAPTURE_RADIUS,
  SHRINE_HOLD_SECS,
  TICK_RATE,
  TICK_SECS,
  TIMED_SCORE_SECS,
} from '@/data/balance';
import type { PlayerId } from '../commands';
import type { MatchState } from '../MatchState';
import { NEUTRAL_PLAYER, Unit } from '../entities/Entity';

export interface ObjectiveStatus {
  label: string;
  progress: number; // 0..1
  detail: string;
}

/**
 * Win/lose checks. Fortress destruction always loses the match; the selected
 * victory mode may add an alternate win path (shrines, survival, timed score,
 * annihilation).
 */
export function victorySystem(state: MatchState): void {
  if (state.winner !== null) return;
  if (state.tick % TICK_RATE !== 0) return; // once per second

  // Universal: fortress destroyed → defeat.
  for (const p of state.players) {
    const fortress = state.fortressOf(p.id);
    if (!fortress) {
      declareWinner(state, state.enemyOf(p.id).id, 'The Main Fortress has fallen');
      return;
    }
  }

  const mode = state.setup.victoryMode;

  if (mode === 'shrines') {
    updateShrines(state);
    for (const p of state.players) {
      let held = 0;
      for (const obj of state.objectives) {
        if (obj.objType !== 'shrine') continue;
        held = Math.max(held, obj.heldSecs.get(p.id) ?? 0);
      }
      // Win when cumulative hold on any shrine set reaches the target.
      const total = shrineHoldTotal(state, p.id);
      if (total >= SHRINE_HOLD_SECS) {
        declareWinner(state, p.id, 'The shrines have been claimed');
        return;
      }
    }
  } else if (mode === 'annihilation') {
    for (const p of state.players) {
      const hasMilitary =
        state.units.some((u) => !u.dead && u.player === p.id && u.def.role !== 'worker') ||
        state.buildings.some((b) => !b.dead && b.player === p.id && b.def.kind === 'military');
      const enemy = state.enemyOf(p.id);
      const enemyEverBuilt = state.timeSecs > 180; // grace period
      if (!hasMilitary && enemyEverBuilt) {
        declareWinner(state, enemy.id, 'All military forces destroyed');
        return;
      }
    }
  } else if (mode === 'timedScore') {
    if (state.timeSecs >= TIMED_SCORE_SECS) {
      const [a, b] = state.players;
      const winner = a.score >= b.score ? a.id : b.id;
      declareWinner(state, winner, 'Time is up — victory by score');
      return;
    }
  }
  // 'survival' mode is driven by the WaveSystem (M11).
}

export function shrineHoldTotal(state: MatchState, player: PlayerId): number {
  let total = 0;
  for (const obj of state.objectives) {
    if (obj.objType !== 'shrine') continue;
    total += obj.heldSecs.get(player) ?? 0;
  }
  return total;
}

function updateShrines(state: MatchState): void {
  for (const obj of state.objectives) {
    if (obj.objType !== 'shrine') continue;
    // Owner = player with units nearby and no enemy contest.
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
        state.bus.emit('alert', {
          kind: 'shrineCaptured',
          message: holder === 0 ? 'You hold a shrine.' : 'The enemy holds a shrine!',
          pos: obj.pos,
          player: 0,
        });
      }
    } else if (present.size > 1) {
      obj.owner = NEUTRAL_PLAYER; // contested
    }
    if (obj.owner >= 0) {
      obj.heldSecs.set(obj.owner, (obj.heldSecs.get(obj.owner) ?? 0) + 1);
    }
  }
}

export function declareWinner(state: MatchState, winner: PlayerId, reason: string): void {
  if (state.winner !== null) return;
  state.winner = winner;
  state.endReason = reason;
  const loser = winner === 0 ? 1 : 0;
  state.players[loser].defeated = true;
  state.bus.emit('matchEnded', { winner, loser, reason });
}

/** HUD objectives panel content for the current victory mode. */
export function objectiveStatus(state: MatchState): ObjectiveStatus[] {
  const out: ObjectiveStatus[] = [];
  const mode = state.setup.victoryMode;
  if (mode === 'fortress' || mode === 'annihilation') {
    const enemy = state.fortressOf(1);
    out.push({
      label: mode === 'fortress' ? 'Destroy the enemy Main Fortress' : 'Destroy all enemy military',
      progress: enemy ? 1 - enemy.hp / enemy.maxHp : 1,
      detail: enemy ? `Enemy fortress: ${Math.ceil((enemy.hp / enemy.maxHp) * 100)}%` : 'Destroyed!',
    });
  } else if (mode === 'shrines') {
    const mine = shrineHoldTotal(state, 0);
    const theirs = shrineHoldTotal(state, 1);
    out.push({
      label: 'Hold the shrines',
      progress: mine / SHRINE_HOLD_SECS,
      detail: `You ${Math.floor(mine)}s / Enemy ${Math.floor(theirs)}s of ${SHRINE_HOLD_SECS}s`,
    });
  } else if (mode === 'timedScore') {
    const remaining = Math.max(0, TIMED_SCORE_SECS - state.timeSecs);
    out.push({
      label: 'Highest score when time ends',
      progress: state.timeSecs / TIMED_SCORE_SECS,
      detail: `You ${Math.floor(state.players[0].score)} / Enemy ${Math.floor(state.players[1].score)} — ${Math.floor(remaining / 60)}:${String(Math.floor(remaining % 60)).padStart(2, '0')} left`,
    });
  } else if (mode === 'survival') {
    out.push({ label: 'Survive the waves', progress: 0, detail: 'Hold the line!' });
  }
  return out;
}

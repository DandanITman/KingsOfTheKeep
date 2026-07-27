import {
  ANNIHILATION_GRACE_SECS,
  SHRINE_CAPTURE_RADIUS,
  SHRINE_HOLD_SECS,
  TICK_RATE,
  TICK_SECS,
  TIMED_SCORE_SECS,
} from '@/data/balance';
import { BUILDING_DB } from '@/data/buildings';
import { getCard } from '@/data/cards';
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
    // Hold-time accrues in ObjectiveSystem; first to the target wins.
    for (const p of state.players) {
      if (shrineHoldTotal(state, p.id) >= SHRINE_HOLD_SECS) {
        declareWinner(state, p.id, 'The shrines have been claimed');
        return;
      }
    }
  } else if (mode === 'annihilation') {
    for (const p of state.players) {
      // You are annihilated when you have no army, no military buildings, AND no
      // way back — i.e. you can't afford to rebuild the cheapest one you own.
      // Checking only "no army and no barracks" made this a trap rather than a
      // victory condition: a player teching peacefully who simply hadn't built a
      // barracks by the 3:00 mark lost on the spot without being attacked.
      const hasArmy = state.units.some((u) => !u.dead && u.player === p.id && u.def.role !== 'worker');
      const hasMilitaryBuilding = state.buildings.some(
        (b) => !b.dead && b.player === p.id && b.def.kind === 'military',
      );
      if (hasArmy || hasMilitaryBuilding) continue;
      if (state.timeSecs <= ANNIHILATION_GRACE_SECS) continue;
      if (canStillRebuildArmy(state, p.id)) continue;
      declareWinner(state, state.enemyOf(p.id).id, 'All military forces destroyed');
      return;
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

/**
 * True while the player could still put an army back on the field — they hold a
 * military building card in their deck and can currently pay for it. A player
 * with resources banked and a barracks card in hand has not been annihilated,
 * they have merely been slow.
 */
function canStillRebuildArmy(state: MatchState, player: PlayerId): boolean {
  const p = state.players[player];
  for (const slot of p.cards) {
    const card = getCard(slot.cardId);
    if (!card.buildingId) continue;
    const def = BUILDING_DB.get(card.buildingId);
    if (!def || def.kind !== 'military') continue;
    if (state.canAfford(player, card.cost ?? def.cost)) return true;
  }
  return false;
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

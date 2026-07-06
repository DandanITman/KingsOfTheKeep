import type { Command } from '../commands';
import type { MatchSim } from '../MatchSim';
import { Unit } from '../entities/Entity';

/**
 * Applies a queued command to the sim. This is the only place player/bot
 * intent mutates state. Handlers for card play, flags, macro, etc. are
 * delegated to their systems as those come online.
 */
export function processCommand(sim: MatchSim, cmd: Command): void {
  const s = sim.state;
  switch (cmd.kind) {
    case 'setStance': {
      const p = s.players[cmd.player];
      if (cmd.stance === 'attack') p.stanceAttack = cmd.enabled;
      else p.stanceDefend = cmd.enabled;
      s.bus.emit(cmd.stance === 'attack' ? 'attackCommand' : 'defendCommand', { player: cmd.player });
      break;
    }
    case 'setAllocation': {
      const p = s.players[cmd.player];
      const target = cmd.mode === 'attack' ? p.attackAlloc : p.defendAlloc;
      Object.assign(target, cmd.alloc);
      break;
    }
    case 'setWorkerRatios': {
      s.players[cmd.player].workerRatios = { ...cmd.ratios };
      break;
    }
    case 'directOrder': {
      for (const id of cmd.unitIds) {
        const u = s.unit(id);
        if (!u || u.player !== cmd.player) continue;
        u.task = { kind: 'move', dest: { ...cmd.dest }, path: null, attackMove: cmd.attackMove, pinned: true };
        u.macroTargetFlagId = null;
      }
      break;
    }
    case 'concede': {
      const enemy = s.enemyOf(cmd.player);
      s.winner = enemy.id;
      s.endReason = 'concession';
      s.players[cmd.player].defeated = true;
      s.bus.emit('matchEnded', { winner: enemy.id, loser: cmd.player, reason: 'concession' });
      break;
    }
    // Handled by systems added in later milestones:
    case 'playCard':
    case 'placeFlag':
    case 'removeFlag':
    case 'moveFlag':
    case 'trainUnit':
    case 'cancelTrain':
    case 'startUpgrade':
    case 'emergency':
    case 'directGather':
    case 'directBuild':
    case 'marketTrade':
    case 'setRally':
      handleExtended(sim, cmd);
      break;
  }
}

// Extended handlers registered by later systems (keeps this file the single
// dispatch point while systems stay modular).
type Handler = (sim: MatchSim, cmd: Command) => void;
const extendedHandlers = new Map<Command['kind'], Handler>();

export function registerCommandHandler(kind: Command['kind'], handler: Handler): void {
  extendedHandlers.set(kind, handler);
}

function handleExtended(sim: MatchSim, cmd: Command): void {
  const handler = extendedHandlers.get(cmd.kind);
  if (handler) handler(sim, cmd);
}

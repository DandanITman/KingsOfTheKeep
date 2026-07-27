import { dist } from '@/core/mathUtils';
import { FORTRESS_GARRISON_SLOTS, HOUSE_UPGRADES } from '@/data/balance';
import type { Command } from '../commands';
import type { MatchSim } from '../MatchSim';
import { Unit, type UnitTask } from '../entities/Entity';

/**
 * Gives a unit a task, either now or appended to its shift-queue. A direct
 * (un-queued) order always wins outright and discards anything pending: a plain
 * right-click means "forget the rest, do this".
 */
function assignTask(u: Unit, task: UnitTask, queue: boolean): void {
  if (queue) {
    u.orders.push(task);
    return;
  }
  u.orders.length = 0;
  u.holdPosition = false;
  u.task = task;
  u.macroTargetFlagId = null;
}

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
      if (cmd.stance === 'attack') {
        p.stanceAttack = cmd.enabled;
        if (cmd.enabled) {
          p.stanceDefend = false;
        } else {
          p.stanceDefend = true;
          p.fullAssaultUntilTick = null;
        }
      } else {
        p.stanceDefend = cmd.enabled;
        if (cmd.enabled) {
          p.stanceAttack = false;
          p.fullAssaultUntilTick = null;
        }
      }
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
        if (u.garrisonedIn !== null) {
          // Ordered off the walls: dismount first.
          u.pos = s.nav.nearestFree(u.pos);
          u.prevPos = { ...u.pos };
          u.garrisonedIn = null;
        }
        assignTask(
          u,
          { kind: 'move', dest: { ...cmd.dest }, path: null, attackMove: cmd.attackMove, pinned: true },
          cmd.queue === true,
        );
      }
      break;
    }
    case 'stopUnits': {
      for (const id of cmd.unitIds) {
        const u = s.unit(id);
        if (!u || u.player !== cmd.player) continue;
        u.orders.length = 0;
        u.holdPosition = false;
        u.macroTargetFlagId = null;
        u.task = { kind: 'idle' };
      }
      break;
    }
    case 'holdPosition': {
      for (const id of cmd.unitIds) {
        const u = s.unit(id);
        if (!u || u.player !== cmd.player) continue;
        u.orders.length = 0;
        u.macroTargetFlagId = null;
        // Toggle, so the same key both sets and releases the hold.
        u.holdPosition = !u.holdPosition;
        if (u.holdPosition) u.task = { kind: 'idle' };
      }
      break;
    }
    case 'garrisonRanged': {
      const b = s.building(cmd.buildingId);
      if (!b || b.player !== cmd.player || b.def.kind !== 'fortress') break;
      const p = s.players[cmd.player];
      const slots = FORTRESS_GARRISON_SLOTS[p.tier] ?? 0;
      const inside = s.units.filter(
        (u) => !u.dead && (u.garrisonedIn === b.id || (u.task.kind === 'garrison' && u.task.buildingId === b.id)),
      ).length;
      let free = Math.min(slots - inside, cmd.count ?? Infinity);
      if (free <= 0) break;
      // Nearest available ranged units head for the walls.
      const candidates = s.units
        .filter(
          (u) =>
            !u.dead &&
            u.player === cmd.player &&
            u.def.role === 'ranged' &&
            u.garrisonedIn === null &&
            u.task.kind !== 'garrison',
        )
        .sort((a, b2) => dist(a.pos, b.pos) - dist(b2.pos, b.pos));
      for (const u of candidates) {
        if (free <= 0) break;
        u.task = { kind: 'garrison', buildingId: b.id };
        u.macroTargetFlagId = null;
        free--;
      }
      break;
    }
    case 'ungarrison': {
      const b = s.building(cmd.buildingId);
      if (!b || b.player !== cmd.player) break;
      for (const u of s.units) {
        if (u.dead || u.player !== cmd.player) continue;
        const walking = u.task.kind === 'garrison' && u.task.buildingId === b.id;
        if (u.garrisonedIn !== b.id && !walking) continue;
        if (u.garrisonedIn === b.id) {
          u.pos = s.nav.nearestFree({ x: b.pos.x, y: b.pos.y + b.def.footprint[1] / 2 + 1.5 });
          u.prevPos = { ...u.pos };
          u.garrisonedIn = null;
        }
        u.task = { kind: 'idle' };
      }
      break;
    }
    case 'upgradeHouse': {
      const b = s.building(cmd.buildingId);
      if (!b || b.player !== cmd.player || b.defId !== 'house' || !b.complete) break;
      const next = HOUSE_UPGRADES[b.level - 1];
      if (!next) break; // already max level
      if (!s.payCost(cmd.player, next.cost)) break;
      b.level++;
      b.maxHp += next.hp;
      b.hp += next.hp;
      b.bonusCommand += next.command;
      sim.recomputeCommand();
      s.bus.emit('alert', {
        kind: 'upgradeComplete',
        message: `A house has been upgraded to a ${next.name}.`,
        player: cmd.player,
      });
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
    case 'directGather': {
      const node = s.node(cmd.nodeId);
      if (!node) break;
      for (const id of cmd.unitIds) {
        const u = s.unit(id);
        if (!u || u.player !== cmd.player || u.def.role !== 'worker') continue;
        assignTask(u, { kind: 'gather', nodeId: node.id, phase: 'toNode', timer: 0, pinned: true }, cmd.queue === true);
      }
      break;
    }
    // Handled by systems added in later milestones:
    case 'playCard':
    case 'placeFlag':
    case 'removeFlag':
    case 'moveFlag':
    case 'trainUnit':
    case 'setAutoTrain':
    case 'cancelTrain':
    case 'startUpgrade':
    case 'emergency':
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

import { dist } from '@/core/mathUtils';
import { EMERGENCY_FULL_ASSAULT_SECS, TICK_RATE } from '@/data/balance';
import { Flag, Unit } from '../entities/Entity';
import { registerCommandHandler } from './CommandSystem';

/** Flag placement/removal and the emergency buttons (GDD §15.2, §15.7). */
export function registerFlagHandlers(): void {
  registerCommandHandler('placeFlag', (sim, cmd) => {
    if (cmd.kind !== 'placeFlag') return;
    const s = sim.state;
    const p = s.players[cmd.player];
    const flag = new Flag(cmd.player, cmd.pos, cmd.flagType, p.flagOrderCounter++);
    s.addFlag(flag);
    if (cmd.flagType === 'rally') {
      // Rally flags set the rally point of all military production buildings.
      for (const b of s.buildings) {
        if (b.dead || b.player !== cmd.player || !b.def.trainKey) continue;
        if (b.def.trainKey === 'fortress' || b.def.trainKey === 'market') continue;
        b.rallyPoint = { ...cmd.pos };
      }
    }
  });

  registerCommandHandler('removeFlag', (sim, cmd) => {
    if (cmd.kind !== 'removeFlag') return;
    const f = sim.state.entities.get(cmd.flagId);
    if (f instanceof Flag && f.player === cmd.player) f.dead = true;
  });

  registerCommandHandler('moveFlag', (sim, cmd) => {
    if (cmd.kind !== 'moveFlag') return;
    const f = sim.state.entities.get(cmd.flagId);
    if (f instanceof Flag && f.player === cmd.player && cmd.pos) {
      f.pos = { ...cmd.pos };
      f.prevPos = { ...cmd.pos };
    }
  });

  registerCommandHandler('emergency', (sim, cmd) => {
    if (cmd.kind !== 'emergency') return;
    const s = sim.state;
    const p = s.players[cmd.player];
    const fortress = s.fortressOf(cmd.player);

    switch (cmd.action) {
      case 'fullAssault': {
        p.stanceAttack = true;
        p.stanceDefend = false;
        p.fullAssaultUntilTick = s.tick + EMERGENCY_FULL_ASSAULT_SECS * TICK_RATE;
        break;
      }
      case 'holdKeep': {
        p.stanceAttack = false;
        p.stanceDefend = true;
        p.fullAssaultUntilTick = null;
        if (!fortress) break;
        for (const u of s.units) {
          if (u.dead || u.player !== cmd.player || u.def.role === 'worker') continue;
          u.assignment = 'defend';
          u.guardPostId = fortress.id;
          u.task = { kind: 'macroMove', dest: { ...fortress.pos } };
        }
        break;
      }
      case 'protectWorkers': {
        // Temporary defend flag at the most threatened worker cluster.
        let target = fortress?.pos ?? null;
        let bestScore = 0;
        for (const u of s.units) {
          if (u.dead || u.player !== cmd.player || u.def.role !== 'worker') continue;
          let score = 0;
          for (const threat of p.recentThreats) {
            if (threat.expiresTick > s.tick && dist(threat.pos, u.pos) < 12) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            target = u.pos;
          }
        }
        if (target) {
          const flag = new Flag(cmd.player, { ...target }, 'defend', p.flagOrderCounter++);
          flag.expiresTick = s.tick + 45 * TICK_RATE;
          s.addFlag(flag);
        }
        break;
      }
      case 'rallyArmy': {
        const rallyFlag = s.flags.find((f) => !f.dead && f.player === cmd.player && f.flagType === 'rally');
        const dest = rallyFlag?.pos ?? fortress?.pos;
        if (!dest) break;
        for (const u of s.units) {
          if (u.dead || u.player !== cmd.player || u.def.role === 'worker') continue;
          if (u.task.kind === 'idle' || u.task.kind === 'macroMove') {
            u.task = { kind: 'macroMove', dest: { ...dest } };
          }
        }
        break;
      }
      case 'repairWalls': {
        // Up to 6 workers drop gathering to repair the most damaged structures.
        const damaged = s.buildings
          .filter((b) => !b.dead && b.player === cmd.player && b.complete && b.hp < b.maxHp)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)
          .slice(0, 6);
        if (damaged.length === 0) break;
        const workers = s.units
          .filter((u): u is Unit => !u.dead && u.player === cmd.player && u.def.role === 'worker' && !u.carrying)
          .slice(0, 6);
        workers.forEach((w, i) => {
          w.task = { kind: 'repair', buildingId: damaged[i % damaged.length].id, pinned: true };
        });
        break;
      }
      case 'retreat': {
        p.stanceAttack = false;
        p.stanceDefend = true;
        p.fullAssaultUntilTick = null;
        if (!fortress) break;
        for (const u of s.units) {
          if (u.dead || u.player !== cmd.player || u.def.role === 'worker') continue;
          if (u.assignment === 'attack') {
            u.assignment = 'defend';
            u.guardPostId = fortress.id;
            u.task = { kind: 'macroMove', dest: { ...fortress.pos } };
          }
        }
        p.attackFlagIndex = 0;
        break;
      }
      case 'stop': {
        p.stanceAttack = false;
        p.stanceDefend = true;
        p.fullAssaultUntilTick = null;
        p.attackFlagIndex = 0;
        for (const u of s.units) {
          if (u.dead || u.player !== cmd.player || u.def.role === 'worker') continue;
          if (u.task.kind === 'rout' || u.task.kind === 'garrison' || u.task.kind === 'trade') continue;
          u.assignment = 'defend';
          u.guardPostId = null;
          u.macroTargetFlagId = null;
          if (u.task.kind === 'macroMove' || u.task.kind === 'move' || u.task.kind === 'fight') {
            u.task = { kind: 'idle' };
          }
        }
        break;
      }
    }
  });
}

import { distSq } from '@/core/mathUtils';
import { REPAIR_COST_FRACTION, REPAIR_HP_PER_SEC, TICK_SECS } from '@/data/balance';
import type { MatchState } from '../MatchState';
import { Building, ResourceNode, Unit } from '../entities/Entity';
import { campEfficiency } from './GatherSystem';
import { stepToward } from './moveHelpers';

function arriveDistance(b: Building): number {
  return Math.max(b.def.footprint[0], b.def.footprint[1]) / 2 + 1.1;
}

/**
 * Workers with 'build' tasks walk to the site and add progress; build rate
 * scales with sqrt(builders). 'repair' tasks restore hp at a resource cost.
 * Completion stamps efficiency, spawns farm plots, and updates command caps.
 */
export function constructionSystem(state: MatchState, recomputeCommand: () => void): void {
  // Count builders per site (arrived only).
  const builders = new Map<number, Unit[]>();
  for (const unit of state.units) {
    if (unit.dead) continue;
    const task = unit.task;
    if (task.kind === 'build') {
      const site = state.building(task.buildingId);
      if (!site || site.complete) {
        unit.task = { kind: 'idle' };
        continue;
      }
      if (stepToward(state, unit, site.pos, arriveDistance(site))) {
        unit.facing = Math.atan2(site.pos.y - unit.pos.y, site.pos.x - unit.pos.x);
        let list = builders.get(site.id);
        if (!list) {
          list = [];
          builders.set(site.id, list);
        }
        list.push(unit);
      }
    } else if (task.kind === 'repair') {
      const target = state.building(task.buildingId);
      if (!target || target.dead || target.hp >= target.maxHp || target.underConstruction) {
        unit.task = { kind: 'idle' };
        continue;
      }
      if (stepToward(state, unit, target.pos, arriveDistance(target))) {
        unit.facing = Math.atan2(target.pos.y - unit.pos.y, target.pos.x - unit.pos.x);
        const p = state.players[unit.player];
        let rate = REPAIR_HP_PER_SEC * p.mods.apply(1, ['repairSpeed']);
        if (unit.def.workerBonuses?.repairMult) rate *= unit.def.workerBonuses.repairMult;
        // Repair costs a fraction of build cost, paid continuously.
        const costScale = (rate * TICK_SECS) / target.maxHp;
        let canPay = true;
        for (const [res, amt] of Object.entries(target.def.cost)) {
          const cost = (amt ?? 0) * REPAIR_COST_FRACTION * costScale;
          if ((p.resources[res as keyof typeof p.resources] ?? 0) < cost) canPay = false;
        }
        if (canPay) {
          for (const [res, amt] of Object.entries(target.def.cost)) {
            p.resources[res as keyof typeof p.resources] -= (amt ?? 0) * REPAIR_COST_FRACTION * costScale;
          }
          target.hp = Math.min(target.maxHp, target.hp + rate * TICK_SECS);
        }
      }
    }
  }

  // Apply progress.
  for (const [buildingId, list] of builders) {
    const site = state.building(buildingId);
    if (!site || site.complete) continue;
    const p = state.players[site.player];
    let buildSpeed = p.mods.apply(1, ['buildSpeed']);
    for (const u of list) {
      if (u.def.workerBonuses?.buildMult) buildSpeed *= 1 + (u.def.workerBonuses.buildMult - 1) / list.length;
    }
    // Builder's Yard style auras.
    for (const b of state.buildings) {
      if (b.dead || !b.complete || b.player !== site.player || !b.def.aura) continue;
      for (const eff of b.def.aura.effects) {
        if (eff.stat === 'buildSpeed' && distSq(b.pos, site.pos) <= b.def.aura.radius * b.def.aura.radius) {
          buildSpeed *= eff.op === 'mul' ? eff.value : 1;
        }
      }
    }
    const rate = (Math.sqrt(list.length) * buildSpeed) / Math.max(1, site.def.buildSecs);
    site.progress = Math.min(1, site.progress + rate * TICK_SECS);
    site.hp = Math.min(site.maxHp, site.hp + site.maxHp * rate * TICK_SECS * 0.9);

    if (site.progress >= 1) {
      completeBuilding(state, site, recomputeCommand);
      for (const u of list) u.task = { kind: 'idle' };
    }
  }
}

export function completeBuilding(state: MatchState, site: Building, recomputeCommand: () => void): void {
  site.underConstruction = false;
  site.progress = 1;
  site.hp = site.maxHp;
  site.efficiency = campEfficiency(state, site);

  // Farms bring their own regenerating plot node.
  if (site.def.id === 'farmstead' || site.def.gatherResource === 'food') {
    if (site.def.id.includes('farm') || site.def.id === 'farmstead' || site.def.id === 'af_herding_grounds') {
      const plot = new ResourceNode({ x: site.pos.x + site.def.footprint[0] / 2 + 1, y: site.pos.y }, 'farm', 1e9);
      state.addNode(plot);
    }
  }

  recomputeCommand();
  state.bus.emit('buildingCompleted', {
    entityId: site.id,
    buildingId: site.defId,
    player: site.player,
    pos: site.pos,
  });
  state.bus.emit('alert', {
    kind: 'buildingComplete',
    message: `${site.def.name} complete.`,
    pos: site.pos,
    player: site.player,
  });
}

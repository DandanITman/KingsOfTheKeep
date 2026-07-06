import { dist, distSq } from '@/core/mathUtils';
import {
  CAMP_EFFICIENCY_FAR,
  CAMP_EFFICIENCY_MID,
  CAMP_EFFICIENCY_NEAR,
  GATHER_SECS,
  GATHER_TRIP_AMOUNT,
  TICK_SECS,
} from '@/data/balance';
import type { GatherResource } from '@/data/types';
import type { MatchState } from '../MatchState';
import { Building, ResourceNode, Unit } from '../entities/Entity';
import { stepToward } from './moveHelpers';

/** Placement efficiency of an economy camp based on distance to its nodes. */
export function campEfficiency(state: MatchState, camp: Building): number {
  const res = camp.def.gatherResource;
  const radius = camp.def.gatherRadius ?? 12;
  if (!res) return 1;
  if (res === 'food' && camp.def.id === 'farmstead') return 1; // farms bring their own plots
  let best = Infinity;
  for (const node of state.nodes) {
    if (node.dead || node.resource !== res) continue;
    const d = dist(camp.pos, node.pos);
    if (d < best) best = d;
  }
  if (best <= radius * 0.5) return CAMP_EFFICIENCY_NEAR;
  if (best <= radius) return CAMP_EFFICIENCY_MID;
  return CAMP_EFFICIENCY_FAR;
}

/** Nearest completed drop-off accepting `resource` for `player`. */
export function nearestDropoff(state: MatchState, pos: { x: number; y: number }, player: number, resource: GatherResource): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const b of state.buildings) {
    if (b.dead || b.player !== player || !b.complete) continue;
    if (!b.def.dropoffFor?.includes(resource)) continue;
    const d = distSq(pos, b.pos);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** Nearest live node of a resource type. */
export function nearestNode(state: MatchState, pos: { x: number; y: number }, resource: GatherResource): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestD = Infinity;
  for (const node of state.nodes) {
    if (node.dead || node.amount <= 0 || node.resource !== resource) continue;
    const d = distSq(pos, node.pos);
    if (d < bestD) {
      bestD = d;
      best = node;
    }
  }
  return best;
}

function gatherRate(state: MatchState, worker: Unit, resource: GatherResource): number {
  const p = state.players[worker.player];
  let rate = p.mods.apply(1, ['gatherRate', `gatherRate.${resource}`]);
  const bonus = worker.def.workerBonuses?.gatherMult?.[resource];
  if (bonus) rate *= bonus;
  return rate;
}

function carryAmount(state: MatchState, worker: Unit): number {
  const p = state.players[worker.player];
  let amount = p.mods.apply(GATHER_TRIP_AMOUNT, ['carryCapacity']);
  if (worker.def.workerBonuses?.carryMult) amount *= worker.def.workerBonuses.carryMult;
  return amount;
}

/**
 * Worker gather FSM: walk to node → gather (timer) → walk to drop-off →
 * deposit → repeat. Deposit is scaled by the drop-off camp's placement
 * efficiency. Node exhaustion emits an alert and re-targets a sibling node.
 */
export function gatherSystem(state: MatchState): void {
  for (const unit of state.units) {
    if (unit.dead || unit.task.kind !== 'gather') continue;
    const task = unit.task;

    if (task.phase === 'toNode') {
      const node = state.node(task.nodeId);
      if (!node || node.amount <= 0) {
        retarget(state, unit);
        continue;
      }
      if (stepToward(state, unit, node.pos, 2.2)) {
        task.phase = 'gathering';
        task.timer = GATHER_SECS[node.resource] / gatherRate(state, unit, node.resource);
      }
    } else if (task.phase === 'gathering') {
      const node = state.node(task.nodeId);
      if (!node || node.amount <= 0) {
        retarget(state, unit);
        continue;
      }
      task.timer -= TICK_SECS;
      if (task.timer <= 0) {
        const take = Math.min(carryAmount(state, unit), node.amount);
        node.amount -= take;
        unit.carrying = { resource: node.resource, amount: take };
        if (node.amount <= 0 && node.nodeType !== 'farm') {
          node.dead = true;
          state.bus.emit('resourceNodeDepleted', { pos: node.pos, resource: node.resource });
          state.bus.emit('alert', {
            kind: 'resourceDepleted',
            message: `A ${node.resource} source has been exhausted.`,
            pos: node.pos,
            player: unit.player,
          });
        }
        task.phase = 'toDropoff';
      }
    } else if (task.phase === 'toDropoff') {
      if (!unit.carrying) {
        task.phase = 'toNode';
        continue;
      }
      const dropoff = nearestDropoff(state, unit.pos, unit.player, unit.carrying.resource);
      if (!dropoff) {
        // Nowhere to deposit — wait near the node.
        continue;
      }
      const arrive = Math.max(dropoff.def.footprint[0], dropoff.def.footprint[1]) / 2 + 1.2;
      if (stepToward(state, unit, dropoff.pos, arrive)) {
        const eff = dropoff.efficiency;
        state.addResource(unit.player, unit.carrying.resource, unit.carrying.amount * eff);
        unit.carrying = null;
        const node = state.node(task.nodeId);
        if (node && node.amount > 0) {
          task.phase = 'toNode';
        } else {
          retarget(state, unit);
        }
      }
    }
  }
}

/** Node died mid-task: find a sibling node of the same resource, else idle. */
function retarget(state: MatchState, unit: Unit): void {
  if (unit.task.kind !== 'gather') return;
  const carried = unit.carrying?.resource;
  const node = state.node(unit.task.nodeId);
  const resource = carried ?? node?.resource;
  if (unit.carrying) {
    // Deliver what we hold first.
    unit.task = { kind: 'gather', nodeId: -1, phase: 'toDropoff', timer: 0, pinned: unit.task.pinned };
    const replacement = resource ? nearestNode(state, unit.pos, resource) : null;
    if (replacement) unit.task.nodeId = replacement.id;
    return;
  }
  const replacement = resource ? nearestNode(state, unit.pos, resource as GatherResource) : null;
  if (replacement) {
    unit.task = { kind: 'gather', nodeId: replacement.id, phase: 'toNode', timer: 0, pinned: unit.task.pinned };
  } else {
    unit.task = { kind: 'idle' };
  }
}

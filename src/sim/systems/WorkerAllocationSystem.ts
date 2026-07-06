import { distSq } from '@/core/mathUtils';
import { TICK_RATE, WORKER_REASSIGN_SECS } from '@/data/balance';
import { GATHER_RESOURCES, type GatherResource } from '@/data/types';
import type { MatchState } from '../MatchState';
import { Unit } from '../entities/Entity';
import { nearestNode } from './GatherSystem';

const PERIOD_TICKS = WORKER_REASSIGN_SECS * TICK_RATE;

/**
 * Reconciles worker distribution with the player's ratio sliders every 2 s.
 * Only idle and surplus auto-workers are reassigned — carrying workers finish
 * their trip, manual (pinned) workers and builders are never touched.
 */
export function workerAllocationSystem(state: MatchState, autoAssignHuman: boolean): void {
  if (state.tick % PERIOD_TICKS !== 0) return;

  for (const p of state.players) {
    if (p.defeated) continue;
    if (!p.isBot && !autoAssignHuman) continue;

    // Collect auto-pool workers (unpinned, idle or gathering).
    const pool: Unit[] = [];
    const byResource = new Map<GatherResource, Unit[]>();
    for (const r of GATHER_RESOURCES) byResource.set(r, []);
    for (const u of state.units) {
      if (u.dead || u.player !== p.id || u.def.role !== 'worker') continue;
      if (u.task.kind === 'gather') {
        if (u.task.pinned) continue;
        pool.push(u);
        const node = state.node(u.task.nodeId);
        const res = node?.resource ?? u.carrying?.resource;
        if (res) byResource.get(res)?.push(u);
      } else if (u.task.kind === 'idle') {
        pool.push(u);
      }
    }
    if (pool.length === 0) continue;

    const totalRatio = GATHER_RESOURCES.reduce((sum, r) => sum + (p.workerRatios[r] ?? 0), 0) || 1;
    const desired = new Map<GatherResource, number>();
    for (const r of GATHER_RESOURCES) {
      desired.set(r, Math.round((pool.length * (p.workerRatios[r] ?? 0)) / totalRatio));
    }

    // Free surplus workers (prefer ones not mid-carry).
    const free: Unit[] = pool.filter((u) => u.task.kind === 'idle');
    for (const r of GATHER_RESOURCES) {
      const assigned = byResource.get(r)!;
      const want = desired.get(r)!;
      let excess = assigned.length - want;
      if (excess <= 0) continue;
      // Release non-carrying first.
      assigned.sort((a, b) => Number(!!a.carrying) - Number(!!b.carrying));
      for (const u of assigned) {
        if (excess <= 0) break;
        if (u.carrying) continue; // finish the trip; counted next cycle
        free.push(u);
        u.task = { kind: 'idle' };
        excess--;
      }
    }

    // Fill deficits nearest-first.
    for (const r of GATHER_RESOURCES) {
      const want = desired.get(r)!;
      const have = byResource.get(r)!.filter((u) => u.task.kind === 'gather').length;
      let need = want - have;
      while (need > 0 && free.length > 0) {
        // Pick the free worker closest to any node of this resource.
        const node0 = nearestNode(state, free[0].pos, r);
        if (!node0) break;
        let bestIdx = 0;
        let bestD = Infinity;
        for (let i = 0; i < free.length; i++) {
          const node = nearestNode(state, free[i].pos, r);
          if (!node) continue;
          const d = distSq(free[i].pos, node.pos);
          if (d < bestD) {
            bestD = d;
            bestIdx = i;
          }
        }
        const worker = free.splice(bestIdx, 1)[0];
        const node = nearestNode(state, worker.pos, r);
        if (!node) break;
        worker.task = { kind: 'gather', nodeId: node.id, phase: 'toNode', timer: 0 };
        need--;
      }
    }

    // Leftover free workers: send to the highest-ratio resource with nodes.
    for (const u of free) {
      const sorted = [...GATHER_RESOURCES].sort((a, b) => (p.workerRatios[b] ?? 0) - (p.workerRatios[a] ?? 0));
      for (const r of sorted) {
        const node = nearestNode(state, u.pos, r);
        if (node) {
          u.task = { kind: 'gather', nodeId: node.id, phase: 'toNode', timer: 0 };
          break;
        }
      }
    }
  }
}

import { dist } from '@/core/mathUtils';
import type { MatchState } from '../MatchState';
import { findPath } from '../path/AStar';
import { stepToward, stepUnit } from './moveHelpers';

const MAX_PATHS_PER_TICK = 20;

/**
 * Executes 'move' (A* waypoints), 'macroMove' (flow field), and 'rout'
 * movement. Other tasks (gather/build/fight) move via their own systems
 * using the shared step helpers.
 */
export function movementSystem(state: MatchState): void {
  state.pathComputationsThisTick = 0;
  state.flows.newTick();

  for (const unit of state.units) {
    if (unit.dead) continue;
    const task = unit.task;

    if (task.kind === 'move') {
      if (!task.path) {
        if (dist(unit.pos, task.dest) < 1.2) {
          unit.task = { kind: 'idle' };
          continue;
        }
        if (state.pathComputationsThisTick < MAX_PATHS_PER_TICK) {
          state.pathComputationsThisTick++;
          task.path = findPath(state.nav, unit.pos, task.dest, unit.player) ?? [];
          if (task.path.length === 0) {
            // Unreachable: walk generally toward it; movement will slide.
            task.path = [ { x: task.dest.x, y: task.dest.y } ];
          }
        } else {
          // Budget exhausted: drift toward dest until we get a path.
          stepToward(state, unit, task.dest, 1.0);
          continue;
        }
      }
      const waypoint = task.path[0];
      if (!waypoint) {
        unit.task = { kind: 'idle' };
        continue;
      }
      if (stepToward(state, unit, waypoint, 0.6)) {
        task.path.shift();
        if (task.path.length === 0) unit.task = { kind: 'idle' };
      }
    } else if (task.kind === 'macroMove') {
      const flow = state.flows.get(state.nav, task.dest, unit.player);
      const d = dist(unit.pos, task.dest);
      if (d < 2.5) {
        unit.task = { kind: 'idle' };
        continue;
      }
      if (flow) {
        const dir = flow.sample(unit.pos);
        if (dir) {
          stepUnit(state, unit, dir);
          continue;
        }
      }
      // No field yet (budget) or off-field: head straight.
      stepToward(state, unit, task.dest, 2.0);
    } else if (task.kind === 'rout') {
      const fortress = state.fortressOf(unit.player);
      if (fortress) {
        if (stepToward(state, unit, fortress.pos, 6)) unit.task = { kind: 'idle' };
      } else {
        unit.task = { kind: 'idle' };
      }
    }
  }
}

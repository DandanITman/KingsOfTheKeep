import { clamp, dist, normalize, type Vec2 } from '@/core/mathUtils';
import { TICK_SECS } from '@/data/balance';
import type { MatchState } from '../MatchState';
import { Unit } from '../entities/Entity';

const scratch: number[] = [];

/** Effective movement speed with player modifiers applied. */
export function unitSpeed(state: MatchState, unit: Unit): number {
  const p = state.players[unit.player];
  return p.mods.apply(unit.def.speed, ['unit.speed', `unit.${unit.def.role}.speed`]);
}

/**
 * Advance a unit one tick in `desiredDir` (unit vector), applying neighbor
 * separation and terrain blocking with axis-slide. Returns actual movement.
 */
export function stepUnit(state: MatchState, unit: Unit, desiredDir: Vec2, speedMult = 1): void {
  const speed = unitSpeed(state, unit) * speedMult;

  // Separation from neighbors.
  let sepX = 0;
  let sepY = 0;
  state.unitHash.query(unit.pos, 1.4, scratch);
  for (const otherId of scratch) {
    if (otherId === unit.id) continue;
    const other = state.unit(otherId);
    if (!other) continue;
    const dx = unit.pos.x - other.pos.x;
    const dy = unit.pos.y - other.pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > 1.96 || d2 < 1e-6) continue;
    const d = Math.sqrt(d2);
    const push = (1.4 - d) / 1.4;
    sepX += (dx / d) * push;
    sepY += (dy / d) * push;
  }

  let dirX = desiredDir.x + sepX * 0.6;
  let dirY = desiredDir.y + sepY * 0.6;
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len < 1e-6) return;
  dirX /= len;
  dirY /= len;

  const step = speed * TICK_SECS;
  let nx = unit.pos.x + dirX * step;
  let ny = unit.pos.y + dirY * step;

  // Terrain blocking with axis slide.
  const nav = state.nav;
  if (!nav.isWalkable(Math.floor(nx), Math.floor(ny), unit.player)) {
    if (nav.isWalkable(Math.floor(nx), Math.floor(unit.pos.y), unit.player)) {
      ny = unit.pos.y;
    } else if (nav.isWalkable(Math.floor(unit.pos.x), Math.floor(ny), unit.player)) {
      nx = unit.pos.x;
    } else {
      return;
    }
  }

  if (Math.abs(nx - unit.pos.x) > 1e-5 || Math.abs(ny - unit.pos.y) > 1e-5) {
    unit.facing = Math.atan2(ny - unit.pos.y, nx - unit.pos.x);
  }
  unit.pos.x = clamp(nx, 1, nav.width - 1);
  unit.pos.y = clamp(ny, 1, nav.height - 1);
}

/** Step directly toward a target point; returns true when within `arrive`. */
export function stepToward(state: MatchState, unit: Unit, target: Vec2, arrive = 0.5, speedMult = 1): boolean {
  const d = dist(unit.pos, target);
  if (d <= arrive) return true;
  const dir = normalize({ x: target.x - unit.pos.x, y: target.y - unit.pos.y });
  stepUnit(state, unit, dir, speedMult);
  return dist(unit.pos, target) <= arrive;
}

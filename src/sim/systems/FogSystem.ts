import type { Vec2 } from '@/core/mathUtils';
import { FOG_CELL, FOG_UPDATE_PERIOD_TICKS } from '@/data/balance';
import type { PlayerId } from '../commands';
import type { MatchState } from '../MatchState';

export const FOG_BLACK = 0;
export const FOG_EXPLORED = 1;
export const FOG_VISIBLE = 2;

/**
 * Per-player fog of war on a half-resolution grid: 0 unexplored (black),
 * 1 explored (gray), 2 currently visible. Vision circles are stamped with
 * precomputed offset lists; smoke/sandstorm zones suppress stamping and
 * reveal effects force it.
 */
export class FogOfWar {
  readonly width: number;
  readonly height: number;
  readonly grids: Uint8Array[];
  /** Incremented whenever fog changes (render uploads texture when dirty). */
  version = 0;
  private offsetCache = new Map<number, Int16Array>();
  /** Enemy buildings each player has seen at least once. */
  readonly seenBuildingIds: Set<number>[] = [new Set(), new Set()];

  constructor(worldW: number, worldH: number) {
    this.width = Math.ceil(worldW / FOG_CELL);
    this.height = Math.ceil(worldH / FOG_CELL);
    this.grids = [new Uint8Array(this.width * this.height), new Uint8Array(this.width * this.height)];
  }

  private offsets(radiusCells: number): Int16Array {
    let cached = this.offsetCache.get(radiusCells);
    if (!cached) {
      const list: number[] = [];
      for (let dy = -radiusCells; dy <= radiusCells; dy++) {
        for (let dx = -radiusCells; dx <= radiusCells; dx++) {
          if (dx * dx + dy * dy <= radiusCells * radiusCells) list.push(dx, dy);
        }
      }
      cached = new Int16Array(list);
      this.offsetCache.set(radiusCells, cached);
    }
    return cached;
  }

  private stamp(player: PlayerId, pos: Vec2, radius: number, suppressions: { pos: Vec2; radius: number }[]): void {
    const grid = this.grids[player];
    const cx = Math.floor(pos.x / FOG_CELL);
    const cy = Math.floor(pos.y / FOG_CELL);
    const offsets = this.offsets(Math.max(1, Math.round(radius / FOG_CELL)));
    for (let i = 0; i < offsets.length; i += 2) {
      const x = cx + offsets[i];
      const y = cy + offsets[i + 1];
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
      // Vision suppression zones (sandstorm/smoke) block visibility, not exploration.
      let suppressed = false;
      const wx = x * FOG_CELL + FOG_CELL / 2;
      const wy = y * FOG_CELL + FOG_CELL / 2;
      for (const zone of suppressions) {
        const dx = wx - zone.pos.x;
        const dy = wy - zone.pos.y;
        if (dx * dx + dy * dy < zone.radius * zone.radius) {
          suppressed = true;
          break;
        }
      }
      const idx = y * this.width + x;
      grid[idx] = suppressed ? Math.max(grid[idx], FOG_EXPLORED) : FOG_VISIBLE;
    }
  }

  update(state: MatchState): void {
    if (state.tick % FOG_UPDATE_PERIOD_TICKS !== 0) return;

    for (const player of [0, 1] as PlayerId[]) {
      const grid = this.grids[player];
      // Downgrade visible → explored.
      for (let i = 0; i < grid.length; i++) {
        if (grid[i] === FOG_VISIBLE) grid[i] = FOG_EXPLORED;
      }

      const suppressions = state.activeEffects
        .filter((e) => e.kind === 'visionSuppress' && e.expiresTick > state.tick && e.player !== player)
        .map((e) => ({ pos: e.pos, radius: e.radius }));

      for (const u of state.units) {
        if (u.dead || u.player !== player) continue;
        this.stamp(player, u.pos, u.def.los, suppressions);
      }
      for (const b of state.buildings) {
        if (b.dead || b.player !== player || !b.complete) continue;
        this.stamp(player, b.pos, b.def.los ?? Math.max(...b.def.footprint) + 6, suppressions);
      }
      // Reveal effects (owned by this player).
      for (const e of state.activeEffects) {
        if (e.kind === 'reveal' && e.player === player && e.expiresTick > state.tick) {
          this.stamp(player, e.pos, e.radius, []);
        }
      }
      // Watch hills grant vision to whoever holds units nearby (simplified: both see).
      for (const obj of state.objectives) {
        if (obj.objType !== 'watchHill') continue;
        for (const u of state.units) {
          if (u.dead || u.player !== player) continue;
          const dx = u.pos.x - obj.pos.x;
          const dy = u.pos.y - obj.pos.y;
          if (dx * dx + dy * dy < 64) {
            this.stamp(player, obj.pos, 26, []);
            break;
          }
        }
      }

      // Remember enemy buildings we can currently see.
      for (const b of state.buildings) {
        if (b.dead || b.player === player || b.player < 0) continue;
        if (this.valueAt(b.pos, player) === FOG_VISIBLE) this.seenBuildingIds[player].add(b.id);
      }
    }
    this.version++;
  }

  valueAt(pos: Vec2, player: PlayerId): number {
    const x = Math.floor(pos.x / FOG_CELL);
    const y = Math.floor(pos.y / FOG_CELL);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return FOG_BLACK;
    return this.grids[player][y * this.width + x];
  }
}

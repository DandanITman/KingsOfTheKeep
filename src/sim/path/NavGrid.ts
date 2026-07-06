import { Grid } from '@/core/Grid';
import type { MapDef } from '@/data/types';
import type { Vec2 } from '@/core/mathUtils';

export const CELL_FREE = 0;
export const CELL_BLOCKED = 1; // terrain: cliffs, water, rocks
export const CELL_BUILDING = 2; // stamped by structures
export const CELL_WALL = 3; // walls/gates: enemies blocked; gates pass owners (handled in movement)

/**
 * Walkability grid at 1 cell = 1 world unit. Terrain blockers are stamped at
 * load; buildings stamp/unstamp as they are placed/destroyed. `version`
 * increments on every change so cached paths and flow fields can invalidate.
 */
export class NavGrid {
  readonly grid: Grid;
  readonly width: number;
  readonly height: number;
  version = 0;
  /** Owner player per wall/gate cell (gate passage check); -2 = none. */
  private wallOwner: Int8Array;
  private gateCell: Uint8Array;

  constructor(map: MapDef) {
    this.width = map.worldSize[0];
    this.height = map.worldSize[1];
    this.grid = new Grid(this.width, this.height, CELL_FREE);
    this.wallOwner = new Int8Array(this.width * this.height).fill(-2);
    this.gateCell = new Uint8Array(this.width * this.height);

    for (const blocker of map.blockers ?? []) {
      const r = Math.ceil(blocker.radius);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > blocker.radius * blocker.radius) continue;
          const x = Math.round(blocker.pos.x + dx);
          const y = Math.round(blocker.pos.y + dy);
          if (this.grid.inBounds(x, y)) this.grid.set(x, y, CELL_BLOCKED);
        }
      }
    }
    // Border ring is blocked so units never leave the map.
    for (let x = 0; x < this.width; x++) {
      this.grid.set(x, 0, CELL_BLOCKED);
      this.grid.set(x, this.height - 1, CELL_BLOCKED);
    }
    for (let y = 0; y < this.height; y++) {
      this.grid.set(0, y, CELL_BLOCKED);
      this.grid.set(this.width - 1, y, CELL_BLOCKED);
    }
  }

  cellOf(pos: Vec2): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(this.width - 1, Math.floor(pos.x))),
      y: Math.max(0, Math.min(this.height - 1, Math.floor(pos.y))),
    };
  }

  /** Is this cell passable for the given player? Gates pass their owner. */
  isWalkable(x: number, y: number, player?: number): boolean {
    if (!this.grid.inBounds(x, y)) return false;
    const v = this.grid.get(x, y);
    if (v === CELL_FREE) return true;
    if (v === CELL_WALL && player !== undefined) {
      const i = this.grid.idx(x, y);
      return this.gateCell[i] === 1 && this.wallOwner[i] === player;
    }
    return false;
  }

  isFree(x: number, y: number): boolean {
    return this.grid.inBounds(x, y) && this.grid.get(x, y) === CELL_FREE;
  }

  /** Stamp a building footprint. */
  stamp(cellX: number, cellY: number, w: number, h: number, opts: { wall?: boolean; gate?: boolean; player?: number } = {}): void {
    const kind = opts.wall ? CELL_WALL : CELL_BUILDING;
    for (let y = cellY; y < cellY + h; y++) {
      for (let x = cellX; x < cellX + w; x++) {
        if (!this.grid.inBounds(x, y)) continue;
        this.grid.set(x, y, kind);
        const i = this.grid.idx(x, y);
        this.wallOwner[i] = opts.player ?? -2;
        this.gateCell[i] = opts.gate ? 1 : 0;
      }
    }
    this.version++;
  }

  unstamp(cellX: number, cellY: number, w: number, h: number): void {
    for (let y = cellY; y < cellY + h; y++) {
      for (let x = cellX; x < cellX + w; x++) {
        if (!this.grid.inBounds(x, y)) continue;
        this.grid.set(x, y, CELL_FREE);
        const i = this.grid.idx(x, y);
        this.wallOwner[i] = -2;
        this.gateCell[i] = 0;
      }
    }
    this.version++;
  }

  /** Can a footprint be placed here (all cells free)? */
  canPlace(cellX: number, cellY: number, w: number, h: number): boolean {
    for (let y = cellY; y < cellY + h; y++) {
      for (let x = cellX; x < cellX + w; x++) {
        if (!this.isFree(x, y)) return false;
      }
    }
    return true;
  }

  /** Spiral-search the nearest walkable cell to a position. */
  nearestFree(pos: Vec2, maxRadius = 20): Vec2 {
    const c = this.cellOf(pos);
    if (this.isFree(c.x, c.y)) return { x: c.x + 0.5, y: c.y + 0.5 };
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = c.x + dx;
          const y = c.y + dy;
          if (this.isFree(x, y)) return { x: x + 0.5, y: y + 0.5 };
        }
      }
    }
    return { x: c.x + 0.5, y: c.y + 0.5 };
  }
}

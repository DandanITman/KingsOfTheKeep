import type { Vec2 } from './mathUtils';

interface HashEntry {
  id: number;
  pos: Vec2;
}

/**
 * Uniform-grid spatial hash for neighbor queries. Rebuilt each tick from
 * entity positions — cheap at our entity counts and avoids stale buckets.
 */
export class SpatialHash {
  private cellSize: number;
  private cells = new Map<number, HashEntry[]>();

  constructor(cellSize = 2) {
    this.cellSize = cellSize;
  }

  private key(cx: number, cy: number): number {
    // Offset so negative coords hash cleanly; maps are positive anyway.
    return (cx + 4096) * 16384 + (cy + 4096);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(id: number, pos: Vec2): void {
    const cx = Math.floor(pos.x / this.cellSize);
    const cy = Math.floor(pos.y / this.cellSize);
    const k = this.key(cx, cy);
    let arr = this.cells.get(k);
    if (!arr) {
      arr = [];
      this.cells.set(k, arr);
    }
    arr.push({ id, pos });
  }

  /** Collect entity ids within `radius` of `pos` into `out` (cleared first). */
  query(pos: Vec2, radius: number, out: number[]): number[] {
    out.length = 0;
    const r2 = radius * radius;
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);
    for (let cy = minY; cy <= maxY; cy++) {
      for (let cx = minX; cx <= maxX; cx++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const e of arr) {
          const dx = e.pos.x - pos.x;
          const dy = e.pos.y - pos.y;
          if (dx * dx + dy * dy <= r2) out.push(e.id);
        }
      }
    }
    return out;
  }
}

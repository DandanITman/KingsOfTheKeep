import type { Vec2 } from '@/core/mathUtils';
import type { NavGrid } from './NavGrid';

/**
 * Flow field: for a destination, a per-cell direction pointing along the
 * cheapest path. Built by BFS (uniform cost) from the destination outward.
 * Armies converging on flags/fortresses sample it O(1) per unit.
 */
export class FlowField {
  readonly destCell: { x: number; y: number };
  readonly navVersion: number;
  /** Direction per cell packed as byte: 0=none, 1..8 = compass. */
  private dirs: Uint8Array;
  private width: number;
  private height: number;

  private static DX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
  private static DY = [0, -1, -1, 0, 1, 1, 1, 0, -1];

  constructor(nav: NavGrid, dest: Vec2, player?: number) {
    this.width = nav.width;
    this.height = nav.height;
    this.destCell = nav.cellOf(dest);
    this.navVersion = nav.version;
    this.dirs = new Uint8Array(this.width * this.height);

    const w = this.width;
    const dist = new Float32Array(w * this.height).fill(Infinity);
    let destIdx = this.destCell.y * w + this.destCell.x;
    if (!nav.isWalkable(this.destCell.x, this.destCell.y, player)) {
      const nf = nav.nearestFree(dest, 15);
      const c = nav.cellOf(nf);
      destIdx = c.y * w + c.x;
    }
    dist[destIdx] = 0;

    // Dijkstra-lite BFS with diagonal cost; simple ring queue.
    const queue: number[] = [destIdx];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const cx = cur % w;
      const cy = (cur / w) | 0;
      const cd = dist[cur];
      for (let d = 1; d <= 8; d++) {
        const nx = cx + FlowField.DX[d];
        const ny = cy + FlowField.DY[d];
        if (nx < 0 || ny < 0 || nx >= w || ny >= this.height) continue;
        if (!nav.isWalkable(nx, ny, player)) continue;
        const diag = FlowField.DX[d] !== 0 && FlowField.DY[d] !== 0;
        if (diag && (!nav.isWalkable(cx + FlowField.DX[d], cy, player) || !nav.isWalkable(cx, cy + FlowField.DY[d], player))) continue;
        const nIdx = ny * w + nx;
        const nd = cd + (diag ? Math.SQRT2 : 1);
        if (nd < dist[nIdx] - 1e-4) {
          dist[nIdx] = nd;
          // Direction points back toward the source of expansion (to dest).
          this.dirs[nIdx] = ((d + 3) % 8) + 1; // opposite compass dir
          queue.push(nIdx);
        }
      }
    }
  }

  /** Direction at world position, or null if unreachable/at destination. */
  sample(pos: Vec2): Vec2 | null {
    const x = Math.floor(pos.x);
    const y = Math.floor(pos.y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
    const d = this.dirs[y * this.width + x];
    if (d === 0) return null;
    const dx = FlowField.DX[d];
    const dy = FlowField.DY[d];
    const len = dx !== 0 && dy !== 0 ? Math.SQRT1_2 : 1;
    return { x: dx * len, y: dy * len };
  }
}

/**
 * Cache of flow fields keyed by quantized destination. Budgeted: at most
 * `buildBudget` new fields per tick; callers falling outside the budget get
 * null and try again next tick (units keep walking their old direction).
 */
export class FlowFieldCache {
  private cache = new Map<string, FlowField>();
  private buildsThisTick = 0;
  readonly buildBudget = 2;

  private key(dest: Vec2, player: number): string {
    // Quantize to 4-cell buckets so nearby destinations share fields.
    return `${player}:${Math.round(dest.x / 4)}:${Math.round(dest.y / 4)}`;
  }

  newTick(): void {
    this.buildsThisTick = 0;
  }

  get(nav: NavGrid, dest: Vec2, player: number): FlowField | null {
    const k = this.key(dest, player);
    const cached = this.cache.get(k);
    if (cached && cached.navVersion === nav.version) return cached;
    if (this.buildsThisTick >= this.buildBudget) return cached ?? null;
    this.buildsThisTick++;
    const field = new FlowField(nav, dest, player);
    this.cache.set(k, field);
    // Bound memory: drop stale entries when the cache grows.
    if (this.cache.size > 40) {
      for (const [key, f] of this.cache) {
        if (f.navVersion !== nav.version) this.cache.delete(key);
        if (this.cache.size <= 30) break;
      }
    }
    return field;
  }
}

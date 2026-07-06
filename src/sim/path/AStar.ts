import type { Vec2 } from '@/core/mathUtils';
import { CELL_FREE, NavGrid } from './NavGrid';

/**
 * Grid A* with octile heuristic and diagonal movement (no corner cutting).
 * Returns world-space waypoints (cell centers), smoothed by line-of-walkability.
 */

interface OpenNode {
  idx: number;
  f: number;
}

// Binary min-heap on f.
class Heap {
  arr: OpenNode[] = [];
  push(n: OpenNode): void {
    this.arr.push(n);
    let i = this.arr.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.arr[p].f <= this.arr[i].f) break;
      [this.arr[p], this.arr[i]] = [this.arr[i], this.arr[p]];
      i = p;
    }
  }
  pop(): OpenNode | undefined {
    const top = this.arr[0];
    const last = this.arr.pop();
    if (this.arr.length > 0 && last) {
      this.arr[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.arr.length && this.arr[l].f < this.arr[m].f) m = l;
        if (r < this.arr.length && this.arr[r].f < this.arr[m].f) m = r;
        if (m === i) break;
        [this.arr[m], this.arr[i]] = [this.arr[i], this.arr[m]];
        i = m;
      }
    }
    return top;
  }
  get size(): number {
    return this.arr.length;
  }
}

const SQRT2 = Math.SQRT2;

export function findPath(nav: NavGrid, from: Vec2, to: Vec2, player?: number, maxExpansions = 6000): Vec2[] | null {
  const w = nav.width;
  const h = nav.height;
  const start = nav.cellOf(from);
  let goal = nav.cellOf(to);

  const walkable = (x: number, y: number) => nav.isWalkable(x, y, player);

  if (!walkable(goal.x, goal.y)) {
    const nf = nav.nearestFree(to, 12);
    goal = nav.cellOf(nf);
    if (!walkable(goal.x, goal.y)) return null;
  }
  if (!walkable(start.x, start.y)) {
    const nf = nav.nearestFree(from, 12);
    const c = nav.cellOf(nf);
    start.x = c.x;
    start.y = c.y;
  }

  const startIdx = start.y * w + start.x;
  const goalIdx = goal.y * w + goal.x;
  if (startIdx === goalIdx) return [{ x: to.x, y: to.y }];

  const gScore = new Float32Array(w * h).fill(Infinity);
  const cameFrom = new Int32Array(w * h).fill(-1);
  const closed = new Uint8Array(w * h);
  gScore[startIdx] = 0;

  const hCost = (x: number, y: number) => {
    const dx = Math.abs(x - goal.x);
    const dy = Math.abs(y - goal.y);
    return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
  };

  const open = new Heap();
  open.push({ idx: startIdx, f: hCost(start.x, start.y) });
  let expansions = 0;
  let found = false;

  while (open.size > 0 && expansions < maxExpansions) {
    const cur = open.pop()!;
    if (cur.idx === goalIdx) {
      found = true;
      break;
    }
    if (closed[cur.idx]) continue;
    closed[cur.idx] = 1;
    expansions++;

    const cx = cur.idx % w;
    const cy = (cur.idx / w) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!walkable(nx, ny)) continue;
        // No corner cutting on diagonals.
        if (dx !== 0 && dy !== 0 && (!walkable(cx + dx, cy) || !walkable(cx, cy + dy))) continue;
        const nIdx = ny * w + nx;
        if (closed[nIdx]) continue;
        const cost = dx !== 0 && dy !== 0 ? SQRT2 : 1;
        const g = gScore[cur.idx] + cost;
        if (g < gScore[nIdx]) {
          gScore[nIdx] = g;
          cameFrom[nIdx] = cur.idx;
          open.push({ idx: nIdx, f: g + hCost(nx, ny) });
        }
      }
    }
  }

  if (!found) return null;

  // Reconstruct.
  const cells: number[] = [];
  let cur = goalIdx;
  while (cur !== -1 && cur !== startIdx) {
    cells.push(cur);
    cur = cameFrom[cur];
  }
  cells.reverse();

  // Smooth: keep waypoints only where line-of-walk breaks.
  const pts: Vec2[] = cells.map((idx) => ({ x: (idx % w) + 0.5, y: ((idx / w) | 0) + 0.5 }));
  const smoothed: Vec2[] = [];
  let anchor: Vec2 = { x: from.x, y: from.y };
  let i = 0;
  while (i < pts.length) {
    let j = pts.length - 1;
    let advanced = false;
    for (; j > i; j--) {
      if (lineWalkable(nav, anchor, pts[j], player)) {
        smoothed.push(pts[j]);
        anchor = pts[j];
        i = j + 1;
        advanced = true;
        break;
      }
    }
    if (!advanced) {
      smoothed.push(pts[i]);
      anchor = pts[i];
      i++;
    }
  }
  // Final exact destination if reachable.
  if (smoothed.length > 0) smoothed[smoothed.length - 1] = { x: goal.x + 0.5, y: goal.y + 0.5 };
  return smoothed;
}

export function lineWalkable(nav: NavGrid, a: Vec2, b: Vec2, player?: number): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2);
  if (steps === 0) return true;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.floor(a.x + dx * t);
    const y = Math.floor(a.y + dy * t);
    if (!nav.isWalkable(x, y, player)) return false;
  }
  return true;
}

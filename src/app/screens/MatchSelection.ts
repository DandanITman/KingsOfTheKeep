import type { Vec2 } from '@/core/mathUtils';
import { dist } from '@/core/mathUtils';
import type { MatchSim } from '@/sim/MatchSim';
import { Building, ResourceNode, Unit } from '@/sim/entities/Entity';
import type { OverlayCanvas } from '@/render/OverlayCanvas';
import type { MatchInput } from './MatchInput';

/**
 * Selection & direct orders: click select, double-click same-type select,
 * drag box select, right-click contextual commands (move / attack-move /
 * gather / build / repair / rally).
 */
export class MatchSelection {
  selected = new Set<number>();
  onChange: (() => void) | null = null;
  private sim: MatchSim;
  private overlay: OverlayCanvas;
  private lastClickTime = 0;
  private lastClickedDef: string | null = null;

  constructor(sim: MatchSim, input: MatchInput, overlay: OverlayCanvas) {
    this.sim = sim;
    this.overlay = overlay;

    input.onNormalClick = (world, e) => this.handleClick(world, e);
    input.onNormalRightClick = (world) => this.handleRightClick(world);
    input.onNormalDrag = (start, end, done) => {
      this.overlay.dragRect = { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
      if (done) {
        this.selectInRect(start, end);
        this.overlay.dragRect = null;
      }
    };
  }

  private setSelection(ids: number[]): void {
    this.selected = new Set(ids);
    this.overlay.selectedIds = this.selected;
    this.onChange?.();
  }

  private handleClick(world: Vec2, e: PointerEvent): void {
    const s = this.sim.state;
    // Nearest own or enemy unit within click radius.
    let best: Unit | Building | null = null;
    let bestD = 1.6;
    for (const u of s.units) {
      if (u.dead) continue;
      const d = dist(u.pos, world);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    if (!best) {
      for (const b of s.buildings) {
        if (b.dead) continue;
        const [w, h] = b.def.footprint;
        if (world.x >= b.cell.x - 0.3 && world.x <= b.cell.x + w + 0.3 && world.y >= b.cell.y - 0.3 && world.y <= b.cell.y + h + 0.3) {
          best = b;
          break;
        }
      }
    }

    const now = performance.now();
    const doubleClick = now - this.lastClickTime < 350 && best !== null && this.lastClickedDef === (best as Unit | Building).defId;
    this.lastClickTime = now;
    this.lastClickedDef = best ? (best as Unit | Building).defId : null;

    if (!best) {
      this.setSelection([]);
      return;
    }

    if (doubleClick && best instanceof Unit && best.player === 0) {
      // Select all same-type units nearby.
      const same = s.units.filter((u) => !u.dead && u.player === 0 && u.defId === best!.defId && dist(u.pos, world) < 24);
      this.setSelection(same.map((u) => u.id));
      return;
    }

    if (e.shiftKey && best.player === 0) {
      const ids = [...this.selected, best.id];
      this.setSelection(ids);
    } else {
      this.setSelection([best.id]);
    }
  }

  private selectInRect(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const s = this.sim.state;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const ids: number[] = [];
    for (const u of s.units) {
      if (u.dead || u.player !== 0) continue;
      const p = this.overlay.worldToScreen(u.pos.x, 0.5, u.pos.y);
      if (p.sx >= minX && p.sx <= maxX && p.sy >= minY && p.sy <= maxY) ids.push(u.id);
    }
    // Prefer military over workers in mixed drags.
    const units = ids.map((id) => s.unit(id)).filter((u): u is Unit => !!u);
    const military = units.filter((u) => u.def.role !== 'worker');
    this.setSelection((military.length > 0 ? military : units).map((u) => u.id));
  }

  private handleRightClick(world: Vec2): void {
    if (this.selected.size === 0) return;
    const s = this.sim.state;
    const ids = [...this.selected];
    const units = ids.map((id) => s.unit(id)).filter((u): u is Unit => !!u && u.player === 0);
    if (units.length === 0) {
      // Building selected: set rally.
      const building = ids.map((id) => s.building(id)).find((b) => b && b.player === 0);
      if (building && building.def.trainKey) {
        this.sim.enqueue({ kind: 'setRally', player: 0, buildingId: building.id, pos: world });
      }
      return;
    }

    // Context: resource node → gather; own construction site / damaged building → build/repair; enemy → attack-move; else move.
    let node: ResourceNode | null = null;
    for (const n of s.nodes) {
      if (!n.dead && n.amount > 0 && dist(n.pos, world) < 2.2) {
        node = n;
        break;
      }
    }
    const workers = units.filter((u) => u.def.role === 'worker');
    if (node && workers.length > 0) {
      this.sim.enqueue({ kind: 'directGather', player: 0, unitIds: workers.map((u) => u.id), nodeId: node.id });
      const soldiers = units.filter((u) => u.def.role !== 'worker');
      if (soldiers.length > 0) {
        this.sim.enqueue({ kind: 'directOrder', player: 0, unitIds: soldiers.map((u) => u.id), dest: world, attackMove: false });
      }
      return;
    }

    let site: Building | null = null;
    for (const b of s.buildings) {
      if (b.dead || b.player !== 0) continue;
      const [w, h] = b.def.footprint;
      if (world.x >= b.cell.x && world.x <= b.cell.x + w && world.y >= b.cell.y && world.y <= b.cell.y + h) {
        site = b;
        break;
      }
    }
    if (site && workers.length > 0 && (site.underConstruction || site.hp < site.maxHp)) {
      this.sim.enqueue({ kind: 'directBuild', player: 0, unitIds: workers.map((u) => u.id), buildingId: site.id });
      return;
    }

    // Enemy present near click → attack move.
    let enemyNear = false;
    for (const u of s.units) {
      if (!u.dead && u.player === 1 && dist(u.pos, world) < 3) {
        enemyNear = true;
        break;
      }
    }
    if (!enemyNear) {
      for (const b of s.buildings) {
        if (!b.dead && b.player === 1 && dist(b.pos, world) < Math.max(...b.def.footprint) / 2 + 1.5) {
          enemyNear = true;
          break;
        }
      }
    }
    this.sim.enqueue({ kind: 'directOrder', player: 0, unitIds: units.map((u) => u.id), dest: world, attackMove: enemyNear });
  }

  prune(): void {
    let changed = false;
    for (const id of this.selected) {
      const e = this.sim.state.entities.get(id);
      if (!e || e.dead) {
        this.selected.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.overlay.selectedIds = this.selected;
      this.onChange?.();
    }
  }
}

import * as THREE from 'three';
import { lerp } from '@/core/mathUtils';
import type { MatchState } from '@/sim/MatchState';
import { Building, Unit } from '@/sim/entities/Entity';
import type { DisplayOptions } from '@/data/types';

/**
 * Transparent 2D canvas over the 3D view: health bars, selection rings, and
 * drag-select rectangle. One clear + batched draws per frame — far cheaper
 * than managing hundreds of sprite meshes.
 */
export class OverlayCanvas {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: MatchState;
  private camera: THREE.PerspectiveCamera;
  private v = new THREE.Vector3();
  selectedIds = new Set<number>();
  dragRect: { x1: number; y1: number; x2: number; y2: number } | null = null;
  visibleFilter: ((unit: Unit) => boolean) | null = null;

  constructor(container: HTMLElement, state: MatchState, camera: THREE.PerspectiveCamera) {
    this.state = state;
    this.camera = camera;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
    container.append(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  private project(x: number, y: number, z: number): { sx: number; sy: number; visible: boolean } {
    this.v.set(x, y, z).project(this.camera);
    return {
      sx: ((this.v.x + 1) / 2) * this.canvas.width,
      sy: ((1 - this.v.y) / 2) * this.canvas.height,
      visible: this.v.z < 1,
    };
  }

  update(alpha: number, display: DisplayOptions): void {
    const w = this.canvas.parentElement?.clientWidth ?? 1;
    const h = this.canvas.parentElement?.clientHeight ?? 1;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const mode = display.healthBars;

    // Unit health bars + selection rings.
    for (const u of this.state.units) {
      if (u.dead) continue;
      if (this.visibleFilter && !this.visibleFilter(u)) continue;
      const selected = this.selectedIds.has(u.id);
      const damaged = u.hp < u.maxHp;
      const showBar = mode === 'always' || (mode === 'damaged' && damaged) || (mode === 'selected' && selected) || selected;
      if (!showBar && !selected) continue;

      const x = lerp(u.prevPos.x, u.pos.x, alpha);
      const z = lerp(u.prevPos.y, u.pos.y, alpha);

      if (selected) {
        const ground = this.project(x, 0.05, z);
        if (ground.visible) {
          // Double ring reads as a proper selection decal.
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(ground.sx, ground.sy, 14, 7, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = u.player === 0 ? '#f0d688' : '#e07a6a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(ground.sx, ground.sy, 14, 7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (showBar) {
        // Wall-mounted archers carry their bar above the battlements.
        const barH = u.garrisonedIn !== null ? 4.4 : 1.9;
        const p = this.project(x, barH, z);
        if (!p.visible) continue;
        const frac = Math.max(0, u.hp / u.maxHp);
        const bw = 22;
        ctx.fillStyle = 'rgba(10,8,4,0.75)';
        ctx.fillRect(p.sx - bw / 2 - 1, p.sy - 1, bw + 2, 6);
        ctx.fillStyle = u.player === 0 ? (frac > 0.5 ? '#5ad45a' : frac > 0.25 ? '#e8c84a' : '#e85a4a') : '#e05a4a';
        ctx.fillRect(p.sx - bw / 2, p.sy, bw * frac, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(p.sx - bw / 2, p.sy, bw * frac, 1.5);
      }
    }

    // Building health bars (damaged or under construction).
    for (const b of this.state.buildings) {
      if (b.dead) continue;
      const damaged = b.hp < b.maxHp;
      const selected = this.selectedIds.has(b.id);
      if (!damaged && !b.underConstruction && !selected) continue;
      const height = b.def.footprint[1] + 2.2;
      const p = this.project(b.pos.x, height, b.pos.y);
      if (!p.visible) continue;
      const bw = 34;
      if (selected) {
        ctx.strokeStyle = '#e8d9b0';
        ctx.strokeRect(p.sx - bw / 2 - 2, p.sy - 2, bw + 4, 9);
      }
      const frac = b.underConstruction ? b.progress : Math.max(0, b.hp / b.maxHp);
      ctx.fillStyle = 'rgba(10,8,4,0.75)';
      ctx.fillRect(p.sx - bw / 2 - 1, p.sy - 1, bw + 2, 7);
      ctx.fillStyle = b.underConstruction ? '#4a9ae8' : b.player === 0 ? '#5ad45a' : '#e05a4a';
      ctx.fillRect(p.sx - bw / 2, p.sy, bw * frac, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(p.sx - bw / 2, p.sy, bw * frac, 1.5);
    }

    // Drag-select rectangle.
    if (this.dragRect) {
      const { x1, y1, x2, y2 } = this.dragRect;
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.setLineDash([]);
    }
  }

  /** Screen position of a world point (for selection hit tests). */
  worldToScreen(x: number, y: number, z: number): { sx: number; sy: number } {
    const p = this.project(x, y, z);
    return { sx: p.sx, sy: p.sy };
  }

  dispose(): void {
    this.canvas.remove();
  }
}

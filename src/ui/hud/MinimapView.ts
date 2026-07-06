import type { MatchState } from '@/sim/MatchState';
import type { Vec2 } from '@/core/mathUtils';
import type { Biome } from '@/data/types';

const BIOME_BG: Record<Biome, string> = {
  grass: '#3d5a28',
  desert: '#a08650',
  savanna: '#7a7038',
  mountain: '#565c4e',
};

const SIZE = 190;

/**
 * Canvas-2D minimap: terrain, resources, buildings, units, flags, camera
 * viewport. Click (or drag) moves the camera; respects fog when provided.
 */
export class MinimapView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: MatchState;
  private scaleX: number;
  private scaleY: number;
  /** 0 = hidden by fog. Set by fog system; null = everything visible. */
  fogQuery: ((pos: Vec2, player: number) => number) | null = null;

  constructor(state: MatchState, onNavigate: (world: Vec2) => void) {
    this.state = state;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap';
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d')!;
    this.scaleX = SIZE / state.map.worldSize[0];
    this.scaleY = SIZE / state.map.worldSize[1];

    const navigate = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const wx = ((e.clientX - rect.left) / rect.width) * this.state.map.worldSize[0];
      const wy = ((e.clientY - rect.top) / rect.height) * this.state.map.worldSize[1];
      onNavigate({ x: wx, y: wy });
    };
    let dragging = false;
    this.canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      navigate(e);
    });
    window.addEventListener('pointermove', (e) => dragging && navigate(e));
    window.addEventListener('pointerup', () => (dragging = false));
  }

  update(cameraTarget: { x: number; z: number }, zoom: number): void {
    const ctx = this.ctx;
    const s = this.state;
    ctx.fillStyle = BIOME_BG[s.map.terrain.biome];
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Blockers.
    ctx.fillStyle = 'rgba(30,30,30,0.5)';
    for (const b of s.map.blockers ?? []) {
      ctx.beginPath();
      ctx.arc(b.pos.x * this.scaleX, b.pos.y * this.scaleY, b.radius * this.scaleX, 0, Math.PI * 2);
      ctx.fill();
    }

    // Resource nodes.
    for (const node of s.nodes) {
      if (node.dead) continue;
      ctx.fillStyle =
        node.resource === 'gold' ? '#d4af37' : node.resource === 'stone' ? '#b0aca2' : node.resource === 'wood' ? '#2a4a1a' : '#7ac24a';
      ctx.fillRect(node.pos.x * this.scaleX - 1.5, node.pos.y * this.scaleY - 1.5, 3, 3);
    }

    // Fog overlay drawn under entities of enemy; entities filtered below.
    const fog = this.fogQuery;

    // Buildings.
    for (const b of s.buildings) {
      if (b.dead) continue;
      if (b.player !== 0 && fog && fog(b.pos, 0) === 0) continue;
      const color = s.players[b.player]?.faction.colorPrimary ?? 0x888888;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      const size = Math.max(3, b.def.footprint[0] * this.scaleX);
      ctx.fillRect(b.pos.x * this.scaleX - size / 2, b.pos.y * this.scaleY - size / 2, size, size);
    }

    // Units.
    for (const u of s.units) {
      if (u.dead) continue;
      if (u.player !== 0 && fog && fog(u.pos, 0) !== 2) continue;
      const color = s.players[u.player]?.faction.colorPrimary ?? 0x888888;
      ctx.fillStyle = u.player === 0 ? '#e8e8e8' : `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(u.pos.x * this.scaleX - 1, u.pos.y * this.scaleY - 1, 2, 2);
    }

    // Flags.
    for (const f of s.flags) {
      if (f.dead || f.player !== 0) continue;
      ctx.fillStyle = f.flagType === 'defend' ? '#4e9adb' : '#e84a3a';
      ctx.beginPath();
      ctx.moveTo(f.pos.x * this.scaleX, f.pos.y * this.scaleY - 4);
      ctx.lineTo(f.pos.x * this.scaleX + 4, f.pos.y * this.scaleY - 1);
      ctx.lineTo(f.pos.x * this.scaleX, f.pos.y * this.scaleY + 2);
      ctx.fill();
    }

    // Fog shading.
    if (fog) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const step = 4;
      for (let py = 0; py < SIZE; py += step) {
        for (let px = 0; px < SIZE; px += step) {
          const v = fog({ x: px / this.scaleX, y: py / this.scaleY }, 0);
          if (v === 0) {
            ctx.fillRect(px, py, step, step);
          } else if (v === 1) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(px, py, step, step);
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
          }
        }
      }
    }

    // Camera viewport rectangle (approximate).
    ctx.strokeStyle = '#e8d9b0';
    ctx.lineWidth = 1;
    const vw = zoom * 1.4 * this.scaleX;
    const vh = zoom * 0.9 * this.scaleY;
    ctx.strokeRect(cameraTarget.x * this.scaleX - vw / 2, cameraTarget.z * this.scaleY - vh / 2, vw, vh);
  }
}

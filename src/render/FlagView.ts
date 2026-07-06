import * as THREE from 'three';
import type { MatchState } from '@/sim/MatchState';
import { box, cylinder, group } from './meshes/primitives';

const FLAG_COLORS: Record<string, number> = {
  march: 0xe8d9b0,
  assault: 0xc23b2e,
  siege: 0x8a6a3a,
  rally: 0x4e9a3d,
  harass: 0xe8a33d,
  defend: 0x3d6f9a,
};

/** Renders the player's command flags as waving banners with order numbers. */
export class FlagView {
  readonly root = new THREE.Group();
  private tracked = new Map<number, THREE.Group>();
  private state: MatchState;

  constructor(state: MatchState) {
    this.state = state;
  }

  update(timeMs: number): void {
    const seen = new Set<number>();
    for (const f of this.state.flags) {
      if (f.dead || f.player !== 0) continue; // enemy flags are invisible
      seen.add(f.id);
      let g = this.tracked.get(f.id);
      if (!g) {
        const color = FLAG_COLORS[f.flagType] ?? 0xffffff;
        g = group(
          cylinder(0.06, 0.08, 3.2, 0x5a4426, 0, 1.6, 0, 5),
          box(0.06, 0.7, 1.1, color, 0, 2.7, 0.58),
          cylinder(0.5, 0.6, 0.15, 0x3a2c18, 0, 0.07, 0, 8),
        );
        g.position.set(f.pos.x, 0, f.pos.y);
        this.root.add(g);
        this.tracked.set(f.id, g);
      }
      // Gentle wave.
      g.rotation.y = Math.sin(timeMs * 0.0012 + f.id) * 0.15;
      g.position.set(f.pos.x, 0, f.pos.y);
    }
    for (const [id, g] of this.tracked) {
      if (!seen.has(id)) {
        g.removeFromParent();
        this.tracked.delete(id);
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}

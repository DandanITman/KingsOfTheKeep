import { el } from '@/ui/components/dom';
import type { EventBus, AlertKind } from '@/core/EventBus';
import type { Vec2 } from '@/core/mathUtils';

const DANGER: AlertKind[] = [
  'fortressUnderAttack',
  'civiliansUnderAttack',
  'unitsUnderAttack',
  'enemyAttacking',
  'wallBreached',
  'siegeDetected',
  'waveIncoming',
  'heroFallen',
];

/** Right-side alert feed; clicking an alert jumps the camera to it. */
export class AlertFeed {
  readonly root: HTMLElement;
  private lastByKind = new Map<string, number>();

  constructor(bus: EventBus, onJump: (pos: Vec2) => void) {
    this.root = el('div', { className: 'alert-feed' });
    bus.on('alert', ({ kind, message, pos, player }) => {
      if (player !== 0) return;
      // Throttle identical alert kinds (6 s).
      const now = performance.now();
      const last = this.lastByKind.get(kind) ?? 0;
      if (now - last < 6000) return;
      this.lastByKind.set(kind, now);

      const item = el('div', { className: `alert-item${DANGER.includes(kind) ? ' danger' : ''}`, text: message });
      if (pos) item.addEventListener('click', () => onJump(pos));
      this.root.prepend(item);
      while (this.root.children.length > 5) this.root.lastChild?.remove();
      window.setTimeout(() => {
        item.style.transition = 'opacity 0.6s';
        item.style.opacity = '0';
        window.setTimeout(() => item.remove(), 700);
      }, 7000);
    });
  }
}

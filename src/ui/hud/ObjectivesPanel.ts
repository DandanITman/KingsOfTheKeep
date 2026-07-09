import { el } from '@/ui/components/dom';
import type { MatchState } from '@/sim/MatchState';
import { objectiveStatus } from '@/sim/systems/VictorySystem';

/** Right-side objectives readout for the active victory mode (GDD §38.1). */
export class ObjectivesPanel {
  readonly root: HTMLElement;
  private state: MatchState;
  private lastUpdate = 0;

  constructor(state: MatchState) {
    this.state = state;
    this.root = el('div', { className: 'panel objectives-panel' });
    this.root.style.cssText += 'padding:8px 12px;font-size:12px;';
  }

  update(): void {
    const now = performance.now();
    if (now - this.lastUpdate < 1000) return;
    this.lastUpdate = now;
    const items = objectiveStatus(this.state);
    this.root.innerHTML = '';
    this.root.append(el('div', { className: 'objectives-title', text: 'Objective' }));
    for (const item of items) {
      this.root.append(el('div', { className: 'objective-label', text: item.label }));
      const bar = el('div');
      bar.className = 'objective-bar';
      const fill = el('div');
      fill.className = 'objective-fill';
      fill.style.width = `${Math.min(100, Math.max(0, item.progress * 100))}%`;
      bar.append(fill);
      this.root.append(bar, el('div', { className: 'objective-detail', text: item.detail }));
    }
  }
}

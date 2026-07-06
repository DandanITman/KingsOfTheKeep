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
    this.root.style.cssText +=
      'position:absolute;right:12px;top:12px;width:230px;padding:8px 12px;font-size:12px;';
  }

  update(): void {
    const now = performance.now();
    if (now - this.lastUpdate < 1000) return;
    this.lastUpdate = now;
    const items = objectiveStatus(this.state);
    this.root.innerHTML = '';
    for (const item of items) {
      this.root.append(el('div', { html: `<b style="color:var(--gold)">${item.label}</b>` }));
      const bar = el('div');
      bar.style.cssText = 'height:5px;background:#111;border-radius:3px;margin:4px 0;overflow:hidden;';
      const fill = el('div');
      fill.style.cssText = `height:100%;width:${Math.min(100, Math.max(0, item.progress * 100))}%;background:var(--gold-dim);`;
      bar.append(fill);
      this.root.append(bar, el('div', { text: item.detail }));
    }
  }
}

import { el } from '@/ui/components/dom';
import { GATHER_RESOURCES, type GatherResource } from '@/data/types';
import type { MatchState } from '@/sim/MatchState';

const ICONS: Record<GatherResource, string> = { food: '🍖', wood: '🪵', stone: '🪨', gold: '🪙' };

/**
 * Worker allocation sliders (GDD §16.3). Values are relative weights shown
 * as percentages; the allocation system normalizes them.
 */
export class EconomyPanel {
  readonly root: HTMLElement;
  private state: MatchState;
  private countEls = new Map<GatherResource, HTMLElement>();
  private idleEl: HTMLElement;
  private collapsed = true;
  private body: HTMLElement;

  constructor(state: MatchState, onRatiosChange: (ratios: Record<GatherResource, number>) => void) {
    this.state = state;
    this.root = el('div', { className: 'panel eco-panel' });
    this.root.style.cssText += 'padding:8px 12px;min-width:230px;';

    const header = el('div', { text: '⚒ Economy' });
    header.style.cssText = 'cursor:pointer;font-family:Georgia,serif;color:var(--gold);font-size:15px;display:flex;justify-content:space-between;';
    this.idleEl = el('span', { text: '' });
    this.idleEl.style.cssText = 'font-size:12px;color:#a89468;';
    header.append(this.idleEl);
    header.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.body.style.display = this.collapsed ? 'none' : '';
    });

    this.body = el('div');
    this.body.style.display = 'none';

    const ratios = { ...state.players[0].workerRatios };
    for (const res of GATHER_RESOURCES) {
      const row = el('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0;';
      const icon = el('span', { text: ICONS[res] });
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '5';
      input.value = String(ratios[res]);
      input.style.flex = '1';
      const pct = el('span', { className: 'slider-value', text: `${ratios[res]}%` });
      const count = el('span', { text: '0' });
      count.style.cssText = 'width:26px;text-align:right;font-size:12px;color:#a89468;';
      this.countEls.set(res, count);
      input.addEventListener('input', () => {
        ratios[res] = Number(input.value);
        pct.textContent = `${ratios[res]}%`;
        onRatiosChange({ ...ratios });
      });
      row.append(icon, input, pct, count);
      this.body.append(row);
    }

    this.root.append(header, this.body);
  }

  update(): void {
    const counts: Record<GatherResource, number> = { food: 0, wood: 0, stone: 0, gold: 0 };
    let idle = 0;
    for (const u of this.state.units) {
      if (u.dead || u.player !== 0 || u.def.role !== 'worker') continue;
      if (u.task.kind === 'gather') {
        const node = this.state.node(u.task.nodeId);
        const res = node?.resource ?? u.carrying?.resource;
        if (res) counts[res]++;
      } else if (u.task.kind === 'idle') {
        idle++;
      }
    }
    for (const res of GATHER_RESOURCES) {
      const elx = this.countEls.get(res);
      if (elx) elx.textContent = String(counts[res]);
    }
    this.idleEl.textContent = idle > 0 ? `${idle} idle` : '';
  }
}

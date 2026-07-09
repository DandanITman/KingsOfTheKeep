import { el } from '@/ui/components/dom';
import { GATHER_RESOURCES, type GatherResource } from '@/data/types';
import { icon } from '@/ui/icons';
import type { MatchState } from '@/sim/MatchState';

const ICON_KEYS: Record<GatherResource, string> = { food: 'food', wood: 'wood', stone: 'stone', gold: 'goldRes' };

/**
 * Worker allocation sliders (GDD §16.3). The four shares always sum to 100%:
 * moving one slider proportionally rebalances the other three. The
 * allocation system reassigns idle/surplus workers to match every few
 * seconds.
 */
export class EconomyPanel {
  readonly root: HTMLElement;
  private state: MatchState;
  private countEls = new Map<GatherResource, HTMLElement>();
  private inputs = new Map<GatherResource, HTMLInputElement>();
  private pctEls = new Map<GatherResource, HTMLElement>();
  private ratios: Record<GatherResource, number>;
  private idleEl: HTMLElement;
  private collapsed = true;
  private body: HTMLElement;

  constructor(state: MatchState, onRatiosChange: (ratios: Record<GatherResource, number>) => void) {
    this.state = state;
    this.root = el('div', { className: 'panel eco-panel' });
    this.root.style.cssText += 'padding:8px 12px;min-width:230px;';

    const header = el('div', { html: `${icon('hammer')} Economy` });
    header.style.cssText = 'cursor:pointer;font-family:Georgia,serif;color:var(--gold);font-size:15px;display:flex;justify-content:space-between;';
    this.idleEl = el('span', { text: '' });
    this.idleEl.style.cssText = 'font-size:12px;color:var(--muted);';
    header.append(this.idleEl);
    header.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      this.body.style.display = this.collapsed ? 'none' : '';
    });

    this.body = el('div');
    this.body.style.display = 'none';

    this.ratios = this.normalize({ ...state.players[0].workerRatios });
    for (const res of GATHER_RESOURCES) {
      const row = el('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:3px 0;';
      const iconEl = el('span', { className: 'eco-icon', html: icon(ICON_KEYS[res]) });
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.value = String(this.ratios[res]);
      input.style.flex = '1';
      const pct = el('span', { className: 'slider-value', text: `${this.ratios[res]}%` });
      const count = el('span', { text: '0' });
      count.style.cssText = 'width:26px;text-align:right;font-size:12px;color:var(--muted);';
      this.countEls.set(res, count);
      this.inputs.set(res, input);
      this.pctEls.set(res, pct);
      input.addEventListener('input', () => {
        this.rebalance(res, Number(input.value));
        onRatiosChange({ ...this.ratios });
      });
      row.append(iconEl, input, pct, count);
      this.body.append(row);
    }

    const hint = el('div', { text: 'Shares of your worker force — always totals 100%.' });
    hint.style.cssText = 'font-size:10px;color:var(--muted);margin-top:3px;';
    this.body.append(hint);

    this.root.append(header, this.body);
  }

  /** Scale arbitrary weights into integer percentages summing to 100. */
  private normalize(w: Record<GatherResource, number>): Record<GatherResource, number> {
    const total = GATHER_RESOURCES.reduce((s, r) => s + Math.max(0, w[r] ?? 0), 0);
    const out = { food: 25, wood: 25, stone: 25, gold: 25 } as Record<GatherResource, number>;
    if (total <= 0) return out;
    let acc = 0;
    for (const r of GATHER_RESOURCES) {
      out[r] = Math.round((Math.max(0, w[r] ?? 0) / total) * 100);
      acc += out[r];
    }
    // Absorb rounding drift into the largest share.
    const largest = [...GATHER_RESOURCES].sort((a, b) => out[b] - out[a])[0];
    out[largest] += 100 - acc;
    return out;
  }

  /** Set `changed` to `value` and squeeze the other three proportionally. */
  private rebalance(changed: GatherResource, value: number): void {
    value = Math.max(0, Math.min(100, Math.round(value)));
    const others = GATHER_RESOURCES.filter((r) => r !== changed);
    const otherTotal = others.reduce((s, r) => s + this.ratios[r], 0);
    const remaining = 100 - value;
    let acc = 0;
    for (const r of others) {
      const share = otherTotal > 0 ? this.ratios[r] / otherTotal : 1 / others.length;
      this.ratios[r] = Math.round(remaining * share);
      acc += this.ratios[r];
    }
    // Absorb rounding drift into the biggest other share.
    const biggest = [...others].sort((a, b) => this.ratios[b] - this.ratios[a])[0];
    this.ratios[biggest] += remaining - acc;
    this.ratios[changed] = value;
    this.syncSliders();
  }

  private syncSliders(): void {
    for (const res of GATHER_RESOURCES) {
      this.inputs.get(res)!.value = String(this.ratios[res]);
      this.pctEls.get(res)!.textContent = `${this.ratios[res]}%`;
    }
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

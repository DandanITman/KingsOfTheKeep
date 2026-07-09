import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import type { MatchState } from '@/sim/MatchState';
import type { Resource } from '@/data/types';

const RES_ICON_KEYS: Record<string, string> = {
  food: 'food',
  wood: 'wood',
  stone: 'stone',
  gold: 'goldRes',
  influence: 'influence',
};

const RATE_RESOURCES: Resource[] = ['food', 'wood', 'stone', 'gold', 'influence'];
/** Rolling window (seconds) for the displayed income rate. */
const RATE_WINDOW_SECS = 20;

/** Top resource bar: resources with /min income rates, command, timer, pause. */
export class TopBar {
  readonly root: HTMLElement;
  private values = new Map<string, HTMLElement>();
  private rates = new Map<string, HTMLElement>();
  private timerEl: HTMLElement;
  private state: MatchState;
  private showInfluence = false;
  private influenceRow: HTMLElement;
  /** Once-a-second samples of the cumulative income tally. */
  private samples: { t: number; tally: Partial<Record<Resource, number>> }[] = [];
  private lastSampleT = -1;

  constructor(state: MatchState, onPause: () => void) {
    this.state = state;
    this.root = el('div', { className: 'hud-top' });

    for (const res of ['food', 'wood', 'stone', 'gold'] as const) {
      this.root.append(this.makeRes(res, RES_ICON_KEYS[res], true));
    }
    this.influenceRow = this.makeRes('influence', RES_ICON_KEYS.influence, true);
    this.influenceRow.style.display = 'none';
    this.root.append(this.influenceRow);

    this.root.append(this.makeRes('command', 'command', false));

    this.timerEl = el('span', { className: 'hud-timer', text: '0:00' });
    this.root.append(this.timerEl);

    const diff = el('span', { className: 'hud-difficulty', text: state.setup.botDifficulty.toUpperCase() });
    this.root.append(diff);

    const pause = el('button', { className: 'btn small', text: 'II' });
    pause.title = 'Pause / Menu (Esc)';
    pause.addEventListener('click', onPause);
    this.root.append(pause);
  }

  private makeRes(key: string, iconKey: string, withRate: boolean): HTMLElement {
    const value = el('span', { className: 'res-value', text: '0' });
    this.values.set(key, value);
    const column = el('div', { className: 'res-col' }, [value]);
    if (withRate) {
      const rate = el('span', { className: 'res-rate', text: '' });
      this.rates.set(key, rate);
      column.append(rate);
    }
    return el('div', { className: 'res' }, [
      el('span', { className: 'icon', html: icon(iconKey) }),
      column,
    ]);
  }

  /** Income over the rolling sample window, per minute. */
  private ratePerMin(res: Resource): number | null {
    if (this.samples.length < 2) return null;
    const now = this.samples[this.samples.length - 1];
    const past = this.samples[0];
    const dt = now.t - past.t;
    if (dt < 3) return null;
    const gained = (now.tally[res] ?? 0) - (past.tally[res] ?? 0);
    return (gained / dt) * 60;
  }

  update(): void {
    const p = this.state.players[0];

    // Sample cumulative income once per sim second.
    const t = Math.floor(this.state.timeSecs);
    if (t !== this.lastSampleT) {
      this.lastSampleT = t;
      this.samples.push({ t: this.state.timeSecs, tally: { ...(this.state.incomeTally[0] ?? {}) } });
      while (this.samples.length > RATE_WINDOW_SECS) this.samples.shift();
    }

    for (const res of RATE_RESOURCES) {
      const elx = this.values.get(res);
      if (elx) elx.textContent = String(Math.floor(p.resources[res]));
      const rateEl = this.rates.get(res);
      if (rateEl) {
        const rate = this.ratePerMin(res);
        rateEl.textContent = rate !== null && rate >= 0.5 ? `+${Math.round(rate)} /min` : '';
      }
    }
    if (!this.showInfluence && p.resources.influence > 0) {
      this.showInfluence = true;
      this.influenceRow.style.display = '';
    }
    const cmd = this.values.get('command');
    if (cmd) {
      cmd.textContent = `${p.commandUsed}/${p.commandCap}`;
      cmd.parentElement?.parentElement?.classList.toggle('low', p.commandUsed >= p.commandCap);
    }
    const mins = Math.floor(this.state.timeSecs / 60);
    const secs = Math.floor(this.state.timeSecs % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

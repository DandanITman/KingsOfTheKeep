import { el } from '@/ui/components/dom';
import { icon } from '@/ui/icons';
import type { MatchState } from '@/sim/MatchState';

const RES_ICON_KEYS: Record<string, string> = {
  food: 'food',
  wood: 'wood',
  stone: 'stone',
  gold: 'goldRes',
  influence: 'influence',
};

/** Top resource bar: resources, command, match timer, difficulty, pause. */
export class TopBar {
  readonly root: HTMLElement;
  private values = new Map<string, HTMLElement>();
  private timerEl: HTMLElement;
  private state: MatchState;
  private showInfluence = false;
  private influenceRow: HTMLElement;

  constructor(state: MatchState, onPause: () => void) {
    this.state = state;
    this.root = el('div', { className: 'hud-top' });

    for (const res of ['food', 'wood', 'stone', 'gold'] as const) {
      this.root.append(this.makeRes(res));
    }
    this.influenceRow = this.makeRes('influence');
    this.influenceRow.style.display = 'none';
    this.root.append(this.influenceRow);

    this.root.append(this.makeRes('command', 'command'));

    this.timerEl = el('span', { className: 'hud-timer', text: '0:00' });
    this.root.append(this.timerEl);

    const diff = el('span', { className: 'hud-difficulty', text: state.setup.botDifficulty.toUpperCase() });
    diff.style.cssText = 'font-size:11px;color:#8a7a52;letter-spacing:1px;';
    this.root.append(diff);

    const pause = el('button', { className: 'btn small', text: 'II' });
    pause.title = 'Pause / Menu (Esc)';
    pause.addEventListener('click', onPause);
    this.root.append(pause);
  }

  private makeRes(key: string, iconKey = RES_ICON_KEYS[key] ?? key): HTMLElement {
    const value = el('span', { text: '0' });
    this.values.set(key, value);
    return el('div', { className: 'res' }, [
      el('span', { className: 'icon', html: icon(iconKey) }),
      value,
    ]);
  }

  update(): void {
    const p = this.state.players[0];
    for (const res of ['food', 'wood', 'stone', 'gold', 'influence'] as const) {
      const elx = this.values.get(res);
      if (elx) elx.textContent = String(Math.floor(p.resources[res]));
    }
    if (!this.showInfluence && p.resources.influence > 0) {
      this.showInfluence = true;
      this.influenceRow.style.display = '';
    }
    const cmd = this.values.get('command');
    if (cmd) {
      cmd.textContent = `${p.commandUsed}/${p.commandCap}`;
      cmd.parentElement?.classList.toggle('low', p.commandUsed >= p.commandCap);
    }
    const mins = Math.floor(this.state.timeSecs / 60);
    const secs = Math.floor(this.state.timeSecs % 60);
    this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

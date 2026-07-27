import type { Vec2 } from '@/core/mathUtils';
import type { MatchSim } from '@/sim/MatchSim';
import type { CameraRig } from '@/render/CameraRig';
import type { CardBar } from '@/ui/hud/CardBar';
import { CARD_HOTKEYS } from '@/ui/hud/CardBar';
import type { MatchInput } from './MatchInput';
import type { MatchSelection } from './MatchSelection';

/** How long two presses of the same group key count as a double-tap. */
const DOUBLE_TAP_MS = 400;

/**
 * The keyboard command layer: control groups, selection shortcuts, per-unit
 * stop/hold, card-bar slots, and macro stances.
 *
 * Lives in the app layer, not the sim — every action it performs goes through
 * `MatchSim.enqueue`, the same command seam the bot and the mouse use, so the
 * simulation stays DOM-free and nothing here can desync it.
 */
export class MatchHotkeys {
  private sim: MatchSim;
  private selection: MatchSelection;
  private rig: CameraRig;
  private cardBar: CardBar;
  private input: MatchInput;

  /** Control groups 1-9, each a set of entity ids. */
  private groups = new Map<number, number[]>();
  private lastGroupPress = { group: -1, time: 0 };
  /** Rotating cursor for idle-worker cycling. */
  private idleWorkerCursor = 0;

  private dispose_: () => void;

  constructor(opts: {
    sim: MatchSim;
    selection: MatchSelection;
    rig: CameraRig;
    cardBar: CardBar;
    input: MatchInput;
    /** Where the player's keep is, for the "jump home" key. */
    homePos: () => Vec2 | null;
  }) {
    this.sim = opts.sim;
    this.selection = opts.selection;
    this.rig = opts.rig;
    this.cardBar = opts.cardBar;
    this.input = opts.input;

    const onKey = (e: KeyboardEvent): void => {
      // Never steal keys from a text field (profile name, deck search, ...).
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.altKey || e.metaKey) return;
      if (this.handle(e, opts.homePos)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey);
    this.dispose_ = () => window.removeEventListener('keydown', onKey);
  }

  /** Returns true when the key was consumed. */
  private handle(e: KeyboardEvent, homePos: () => Vec2 | null): boolean {
    // --- Control groups: Ctrl+N assigns, N recalls, N-N centres. ------------
    const digit = /^Digit([1-9])$/.exec(e.code);
    if (digit) {
      const group = Number(digit[1]);
      if (e.ctrlKey) {
        const ids = [...this.selection.selected];
        if (ids.length > 0) this.groups.set(group, ids);
        else this.groups.delete(group);
        return true;
      }
      const ids = this.groups.get(group);
      if (!ids || ids.length === 0) return true; // consumed: empty group is a no-op, not a fallthrough
      this.selection.select(ids);
      const now = performance.now();
      const doubleTap = this.lastGroupPress.group === group && now - this.lastGroupPress.time < DOUBLE_TAP_MS;
      this.lastGroupPress = { group, time: now };
      if (doubleTap) {
        const centre = this.selection.centroid();
        if (centre) this.rig.jumpTo(centre);
      }
      return true;
    }

    // Ctrl+A: select the whole army (military only — workers stay put).
    if (e.ctrlKey && e.code === 'KeyA') {
      this.selection.select(this.selection.armyIds());
      return true;
    }
    // Any other Ctrl chord is not ours; let the browser have it.
    if (e.ctrlKey) return false;

    // --- Unit commands -----------------------------------------------------
    switch (e.code) {
      case 'KeyS': {
        const ids = this.selection.selectedUnits().map((u) => u.id);
        if (ids.length > 0) this.sim.enqueue({ kind: 'stopUnits', player: 0, unitIds: ids });
        return true;
      }
      case 'KeyH': {
        const ids = this.selection.selectedUnits().map((u) => u.id);
        if (ids.length > 0) this.sim.enqueue({ kind: 'holdPosition', player: 0, unitIds: ids });
        return true;
      }
      case 'Backquote': {
        // Jump to the keep without disturbing the selection.
        const home = homePos();
        if (home) this.rig.jumpTo(home);
        return true;
      }
      case 'Period':
      case 'Comma':
        return this.cycleIdleWorker(e.code === 'Comma' ? -1 : 1);
      default:
        break;
    }

    // --- Card bar ----------------------------------------------------------
    // Placement mode is cancelled first so pressing a second card key swaps
    // cards rather than stacking modes.
    const letter = /^Key([A-Z])$/.exec(e.code)?.[1];
    if (letter && CARD_HOTKEYS.includes(letter)) {
      if (this.input.mode.kind !== 'normal') this.input.setMode({ kind: 'normal' });
      return this.cardBar.activateHotkey(letter);
    }
    return false;
  }

  /** Select the next idle worker and centre on it. */
  private cycleIdleWorker(step: number): boolean {
    const idle = this.selection.idleWorkerIds();
    if (idle.length === 0) return true;
    this.idleWorkerCursor = (this.idleWorkerCursor + step + idle.length) % idle.length;
    const id = idle[this.idleWorkerCursor];
    this.selection.select([id]);
    const centre = this.selection.centroid();
    if (centre) this.rig.jumpTo(centre);
    return true;
  }

  /** Drop ids that died, so a group doesn't resurrect stale selections. */
  prune(): void {
    const s = this.sim.state;
    for (const [group, ids] of this.groups) {
      const alive = ids.filter((id) => !s.entities.get(id)?.dead && s.entities.has(id));
      if (alive.length === ids.length) continue;
      if (alive.length === 0) this.groups.delete(group);
      else this.groups.set(group, alive);
    }
  }

  dispose(): void {
    this.dispose_();
  }
}


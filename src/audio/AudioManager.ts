import { appBus, type EventBus } from '@/core/EventBus';
import { saveStore } from '@/core/save/SaveStore';
import { audioContext, beep, chord, horn, noise, sweep } from './procSounds';

/**
 * Central audio: UI sounds on the app bus + document clicks, match sounds on
 * the match bus, and a gentle generative music loop. All synthesized —
 * volumes follow the options panel live.
 */
export class AudioManager {
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private ui: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private matchUnsubs: (() => void)[] = [];
  private started = false;

  /** Audio contexts need a user gesture; call from the first interaction. */
  start(): void {
    if (this.started) return;
    const ac = audioContext();
    if (!ac) return;
    this.started = true;
    this.master = ac.createGain();
    this.master.connect(ac.destination);
    this.sfx = ac.createGain();
    this.sfx.connect(this.master);
    this.ui = ac.createGain();
    this.ui.connect(this.master);
    this.musicGain = ac.createGain();
    this.musicGain.connect(this.master);
    this.applyVolumes();

    // UI click/hover sounds on every button.
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, .card-tile, .profile-chip')) {
        beep(this.ui!, 660, 0.06, 'square', 0.05);
      }
    });

    // Mute when unfocused.
    document.addEventListener('visibilitychange', () => this.applyVolumes());
    window.addEventListener('blur', () => this.applyVolumes());
    window.addEventListener('focus', () => this.applyVolumes());

    this.startMusic();
  }

  applyVolumes(): void {
    if (!this.master) return;
    const o = saveStore.data.options.audio;
    const hidden = (document.hidden || !document.hasFocus()) && o.muteUnfocused;
    this.master.gain.value = hidden ? 0 : o.master;
    if (this.sfx) this.sfx.gain.value = o.sfx;
    if (this.ui) this.ui.gain.value = o.ui;
    if (this.musicGain) this.musicGain.gain.value = o.music * 0.5;
  }

  /** Gentle generative war-table music: slow pentatonic plucks over a drone. */
  private startMusic(): void {
    const ac = audioContext();
    if (!ac || !this.musicGain || this.musicTimer !== null) return;
    const scale = [196, 220, 261.6, 293.7, 349.2, 392]; // G pentatonic-ish
    let step = 0;
    const playBar = () => {
      if (!this.musicGain) return;
      // Drone every 4 bars.
      if (step % 4 === 0) {
        chord(this.musicGain, [98, 147], 3.4, 0.05, 'sine');
      }
      // 1–2 melodic plucks per bar.
      const notes = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < notes; i++) {
        const freq = scale[Math.floor(Math.random() * scale.length)];
        window.setTimeout(() => {
          if (this.musicGain) beep(this.musicGain, freq, 1.2, 'triangle', 0.05, Math.random() * 8 - 4);
        }, i * 900 + Math.random() * 300);
      }
      step++;
    };
    playBar();
    this.musicTimer = window.setInterval(playBar, 2400);
  }

  /** Subscribe to a match's event bus for battle sounds. */
  attachMatch(bus: EventBus): void {
    this.detachMatch();
    if (!this.sfx) return;
    const out = this.sfx;
    this.matchUnsubs.push(
      bus.on('cardPlayed', () => beep(out, 880, 0.1, 'triangle', 0.08)),
      bus.on('buildingPlaced', () => noise(out, 0.15, 0.1, 500)),
      bus.on('buildingCompleted', () => chord(out, [523, 659], 0.5, 0.08)),
      bus.on('unitSpawned', () => beep(out, 440, 0.08, 'square', 0.04)),
      bus.on('unitDied', () => sweep(out, 300, 80, 0.25, 'sawtooth', 0.04)),
      bus.on('buildingDestroyed', () => noise(out, 0.6, 0.16, 300)),
      bus.on('projectileHit', () => noise(out, 0.2, 0.08, 800)),
      bus.on('attackCommand', () => horn(out, 220)),
      bus.on('defendCommand', () => horn(out, 165)),
      bus.on('abilityCast', () => sweep(out, 400, 1200, 0.4, 'sine', 0.08)),
      bus.on('tierReached', () => chord(out, [392, 494, 587], 1.0, 0.1)),
      bus.on('waveStarted', () => horn(out, 180)),
      bus.on('alert', ({ kind }) => {
        if (kind === 'fortressUnderAttack' || kind === 'wallBreached') beep(out, 1000, 0.35, 'square', 0.07);
      }),
      bus.on('matchEnded', ({ winner }) => {
        if (winner === 0) chord(out, [392, 494, 587, 784], 2.0, 0.16);
        else chord(out, [220, 262, 311], 2.0, 0.14);
      }),
    );
  }

  detachMatch(): void {
    this.matchUnsubs.forEach((u) => u());
    this.matchUnsubs = [];
  }
}

export const audio = new AudioManager();
void appBus;

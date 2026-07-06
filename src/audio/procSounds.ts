/**
 * WebAudio-synthesized sound effects — no asset files. Each function plays a
 * short procedural sound into the shared context through a gain node.
 */

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function envGain(ac: AudioContext, out: AudioNode, peak: number, attack: number, decay: number): GainNode {
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  g.connect(out);
  return g;
}

export function beep(out: AudioNode, freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.15, detune = 0): void {
  const ac = audioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const g = envGain(ac, out, gain, 0.005, dur);
  osc.connect(g);
  osc.start();
  osc.stop(ac.currentTime + dur + 0.05);
}

export function sweep(out: AudioNode, from: number, to: number, dur: number, type: OscillatorType = 'sawtooth', gain = 0.1): void {
  const ac = audioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), ac.currentTime + dur);
  const g = envGain(ac, out, gain, 0.01, dur);
  osc.connect(g);
  osc.start();
  osc.stop(ac.currentTime + dur + 0.05);
}

export function noise(out: AudioNode, dur: number, gain = 0.12, lowpass = 1200): void {
  const ac = audioContext();
  if (!ac) return;
  const len = Math.ceil(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = envGain(ac, out, gain, 0.003, dur);
  src.connect(filter).connect(g);
  src.start();
}

export function chord(out: AudioNode, freqs: number[], dur: number, gain = 0.08, type: OscillatorType = 'triangle'): void {
  for (const f of freqs) beep(out, f, dur, type, gain / freqs.length + 0.02);
}

/** Horn blast (attack/defend commands). */
export function horn(out: AudioNode, base: number): void {
  const ac = audioContext();
  if (!ac) return;
  for (const mult of [1, 1.5]) {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * mult * 0.94, ac.currentTime);
    osc.frequency.linearRampToValueAtTime(base * mult, ac.currentTime + 0.1);
    const g = envGain(ac, out, 0.07, 0.06, 0.7);
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    osc.connect(filter).connect(g);
    osc.start();
    osc.stop(ac.currentTime + 0.9);
  }
}

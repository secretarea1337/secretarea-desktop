// Web Audio API synthesizer for SecretArea Custom Cursor click & hover sound effects.
// Runs 100% client-side with zero external audio assets so it works seamlessly offline.

let cursorAudioCtx: AudioContext | null = null;
let cursorMasterVolume = 0.7;
let lastCursorHoverTime = 0;
let lastWheelTickTime = 0;

export type CursorSoundVariant = 'primary' | 'soft' | 'back' | 'disabled';

export function setUiCursorVolume(volume01: number): void {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(volume01) ? volume01 : 0.7));
  cursorMasterVolume = clamped;

  if (cursorAudioCtx && cursorAudioCtx.state === 'suspended') {
    void cursorAudioCtx.resume().catch(() => {
      // Ignore autoplay lock until user gesture
    });
  }
}

function getCursorAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!cursorAudioCtx) {
    cursorAudioCtx = new Ctx();
  }
  if (cursorAudioCtx.state === 'suspended') {
    void cursorAudioCtx.resume().catch(() => {
      // Ignore autoplay lock until user gesture
    });
  }
  return cursorAudioCtx;
}

/** Crisp tactile click sound effect for the custom desktop cursor */
export function playCursorClickSound(variant: CursorSoundVariant = 'primary'): void {
  if (cursorMasterVolume <= 0.001) return;
  const ctx = getCursorAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const vol = Math.pow(cursorMasterVolume, 1.15);

    if (variant === 'soft') {
      // Ultra-light damped air/switch tap for general surface clicks
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.022);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.036 * vol, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.032);
      return;
    }

    if (variant === 'disabled') {
      // Subtle muted thud for disabled controls
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.055);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.045 * vol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
      return;
    }

    if (variant === 'back') {
      // Smooth descending release tick
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      harmonic.type = 'triangle';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(430, now + 0.055);

      harmonic.frequency.setValueAtTime(1110, now);
      harmonic.frequency.exponentialRampToValueAtTime(640, now + 0.045);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.055 * vol, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

      osc.connect(gain);
      harmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      harmonic.start(now);
      osc.stop(now + 0.08);
      harmonic.stop(now + 0.08);
      return;
    }

    // 'primary': crisp mechanical-crystal UI click (short percussive pop + bright chime tail)
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(1480, now);
    snapOsc.frequency.exponentialRampToValueAtTime(420, now + 0.018);

    snapGain.gain.setValueAtTime(0.0001, now);
    snapGain.gain.linearRampToValueAtTime(0.068 * vol, now + 0.002);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.025);

    const toneOsc = ctx.createOscillator();
    const toneGain = ctx.createGain();
    toneOsc.type = 'sine';
    toneOsc.frequency.setValueAtTime(880, now + 0.004);
    toneOsc.frequency.exponentialRampToValueAtTime(1240, now + 0.036);

    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.linearRampToValueAtTime(0.046 * vol, now + 0.007);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.068);

    toneOsc.connect(toneGain);
    toneGain.connect(ctx.destination);
    toneOsc.start(now);
    toneOsc.stop(now + 0.074);
  } catch {
    // Ignore audio context errors safely
  }
}

/** Airy subtle micro-tick when hovering interactive controls */
export function playCursorHoverSound(): void {
  if (cursorMasterVolume <= 0.001) return;
  const perfNow = performance.now();
  if (perfNow - lastCursorHoverTime < 75) return;
  lastCursorHoverTime = perfNow;

  const ctx = getCursorAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(840, now + 0.018);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.016 * cursorMasterVolume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Ignore audio errors safely
  }
}

/** Crisp peg tick as spin wheel spokes pass the top flapper */
export function playWheelTickSound(): void {
  if (cursorMasterVolume <= 0.001) return;
  const perfNow = performance.now();
  if (perfNow - lastWheelTickTime < 42) return;
  lastWheelTickTime = perfNow;

  const ctx = getCursorAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const vol = Math.pow(cursorMasterVolume, 1.15);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.016);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.048 * vol, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.026);
  } catch {
    // Ignore audio errors safely
  }
}

/** Uplifting 3-note chime when the Spin Wheel lands on a game */
export function playWheelWinSound(): void {
  if (cursorMasterVolume <= 0.001) return;
  const ctx = getCursorAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const vol = Math.pow(cursorMasterVolume, 1.15);
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.065;

      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime((idx === notes.length - 1 ? 0.07 : 0.048) * vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // Ignore audio errors safely
  }
}


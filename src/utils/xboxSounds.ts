// Web Audio API synthesizer for Xbox Series X|S & Xbox Nexus UI sound effects and ambient soundscape.
// Runs 100% client-side with zero external audio files so it works seamlessly offline.

let xboxAudioCtx: AudioContext | null = null;
let xboxReverbNode: ConvolverNode | null = null;
let xboxMasterGain: GainNode | null = null;
let xboxCleanupNodes: AudioNode[] = [];
let xboxChordTimer: number | null = null;
let xboxShimmerTimer: number | null = null;
let isXboxAmbientPlaying = false;
let lastXboxHoverTime = 0;
let xboxMasterVolume = 0.7;

const XBOX_AMBIENT_BASE_GAIN = 0.22;

export function setXboxVolume(volume01: number): void {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(volume01) ? volume01 : 0.7));
  xboxMasterVolume = clamped;

  if (xboxAudioCtx && xboxAudioCtx.state === 'suspended') {
    void xboxAudioCtx.resume().catch(() => {
      // ignore autoplay block
    });
  }

  if (xboxAudioCtx && xboxMasterGain && isXboxAmbientPlaying) {
    try {
      const now = xboxAudioCtx.currentTime;
      const targetGain = clamped <= 0.001 ? 0 : XBOX_AMBIENT_BASE_GAIN * Math.pow(clamped, 1.25);
      xboxMasterGain.gain.cancelScheduledValues(now);
      xboxMasterGain.gain.setValueAtTime(xboxMasterGain.gain.value, now);
      xboxMasterGain.gain.setTargetAtTime(targetGain, now, 0.03);
    } catch {
      // ignore volume ramp errors
    }
  }
}

function getXboxAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!xboxAudioCtx) {
    xboxAudioCtx = new Ctx();
  }
  if (xboxAudioCtx.state === 'suspended') {
    void xboxAudioCtx.resume().catch(() => {
      // Ignore autoplay blocks until user interaction
    });
  }
  return xboxAudioCtx;
}

/** Warm 2.2-second spatial hall impulse for Xbox dashboard ambience & boot chord */
function getXboxHallReverb(ctx: AudioContext): ConvolverNode | null {
  if (xboxReverbNode && xboxReverbNode.context === ctx) {
    return xboxReverbNode;
  }
  try {
    const duration = 2.2;
    const length = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, 3.0);
        const white = Math.random() * 2 - 1;
        lp = lp * 0.78 + white * 0.22;
        data[i] = lp * env * 0.48;
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    xboxReverbNode = convolver;
    return convolver;
  } catch {
    return null;
  }
}

interface XboxChord {
  root: number;
  padNotes: number[];
  shimmerNotes: number[];
}

// Warm emerald Xbox Nexus progression: Dmaj9 -> Bm9 -> Gmaj9 -> Asus4
const XBOX_AMBIENT_PROGRESSION: XboxChord[] = [
  {
    root: 73.42, // D2
    padNotes: [146.83, 220.0, 277.18, 329.63, 369.99], // D3 A3 C#4 E4 F#4
    shimmerNotes: [587.33, 739.99, 880.0, 1108.73],
  },
  {
    root: 61.74, // B1
    padNotes: [123.47, 185.0, 246.94, 277.18, 369.99], // B2 F#3 B3 C#4 F#4
    shimmerNotes: [493.88, 659.25, 739.99, 987.77],
  },
  {
    root: 98.0, // G2
    padNotes: [146.83, 196.0, 246.94, 293.66, 369.99], // D3 G3 B3 D4 F#4
    shimmerNotes: [587.33, 783.99, 987.77, 1174.66],
  },
  {
    root: 55.0, // A1
    padNotes: [110.0, 164.81, 220.0, 293.66, 329.63], // A2 E3 A3 D4 E4
    shimmerNotes: [440.0, 587.33, 659.25, 880.0],
  },
];

function triggerXboxPadChord(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode,
  chord: XboxChord,
  durationSec: number
): void {
  const now = ctx.currentTime;

  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(chord.root, now);

  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.linearRampToValueAtTime(0.24, now + 1.2);
  subGain.gain.setValueAtTime(0.21, now + durationSec - 1.3);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.6);

  subOsc.connect(subGain);
  subGain.connect(dryBus);
  subOsc.start(now);
  subOsc.stop(now + durationSec + 0.7);

  chord.padNotes.forEach((freq, idx) => {
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const voiceGain = ctx.createGain();

    oscA.type = idx % 2 === 0 ? 'triangle' : 'sine';
    oscB.type = 'sine';
    oscA.frequency.setValueAtTime(freq, now);
    oscB.frequency.setValueAtTime(freq, now);

    oscA.detune.setValueAtTime(-3.5 - idx * 0.6, now);
    oscB.detune.setValueAtTime(3.5 + idx * 0.6, now);

    const peak = idx < 2 ? 0.08 : 0.05;
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peak, now + 1.4);
    voiceGain.gain.setValueAtTime(peak * 0.88, now + durationSec - 1.2);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.7);

    oscA.connect(voiceGain);
    oscB.connect(voiceGain);
    voiceGain.connect(dryBus);
    voiceGain.connect(wetBus);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + durationSec + 0.8);
    oscB.stop(now + durationSec + 0.8);
  });
}

function triggerXboxShimmer(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode,
  freq: number
): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.036, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

  osc.connect(gain);
  if (panner) {
    panner.pan.setValueAtTime((Math.random() - 0.5) * 0.9, now);
    gain.connect(panner);
    panner.connect(dryBus);
    panner.connect(wetBus);
  } else {
    gain.connect(dryBus);
    gain.connect(wetBus);
  }

  osc.start(now);
  osc.stop(now + 1.85);
}

let xboxVisibilityBound = false;
function ensureXboxVisibilityListener(): void {
  if (xboxVisibilityBound || typeof document === 'undefined') return;
  xboxVisibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!xboxAudioCtx) return;
    if (document.hidden) {
      if (xboxAudioCtx.state === 'running') {
        void xboxAudioCtx.suspend().catch(() => {});
      }
    } else if (isXboxAmbientPlaying && xboxAudioCtx.state === 'suspended') {
      void xboxAudioCtx.resume().catch(() => {});
    }
  });
}

/** Warm Xbox Nexus emerald ambient dashboard drone */
export function startXboxAmbientSound(): void {
  ensureXboxVisibilityListener();
  const ctx = getXboxAudioContext();
  if (!ctx || isXboxAmbientPlaying) return;

  try {
    isXboxAmbientPlaying = true;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    const initialTargetGain =
      xboxMasterVolume <= 0.001
        ? 0.0001
        : XBOX_AMBIENT_BASE_GAIN * Math.pow(xboxMasterVolume, 1.25);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(initialTargetGain, now + 1.4);
    master.connect(ctx.destination);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(720, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.065, now);
    lfoGain.gain.setValueAtTime(220, now);
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start(now);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.5, now);

    const reverb = getXboxHallReverb(ctx);
    padFilter.connect(master);
    if (reverb) {
      wetGain.connect(reverb);
      reverb.connect(master);
    } else {
      wetGain.connect(master);
    }

    xboxMasterGain = master;
    xboxCleanupNodes = [lfo, lfoGain, padFilter, wetGain, master];

    const chordDurationSec = 5.0;
    let chordIndex = 0;
    let step = 0;

    const playNextChord = () => {
      if (!isXboxAmbientPlaying || !xboxMasterGain) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const chord = XBOX_AMBIENT_PROGRESSION[chordIndex % XBOX_AMBIENT_PROGRESSION.length];
      triggerXboxPadChord(ctx, padFilter, wetGain, chord, chordDurationSec);
      chordIndex++;
    };

    const playNextShimmer = () => {
      if (!isXboxAmbientPlaying || !xboxMasterGain) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const activeChord =
        XBOX_AMBIENT_PROGRESSION[Math.max(0, chordIndex - 1) % XBOX_AMBIENT_PROGRESSION.length];
      if (step % 4 !== 3) {
        const idx = step % activeChord.shimmerNotes.length;
        triggerXboxShimmer(ctx, padFilter, wetGain, activeChord.shimmerNotes[idx]);
      }
      step++;
    };

    playNextChord();
    window.setTimeout(() => {
      if (isXboxAmbientPlaying) playNextShimmer();
    }, 1000);

    xboxChordTimer = window.setInterval(playNextChord, chordDurationSec * 1000);
    xboxShimmerTimer = window.setInterval(playNextShimmer, 1650);
  } catch {
    isXboxAmbientPlaying = false;
    xboxMasterGain = null;
    xboxCleanupNodes = [];
  }
}

/** Smoothly fade out and stop Xbox ambient soundscape */
export function stopXboxAmbientSound(): void {
  isXboxAmbientPlaying = false;

  if (xboxChordTimer !== null) {
    window.clearInterval(xboxChordTimer);
    xboxChordTimer = null;
  }
  if (xboxShimmerTimer !== null) {
    window.clearInterval(xboxShimmerTimer);
    xboxShimmerTimer = null;
  }

  const ctx = xboxAudioCtx;
  const master = xboxMasterGain;
  const nodes = xboxCleanupNodes;

  xboxMasterGain = null;
  xboxCleanupNodes = [];

  if (!ctx || !master) return;

  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch {
          // ignore
        }
      }
    }, 440);
  } catch {
    // ignore
  }
}

/** Authentic Xbox Series X|S woody-glass tile focus / hover tick */
export function playXboxHoverSound(): void {
  if (xboxMasterVolume <= 0.001) return;
  const perfNow = performance.now();
  if (perfNow - lastXboxHoverTime < 65) return;
  lastXboxHoverTime = perfNow;

  const ctx = getXboxAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    // Soft wooden-marimba pitch drop characteristic of Xbox dashboard tile focus
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.032);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(680, now);
    filter.Q.setValueAtTime(1.4, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.052 * xboxMasterVolume, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.046);
  } catch {
    // ignore
  }
}

/** Crisp Xbox (A) green confirmation glass chime on click */
export function playXboxClickSound(): void {
  if (xboxMasterVolume <= 0.001) return;
  const ctx = getXboxAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    // Warm ascending 5th chime (D5 -> A5)
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.045);

    osc2.frequency.setValueAtTime(1174.66, now);
    osc2.frequency.exponentialRampToValueAtTime(1479.98, now + 0.04);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.068 * xboxMasterVolume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.12);
    osc2.stop(now + 0.12);
  } catch {
    // ignore
  }
}

/** Warm Xbox (B) back/close descending release tone */
export function playXboxBackSound(): void {
  if (xboxMasterVolume <= 0.001) return;
  const ctx = getXboxAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscSub = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    oscSub.type = 'sine';

    osc.frequency.setValueAtTime(493.88, now);
    osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.09);

    oscSub.frequency.setValueAtTime(246.94, now);
    oscSub.frequency.exponentialRampToValueAtTime(146.83, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.065 * xboxMasterVolume, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.125);

    osc.connect(gain);
    oscSub.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    oscSub.start(now);
    osc.stop(now + 0.13);
    oscSub.stop(now + 0.13);
  } catch {
    // ignore
  }
}

/** Iconic Xbox Series X|S deep bass + luminous emerald chord startup chime */
export function playXboxBootChime(): void {
  if (xboxMasterVolume <= 0.001) return;
  const ctx = getXboxAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.14 * xboxMasterVolume, now + 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    const reverb = getXboxHallReverb(ctx);
    masterGain.connect(ctx.destination);
    if (reverb) {
      masterGain.connect(reverb);
      reverb.connect(ctx.destination);
    }

    // Deep Xbox power sub-thump
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110.0, now);
    subOsc.frequency.exponentialRampToValueAtTime(55.0, now + 0.65);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(0.32, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(now);
    subOsc.stop(now + 1.3);

    // Emerald rising harmonic bloom (D3, A3, E4, F#4, A4, C#5)
    const notes = [146.83, 220.0, 329.63, 369.99, 440.0, 554.37];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      const start = now + 0.04 + idx * 0.065;
      osc.frequency.setValueAtTime(freq, start);
      voiceGain.gain.setValueAtTime(0.0001, start);
      voiceGain.gain.linearRampToValueAtTime(0.24 / notes.length, start + 0.09);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);

      osc.connect(voiceGain);
      voiceGain.connect(masterGain);

      osc.start(start);
      osc.stop(now + 2.0);
    });
  } catch {
    // ignore
  }
}

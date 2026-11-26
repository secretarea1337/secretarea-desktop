// Web Audio API synthesizer for PlayStation 5 UI sound effects & evolving ambient soundtrack.
// Runs 100% client-side with zero external audio files so it works seamlessly offline.

let sharedAudioCtx: AudioContext | null = null;
let sharedReverbNode: ConvolverNode | null = null;
let ambientMasterGain: GainNode | null = null;
let ambientCleanupNodes: AudioNode[] = [];
let ambientChordTimer: number | null = null;
let ambientSparkleTimer: number | null = null;
let isAmbientPlaying = false;
let lastHoverTime = 0;
let psMasterVolume = 0.7;

const PS_AMBIENT_BASE_GAIN = 0.24;

export function setPsVolume(volume01: number): void {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(volume01) ? volume01 : 0.7));
  psMasterVolume = clamped;

  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {
      // ignore autoplay block
    });
  }

  if (sharedAudioCtx && ambientMasterGain && isAmbientPlaying) {
    try {
      const now = sharedAudioCtx.currentTime;
      const targetGain = clamped <= 0.001 ? 0 : PS_AMBIENT_BASE_GAIN * Math.pow(clamped, 1.25);
      ambientMasterGain.gain.cancelScheduledValues(now);
      ambientMasterGain.gain.setValueAtTime(ambientMasterGain.gain.value, now);
      ambientMasterGain.gain.setTargetAtTime(targetGain, now, 0.03);
    } catch {
      // ignore volume ramp errors
    }
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => {
      // Ignore autoplay blocks until user gesture
    });
  }
  return sharedAudioCtx;
}

/** Generate a smooth 2.6-second stereo cosmic reverb impulse once per AudioContext */
function getCosmicReverb(ctx: AudioContext): ConvolverNode | null {
  if (sharedReverbNode && sharedReverbNode.context === ctx) {
    return sharedReverbNode;
  }
  try {
    const duration = 2.6;
    const length = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, 2.75);
        const white = Math.random() * 2 - 1;
        // Soft lowpass smoothing so reverb tail feels silky and warm
        lp = lp * 0.72 + white * 0.28;
        channelData[i] = lp * env * 0.55;
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    sharedReverbNode = convolver;
    return convolver;
  } catch {
    return null;
  }
}

interface AmbientChord {
  root: number;
  padNotes: number[];
  sparkles: number[];
}

// Lush PS5-inspired harmonic cycle: Cmaj9 -> Am9 -> Fmaj9 -> G6add9
const PS5_AMBIENT_PROGRESSION: AmbientChord[] = [
  {
    root: 65.41, // C2
    padNotes: [130.81, 196.0, 246.94, 293.66, 329.63], // C3 G3 B3 D4 E4
    sparkles: [523.25, 659.25, 783.99, 987.77, 1174.66],
  },
  {
    root: 55.0, // A1
    padNotes: [110.0, 164.81, 220.0, 246.94, 329.63], // A2 E3 A3 B3 E4
    sparkles: [440.0, 523.25, 659.25, 783.99, 987.77],
  },
  {
    root: 87.31, // F2
    padNotes: [130.81, 174.61, 220.0, 261.63, 329.63], // C3 F3 A3 C4 E4
    sparkles: [523.25, 659.25, 880.0, 1046.5, 1318.51],
  },
  {
    root: 98.0, // G2
    padNotes: [146.83, 196.0, 246.94, 293.66, 440.0], // D3 G3 B3 D4 A4
    sparkles: [587.33, 783.99, 987.77, 1174.66, 1479.98],
  },
];

/** Play one lush cross-fading harmonic pad bar + deep sub anchor */
function triggerAmbientChord(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode,
  chord: AmbientChord,
  durationSec: number
): void {
  const now = ctx.currentTime;

  // Deep warm sub-bass root pulse
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(chord.root, now);

  subGain.gain.setValueAtTime(0.0001, now);
  subGain.gain.linearRampToValueAtTime(0.22, now + 1.4);
  subGain.gain.setValueAtTime(0.2, now + durationSec - 1.5);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.6);

  subOsc.connect(subGain);
  subGain.connect(dryBus);
  subOsc.start(now);
  subOsc.stop(now + durationSec + 0.7);

  // Shimmering stereo pad voices
  chord.padNotes.forEach((freq, idx) => {
    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    const voiceGain = ctx.createGain();

    oscA.type = idx < 2 ? 'sine' : 'triangle';
    oscB.type = 'sine';
    oscA.frequency.setValueAtTime(freq, now);
    oscB.frequency.setValueAtTime(freq, now);

    // Subtle chorus detuning for wide celestial texture
    oscA.detune.setValueAtTime(-4 - idx * 0.8, now);
    oscB.detune.setValueAtTime(4 + idx * 0.8, now);

    const peak = idx < 2 ? 0.095 : 0.062;
    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(peak, now + 1.5);
    voiceGain.gain.setValueAtTime(peak * 0.9, now + durationSec - 1.4);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec + 0.8);

    oscA.connect(voiceGain);
    oscB.connect(voiceGain);
    voiceGain.connect(dryBus);
    voiceGain.connect(wetBus);

    oscA.start(now);
    oscB.start(now);
    oscA.stop(now + durationSec + 0.9);
    oscB.stop(now + durationSec + 0.9);
  });
}

/** Soft crystalline PlayStation shimmer bell note floating over the pad */
function triggerAmbientSparkle(
  ctx: AudioContext,
  dryBus: AudioNode,
  wetBus: AudioNode,
  freq: number
): void {
  const now = ctx.currentTime;

  const carrier = ctx.createOscillator();
  const harmonic = ctx.createOscillator();
  const bellGain = ctx.createGain();
  const harmonicGain = ctx.createGain();
  const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;

  carrier.type = 'sine';
  harmonic.type = 'sine';
  carrier.frequency.setValueAtTime(freq, now);
  harmonic.frequency.setValueAtTime(freq * 2.0, now);

  harmonicGain.gain.setValueAtTime(0.18, now);
  harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  bellGain.gain.setValueAtTime(0.0001, now);
  bellGain.gain.linearRampToValueAtTime(0.055, now + 0.035);
  bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

  carrier.connect(bellGain);
  harmonic.connect(harmonicGain);
  harmonicGain.connect(bellGain);

  if (panner) {
    panner.pan.setValueAtTime((Math.random() - 0.5) * 1.1, now);
    bellGain.connect(panner);
    panner.connect(dryBus);
    panner.connect(wetBus);
  } else {
    bellGain.connect(dryBus);
    bellGain.connect(wetBus);
  }

  carrier.start(now);
  harmonic.start(now);
  carrier.stop(now + 2.2);
  harmonic.stop(now + 2.2);
}

let psVisibilityBound = false;
function ensurePsVisibilityListener(): void {
  if (psVisibilityBound || typeof document === 'undefined') return;
  psVisibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!sharedAudioCtx) return;
    if (document.hidden) {
      if (sharedAudioCtx.state === 'running') {
        void sharedAudioCtx.suspend().catch(() => {});
      }
    } else if (isAmbientPlaying && sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
  });
}

/** Evolving PS5 Cosmic Horizon ambient soundtrack while in Fullscreen PS5 mode */
export function startPsAmbientSound(): void {
  ensurePsVisibilityListener();
  const ctx = getAudioContext();
  if (!ctx || isAmbientPlaying) return;

  try {
    isAmbientPlaying = true;
    const now = ctx.currentTime;

    const master = ctx.createGain();
    const initialTargetGain =
      psMasterVolume <= 0.001
        ? 0.0001
        : PS_AMBIENT_BASE_GAIN * Math.pow(psMasterVolume, 1.25);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(initialTargetGain, now + 1.5);
    master.connect(ctx.destination);

    // Breathing lowpass bus for warm velvet pads
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(840, now);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, now);
    lfoGain.gain.setValueAtTime(280, now);
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start(now);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.55, now);

    const reverb = getCosmicReverb(ctx);
    padFilter.connect(master);
    if (reverb) {
      wetGain.connect(reverb);
      reverb.connect(master);
    } else {
      wetGain.connect(master);
    }

    ambientMasterGain = master;
    ambientCleanupNodes = [lfo, lfoGain, padFilter, wetGain, master];

    const chordDurationSec = 4.6;
    let chordIndex = 0;
    let sparkleStep = 0;

    const playNextChord = () => {
      if (!isAmbientPlaying || !ambientMasterGain) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const chord = PS5_AMBIENT_PROGRESSION[chordIndex % PS5_AMBIENT_PROGRESSION.length];
      triggerAmbientChord(ctx, padFilter, wetGain, chord, chordDurationSec);
      chordIndex++;
    };

    const playNextSparkle = () => {
      if (!isAmbientPlaying || !ambientMasterGain) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const activeChord =
        PS5_AMBIENT_PROGRESSION[Math.max(0, chordIndex - 1) % PS5_AMBIENT_PROGRESSION.length];
      // Leave gentle breathing room on every 5th step
      if (sparkleStep % 5 !== 4) {
        const pattern = [0, 2, 4, 1, 3];
        const noteIdx = pattern[sparkleStep % pattern.length] % activeChord.sparkles.length;
        triggerAmbientSparkle(ctx, padFilter, wetGain, activeChord.sparkles[noteIdx]);
      }
      sparkleStep++;
    };

    playNextChord();
    window.setTimeout(() => {
      if (isAmbientPlaying) playNextSparkle();
    }, 850);

    ambientChordTimer = window.setInterval(playNextChord, chordDurationSec * 1000);
    ambientSparkleTimer = window.setInterval(playNextSparkle, 1350);
  } catch {
    isAmbientPlaying = false;
    ambientMasterGain = null;
    ambientCleanupNodes = [];
  }
}

/** Smoothly fade out and stop the PS5 ambient soundtrack */
export function stopPsAmbientSound(): void {
  isAmbientPlaying = false;

  if (ambientChordTimer !== null) {
    window.clearInterval(ambientChordTimer);
    ambientChordTimer = null;
  }
  if (ambientSparkleTimer !== null) {
    window.clearInterval(ambientSparkleTimer);
    ambientSparkleTimer = null;
  }

  const ctx = sharedAudioCtx;
  const master = ambientMasterGain;
  const nodes = ambientCleanupNodes;

  ambientMasterGain = null;
  ambientCleanupNodes = [];

  if (!ctx || !master) return;

  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    window.setTimeout(() => {
      for (const node of nodes) {
        try {
          if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch {
          // ignore already stopped nodes
        }
      }
    }, 480);
  } catch {
    // ignore errors
  }
}

/** Subtle PlayStation tile hover/focus tick */
export function playPsHoverSound(): void {
  if (psMasterVolume <= 0.001) return;
  const perfNow = performance.now();
  if (perfNow - lastHoverTime < 65) return;
  lastHoverTime = perfNow;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.025);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.022 * psMasterVolume, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.042);
  } catch {
    // ignore audio errors
  }
}

/** Crisp DualSense / PS5 confirmation tone on button click */
export function playPsClickSound(): void {
  if (psMasterVolume <= 0.001) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc2.type = 'triangle';

    osc.frequency.setValueAtTime(784, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.036);

    osc2.frequency.setValueAtTime(1567.98, now);
    osc2.frequency.exponentialRampToValueAtTime(1975.53, now + 0.03);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055 * psMasterVolume, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.09);
    osc2.stop(now + 0.09);
  } catch {
    // Ignore audio context errors
  }
}

/** Soft descending PlayStation circle/back tone when closing or returning */
export function playPsBackSound(): void {
  if (psMasterVolume <= 0.001) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(392.0, now + 0.085);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.055 * psMasterVolume, now + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  } catch {
    // Ignore audio context errors
  }
}

/** Lush PlayStation 5 cosmic startup chime when activating Fullscreen PS5 mode */
export function playPsBootChime(): void {
  if (psMasterVolume <= 0.001) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [196.0, 293.66, 392.0, 493.88, 587.33, 783.99];
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.11 * psMasterVolume, now + 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

    const reverb = getCosmicReverb(ctx);
    masterGain.connect(ctx.destination);
    if (reverb) {
      masterGain.connect(reverb);
      reverb.connect(ctx.destination);
    }

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      osc.type = idx < 2 ? 'sine' : 'triangle';
      const start = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, start);
      voiceGain.gain.setValueAtTime(0.24 / notes.length, start);

      osc.connect(voiceGain);
      voiceGain.connect(masterGain);

      osc.start(start);
      osc.stop(now + 1.7);
    });
  } catch {
    // Ignore audio context errors
  }
}

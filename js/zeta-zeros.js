/**
 * Zeta Zeros — Critical Line Explorer
 *
 * Traces ζ(½ + it) as a spiral in the complex output plane.
 * Non-trivial zeros are detected where |ζ| → 0, triggering
 * visual bursts and procedural sound. Each zero is verified
 * against known values, confirming the Riemann Hypothesis.
 *
 * Inspired by Quanta Magazine's zeta function visualizations.
 */
import {
  Game,
  Painter,
  Text,
  Scene,
  applyAnchor,
  Position,
  verticalLayout,
  applyLayout,
  Screen,
  Gesture,
  FPSCounter,
  StateMachine,
} from "/gcanvas.es.min.js";
import {
  zetaCriticalLine,
  riemannSiegelZ,
  verifyZero,
  KNOWN_ZEROS,
} from "/gcanvas.es.min.js";
import { Flanger } from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Animation
  tSpeed: 2.0,              // units of t per second
  tSpeedMin: 0.25,
  tSpeedMax: 8.0,
  tStart: 0,
  pointsPerUnit: 8,         // trail points sampled per unit of t

  // Trail
  maxTrailPoints: 3000,
  trailMinAlpha: 0.05,
  trailMaxAlpha: 0.85,
  trailMinWidth: 1,
  trailMaxWidth: 3,

  // Scaling
  scale: 120,               // pixels per unit in the complex output plane
  scaleMin: 10,
  scaleMax: 300,

  // Zero detection & verification
  zeroThreshold: 0.15,      // |ζ| below this triggers zero candidate
  zeroBisectionSteps: 40,   // more steps for higher precision
  zeroVerifyThreshold: 0.01,// |Z(t)| below this = verified zero on Re = ½
  zeroVerifyTolerance: 0.5, // tolerance for matching KNOWN_ZEROS (bonus)

  // Zero flash effect
  flash: {
    duration: 1.0,          // seconds
    maxRadius: 80,
    ringCount: 3,
  },

  // Head glow
  head: {
    radius: 6,
    glowLayers: 4,
    glowExpansion: 4,
  },

  // Colors
  colors: {
    background: "#0a0a12",
    axes: "rgba(255, 255, 255, 0.1)",
    axisLabels: "rgba(255, 255, 255, 0.25)",
    originCross: "rgba(255, 255, 255, 0.15)",
    trailSlow: { h: 260, s: 80, l: 60 },
    trailFast: { h: 180, s: 70, l: 55 },
    headGlow: [150, 200, 255],
    zeroFlash: { h: 50, s: 90, l: 70 },
    zeroMarker: "#ffd700",
    crossSection: {
      bg: "rgba(0, 8, 16, 0.7)",
      border: "rgba(0, 200, 180, 0.3)",
      waveColor: "rgba(0, 200, 180, 0.8)",
      envelopeColor: "rgba(0, 200, 180, 0.15)",
      cursorColor: "#fff",
      zeroColor: "#ffd700",
    },
  },

  // Zero log — fixed slot display on the left
  zeroLog: {
    maxVisible: 10,             // fixed number of visible slots
    fadeInDuration: 0.5,        // seconds to fade in
    fadeOutDuration: 3.0,       // seconds to fade out old entries
    lingerDuration: 6.0,        // seconds at full opacity before fading
  },

  // Cross-section panel
  crossSection: {
    height: 100,
    marginBottom: 40,
    tWindow: 20,            // how many t-units visible in the panel
  },

  // Zoom
  zoom: {
    speed: 0.15,
    easing: 0.12,
  },

  // Sound — Harmonic Resonance
  sound: {
    // FM drone: carrier + modulator creates evolving timbre
    drone: {
      carrierFreq: 55,          // A1 — deep fundamental
      modBaseFreq: 1.5,         // very slow wobble at rest
      modMaxFreq: 8,            // moderate wobble near zeros
      modBaseDepth: 5,          // very subtle FM at rest
      modMaxDepth: 30,          // controlled FM near zeros (was 80 — too harsh)
      maxVolume: 0.10,
    },
    // Persistent harmonic chord — each zero adds an overtone
    harmonicChord: {
      baseFreq: 110,            // A2 — root of the growing chord
      maxHarmonics: 16,         // cap how many overtones accumulate
      harmonicVolume: 0.02,     // volume per harmonic
      fadeInTime: 0.8,          // seconds to fade in new harmonic
    },
    // Zero burst — additive synthesis shimmer
    zeroBurst: {
      baseFreq: 220,            // A3
      harmonics: [1, 0.5, 0.25, 0.12, 0.06, 0.03],  // gentler rolloff — warmer timbre
      duration: 2.2,            // seconds (longer tail)
      volume: 0.2,              // louder
      cycleLength: 30,          // every N zeros, return to Alap (one full raga cycle)
    },
    // Whoosh — sweep triggered by large jumps in the spiral
    whoosh: {
      speedThreshold: 0.8,      // trail speed above this triggers a whoosh
      cooldown: 2.0,            // minimum seconds between whooshes
      freqStart: 800,           // sweep start frequency
      freqEnd: 120,             // sweep end frequency
      duration: 1.2,            // seconds
      volume: 0.08,
    },
    // Delay effect on zero bursts
    delay: {
      time: 0.4,                // echo delay in seconds
      feedback: 0.45,           // more echo repeats
      mix: 0.45,                // wetter
    },
    // Flanger on musical content
    flanger: {
      baseDelay: 0.005,
      maxDelay: 0.02,
      lfoFrequency: 0.3,        // moderate sweep
      lfoDepth: 0.004,          // noticeable but not overpowering
      feedback: 0.5,            // balanced resonance
      wet: 0.45,
      dry: 0.75,
    },
    // Reverb on everything
    reverb: {
      duration: 5,              // longer impulse — big cathedral space
      decay: 1.8,               // slower decay = longer tail
      mix: 0.45,                // wetter — more reverb presence
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ZETA ZEROS DEMO
// ─────────────────────────────────────────────────────────────────────────────

class ZetaZerosDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.background;
    this.enableFluidSize();
  }

  init() {
    super.init();

    // State
    this.t = CONFIG.tStart;
    this.tSpeed = CONFIG.tSpeed;
    this.paused = false;
    this.scale = CONFIG.scale;
    this.targetScale = CONFIG.scale;
    this.panX = 0;
    this.panY = 0;

    // Trail: array of { re, im, t, magnitude, speed }
    this.trail = [];
    this.prevPoint = null;

    // Zeros found
    this.detectedZeros = [];   // { t, verified, knownValue, index, flashTime }
    this.lastZeroT = -10;      // debounce

    // Flash effects
    this.activeFlashes = [];   // { elapsed, duration }

    // Sound state
    this.soundEnabled = false;
    this.harmonicOscs = [];
    this.lastWhooshTime = -10;

    // Cross-section: incremental sample buffer
    this.csSamples = [];       // { t, mag } — grows as t advances
    this.csLastSampledT = 0;   // last t we sampled for the cross-section

    // Pulse animation for play button
    this.pulseTime = 0;

    // State machine: waiting → running
    this.fsm = new StateMachine({
      initial: "waiting",
      context: this,
      states: {
        waiting: {
          enter() { this.paused = true; },
        },
        running: {
          enter() {
            this.paused = false;
            this._initGestures();
            this._initKeyboard();
            this._buildInfoPanel();
            this.fpsCounter = new FPSCounter(this, {
              color: "#00FF00",
              anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
            });
            this.pipeline.add(this.fpsCounter);
          },
        },
      },
    });

    // Click/tap to start — also satisfies Web Audio user gesture requirement
    const startHandler = () => {
      this.canvas.removeEventListener("click", startHandler);
      this.canvas.removeEventListener("touchstart", startHandler);
      this._initAudio().then(() => {
        this.fsm.setState("running");
      });
    };
    this.canvas.addEventListener("click", startHandler);
    this.canvas.addEventListener("touchstart", startHandler);

    Screen.init(this);
  }

  // ── Input ──────────────────────────────────────────────────────────────

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetScale *= 1 + delta * CONFIG.zoom.speed;
        this.targetScale = Math.max(CONFIG.scaleMin, Math.min(CONFIG.scaleMax, this.targetScale));
      },
      onPan: (dx, dy) => {
        this.panX += dx;
        this.panY += dy;
      },
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetScale = CONFIG.scale;
      this.panX = 0;
      this.panY = 0;
    });
  }

  _initKeyboard() {
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          this.paused = !this.paused;
          break;
        case "r":
        case "R":
          this._restart();
          break;
        case "+":
        case "=":
          this.tSpeed = Math.min(CONFIG.tSpeedMax, this.tSpeed * 1.5);
          break;
        case "-":
        case "_":
          this.tSpeed = Math.max(CONFIG.tSpeedMin, this.tSpeed / 1.5);
          break;
      }
    });
  }

  _restart() {
    this.t = CONFIG.tStart;
    this.trail = [];
    this.prevPoint = null;
    this.detectedZeros = [];
    this.activeFlashes = [];
    this.lastZeroT = -10;
    this.csSamples = [];
    this.csLastSampledT = 0;
  }

  // ── Sound ──────────────────────────────────────────────────────────────

  _initAudio() {
    return import("../../src/sound/synth.js").then(({ Synth }) => {
      this.Synth = Synth;
      if (!Synth.isInitialized) {
        Synth.init({ masterVolume: 0.3 });
      }
      Synth.resume();
      this.soundEnabled = true;
      this._buildAudioGraph();
      this._startDrone();
    });
  }

  _buildAudioGraph() {
    const ctx = this.Synth.ctx;
    const sc = CONFIG.sound;

    // Create shared reverb bus
    this.reverbNode = this.Synth.fx.reverb(sc.reverb.duration, sc.reverb.decay);
    this.reverbWet = ctx.createGain();
    this.reverbDry = ctx.createGain();
    this.reverbWet.gain.value = sc.reverb.mix;
    this.reverbDry.gain.value = 1 - sc.reverb.mix;

    // Stereo panner — tracks the ball position
    this.pannerNode = this.Synth.fx.panner(0);

    // Flanger on musical content
    const fl = sc.flanger;
    this.flanger = new Flanger(ctx, {
      baseDelay: fl.baseDelay,
      maxDelay: fl.maxDelay,
      lfoFrequency: fl.lfoFrequency,
      lfoDepth: fl.lfoDepth,
      feedback: fl.feedback,
      wet: fl.wet,
      dry: fl.dry,
    });

    // Musical audio bus → flanger → panner → reverb split → master
    this.audioBus = ctx.createGain();
    this.audioBus.gain.value = 1;
    this.flanger.connect(this.audioBus);
    this.flanger.output.connect(this.pannerNode);
    this.pannerNode.connect(this.reverbDry);
    this.pannerNode.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbWet);
    this.reverbWet.connect(this.Synth.master);
    this.reverbDry.connect(this.Synth.master);

    // Drone flanger — slower, deeper sweep for sitar-like texture
    this.droneFlanger = new Flanger(ctx, {
      baseDelay: fl.baseDelay,
      maxDelay: fl.maxDelay,
      lfoFrequency: fl.lfoFrequency * 0.6,  // even slower
      lfoDepth: fl.lfoDepth * 1.5,           // deeper sweep
      feedback: fl.feedback * 1.1,
      wet: fl.wet * 1.2,
      dry: fl.dry,
    });

    // Drone bus → drone flanger → reverb (always center-panned)
    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = 1;
    this.droneFlanger.connect(this.droneBus);
    this.droneFlanger.output.connect(this.reverbDry);
    this.droneFlanger.output.connect(this.reverbNode);

    // Create delay effect for zero bursts
    this.delayEffect = this.Synth.fx.delay(sc.delay.time, sc.delay.feedback, sc.delay.mix);
    this.delayEffect.output.connect(this.audioBus);

    // Persistent harmonic chord — oscillators added as zeros are found
    this.harmonicOscs = [];
  }

  _startDrone() {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const sc = CONFIG.sound.drone;

    // FM synthesis drone: carrier modulated by a slow LFO
    this.droneCarrier = ctx.createOscillator();
    this.droneModulator = ctx.createOscillator();
    this.droneModGain = ctx.createGain();
    this.droneOutputGain = ctx.createGain();

    this.droneCarrier.type = "sine";
    this.droneCarrier.frequency.value = sc.carrierFreq;
    this.droneModulator.type = "sine";
    this.droneModulator.frequency.value = sc.modBaseFreq;
    this.droneModGain.gain.value = sc.modBaseDepth;
    this.droneOutputGain.gain.value = 0;

    // FM routing: modulator → modGain → carrier.frequency
    this.droneModulator.connect(this.droneModGain);
    this.droneModGain.connect(this.droneCarrier.frequency);
    this.droneCarrier.connect(this.droneOutputGain);
    this.droneOutputGain.connect(this.droneBus);

    this.droneModulator.start();
    this.droneCarrier.start();
  }

  _updateDrone(magnitude) {
    if (!this.droneCarrier || !this.droneOutputGain) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const sc = CONFIG.sound.drone;

    // Proximity: 0 = far from zero, 1 = at zero
    const proximity = Math.max(0, 1 - magnitude / 2);
    const p2 = proximity * proximity;

    // FM modulation intensifies near zeros — but stays musical
    const modFreq = sc.modBaseFreq + (sc.modMaxFreq - sc.modBaseFreq) * p2;
    const modDepth = sc.modBaseDepth + (sc.modMaxDepth - sc.modBaseDepth) * p2;
    // Volume: gentle base presence + intensity near zeros
    const vol = sc.maxVolume * (0.08 + 0.92 * p2);

    this.droneModulator.frequency.setTargetAtTime(modFreq, now, 0.3);
    this.droneModGain.gain.setTargetAtTime(modDepth, now, 0.3);
    this.droneOutputGain.gain.setTargetAtTime(vol, now, 0.3);
  }

  _updatePanner() {
    if (!this.pannerNode || this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];
    // Map ball's screen X position to pan: -1 (left) to +1 (right)
    // Origin on screen = center panned (like study009.js panFor pattern)
    const screenX = this.width / 2 + this.panX + last.re * this.scale;
    const pan = Math.max(-1, Math.min(1, (screenX / this.width) * 2 - 1));
    this.pannerNode.pan.setTargetAtTime(pan, this.Synth.ctx.currentTime, 0.08);
  }

  _addHarmonicOvertone(zeroIndex) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const sc = CONFIG.sound.harmonicChord;
    const now = ctx.currentTime;

    if (this.harmonicOscs.length >= sc.maxHarmonics) return;

    // Each zero adds the next harmonic in the series
    // 1st zero = fundamental, 2nd = octave, 3rd = fifth, etc.
    const harmonicNumber = zeroIndex;
    const freq = sc.baseFreq * harmonicNumber;

    // Higher harmonics are quieter (natural rolloff)
    const vol = sc.harmonicVolume / Math.sqrt(harmonicNumber);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + sc.fadeInTime);

    osc.connect(gain);
    gain.connect(this.audioBus);
    osc.start(now);

    this.harmonicOscs.push({ osc, gain, freq });
  }

  _playZeroBurst(zeroIndex) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const sc = CONFIG.sound.zeroBurst;

    // ── Raga Bhairav: cyclical Alap → Jor → Jhala ──
    // Like a real raga performance that returns to its theme:
    //   Alap  (1-5 in cycle):  pure ascending scale, simple tones — establish the raga
    //   Jor   (6-9 in cycle):  add embellishments, FM bells, slight jitter
    //   Jhala (10+ in cycle):  full improvisation, dyads, grace notes, wide variance
    // Every cycleLength zeros, return to Alap — like a musician revisiting the theme

    const bhairav = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23];
    const rootFreq = sc.baseFreq;

    // Phase within the current cycle
    const posInCycle = ((zeroIndex - 1) % sc.cycleLength) + 1;
    const isAlap  = posInCycle <= 8;
    const isJor   = posInCycle > 8 && posInCycle <= 18;
    // jhala is 19+ in cycle

    // Note selection — strict ascending in alap, increasing freedom after
    let idx;
    if (isAlap) {
      // Pure ascending walk through the scale
      idx = (posInCycle - 1) % bhairav.length;
    } else if (isJor) {
      // Mostly ascending, occasional step back
      const jitter = Math.floor(Math.random() * 3) - 1; // -1 to +1
      idx = ((posInCycle - 1) + jitter) % bhairav.length;
      if (idx < 0) idx += bhairav.length;
    } else {
      // Free movement — wider leaps, full range
      const jitter = Math.floor(Math.random() * 5) - 2; // -2 to +2
      idx = ((posInCycle - 1) + jitter) % bhairav.length;
      if (idx < 0) idx += bhairav.length;
    }
    const baseFreq = rootFreq * Math.pow(2, bhairav[idx] / 12);

    // ── Timbre: evolves with the performance ──

    if (isAlap) {
      // Simple, pure additive — let the raga speak
      this.Synth.osc.additive(
        baseFreq,
        sc.harmonics,
        sc.duration,
        { volume: sc.volume, startTime: now }
      );
    } else if (isJor) {
      // Alternate between additive and FM bells
      if (zeroIndex % 2 === 0) {
        this.Synth.osc.additive(
          baseFreq,
          sc.harmonics,
          sc.duration,
          { volume: sc.volume, startTime: now }
        );
      } else {
        // FM bell — golden ratio modulator
        this.Synth.osc.fm(
          baseFreq,
          baseFreq * 1.618,
          baseFreq * 0.4,
          sc.duration,
          { volume: sc.volume * 0.7, startTime: now }
        );
      }
    } else {
      // Jhala — full palette: additive, FM, dyads
      const burstType = Math.floor(Math.random() * 3);
      if (burstType === 0) {
        this.Synth.osc.additive(
          baseFreq,
          sc.harmonics,
          sc.duration,
          { volume: sc.volume, startTime: now }
        );
      } else if (burstType === 1) {
        this.Synth.osc.fm(
          baseFreq,
          baseFreq * 1.618,
          baseFreq * (0.3 + Math.random() * 0.3),
          sc.duration,
          { volume: sc.volume * 0.7, startTime: now }
        );
      } else {
        // Dyad — root + a raga-consonant interval
        const dyadOffset = [4, 7, 5][Math.floor(Math.random() * 3)]; // 3rd, 5th, or 4th
        const dyadIdx = Math.min(idx + dyadOffset, bhairav.length - 1);
        const dyadFreq = rootFreq * Math.pow(2, bhairav[dyadIdx] / 12);
        this.Synth.osc.additive(baseFreq, [1, 0.3, 0.15], sc.duration,
          { volume: sc.volume * 0.6, startTime: now });
        this.Synth.osc.additive(dyadFreq, [0.7, 0.2], sc.duration * 0.8,
          { volume: sc.volume * 0.4, startTime: now + 0.06 });
      }
    }

    // ── Delay send — grows wetter over time ──
    const burstOsc = ctx.createOscillator();
    const burstGain = ctx.createGain();
    burstOsc.type = "triangle";
    burstOsc.frequency.value = baseFreq;
    const delayVol = isAlap
      ? sc.volume * 0.15
      : sc.volume * (0.2 + Math.random() * 0.15);
    burstGain.gain.setValueAtTime(delayVol, now);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + sc.duration * 0.7);
    burstOsc.connect(burstGain);
    burstGain.connect(this.delayEffect.input);
    burstOsc.start(now);
    burstOsc.stop(now + sc.duration);

    // ── Shimmer: absent in alap, subtle in jor, wide in jhala ──
    if (!isAlap) {
      const spread = isJor
        ? 6 + Math.random() * 6    // subtle in jor
        : 8 + Math.random() * 18;  // wide in jhala
      for (const sign of [-1, 1]) {
        const shimmer = ctx.createOscillator();
        const shimGain = ctx.createGain();
        shimmer.type = "sine";
        shimmer.frequency.value = this.Synth.music.detune(baseFreq * 2, sign * spread);
        const shimVol = sc.volume * (0.04 + Math.random() * 0.06);
        shimGain.gain.setValueAtTime(shimVol, now);
        shimGain.gain.exponentialRampToValueAtTime(0.001, now + sc.duration);
        shimmer.connect(shimGain);
        shimGain.connect(this.audioBus);
        shimmer.start(now + 0.03 + Math.random() * 0.05);
        shimmer.stop(now + sc.duration + 0.1);
      }
    }

    // ── Grace notes (meend): never in alap, rare in jor, frequent in jhala ──
    const graceChance = isAlap ? 0 : isJor ? 0.15 : 0.4;
    if (Math.random() < graceChance) {
      const graceInterval = Math.random() < 0.5 ? -1 : -2;
      const graceFreq = baseFreq * Math.pow(2, graceInterval / 12);
      const grace = ctx.createOscillator();
      const graceGain = ctx.createGain();
      grace.type = "sine";
      grace.frequency.setValueAtTime(graceFreq, now);
      grace.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.12);
      graceGain.gain.setValueAtTime(sc.volume * 0.15, now);
      graceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      grace.connect(graceGain);
      graceGain.connect(this.audioBus);
      grace.start(now);
      grace.stop(now + 0.25);
    }
  }

  _playWhoosh(speed) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const wc = CONFIG.sound.whoosh;

    // Filtered noise sweep — descending frequency for a "whoosh" feel
    // Intensity scales with jump size
    const intensity = Math.min(1, speed / 3);

    // Sweep oscillator — descending tone
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(wc.freqStart * (0.8 + intensity * 0.4), now);
    sweep.frequency.exponentialRampToValueAtTime(wc.freqEnd, now + wc.duration);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(wc.freqStart * 0.6, now);
    filter.frequency.exponentialRampToValueAtTime(wc.freqEnd * 2, now + wc.duration);
    filter.Q.value = 2;

    const vol = wc.volume * (0.5 + intensity * 0.5);
    sweepGain.gain.setValueAtTime(vol, now);
    sweepGain.gain.setValueAtTime(vol, now + wc.duration * 0.1);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + wc.duration);

    sweep.connect(filter);
    filter.connect(sweepGain);
    sweepGain.connect(this.audioBus);
    sweep.start(now);
    sweep.stop(now + wc.duration + 0.05);

    // Breathy noise layer — second detuned oscillator for texture
    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noise.type = "triangle";
    noise.frequency.setValueAtTime(wc.freqStart * 0.51, now);
    noise.frequency.exponentialRampToValueAtTime(wc.freqEnd * 0.7, now + wc.duration);

    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + wc.duration);

    noiseGain.gain.setValueAtTime(vol * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + wc.duration * 0.8);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioBus);
    noise.start(now);
    noise.stop(now + wc.duration + 0.05);
  }

  _playVerificationTone(zeroIndex) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;

    // Dramatic rising perfect fifth — "confirmed"
    // Low fundamental + fifth above, swelling in
    const root = 110; // A2
    const fifth = root * 1.5; // E3

    // Root tone — slow swell
    const rootOsc = ctx.createOscillator();
    const rootGain = ctx.createGain();
    rootOsc.type = "sine";
    rootOsc.frequency.value = root;
    rootGain.gain.setValueAtTime(0, now);
    rootGain.gain.linearRampToValueAtTime(0.12, now + 0.4);
    rootGain.gain.setValueAtTime(0.12, now + 1.5);
    rootGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    rootOsc.connect(rootGain);
    rootGain.connect(this.audioBus);
    rootOsc.start(now);
    rootOsc.stop(now + 3.6);

    // Fifth enters after a beat — the "resolution"
    const fifthOsc = ctx.createOscillator();
    const fifthGain = ctx.createGain();
    fifthOsc.type = "sine";
    fifthOsc.frequency.value = fifth;
    fifthGain.gain.setValueAtTime(0, now + 0.3);
    fifthGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
    fifthGain.gain.setValueAtTime(0.08, now + 1.8);
    fifthGain.gain.exponentialRampToValueAtTime(0.001, now + 3.5);
    fifthOsc.connect(fifthGain);
    fifthGain.connect(this.audioBus);
    fifthOsc.start(now + 0.3);
    fifthOsc.stop(now + 3.6);

    // High shimmer octave — ethereal confirmation
    const shimmer = ctx.createOscillator();
    const shimGain = ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.value = root * 4; // two octaves up
    shimGain.gain.setValueAtTime(0, now + 0.6);
    shimGain.gain.linearRampToValueAtTime(0.04, now + 1.0);
    shimGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    shimmer.connect(shimGain);
    shimGain.connect(this.audioBus);
    shimmer.start(now + 0.6);
    shimmer.stop(now + 3.1);
  }

  // ── Info Panel ─────────────────────────────────────────────────────────

  _buildInfoPanel() {
    this.infoPanel = new Scene(this, { x: 0, y: 0 });
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_LEFT,
      anchorOffsetX: Screen.responsive(15, 30, 40),
      anchorOffsetY: Screen.responsive(60, 80, 90),
    });

    this.titleText = new Text(this, "Riemann Zeta — Critical Line", {
      font: `bold ${Screen.responsive(18, 24, 28)}px monospace`,
      color: "#7af",
      align: "left",
      baseline: "middle",
    });

    this.equationText = new Text(this, "ζ(½ + it)", {
      font: `${Screen.responsive(14, 18, 20)}px monospace`,
      color: "#fff",
      align: "left",
      baseline: "middle",
    });

    this.descText = new Text(this, "Verifying non-trivial zeros lie on the critical line Re = ½", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    this.descText2 = new Text(this, "Each zero verified is one more data point for the Riemann Hypothesis", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    this.liveText = new Text(this, "t = 0.00 | ζ = 0.00 + 0.00i | |ζ| = 0.00", {
      font: `${Screen.responsive(10, 13, 14)}px monospace`,
      color: "#fa6",
      align: "left",
      baseline: "middle",
    });

    const items = [this.titleText, this.equationText, this.descText, this.descText2, this.liveText];
    const spacing = Screen.responsive(14, 20, 24);
    let y = 0;
    for (const item of items) {
      item.x = 0;
      item.y = y;
      y += spacing;
      this.infoPanel.add(item);
    }
    this.pipeline.add(this.infoPanel);
  }

  // ── Update ─────────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);

    if (this.fsm.is("waiting")) {
      this.pulseTime += dt;
      return;
    }

    // Zoom easing
    this.scale += (this.targetScale - this.scale) * CONFIG.zoom.easing;

    if (this.paused) return;

    // Advance t
    const prevT = this.t;
    this.t += this.tSpeed * dt;

    // Sample new trail points
    // Ensure at least one sample per frame, but also respect pointsPerUnit
    // for fast speeds where dt covers more than one step
    const step = 1 / CONFIG.pointsPerUnit;
    const dtT = this.t - prevT;
    if (dtT < step) {
      // dt is smaller than step — sample at current t
      this._samplePoint(this.t);
    } else {
      // dt covers multiple steps — sample at each step
      let sampleT = prevT + step;
      while (sampleT <= this.t) {
        this._samplePoint(sampleT);
        sampleT += step;
      }
    }

    // Trim trail
    if (this.trail.length > CONFIG.maxTrailPoints) {
      this.trail.splice(0, this.trail.length - CONFIG.maxTrailPoints);
    }

    // Incrementally sample cross-section Z(t) as t advances
    const csStep = CONFIG.crossSection.tWindow / 200;
    while (this.csLastSampledT + csStep <= this.t) {
      this.csLastSampledT += csStep;
      const st = this.csLastSampledT;
      const mag = st < 1 ? 0 : Math.abs(riemannSiegelZ(st));
      this.csSamples.push({ t: st, mag });
    }
    // Trim old samples well behind the visible window
    const trimT = this.t - CONFIG.crossSection.tWindow * 2;
    while (this.csSamples.length > 0 && this.csSamples[0].t < trimT) {
      this.csSamples.shift();
    }

    // Update drone
    if (this.trail.length > 0) {
      const last = this.trail[this.trail.length - 1];
      this._updateDrone(last.magnitude);
      this._updatePanner();
    }

    // Update flash effects
    for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
      this.activeFlashes[i].elapsed += dt;
      if (this.activeFlashes[i].elapsed > this.activeFlashes[i].duration) {
        this.activeFlashes.splice(i, 1);
      }
    }

    // Age all detected zeros
    for (const zero of this.detectedZeros) {
      zero.age += dt;
    }

    // Update info text
    this._updateInfoText();
  }

  _samplePoint(t) {
    const zeta = zetaCriticalLine(t);
    const magnitude = zeta.abs();

    // Compute speed (distance from previous point)
    let speed = 0;
    if (this.prevPoint) {
      const dx = zeta.real - this.prevPoint.re;
      const dy = zeta.imag - this.prevPoint.im;
      speed = Math.sqrt(dx * dx + dy * dy);
    }

    const point = {
      re: zeta.real,
      im: zeta.imag,
      t,
      magnitude,
      speed,
    };

    this.trail.push(point);

    // Jump detection — large leaps in the spiral trigger a whoosh
    const wc = CONFIG.sound.whoosh;
    if (speed > wc.speedThreshold && t - this.lastWhooshTime > wc.cooldown) {
      this.lastWhooshTime = t;
      this._playWhoosh(speed);
    }

    // Zero detection
    if (magnitude < CONFIG.zeroThreshold && t - this.lastZeroT > 1) {
      this._onNearZero(t, magnitude);
    }

    this.prevPoint = point;
  }

  _onNearZero(t, magnitude) {
    // Queue a candidate — verification happens asynchronously
    const zeroNum = this.detectedZeros.length + 1;
    const zero = {
      t,
      refined: false,          // bisection not yet complete
      verified: false,         // not yet confirmed on Re = ½
      knownMatch: null,        // matched KNOWN_ZEROS entry (bonus)
      index: zeroNum,
      residual: magnitude,     // |ζ| at detection — will be refined
      age: 0,
    };

    this.detectedZeros.push(zero);
    this.lastZeroT = t;

    // Trigger flash at origin
    this.activeFlashes.push({
      elapsed: 0,
      duration: CONFIG.flash.duration,
    });

    // Raga burst plays immediately on detection
    this._playZeroBurst(zeroNum);
    this._addHarmonicOvertone(zeroNum);

    // Async verification — refine via bisection off the main thread
    this._verifyZeroAsync(zero);
  }

  async _verifyZeroAsync(zero) {
    const t = zero.t;
    const searchStart = Math.max(1, t - 1);
    const searchEnd = t + 1;
    const Z1 = riemannSiegelZ(searchStart);
    const Z2 = riemannSiegelZ(searchEnd);

    let zeroT = t;
    if (Z1 * Z2 < 0) {
      // Bisection in chunks — yield to render loop every few steps
      let lo = searchStart, hi = searchEnd;
      let loZ = Z1;
      const chunkSize = 8;
      for (let i = 0; i < CONFIG.zeroBisectionSteps; i++) {
        const mid = (lo + hi) / 2;
        const midZ = riemannSiegelZ(mid);
        if (loZ * midZ < 0) {
          hi = mid;
        } else {
          lo = mid;
          loZ = midZ;
        }
        // Yield every chunk so we don't block the frame
        if ((i + 1) % chunkSize === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      zeroT = (lo + hi) / 2;
    }

    // Compute final residual: |Z(t_refined)| — how close to zero?
    const residual = Math.abs(riemannSiegelZ(zeroT));
    zero.t = zeroT;
    zero.residual = residual;
    zero.refined = true;

    // Verification: is |Z(t)| small enough to confirm a zero on Re = ½?
    if (residual < CONFIG.zeroVerifyThreshold) {
      zero.verified = true;

      // Bonus: check if it matches a known tabulated zero
      const knownMatch = verifyZero(zeroT, CONFIG.zeroVerifyTolerance);
      if (knownMatch.verified) {
        zero.knownMatch = knownMatch.knownValue;
      }

      // Dramatic verification sound
      this._playVerificationTone(zero.index);

      // Flash again on verification
      this.activeFlashes.push({
        elapsed: 0,
        duration: CONFIG.flash.duration * 1.5,
      });
    }
  }

  _updateInfoText() {
    if (this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];

    const sign = last.im >= 0 ? "+" : "-";
    this.liveText.text =
      `t = ${this.t.toFixed(2)} | ζ = ${last.re.toFixed(3)} ${sign} ${Math.abs(last.im).toFixed(3)}i | |ζ| = ${last.magnitude.toFixed(3)}`;

  }

  // ── Render ─────────────────────────────────────────────────────────────

  render() {
    Painter.setContext(this.ctx);
    if (this.running) this.clear();

    if (this.fsm.is("waiting")) {
      this._drawWaitingScreen();
      return;
    }

    const cx = this.width / 2 + this.panX;
    const cy = this.height / 2 + this.panY;

    Painter.useCtx((ctx) => {
      this._drawAxes(ctx, cx, cy);
      this._drawTrail(ctx, cx, cy);
      this._drawHead(ctx, cx, cy);
      this._drawZeroMarkers(ctx, cx, cy);
      this._drawFlashes(ctx, cx, cy);
    }, { saveState: true });

    this._drawCrossSection();

    Painter.useCtx((ctx) => {
      this._drawZeroLog(ctx);
      this._drawStats(ctx);
      this._drawControls(ctx);
    });

    this.pipeline.render();
  }

  _drawWaitingScreen() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const pulse = 0.85 + 0.15 * Math.sin(this.pulseTime * 2);

    Painter.useCtx((ctx) => {
      // Title
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#7af";
      ctx.font = `bold ${Screen.responsive(22, 32, 40)}px monospace`;
      ctx.fillText("Riemann Zeta — Critical Line", cx, cy - Screen.responsive(80, 110, 130));

      // Equation
      ctx.fillStyle = "#fff";
      ctx.font = `${Screen.responsive(14, 20, 24)}px monospace`;
      ctx.fillText("ζ(½ + it)", cx, cy - Screen.responsive(50, 70, 80));

      // Play triangle
      const r = Screen.responsive(28, 40, 50) * pulse;
      ctx.fillStyle = `rgba(120, 170, 255, ${0.6 + 0.3 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.4, cy - r * 0.6);
      ctx.lineTo(cx - r * 0.4, cy + r * 0.6);
      ctx.lineTo(cx + r * 0.6, cy);
      ctx.closePath();
      ctx.fill();

      // Ring around play button
      ctx.strokeStyle = `rgba(120, 170, 255, ${0.25 + 0.15 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
      ctx.stroke();

      // Description
      ctx.fillStyle = "#667";
      ctx.font = `${Screen.responsive(10, 13, 15)}px monospace`;
      ctx.fillText("Verifying non-trivial zeros lie on the critical line Re = ½", cx, cy + Screen.responsive(50, 70, 85));
      ctx.fillText("Each zero verified is one more data point for the Riemann Hypothesis", cx, cy + Screen.responsive(70, 95, 110));

      // Call to action
      ctx.fillStyle = `rgba(120, 170, 255, ${0.5 + 0.3 * pulse})`;
      ctx.font = `${Screen.responsive(11, 14, 16)}px monospace`;
      ctx.fillText("click to begin", cx, cy + Screen.responsive(100, 130, 150));
    });
  }

  _drawAxes(ctx, cx, cy) {
    // Re axis
    ctx.strokeStyle = CONFIG.colors.axes;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(this.width, cy);
    ctx.stroke();

    // Im axis
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();

    // Origin crosshair
    ctx.strokeStyle = CONFIG.colors.originCross;
    ctx.lineWidth = 1;
    const crossSize = 8;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    // Labels
    ctx.fillStyle = CONFIG.colors.axisLabels;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Re", this.width - 30, cy - 10);
    ctx.fillText("Im", cx + 10, 20);
  }

  _drawTrail(ctx, cx, cy) {
    if (this.trail.length < 2) return;



    const len = this.trail.length;
    const { trailSlow, trailFast } = CONFIG.colors;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < len; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];

      // Skip drawing straight lines for large jumps
      if (curr.speed > CONFIG.sound.whoosh.speedThreshold) continue;

      const age = 1 - i / len; // 0 = newest, 1 = oldest
      const alpha = CONFIG.trailMaxAlpha - age * (CONFIG.trailMaxAlpha - CONFIG.trailMinAlpha);
      const width = CONFIG.trailMaxWidth - age * (CONFIG.trailMaxWidth - CONFIG.trailMinWidth);

      // Speed-based hue interpolation
      const speedNorm = Math.min(curr.speed * 5, 1);
      const h = trailSlow.h + (trailFast.h - trailSlow.h) * speedNorm;
      const s = trailSlow.s + (trailFast.s - trailSlow.s) * speedNorm;
      const l = trailSlow.l + (trailFast.l - trailSlow.l) * speedNorm;

      ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(cx + prev.re * this.scale, cy - prev.im * this.scale);
      ctx.lineTo(cx + curr.re * this.scale, cy - curr.im * this.scale);
      ctx.stroke();
    }
  }

  _drawHead(ctx, cx, cy) {
    if (this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];
    const hx = cx + last.re * this.scale;
    const hy = cy - last.im * this.scale;

    const { radius, glowLayers, glowExpansion } = CONFIG.head;
    const [gr, gg, gb] = CONFIG.colors.headGlow;

    // Glow layers
    for (let layer = glowLayers; layer >= 0; layer--) {
      const r = radius + layer * glowExpansion;
      const a = 0.15 * (1 - layer / glowLayers);
      ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${a})`;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core
    ctx.fillStyle = `rgb(${gr}, ${gg}, ${gb})`;
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawZeroMarkers(ctx, cx, cy) {
    // Small dot at origin for each zero (keep subtle)
    if (this.detectedZeros.length > 0) {
      ctx.fillStyle = "rgba(0, 200, 180, 0.5)";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawZeroLog(ctx) {
    const zl = CONFIG.zeroLog;
    const fontSize = Screen.responsive(11, 14, 16);
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Show the most recent N zeros, fading old ones out
    const total = this.detectedZeros.length;
    const startIdx = Math.max(0, total - zl.maxVisible);
    const x = Screen.responsive(15, 30, 40);
    const baseY = this.height / 2 - (zl.maxVisible * (fontSize + 4)) / 2;

    for (let slot = 0; slot < zl.maxVisible; slot++) {
      const zeroIdx = startIdx + slot;
      if (zeroIdx >= total) break;

      const zero = this.detectedZeros[zeroIdx];
      const y = baseY + slot * (fontSize + 6);

      // Alpha: fade in, linger, then fade out
      let alpha;
      if (zero.age < zl.fadeInDuration) {
        alpha = zero.age / zl.fadeInDuration;
      } else if (zero.age < zl.fadeInDuration + zl.lingerDuration) {
        alpha = 1;
      } else {
        const fadeProgress = (zero.age - zl.fadeInDuration - zl.lingerDuration) / zl.fadeOutDuration;
        alpha = Math.max(0.15, 1 - fadeProgress); // don't fully vanish, keep a ghost
      }

      let label;
      if (zero.verified) {
        const matchStr = zero.knownMatch ? " (known)" : "";
        label = `#${zero.index} t = ${zero.t.toFixed(6)} ✓${matchStr}`;
      } else if (zero.refined) {
        label = `#${zero.index} t ≈ ${zero.t.toFixed(3)} refining...`;
      } else {
        label = `#${zero.index} t ≈ ${zero.t.toFixed(3)} detecting...`;
      }

      ctx.fillStyle = `rgba(0, 200, 180, ${alpha})`;
      ctx.fillText(label, x, y);
    }
  }

  _drawStats(ctx) {
    const count = this.detectedZeros.length;
    const verified = this.detectedZeros.filter((z) => z.verified).length;
    const fontSize = Screen.responsive(10, 13, 14);
    const x = Screen.responsive(15, 30, 40);
    const y = this.height / 2 + (CONFIG.zeroLog.maxVisible * (fontSize + 6)) / 2 + fontSize + 10;

    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6d8";
    ctx.fillText(`${count} zero${count !== 1 ? "s" : ""} detected`, x, y);
    ctx.fillText(`${verified} verified on Re = ½`, x, y + fontSize + 6);
    if (verified > 0) {
      ctx.fillStyle = "#4a7";
      ctx.fillText("hypothesis holds", x, y + (fontSize + 6) * 2);
    }
  }

  _drawFlashes(ctx, cx, cy) {
    for (const flash of this.activeFlashes) {
      const progress = flash.elapsed / flash.duration;
      const { h, s, l } = CONFIG.colors.zeroFlash;

      for (let ring = 0; ring < CONFIG.flash.ringCount; ring++) {
        const ringProgress = Math.min(1, progress + ring * 0.15);
        const radius = ringProgress * CONFIG.flash.maxRadius;
        const alpha = (1 - ringProgress) * 0.6;

        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        ctx.lineWidth = 2 * (1 - ringProgress) + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner glow
      const glowAlpha = (1 - progress) * 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, CONFIG.flash.maxRadius * 0.5);
      gradient.addColorStop(0, `hsla(${h}, 100%, 85%, ${glowAlpha})`);
      gradient.addColorStop(1, `hsla(${h}, 100%, 85%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, CONFIG.flash.maxRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCrossSection() {
    const cs = CONFIG.crossSection;
    const plotH = cs.height;
    const plotW = this.width * 0.6;
    const plotX = (this.width - plotW) / 2;
    const plotY = this.height - cs.marginBottom - plotH;

    // Sliding window: show tWindow units ending at current t
    const tEnd = this.t;
    const tStart = Math.max(0, tEnd - cs.tWindow);

    // Filter samples within the visible window
    // Binary search for start index since csSamples is sorted by t
    let startIdx = 0;
    for (let i = this.csSamples.length - 1; i >= 0; i--) {
      if (this.csSamples[i].t < tStart) { startIdx = i + 1; break; }
    }
    const visible = this.csSamples.slice(startIdx);
    if (visible.length < 2) return;

    // Find max magnitude for scaling
    let maxMag = 0;
    for (const s of visible) { if (s.mag > maxMag) maxMag = s.mag; }
    if (maxMag < 0.01) maxMag = 1;

    // Map t → screen x
    const tToX = (t) => plotX + ((t - tStart) / cs.tWindow) * plotW;
    const magToY = (mag) => plotY + plotH - (mag / maxMag) * plotH * 0.9;

    Painter.useCtx((ctx) => {
      const colors = CONFIG.colors.crossSection;
      ctx.save();

      // Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);

      // Filled envelope — traces progressively as samples arrive
      ctx.fillStyle = colors.envelopeColor;
      ctx.beginPath();
      ctx.moveTo(tToX(visible[0].t), plotY + plotH);
      for (const s of visible) ctx.lineTo(tToX(s.t), magToY(s.mag));
      ctx.lineTo(tToX(visible[visible.length - 1].t), plotY + plotH);
      ctx.closePath();
      ctx.fill();

      // Waveform line
      ctx.strokeStyle = colors.waveColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < visible.length; i++) {
        const sx = tToX(visible[i].t);
        const sy = magToY(visible[i].mag);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Zero markers
      for (const zero of this.detectedZeros) {
        if (zero.t >= tStart && zero.t <= tEnd) {
          ctx.fillStyle = colors.zeroColor;
          ctx.beginPath();
          ctx.arc(tToX(zero.t), plotY + plotH, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Current t cursor
      const cursorX = tToX(this.t);
      if (cursorX >= plotX && cursorX <= plotX + plotW) {
        ctx.strokeStyle = colors.cursorColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cursorX, plotY);
        ctx.lineTo(cursorX, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Labels
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#888";
      ctx.fillText("|Z(t)| — Critical Line", plotX, plotY - 10);
      ctx.fillStyle = colors.zeroColor;
      ctx.textAlign = "right";
      ctx.fillText(`t: ${tStart.toFixed(0)}–${tEnd.toFixed(0)}`, plotX + plotW, plotY - 10);
      ctx.textAlign = "left";
      ctx.restore();
    });
  }

  _drawControls(ctx) {
    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      `speed: ${this.tSpeed.toFixed(1)}x | scroll to zoom | +/- speed | space pause | R restart`,
      this.width - 20,
      this.height - 10,
    );
    ctx.textAlign = "left";
  }

  onResize() {
    if (this.infoPanel) {
      applyAnchor(this.infoPanel, {
        anchor: Position.TOP_LEFT,
        anchorOffsetX: Screen.responsive(15, 30, 40),
        anchorOffsetY: Screen.responsive(60, 80, 90),
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new ZetaZerosDemo(canvas);
  demo.start();
});

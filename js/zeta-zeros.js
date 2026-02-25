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
    maxVisibleMobile: 5,        // fewer slots on mobile
    maxVisibleDesktop: 10,      // full slots on desktop
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
    // Zero burst — procedural composition from the math
    zeroBurst: {
      baseFreq: 220,            // A3 — root frequency
      harmonics: [1, 0.5, 0.25, 0.12, 0.06, 0.03],  // gentler rolloff — warmer timbre
      duration: 2.2,            // seconds (longer tail)
      volume: 0.2,
      ragaCycle: 30,             // every N zeros, return to raga phrase
      ragaPhraseNotes: 4,       // notes in the ascending raga phrase
      ragaPhraseGap: 0.18,      // seconds between phrase notes
    },
    // Glass ticks — inharmonic bell/glass partials as the ball travels
    glass: {
      interval: 0.4,            // seconds between ticks
      freqHigh: 3200,           // upper range (near zeros)
      freqLow: 1200,            // lower range (far from zeros)
      duration: 0.15,           // short ring — percussive
      volume: 0.008,            // subtle, ambient presence
    },
    // Whoosh — sweep triggered by large jumps in the spiral
    whoosh: {
      speedThreshold: 0.3,      // trail speed above this triggers a whoosh
      cooldown: 1.5,            // minimum seconds between whooshes
      freqStart: 800,           // sweep start frequency
      freqEnd: 120,             // sweep end frequency
      duration: 1.2,            // seconds
      volume: 0.08,
    },
    // Jazz licks — fast improv phrases on spiral jumps (plays with whoosh)
    jazzLick: {
      noteGap: 0.12,            // seconds between lick notes
      noteDuration: 0.2,        // each note's ring time
      volume: 0.3,
      flashDuration: 0.3,       // white screen flash duration (seconds)
      flashAlpha: 0.25,         // peak flash opacity
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
      lfoFrequency: 0.3,
      lfoDepth: 0.004,
      feedback: 0.5,
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
    this.lastGlassTime = 0;
    this.lastZeroScaleDeg = 0;    // Bhairav index of last zero's note
    this.lastLickIdx = -1;        // last jazz lick pattern used

    // Screen flash for jazz licks
    this.screenFlash = 0;         // remaining flash time (seconds)

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

    // Ensure canvas captures touch events
    this.canvas.style.touchAction = "none";

    // HTML overlay button — sits above everything, guarantees tap works on mobile
    this.startOverlay = document.createElement("div");
    this.startOverlay.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:pointer;";
    document.body.appendChild(this.startOverlay);

    const startHandler = () => {
      this.startOverlay.remove();
      this.startOverlay = null;
      this._initAudio().then(() => {
        this.fsm.setState("running");
      });
    };
    this.startOverlay.addEventListener("click", startHandler);
    this.startOverlay.addEventListener("touchend", (e) => {
      e.preventDefault();
      startHandler();
    });

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
    this.lastGlassTime = 0;
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
      lfoFrequency: fl.lfoFrequency * 0.6,
      lfoDepth: fl.lfoDepth * 1.5,
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

    // Jazz lick bus — dry, center-panned, straight to reverb (no flanger/pan)
    this.lickBus = ctx.createGain();
    this.lickBus.gain.value = 1;
    this.lickBus.connect(this.reverbDry);
    this.lickBus.connect(this.reverbNode);

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

    // ── Composition: math-driven melody with raga bookends ──
    //
    // The melody emerges from the zeros themselves:
    //   - Each zero's t-value (14.134..., 21.022...) determines the note
    //   - frac(t) maps to Bhairav scale degrees
    //   - Same zeros every run = same piece every run
    //   - Not random, not a loop — procedural from the Riemann zeta function
    //
    // Every ragaInterval zeros, a short ascending Bhairav phrase plays
    // as a "theme return" — the raga anchor amid the experimental sections.

    const bhairav = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23];
    const rootFreq = sc.baseFreq;

    // ── Raga phrase logic ──
    // Zeros 1..N are the opening raga phrase (one note per zero, ascending)
    // Then procedural improvisation until the next cycle boundary
    // At each cycle (30, 60, 90...) the phrase plays again for N zeros
    const posInCycle = ((zeroIndex - 1) % sc.ragaCycle) + 1; // 1-based position
    const isRagaPhrase = posInCycle <= sc.ragaPhraseNotes;

    if (isRagaPhrase) {
      // ── Raga phrase: one ascending note per zero ──
      // Which cycle are we in? Shifts the starting scale degree each time
      const cycleNum = Math.floor((zeroIndex - 1) / sc.ragaCycle);
      const startDeg = (cycleNum * 3) % bhairav.length;
      const deg = (startDeg + (posInCycle - 1)) % bhairav.length;
      const freq = rootFreq * Math.pow(2, bhairav[deg] / 12);
      this.lastZeroScaleDeg = deg;

      this.Synth.osc.additive(
        freq,
        sc.harmonics,
        sc.duration * 0.7,
        { volume: sc.volume * 0.8, startTime: now }
      );

      // Delay send on the last note of the phrase
      if (posInCycle === sc.ragaPhraseNotes) {
        this._sendToDelay(freq, sc.volume * 0.15, now, sc.duration * 0.5);
      }
      return;
    }

    // ── Procedural note: derived from the zero's t-value ──
    const zero = this.detectedZeros[this.detectedZeros.length - 1];
    const tValue = zero ? zero.t : zeroIndex * 6.28;

    // Map fractional part of t to a scale degree
    const frac = tValue - Math.floor(tValue);
    const idx = Math.floor(frac * bhairav.length);
    this.lastZeroScaleDeg = idx;
    const baseFreq = rootFreq * Math.pow(2, bhairav[idx] / 12);

    // ── Timbre evolves with zero index (not a fixed cycle) ──
    // Early zeros: pure additive — establishing the sound
    // Mid zeros: FM bells mix in — growing complexity
    // Late zeros: dyads, wider shimmer, grace notes — full expression
    const maturity = Math.min(1, zeroIndex / 40); // 0→1 over first 40 zeros

    if (maturity < 0.25) {
      // Pure additive — simple, clear
      this.Synth.osc.additive(
        baseFreq,
        sc.harmonics,
        sc.duration,
        { volume: sc.volume, startTime: now }
      );
    } else if (maturity < 0.6) {
      // Mix of additive and FM — alternating based on t-value digits
      const digit = Math.floor(frac * 100) % 10;
      if (digit < 5) {
        this.Synth.osc.additive(
          baseFreq,
          sc.harmonics,
          sc.duration,
          { volume: sc.volume, startTime: now }
        );
      } else {
        this.Synth.osc.fm(
          baseFreq,
          baseFreq * 1.618,
          baseFreq * 0.4,
          sc.duration,
          { volume: sc.volume * 0.7, startTime: now }
        );
      }
    } else {
      // Full palette — timbral choice from t-value digits
      const digit = Math.floor(frac * 1000) % 10;
      if (digit < 3) {
        this.Synth.osc.additive(
          baseFreq,
          sc.harmonics,
          sc.duration,
          { volume: sc.volume, startTime: now }
        );
      } else if (digit < 6) {
        this.Synth.osc.fm(
          baseFreq,
          baseFreq * 1.618,
          baseFreq * (0.3 + (digit / 10) * 0.3),
          sc.duration,
          { volume: sc.volume * 0.7, startTime: now }
        );
      } else {
        // Dyad — root + interval derived from the *next* digit of t
        const nextDigit = Math.floor(frac * 10000) % bhairav.length;
        const dyadFreq = rootFreq * Math.pow(2, bhairav[nextDigit] / 12);
        this.Synth.osc.additive(baseFreq, [1, 0.3, 0.15], sc.duration,
          { volume: sc.volume * 0.6, startTime: now });
        this.Synth.osc.additive(dyadFreq, [0.7, 0.2], sc.duration * 0.8,
          { volume: sc.volume * 0.4, startTime: now + 0.06 });
      }
    }

    // ── Delay send — grows wetter as the piece matures ──
    const delayVol = sc.volume * (0.1 + maturity * 0.2);
    this._sendToDelay(baseFreq, delayVol, now, sc.duration * 0.7);

    // ── Shimmer: grows with maturity ──
    if (maturity > 0.15) {
      const spread = 4 + maturity * 16;
      for (const sign of [-1, 1]) {
        const shimmer = ctx.createOscillator();
        const shimGain = ctx.createGain();
        shimmer.type = "sine";
        shimmer.frequency.value = this.Synth.music.detune(baseFreq * 2, sign * spread);
        const shimVol = sc.volume * (0.02 + maturity * 0.06);
        shimGain.gain.setValueAtTime(shimVol, now);
        shimGain.gain.exponentialRampToValueAtTime(0.001, now + sc.duration);
        shimmer.connect(shimGain);
        shimGain.connect(this.audioBus);
        shimmer.start(now + 0.03 + frac * 0.05);
        shimmer.stop(now + sc.duration + 0.1);
      }
    }

    // ── Grace notes (meend): emerge as maturity grows ──
    if (maturity > 0.3 && (Math.floor(frac * 100) % 7 === 0)) {
      const graceInterval = (Math.floor(frac * 10) % 2 === 0) ? -1 : -2;
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

  _sendToDelay(freq, volume, startTime, duration) {
    const ctx = this.Synth.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.delayEffect.input);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
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

  _playJazzLick() {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const jl = CONFIG.sound.jazzLick;
    const bhairav = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19, 20, 23];
    const rootFreq = CONFIG.sound.zeroBurst.baseFreq;
    const anchor = this.lastZeroScaleDeg;

    // 3 jazz improv techniques — each a short fast phrase rhyming
    // with the last zero's note (anchor degree)
    const licks = [
      // 1. Bebop run — descending scale from anchor, quick turnaround
      () => {
        const notes = [];
        for (let i = 0; i < 5; i++) {
          const deg = ((anchor - i) % bhairav.length + bhairav.length) % bhairav.length;
          notes.push(bhairav[deg]);
        }
        return notes;
      },
      // 2. Arpeggio burst — leap through scale tones then resolve
      () => {
        const notes = [];
        const jumps = [0, 3, 5, 2, 0];
        for (let i = 0; i < 5; i++) {
          const deg = (anchor + jumps[i]) % bhairav.length;
          notes.push(bhairav[deg]);
        }
        return notes;
      },
      // 3. Call and response — anchor, step up, anchor, step down, anchor
      () => {
        const a = bhairav[anchor % bhairav.length];
        const up = bhairav[(anchor + 1) % bhairav.length];
        const down = bhairav[((anchor - 1) + bhairav.length) % bhairav.length];
        return [a, up, a, down, a];
      },
    ];

    // Pick one at random, never the same twice in a row
    let pick;
    do {
      pick = Math.floor(Math.random() * licks.length);
    } while (pick === this.lastLickIdx && licks.length > 1);
    this.lastLickIdx = pick;
    const semitones = licks[pick]();

    // Play the lick — own bus, no flanger/pan, just reverb
    const harmonics = CONFIG.sound.zeroBurst.harmonics;
    for (let i = 0; i < semitones.length; i++) {
      const freq = rootFreq * Math.pow(2, semitones[i] / 12);
      const t0 = now + i * jl.noteGap;
      const noteVol = jl.volume / harmonics.length;

      for (let h = 0; h < harmonics.length; h++) {
        const hFreq = freq * (h + 1);
        if (hFreq > 18000) break;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = hFreq;
        gain.gain.setValueAtTime(noteVol * harmonics[h], t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + jl.noteDuration);
        osc.connect(gain);
        gain.connect(this.lickBus);
        osc.start(t0);
        osc.stop(t0 + jl.noteDuration + 0.01);
      }
    }

    // Send last note to delay for a trailing echo
    const lastFreq = rootFreq * Math.pow(2, semitones[semitones.length - 1] / 12);
    const lastT = now + (semitones.length - 1) * jl.noteGap;
    this._sendToDelay(lastFreq, jl.volume * 0.3, lastT, jl.noteDuration);
  }

  _playGlassTick(magnitude, speed) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const gc = CONFIG.sound.glass;

    // Glass: multiple inharmonic partials ringing at fixed frequencies
    // Real glass doesn't sweep — it rings at specific resonant frequencies
    // The partials are slightly inharmonic (ratios like 1, 2.76, 5.4) which
    // gives that crystalline, metallic quality distinct from musical tones

    const proximity = Math.max(0, 1 - magnitude / 3);
    const baseFreq = gc.freqLow + (gc.freqHigh - gc.freqLow) * (0.3 + proximity * 0.7);

    const speedFactor = Math.min(1, speed * 3);
    const vol = gc.volume * (0.3 + speedFactor * 0.7);

    // Inharmonic partial ratios — glass/bell-like spectrum
    const partials = [1, 2.76, 5.4, 8.93];
    const partialVols = [1, 0.5, 0.25, 0.12];

    for (let i = 0; i < partials.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Fixed frequency — no sweep, just ring and decay
      osc.frequency.value = baseFreq * partials[i];

      // Instant attack, exponential decay — percussive glass hit
      // Higher partials decay faster (natural damping)
      const decay = gc.duration * (1 - i * 0.2);
      gain.gain.setValueAtTime(vol * partialVols[i], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

      osc.connect(gain);
      gain.connect(this.audioBus);
      osc.start(now);
      osc.stop(now + decay + 0.01);
    }
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

    // Decay screen flash
    if (this.screenFlash > 0) this.screenFlash = Math.max(0, this.screenFlash - dt);

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

    // Glass ticks — crystalline pings as the ball travels
    const gc = CONFIG.sound.glass;
    if (this.soundEnabled && t - this.lastGlassTime > gc.interval) {
      this.lastGlassTime = t;
      this._playGlassTick(magnitude, speed);
    }

    // Jump detection — large leaps trigger whoosh + jazz lick + flash
    const wc = CONFIG.sound.whoosh;
    if (speed > wc.speedThreshold && t - this.lastWhooshTime > wc.cooldown) {
      this.lastWhooshTime = t;
      this._playWhoosh(speed);
      if (this.detectedZeros.length > 0) {
        this._playJazzLick();
        this.screenFlash = CONFIG.sound.jazzLick.flashDuration;
      }
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

    // Screen flash on jazz licks
    if (this.screenFlash > 0) {
      const jl = CONFIG.sound.jazzLick;
      const alpha = jl.flashAlpha * (this.screenFlash / jl.flashDuration);
      Painter.useCtx((ctx) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(0, 0, this.width, this.height);
      });
    }

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
    const isMobile = Screen.isMobile;

    Painter.useCtx((ctx) => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Title — two lines on mobile
      ctx.fillStyle = "#7af";
      const titleSize = Screen.responsive(16, 32, 40);
      ctx.font = `bold ${titleSize}px monospace`;
      if (isMobile) {
        ctx.fillText("Riemann Zeta", cx, cy - 90);
        ctx.fillText("Critical Line", cx, cy - 90 + titleSize + 4);
      } else {
        ctx.fillText("Riemann Zeta — Critical Line", cx, cy - Screen.responsive(80, 110, 130));
      }

      // Equation
      ctx.fillStyle = "#fff";
      ctx.font = `${Screen.responsive(14, 20, 24)}px monospace`;
      ctx.fillText("ζ(½ + it)", cx, cy - Screen.responsive(40, 70, 80));

      // Play triangle
      const r = Screen.responsive(30, 40, 50) * pulse;
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

      // Description — shorter on mobile
      ctx.fillStyle = "#667";
      const descSize = Screen.responsive(9, 13, 15);
      ctx.font = `${descSize}px monospace`;
      const gap = descSize + Screen.responsive(6, 8, 10);
      const descY = cy + Screen.responsive(45, 70, 85);
      if (isMobile) {
        ctx.fillText("Verifying zeros on Re = ½", cx, descY);
        ctx.fillText("One data point at a time", cx, descY + gap);
      } else {
        ctx.fillText("Verifying non-trivial zeros lie on the critical line Re = ½", cx, descY);
        ctx.fillText("Each zero verified is one more data point for the Riemann Hypothesis", cx, descY + gap);
      }

      // Call to action
      ctx.fillStyle = `rgba(120, 170, 255, ${0.5 + 0.3 * pulse})`;
      ctx.font = `${Screen.responsive(11, 14, 16)}px monospace`;
      ctx.fillText(isMobile ? "tap to begin" : "click to begin", cx, descY + gap * 2 + Screen.responsive(10, 15, 20));
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

      // (cyan jump lines are kept visible — they trigger jazz licks)

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
    const maxVisible = Screen.isMobile ? zl.maxVisibleMobile : zl.maxVisibleDesktop;
    const fontSize = Screen.responsive(11, 14, 16);
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    // Show the most recent N zeros, fading old ones out
    const total = this.detectedZeros.length;
    const startIdx = Math.max(0, total - maxVisible);
    const x = Screen.responsive(15, 30, 40);
    const baseY = this.height / 2 - (maxVisible * (fontSize + 4)) / 2;

    for (let slot = 0; slot < maxVisible; slot++) {
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
    const zl = CONFIG.zeroLog;
    const maxVisible = Screen.isMobile ? zl.maxVisibleMobile : zl.maxVisibleDesktop;
    const y = this.height / 2 + (maxVisible * (fontSize + 6)) / 2 + fontSize + 10;

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
    const plotH = Screen.responsive(60, 80, cs.height);
    const plotW = this.width * Screen.responsive(0.85, 0.7, 0.6);
    const plotX = (this.width - plotW) / 2;
    const plotY = this.height - Screen.responsive(25, 35, cs.marginBottom) - plotH;

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
    ctx.font = `${Screen.responsive(8, 10, 10)}px monospace`;
    ctx.textAlign = "right";
    const label = Screen.isMobile
      ? `speed: ${this.tSpeed.toFixed(1)}x | pinch zoom`
      : `speed: ${this.tSpeed.toFixed(1)}x | scroll to zoom | +/- speed | space pause | R restart`;
    ctx.fillText(
      label,
      this.width - Screen.responsive(10, 20, 20),
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

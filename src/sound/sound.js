/**
 * Sound - Stateless sound generation primitives
 * Similar to Motion class for animation, provides quick sound effects
 * @module sound/sound
 */
import { Synth } from "./synth.js";

export class Sound {
  /**
   * Generate a beep/blip sound effect
   * @param {number} [frequency=440] - Frequency in Hz
   * @param {number} [duration=0.1] - Duration in seconds
   * @param {Object} [options] - Sound options
   */
  static beep(frequency = 440, duration = 0.1, options = {}) {
    if (!Synth.isInitialized) return;

    const { volume = 0.3, type = "sine" } = options;
    Synth.osc.tone(frequency, duration, {
      type,
      volume,
      attack: 0.001,
      decay: duration * 0.8,
      sustain: 0,
      release: duration * 0.2,
    });
  }

  /**
   * Generate a click/tick sound
   * @param {number} [volume=0.3] - Volume (0-1)
   */
  static click(volume = 0.3) {
    if (!Synth.isInitialized) return;

    Synth.osc.tone(1000, 0.01, {
      type: "square",
      volume,
      attack: 0.001,
      decay: 0.009,
      sustain: 0,
      release: 0.001,
    });
  }

  /**
   * Generate a sweep sound (rising or falling)
   * @param {number} startFreq - Starting frequency
   * @param {number} endFreq - Ending frequency
   * @param {number} duration - Duration in seconds
   * @param {Object} [options] - Options
   */
  static sweep(startFreq, endFreq, duration, options = {}) {
    if (!Synth.isInitialized) return;

    const { volume = 0.3, type = "sine" } = options;
    Synth.osc.sweep(startFreq, endFreq, duration, { type, volume });
  }

  /**
   * Play a note from scale based on value
   * Perfect for mapping visual data to sound
   * @param {number} value - Value (0-1)
   * @param {Object} [options] - Options
   */
  static fromValue(value, options = {}) {
    if (!Synth.isInitialized) return;

    const {
      root = "C4",
      scale = "pentatonic",
      octaves = 2,
      duration = 0.2,
      volume = 0.3,
      type = "sine",
    } = options;

    const freq = Synth.music.mapToScale(value, root, scale, octaves);
    Synth.osc.tone(freq, duration, { volume, type });
  }

  /**
   * Collision/impact sound
   * @param {number} [intensity=0.5] - Impact intensity (0-1)
   */
  static impact(intensity = 0.5) {
    if (!Synth.isInitialized) return;

    const freq = 80 + intensity * 200;
    const duration = 0.05 + intensity * 0.15;

    // Low thud
    Synth.osc.tone(freq, duration, {
      type: "sine",
      volume: 0.4 * intensity,
      attack: 0.001,
      decay: duration,
      sustain: 0,
      release: 0.02,
    });

    // Add noise burst
    const noise = Synth.noise.white(Synth.ctx, 0.08);
    const noiseGain = Synth.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25 * intensity, Synth.now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, Synth.now + 0.08);

    noise.connect(noiseGain);
    noiseGain.connect(Synth.master);
    noise.start();
    noise.stop(Synth.now + 0.1);
  }

  /**
   * Explosion sound effect
   * @param {number} [intensity=0.7] - Explosion intensity (0-1)
   */
  static explosion(intensity = 0.7) {
    if (!Synth.isInitialized) return;

    const duration = 0.3 + intensity * 0.4;

    // Low rumble
    Synth.osc.tone(50 + intensity * 30, duration, {
      type: "sine",
      volume: 0.4 * intensity,
      attack: 0.001,
      decay: duration * 0.3,
      sustain: 0.3,
      release: duration * 0.7,
    });

    // Noise burst
    const noise = Synth.noise.brown(Synth.ctx, duration);
    const noiseGain = Synth.ctx.createGain();
    const filter = Synth.fx.filter("lowpass", 800 + intensity * 400, 1);

    noiseGain.gain.setValueAtTime(0.5 * intensity, Synth.now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, Synth.now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(Synth.master);
    noise.start();
    noise.stop(Synth.now + duration + 0.1);
  }

  /**
   * Laser/shoot sound effect
   * @param {Object} [options] - Options
   */
  static laser(options = {}) {
    if (!Synth.isInitialized) return;

    const {
      startFreq = 1200,
      endFreq = 200,
      duration = 0.15,
      volume = 0.25,
      type = "sawtooth",
    } = options;

    Synth.osc.sweep(startFreq, endFreq, duration, { type, volume });
  }

  /**
   * Power-up sound effect
   * @param {Object} [options] - Options
   */
  static powerUp(options = {}) {
    if (!Synth.isInitialized) return;

    const {
      startFreq = 300,
      endFreq = 1200,
      duration = 0.3,
      volume = 0.3,
    } = options;

    // Rising sweep with harmonics
    Synth.osc.sweep(startFreq, endFreq, duration, { type: "square", volume });
    Synth.osc.sweep(startFreq * 1.5, endFreq * 1.5, duration, {
      type: "sine",
      volume: volume * 0.5,
    });
  }

  /**
   * Hurt/damage sound effect
   * @param {number} [intensity=0.5] - Damage intensity (0-1)
   */
  static hurt(intensity = 0.5) {
    if (!Synth.isInitialized) return;

    // Low thump
    Synth.osc.tone(80 + intensity * 40, 0.1, {
      type: "sine",
      volume: 0.4 * intensity,
      attack: 0.001,
      decay: 0.08,
      sustain: 0,
      release: 0.02,
    });

    // Distorted mid
    Synth.osc.tone(200 + intensity * 100, 0.08, {
      type: "sawtooth",
      volume: 0.2 * intensity,
      attack: 0.001,
      decay: 0.06,
      sustain: 0,
      release: 0.02,
    });
  }

  /**
   * Coin/pickup sound effect
   * @param {Object} [options] - Options
   */
  static coin(options = {}) {
    if (!Synth.isInitialized) return;

    const { baseFreq = 987.77, volume = 0.25 } = options; // B5

    // Two quick notes
    Synth.osc.tone(baseFreq, 0.08, {
      type: "square",
      volume,
      attack: 0.001,
      decay: 0.05,
      sustain: 0.3,
      release: 0.02,
    });

    // Second note slightly delayed and higher
    setTimeout(() => {
      if (Synth.isInitialized) {
        Synth.osc.tone(baseFreq * 1.5, 0.12, {
          type: "square",
          volume,
          attack: 0.001,
          decay: 0.08,
          sustain: 0.2,
          release: 0.04,
        });
      }
    }, 80);
  }

  /**
   * Jump sound effect
   * @param {Object} [options] - Options
   */
  static jump(options = {}) {
    if (!Synth.isInitialized) return;

    const { startFreq = 150, endFreq = 400, duration = 0.15, volume = 0.25 } = options;

    Synth.osc.sweep(startFreq, endFreq, duration, {
      type: "square",
      volume,
    });
  }

  /**
   * Menu select/confirm sound
   * @param {Object} [options] - Options
   */
  static select(options = {}) {
    if (!Synth.isInitialized) return;

    const { frequency = 660, volume = 0.2 } = options;

    Synth.osc.tone(frequency, 0.08, {
      type: "sine",
      volume,
      attack: 0.001,
      decay: 0.05,
      sustain: 0.3,
      release: 0.03,
    });
  }

  /**
   * Error/denied sound
   * @param {Object} [options] - Options
   */
  static error(options = {}) {
    if (!Synth.isInitialized) return;

    const { volume = 0.25 } = options;

    // Two descending notes
    Synth.osc.tone(400, 0.1, {
      type: "square",
      volume,
      attack: 0.001,
      decay: 0.08,
      sustain: 0,
      release: 0.02,
    });

    setTimeout(() => {
      if (Synth.isInitialized) {
        Synth.osc.tone(300, 0.15, {
          type: "square",
          volume,
          attack: 0.001,
          decay: 0.12,
          sustain: 0,
          release: 0.03,
        });
      }
    }, 100);
  }

  /**
   * Ambient drone generator
   * @param {string} [root='C2'] - Root note
   * @param {Object} [options] - Options
   * @returns {Object|null} Controller to stop/modify the drone
   */
  static drone(root = "C2", options = {}) {
    if (!Synth.isInitialized) return null;

    const { volume = 0.2, richness = 0.5 } = options;
    const freq = Synth.music.noteToFreq(root);

    // Create layered oscillators
    const oscs = [];
    const gains = [];
    const frequencies = [freq, freq * 1.5, freq * 2, freq * 3];
    const volumes = [1, 0.5 * richness, 0.3 * richness, 0.2 * richness];

    frequencies.forEach((f, i) => {
      const osc = Synth.ctx.createOscillator();
      const gain = Synth.ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.value = volumes[i] * volume;

      osc.connect(gain);
      gain.connect(Synth.master);
      osc.start();

      oscs.push(osc);
      gains.push(gain);
    });

    return {
      stop: (fadeTime = 0.5) => {
        const now = Synth.now;
        gains.forEach((g) => {
          g.gain.linearRampToValueAtTime(0, now + fadeTime);
        });
        setTimeout(
          () => {
            oscs.forEach((o) => {
              try {
                o.stop();
              } catch (e) {
                /* already stopped */
              }
            });
          },
          fadeTime * 1000 + 100
        );
      },
      setVolume: (v) => {
        gains.forEach((g, i) => {
          g.gain.linearRampToValueAtTime(volumes[i] * v, Synth.now + 0.1);
        });
      },
    };
  }

  /**
   * Play a musical note
   * @param {string} note - Note name (e.g., 'C4', 'A#3')
   * @param {number} [duration=0.5] - Duration in seconds
   * @param {Object} [options] - Options
   */
  static note(note, duration = 0.5, options = {}) {
    if (!Synth.isInitialized) return;

    const { volume = 0.3, type = "sine", envelope = {} } = options;
    const freq = Synth.music.noteToFreq(note);

    Synth.osc.tone(freq, duration, {
      type,
      volume,
      ...Synth.env.presets.pluck,
      ...envelope,
    });
  }

  /**
   * Play a chord
   * @param {string} root - Root note (e.g., 'C4')
   * @param {string} [chordType='major'] - Chord type
   * @param {number} [duration=0.5] - Duration in seconds
   * @param {Object} [options] - Options
   */
  static chord(root, chordType = "major", duration = 0.5, options = {}) {
    if (!Synth.isInitialized) return;

    const { volume = 0.2, type = "sine", strum = 0 } = options;
    const frequencies = Synth.music.chord(root, chordType);

    frequencies.forEach((freq, i) => {
      const delay = strum * i;
      Synth.osc.tone(freq, duration, {
        type,
        volume: volume / frequencies.length,
        attack: 0.01,
        decay: 0.1,
        sustain: 0.6,
        release: 0.2,
        startTime: Synth.now + delay,
      });
    });
  }

  /**
   * Play notes in a sequence
   * @param {string[]} notes - Array of note names
   * @param {number} [noteDuration=0.2] - Duration per note
   * @param {number} [gap=0] - Gap between notes
   * @param {Object} [options] - Options
   */
  static sequence(notes, noteDuration = 0.2, gap = 0, options = {}) {
    if (!Synth.isInitialized) return;

    const { volume = 0.3, type = "sine" } = options;
    const totalNoteTime = noteDuration + gap;

    notes.forEach((note, i) => {
      const startTime = Synth.now + i * totalNoteTime;
      const freq = Synth.music.noteToFreq(note);

      Synth.osc.tone(freq, noteDuration, {
        type,
        volume,
        attack: 0.01,
        decay: 0.05,
        sustain: 0.5,
        release: 0.1,
        startTime,
      });
    });
  }

  /**
   * Win/victory fanfare
   */
  static win() {
    if (!Synth.isInitialized) return;

    const notes = ["C5", "E5", "G5", "C6"];
    this.sequence(notes, 0.15, 0.05, { volume: 0.25, type: "square" });
  }

  /**
   * Lose/game over sound
   */
  static lose() {
    if (!Synth.isInitialized) return;

    const notes = ["E4", "D4", "C4"];
    this.sequence(notes, 0.25, 0, { volume: 0.25, type: "sawtooth" });
  }
}

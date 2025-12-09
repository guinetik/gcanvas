/**
 * SynthOscillators - Oscillator generation and management
 * @module sound/synth.oscillators
 */
import { SynthEnvelope } from "./synth.envelope.js";

export class SynthOscillators {
  static #_ctx = null;
  static #_output = null;

  /**
   * Initialize the oscillators module
   * @param {AudioContext} ctx - Audio context
   * @param {AudioNode} output - Output node
   */
  static init(ctx, output) {
    this.#_ctx = ctx;
    this.#_output = output;
  }

  /**
   * Get the audio context
   * @returns {AudioContext}
   */
  static get ctx() {
    return this.#_ctx;
  }

  /**
   * Get current audio time
   * @returns {number}
   */
  static get now() {
    return this.#_ctx.currentTime;
  }

  /**
   * Play a simple tone
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {Object} options - Tone options
   * @returns {OscillatorNode} The created oscillator
   */
  static tone(frequency, duration, options = {}) {
    const {
      type = "sine",
      volume = 0.5,
      attack = 0.01,
      decay = 0.1,
      sustain = 0.7,
      release = 0.2,
      detune = 0,
      startTime = this.#_ctx.currentTime,
    } = options;

    const osc = this.#_ctx.createOscillator();
    const gain = this.#_ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    osc.detune.setValueAtTime(detune, startTime);

    // Apply ADSR envelope
    SynthEnvelope.applyADSR(gain.gain, {
      attack,
      decay,
      sustain,
      release,
      startTime,
      duration,
      peakVolume: volume,
    });

    osc.connect(gain);
    gain.connect(this.#_output);

    osc.start(startTime);
    osc.stop(startTime + duration + release);

    return osc;
  }

  /**
   * Create a continuous oscillator (for real-time control)
   * @param {Object} options - Oscillator options
   * @returns {Object} Controller object with frequency, volume, stop methods
   */
  static continuous(options = {}) {
    const { type = "sine", frequency = 440, volume = 0.5 } = options;

    const osc = this.#_ctx.createOscillator();
    const gain = this.#_ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(this.#_output);
    osc.start();

    const ctx = this.#_ctx;

    return {
      osc,
      gain,
      setFrequency: (f, ramp = 0) => {
        if (ramp > 0) {
          osc.frequency.linearRampToValueAtTime(f, ctx.currentTime + ramp);
        } else {
          osc.frequency.setValueAtTime(f, ctx.currentTime);
        }
      },
      setVolume: (v, ramp = 0) => {
        if (ramp > 0) {
          gain.gain.linearRampToValueAtTime(v, ctx.currentTime + ramp);
        } else {
          gain.gain.setValueAtTime(v, ctx.currentTime);
        }
      },
      stop: (time = 0) => {
        if (time > 0) {
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + time);
          osc.stop(ctx.currentTime + time + 0.01);
        } else {
          osc.stop();
        }
      },
    };
  }

  /**
   * FM Synthesis - Frequency modulation for rich timbres
   * @param {number} carrierFreq - Carrier frequency
   * @param {number} modFreq - Modulator frequency
   * @param {number} modDepth - Modulation depth
   * @param {number} duration - Duration in seconds
   * @param {Object} options - Additional options
   * @returns {Object} Carrier and modulator oscillators
   */
  static fm(carrierFreq, modFreq, modDepth, duration, options = {}) {
    const { volume = 0.5, startTime = this.#_ctx.currentTime } = options;

    const carrier = this.#_ctx.createOscillator();
    const modulator = this.#_ctx.createOscillator();
    const modGain = this.#_ctx.createGain();
    const outputGain = this.#_ctx.createGain();

    modulator.frequency.value = modFreq;
    modGain.gain.value = modDepth;
    carrier.frequency.value = carrierFreq;
    outputGain.gain.value = volume;

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(outputGain);
    outputGain.connect(this.#_output);

    // Apply envelope to output
    outputGain.gain.setValueAtTime(volume, startTime);
    outputGain.gain.linearRampToValueAtTime(0, startTime + duration);

    modulator.start(startTime);
    carrier.start(startTime);
    modulator.stop(startTime + duration + 0.1);
    carrier.stop(startTime + duration + 0.1);

    return { carrier, modulator, outputGain };
  }

  /**
   * Additive synthesis - Combine harmonics
   * @param {number} fundamental - Base frequency
   * @param {Array<number>} harmonics - Array of harmonic amplitudes [1st, 2nd, 3rd...]
   * @param {number} duration - Duration in seconds
   * @param {Object} options - Additional options
   * @returns {OscillatorNode[]} Array of oscillators
   */
  static additive(fundamental, harmonics, duration, options = {}) {
    const { volume = 0.5, startTime = this.#_ctx.currentTime } = options;
    const oscs = [];
    const merger = this.#_ctx.createGain();
    merger.gain.value = volume / harmonics.length;
    merger.connect(this.#_output);

    // Apply envelope
    merger.gain.setValueAtTime(volume / harmonics.length, startTime);
    merger.gain.linearRampToValueAtTime(0, startTime + duration);

    harmonics.forEach((amp, i) => {
      if (amp > 0) {
        const osc = this.#_ctx.createOscillator();
        const gain = this.#_ctx.createGain();

        osc.frequency.value = fundamental * (i + 1);
        gain.gain.value = amp;

        osc.connect(gain);
        gain.connect(merger);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
        oscs.push(osc);
      }
    });

    return oscs;
  }

  /**
   * Play a frequency sweep
   * @param {number} startFreq - Starting frequency
   * @param {number} endFreq - Ending frequency
   * @param {number} duration - Duration in seconds
   * @param {Object} options - Additional options
   * @returns {OscillatorNode} The oscillator
   */
  static sweep(startFreq, endFreq, duration, options = {}) {
    const {
      type = "sine",
      volume = 0.5,
      exponential = true,
      startTime = this.#_ctx.currentTime,
    } = options;

    const osc = this.#_ctx.createOscillator();
    const gain = this.#_ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);

    if (exponential && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);
    } else {
      osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
    }

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.#_output);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);

    return osc;
  }

  /**
   * Create pulse wave with variable duty cycle
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {number} dutyCycle - Duty cycle (0-1, 0.5 = square wave)
   * @param {Object} options - Additional options
   * @returns {Object} Oscillator controller
   */
  static pulse(frequency, duration, dutyCycle = 0.5, options = {}) {
    const { volume = 0.5, startTime = this.#_ctx.currentTime } = options;

    // Create pulse wave using two sawtooth waves
    const osc1 = this.#_ctx.createOscillator();
    const osc2 = this.#_ctx.createOscillator();
    const gain1 = this.#_ctx.createGain();
    const gain2 = this.#_ctx.createGain();
    const output = this.#_ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "sawtooth";
    osc1.frequency.value = frequency;
    osc2.frequency.value = frequency;

    // Phase offset determines duty cycle
    const phaseOffset = dutyCycle * 2 - 1;
    gain1.gain.value = 0.5;
    gain2.gain.value = -0.5;

    output.gain.setValueAtTime(volume, startTime);
    output.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(output);
    gain2.connect(output);
    output.connect(this.#_output);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.01);
    osc2.stop(startTime + duration + 0.01);

    return { osc1, osc2, output };
  }
}

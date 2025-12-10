/**
 * Synth - Static utility class for procedural audio generation
 * Provides a clean API for Web Audio operations with GCanvas integration
 *
 * Similar to Painter for canvas, Synth abstracts Web Audio complexity
 * @module sound/synth
 */
import { SynthOscillators } from "./synth.oscillators.js";
import { SynthEffects } from "./synth.effects.js";
import { SynthEnvelope } from "./synth.envelope.js";
import { SynthNoise } from "./synth.noise.js";
import { SynthMusical } from "./synth.musical.js";
import { SynthAnalyzer } from "./synth.analyzer.js";

export class Synth {
  static #_ctx = null;
  static #_masterGain = null;
  static #_initialized = false;

  /**
   * Initialize the audio system
   * @param {Object} options - Configuration options
   * @param {number} [options.masterVolume=0.5] - Master volume (0-1)
   * @param {number} [options.sampleRate=44100] - Sample rate
   * @param {boolean} [options.enableAnalyzer=false] - Enable audio analyzer
   */
  static init(options = {}) {
    if (this.#_initialized) {
      console.warn("[Synth] Already initialized");
      return;
    }

    const { masterVolume = 0.5, sampleRate = 44100, enableAnalyzer = false } = options;

    try {
      this.#_ctx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate,
      });

      this.#_masterGain = this.#_ctx.createGain();
      this.#_masterGain.gain.value = masterVolume;
      this.#_masterGain.connect(this.#_ctx.destination);

      // Initialize sub-modules
      SynthOscillators.init(this.#_ctx, this.#_masterGain);
      SynthEffects.init(this.#_ctx, this.#_masterGain);

      if (enableAnalyzer) {
        SynthAnalyzer.init(this.#_ctx, this.#_masterGain);
      }

      this.#_initialized = true;
      console.log("[Synth] Audio system initialized");
    } catch (e) {
      console.error("[Synth] Failed to initialize audio:", e);
    }
  }

  /**
   * Check if audio is initialized
   * @returns {boolean}
   */
  static get isInitialized() {
    return this.#_initialized;
  }

  /**
   * Get the AudioContext
   * @returns {AudioContext|null}
   */
  static get ctx() {
    return this.#_ctx;
  }

  /**
   * Get the master gain node
   * @returns {GainNode|null}
   */
  static get master() {
    return this.#_masterGain;
  }

  /**
   * Get oscillator utilities
   * @returns {typeof SynthOscillators}
   */
  static get osc() {
    return SynthOscillators;
  }

  /**
   * Get effects utilities
   * @returns {typeof SynthEffects}
   */
  static get fx() {
    return SynthEffects;
  }

  /**
   * Get envelope utilities
   * @returns {typeof SynthEnvelope}
   */
  static get env() {
    return SynthEnvelope;
  }

  /**
   * Get noise utilities
   * @returns {typeof SynthNoise}
   */
  static get noise() {
    return SynthNoise;
  }

  /**
   * Get musical utilities
   * @returns {typeof SynthMusical}
   */
  static get music() {
    return SynthMusical;
  }

  /**
   * Get analyzer utilities
   * @returns {typeof SynthAnalyzer}
   */
  static get analyzer() {
    return SynthAnalyzer;
  }

  /**
   * Resume audio context (required after user interaction)
   * @returns {Promise<void>}
   */
  static async resume() {
    if (this.#_ctx && this.#_ctx.state === "suspended") {
      await this.#_ctx.resume();
      console.log("[Synth] Audio context resumed");
    }
  }

  /**
   * Suspend audio context
   * @returns {Promise<void>}
   */
  static async suspend() {
    if (this.#_ctx && this.#_ctx.state === "running") {
      await this.#_ctx.suspend();
    }
  }

  /**
   * Get current audio time (for scheduling)
   * @returns {number}
   */
  static get now() {
    return this.#_ctx ? this.#_ctx.currentTime : 0;
  }

  /**
   * Get audio context state
   * @returns {string} 'suspended' | 'running' | 'closed'
   */
  static get state() {
    return this.#_ctx ? this.#_ctx.state : "closed";
  }

  /**
   * Set master volume
   * @param {number} value - Volume (0-1)
   */
  static set volume(value) {
    if (this.#_masterGain) {
      this.#_masterGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, value)),
        this.#_ctx.currentTime
      );
    }
  }

  /**
   * Get master volume
   * @returns {number}
   */
  static get volume() {
    return this.#_masterGain ? this.#_masterGain.gain.value : 0;
  }

  /**
   * Create a custom audio node chain
   * @param {...AudioNode} nodes - Nodes to connect in sequence
   * @returns {Object} First and last node references
   */
  static chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].connect(nodes[i + 1]);
    }
    return {
      first: nodes[0],
      last: nodes[nodes.length - 1],
      connectTo: (target) => nodes[nodes.length - 1].connect(target),
    };
  }

  /**
   * Schedule a function to run at a specific audio time
   * @param {Function} fn - Function to execute
   * @param {number} time - Audio time to execute at
   * @returns {number} setTimeout ID for cancellation
   */
  static schedule(fn, time) {
    const delay = Math.max(0, (time - this.now) * 1000);
    return setTimeout(fn, delay);
  }

  /**
   * Close the audio context and cleanup
   */
  static async close() {
    if (this.#_ctx) {
      SynthAnalyzer.dispose();
      await this.#_ctx.close();
      this.#_ctx = null;
      this.#_masterGain = null;
      this.#_initialized = false;
      console.log("[Synth] Audio system closed");
    }
  }
}

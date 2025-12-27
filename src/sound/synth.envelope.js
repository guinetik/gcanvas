/**
 * SynthEnvelope - ADSR envelope utilities
 * @module sound/synth.envelope
 */
export class SynthEnvelope {
  /**
   * Apply ADSR envelope to an AudioParam
   * @param {AudioParam} param - The parameter to modulate
   * @param {Object} options - Envelope options
   * @param {number} [options.attack=0.01] - Attack time in seconds
   * @param {number} [options.decay=0.1] - Decay time in seconds
   * @param {number} [options.sustain=0.7] - Sustain level (0-1)
   * @param {number} [options.release=0.2] - Release time in seconds
   * @param {number} [options.startTime=0] - Start time
   * @param {number} [options.duration=1] - Total duration
   * @param {number} [options.peakVolume=1] - Peak volume level
   */
  static applyADSR(param, options = {}) {
    const {
      attack = 0.01,
      decay = 0.1,
      sustain = 0.7,
      release = 0.2,
      startTime = 0,
      duration = 1,
      peakVolume = 1,
    } = options;

    const sustainLevel = peakVolume * sustain;
    const sustainDuration = Math.max(0, duration - attack - decay);

    param.setValueAtTime(0, startTime);
    param.linearRampToValueAtTime(peakVolume, startTime + attack);
    param.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
    param.setValueAtTime(
      sustainLevel,
      startTime + attack + decay + sustainDuration
    );
    param.linearRampToValueAtTime(0, startTime + duration + release);
  }

  /**
   * Create envelope presets for common sounds
   * @returns {Object} Preset envelope configurations
   */
  static get presets() {
    return {
      pluck: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.1 },
      pad: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 1.0 },
      organ: { attack: 0.01, decay: 0.0, sustain: 1.0, release: 0.05 },
      perc: { attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.05 },
      string: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.3 },
      brass: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.2 },
      blip: { attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.02 },
      laser: { attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.05 },
      explosion: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.5 },
    };
  }
}

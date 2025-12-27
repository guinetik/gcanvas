/**
 * SynthAnalyzer - FFT analysis for audio visualization
 * @module sound/synth.analyzer
 */
export class SynthAnalyzer {
  static #_ctx = null;
  static #_analyzer = null;
  static #_dataArray = null;
  static #_frequencyData = null;

  /**
   * Initialize the analyzer
   * @param {AudioContext} ctx - Audio context
   * @param {AudioNode} source - Source node to analyze
   */
  static init(ctx, source) {
    this.#_ctx = ctx;
    this.#_analyzer = ctx.createAnalyser();
    this.#_analyzer.fftSize = 2048;

    source.connect(this.#_analyzer);
    this.#_analyzer.connect(ctx.destination);

    this.#_dataArray = new Uint8Array(this.#_analyzer.frequencyBinCount);
    this.#_frequencyData = new Uint8Array(this.#_analyzer.frequencyBinCount);
  }

  /**
   * Check if analyzer is initialized
   * @returns {boolean}
   */
  static get isInitialized() {
    return this.#_analyzer !== null;
  }

  /**
   * Get the analyzer node
   * @returns {AnalyserNode|null}
   */
  static get node() {
    return this.#_analyzer;
  }

  /**
   * Set FFT size (must be power of 2)
   * @param {number} size - FFT size (32-32768)
   */
  static setFFTSize(size) {
    if (this.#_analyzer) {
      this.#_analyzer.fftSize = size;
      this.#_dataArray = new Uint8Array(this.#_analyzer.frequencyBinCount);
      this.#_frequencyData = new Uint8Array(this.#_analyzer.frequencyBinCount);
    }
  }

  /**
   * Get waveform data (time domain)
   * @returns {Uint8Array} Waveform data (0-255)
   */
  static getWaveform() {
    if (!this.#_analyzer) return new Uint8Array(0);
    this.#_analyzer.getByteTimeDomainData(this.#_dataArray);
    return this.#_dataArray;
  }

  /**
   * Get frequency data (spectrum)
   * @returns {Uint8Array} Frequency data (0-255)
   */
  static getFrequency() {
    if (!this.#_analyzer) return new Uint8Array(0);
    this.#_analyzer.getByteFrequencyData(this.#_frequencyData);
    return this.#_frequencyData;
  }

  /**
   * Get normalized frequency bands
   * @param {number} [bands=8] - Number of bands
   * @returns {number[]} Normalized band values (0-1)
   */
  static getBands(bands = 8) {
    const freq = this.getFrequency();
    if (freq.length === 0) return new Array(bands).fill(0);

    const bandSize = Math.floor(freq.length / bands);
    const result = [];

    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += freq[i * bandSize + j];
      }
      result.push(sum / (bandSize * 255));
    }

    return result;
  }

  /**
   * Get current amplitude (volume level)
   * @returns {number} Amplitude (0-1)
   */
  static getAmplitude() {
    const waveform = this.getWaveform();
    if (waveform.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < waveform.length; i++) {
      const value = (waveform[i] - 128) / 128;
      sum += value * value;
    }
    return Math.sqrt(sum / waveform.length);
  }

  /**
   * Get peak frequency
   * @returns {number} Peak frequency in Hz
   */
  static getPeakFrequency() {
    if (!this.#_analyzer || !this.#_ctx) return 0;

    const freq = this.getFrequency();
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < freq.length; i++) {
      if (freq[i] > maxValue) {
        maxValue = freq[i];
        maxIndex = i;
      }
    }

    // Convert bin index to frequency
    const nyquist = this.#_ctx.sampleRate / 2;
    return (maxIndex * nyquist) / this.#_analyzer.frequencyBinCount;
  }

  /**
   * Disconnect and cleanup
   */
  static dispose() {
    if (this.#_analyzer) {
      this.#_analyzer.disconnect();
      this.#_analyzer = null;
    }
    this.#_dataArray = null;
    this.#_frequencyData = null;
  }
}

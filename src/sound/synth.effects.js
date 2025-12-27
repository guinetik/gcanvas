/**
 * SynthEffects - Audio effects processing
 * @module sound/synth.effects
 */
export class SynthEffects {
  static #_ctx = null;
  static #_output = null;

  /**
   * Initialize the effects module
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
   * Create a filter node
   * @param {string} [type='lowpass'] - Filter type
   * @param {number} [frequency=1000] - Cutoff frequency
   * @param {number} [q=1] - Q factor (resonance)
   * @returns {BiquadFilterNode}
   */
  static filter(type = "lowpass", frequency = 1000, q = 1) {
    const filter = this.#_ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  /**
   * Create a delay effect
   * @param {number} [time=0.3] - Delay time in seconds
   * @param {number} [feedback=0.4] - Feedback amount (0-1)
   * @param {number} [mix=0.5] - Wet/dry mix (0-1)
   * @returns {Object} Delay effect controller
   */
  static delay(time = 0.3, feedback = 0.4, mix = 0.5) {
    const delay = this.#_ctx.createDelay(5);
    const feedbackGain = this.#_ctx.createGain();
    const wetGain = this.#_ctx.createGain();
    const dryGain = this.#_ctx.createGain();
    const input = this.#_ctx.createGain();
    const output = this.#_ctx.createGain();

    delay.delayTime.value = time;
    feedbackGain.gain.value = feedback;
    wetGain.gain.value = mix;
    dryGain.gain.value = 1 - mix;

    // Signal flow
    input.connect(delay);
    input.connect(dryGain);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(output);
    dryGain.connect(output);

    return {
      input,
      output,
      setTime: (t) =>
        delay.delayTime.setValueAtTime(t, this.#_ctx.currentTime),
      setFeedback: (f) =>
        feedbackGain.gain.setValueAtTime(f, this.#_ctx.currentTime),
      setMix: (m) => {
        wetGain.gain.setValueAtTime(m, this.#_ctx.currentTime);
        dryGain.gain.setValueAtTime(1 - m, this.#_ctx.currentTime);
      },
    };
  }

  /**
   * Create a simple reverb using convolution
   * @param {number} [duration=2] - Reverb duration
   * @param {number} [decay=2] - Decay rate
   * @returns {ConvolverNode}
   */
  static reverb(duration = 2, decay = 2) {
    const convolver = this.#_ctx.createConvolver();
    const sampleRate = this.#_ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.#_ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Create a distortion effect
   * @param {number} [amount=50] - Distortion amount (0-100)
   * @returns {WaveShaperNode}
   */
  static distortion(amount = 50) {
    const shaper = this.#_ctx.createWaveShaper();
    const k = amount;
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] =
        ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }

    shaper.curve = curve;
    shaper.oversample = "4x";
    return shaper;
  }

  /**
   * Create a tremolo effect
   * @param {number} [rate=5] - Tremolo rate in Hz
   * @param {number} [depth=0.5] - Tremolo depth (0-1)
   * @returns {Object} Tremolo effect controller
   */
  static tremolo(rate = 5, depth = 0.5) {
    const lfo = this.#_ctx.createOscillator();
    const lfoGain = this.#_ctx.createGain();
    const outputGain = this.#_ctx.createGain();

    lfo.frequency.value = rate;
    lfoGain.gain.value = depth * 0.5;
    outputGain.gain.value = 1 - depth * 0.5;

    lfo.connect(lfoGain);
    lfoGain.connect(outputGain.gain);
    lfo.start();

    return {
      input: outputGain,
      output: outputGain,
      lfo,
      setRate: (r) =>
        lfo.frequency.setValueAtTime(r, this.#_ctx.currentTime),
      setDepth: (d) =>
        lfoGain.gain.setValueAtTime(d * 0.5, this.#_ctx.currentTime),
      stop: () => lfo.stop(),
    };
  }

  /**
   * Create a compressor
   * @param {Object} options - Compressor options
   * @returns {DynamicsCompressorNode}
   */
  static compressor(options = {}) {
    const {
      threshold = -24,
      knee = 30,
      ratio = 12,
      attack = 0.003,
      release = 0.25,
    } = options;

    const compressor = this.#_ctx.createDynamicsCompressor();
    compressor.threshold.value = threshold;
    compressor.knee.value = knee;
    compressor.ratio.value = ratio;
    compressor.attack.value = attack;
    compressor.release.value = release;

    return compressor;
  }

  /**
   * Create a stereo panner
   * @param {number} [pan=0] - Pan value (-1 left, 0 center, 1 right)
   * @returns {StereoPannerNode}
   */
  static panner(pan = 0) {
    const panner = this.#_ctx.createStereoPanner();
    panner.pan.value = pan;
    return panner;
  }

  /**
   * Create a gain node
   * @param {number} [volume=1] - Volume level
   * @returns {GainNode}
   */
  static gain(volume = 1) {
    const gain = this.#_ctx.createGain();
    gain.gain.value = volume;
    return gain;
  }
}

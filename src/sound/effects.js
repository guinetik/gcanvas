/**
 * Audio Effects Primitives
 * Standalone audio effect processors for Web Audio API
 * @module sound/effects
 */

/**
 * Flanger effect - Short delay with LFO modulation for jet sweep sound
 * @class Flanger
 */
export class Flanger {
  /**
   * Create a flanger effect
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Flanger options
   * @param {number} [options.baseDelay=0.005] - Base delay time in seconds (default: 5ms)
   * @param {number} [options.maxDelay=0.02] - Maximum delay time in seconds (default: 20ms)
   * @param {number} [options.lfoFrequency=0.5] - LFO frequency in Hz (default: 0.5Hz)
   * @param {number} [options.lfoDepth=0.002] - LFO modulation depth in seconds (default: 2ms)
   * @param {number} [options.feedback=0.5] - Feedback amount (0-1, default: 0.5)
   * @param {number} [options.wet=0] - Wet signal level (0-1, default: 0)
   * @param {number} [options.dry=1.0] - Dry signal level (0-1, default: 1.0)
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      baseDelay = 0.005,
      maxDelay = 0.02,
      lfoFrequency = 0.5,
      lfoDepth = 0.002,
      feedback = 0.5,
      wet = 0,
      dry = 1.0,
    } = options;

    // Delay node
    this.delay = audioContext.createDelay(maxDelay);
    this.delay.delayTime.value = baseDelay;

    // LFO for modulation
    this.lfo = audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = lfoFrequency;

    // LFO depth control
    this.lfoDepth = audioContext.createGain();
    this.lfoDepth.gain.value = lfoDepth;

    // Feedback
    this.feedback = audioContext.createGain();
    this.feedback.gain.value = feedback;

    // Wet/dry mix
    this.wetGain = audioContext.createGain();
    this.wetGain.gain.value = wet;
    this.dryGain = audioContext.createGain();
    this.dryGain.gain.value = dry;

    // Output merger
    this.output = audioContext.createGain();
    this.output.gain.value = 1.0;

    // Connect LFO to delay time
    this.lfo.connect(this.lfoDepth);
    this.lfoDepth.connect(this.delay.delayTime);

    // Feedback loop
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);

    // Start LFO
    this.lfo.start();

    // Input node (connect your source here)
    this.input = audioContext.createGain();
  }

  /**
   * Connect the flanger to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    // Dry path
    source.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path through flanger
    source.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  /**
   * Set wet/dry mix
   * @param {number} wet - Wet level (0-1)
   * @param {number} dry - Dry level (0-1)
   */
  setMix(wet, dry) {
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = dry;
  }

  /**
   * Set LFO frequency
   * @param {number} frequency - LFO frequency in Hz
   */
  setLFOFrequency(frequency) {
    this.lfo.frequency.value = frequency;
  }

  /**
   * Set feedback amount
   * @param {number} feedback - Feedback amount (0-1)
   */
  setFeedback(feedback) {
    this.feedback.gain.value = feedback;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.lfo.stop();
      this.lfo.disconnect();
      this.delay.disconnect();
      this.feedback.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.lfoDepth.disconnect();
      this.input.disconnect();
      this.output.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * DJ Filter - Sweeping lowpass/highpass filter
 * @class DJFilter
 */
export class DJFilter {
  /**
   * Create a DJ filter
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Filter options
   * @param {string} [options.type='lowpass'] - Filter type ('lowpass' or 'highpass')
   * @param {number} [options.frequency=20000] - Initial frequency in Hz (default: 20000)
   * @param {number} [options.Q=1] - Q factor/resonance (default: 1)
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      type = 'lowpass',
      frequency = 20000,
      Q = 1,
    } = options;

    this.filter = audioContext.createBiquadFilter();
    this.filter.type = type;
    this.filter.frequency.value = frequency;
    this.filter.Q.value = Q;
  }

  /**
   * Connect the filter to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    source.connect(this.filter);
  }

  /**
   * Set filter frequency
   * @param {number} frequency - Frequency in Hz
   */
  setFrequency(frequency) {
    this.filter.frequency.value = frequency;
  }

  /**
   * Set Q factor
   * @param {number} Q - Q factor/resonance
   */
  setQ(Q) {
    this.filter.Q.value = Q;
  }

  /**
   * Set filter type
   * @param {string} type - Filter type ('lowpass' or 'highpass')
   */
  setType(type) {
    this.filter.type = type;
  }

  /**
   * Get the filter node (for chaining)
   * @returns {BiquadFilterNode}
   */
  getNode() {
    return this.filter;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.filter.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * EQ Filter Bank - Multiple peaking filters for equalization
 * @class EQFilterBank
 */
export class EQFilterBank {
  /**
   * Create an EQ filter bank
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - EQ options
   * @param {number} [options.numBands=16] - Number of bands (default: 16)
   * @param {number} [options.minFreq=40] - Minimum frequency in Hz (default: 40)
   * @param {number} [options.maxFreq=12000] - Maximum frequency in Hz (default: 12000)
   * @param {number} [options.Q=4] - Q factor/resonance (default: 4)
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      numBands = 16,
      minFreq = 40,
      maxFreq = 12000,
      Q = 4,
    } = options;

    this.filters = [];
    this.numBands = numBands;

    // Create peaking filters
    for (let i = 0; i < numBands; i++) {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'peaking';
      
      // Logarithmic frequency distribution
      const freq = numBands > 1
        ? minFreq * Math.pow(maxFreq / minFreq, i / (numBands - 1))
        : (minFreq + maxFreq) / 2;
      
      filter.frequency.value = freq;
      filter.Q.value = Q;
      filter.gain.value = 0; // Start flat
      
      this.filters.push(filter);
    }
  }

  /**
   * Connect the EQ bank to an audio node
   * Chains all filters together
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    let currentNode = source;
    for (const filter of this.filters) {
      currentNode.connect(filter);
      currentNode = filter;
    }
  }

  /**
   * Set gain for a specific band
   * @param {number} bandIndex - Band index (0 to numBands-1)
   * @param {number} gain - Gain in dB
   */
  setBandGain(bandIndex, gain) {
    if (bandIndex >= 0 && bandIndex < this.filters.length) {
      this.filters[bandIndex].gain.value = gain;
    }
  }

  /**
   * Set gain for multiple bands
   * @param {Array<number>} gains - Array of gain values in dB
   */
  setBandGains(gains) {
    for (let i = 0; i < Math.min(gains.length, this.filters.length); i++) {
      this.filters[i].gain.value = gains[i];
    }
  }

  /**
   * Get filter node at index (for chaining)
   * @param {number} index - Filter index
   * @returns {BiquadFilterNode}
   */
  getFilter(index) {
    return this.filters[index];
  }

  /**
   * Get all filters (for chaining)
   * @returns {Array<BiquadFilterNode>}
   */
  getFilters() {
    return this.filters;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    for (const filter of this.filters) {
      try {
        filter.disconnect();
      } catch (e) {
        // Ignore errors
      }
    }
  }
}

/**
 * High Shelf Filter - High frequency boost/clarity
 * @class HighShelf
 */
export class HighShelf {
  /**
   * Create a high shelf filter
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Filter options
   * @param {number} [options.frequency=4000] - Shelf frequency in Hz (default: 4000)
   * @param {number} [options.gain=3] - Gain in dB (default: 3)
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      frequency = 4000,
      gain = 3,
    } = options;

    this.filter = audioContext.createBiquadFilter();
    this.filter.type = 'highshelf';
    this.filter.frequency.value = frequency;
    this.filter.gain.value = gain;
  }

  /**
   * Connect the filter to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    source.connect(this.filter);
  }

  /**
   * Set shelf frequency
   * @param {number} frequency - Frequency in Hz
   */
  setFrequency(frequency) {
    this.filter.frequency.value = frequency;
  }

  /**
   * Set gain
   * @param {number} gain - Gain in dB
   */
  setGain(gain) {
    this.filter.gain.value = gain;
  }

  /**
   * Get the filter node (for chaining)
   * @returns {BiquadFilterNode}
   */
  getNode() {
    return this.filter;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.filter.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Advanced Delay - Delay with wet/dry control and feedback
 * @class AdvancedDelay
 */
export class AdvancedDelay {
  /**
   * Create an advanced delay effect
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Delay options
   * @param {number} [options.delayTime=0.15] - Delay time in seconds (default: 0.15)
   * @param {number} [options.maxDelay=0.5] - Maximum delay time in seconds (default: 0.5)
   * @param {number} [options.feedback=0.2] - Feedback amount (0-1, default: 0.2)
   * @param {number} [options.wet=0.15] - Wet signal level (0-1, default: 0.15)
   * @param {number} [options.dry=0.85] - Dry signal level (0-1, default: 0.85)
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      delayTime = 0.15,
      maxDelay = 0.5,
      feedback = 0.2,
      wet = 0.15,
      dry = 0.85,
    } = options;

    // Delay node
    this.delay = audioContext.createDelay(maxDelay);
    this.delay.delayTime.value = delayTime;

    // Feedback
    this.feedbackGain = audioContext.createGain();
    this.feedbackGain.gain.value = feedback;

    // Wet/dry mix
    this.wetGain = audioContext.createGain();
    this.wetGain.gain.value = wet;
    this.dryGain = audioContext.createGain();
    this.dryGain.gain.value = dry;

    // Output merger
    this.output = audioContext.createGain();
    this.output.gain.value = 1.0;

    // Feedback loop
    this.delay.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delay);

    // Input node (connect your source here)
    this.input = audioContext.createGain();
  }

  /**
   * Connect the delay to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    // Dry path
    source.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Wet path
    source.connect(this.delay);
    this.delay.connect(this.wetGain);
    this.wetGain.connect(this.output);
  }

  /**
   * Set delay time
   * @param {number} time - Delay time in seconds
   */
  setDelayTime(time) {
    this.delay.delayTime.value = time;
  }

  /**
   * Set wet/dry mix
   * @param {number} wet - Wet level (0-1)
   * @param {number} dry - Dry level (0-1)
   */
  setMix(wet, dry) {
    this.wetGain.gain.value = wet;
    this.dryGain.gain.value = dry;
  }

  /**
   * Set feedback amount
   * @param {number} feedback - Feedback amount (0-1)
   */
  setFeedback(feedback) {
    this.feedbackGain.gain.value = feedback;
  }

  /**
   * Get the output node (for chaining)
   * @returns {GainNode}
   */
  getOutput() {
    return this.output;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.delay.disconnect();
      this.feedbackGain.disconnect();
      this.wetGain.disconnect();
      this.dryGain.disconnect();
      this.input.disconnect();
      this.output.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Advanced Distortion - WaveShaper with dynamic curve updates
 * @class AdvancedDistortion
 */
export class AdvancedDistortion {
  /**
   * Create an advanced distortion effect
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Distortion options
   * @param {number} [options.amount=0] - Initial distortion amount (0-1, default: 0)
   * @param {string} [options.oversample='4x'] - Oversampling ('none', '2x', '4x', default: '4x')
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      amount = 0,
      oversample = '4x',
    } = options;

    this.shaper = audioContext.createWaveShaper();
    this.shaper.oversample = oversample;
    this.amount = amount;
    this.updateCurve(amount);
  }

  /**
   * Update the distortion curve
   * @param {number} amount - Distortion amount (0-1)
   */
  updateCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    // Blend between clean and distorted based on amount
    const k = amount * 400; // More extreme distortion

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }

    this.shaper.curve = curve;
    this.amount = amount;
  }

  /**
   * Connect the distortion to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    source.connect(this.shaper);
  }

  /**
   * Set distortion amount
   * @param {number} amount - Distortion amount (0-1)
   */
  setAmount(amount) {
    this.updateCurve(amount);
  }

  /**
   * Get the shaper node (for chaining)
   * @returns {WaveShaperNode}
   */
  getNode() {
    return this.shaper;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.shaper.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Advanced Tremolo - LFO amplitude modulation
 * @class AdvancedTremolo
 */
export class AdvancedTremolo {
  /**
   * Create an advanced tremolo effect
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Tremolo options
   * @param {number} [options.rate=4] - Tremolo rate in Hz (default: 4)
   * @param {number} [options.depth=0] - Tremolo depth (0-1, default: 0)
   * @param {string} [options.lfoType='sine'] - LFO waveform type (default: 'sine')
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      rate = 4,
      depth = 0,
      lfoType = 'sine',
    } = options;

    // Gain node for amplitude modulation
    this.gain = audioContext.createGain();
    this.gain.gain.value = 1.0;

    // LFO
    this.lfo = audioContext.createOscillator();
    this.lfo.type = lfoType;
    this.lfo.frequency.value = rate;

    // LFO depth control
    this.depthGain = audioContext.createGain();
    this.depthGain.gain.value = depth;

    // Connect LFO to gain
    this.lfo.connect(this.depthGain);
    this.depthGain.connect(this.gain.gain);

    // Start LFO
    this.lfo.start();
  }

  /**
   * Connect the tremolo to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    source.connect(this.gain);
  }

  /**
   * Set tremolo rate
   * @param {number} rate - Rate in Hz
   */
  setRate(rate) {
    this.lfo.frequency.value = rate;
  }

  /**
   * Set tremolo depth
   * @param {number} depth - Depth (0-1)
   */
  setDepth(depth) {
    this.depthGain.gain.value = depth;
  }

  /**
   * Get the gain node (for chaining)
   * @returns {GainNode}
   */
  getNode() {
    return this.gain;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.lfo.stop();
      this.lfo.disconnect();
      this.depthGain.disconnect();
      this.gain.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Limiter - Compressor configured as a limiter to prevent clipping
 * @class Limiter
 */
export class Limiter {
  /**
   * Create a limiter
   * @param {AudioContext} audioContext - The audio context
   * @param {Object} options - Limiter options
   * @param {number} [options.threshold=-3] - Threshold in dB (default: -3)
   * @param {number} [options.knee=0] - Knee in dB (default: 0)
   * @param {number} [options.ratio=20] - Ratio (default: 20, hard limit)
   * @param {number} [options.attack=0.001] - Attack time in seconds (default: 0.001)
   * @param {number} [options.release=0.1] - Release time in seconds (default: 0.1)
   */
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    const {
      threshold = -3,
      knee = 0,
      ratio = 20,
      attack = 0.001,
      release = 0.1,
    } = options;

    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = threshold;
    this.compressor.knee.value = knee;
    this.compressor.ratio.value = ratio;
    this.compressor.attack.value = attack;
    this.compressor.release.value = release;
  }

  /**
   * Connect the limiter to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    source.connect(this.compressor);
  }

  /**
   * Set threshold
   * @param {number} threshold - Threshold in dB
   */
  setThreshold(threshold) {
    this.compressor.threshold.value = threshold;
  }

  /**
   * Get the compressor node (for chaining)
   * @returns {DynamicsCompressorNode}
   */
  getNode() {
    return this.compressor;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.compressor.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Master Gain - Simple gain node for overall volume control
 * @class MasterGain
 */
export class MasterGain {
  /**
   * Create a master gain node
   * @param {AudioContext} audioContext - The audio context
   * @param {number} [volume=1.0] - Initial volume (0-1, default: 1.0)
   */
  constructor(audioContext, volume = 1.0) {
    this.audioContext = audioContext;
    this.gain = audioContext.createGain();
    this.gain.gain.value = volume;
  }

  /**
   * Connect the gain to an audio node
   * @param {AudioNode} source - Source node to connect
   */
  connect(source) {
    source.connect(this.gain);
  }

  /**
   * Set volume
   * @param {number} volume - Volume (0-1)
   */
  setVolume(volume) {
    this.gain.gain.value = volume;
  }

  /**
   * Get the gain node (for chaining)
   * @returns {GainNode}
   */
  getNode() {
    return this.gain;
  }

  /**
   * Disconnect and clean up
   */
  disconnect() {
    try {
      this.gain.disconnect();
    } catch (e) {
      // Ignore errors
    }
  }
}

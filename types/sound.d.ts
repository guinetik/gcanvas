/**
 * Sound Module - TypeScript Definitions
 * Procedural audio generation for games and creative coding
 */

// ==========================================================================
// Types
// ==========================================================================

export interface SynthOptions {
  /** Master volume (0-1) */
  masterVolume?: number;
  /** Sample rate (default: 44100) */
  sampleRate?: number;
  /** Enable audio analyzer for visualization */
  enableAnalyzer?: boolean;
}

export interface ToneOptions {
  /** Oscillator type */
  type?: OscillatorType;
  /** Volume (0-1) */
  volume?: number;
  /** Attack time in seconds */
  attack?: number;
  /** Decay time in seconds */
  decay?: number;
  /** Sustain level (0-1) */
  sustain?: number;
  /** Release time in seconds */
  release?: number;
  /** Detune in cents */
  detune?: number;
  /** Start time (defaults to now) */
  startTime?: number;
}

export interface ContinuousOscillatorController {
  osc: OscillatorNode;
  gain: GainNode;
  setFrequency: (freq: number, ramp?: number) => void;
  setVolume: (vol: number, ramp?: number) => void;
  stop: (fadeTime?: number) => void;
}

export interface DelayEffect {
  input: GainNode;
  output: GainNode;
  setTime: (time: number) => void;
  setFeedback: (feedback: number) => void;
  setMix: (mix: number) => void;
}

export interface TremoloEffect {
  input: GainNode;
  output: GainNode;
  lfo: OscillatorNode;
  setRate: (rate: number) => void;
  setDepth: (depth: number) => void;
  stop: () => void;
}

export interface DroneController {
  stop: (fadeTime?: number) => void;
  setVolume: (volume: number) => void;
}

export interface EnvelopeOptions {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  startTime?: number;
  duration?: number;
  peakVolume?: number;
}

export interface EnvelopePresets {
  pluck: EnvelopeOptions;
  pad: EnvelopeOptions;
  organ: EnvelopeOptions;
  perc: EnvelopeOptions;
  string: EnvelopeOptions;
  brass: EnvelopeOptions;
  blip: EnvelopeOptions;
  laser: EnvelopeOptions;
  explosion: EnvelopeOptions;
}

export type ScaleName =
  | "major"
  | "minor"
  | "pentatonic"
  | "pentatonicMinor"
  | "blues"
  | "dorian"
  | "mixolydian"
  | "chromatic"
  | "wholeTone"
  | "diminished";

export type ChordType =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4"
  | "major7"
  | "minor7"
  | "dom7"
  | "dim7"
  | "add9"
  | "power";

// ==========================================================================
// SynthEnvelope
// ==========================================================================

export class SynthEnvelope {
  /**
   * Apply ADSR envelope to an AudioParam
   */
  static applyADSR(param: AudioParam, options?: EnvelopeOptions): void;

  /**
   * Get envelope presets for common sounds
   */
  static readonly presets: EnvelopePresets;
}

// ==========================================================================
// SynthNoise
// ==========================================================================

export class SynthNoise {
  /**
   * Create white noise buffer source
   */
  static white(ctx: AudioContext, duration: number): AudioBufferSourceNode;

  /**
   * Create pink noise buffer source (1/f noise)
   */
  static pink(ctx: AudioContext, duration: number): AudioBufferSourceNode;

  /**
   * Create brown noise buffer source (Brownian/random walk)
   */
  static brown(ctx: AudioContext, duration: number): AudioBufferSourceNode;
}

// ==========================================================================
// SynthMusical
// ==========================================================================

export class SynthMusical {
  static readonly NOTE_FREQUENCIES: Record<string, number>;
  static readonly SCALES: Record<ScaleName, number[]>;
  static readonly CHORDS: Record<ChordType, number[]>;

  /**
   * Convert note name to frequency
   */
  static noteToFreq(note: string): number;

  /**
   * Get frequencies for a scale
   */
  static scale(root: string, scaleName?: ScaleName, octaves?: number): number[];

  /**
   * Get frequencies for a chord
   */
  static chord(root: string, chordType?: ChordType): number[];

  /**
   * Map a value (0-1) to a frequency in a scale
   */
  static mapToScale(
    value: number,
    root?: string,
    scaleName?: ScaleName,
    octaves?: number
  ): number;

  /**
   * Convert MIDI note number to frequency
   */
  static midiToFreq(midi: number): number;

  /**
   * Convert frequency to MIDI note number
   */
  static freqToMidi(freq: number): number;

  /**
   * Get a random note from a scale
   */
  static randomNote(
    root?: string,
    scaleName?: ScaleName,
    octaves?: number
  ): number;

  /**
   * Get frequency with cents offset
   */
  static detune(freq: number, cents: number): number;
}

// ==========================================================================
// SynthAnalyzer
// ==========================================================================

export class SynthAnalyzer {
  /**
   * Initialize the analyzer
   */
  static init(ctx: AudioContext, source: AudioNode): void;

  /**
   * Check if analyzer is initialized
   */
  static readonly isInitialized: boolean;

  /**
   * Get the analyzer node
   */
  static readonly node: AnalyserNode | null;

  /**
   * Set FFT size (must be power of 2)
   */
  static setFFTSize(size: number): void;

  /**
   * Get waveform data (time domain)
   */
  static getWaveform(): Uint8Array;

  /**
   * Get frequency data (spectrum)
   */
  static getFrequency(): Uint8Array;

  /**
   * Get normalized frequency bands
   */
  static getBands(bands?: number): number[];

  /**
   * Get current amplitude (volume level)
   */
  static getAmplitude(): number;

  /**
   * Get peak frequency
   */
  static getPeakFrequency(): number;

  /**
   * Disconnect and cleanup
   */
  static dispose(): void;
}

// ==========================================================================
// SynthEffects
// ==========================================================================

export class SynthEffects {
  /**
   * Initialize the effects module
   */
  static init(ctx: AudioContext, output: AudioNode): void;

  /**
   * Get the audio context
   */
  static readonly ctx: AudioContext;

  /**
   * Create a filter node
   */
  static filter(
    type?: BiquadFilterType,
    frequency?: number,
    q?: number
  ): BiquadFilterNode;

  /**
   * Create a delay effect
   */
  static delay(time?: number, feedback?: number, mix?: number): DelayEffect;

  /**
   * Create a simple reverb using convolution
   */
  static reverb(duration?: number, decay?: number): ConvolverNode;

  /**
   * Create a distortion effect
   */
  static distortion(amount?: number): WaveShaperNode;

  /**
   * Create a tremolo effect
   */
  static tremolo(rate?: number, depth?: number): TremoloEffect;

  /**
   * Create a compressor
   */
  static compressor(options?: {
    threshold?: number;
    knee?: number;
    ratio?: number;
    attack?: number;
    release?: number;
  }): DynamicsCompressorNode;

  /**
   * Create a stereo panner
   */
  static panner(pan?: number): StereoPannerNode;

  /**
   * Create a gain node
   */
  static gain(volume?: number): GainNode;
}

// ==========================================================================
// SynthOscillators
// ==========================================================================

export class SynthOscillators {
  /**
   * Initialize the oscillators module
   */
  static init(ctx: AudioContext, output: AudioNode): void;

  /**
   * Get the audio context
   */
  static readonly ctx: AudioContext;

  /**
   * Get current audio time
   */
  static readonly now: number;

  /**
   * Play a simple tone
   */
  static tone(
    frequency: number,
    duration: number,
    options?: ToneOptions
  ): OscillatorNode;

  /**
   * Create a continuous oscillator (for real-time control)
   */
  static continuous(options?: {
    type?: OscillatorType;
    frequency?: number;
    volume?: number;
  }): ContinuousOscillatorController;

  /**
   * FM Synthesis - Frequency modulation for rich timbres
   */
  static fm(
    carrierFreq: number,
    modFreq: number,
    modDepth: number,
    duration: number,
    options?: { volume?: number; startTime?: number }
  ): { carrier: OscillatorNode; modulator: OscillatorNode; outputGain: GainNode };

  /**
   * Additive synthesis - Combine harmonics
   */
  static additive(
    fundamental: number,
    harmonics: number[],
    duration: number,
    options?: { volume?: number; startTime?: number }
  ): OscillatorNode[];

  /**
   * Play a frequency sweep
   */
  static sweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    options?: {
      type?: OscillatorType;
      volume?: number;
      exponential?: boolean;
      startTime?: number;
    }
  ): OscillatorNode;

  /**
   * Create pulse wave with variable duty cycle
   */
  static pulse(
    frequency: number,
    duration: number,
    dutyCycle?: number,
    options?: { volume?: number; startTime?: number }
  ): { osc1: OscillatorNode; osc2: OscillatorNode; output: GainNode };
}

// ==========================================================================
// Synth (Main Class)
// ==========================================================================

export class Synth {
  /**
   * Initialize the audio system
   */
  static init(options?: SynthOptions): void;

  /**
   * Check if audio is initialized
   */
  static readonly isInitialized: boolean;

  /**
   * Get the AudioContext
   */
  static readonly ctx: AudioContext | null;

  /**
   * Get the master gain node
   */
  static readonly master: GainNode | null;

  /**
   * Get oscillator utilities
   */
  static readonly osc: typeof SynthOscillators;

  /**
   * Get effects utilities
   */
  static readonly fx: typeof SynthEffects;

  /**
   * Get envelope utilities
   */
  static readonly env: typeof SynthEnvelope;

  /**
   * Get noise utilities
   */
  static readonly noise: typeof SynthNoise;

  /**
   * Get musical utilities
   */
  static readonly music: typeof SynthMusical;

  /**
   * Get analyzer utilities
   */
  static readonly analyzer: typeof SynthAnalyzer;

  /**
   * Resume audio context (required after user interaction)
   */
  static resume(): Promise<void>;

  /**
   * Suspend audio context
   */
  static suspend(): Promise<void>;

  /**
   * Get current audio time (for scheduling)
   */
  static readonly now: number;

  /**
   * Get audio context state
   */
  static readonly state: AudioContextState;

  /**
   * Set master volume
   */
  static volume: number;

  /**
   * Create a custom audio node chain
   */
  static chain(
    ...nodes: AudioNode[]
  ): { first: AudioNode; last: AudioNode; connectTo: (target: AudioNode) => void };

  /**
   * Schedule a function to run at a specific audio time
   */
  static schedule(fn: () => void, time: number): number;

  /**
   * Close the audio context and cleanup
   */
  static close(): Promise<void>;
}

// ==========================================================================
// Sound (Stateless Primitives)
// ==========================================================================

export class Sound {
  /**
   * Generate a beep/blip sound effect
   */
  static beep(
    frequency?: number,
    duration?: number,
    options?: { volume?: number; type?: OscillatorType }
  ): void;

  /**
   * Generate a click/tick sound
   */
  static click(volume?: number): void;

  /**
   * Generate a sweep sound (rising or falling)
   */
  static sweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    options?: { volume?: number; type?: OscillatorType }
  ): void;

  /**
   * Play a note from scale based on value
   */
  static fromValue(
    value: number,
    options?: {
      root?: string;
      scale?: ScaleName;
      octaves?: number;
      duration?: number;
      volume?: number;
      type?: OscillatorType;
    }
  ): void;

  /**
   * Collision/impact sound
   */
  static impact(intensity?: number): void;

  /**
   * Explosion sound effect
   */
  static explosion(intensity?: number): void;

  /**
   * Laser/shoot sound effect
   */
  static laser(options?: {
    startFreq?: number;
    endFreq?: number;
    duration?: number;
    volume?: number;
    type?: OscillatorType;
  }): void;

  /**
   * Power-up sound effect
   */
  static powerUp(options?: {
    startFreq?: number;
    endFreq?: number;
    duration?: number;
    volume?: number;
  }): void;

  /**
   * Hurt/damage sound effect
   */
  static hurt(intensity?: number): void;

  /**
   * Coin/pickup sound effect
   */
  static coin(options?: { baseFreq?: number; volume?: number }): void;

  /**
   * Jump sound effect
   */
  static jump(options?: {
    startFreq?: number;
    endFreq?: number;
    duration?: number;
    volume?: number;
  }): void;

  /**
   * Menu select/confirm sound
   */
  static select(options?: { frequency?: number; volume?: number }): void;

  /**
   * Error/denied sound
   */
  static error(options?: { volume?: number }): void;

  /**
   * Ambient drone generator
   */
  static drone(
    root?: string,
    options?: { volume?: number; richness?: number }
  ): DroneController | null;

  /**
   * Play a musical note
   */
  static note(
    note: string,
    duration?: number,
    options?: {
      volume?: number;
      type?: OscillatorType;
      envelope?: EnvelopeOptions;
    }
  ): void;

  /**
   * Play a chord
   */
  static chord(
    root: string,
    chordType?: ChordType,
    duration?: number,
    options?: { volume?: number; type?: OscillatorType; strum?: number }
  ): void;

  /**
   * Play notes in a sequence
   */
  static sequence(
    notes: string[],
    noteDuration?: number,
    gap?: number,
    options?: { volume?: number; type?: OscillatorType }
  ): void;

  /**
   * Win/victory fanfare
   */
  static win(): void;

  /**
   * Lose/game over sound
   */
  static lose(): void;
}

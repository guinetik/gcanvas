/**
 * SynthMusical - Musical scales, notes, and chord generation
 * @module sound/synth.musical
 */
export class SynthMusical {
  static NOTE_FREQUENCIES = {
    C: 16.35,
    "C#": 17.32,
    Db: 17.32,
    D: 18.35,
    "D#": 19.45,
    Eb: 19.45,
    E: 20.6,
    F: 21.83,
    "F#": 23.12,
    Gb: 23.12,
    G: 24.5,
    "G#": 25.96,
    Ab: 25.96,
    A: 27.5,
    "A#": 29.14,
    Bb: 29.14,
    B: 30.87,
  };

  static SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    pentatonicMinor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    wholeTone: [0, 2, 4, 6, 8, 10],
    diminished: [0, 2, 3, 5, 6, 8, 9, 11],
  };

  static CHORDS = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10],
    dim7: [0, 3, 6, 9],
    add9: [0, 4, 7, 14],
    power: [0, 7],
  };

  /**
   * Convert note name to frequency
   * @param {string} note - Note name (e.g., 'A4', 'C#3')
   * @returns {number} Frequency in Hz
   */
  static noteToFreq(note) {
    const match = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) throw new Error(`Invalid note: ${note}`);

    const [, noteName, octave] = match;
    const baseFreq = this.NOTE_FREQUENCIES[noteName];
    if (baseFreq === undefined) throw new Error(`Unknown note: ${noteName}`);
    return baseFreq * Math.pow(2, parseInt(octave));
  }

  /**
   * Get frequencies for a scale
   * @param {string} root - Root note (e.g., 'C4')
   * @param {string} [scaleName='major'] - Scale name
   * @param {number} [octaves=1] - Number of octaves
   * @returns {number[]} Array of frequencies
   */
  static scale(root, scaleName = "major", octaves = 1) {
    const rootFreq = this.noteToFreq(root);
    const intervals = this.SCALES[scaleName];
    if (!intervals) throw new Error(`Unknown scale: ${scaleName}`);

    const frequencies = [];

    for (let oct = 0; oct < octaves; oct++) {
      for (const interval of intervals) {
        frequencies.push(rootFreq * Math.pow(2, (interval + oct * 12) / 12));
      }
    }

    return frequencies;
  }

  /**
   * Get frequencies for a chord
   * @param {string} root - Root note
   * @param {string} [chordType='major'] - Chord type
   * @returns {number[]} Array of frequencies
   */
  static chord(root, chordType = "major") {
    const rootFreq = this.noteToFreq(root);
    const intervals = this.CHORDS[chordType];
    if (!intervals) throw new Error(`Unknown chord type: ${chordType}`);
    return intervals.map((i) => rootFreq * Math.pow(2, i / 12));
  }

  /**
   * Map a value (0-1) to a frequency in a scale
   * @param {number} value - Value between 0 and 1
   * @param {string} [root='C4'] - Root note
   * @param {string} [scaleName='pentatonic'] - Scale name
   * @param {number} [octaves=2] - Number of octaves
   * @returns {number} Frequency in Hz
   */
  static mapToScale(value, root = "C4", scaleName = "pentatonic", octaves = 2) {
    const frequencies = this.scale(root, scaleName, octaves);
    const clampedValue = Math.max(0, Math.min(1, value));
    const index =
      Math.floor(clampedValue * frequencies.length) % frequencies.length;
    return frequencies[index];
  }

  /**
   * Convert MIDI note number to frequency
   * @param {number} midi - MIDI note number (0-127)
   * @returns {number} Frequency in Hz
   */
  static midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Convert frequency to MIDI note number
   * @param {number} freq - Frequency in Hz
   * @returns {number} MIDI note number
   */
  static freqToMidi(freq) {
    return Math.round(12 * Math.log2(freq / 440) + 69);
  }

  /**
   * Get a random note from a scale
   * @param {string} [root='C4'] - Root note
   * @param {string} [scaleName='pentatonic'] - Scale name
   * @param {number} [octaves=2] - Number of octaves
   * @returns {number} Frequency in Hz
   */
  static randomNote(root = "C4", scaleName = "pentatonic", octaves = 2) {
    const frequencies = this.scale(root, scaleName, octaves);
    return frequencies[Math.floor(Math.random() * frequencies.length)];
  }

  /**
   * Get frequency with cents offset
   * @param {number} freq - Base frequency
   * @param {number} cents - Cents offset (-100 to 100 typical)
   * @returns {number} Adjusted frequency
   */
  static detune(freq, cents) {
    return freq * Math.pow(2, cents / 1200);
  }
}

/**
 * Penrose Game Sound Effects
 *
 * Procedural audio using the Synth system.
 */

import { Synth } from "/gcanvas.es.min.js";

let initialized = false;

export const PenroseSounds = {
  /**
   * Initialize the sound system (must be called after user interaction)
   */
  init() {
    if (initialized) return;
    Synth.init({ masterVolume: 0.4 });
    initialized = true;
    console.log("Sound initialized");
  },

  /**
   * Check if sound is initialized
   */
  get isReady() {
    return initialized;
  },

  /**
   * Wormhole appears - ethereal rising sweep
   */
  wormholeSpawn() {
    if (!initialized) return;

    // Ethereal rising sweep with shimmer
    Synth.osc.sweep(200, 800, 0.8, { type: "sine", volume: 0.3 });
    Synth.osc.sweep(300, 1200, 0.6, { type: "triangle", volume: 0.15 });

    // Sparkle effect
    setTimeout(() => {
      Synth.osc.tone(1200, 0.2, { type: "sine", volume: 0.1, attack: 0.01, release: 0.15 });
    }, 200);
    setTimeout(() => {
      Synth.osc.tone(1600, 0.15, { type: "sine", volume: 0.08, attack: 0.01, release: 0.1 });
    }, 350);
  },

  /**
   * Enter wormhole - whoosh teleport
   */
  wormholeEnter() {
    if (!initialized) return;

    // Whoosh down + warble
    Synth.osc.sweep(600, 100, 0.5, { type: "sine", volume: 0.4 });
    Synth.osc.sweep(800, 150, 0.4, { type: "triangle", volume: 0.2 });
    Synth.osc.fm(200, 8, 100, 0.6, { volume: 0.15 });
  },

  /**
   * Artifact appears - mysterious chime
   */
  artifactSpawn() {
    if (!initialized) return;

    // Mysterious chime
    Synth.osc.tone(523, 0.4, { type: "sine", volume: 0.25, attack: 0.01, release: 0.3 }); // C5
    setTimeout(() => {
      Synth.osc.tone(659, 0.3, { type: "sine", volume: 0.2, attack: 0.01, release: 0.25 }); // E5
    }, 100);
    setTimeout(() => {
      Synth.osc.tone(784, 0.5, { type: "sine", volume: 0.25, attack: 0.01, release: 0.4 }); // G5
    }, 200);
  },

  /**
   * Collect artifact - triumphant arpeggio
   */
  artifactCollect() {
    if (!initialized) return;

    // Triumphant arpeggio
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      setTimeout(() => {
        Synth.osc.tone(freq, 0.4, { type: "triangle", volume: 0.2, attack: 0.01, release: 0.3 });
      }, i * 80);
    });
  },

  /**
   * Kerr energy harvested - quick blip
   */
  kerrCollect() {
    if (!initialized) return;

    // Quick energetic blip
    Synth.osc.sweep(400, 1000, 0.15, { type: "square", volume: 0.15 });
    Synth.osc.tone(800, 0.1, { type: "sine", volume: 0.1 });
  },

  /**
   * Enter void dimension - deep ominous
   */
  voidEnter() {
    if (!initialized) return;

    // Deep ominous rumble + descending
    Synth.osc.sweep(400, 50, 1.5, { type: "sawtooth", volume: 0.25 });
    Synth.osc.fm(60, 2, 30, 2, { volume: 0.3 });
  },

  /**
   * Collect void particle - sparkle
   */
  voidParticle() {
    if (!initialized) return;

    // Quick sparkle
    Synth.osc.tone(600 + Math.random() * 400, 0.15, {
      type: "sine",
      volume: 0.12,
      attack: 0.01,
      release: 0.1
    });
  },

  /**
   * Escape the void - triumphant rising
   */
  voidEscape() {
    if (!initialized) return;

    // Rising triumphant escape
    Synth.osc.sweep(100, 800, 1, { type: "sine", volume: 0.3 });
    Synth.osc.sweep(150, 1200, 0.8, { type: "triangle", volume: 0.2 });

    // Fanfare
    setTimeout(() => {
      Synth.osc.tone(523, 0.3, { type: "triangle", volume: 0.2 });
      Synth.osc.tone(659, 0.3, { type: "triangle", volume: 0.15 });
    }, 400);
    setTimeout(() => {
      Synth.osc.tone(784, 0.5, { type: "triangle", volume: 0.25 });
    }, 600);
  },

  /**
   * Death by singularity - descending doom
   */
  death() {
    if (!initialized) return;

    // Descending doom
    Synth.osc.sweep(400, 60, 1.5, { type: "sawtooth", volume: 0.2 });
    Synth.osc.fm(100, 3, 50, 2, { volume: 0.15 });
  },
};

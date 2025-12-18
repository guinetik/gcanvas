/**
 * Penrose Wormhole
 *
 * A rare object that teleports the player back to the start of the level,
 * allowing them to farm more points while keeping their score and multiplier!
 */

import { CONFIG } from "./constants.js";

export class PenroseWormhole {
  constructor(u, v) {
    this.u = u;
    this.v = v;

    // Wormhole size
    this.radius = CONFIG.wormholeRadius;

    // Animation
    this.rotationPhase = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;

    // State
    this.used = false; // Once used, disappears
    this.spawnTime = 0; // For fade-in effect
  }

  update(dt) {
    this.rotationPhase += dt * 3; // Faster rotation than black holes
    this.pulsePhase += dt * 5;
    this.spawnTime += dt;
  }

  /**
   * Get circle bounds for collision detection
   */
  getCircle() {
    return { x: this.u, y: this.v, radius: this.radius };
  }

  /**
   * Check if wormhole is active (not used)
   */
  get active() {
    return !this.used;
  }
}

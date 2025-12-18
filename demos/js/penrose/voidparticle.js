/**
 * Void Particle
 *
 * Purple particles that appear inside the black hole void.
 * Collect 10 to escape back to the origin.
 */

import { CONFIG } from "./constants.js";

export class VoidParticle {
  constructor(x, y) {
    // Screen coordinates (not Penrose - we're in the void!)
    this.x = x;
    this.y = y;

    // Animation
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.driftX = (Math.random() - 0.5) * 20; // Slow drift
    this.driftY = (Math.random() - 0.5) * 20;

    // Size
    this.radius = CONFIG.voidParticleRadius;

    // State
    this.collected = false;
    this.collectAnimation = 0; // For collection effect
  }

  update(dt) {
    this.pulsePhase += dt * 5;

    // Slow drift
    this.x += this.driftX * dt;
    this.y += this.driftY * dt;

    // Collection animation
    if (this.collected) {
      this.collectAnimation += dt * 3;
    }
  }

  /**
   * Get circle bounds for collision detection (screen coordinates)
   */
  getCircle() {
    return { x: this.x, y: this.y, radius: this.radius };
  }

  /**
   * Check if particle is active (not collected)
   */
  get active() {
    return !this.collected;
  }
}

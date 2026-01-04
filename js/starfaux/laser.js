/**
 * Laser - Player projectile system for StarFaux
 *
 * Uses object pooling for efficient bullet management.
 * Lasers travel forward INTO the screen (Z increases toward horizon).
 */

import { Painter } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

/**
 * Individual laser projectile
 */
class Laser {
  constructor() {
    this.reset();
  }

  reset() {
    this.worldX = 0;
    this.worldY = 0;
    this.worldZ = 0;
    this.alive = false;
    this.age = 0;
    this.size = CONFIG.laser.collisionSize || 25;  // Use collision size, not visual width
  }

  init(x, y, z) {
    this.worldX = x;
    this.worldY = y;
    this.worldZ = z;
    this.alive = true;
    this.age = 0;
  }

  update(dt) {
    if (!this.alive) return;

    // Move forward INTO screen (positive Z = toward horizon)
    this.worldZ += CONFIG.laser.speed * dt;
    this.age += dt;

    // Check lifetime
    if (this.age >= CONFIG.laser.lifetime) {
      this.alive = false;
    }

    // Check if too far (beyond visible range)
    if (this.worldZ > CONFIG.enemy.spawnDistance + 500) {
      this.alive = false;
    }
  }

  render(ctx, camera, resScale = 1) {
    if (!this.alive) return;

    // Project front and back of the laser bolt to get perspective line
    const laserLength = 40;  // Length in world units
    const frontZ = this.worldZ;
    const backZ = this.worldZ - laserLength;  // Back is closer to camera

    const front = camera.project(this.worldX, this.worldY, frontZ);
    const back = camera.project(this.worldX, this.worldY, backZ);

    // Don't render if both points behind camera
    if (front.scale <= 0 && back.scale <= 0) return;

    // Don't render if too far
    if (front.scale < 0.03) return;

    ctx.save();

    // Glow effect - scale glow with resolution
    ctx.shadowColor = CONFIG.laser.glowColor;
    ctx.shadowBlur = 8 * resScale;

    // Draw laser as a tapered line from back (near/big) to front (far/small)
    // Scale width with resolution
    const backWidth = CONFIG.laser.width * back.scale * resScale;
    const frontWidth = CONFIG.laser.width * front.scale * 0.5 * resScale;

    // Main laser body - trapezoid shape for perspective
    ctx.fillStyle = CONFIG.laser.color;
    ctx.beginPath();
    ctx.moveTo(back.x - backWidth / 2, back.y);   // Back left
    ctx.lineTo(front.x - frontWidth / 2, front.y); // Front left
    ctx.lineTo(front.x + frontWidth / 2, front.y); // Front right
    ctx.lineTo(back.x + backWidth / 2, back.y);   // Back right
    ctx.closePath();
    ctx.fill();

    // Bright core line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(1 * resScale, backWidth * 0.3);
    ctx.beginPath();
    ctx.moveTo(back.x, back.y);
    ctx.lineTo(front.x, front.y);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * LaserPool - Manages a pool of reusable laser objects
 */
export class LaserPool {
  constructor(game, camera) {
    this.game = game;
    this.camera = camera;

    // Pre-allocate laser pool
    this.pool = [];
    this.active = [];

    for (let i = 0; i < CONFIG.laser.poolSize; i++) {
      this.pool.push(new Laser());
    }
  }

  /**
   * Fire a new laser from the given position straight ahead
   */
  fire(x, y, z) {
    let laser;

    if (this.pool.length > 0) {
      laser = this.pool.pop();
    } else {
      // Pool exhausted, create new
      laser = new Laser();
    }

    laser.init(x, y, z);
    this.active.push(laser);
  }

  update(dt) {
    // Update all active lasers
    for (let i = this.active.length - 1; i >= 0; i--) {
      const laser = this.active[i];
      laser.update(dt);

      // Return dead lasers to pool
      if (!laser.alive) {
        laser.reset();
        this.pool.push(laser);
        this.active.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = Painter.ctx;
    const resScale = this.game.scaleFactor || 1;

    // Sort by Z for proper depth (furthest first)
    this.active.sort((a, b) => b.worldZ - a.worldZ);

    for (const laser of this.active) {
      laser.render(ctx, this.camera, resScale);
    }
  }

  /**
   * Get all active lasers for collision detection
   */
  getActiveLasers() {
    return this.active;
  }

  /**
   * Reset all lasers (on game restart)
   */
  reset() {
    for (const laser of this.active) {
      laser.reset();
      this.pool.push(laser);
    }
    this.active = [];
  }
}

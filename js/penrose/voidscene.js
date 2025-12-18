/**
 * VoidScene - Inside the Black Hole
 *
 * The void dimension where you end up after hitting a singularity
 * with an artifact. Collect purple void essence to escape.
 *
 * @extends Scene
 */

import { Collision, Painter, Scene } from "/gcanvas.es.min.js";
import { CONFIG } from "./constants.js";
import { PenroseSounds } from "./sounds.js";
import { VoidParticle } from "./voidparticle.js";
import { VoidShip } from "./voidship.js";

export class VoidScene extends Scene {
  constructor(game) {
    super(game);

    // Ship for void navigation
    this.ship = new VoidShip(game);
    this.add(this.ship);

    // Collectible particles
    this.particles = [];
    this.particleSpawnTimer = 0;
    this.particlesCollected = 0;

    // Background swirl particles
    this.background = [];

    // Timer (limited time to escape)
    this.timer = 0;

    // Callbacks for game state transitions
    this.onEscape = null;
    this.onTimeout = null;
  }

  /**
   * Reset the void scene for a new entry
   */
  reset() {
    this.ship.reset();
    this.particles = [];
    this.particleSpawnTimer = 0;
    this.particlesCollected = 0;
    this.timer = 0;

    // Generate swirling background
    this.background = [];
    for (let i = 0; i < 100; i++) {
      this.background.push({
        x: Math.random() * this.game.width,
        y: Math.random() * this.game.height,
        size: 1 + Math.random() * 3,
        speed: 0.5 + Math.random() * 1.5,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt) {
    super.update(dt);

    this.timer += dt;

    // Spawn particles
    this.particleSpawnTimer += dt;
    if (this.particleSpawnTimer >= CONFIG.voidParticleSpawnRate) {
      this.particleSpawnTimer = 0;
      this.spawnParticle();
    }

    // Update particles and check collection
    const shipCircle = this.ship.getCircle();

    for (const p of this.particles) {
      p.update(dt);

      if (p.active && Collision.circleCircle(shipCircle, p.getCircle())) {
        p.collected = true;
        this.particlesCollected++;
        PenroseSounds.voidParticle();
      }
    }

    // Remove fully animated collected particles
    this.particles = this.particles.filter(
      (p) => !p.collected || p.collectAnimation < 1
    );

    // Update background swirl
    for (const bg of this.background) {
      bg.angle += bg.speed * dt * 0.5;
      bg.x += Math.cos(bg.angle) * bg.speed;
      bg.y += Math.sin(bg.angle) * bg.speed;

      // Wrap around
      if (bg.x < 0) bg.x = this.game.width;
      if (bg.x > this.game.width) bg.x = 0;
      if (bg.y < 0) bg.y = this.game.height;
      if (bg.y > this.game.height) bg.y = 0;
    }

    // Check win condition
    if (this.particlesCollected >= CONFIG.voidParticlesToCollect) {
      if (this.onEscape) this.onEscape();
    }

    // Check timeout
    if (this.timer >= CONFIG.voidDuration) {
      if (this.onTimeout) this.onTimeout();
    }
  }

  /**
   * Spawn a particle at random position (not too close to ship)
   */
  spawnParticle() {
    let px, py;
    do {
      px = 50 + Math.random() * (this.game.width - 100);
      py = 50 + Math.random() * (this.game.height - 100);
    } while (Math.hypot(px - this.ship.x, py - this.ship.y) < 100);

    this.particles.push(new VoidParticle(px, py));
  }

  render() {
    const ctx = Painter.ctx;

    // Dark void background
    ctx.fillStyle = "#020008";
    ctx.fillRect(0, 0, this.game.width, this.game.height);

    // Swirling background particles
    this.renderBackground(ctx);

    // Void particles
    for (const p of this.particles) {
      this.renderParticle(ctx, p);
    }

    // Ship (handled by Scene's child rendering)
    super.render();

    // UI overlay
    this.renderUI(ctx);
  }

  renderBackground(ctx) {
    for (const bg of this.background) {
      ctx.fillStyle = `rgba(50, 20, 80, ${0.3 + Math.sin(bg.angle) * 0.2})`;
      ctx.beginPath();
      ctx.arc(bg.x, bg.y, bg.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderParticle(ctx, p) {
    const pulse = 0.7 + Math.sin(p.pulsePhase) * 0.3;

    if (p.collected) {
      // Collection animation - expand and fade
      const scale = 1 + p.collectAnimation * 2;
      const alpha = 1 - p.collectAnimation;

      ctx.fillStyle = `rgba(200, 100, 255, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * scale * 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Outer glow
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.radius * 2
      );
      gradient.addColorStop(0, `rgba(200, 100, 255, ${0.9 * pulse})`);
      gradient.addColorStop(0.5, `rgba(150, 50, 200, ${0.5 * pulse})`);
      gradient.addColorStop(1, "rgba(100, 0, 150, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `rgba(255, 200, 255, ${pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  renderUI(ctx) {
    const width = this.game.width;
    const height = this.game.height;

    // Progress bar at top
    const barWidth = 300;
    const barHeight = 20;
    const barX = (width - barWidth) / 2;
    const barY = 30;

    // Background
    ctx.fillStyle = "rgba(50, 20, 80, 0.8)";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    // Progress fill
    const progress = this.particlesCollected / CONFIG.voidParticlesToCollect;
    const progressWidth = barWidth * progress;

    const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    gradient.addColorStop(0, "#a0f");
    gradient.addColorStop(1, "#f0f");
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY, progressWidth, barHeight);

    // Border
    ctx.strokeStyle = "#c0f";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `VOID ESSENCE: ${this.particlesCollected} / ${CONFIG.voidParticlesToCollect}`,
      width / 2,
      barY + barHeight + 20
    );

    // Timer warning
    const timeLeft = CONFIG.voidDuration - this.timer;
    if (timeLeft < 10) {
      const flash = Math.sin(Date.now() / 100) > 0;
      ctx.fillStyle = flash ? "#f00" : "#800";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`TIME: ${timeLeft.toFixed(1)}s`, width / 2, barY + barHeight + 50);
    }

    // Instructions
    ctx.fillStyle = "#808";
    ctx.font = "12px monospace";
    ctx.fillText(
      "WASD / Arrows to move — Collect purple essence to escape!",
      width / 2,
      height - 30
    );

    // Title
    ctx.fillStyle = "#c0f";
    ctx.font = "bold 24px monospace";
    ctx.fillText("INSIDE THE SINGULARITY", width / 2, 80);
  }
}

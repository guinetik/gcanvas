/**
 * Genuary 2026 - Day 3
 * Prompt: "Fibonacci forever"
 *
 * GOLDEN VORTEX
 *
 * A living, breathing phyllotaxis pattern.
 * Seeds pulse, spiral, and react to your mouse.
 * The golden angle creates infinite spiraling beauty.
 *
 * Move mouse to disturb. Click to explode.
 */

import { Game, Painter } from '../../../src/index.js';

const CONFIG = {
  goldenAngle: 137.5077640500378,
  numSeeds: 1000,
  baseRadius: 10,
  spacing: 8,

  // Animation
  pulseSpeed: 1.5,
  rotationSpeed: 0.15,
  waveSpeed: 2,
  waveAmplitude: 20,

  // Colors - full spectrum
  hueSpeed: 30,
  saturation: 85,

  // Mouse interaction
  mouseRadius: 200,
  mouseForce: 120,

  // Explosion
  explosionForce: 400,
  explosionDecay: 0.96,
};

const TAU = Math.PI * 2;
const GOLDEN_ANGLE_RAD = CONFIG.goldenAngle * Math.PI / 180;

class GoldenVortexDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.time = 0;
    this.hueOffset = 0;
    this.globalRotation = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.exploding = false;
    this.explosionTime = 0;

    // Generate seeds
    this.seeds = [];
    for (let i = 0; i < CONFIG.numSeeds; i++) {
      const angle = i * GOLDEN_ANGLE_RAD;
      const baseR = CONFIG.spacing * Math.sqrt(i);

      this.seeds.push({
        index: i,
        baseAngle: angle,
        baseRadius: baseR,
        angle: angle,
        radius: baseR,
        vx: 0,
        vy: 0,
        size: Math.max(3, CONFIG.baseRadius - i * 0.005),
        phase: Math.random() * TAU,
      });
    }

    // Mouse tracking
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left - this.width / 2;
      this.mouseY = e.clientY - rect.top - this.height / 2;
    });

    this.canvas.addEventListener('click', () => {
      this.explode();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = 0;
      this.mouseY = 0;
    });
  }

  explode() {
    this.exploding = true;
    this.explosionTime = this.time;

    for (const seed of this.seeds) {
      const x = Math.cos(seed.angle) * seed.radius;
      const y = Math.sin(seed.angle) * seed.radius;
      const dist = Math.sqrt(x * x + y * y) + 1;

      // Explosion velocity - outward from center
      const force = CONFIG.explosionForce / Math.sqrt(dist + 50);
      seed.vx = (x / dist) * force + (Math.random() - 0.5) * 50;
      seed.vy = (y / dist) * force + (Math.random() - 0.5) * 50;
    }
  }

  update(dt) {
    super.update(dt);

    this.time += dt;
    this.hueOffset += CONFIG.hueSpeed * dt;
    this.globalRotation += CONFIG.rotationSpeed * dt;

    const cx = 0;
    const cy = 0;

    for (const seed of this.seeds) {
      // Current position
      let x = Math.cos(seed.angle) * seed.radius;
      let y = Math.sin(seed.angle) * seed.radius;

      if (this.exploding) {
        // Apply explosion velocity
        x += seed.vx * dt;
        y += seed.vy * dt;

        // Decay velocity
        seed.vx *= CONFIG.explosionDecay;
        seed.vy *= CONFIG.explosionDecay;

        // Spring back to original position
        const targetX = Math.cos(seed.baseAngle + this.globalRotation) * seed.baseRadius;
        const targetY = Math.sin(seed.baseAngle + this.globalRotation) * seed.baseRadius;

        const dx = targetX - x;
        const dy = targetY - y;

        seed.vx += dx * 2 * dt;
        seed.vy += dy * 2 * dt;

        // Update angle/radius from position
        seed.angle = Math.atan2(y + seed.vy * dt, x + seed.vx * dt);
        seed.radius = Math.sqrt((x + seed.vx * dt) ** 2 + (y + seed.vy * dt) ** 2);

        // Check if explosion is over
        if (this.time - this.explosionTime > 3) {
          this.exploding = false;
        }
      } else {
        // Normal animation
        // Rotate everything
        seed.angle = seed.baseAngle + this.globalRotation;

        // Pulsing radius
        const pulse = Math.sin(this.time * CONFIG.pulseSpeed + seed.index * 0.02) * 0.1 + 1;

        // Spiral wave
        const wave = Math.sin(this.time * CONFIG.waveSpeed - seed.baseRadius * 0.05) * CONFIG.waveAmplitude;

        seed.radius = seed.baseRadius * pulse + wave * (seed.baseRadius / 200);

        // Mouse interaction
        const dist = Math.sqrt((x - this.mouseX) ** 2 + (y - this.mouseY) ** 2);
        if (dist < CONFIG.mouseRadius) {
          const force = (CONFIG.mouseRadius - dist) / CONFIG.mouseRadius;
          const pushAngle = Math.atan2(y - this.mouseY, x - this.mouseX);
          seed.radius += force * CONFIG.mouseForce * (1 - seed.index / CONFIG.numSeeds);
          seed.angle += force * 0.3 * Math.sin(this.time * 5);
        }
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Fade trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    // Draw connecting lines (subtle)
    this.drawConnections(ctx, cx, cy);

    // Draw seeds
    this.drawSeeds(ctx, cx, cy);

    // Draw center glow
    this.drawCenter(ctx, cx, cy);
  }

  drawConnections(ctx, cx, cy) {
    ctx.strokeStyle = `hsla(${this.hueOffset % 360}, 70%, 50%, 0.05)`;
    ctx.lineWidth = 0.5;

    // Connect seeds in Fibonacci spiral pattern
    ctx.beginPath();
    for (let i = 1; i < Math.min(500, this.seeds.length); i++) {
      const seed = this.seeds[i];
      const prev = this.seeds[i - 1];

      const x1 = cx + Math.cos(prev.angle) * prev.radius;
      const y1 = cy + Math.sin(prev.angle) * prev.radius;
      const x2 = cx + Math.cos(seed.angle) * seed.radius;
      const y2 = cy + Math.sin(seed.angle) * seed.radius;

      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();
  }

  drawSeeds(ctx, cx, cy) {
    for (let i = this.seeds.length - 1; i >= 0; i--) {
      const seed = this.seeds[i];
      const x = cx + Math.cos(seed.angle) * seed.radius;
      const y = cy + Math.sin(seed.angle) * seed.radius;

      // Color based on position in sequence + time
      const hue = (seed.index * 0.5 + this.hueOffset) % 360;
      const lightness = 50 + Math.sin(this.time * 3 + seed.phase) * 15;

      // Pulsing size
      const pulse = Math.sin(this.time * 4 + seed.index * 0.1) * 0.3 + 1;
      const size = seed.size * pulse;

      // Glow
      ctx.globalCompositeOperation = 'lighter';

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
      gradient.addColorStop(0, `hsla(${hue}, ${CONFIG.saturation}%, ${lightness}%, 0.9)`);
      gradient.addColorStop(0.5, `hsla(${hue}, ${CONFIG.saturation}%, ${lightness - 10}%, 0.4)`);
      gradient.addColorStop(1, `hsla(${hue}, ${CONFIG.saturation}%, ${lightness - 20}%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2, 0, TAU);
      ctx.fill();

      // Core
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `hsl(${hue}, ${CONFIG.saturation}%, ${lightness + 20}%)`;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, TAU);
      ctx.fill();
    }
  }

  drawCenter(ctx, cx, cy) {
    ctx.globalCompositeOperation = 'lighter';

    // Pulsing center
    const pulse = Math.sin(this.time * 2) * 0.3 + 1;
    const centerSize = 30 * pulse;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerSize);
    gradient.addColorStop(0, `hsla(${this.hueOffset % 360}, 100%, 80%, 0.8)`);
    gradient.addColorStop(0.3, `hsla(${(this.hueOffset + 30) % 360}, 90%, 60%, 0.4)`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, centerSize, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }
}

export default function day03(canvas) {
  const game = new GoldenVortexDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}

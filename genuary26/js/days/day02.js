/**
 * Genuary 2026 - Day 2
 * Prompt: "Twelve principles of animation"
 *
 * THE FOLLOW-THROUGH CHAIN
 *
 * A mesmerizing chain/tentacle that follows your cursor.
 * Each segment follows the previous with physics-based delay.
 *
 * Principles demonstrated:
 * 1. Follow Through - Each segment drags behind with inertia
 * 2. Overlapping Action - Segments move at different times
 * 3. Arcs - Natural curved motion paths
 * 4. Slow In/Slow Out - Eased acceleration/deceleration
 * 5. Secondary Action - Size pulsing, color shifts
 * 6. Squash & Stretch - Segments elongate based on velocity
 *
 * Move mouse/touch to lead the chain.
 */

import { Game } from '../../../src/index.js';

const CONFIG = {
  // Chain geometry
  segmentCount: 40,
  segmentSpacing: 12,
  baseRadius: 8,
  radiusFalloff: 0.85,  // Each segment is this % of previous

  // Physics
  followSpeed: 0.15,    // How quickly segments follow (0-1)
  velocityStretch: 0.4, // How much velocity stretches segments
  maxStretch: 2.5,      // Maximum stretch multiplier

  // Visuals
  hueStart: 280,        // Purple
  hueEnd: 180,          // Cyan
  glowIntensity: 0.6,
  trailAlpha: 0.08,
};

class Segment {
  constructor(x, y, radius, index) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.index = index;
    this.angle = 0;
  }

  follow(targetX, targetY, speed) {
    // Store previous position for velocity calc
    const prevX = this.x;
    const prevY = this.y;

    // Smooth follow with easing (slow in/slow out)
    this.x += (targetX - this.x) * speed;
    this.y += (targetY - this.y) * speed;

    // Calculate velocity for stretch effect
    this.vx = this.x - prevX;
    this.vy = this.y - prevY;

    // Calculate angle toward target for orientation
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      this.angle = Math.atan2(dy, dx);
    }
  }

  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }
}

class FollowChainDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Create chain segments
    this.segments = [];
    let radius = CONFIG.baseRadius;

    for (let i = 0; i < CONFIG.segmentCount; i++) {
      this.segments.push(new Segment(cx, cy, radius, i));
      radius *= CONFIG.radiusFalloff;
    }

    // Mouse/touch position (head follows this)
    this.targetX = cx;
    this.targetY = cy;

    // Track mouse
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.targetX = (e.clientX - rect.left) * (this.width / rect.width);
      this.targetY = (e.clientY - rect.top) * (this.height / rect.height);
    });

    // Track touch
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      this.targetX = (touch.clientX - rect.left) * (this.width / rect.width);
      this.targetY = (touch.clientY - rect.top) * (this.height / rect.height);
    }, { passive: false });

    // Time for secondary animations
    this.time = 0;
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Head segment follows cursor
    const head = this.segments[0];
    head.follow(this.targetX, this.targetY, CONFIG.followSpeed * 2);

    // Each subsequent segment follows the one before it
    // With progressively slower follow speed (overlapping action)
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const leader = this.segments[i - 1];

      // Calculate target position (behind the leader)
      const dist = CONFIG.segmentSpacing;
      const targetX = leader.x - Math.cos(leader.angle) * dist;
      const targetY = leader.y - Math.sin(leader.angle) * dist;

      // Follow with decreasing speed for more drag (follow through)
      const followSpeed = CONFIG.followSpeed * (1 - i * 0.01);
      segment.follow(targetX, targetY, Math.max(0.05, followSpeed));
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Motion blur trail
    ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.trailAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // Draw segments from tail to head (so head is on top)
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const segment = this.segments[i];
      const t = i / (this.segments.length - 1); // 0 = head, 1 = tail

      // Calculate stretch based on velocity (squash & stretch)
      const speed = segment.getSpeed();
      const stretch = Math.min(CONFIG.maxStretch, 1 + speed * CONFIG.velocityStretch);
      const squash = 1 / Math.sqrt(stretch); // Preserve volume

      // Secondary action: gentle pulse
      const pulse = 1 + Math.sin(this.time * 3 + i * 0.3) * 0.1;

      // Calculate stretched dimensions
      const stretchRadius = segment.radius * stretch * pulse;
      const squashRadius = segment.radius * squash * pulse;

      // Color gradient from head to tail
      const hue = CONFIG.hueStart + (CONFIG.hueEnd - CONFIG.hueStart) * t;
      const lightness = 60 - t * 20; // Head brighter
      const alpha = 1 - t * 0.3; // Tail more transparent

      // Draw with glow
      ctx.save();
      ctx.translate(segment.x, segment.y);
      ctx.rotate(segment.angle);

      // Outer glow
      const glowSize = stretchRadius * 2;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      gradient.addColorStop(0, `hsla(${hue}, 100%, ${lightness}%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${hue}, 100%, ${lightness}%, ${alpha * 0.5})`);
      gradient.addColorStop(1, `hsla(${hue}, 100%, ${lightness}%, 0)`);

      ctx.beginPath();
      ctx.ellipse(0, 0, glowSize, glowSize * squash / stretch, 0, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core ellipse (stretched in direction of motion)
      ctx.beginPath();
      ctx.ellipse(0, 0, stretchRadius, squashRadius, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, ${lightness + 20}%, ${alpha})`;
      ctx.fill();

      ctx.restore();
    }

    // Draw connecting lines between segments for extra visual
    ctx.beginPath();
    ctx.moveTo(this.segments[0].x, this.segments[0].y);
    for (let i = 1; i < this.segments.length; i++) {
      const segment = this.segments[i];
      ctx.lineTo(segment.x, segment.y);
    }
    ctx.strokeStyle = `hsla(${CONFIG.hueStart}, 80%, 50%, 0.2)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

/**
 * Create Day 2 visualization
 * @param {HTMLCanvasElement} canvas
 * @returns {Object} Game instance with stop() method
 */
export default function day02(canvas) {
  const game = new FollowChainDemo(canvas);
  game.start();

  return {
    stop: () => game.stop(),
    game
  };
}

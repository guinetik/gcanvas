/**
 * Genuary 2026 - Day 1
 * Prompt: "One color, one shape"
 *
 * THE WORMHOLE
 * One shape: Circle
 * One color: Green (#0f0)
 *
 * An infinite tunnel of circles rushing toward you.
 * Each ring is the same circle, just at different depths.
 * The tunnel twists and warps as you travel through it.
 * Click/tap to change direction. Drag to look around.
 */

import { Game, Camera3D } from '../../../src/index.js';

const CONFIG = {
  // Tunnel geometry
  ringCount: 40,
  ringSpacing: 50,
  baseRadius: 250,
  circlesPerRing: 24,

  // Movement
  speed: 180,
  twistSpeed: 0.3,
  wobbleAmount: 30,
  wobbleSpeed: 0.8,

  // Visuals - ONE COLOR: GREEN
  hue: 135,
  pulseSpeed: 2,
  glowIntensity: 0.4,
};

class WormholeDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();

    // Camera for 3D projection with mouse control
    this.camera = new Camera3D({
      perspective: 400,
      rotationX: 0,
      rotationY: 0,
      sensitivity: 0.003,
      inertia: true,
      friction: 0.95,
      clampX: true,
      minRotationX: -0.8,
      maxRotationX: 0.8,
    });
    this.camera.enableMouseControl(this.canvas);

    // Tunnel state
    this.time = 0;
    this.zOffset = 0;
    this.direction = 1; // 1 = forward, -1 = backward

    // Click to reverse direction
    this.canvas.addEventListener('click', () => {
      this.direction *= -1;
    });

    // Touch support
    this.canvas.addEventListener('touchend', (e) => {
      if (!this.camera._isDragging) {
        this.direction *= -1;
      }
    });
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.zOffset += CONFIG.speed * dt * this.direction;
    this.camera.update(dt);
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);

    // Motion blur trail
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    // Collect all circles with depth for sorting
    const circles = [];

    const totalDepth = CONFIG.ringCount * CONFIG.ringSpacing;

    for (let ring = 0; ring < CONFIG.ringCount; ring++) {
      // Calculate ring's z position (wrapping for infinite tunnel)
      let z = (ring * CONFIG.ringSpacing - this.zOffset) % totalDepth;
      if (z < 0) z += totalDepth;

      // Skip rings too close or behind camera
      if (z < 20) continue;

      // Tunnel twist based on depth and time
      const twist = this.time * CONFIG.twistSpeed + z * 0.002;

      // Wobble the tunnel path
      const wobbleX = Math.sin(this.time * CONFIG.wobbleSpeed + z * 0.01) * CONFIG.wobbleAmount;
      const wobbleY = Math.cos(this.time * CONFIG.wobbleSpeed * 0.7 + z * 0.01) * CONFIG.wobbleAmount * 0.6;

      // Ring radius pulses
      const pulse = 1 + Math.sin(this.time * CONFIG.pulseSpeed + z * 0.02) * 0.1;
      const ringRadius = CONFIG.baseRadius * pulse;

      // Create circles around this ring
      for (let i = 0; i < CONFIG.circlesPerRing; i++) {
        const angle = (i / CONFIG.circlesPerRing) * Math.PI * 2 + twist;

        // Position on the ring
        const localX = Math.cos(angle) * ringRadius + wobbleX;
        const localY = Math.sin(angle) * ringRadius + wobbleY;

        // Project through camera
        const projected = this.camera.project(localX, localY, z);

        // Circle size based on depth
        const circleRadius = Math.max(2, 12 * projected.scale);

        // ONE COLOR - just vary lightness by depth (keep it green, not white)
        const depthRatio = 1 - z / totalDepth;
        const lightness = 35 + depthRatio * 20; // 35-55% (stays green, not white)
        const alpha = Math.min(1, depthRatio * 1.5);

        circles.push({
          x: cx + projected.x,
          y: cy + projected.y,
          radius: circleRadius,
          z: projected.z,
          lightness,
          alpha,
        });
      }
    }

    // Sort by depth (far to near)
    circles.sort((a, b) => b.z - a.z);

    // Draw circles - ALL THE SAME GREEN
    for (const circle of circles) {
      if (circle.alpha < 0.05) continue;

      // Glow effect
      const gradient = ctx.createRadialGradient(
        circle.x, circle.y, 0,
        circle.x, circle.y, circle.radius * 2
      );

      const color = `hsl(${CONFIG.hue}, 100%, ${circle.lightness}%)`;
      const glowColor = `hsla(${CONFIG.hue}, 100%, ${circle.lightness}%, 0)`;

      // Glow effect - same green, just fades out
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.4, color);
      gradient.addColorStop(1, glowColor);

      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = circle.alpha;
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    // Center vortex glow - project through camera so it follows the tunnel
    const vortexCenter = this.camera.project(0, 0, 200);
    const vcx = cx + vortexCenter.x;
    const vcy = cy + vortexCenter.y;

    const vortexGradient = ctx.createRadialGradient(vcx, vcy, 0, vcx, vcy, 150);
    vortexGradient.addColorStop(0, `hsla(${CONFIG.hue}, 100%, 50%, 0.4)`);
    vortexGradient.addColorStop(0.5, `hsla(${CONFIG.hue}, 100%, 45%, 0.15)`);
    vortexGradient.addColorStop(1, `hsla(${CONFIG.hue}, 100%, 40%, 0)`);

    ctx.beginPath();
    ctx.arc(vcx, vcy, 150, 0, Math.PI * 2);
    ctx.fillStyle = vortexGradient;
    ctx.fill();
  }
}

/**
 * Create Day 1 visualization
 * @param {HTMLCanvasElement} canvas
 * @returns {Object} Game instance with stop() method
 */
export default function day01(canvas) {
  const game = new WormholeDemo(canvas);
  game.start();

  // Return object with stop method for lifecycle management
  return {
    stop: () => game.stop(),
    game
  };
}

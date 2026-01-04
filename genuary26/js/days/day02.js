/**
 * Genuary 2026 - Day 2
 * Prompt: "Twelve principles of animation"
 *
 * Demonstrates key animation principles:
 * - Squash & Stretch: bouncing ball
 * - Anticipation: winding up before action
 * - Staging: clear composition
 * - Timing & Spacing: easing functions
 * - Follow Through: elastic overshoot
 * - Slow In/Out: smooth acceleration
 * - Arcs: orbital motion
 * - Secondary Action: supporting movements
 */

import { gcanvas } from '../../../src/index.js';

/**
 * Create Day 2 visualization
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @returns {FluentGame} The game instance for lifecycle management
 */
export default function day02(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  // Scale shapes based on canvas size
  const scale = Math.min(w, h) / 600;
  const radius = 25 * scale;
  const spacing = 120 * scale;

  const game = gcanvas({ canvas, bg: '#000' });
  const scene = game.scene('principles');

  // Row 1: Basic timing principles
  const row1Y = cy - spacing * 0.8;

  // 1. Squash & Stretch - Bouncing ball
  scene
    .go({ x: cx - spacing * 1.5, y: row1Y, name: 'bounce' })
      .circle({ radius: radius, fill: '#ff6b6b' })
      .bounce({ height: 80 * scale, bounces: 3, duration: 2 });

  // 2. Slow In/Out - Pulsing with easing
  scene
    .go({ x: cx - spacing * 0.5, y: row1Y, name: 'pulse' })
      .star({ points: 5, radius: radius, fill: '#ffd93d' })
      .pulse({ min: 0.7, max: 1.3, duration: 1.5 });

  // 3. Arcs - Orbital motion
  scene
    .go({ x: cx + spacing * 0.5, y: row1Y, name: 'orbit' })
      .hexagon({ radius: radius * 0.8, fill: '#4ecdc4' })
      .orbit({ radiusX: 50 * scale, radiusY: 30 * scale, duration: 3 });

  // 4. Follow Through - Elastic oscillation
  scene
    .go({ x: cx + spacing * 1.5, y: row1Y, name: 'oscillate' })
      .diamond({ width: radius * 1.5, height: radius * 2, fill: '#a8e6cf' })
      .oscillate({ prop: 'y', min: -40 * scale, max: 40 * scale, duration: 2 });

  // Row 2: Secondary motion principles
  const row2Y = cy + spacing * 0.8;

  // 5. Pendulum swing - Rotational timing
  scene
    .go({ x: cx - spacing, y: row2Y - 20 * scale, name: 'pendulum' })
      .rect({ width: 8 * scale, height: 60 * scale, fill: '#c44dff' })
      .pendulum({ amplitude: 35, duration: 2.5 });

  // 6. Floating - Random secondary action
  scene
    .go({ x: cx, y: row2Y, name: 'float' })
      .circle({ radius: radius * 0.7, fill: '#ff8c42' })
      .float({ radius: 20 * scale, speed: 0.8, duration: 4 });

  // 7. Spiral - Complex motion path
  scene
    .go({ x: cx + spacing, y: row2Y, name: 'spiral' })
      .triangle({ size: radius * 1.2, fill: '#45b7d1' })
      .spiral({ startRadius: 10 * scale, endRadius: 40 * scale, duration: 4 });

  // Center label (static reference point)
  scene
    .go({ x: cx, y: cy, name: 'center' })
      .ring({ innerRadius: 3 * scale, outerRadius: 6 * scale, fill: '#333' });

  return game.start();
}

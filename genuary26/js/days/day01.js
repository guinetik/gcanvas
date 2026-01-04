/**
 * Genuary 2026 - Day 1
 * Prompt: "One color, one shape"
 *
 * One shape: CIRCLE
 * One color: GREEN (but shifting through all its hues)
 *
 * A hypnotic vortex of circles - hundreds of them spinning,
 * pulsing, and breathing in concentric rings. Each circle is
 * the same shape, each tinted green - but together they create
 * a psychedelic mandala that feels alive.
 */

import { gcanvas } from '../../../src/index.js';

// Configuration
const CONFIG = {
  rings: 8,
  shapesPerRing: [6, 10, 14, 18, 22, 26, 30, 36],
  baseRadius: 35,
  ringSpacing: 40,
  rotationSpeeds: [1.2, -0.9, 0.7, -0.55, 0.45, -0.35, 0.28, -0.22],
  pulseAmplitudes: [0.2, 0.18, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05],
  baseHue: 120, // Green
  hueRange: 40, // Shift within green spectrum (80-160)
};

/**
 * Create Day 1 visualization
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @returns {FluentGame} The game instance for lifecycle management
 */
export default function day01(canvas) {
  const game = gcanvas({ canvas, bg: '#000', fluid: false });
  const scene = game.scene('vortex');

  // Store shape data for animation
  const allShapes = [];

  // Get center and scale
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const scale = Math.min(canvas.width, canvas.height) / 800;

  // Core - central pulsing circle
  scene.go({ x: cx, y: cy, name: 'core' })
    .circle({ radius: 20 * scale, fill: '#0f0' });
  allShapes.push({ name: 'core', ring: -1, index: 0 });

  // Create concentric rings of circles
  for (let ring = 0; ring < CONFIG.rings; ring++) {
    const shapesInRing = CONFIG.shapesPerRing[ring];
    const ringRadius = (CONFIG.baseRadius + ring * CONFIG.ringSpacing) * scale;
    const circleRadius = Math.max(4, (14 - ring * 1.2)) * scale;

    for (let i = 0; i < shapesInRing; i++) {
      const angle = (i / shapesInRing) * Math.PI * 2;
      const name = `r${ring}_s${i}`;

      // Initial position
      const x = cx + Math.cos(angle) * ringRadius;
      const y = cy + Math.sin(angle) * ringRadius;

      // Create the circle - all green, all circles
      const hue = CONFIG.baseHue + ((ring * 5 + i * 3) % CONFIG.hueRange) - CONFIG.hueRange / 2;
      scene.go({ x, y, name })
        .circle({
          radius: circleRadius,
          fill: `hsl(${hue}, 100%, 50%)`
        });

      allShapes.push({
        name,
        ring,
        index: i,
        baseAngle: angle,
        ringRadius,
        circleRadius,
      });
    }
  }

  // Outer particle ring - tiny circles
  const particleCount = 48;
  const particleRadius = (CONFIG.baseRadius + CONFIG.rings * CONFIG.ringSpacing + 35) * scale;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const name = `particle_${i}`;
    const x = cx + Math.cos(angle) * particleRadius;
    const y = cy + Math.sin(angle) * particleRadius;

    scene.go({ x, y, name })
      .circle({ radius: 3 * scale, fill: '#0f0' });

    allShapes.push({
      name,
      ring: CONFIG.rings,
      index: i,
      baseAngle: angle,
      ringRadius: particleRadius,
      isParticle: true,
    });
  }

  // Animation state
  let time = 0;

  // Override clear for motion blur trail effect
  const gameInstance = game.game;
  gameInstance.clear = function() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  };

  // Animation loop
  game.on('update', (dt, ctx) => {
    time += dt;

    // Animate core
    const core = ctx.refs.core;
    if (core) {
      const coreScale = (1 + Math.sin(time * 4) * 0.3) * scale;
      core.scaleX = coreScale;
      core.scaleY = coreScale;
      core.rotation = time * 2;

      // Core color - cycle through greens
      if (core._fluentShape) {
        const coreHue = CONFIG.baseHue + Math.sin(time * 2) * (CONFIG.hueRange / 2);
        const lightness = 50 + Math.sin(time * 6) * 20;
        core._fluentShape.color = `hsl(${coreHue}, 100%, ${lightness}%)`;
      }
    }

    // Animate each ring
    for (const shape of allShapes) {
      if (shape.ring < 0) continue; // Skip core

      const go = ctx.refs[shape.name];
      if (!go) continue;

      if (shape.isParticle) {
        // Particle animation
        const particleSpeed = 0.18;
        const newAngle = shape.baseAngle + time * particleSpeed;
        const wobble = Math.sin(time * 3 + shape.index * 0.4) * 10 * scale;

        go.x = cx + Math.cos(newAngle) * (shape.ringRadius + wobble);
        go.y = cy + Math.sin(newAngle) * (shape.ringRadius + wobble);

        // Twinkle
        const twinkle = 0.3 + Math.abs(Math.sin(time * 10 + shape.index * 0.5)) * 0.7;
        go.scaleX = twinkle * scale;
        go.scaleY = twinkle * scale;

        // Color pulse
        if (go._fluentShape) {
          const hue = CONFIG.baseHue + Math.sin(time * 2 + shape.index * 0.2) * (CONFIG.hueRange / 2);
          go._fluentShape.color = `hsl(${hue}, 100%, ${50 + twinkle * 30}%)`;
        }
      } else {
        // Ring shape animation
        const ringIndex = shape.ring;
        const rotationSpeed = CONFIG.rotationSpeeds[ringIndex];
        const pulseAmp = CONFIG.pulseAmplitudes[ringIndex];

        // Rotate
        const newAngle = shape.baseAngle + time * rotationSpeed;

        // Breathing radius
        const breathPhase = time * 1.2 + ringIndex * 0.5;
        const breathRadius = shape.ringRadius + Math.sin(breathPhase) * 12 * scale;

        // Position
        go.x = cx + Math.cos(newAngle) * breathRadius;
        go.y = cy + Math.sin(newAngle) * breathRadius;

        // Pulse scale
        const pulsePhase = time * 3 + ringIndex * 0.4 + shape.index * 0.1;
        const pulseScale = 1 + Math.sin(pulsePhase) * pulseAmp;
        go.scaleX = pulseScale;
        go.scaleY = pulseScale;

        // Rotate individual shapes
        go.rotation = time * (ringIndex % 2 === 0 ? 3 : -3);

        // Color - all greens, but shifting
        if (go._fluentShape) {
          const hueShift = time * 30;
          const positionHue = shape.index * (360 / CONFIG.shapesPerRing[ringIndex]);
          const finalHue = CONFIG.baseHue + Math.sin((hueShift + positionHue) * 0.02) * (CONFIG.hueRange / 2);
          const saturation = 90 + Math.sin(time * 2 + ringIndex) * 10;
          const lightness = 45 + Math.sin(time * 4 + shape.index * 0.2) * 15;

          go._fluentShape.color = `hsl(${finalHue}, ${saturation}%, ${lightness}%)`;
        }
      }
    }
  });

  return game.start();
}

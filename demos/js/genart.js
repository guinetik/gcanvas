/**
 * Hypnotic Mandala - Generative Art Demo
 *
 * A trippy, psychedelic mandala using the gcanvas fluent API.
 * Features:
 * - Concentric rings of shapes rotating at different speeds
 * - HSL color cycling based on time and position
 * - Pulsing and breathing effects
 * - Responsive scaling for mobile
 */

import { gcanvas } from '../../src/index.js';

// Configuration - base values at 800px reference size
const CONFIG = {
  referenceSize: 800,      // Design reference size
  minScale: 0.4,           // Minimum scale on small screens
  rings: 6,
  shapesPerRing: [8, 12, 16, 20, 24, 32],
  baseRadius: 50,
  ringSpacing: 45,
  rotationSpeeds: [0.8, -0.6, 0.5, -0.4, 0.3, -0.2],
  pulseAmplitudes: [0.12, 0.1, 0.08, 0.06, 0.05, 0.04],
  colorOffsets: [0, 60, 120, 180, 240, 300],
};

// Calculate scale factor based on screen size
function getScaleFactor(width, height) {
  const minDimension = Math.min(width, height);
  const scale = minDimension / CONFIG.referenceSize;
  return Math.max(CONFIG.minScale, Math.min(1.2, scale));
}

// Shape factory functions
const shapeTypes = ['circle', 'star', 'triangle', 'hexagon', 'diamond', 'ring'];

function getShapeConfig(ringIndex, shapeIndex) {
  const type = shapeTypes[ringIndex % shapeTypes.length];
  const baseSize = 12 - ringIndex;

  switch (type) {
    case 'circle':
      return { method: 'circle', opts: { radius: baseSize } };
    case 'star':
      return { method: 'star', opts: { radius: baseSize, points: 5 + (ringIndex % 3), inset: 0.5 } };
    case 'triangle':
      return { method: 'triangle', opts: { size: baseSize * 1.8 } };
    case 'hexagon':
      return { method: 'hexagon', opts: { radius: baseSize } };
    case 'diamond':
      return { method: 'diamond', opts: { width: baseSize, height: baseSize * 1.5 } };
    case 'ring':
      return { method: 'ring', opts: { innerRadius: baseSize * 0.5, outerRadius: baseSize } };
    default:
      return { method: 'circle', opts: { radius: baseSize } };
  }
}

// Initialize the mandala
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: '#0a0a0f', fluid: true });
  const scene = game.scene('mandala');

  // Store shape references for animation
  const allShapes = [];

  // Create center piece - a pulsing core (position will be updated dynamically)
  scene.go({ x: 0, y: 0, name: 'core' })
    .star({ radius: 25, points: 8, inset: 0.6, fill: '#fff' });
  allShapes.push({ name: 'core', ring: -1, index: 0 });

  // Create concentric rings
  for (let ring = 0; ring < CONFIG.rings; ring++) {
    const shapesInRing = CONFIG.shapesPerRing[ring];
    const ringRadius = CONFIG.baseRadius + ring * CONFIG.ringSpacing;

    for (let i = 0; i < shapesInRing; i++) {
      const angle = (i / shapesInRing) * Math.PI * 2;
      const name = `r${ring}_s${i}`;

      const shapeConfig = getShapeConfig(ring, i);
      const goBuilder = scene.go({ x: 0, y: 0, name });

      // Apply the shape with initial color
      const hue = (ring * 60 + i * (360 / shapesInRing)) % 360;
      goBuilder[shapeConfig.method]({
        ...shapeConfig.opts,
        fill: `hsl(${hue}, 80%, 60%)`
      });

      allShapes.push({
        name,
        ring,
        index: i,
        baseAngle: angle,
        ringRadius,
        shapeConfig
      });
    }
  }

  // Create outer particle ring
  const particleCount = 48;
  const particleRadius = CONFIG.baseRadius + CONFIG.rings * CONFIG.ringSpacing + 40;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const name = `particle_${i}`;

    scene.go({ x: 0, y: 0, name })
      .circle({ radius: 3, fill: '#fff' });

    allShapes.push({
      name,
      ring: CONFIG.rings,
      index: i,
      baseAngle: angle,
      ringRadius: particleRadius,
      isParticle: true
    });
  }

  // Animation update loop
  let time = 0;

  // Get reference to underlying game for live dimensions
  const gameInstance = game.game;

  // Override clear for trail effect (like particles.js)
  gameInstance.clear = function() {
    this.ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
    this.ctx.fillRect(0, 0, this.width, this.height);
  };

  game.on('update', (dt, ctx) => {
    time += dt;

    // Get dynamic center and scale based on LIVE canvas size
    const cx = gameInstance.width / 2;
    const cy = gameInstance.height / 2;
    const scaleFactor = getScaleFactor(gameInstance.width, gameInstance.height);

    // Animate core
    const core = ctx.refs.core;
    if (core) {
      core.x = cx;
      core.y = cy;
      const coreScale = (1 + Math.sin(time * 4) * 0.25) * scaleFactor;
      core.scaleX = coreScale;
      core.scaleY = coreScale;
      core.rotation = time * 1.5;

      // Update core color
      if (core._fluentShape) {
        const coreHue = (time * 100) % 360;
        core._fluentShape.color = `hsl(${coreHue}, 100%, 70%)`;
      }
    }

    // Animate each ring
    for (const shape of allShapes) {
      if (shape.ring < 0) continue; // Skip core

      const go = ctx.refs[shape.name];
      if (!go) continue;

      if (shape.isParticle) {
        // Particle animation - orbit and twinkle
        const particleSpeed = 0.15;
        const newAngle = shape.baseAngle + time * particleSpeed;
        const wobble = Math.sin(time * 2 + shape.index * 0.3) * 8 * scaleFactor;
        const scaledRadius = shape.ringRadius * scaleFactor;

        go.x = cx + Math.cos(newAngle) * (scaledRadius + wobble);
        go.y = cy + Math.sin(newAngle) * (scaledRadius + wobble);

        // Scale particle size
        go.scaleX = scaleFactor;
        go.scaleY = scaleFactor;

        // Twinkle effect
        const alpha = 0.4 + Math.abs(Math.sin(time * 8 + shape.index * 0.3)) * 0.6;
        if (go._fluentShape) {
          go._fluentShape.opacity = alpha;
        }
      } else {
        // Ring shape animation
        const ringIndex = shape.ring;
        const rotationSpeed = CONFIG.rotationSpeeds[ringIndex];
        const pulseAmp = CONFIG.pulseAmplitudes[ringIndex];

        // Rotate around center - smooth continuous rotation
        const newAngle = shape.baseAngle + time * rotationSpeed;

        // Gentle breathing effect on radius (scaled)
        const breathPhase = time * 0.8 + ringIndex * 0.5;
        const scaledRadius = shape.ringRadius * scaleFactor;
        const breathRadius = scaledRadius + Math.sin(breathPhase) * 8 * scaleFactor;

        // Smooth position update
        go.x = cx + Math.cos(newAngle) * breathRadius;
        go.y = cy + Math.sin(newAngle) * breathRadius;

        // Smooth pulse scale (includes responsive scaling)
        const pulsePhase = time * 2 + ringIndex * 0.3;
        const scale = (1 + Math.sin(pulsePhase) * pulseAmp) * scaleFactor;
        go.scaleX = scale;
        go.scaleY = scale;

        // Rotate individual shapes - smooth spin
        go.rotation = time * (ringIndex % 2 === 0 ? 2 : -2);

        // Color cycling - psychedelic HSL animation
        if (go._fluentShape) {
          const baseHue = CONFIG.colorOffsets[ringIndex];
          const hueShift = time * 60; // Faster color rotation
          const positionHue = shape.index * (360 / CONFIG.shapesPerRing[ringIndex]);

          const finalHue = (baseHue + hueShift + positionHue) % 360;
          const saturation = 85;
          const lightness = 55 + Math.sin(time * 3 + ringIndex) * 10;

          go._fluentShape.color = `hsl(${finalHue}, ${saturation}%, ${lightness}%)`;
        }
      }
    }
  });

  game.start();
});

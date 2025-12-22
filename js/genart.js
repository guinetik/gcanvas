/**
 * Hypnotic Mandala - Generative Art Demo
 *
 * A trippy, psychedelic mandala using the gcanvas fluent API.
 * Features:
 * - Concentric rings of shapes rotating at different speeds
 * - HSL color cycling based on time and position
 * - Pulsing and breathing effects
 * - Responsive scaling for mobile
 * - 3D rotation with inertia (drag to rotate!)
 */

import { gcanvas, Camera3D } from "/gcanvas.es.min.js";

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

  // Create 3D camera with inertia for interactive rotation
  const camera = new Camera3D({
    rotationX: 0,            // Start flat
    rotationY: 0,
    perspective: 600,
    sensitivity: 0.008,
    inertia: true,
    friction: 0.96,          // Higher = more drift before stopping
    velocityScale: 2.5,      // More momentum on fast flicks
    autoRotate: false,       // No auto-rotation - stays where user leaves it
    clampX: false,           // Free rotation in all directions
  });

  // Enable mouse/touch drag to rotate
  camera.enableMouseControl(canvas);

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

    // Update camera (handles inertia and auto-rotation)
    camera.update(dt);

    // Get dynamic center and scale based on LIVE canvas size
    const cx = gameInstance.width / 2;
    const cy = gameInstance.height / 2;
    const scaleFactor = getScaleFactor(gameInstance.width, gameInstance.height);

    // Animate core - project through 3D camera
    const core = ctx.refs.core;
    if (core) {
      // Core at the tip of the cone (closest), with breathing pulse
      const coreZ = Math.sin(time * 2) * 40 - 150; // Oscillates at the front tip
      const projected = camera.project(0, 0, coreZ);
      core.x = cx + projected.x;
      core.y = cy + projected.y;
      const coreScale = (1 + Math.sin(time * 4) * 0.25) * scaleFactor * projected.scale;
      core.scaleX = coreScale;
      core.scaleY = coreScale;
      core.rotation = time * 1.5;

      // Update core color
      if (core._fluentShape) {
        const coreHue = (time * 100) % 360;
        core._fluentShape.color = `hsl(${coreHue}, 100%, 70%)`;
      }
    }

    // Animate each ring with 3D projection
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

        // Calculate 2D position on the mandala plane
        const localX = Math.cos(newAngle) * (scaledRadius + wobble);
        const localY = Math.sin(newAngle) * (scaledRadius + wobble);

        // Project through 3D camera (particles at base of cone, furthest back)
        const projected = camera.project(localX, localY, 300);
        go.x = cx + projected.x;
        go.y = cy + projected.y;

        // Scale particle size with perspective
        go.scaleX = scaleFactor * projected.scale;
        go.scaleY = scaleFactor * projected.scale;

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

        // Calculate 2D position on the mandala plane
        const localX = Math.cos(newAngle) * breathRadius;
        const localY = Math.sin(newAngle) * breathRadius;

        // Project through 3D camera - CONE shape: inner rings close, outer rings far
        const ringDepth = ringIndex * 60 - 50; // Ring 0 at -50, Ring 5 at 250
        const projected = camera.project(localX, localY, ringDepth);
        go.x = cx + projected.x;
        go.y = cy + projected.y;

        // Smooth pulse scale with perspective
        const pulsePhase = time * 2 + ringIndex * 0.3;
        const scale = (1 + Math.sin(pulsePhase) * pulseAmp) * scaleFactor * projected.scale;
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

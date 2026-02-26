/**
 * Chen (Chen-Lee) Attractor 3D Visualization
 *
 * Discovered by Guanrong Chen & Jinhu Lü (1999).
 * A double-scroll butterfly with wider, more open lobes than Lorenz.
 * Related to but dynamically distinct from the Lorenz system.
 *
 * @see {@link https://www.dynamicmath.xyz/strange-attractors/}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("chen", {
  attractor: {
    dt: 0.008,
    scale: 12,
  },

  particles: {
    count: Screen.responsive(250, 400, 550),
    trailLength: Screen.responsive(150, 200, 300),
    spawnRange: 10,
  },

  // z range 2.75–20.8, visual midpoint ~12
  center: { x: 0, y: 0, z: 12 },

  camera: {
    perspective: 800,
    rotationX: -1.3,   // Look down at x-y plane to see both lobes
    rotationY: 0,
  },

  visual: {
    minHue: 200,  // Cyan-blue (fast)
    maxHue: 280,  // Purple-violet (slow)
    maxSpeed: 50,
    saturation: 95,
    lightness: 45,
    maxAlpha: 0.55,
    hueShiftSpeed: 12,
  },

  glow: {
    enabled: true,
    radius: 75,
    intensity: 0.75,
  },

  blink: {
    chance: 0.015,
    intensityBoost: 1.4,
    saturationBoost: 1.15,
    alphaBoost: 1.25,
  },

  warmupSteps: 1,

  zoom: { min: 0.2, max: 2.5 },

  mouseControl: { horizontalAxis: "rotationZ" },
  normalizeRotation: true,

  spawnOffset: { z: 8.7 },

  // Each particle gets unique params (±3%) to desync orbits and fill vortex eyes
  paramVariation: { params: { alpha: 5, beta: -20, delta: -0.38 }, range: 0.05 },

  maxDistance: 50,
  respawnChance: 0.001,

  autoRotation: { enabled: true, speed: 0.15, axis: "z" },
});

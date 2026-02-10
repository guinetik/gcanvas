/**
 * Rössler Attractor 3D Visualization
 *
 * Discovered by Otto Rössler (1976). One of the simplest chaotic attractors,
 * featuring a single spiral that folds back on itself — simpler than Lorenz
 * but equally chaotic.
 *
 * Each particle gets slightly different attractor parameters (2% variation)
 * and a random warmup phase to spread particles across the attractor cycle.
 *
 * @see {@link https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("rossler", {
  attractor: {
    dt: 0.075,   // Large dt — Rössler is slow-moving
    scale: 15,
  },

  particles: {
    count: Screen.responsive(200, 300, 400),
    trailLength: Screen.responsive(150, 200, 250),
    spawnRange: 4,
  },

  // Rössler spirals in x-y, spikes in z — centroid of trajectory
  center: { x: 0.5, y: -2.5, z: 2.5 },

  camera: {
    perspective: 500,
    rotationX: 0.3,
    rotationY: 0,
  },

  visual: {
    minHue: 40,   // Yellow-orange (fast)
    maxHue: 280,  // Purple (slow)
    maxSpeed: 20,
    saturation: 85,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 10,
  },

  blink: {
    chance: 0.015,
    intensityBoost: 1.4,
    saturationBoost: 1.15,
    alphaBoost: 1.25,
  },

  zoom: { min: 0.2, max: 2.5 },

  // XZY with inverted screen-Y for best visual orientation
  axisMapping: { x: "x", y: "z", z: "y", sx: 1, sy: -1, sz: 1 },
  warmupSteps: 0,
  // Each particle gets unique params (±2%) to prevent sync
  paramVariation: { params: { a: 0.2, b: 0.2, c: 5.7 }, range: 0.02 },

  respawnChance: 0.01,

  autoRotation: { enabled: true, speed: 0.15, axis: "y" },
});

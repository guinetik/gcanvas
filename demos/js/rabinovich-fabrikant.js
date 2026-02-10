/**
 * Rabinovich-Fabrikant Attractor 3D Visualization
 *
 * Discovered by Mikhail Rabinovich & Anatoly Fabrikant (1979).
 * Models modulation instability in a non-equilibrium dissipative medium.
 * Produces wide, nested petal-like loops with dramatic vertical structure.
 *
 * @see {@link https://en.wikipedia.org/wiki/Rabinovich%E2%80%93Fabrikant_equations}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("rabinovichFabrikant", {
  attractor: {
    dt: 0.02,     // Larger dt for faster motion — RK4 handles it
    scale: 85,    // Attractor spans ~4 units, scaled up for impact
  },

  particles: {
    count: Screen.responsive(200, 300, 550),
    trailLength: Screen.responsive(200, 300, 400),
    spawnRange: 3,  // Wide spawn range to seed both lobes (x ≈ ±1)
  },

  // Center on the attractor's visual centroid
  center: { x: 0, y: 0, z: 0.8 },

  // Spawn centered with z offset so particles start near the attractor plane
  spawnOffset: { x: 0, y: 0, z: 0.5 },

  camera: {
    perspective: 600,
    rotationX: 0.4,
    rotationY: 0,
  },

  visual: {
    minHue: 330,  // Hot pink (fast — sharp turns)
    maxHue: 200,  // Cyan (slow — gliding arcs)
    maxSpeed: 8,
    saturation: 90,
    lightness: 60,
    maxAlpha: 0.85,
    hueShiftSpeed: 12,
  },

  blink: {
    chance: 0.02,
    minDuration: 0.03,
    maxDuration: 0.15,
    intensityBoost: 1.6,
    saturationBoost: 1.2,
    alphaBoost: 1.3,
  },

  zoom: { min: 0.5, max: 3.0 },

  warmupSteps: 1000,    // More warmup to distribute across both lobes
  maxDistance: 4,        // Tight cull — R-F orbits stay within ~3 units
  respawnChance: 0.002,

  autoRotation: { enabled: true, speed: 0.15, axis: "y" },
});

/**
 * Thomas Attractor 3D Visualization
 *
 * Thomas' Cyclically Symmetric Attractor (1999), discovered by René Thomas.
 * Features elegant symmetry and smooth cyclical motion with a simple
 * sinusoidal structure.
 *
 * @see {@link https://en.wikipedia.org/wiki/Thomas%27_cyclically_symmetric_attractor}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("thomas", {
  attractor: {
    dt: 0.08,   // Thomas needs larger dt
    scale: 60,
  },

  particles: {
    count: Screen.responsive(250, 375, 500),
    trailLength: Screen.responsive(300, 400, 500),
    spawnRange: 2,
  },

  center: { x: -0.2, y: -0.2, z: 0 },

  camera: {
    perspective: 800,
    rotationX: 0.3,
    rotationY: 0.2,
  },

  // Green / teal palette
  visual: {
    minHue: 120, // Green (fast)
    maxHue: 200, // Cyan-blue (slow)
    maxSpeed: 2.5, // Thomas is slow-moving
    saturation: 85,
    lightness: 50,
    maxAlpha: 0.8,
    hueShiftSpeed: 8,
  },

  blink: {
    chance: 0.012,
    minDuration: 0.06,
    intensityBoost: 1.4,
    saturationBoost: 1.15,
    alphaBoost: 1.2,
  },

  zoom: { min: 0.3, max: 3.0 },

  // Auto-rotate around the attractor to showcase its symmetry
  autoRotation: {
    enabled: true,
    speed: 0.15, // Slow, elegant orbit
    axis: "y",
  },
});

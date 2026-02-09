/**
 * Dadras Attractor 3D Visualization
 *
 * A 3D chaotic attractor with broad, sweeping orbits.
 * Trails are coloured by velocity (blue = slow, red = fast)
 * with additive blending for a glowing effect.
 *
 * @see {@link https://www.dynamicmath.xyz/strange-attractors/}
 */

import { Attractor3DDemo } from "./attractor-3d-demo.js";

Attractor3DDemo.run("dadras", {
  attractor: {
    dt: 0.01,
    scale: 50,
  },

  particles: {
    count: 500,
    trailLength: 200,
    spawnRange: 5,
  },

  center: { x: 0, y: 0, z: 0 },

  camera: {
    perspective: 800,
    rotationX: 0.3,
    rotationY: 0,
  },

  visual: {
    minHue: 60,   // Red (fast)
    maxHue: 240,  // Blue (slow)
    maxSpeed: 30,
    saturation: 80,
    lightness: 50,
    maxAlpha: 0.9,
    hueShiftSpeed: 20,
  },

  blink: {
    chance: 0.02,
    intensityBoost: 1.5,
    saturationBoost: 1.2,
    alphaBoost: 1.3,
  },

  zoom: { min: 0.3, max: 3.0 },

  respawnChance: 0,
});

/**
 * Halvorsen Attractor 3D Visualization
 *
 * A symmetric chaotic attractor with three-fold rotational symmetry.
 * Creates beautiful intertwined spiral structures.
 *
 * @see {@link https://www.dynamicmath.xyz/strange-attractors/}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("halvorsen", {
  attractor: {
    dt: 0.004,
    scale: 25,
  },

  particles: {
    count: Screen.responsive(350, 500, 700),
    trailLength: Screen.responsive(100, 125, 150),
    spawnRange: 1,
  },

  center: { x: 0, y: 0, z: 0 },

  camera: {
    perspective: 300,     // Lower perspective for dramatic depth
    rotationX: 0.615,
    rotationY: 0.495,
  },

  visual: {
    minHue: 320, // Pink (fast)
    maxHue: 220, // Blue (slow)
    maxSpeed: 40,
    saturation: 80,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 15,
  },

  blink: {
    chance: 0.08,
    minDuration: 0.04,
    maxDuration: 0.18,
    intensityBoost: 1.5,
    saturationBoost: 1.2,
    alphaBoost: 1.3,
  },

  zoom: { min: 0.25, max: 2.5 },

  // Swap Y/Z so vertical mouse drag rotates naturally
  axisMapping: "yz-swap",

  respawnChance: 0.002,

  autoRotation: { enabled: true, speed: 0.15, axis: "y" },
});

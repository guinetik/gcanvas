/**
 * Aizawa Attractor 3D Visualization
 *
 * A 3D chaotic system with intricate folding structure, named after
 * Japanese mathematician Tomohiko Aizawa. Features complex orbits
 * with a distinctive torus-like shape.
 *
 * @see {@link https://en.wikipedia.org/wiki/Aizawa_attractor}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("aizawa", {
  attractor: {
    dt: 0.008,
    scale: 120, // Aizawa is small — needs larger scale
  },

  particles: {
    count: Screen.responsive(250, 375, 500),
    trailLength: Screen.responsive(130, 175, 220),
    spawnRange: 0.5,
  },

  center: { x: 0, y: 0, z: 0.65 },

  camera: {
    perspective: 800,
    rotationX: 0.4,
    rotationY: 0,
  },

  visual: {
    minHue: 280, // Magenta (fast)
    maxHue: 180, // Cyan (slow)
    maxSpeed: 8,
    saturation: 90,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 12,
  },

  blink: {
    chance: 0.018,
    minDuration: 0.04,
    maxDuration: 0.2,
    intensityBoost: 1.5,
    saturationBoost: 1.2,
    alphaBoost: 1.3,
  },

  zoom: { min: 0.3, max: 2.5 },

  // Swap Y/Z so the vertical axis aligns with screen vertical
  axisMapping: "yz-swap",
  // Inverted mouse controls feel more natural with this orientation
  mouseControl: { invertX: true, invertY: true },
  normalizeRotation: true,

  respawnChance: 0.001,

  autoRotation: { enabled: true, speed: 0.15, axis: "y" },
});

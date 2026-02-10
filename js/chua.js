/**
 * Chua's Circuit Attractor 3D Visualization
 *
 * The first physical electronic circuit proven to exhibit chaos (1983).
 * Leon Chua's piecewise-linear nonlinear resistor produces the iconic
 * double-scroll attractor — two spiralling lobes joined by a saddle.
 *
 * @see {@link https://en.wikipedia.org/wiki/Chua%27s_circuit}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("chua", {
  attractor: {
    dt: 0.01,
    scale: 60,    // x: ±3, y: ±1.3, z: ±8 → display coords ±480
  },

  particles: {
    count: Screen.responsive(250, 400, 550),
    trailLength: Screen.responsive(150, 250, 350),
    spawnRange: 1,
  },

  // Centroid at origin; x: ±3.1, y: ±1.3, z: ±8.4
  center: { x: 0, y: 0, z: 0 },

  camera: {
    perspective: 800,
    rotationX: 0.5,
    rotationY: -0.6,
  },

  visual: {
    minHue: 90,   // Green (fast — scroll transitions)
    maxHue: 180,  // Cyan (slow — spiral arms)
    maxSpeed: 20,
    saturation: 90,
    lightness: 48,
    maxAlpha: 0.6,
    hueShiftSpeed: 10,
  },

  blink: {
    chance: 0.02,
    intensityBoost: 1.5,
    saturationBoost: 1.2,
    alphaBoost: 1.3,
  },

  bloom: {
    enabled: true,
    threshold: 0.3,
    strength: 0.3,
    radius: 0.5,
  },

  zoom: { min: 0.3, max: 3.0 },

  warmupSteps: 0,
  maxDistance: 12,
  respawnChance: 0.003,

  spawnOffset: { x: 0.1, y: 0.1, z: 0.1 },

  autoRotation: { enabled: true, speed: 0.15, axis: "y" },
});

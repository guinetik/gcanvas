/**
 * Lorenz Attractor 3D Visualization
 *
 * The classic "butterfly effect" attractor discovered by Edward Lorenz (1963)
 * while studying atmospheric convection. Particles follow chaotic
 * trajectories coloured by velocity (blue = slow, orange-red = fast).
 *
 * @see {@link https://en.wikipedia.org/wiki/Lorenz_system}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("lorenz", {
  attractor: {
    dt: 0.005,
    scale: 12,
  },

  particles: {
    count: Screen.responsive(300, 450, 600),
    trailLength: Screen.responsive(150, 200, 250),
    spawnRange: 5,
  },

  // Lorenz orbits around z ≈ 27 (ρ − 1)
  center: { x: 5, y: 0, z: 27 },

  // Angled to show the butterfly shape
  camera: {
    perspective: 800,
    rotationX: -1.8,
    rotationY: -3,
  },

  visual: {
    minHue: 30,   // Orange-red (fast)
    maxHue: 200,  // Cyan-blue (slow)
    maxSpeed: 50,
    saturation: 85,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 15,
  },

  blink: {
    chance: 0.015,
    intensityBoost: 1.4,
  },

  zoom: { min: 0.2, max: 2.5 },
  restart: { delay: 1 },

  // Start particles near the attractor centre
  spawnOffset: { z: 27 },
  normalizeRotation: true,

  // Disable respawn — let all particles maintain full-length trails
  respawnChance: 0.001,

  autoRotation: { enabled: true, speed: 0.15, axis: "y" },
});

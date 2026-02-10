/**
 * Three-Scroll Unified Chaotic System (TSUCS) 3D Visualization
 *
 * A six-parameter system producing three intertwined scroll structures
 * with dramatic sweeping arcs and nested loops.
 *
 * @see {@link https://www.dynamicmath.xyz/strange-attractors/}
 */

import { Attractor3DDemo, Screen } from "./attractor-3d-demo.js";

Attractor3DDemo.run("threeScroll", {
  attractor: {
    dt: 0.003,    // RK4 handles larger steps; system has big derivatives (a≈32, b≈46)
    scale: 1.4,
  },

  particles: {
    count: Screen.responsive(200, 350, 500),
    trailLength: Screen.responsive(150, 250, 350),
    spawnRange: 5,
  },

  // Centroid at (0, 0, ~124); x: ±100, y: ±160, z: 8–218
  center: { x: 0, y: 0, z: 124 },

  camera: {
    perspective: 800,
    rotationX: -1.5,    // Near top-down to show scroll structure
    rotationY: 0,
  },

  visual: {
    minHue: 260,  // Purple (fast — scroll edges)
    maxHue: 50,   // Gold (slow — inner orbits)
    maxSpeed: 8000, // Speeds range 800–14000; P75 ≈ 5000
    saturation: 95,
    lightness: 42,
    maxAlpha: 0.35,
    hueShiftSpeed: 8,
  },

  bloom: {
    enabled: true,
    threshold: 0.35,
    strength: 0.25,
    radius: 0.5,
  },

  blink: {
    chance: 0.015,
    intensityBoost: 1.6,
    saturationBoost: 1.3,
    alphaBoost: 1.4,
  },

  zoom: { min: 0.2, max: 3.0 },

  warmupSteps: 0,
  maxDistance: 250,
  respawnChance: 0.002,

  // Spawn near the initial conditions from reference
  spawnOffset: { x: -0.29, y: -0.25, z: -0.59 },

  autoRotation: { enabled: true, speed: 0.12, axis: "y" },
});

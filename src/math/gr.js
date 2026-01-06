/**
 * General Relativity utilities for spacetime visualization.
 * Complements the Tensor class with higher-level embedding and coordinate functions.
 *
 * @example
 * import { flammEmbedding, flammEmbeddingHeight } from './gr.js';
 *
 * // Raw Flamm's paraboloid height
 * const z = flammEmbedding(10, 2, 1); // r=10, rs=2, M=1
 *
 * // Inverted for visualization (well goes "down")
 * const height = flammEmbeddingHeight(10, 2, 1, 20, 25);
 */

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flamm's paraboloid embedding for Schwarzschild/Kerr spacetime.
 *
 * The formula z = sqrt(8M(r - r_horizon)) gives the proper embedding
 * of the spatial geometry into 3D Euclidean space.
 *
 * @param {number} r - Radial coordinate
 * @param {number} rHorizon - Event horizon radius (rs for Schwarzschild, r+ for Kerr)
 * @param {number} M - Mass parameter (in geometrized units G=c=1)
 * @returns {number} Embedding height z (positive)
 */
export function flammEmbedding(r, rHorizon, M) {
  if (r <= rHorizon) return 0;
  return Math.sqrt(8 * M * (r - rHorizon));
}

/**
 * Inverted embedding height for visualization.
 *
 * Returns a height value where:
 * - Far from the black hole: height approaches 0 (flat)
 * - Near the horizon: height increases (deep well)
 *
 * This is what you typically want for rendering the "gravity well" visualization.
 *
 * @param {number} r - Radial coordinate
 * @param {number} rHorizon - Event horizon radius
 * @param {number} M - Mass parameter
 * @param {number} rMax - Maximum radius for normalization (typically grid size)
 * @param {number} scale - Visual scale factor for the well depth
 * @returns {number} Height value for rendering (larger = deeper in well)
 */
export function flammEmbeddingHeight(r, rHorizon, M, rMax, scale) {
  // Clamp to just outside horizon
  const rClamped = Math.max(r, rHorizon + 0.01);

  // Flamm's paraboloid: z = sqrt(8M(r - r_horizon))
  const z = flammEmbedding(rClamped, rHorizon, M);
  const zMax = flammEmbedding(rMax, rHorizon, M);

  // Invert so well goes "down", normalize by zMax
  // This gives proper curvature behavior: steep near horizon, flat far away
  return ((zMax - z) * scale) / zMax;
}

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATE TRANSFORMATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Cartesian coordinates to spherical coordinates.
 *
 * @param {number} x - Cartesian x
 * @param {number} y - Cartesian y
 * @param {number} z - Cartesian z
 * @returns {{ r: number, theta: number, phi: number }} Spherical coordinates
 */
export function cartesianToSpherical(x, y, z) {
  const r = Math.sqrt(x * x + y * y + z * z);
  const theta = r > 0 ? Math.acos(z / r) : 0;
  const phi = Math.atan2(y, x);
  return { r, theta, phi };
}

/**
 * Convert spherical coordinates to Cartesian coordinates.
 *
 * @param {number} r - Radial distance
 * @param {number} theta - Polar angle (0 to π)
 * @param {number} phi - Azimuthal angle (0 to 2π)
 * @returns {{ x: number, y: number, z: number }} Cartesian coordinates
 */
export function sphericalToCartesian(r, theta, phi) {
  const sinTheta = Math.sin(theta);
  return {
    x: r * sinTheta * Math.cos(phi),
    y: r * sinTheta * Math.sin(phi),
    z: r * Math.cos(theta),
  };
}

/**
 * Convert polar coordinates (r, phi) to Cartesian (x, z) in the equatorial plane.
 * Commonly used for orbital visualization where y is the "height" axis.
 *
 * @param {number} r - Radial distance
 * @param {number} phi - Azimuthal angle
 * @returns {{ x: number, z: number }} Cartesian coordinates in equatorial plane
 */
export function polarToCartesian(r, phi) {
  return {
    x: r * Math.cos(phi),
    z: r * Math.sin(phi),
  };
}

/**
 * Convert Cartesian (x, z) to polar (r, phi) in the equatorial plane.
 *
 * @param {number} x - Cartesian x
 * @param {number} z - Cartesian z
 * @returns {{ r: number, phi: number }} Polar coordinates
 */
export function cartesianToPolar(x, z) {
  return {
    r: Math.sqrt(x * x + z * z),
    phi: Math.atan2(z, x),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRAVITATIONAL LENSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate gravitational lensing displacement for a point near a massive object.
 *
 * Light passing near a massive object is deflected, causing background objects
 * to appear displaced radially outward from the lens center. This creates the
 * "Einstein ring" effect where objects directly behind the lens form a ring.
 *
 * This is a simplified screen-space approximation suitable for real-time rendering.
 * True lensing would require ray-tracing through curved spacetime.
 *
 * @param {number} screenDist - Distance from lens center in screen pixels
 * @param {number} effectRadius - Maximum radius of lensing effect in pixels
 * @param {number} strength - Displacement strength (higher = more dramatic)
 * @param {number} falloff - Exponential falloff rate (higher = tighter effect)
 * @param {number} minDist - Minimum distance to apply lensing (avoids singularity)
 * @returns {number} Radial displacement in pixels (0 if outside effect radius)
 *
 * @example
 * // Calculate displacement for a star 100px from black hole center
 * const displacement = gravitationalLensing(100, 500, 200, 0.008, 5);
 * // Apply: newRadius = screenDist + displacement
 */
export function gravitationalLensing(screenDist, effectRadius, strength, falloff, minDist = 5) {
  if (screenDist <= minDist || screenDist >= effectRadius) {
    return 0;
  }

  // Exponential falloff: stronger closer to lens center
  const lensFactor = Math.exp(-screenDist * falloff);

  return lensFactor * strength;
}

/**
 * Apply gravitational lensing to screen coordinates.
 *
 * Takes a point's screen position (relative to lens center) and returns
 * the displaced position after lensing.
 *
 * @param {number} x - X coordinate relative to lens center
 * @param {number} y - Y coordinate relative to lens center
 * @param {number} effectRadius - Maximum radius of lensing effect
 * @param {number} strength - Displacement strength
 * @param {number} falloff - Exponential falloff rate
 * @param {number} minDist - Minimum distance for lensing
 * @returns {{ x: number, y: number, displacement: number }} Displaced coordinates and displacement amount
 *
 * @example
 * const result = applyGravitationalLensing(50, 30, 500, 200, 0.008);
 * ctx.drawImage(star, centerX + result.x, centerY + result.y, ...);
 */
export function applyGravitationalLensing(x, y, effectRadius, strength, falloff, minDist = 5) {
  const dist = Math.sqrt(x * x + y * y);

  if (dist <= minDist || dist >= effectRadius) {
    return { x, y, displacement: 0 };
  }

  const displacement = gravitationalLensing(dist, effectRadius, strength, falloff, minDist);

  // Radial displacement: push point outward from center
  const ratio = (dist + displacement) / dist;

  return {
    x: x * ratio,
    y: y * ratio,
    displacement
  };
}

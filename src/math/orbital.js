/**
 * Orbital mechanics utilities for geodesic motion visualization.
 * Provides functions for Keplerian motion and GR corrections.
 *
 * All functions are pure - can be refactored to a class later if needed.
 *
 * @example
 * import { keplerianOmega, schwarzschildPrecessionRate } from './orbital.js';
 *
 * // Base angular velocity
 * const omega = keplerianOmega(10, 1, 0.5);
 *
 * // GR precession correction
 * const precession = schwarzschildPrecessionRate(10, 2, 0.15);
 */

// ─────────────────────────────────────────────────────────────────────────────
// ANGULAR VELOCITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keplerian angular velocity based on Kepler's 3rd law.
 *
 * omega ∝ sqrt(M) / r^(3/2)
 *
 * The referenceR parameter allows scaling for visualization - objects at
 * r = referenceR will have angular velocity = speedFactor * sqrt(M).
 *
 * @param {number} r - Orbital radius
 * @param {number} M - Central mass (geometrized units)
 * @param {number} [speedFactor=1] - Speed multiplier for visualization
 * @param {number} [referenceR=5] - Reference radius for scaling
 * @returns {number} Angular velocity omega
 */
export function keplerianOmega(r, M, speedFactor = 1, referenceR = 5) {
  if (r <= 0) return 0;
  return (speedFactor * Math.sqrt(M)) / Math.pow(r / referenceR, 1.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// GR PRECESSION RATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GR orbital precession rate for Schwarzschild spacetime.
 *
 * In GR, orbits don't close - they precess. The rate scales as rs/r,
 * meaning closer orbits precess faster.
 *
 * The exact formula is Δφ ≈ 6πM/a(1-e²) per orbit, but for visualization
 * we use a simpler form that captures the essential 1/r dependence.
 *
 * @param {number} r - Orbital radius
 * @param {number} rs - Schwarzschild radius (2M)
 * @param {number} [factor=1] - Precession rate multiplier
 * @returns {number} Precession rate (multiply by dt for angle change)
 */
export function schwarzschildPrecessionRate(r, rs, factor = 1) {
  if (r <= rs) return 0;
  return factor * (rs / r);
}

/**
 * GR orbital precession rate for Kerr spacetime.
 *
 * Includes additional contribution from frame dragging.
 * Prograde orbits precess faster than in Schwarzschild.
 *
 * @param {number} r - Orbital radius
 * @param {number} M - Mass parameter
 * @param {number} a - Spin parameter (0 to M)
 * @param {number} [factor=1] - Precession rate multiplier
 * @returns {number} Precession rate
 */
export function kerrPrecessionRate(r, M, a, factor = 1) {
  const rs = 2 * M;
  if (r <= rs) return 0;
  // Base Schwarzschild precession + frame dragging enhancement
  return factor * (rs / r) * (1 + a / M);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORBITAL GEOMETRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute orbital radius with eccentricity (Keplerian ellipse).
 *
 * r(φ) = a(1 - e²) / (1 + e*cos(φ))
 *
 * For small eccentricity, this simplifies to approximately:
 * r ≈ a + a*e*sin(φ) (used in demos for smooth oscillation)
 *
 * @param {number} semiMajor - Semi-major axis a
 * @param {number} eccentricity - Orbital eccentricity e (0 to 1)
 * @param {number} phi - True anomaly (orbital angle)
 * @returns {number} Orbital radius at angle phi
 */
export function orbitalRadius(semiMajor, eccentricity, phi) {
  if (eccentricity >= 1) return semiMajor;
  const p = semiMajor * (1 - eccentricity * eccentricity);
  return p / (1 + eccentricity * Math.cos(phi));
}

/**
 * Simplified radial oscillation for small eccentricity.
 * More visually smooth than true Keplerian ellipse.
 *
 * @param {number} semiMajor - Base orbital radius
 * @param {number} eccentricity - Eccentricity (small values)
 * @param {number} phi - Orbital angle
 * @param {number} [amplitudeFactor=2] - Oscillation amplitude multiplier
 * @returns {number} Orbital radius
 */
export function orbitalRadiusSimple(semiMajor, eccentricity, phi, amplitudeFactor = 2) {
  const oscillation = eccentricity * Math.sin(phi * 2);
  return semiMajor + oscillation * amplitudeFactor;
}

/**
 * Decaying orbital radius.
 * Applies a decay factor to the orbital radius over time/angle.
 *
 * @param {number} r0 - Initial orbital radius
 * @param {number} decayFactor - How fast the orbit decays (0 to 1)
 * @param {number} t - Time or progress factor
 * @returns {number} Decayed radius
 */
export function decayingOrbitalRadius(r0, decayFactor, t) {
  return r0 * Math.exp(-decayFactor * t);
}

/**
 * Computes a terminal trajectory (direct fall).
 * Interpolates between a starting point and the center (0,0,0).
 *
 * @param {number} startX - Start X
 * @param {number} startY - Start Y
 * @param {number} startZ - Start Z
 * @param {number} progress - Progress (0 to 1)
 * @param {Function} easingFn - Optional easing function
 * @returns {Object} Position { x, y, z }
 */
export function getTerminalTrajectory(startX, startY, startZ, progress, easingFn = null) {
  const t = easingFn ? easingFn(progress) : progress;
  return {
    x: startX * (1 - t),
    y: startY * (1 - t),
    z: startZ * (1 - t),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAIL MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a point to an orbital trail array, maintaining max length.
 *
 * Points are added at the front (newest first) for efficient rendering
 * of fading trails.
 *
 * @param {Array} trail - Trail array (modified in place)
 * @param {Object} point - Point to add { x, z, r, ... }
 * @param {number} [maxLength=80] - Maximum trail length
 * @returns {Array} The modified trail array
 */
export function updateTrail(trail, point, maxLength = 80) {
  trail.unshift(point);
  if (trail.length > maxLength) {
    trail.pop();
  }
  return trail;
}

/**
 * Create a trail point from orbital state.
 *
 * @param {number} r - Orbital radius
 * @param {number} phi - Orbital angle (including precession)
 * @param {Object} [extra={}] - Additional data to include
 * @returns {Object} Trail point { x, z, r, ...extra }
 */
export function createTrailPoint(r, phi, extra = {}) {
  return {
    x: Math.cos(phi) * r,
    z: Math.sin(phi) * r,
    r,
    ...extra,
  };
}

/**
 * Heat Dynamics Module
 *
 * Particle-based heat physics functions for simulating thermal behavior:
 * - Zone-based temperature changes (heating/cooling regions)
 * - Buoyancy forces from temperature differentials
 * - Heat transfer between particles
 *
 * Designed for lava lamp, fluid simulations, and particle systems.
 *
 * @see Easing.smoothstep, Easing.lerp in src/motion/easing.js for interpolation utilities
 */

import { Easing } from "../motion/easing.js";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPERATURE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt ot use this as smoothstep with edge parameters (wrapper for Easing.smoothstep).
 * @private
 */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return Easing.smoothstep(t);
}

/**
 * Calculate temperature change based on position in thermal zones.
 * Uses smooth transitions between zones instead of hard boundaries.
 *
 * Zone layout (normalized y: 0 = top, 1 = bottom):
 * - Cool zone: y < coolZone (temperature approaches 0)
 * - Middle zone: between coolZone and heatZone (temperature approaches y position)
 * - Heat zone: y > heatZone (temperature approaches 1)
 *
 * @param {number} position - Normalized position [0, 1] (typically y coordinate)
 * @param {number} currentTemp - Current temperature [0, 1]
 * @param {Object} config - Zone configuration
 * @param {number} config.heatZone - Y position where heating begins (e.g., 0.92)
 * @param {number} config.coolZone - Y position where cooling begins (e.g., 0.2)
 * @param {number} config.rate - Base temperature change rate
 * @param {number} [config.heatMultiplier=1.5] - Heating rate multiplier
 * @param {number} [config.coolMultiplier=1.5] - Cooling rate multiplier
 * @param {number} [config.middleMultiplier=0.05] - Middle zone rate multiplier
 * @param {number} [config.transitionWidth=0.1] - Width of smooth transition zones
 * @returns {number} New temperature value [0, 1]
 *
 * @example
 * const temp = zoneTemperature(0.95, 0.5, {
 *   heatZone: 0.92, coolZone: 0.2, rate: 0.0055
 * });
 */
export function zoneTemperature(position, currentTemp, config) {
  const {
    heatZone,
    coolZone,
    rate,
    heatMultiplier = 1.5,
    coolMultiplier = 1.5,
    middleMultiplier = 0.05,
    transitionWidth = 0.1,
  } = config;

  // Calculate zone influence using smoothstep for soft transitions
  // Heat zone influence: ramps up as position exceeds heatZone
  const heatInfluence = smoothstep(heatZone - transitionWidth, heatZone + transitionWidth * 0.5, position);

  // Cool zone influence: ramps up as position goes below coolZone
  const coolInfluence = 1 - smoothstep(coolZone - transitionWidth * 0.5, coolZone + transitionWidth, position);

  // Middle zone is whatever's left
  const middleInfluence = 1 - heatInfluence - coolInfluence;

  // Calculate target temperatures and rates for each zone
  let deltaTemp = 0;

  // Heat zone: temperature approaches 1.0
  if (heatInfluence > 0) {
    deltaTemp += (1.0 - currentTemp) * rate * heatMultiplier * heatInfluence;
  }

  // Cool zone: temperature approaches 0.0
  if (coolInfluence > 0) {
    deltaTemp += (0.0 - currentTemp) * rate * coolMultiplier * coolInfluence;
  }

  // Middle zone: temperature approaches position (linear gradient)
  if (middleInfluence > 0) {
    deltaTemp += (position - currentTemp) * rate * middleMultiplier * middleInfluence;
  }

  // Apply and clamp
  return Math.max(0, Math.min(1, currentTemp + deltaTemp));
}

// ─────────────────────────────────────────────────────────────────────────────
// BUOYANCY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate buoyancy force from temperature differential.
 * Hot particles rise (negative velocity), cold particles sink (positive velocity).
 *
 * Based on simplified Archimedes principle where temperature acts as
 * inverse density: hotter = less dense = more buoyant.
 *
 * @param {number} temperature - Particle temperature [0, 1]
 * @param {number} neutralTemp - Temperature at which buoyancy is zero (typically 0.5)
 * @param {number} strength - Buoyancy force strength coefficient
 * @returns {number} Velocity adjustment (negative = rise, positive = sink)
 *
 * @example
 * // Hot particle rises
 * const lift = thermalBuoyancy(0.9, 0.5, 0.00018); // negative value
 * particle.vy -= lift; // subtracting negative = rising
 *
 * // Cold particle sinks
 * const sink = thermalBuoyancy(0.2, 0.5, 0.00018); // positive value
 */
export function thermalBuoyancy(temperature, neutralTemp, strength) {
  return (temperature - neutralTemp) * strength;
}

/**
 * Calculate weight-adjusted gravity force.
 * Larger particles experience more gravitational pull.
 *
 * @param {number} radius - Particle radius
 * @param {number} baseRadius - Reference radius for weight = 1
 * @param {number} gravity - Base gravity coefficient
 * @returns {number} Gravity force to add to vertical velocity
 *
 * @example
 * const weight = thermalGravity(0.06, 0.04, 0.000052);
 * particle.vy += weight;
 */
export function thermalGravity(radius, baseRadius, gravity) {
  const weight = radius / baseRadius;
  return gravity * weight;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEAT TRANSFER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate heat transfer between two particles.
 * Uses Newton's law of cooling: heat flows from hot to cold proportionally
 * to the temperature difference.
 *
 * @param {number} temp1 - Temperature of first particle [0, 1]
 * @param {number} temp2 - Temperature of second particle [0, 1]
 * @param {number} distance - Distance between particle centers
 * @param {number} maxDistance - Maximum distance for heat transfer
 * @param {number} rate - Heat transfer rate coefficient
 * @returns {number} Temperature change for particle 1 (add to temp1)
 *
 * @example
 * const dist = Math.sqrt(dx*dx + dy*dy);
 * const maxDist = (blob1.r + blob2.r) * 1.5;
 * const delta = heatTransfer(blob1.temp, blob2.temp, dist, maxDist, 0.0022);
 * blob1.temp += delta;
 */
export function heatTransfer(temp1, temp2, distance, maxDistance, rate) {
  if (distance >= maxDistance) return 0;

  // Heat flows from hot to cold
  const heatDiff = temp2 - temp1;

  // Optional: scale transfer by proximity (closer = faster transfer)
  // const proximity = 1 - (distance / maxDistance);
  // return heatDiff * rate * proximity;

  return heatDiff * rate;
}

/**
 * Calculate heat transfer with distance falloff.
 * Transfer rate decreases with distance for more realistic behavior.
 *
 * @param {number} temp1 - Temperature of first particle [0, 1]
 * @param {number} temp2 - Temperature of second particle [0, 1]
 * @param {number} distance - Distance between particle centers
 * @param {number} maxDistance - Maximum distance for heat transfer
 * @param {number} rate - Base heat transfer rate coefficient
 * @param {number} [falloff=1] - Distance falloff exponent (1 = linear, 2 = quadratic)
 * @returns {number} Temperature change for particle 1
 *
 * @example
 * // Quadratic falloff for more localized heat transfer
 * const delta = heatTransferFalloff(t1, t2, dist, maxDist, 0.003, 2);
 */
export function heatTransferFalloff(temp1, temp2, distance, maxDistance, rate, falloff = 1) {
  if (distance >= maxDistance) return 0;

  const heatDiff = temp2 - temp1;
  const proximity = Math.pow(1 - distance / maxDistance, falloff);

  return heatDiff * rate * proximity;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE SYSTEM HEAT TRANSFER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply heat transfer between nearby particles in a particle system.
 * Uses Newton's law of cooling with distance falloff.
 * Follows the same pattern as Collision.applyCircleSeparation.
 *
 * @param {Array<Object>} particles - Array of particles with { x, y, custom }
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.maxDistance=50] - Maximum distance for heat transfer
 * @param {number} [options.rate=0.01] - Heat transfer rate coefficient
 * @param {number} [options.falloff=1] - Distance falloff (1=linear, 2=quadratic)
 * @param {string} [options.temperatureKey='temperature'] - Key in particle.custom
 * @param {Function} [options.filter=null] - Filter function (particle) => boolean
 * @param {boolean} [options.useSizeAsRadius=true] - Use particle.size for distance calc
 *
 * @example
 * // Basic usage - all particles exchange heat
 * applyParticleHeatTransfer(particles, {
 *   maxDistance: 40,
 *   rate: 0.02,
 * });
 *
 * @example
 * // With filter - exclude sorted particles (Maxwell's Demon)
 * applyParticleHeatTransfer(particles, {
 *   maxDistance: 36,
 *   rate: 0.015,
 *   filter: (p) => !p.custom.sorted,
 * });
 *
 * @example
 * // With quadratic falloff for more localized transfer
 * applyParticleHeatTransfer(particles, {
 *   maxDistance: 60,
 *   rate: 0.025,
 *   falloff: 2,
 * });
 */
export function applyParticleHeatTransfer(particles, options = {}) {
  const {
    maxDistance = 50,
    rate = 0.01,
    falloff = 1,
    temperatureKey = 'temperature',
    filter = null,
    useSizeAsRadius = true,
  } = options;

  const n = particles.length;
  const maxDist2 = maxDistance * maxDistance;

  for (let i = 0; i < n; i++) {
    const pi = particles[i];

    // Skip filtered particles
    if (filter && !filter(pi)) continue;

    // Ensure temperature exists
    if (pi.custom[temperatureKey] === undefined) {
      pi.custom[temperatureKey] = 0.5;
    }

    for (let j = i + 1; j < n; j++) {
      const pj = particles[j];

      // Skip filtered particles
      if (filter && !filter(pj)) continue;

      // Ensure temperature exists
      if (pj.custom[temperatureKey] === undefined) {
        pj.custom[temperatureKey] = 0.5;
      }

      // Distance check (squared for performance)
      const dx = pi.x - pj.x;
      const dy = pi.y - pj.y;
      const dist2 = dx * dx + dy * dy;

      if (dist2 >= maxDist2 || dist2 < 0.0001) continue;

      const dist = Math.sqrt(dist2);

      // Calculate heat transfer with optional distance falloff
      const delta = heatTransferFalloff(
        pi.custom[temperatureKey],
        pj.custom[temperatureKey],
        dist,
        maxDistance,
        rate,
        falloff
      );

      // Apply symmetric transfer (energy conservation)
      pi.custom[temperatureKey] += delta;
      pj.custom[temperatureKey] -= delta;

      // Clamp to valid range
      pi.custom[temperatureKey] = Math.max(0, Math.min(1, pi.custom[temperatureKey]));
      pj.custom[temperatureKey] = Math.max(0, Math.min(1, pj.custom[temperatureKey]));
    }
  }
}

/**
 * Fluid and Gas Dynamics (pure math utilities)
 *
 * Provides stateless helpers for 2D Smooth Particle Hydrodynamics (SPH) and a
 * simplified gas model (diffusion/advection). Designed to be called by
 * consumers (e.g., Game subclasses) that own particles; this module never
 * mutates inputs.
 *
 * Key design points:
 * - Pure functions (no hidden state); callers decide how to apply results.
 * - Works on any particle-like objects with { x, y, vx, vy, size?, custom? }.
 * - Configurable kernels, stiffness, viscosity, diffusion, and buoyancy.
 * - Optional temperature coupling (pairs well with `src/math/heat.js`).
 */

import { Easing } from "../motion/easing.js";

const CONFIG = {
  kernel: {
    smoothingRadius: 28, // pixels
  },
  fluid: {
    restDensity: 1.1,
    particleMass: 1,
    pressureStiffness: 1800,
    nearPressureStiffness: 2.5,  // Near pressure multiplier for stacking
    viscosity: 0.18,
    surfaceTension: 0,
    maxForce: 6000,
  },
  gas: {
    interactionRadius: 34,
    pressure: 12,
    diffusion: 0.08,
    drag: 0.04,
    buoyancy: 260,
    neutralTemperature: 0.5,
    turbulence: 16,
  },
  external: {
    gravity: { x: 0, y: 820 }, // pixels/s²
  },
};

const EPS = 0.0001;

/**
 * Deep-ish merge (one level) of config objects without mutating defaults.
 * @param {Object} overrides
 * @returns {Object}
 */
function mergeConfig(overrides = {}) {
  return {
    kernel: { ...CONFIG.kernel, ...(overrides.kernel || {}) },
    fluid: { ...CONFIG.fluid, ...(overrides.fluid || {}) },
    gas: { ...CONFIG.gas, ...(overrides.gas || {}) },
    external: { ...CONFIG.external, ...(overrides.external || {}) },
  };
}

/**
 * SPH kernel helpers (2D).
 * Includes dual-density kernels for proper liquid stacking behavior.
 */
export const Kernels = {
  /**
   * Poly6 kernel (used for viscosity).
   * @param {number} rSquared
   * @param {number} h
   * @returns {number}
   */
  poly6(rSquared, h) {
    const h2 = h * h;
    if (rSquared >= h2) return 0;
    const factor = 4 / (Math.PI * Math.pow(h, 8));
    const term = h2 - rSquared;
    return factor * term * term * term;
  },

  /**
   * Spiky kernel pow2 (used for regular density).
   * @param {number} r - distance
   * @param {number} h - smoothing radius
   * @returns {number}
   */
  spikyPow2(r, h) {
    if (r >= h) return 0;
    const factor = 6 / (Math.PI * Math.pow(h, 4));
    const term = h - r;
    return factor * term * term;
  },

  /**
   * Spiky kernel pow3 (used for near density - sharper falloff).
   * @param {number} r - distance
   * @param {number} h - smoothing radius
   * @returns {number}
   */
  spikyPow3(r, h) {
    if (r >= h) return 0;
    const factor = 10 / (Math.PI * Math.pow(h, 5));
    const term = h - r;
    return factor * term * term * term;
  },

  /**
   * Derivative of Spiky pow2 (used for pressure gradient).
   * @param {number} r
   * @param {number} h
   * @returns {number}
   */
  spikyPow2Derivative(r, h) {
    if (r === 0 || r >= h) return 0;
    const factor = -12 / (Math.PI * Math.pow(h, 4));
    return factor * (h - r);
  },

  /**
   * Derivative of Spiky pow3 (used for near pressure gradient).
   * @param {number} r
   * @param {number} h
   * @returns {number}
   */
  spikyPow3Derivative(r, h) {
    if (r === 0 || r >= h) return 0;
    const factor = -30 / (Math.PI * Math.pow(h, 5));
    const term = h - r;
    return factor * term * term;
  },

  /**
   * Spiky kernel gradient magnitude (legacy, used for pressure).
   * @param {number} r
   * @param {number} h
   * @returns {number}
   */
  spikyGradient(r, h) {
    if (r === 0 || r >= h) return 0;
    const factor = -30 / (Math.PI * Math.pow(h, 5));
    const term = (h - r) * (h - r);
    return factor * term;
  },

  /**
   * Viscosity kernel laplacian (used for viscosity force).
   * @param {number} r
   * @param {number} h
   * @returns {number}
   */
  viscosityLaplacian(r, h) {
    if (r >= h) return 0;
    const factor = 40 / (Math.PI * Math.pow(h, 5));
    return factor * (h - r);
  },
};

/**
 * Compute SPH densities for all particles (both regular and near density).
 * Uses dual-density approach for proper liquid stacking.
 * @param {Array<Object>} particles
 * @param {Object} [overrides]
 * @param {Object} [spatialHash]
 * @returns {{ densities: Float32Array, nearDensities: Float32Array }}
 */
export function computeDensities(particles, overrides = {}, spatialHash) {
  const cfg = mergeConfig(overrides);
  const h = cfg.kernel.smoothingRadius;
  const h2 = h * h;
  const hash = spatialHash ?? buildSpatialHash(particles, h);
  const n = particles.length;
  const densities = new Float32Array(n);
  const nearDensities = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    // Self contribution
    densities[i] = Kernels.spikyPow2(0, h);
    nearDensities[i] = Kernels.spikyPow3(0, h);

    forEachNeighbor(i, particles, hash, h2, (j, dx, dy, r2) => {
      const r = Math.sqrt(r2);
      densities[i] += Kernels.spikyPow2(r, h);
      nearDensities[i] += Kernels.spikyPow3(r, h);
    });
  }

  return { densities, nearDensities };
}

/**
 * Compute pressures from densities (both regular and near pressure).
 * @param {Float32Array|number[]} densities
 * @param {Float32Array|number[]} nearDensities
 * @param {Object} [overrides]
 * @returns {{ pressures: Float32Array, nearPressures: Float32Array }}
 */
export function computePressures(densities, nearDensities, overrides = {}) {
  const cfg = mergeConfig(overrides);
  const n = densities.length;
  const pressures = new Float32Array(n);
  const nearPressures = new Float32Array(n);
  const { pressureStiffness, nearPressureStiffness, restDensity } = cfg.fluid;

  for (let i = 0; i < n; i++) {
    // Regular pressure: pushes particles apart when density > rest density
    pressures[i] = (densities[i] - restDensity) * pressureStiffness;
    // Near pressure: always positive, prevents complete overlap
    nearPressures[i] = nearDensities[i] * nearPressureStiffness;
  }

  return { pressures, nearPressures };
}

/**
 * Compute SPH pressure + viscosity forces using dual-density relaxation.
 * This approach uses both regular pressure and near pressure for proper
 * liquid stacking behavior (like the Unity reference implementation).
 * 
 * @param {Array<Object>} particles
 * @param {Object} [overrides]
 * @returns {{ forces: Array<{x:number,y:number}>, densities: Float32Array, pressures: Float32Array }}
 */
export function computeFluidForces(particles, overrides = {}) {
  const cfg = mergeConfig(overrides);
  const h = cfg.kernel.smoothingRadius;
  const h2 = h * h;
  const n = particles.length;

  const hash = buildSpatialHash(particles, h);
  const { densities, nearDensities } = computeDensities(particles, cfg, hash);
  const { pressures, nearPressures } = computePressures(densities, nearDensities, cfg);
  
  const forces = new Array(n);
  for (let i = 0; i < n; i++) {
    forces[i] = { x: 0, y: 0 };
  }

  for (let i = 0; i < n; i++) {
    const pi = particles[i];
    const densityI = Math.max(densities[i], EPS);

    forEachNeighbor(i, particles, hash, h2, (j, dx, dy, r2) => {
      if (j <= i) return;
      const r = Math.sqrt(r2);
      if (r < EPS || r >= h) return;
      
      const pj = particles[j];
      
      // Direction from i to j (for repulsion)
      const invR = 1 / r;
      const dirX = -dx * invR;  // Flip: dx is (pi.x - pj.x), we want (pj - pi)
      const dirY = -dy * invR;

      // Neighbor densities
      const densityJ = Math.max(densities[j], EPS);
      const nearDensityJ = Math.max(nearDensities[j], EPS);

      // Shared pressures (average between particles)
      const sharedPressure = (pressures[i] + pressures[j]) * 0.5;
      const sharedNearPressure = (nearPressures[i] + nearPressures[j]) * 0.5;

      // Kernel derivatives (these are negative, pointing inward)
      const densityGrad = Kernels.spikyPow2Derivative(r, h);
      const nearDensityGrad = Kernels.spikyPow3Derivative(r, h);

      // Pressure forces - divide by respective densities (like Unity reference)
      // The negative gradient * positive direction = repulsion force
      const pressureForceMag = sharedPressure * densityGrad / densityJ;
      const nearPressureForceMag = sharedNearPressure * nearDensityGrad / nearDensityJ;
      const totalForce = pressureForceMag + nearPressureForceMag;

      const fx = dirX * totalForce;
      const fy = dirY * totalForce;
      
      // Apply equal and opposite forces
      forces[i].x += fx;
      forces[i].y += fy;
      forces[j].x -= fx;
      forces[j].y -= fy;

      // Viscosity force using Poly6 kernel
      const viscKernel = Kernels.poly6(r2, h);
      const viscStrength = cfg.fluid.viscosity * viscKernel;
      const dvx = (pj.vx - pi.vx) * viscStrength;
      const dvy = (pj.vy - pi.vy) * viscStrength;
      forces[i].x += dvx;
      forces[i].y += dvy;
      forces[j].x -= dvx;
      forces[j].y -= dvy;
    });
  }

  clampForces(forces, cfg.fluid.maxForce);
  return { forces, densities, pressures };
}

/**
 * Compute buoyancy from temperature differentials (hot rises, cold sinks).
 * Temperature can live in `p.custom.temperature` or `p.temperature`.
 * @param {Array<Object>} particles
 * @param {Object} [overrides]
 * @returns {Array<{x:number,y:number}>}
 */
export function computeThermalBuoyancy(particles, overrides = {}) {
  const cfg = mergeConfig(overrides);
  const forces = new Array(particles.length);
  const neutral = cfg.gas.neutralTemperature;
  const strength = cfg.gas.buoyancy;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const temperature =
      p.temperature ?? p.custom?.temperature ?? cfg.gas.neutralTemperature;
    const lift = (temperature - neutral) * strength;
    forces[i] = { x: 0, y: -lift };
  }
  return forces;
}

/**
 * Simplified gas model: diffusion + mild pressure + buoyancy + turbulence.
 * @param {Array<Object>} particles
 * @param {Object} [overrides]
 * @returns {{ forces: Array<{x:number,y:number}> }}
 */
export function computeGasForces(particles, overrides = {}) {
  const cfg = mergeConfig(overrides);
  const rMax = cfg.gas.interactionRadius;
  const rMax2 = rMax * rMax;
  const n = particles.length;
  const hash = buildSpatialHash(particles, rMax);
  const forces = new Array(n);
  for (let i = 0; i < n; i++) {
    forces[i] = { x: 0, y: 0 };
  }

  for (let i = 0; i < n; i++) {
    const pi = particles[i];
    const massI = resolveMass(pi, cfg);
    const tempI = pi.temperature ?? pi.custom?.temperature ?? cfg.gas.neutralTemperature;

    forEachNeighbor(i, particles, hash, rMax2, (j, dx, dy, r2) => {
      if (j <= i) return;
      if (r2 === 0) return;
      const r = Math.sqrt(r2);
      const invR = 1 / r;
      const pj = particles[j];
      const massJ = resolveMass(pj, cfg);
      const tempJ = pj.temperature ?? pj.custom?.temperature ?? cfg.gas.neutralTemperature;

      const pressure = cfg.gas.pressure * (1 - r / rMax);
      const fx = dx * invR * pressure;
      const fy = dy * invR * pressure;
      forces[i].x += fx;
      forces[i].y += fy;
      forces[j].x -= fx;
      forces[j].y -= fy;

      const diffusion = cfg.gas.diffusion;
      const dvx = (pj.vx - pi.vx) * diffusion;
      const dvy = (pj.vy - pi.vy) * diffusion;
      forces[i].x += dvx * massJ;
      forces[i].y += dvy * massJ;
      forces[j].x -= dvx * massI;
      forces[j].y -= dvy * massI;

      const tempDelta = tempI - tempJ;
      const buoyancyPush = tempDelta * cfg.gas.buoyancy * 0.5;
      forces[i].y -= buoyancyPush;
      forces[j].y += buoyancyPush;
    });
  }

  // Turbulence + drag
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    const drag = cfg.gas.drag;
    forces[i].x += -p.vx * drag;
    forces[i].y += -p.vy * drag;
    forces[i].x += (Math.random() - 0.5) * cfg.gas.turbulence;
    forces[i].y += (Math.random() - 0.5) * cfg.gas.turbulence;
  }

  clampForces(forces, cfg.fluid.maxForce);
  return { forces };
}

/**
 * Apply Euler integration in a pure way (returns next state, does not mutate).
 * @param {Array<Object>} particles
 * @param {Array<{x:number,y:number}>} forces
 * @param {number} dt
 * @param {Object} [overrides]
 * @returns {Array<{ x:number, y:number, vx:number, vy:number }>}
 */
export function integrateEuler(particles, forces, dt, overrides = {}) {
  const cfg = mergeConfig(overrides);
  const next = new Array(particles.length);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const f = forces[i];
    const mass = resolveMass(p, cfg);
    const ax = f.x / mass + cfg.external.gravity.x;
    const ay = f.y / mass + cfg.external.gravity.y;

    const vx = p.vx + ax * dt;
    const vy = p.vy + ay * dt;
    next[i] = {
      x: p.x + vx * dt,
      y: p.y + vy * dt,
      vx,
      vy,
    };
  }
  return next;
}

/**
 * Utility to mix (lerp) between two force fields (e.g., liquid vs gas).
 * @param {Array<{x:number,y:number}>} a
 * @param {Array<{x:number,y:number}>} b
 * @param {number} t - 0..1
 * @returns {Array<{x:number,y:number}>}
 */
export function blendForces(a, b, t) {
  const n = Math.min(a.length, b.length);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      x: Easing.lerp(a[i].x, b[i].x, t),
      y: Easing.lerp(a[i].y, b[i].y, t),
    };
  }
  return out;
}

/**
 * Convenience factory to grab defaults (safe copy).
 * @returns {Object}
 */
export function getDefaultFluidConfig() {
  return mergeConfig();
}

function resolveMass(p, cfg) {
  if (p.custom && typeof p.custom.mass === "number") return p.custom.mass;
  if (p.mass) return p.mass;
  if (p.size) return p.size * 0.5 + cfg.fluid.particleMass;
  return cfg.fluid.particleMass;
}

function clampForces(forces, maxForce) {
  const maxForce2 = maxForce * maxForce;
  for (let i = 0; i < forces.length; i++) {
    const f = forces[i];
    const mag2 = f.x * f.x + f.y * f.y;
    if (mag2 > maxForce2) {
      const inv = 1 / Math.sqrt(mag2);
      f.x *= maxForce * inv;
      f.y *= maxForce * inv;
    }
  }
}

function buildSpatialHash(particles, radius) {
  const cellSize = radius;
  const buckets = new Map();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const cx = Math.floor(p.x / cellSize);
    const cy = Math.floor(p.y / cellSize);
    const key = `${cx},${cy}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(i);
  }
  return { cellSize, buckets };
}

function forEachNeighbor(i, particles, hash, radiusSquared, cb) {
  const p = particles[i];
  const cellSize = hash.cellSize;
  const cx = Math.floor(p.x / cellSize);
  const cy = Math.floor(p.y / cellSize);

  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      const key = `${cx + ox},${cy + oy}`;
      const bucket = hash.buckets.get(key);
      if (!bucket) continue;
      for (let k = 0; k < bucket.length; k++) {
        const j = bucket[k];
        if (j === i) continue;
        const pj = particles[j];
        const dx = p.x - pj.x;
        const dy = p.y - pj.y;
        const r2 = dx * dx + dy * dy;
        if (r2 < radiusSquared) {
          cb(j, dx, dy, r2);
        }
      }
    }
  }
}


/**
 * @module math/attractors
 * @description Strange attractor functions for chaotic dynamical systems.
 *
 * Provides pure mathematical functions for computing attractor dynamics.
 * Each attractor returns both the new position and velocity (derivatives)
 * for use in visualization, coloring, and analysis.
 *
 * @example
 * import { Attractors } from '@guinetik/gcanvas';
 *
 * // Use default parameters
 * const { position, velocity } = Attractors.lorenz.step({ x: 1, y: 1, z: 1 }, 0.01);
 *
 * // Custom parameters
 * const step = Attractors.lorenz.createStepper({ sigma: 10, rho: 28, beta: 8/3 });
 * const result = step({ x: 1, y: 1, z: 1 }, 0.01);
 *
 * // Get just derivatives (for advanced use)
 * const { dx, dy, dz } = Attractors.lorenz.derivatives({ x: 1, y: 1, z: 1 });
 */

/**
 * Attractor types
 */
export const AttractorType = {
  CONTINUOUS: "continuous", // Uses dt for integration
  ITERATIVE: "iterative", // Direct mapping (no dt)
};

/**
 * Attractor dimensions
 */
export const AttractorDimension = {
  TWO_D: 2,
  THREE_D: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// LORENZ ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lorenz Attractor (1963)
 *
 * The classic "butterfly effect" attractor discovered by Edward Lorenz
 * while studying atmospheric convection.
 *
 * Equations:
 *   dx/dt = σ(y - x)
 *   dy/dt = x(ρ - z) - y
 *   dz/dt = xy - βz
 *
 * Default parameters: σ=10, ρ=28, β=8/3
 */
const lorenz = {
  name: "Lorenz",
  type: AttractorType.CONTINUOUS,
  dimension: AttractorDimension.THREE_D,

  equations: [
    "dx/dt = σ(y - x)",
    "dy/dt = x(ρ - z) - y",
    "dz/dt = xy - βz",
  ],

  defaultParams: {
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
  },

  defaultDt: 0.01,

  /**
   * Compute derivatives at a point
   * @param {Object} point - { x, y, z }
   * @param {Object} [params] - { sigma, rho, beta }
   * @returns {Object} { dx, dy, dz }
   */
  derivatives(point, params = this.defaultParams) {
    const { sigma, rho, beta } = { ...this.defaultParams, ...params };
    const { x, y, z } = point;

    return {
      dx: sigma * (y - x),
      dy: x * (rho - z) - y,
      dz: x * y - beta * z,
    };
  },

  /**
   * Perform one integration step (Euler method)
   * @param {Object} point - { x, y, z }
   * @param {number} [dt] - Time step
   * @param {Object} [params] - Attractor parameters
   * @returns {Object} { position: {x,y,z}, velocity: {dx,dy,dz}, speed }
   */
  step(point, dt = this.defaultDt, params = this.defaultParams) {
    const d = this.derivatives(point, params);
    const speed = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz);

    return {
      position: {
        x: point.x + d.dx * dt,
        y: point.y + d.dy * dt,
        z: point.z + d.dz * dt,
      },
      velocity: d,
      speed,
    };
  },

  /**
   * Create a stepper function with fixed parameters
   * @param {Object} [params] - Attractor parameters
   * @returns {Function} (point, dt) => result
   */
  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, dt = this.defaultDt) => this.step(point, dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DADRAS ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dadras Attractor (2010)
 *
 * A chaotic system with multiple scrolls and wings, discovered by
 * Sara Dadras and Hamid Reza Momeni. Features complex folding dynamics
 * due to nonlinear coupling terms.
 *
 * Equations:
 *   dx/dt = y - ax + byz
 *   dy/dt = cy - xz + z
 *   dz/dt = dxy - ez
 *
 * Default parameters: a=3, b=2.7, c=1.7, d=2, e=9
 */
const dadras = {
  name: "Dadras",
  type: AttractorType.CONTINUOUS,
  dimension: AttractorDimension.THREE_D,

  equations: [
    "dx/dt = y - ax + byz",
    "dy/dt = cy - xz + z",
    "dz/dt = dxy - ez",
  ],

  defaultParams: {
    a: 3,
    b: 2.7,
    c: 1.7,
    d: 2,
    e: 9,
  },

  defaultDt: 0.005,

  derivatives(point, params = this.defaultParams) {
    const { a, b, c, d, e } = { ...this.defaultParams, ...params };
    const { x, y, z } = point;

    return {
      dx: y - a * x + b * y * z,
      dy: c * y - x * z + z,
      dz: d * x * y - e * z,
    };
  },

  step(point, dt = this.defaultDt, params = this.defaultParams) {
    const d = this.derivatives(point, params);
    const speed = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz);

    return {
      position: {
        x: point.x + d.dx * dt,
        y: point.y + d.dy * dt,
        z: point.z + d.dz * dt,
      },
      velocity: d,
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, dt = this.defaultDt) => this.step(point, dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AIZAWA ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aizawa Attractor
 *
 * A 3D chaotic system with intricate folding structure, named after
 * Japanese mathematician Tomohiko Aizawa.
 *
 * Equations:
 *   dx/dt = (z - b)x - dy
 *   dy/dt = dx + (z - b)y
 *   dz/dt = c + az - z³/3 - (x² + y²)(1 + ez) + fzx³
 *
 * Default parameters: a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1
 */
const aizawa = {
  name: "Aizawa",
  type: AttractorType.CONTINUOUS,
  dimension: AttractorDimension.THREE_D,

  equations: [
    "dx/dt = (z - b)x - dy",
    "dy/dt = dx + (z - b)y",
    "dz/dt = c + az - z³/3 - (x² + y²)(1 + ez) + fzx³",
  ],

  defaultParams: {
    a: 0.95,
    b: 0.7,
    c: 0.6,
    d: 3.5,
    e: 0.25,
    f: 0.1,
  },

  defaultDt: 0.01,

  derivatives(point, params = this.defaultParams) {
    const { a, b, c, d, e, f } = { ...this.defaultParams, ...params };
    const { x, y, z } = point;

    return {
      dx: (z - b) * x - d * y,
      dy: d * x + (z - b) * y,
      dz:
        c +
        a * z -
        (z * z * z) / 3 -
        (x * x + y * y) * (1 + e * z) +
        f * z * x * x * x,
    };
  },

  step(point, dt = this.defaultDt, params = this.defaultParams) {
    const d = this.derivatives(point, params);
    const speed = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz);

    return {
      position: {
        x: point.x + d.dx * dt,
        y: point.y + d.dy * dt,
        z: point.z + d.dz * dt,
      },
      velocity: d,
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, dt = this.defaultDt) => this.step(point, dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// THOMAS ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thomas' Cyclically Symmetric Attractor (1999)
 *
 * Discovered by René Thomas. Features elegant symmetry and smooth
 * cyclical motion with a simple sinusoidal structure.
 *
 * Equations:
 *   dx/dt = sin(y) - bx
 *   dy/dt = sin(z) - by
 *   dz/dt = sin(x) - bz
 *
 * Default parameter: b=0.208186
 */
const thomas = {
  name: "Thomas",
  type: AttractorType.CONTINUOUS,
  dimension: AttractorDimension.THREE_D,

  equations: ["dx/dt = sin(y) - bx", "dy/dt = sin(z) - by", "dz/dt = sin(x) - bz"],

  defaultParams: {
    b: 0.208186,
  },

  defaultDt: 0.1,

  derivatives(point, params = this.defaultParams) {
    const { b } = { ...this.defaultParams, ...params };
    const { x, y, z } = point;

    return {
      dx: Math.sin(y) - b * x,
      dy: Math.sin(z) - b * y,
      dz: Math.sin(x) - b * z,
    };
  },

  step(point, dt = this.defaultDt, params = this.defaultParams) {
    const d = this.derivatives(point, params);
    const speed = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz);

    return {
      position: {
        x: point.x + d.dx * dt,
        y: point.y + d.dy * dt,
        z: point.z + d.dz * dt,
      },
      velocity: d,
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, dt = this.defaultDt) => this.step(point, dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIFFORD ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clifford Attractor
 *
 * A 2D iterative attractor that creates intricate fractal patterns
 * using simple trigonometric functions. Unlike continuous attractors,
 * this is a discrete map (no dt required).
 *
 * Equations:
 *   x_{n+1} = sin(a·y_n) + c·cos(a·x_n)
 *   y_{n+1} = sin(b·x_n) + d·cos(b·y_n)
 *
 * Default parameters: a=-1.4, b=1.6, c=1.0, d=0.7
 */
const clifford = {
  name: "Clifford",
  type: AttractorType.ITERATIVE,
  dimension: AttractorDimension.TWO_D,

  equations: [
    "x_{n+1} = sin(a·y_n) + c·cos(a·x_n)",
    "y_{n+1} = sin(b·x_n) + d·cos(b·y_n)",
  ],

  defaultParams: {
    a: -1.4,
    b: 1.6,
    c: 1.0,
    d: 0.7,
  },

  /**
   * Compute next position (iterative, no derivatives)
   * @param {Object} point - { x, y }
   * @param {Object} [params] - { a, b, c, d }
   * @returns {Object} { x, y }
   */
  next(point, params = this.defaultParams) {
    const { a, b, c, d } = { ...this.defaultParams, ...params };
    const { x, y } = point;

    return {
      x: Math.sin(a * y) + c * Math.cos(a * x),
      y: Math.sin(b * x) + d * Math.cos(b * y),
    };
  },

  /**
   * Step function for consistency with other attractors
   * For iterative attractors, dt is ignored
   * @param {Object} point - { x, y }
   * @param {number} [_dt] - Ignored for iterative attractors
   * @param {Object} [params] - Attractor parameters
   * @returns {Object} { position: {x,y}, velocity: {dx,dy}, speed }
   */
  step(point, _dt, params = this.defaultParams) {
    const newPos = this.next(point, params);

    // Compute velocity as difference (for coloring consistency)
    const dx = newPos.x - point.x;
    const dy = newPos.y - point.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    return {
      position: newPos,
      velocity: { dx, dy, dz: 0 },
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, _dt) => this.step(point, _dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ROSSLER ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rössler Attractor (1976)
 *
 * Discovered by Otto Rössler. One of the simplest chaotic attractors,
 * featuring a single spiral that folds back on itself.
 *
 * Equations:
 *   dx/dt = -y - z
 *   dy/dt = x + ay
 *   dz/dt = b + z(x - c)
 *
 * Default parameters: a=0.2, b=0.2, c=5.7
 */
const rossler = {
  name: "Rössler",
  type: AttractorType.CONTINUOUS,
  dimension: AttractorDimension.THREE_D,

  equations: ["dx/dt = -y - z", "dy/dt = x + ay", "dz/dt = b + z(x - c)"],

  defaultParams: {
    a: 0.2,
    b: 0.2,
    c: 5.7,
  },

  defaultDt: 0.01,

  derivatives(point, params = this.defaultParams) {
    const { a, b, c } = { ...this.defaultParams, ...params };
    const { x, y, z } = point;

    return {
      dx: -y - z,
      dy: x + a * y,
      dz: b + z * (x - c),
    };
  },

  step(point, dt = this.defaultDt, params = this.defaultParams) {
    const d = this.derivatives(point, params);
    const speed = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz);

    return {
      position: {
        x: point.x + d.dx * dt,
        y: point.y + d.dy * dt,
        z: point.z + d.dz * dt,
      },
      velocity: d,
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, dt = this.defaultDt) => this.step(point, dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HALVORSEN ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Halvorsen Attractor
 *
 * A symmetric chaotic attractor with three-fold rotational symmetry.
 *
 * Equations:
 *   dx/dt = -ax - 4y - 4z - y²
 *   dy/dt = -ay - 4z - 4x - z²
 *   dz/dt = -az - 4x - 4y - x²
 *
 * Default parameter: a=1.89
 */
const halvorsen = {
  name: "Halvorsen",
  type: AttractorType.CONTINUOUS,
  dimension: AttractorDimension.THREE_D,

  equations: [
    "dx/dt = -ax - 4y - 4z - y²",
    "dy/dt = -ay - 4z - 4x - z²",
    "dz/dt = -az - 4x - 4y - x²",
  ],

  defaultParams: {
    a: 1.89,
  },

  defaultDt: 0.005,

  derivatives(point, params = this.defaultParams) {
    const { a } = { ...this.defaultParams, ...params };
    const { x, y, z } = point;

    return {
      dx: -a * x - 4 * y - 4 * z - y * y,
      dy: -a * y - 4 * z - 4 * x - z * z,
      dz: -a * z - 4 * x - 4 * y - x * x,
    };
  },

  step(point, dt = this.defaultDt, params = this.defaultParams) {
    const d = this.derivatives(point, params);
    const speed = Math.sqrt(d.dx * d.dx + d.dy * d.dy + d.dz * d.dz);

    return {
      position: {
        x: point.x + d.dx * dt,
        y: point.y + d.dy * dt,
        z: point.z + d.dz * dt,
      },
      velocity: d,
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, dt = this.defaultDt) => this.step(point, dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DE JONG ATTRACTOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * De Jong Attractor (Peter de Jong)
 *
 * A 2D iterative attractor similar to Clifford, creating beautiful
 * swirling patterns.
 *
 * Equations:
 *   x_{n+1} = sin(a·y_n) - cos(b·x_n)
 *   y_{n+1} = sin(c·x_n) - cos(d·y_n)
 *
 * Default parameters: a=-2.24, b=-0.65, c=-0.43, d=-2.43
 */
const deJong = {
  name: "De Jong",
  type: AttractorType.ITERATIVE,
  dimension: AttractorDimension.TWO_D,

  equations: [
    "x_{n+1} = sin(a·y_n) - cos(b·x_n)",
    "y_{n+1} = sin(c·x_n) - cos(d·y_n)",
  ],

  defaultParams: {
    a: -2.24,
    b: -0.65,
    c: -0.43,
    d: -2.43,
  },

  next(point, params = this.defaultParams) {
    const { a, b, c, d } = { ...this.defaultParams, ...params };
    const { x, y } = point;

    return {
      x: Math.sin(a * y) - Math.cos(b * x),
      y: Math.sin(c * x) - Math.cos(d * y),
    };
  },

  step(point, _dt, params = this.defaultParams) {
    const newPos = this.next(point, params);
    const dx = newPos.x - point.x;
    const dy = newPos.y - point.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    return {
      position: newPos,
      velocity: { dx, dy, dz: 0 },
      speed,
    };
  },

  createStepper(params = this.defaultParams) {
    const mergedParams = { ...this.defaultParams, ...params };
    return (point, _dt) => this.step(point, _dt, mergedParams);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collection of all attractor functions
 */
export const Attractors = {
  lorenz,
  dadras,
  aizawa,
  thomas,
  clifford,
  rossler,
  halvorsen,
  deJong,
};

/**
 * Get list of all available attractor names
 * @returns {string[]}
 */
export function getAttractorNames() {
  return Object.keys(Attractors);
}

/**
 * Get attractor by name
 * @param {string} name - Attractor name
 * @returns {Object|null}
 */
export function getAttractor(name) {
  return Attractors[name] || null;
}

/**
 * Get all 3D attractors
 * @returns {Object}
 */
export function get3DAttractors() {
  return Object.fromEntries(
    Object.entries(Attractors).filter(
      ([, attr]) => attr.dimension === AttractorDimension.THREE_D
    )
  );
}

/**
 * Get all 2D attractors
 * @returns {Object}
 */
export function get2DAttractors() {
  return Object.fromEntries(
    Object.entries(Attractors).filter(
      ([, attr]) => attr.dimension === AttractorDimension.TWO_D
    )
  );
}

// Default export
export default Attractors;

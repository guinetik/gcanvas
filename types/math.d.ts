/**
 * GCanvas Math Module
 * Mathematical utilities including random numbers, complex numbers, fractals, patterns, and noise.
 * @module math
 */

import { PenroseTilingOptions } from './common';

// ==========================================================================
// Random Utilities
// ==========================================================================

/**
 * Random number generation utilities.
 *
 * @example
 * const x = Random.float(0, 100);
 * const color = Random.color();
 * const item = Random.pick(['a', 'b', 'c']);
 */
export class Random {
  /**
   * Generate a random float in range [min, max).
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   */
  static float(min: number, max: number): number;

  /**
   * Generate a random integer in range [min, max].
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   */
  static int(min: number, max: number): number;

  /**
   * Generate a random boolean.
   * @param probability - Probability of true (0-1, default: 0.5)
   */
  static bool(probability?: number): boolean;

  /**
   * Pick a random element from an array.
   * @param array - Array to pick from
   */
  static pick<T>(array: T[]): T;

  /**
   * Shuffle an array (Fisher-Yates).
   * @param array - Array to shuffle
   * @returns New shuffled array
   */
  static shuffle<T>(array: T[]): T[];

  /**
   * Generate a random hex color.
   * @returns Color string (e.g., "#a3f2c1")
   */
  static color(): string;

  /**
   * Generate a random angle in radians.
   * @returns Angle in range [0, 2π)
   */
  static angle(): number;
}

// ==========================================================================
// Complex Numbers
// ==========================================================================

/**
 * Complex number representation and operations.
 * Used for fractal calculations and advanced math.
 *
 * @example
 * const c1 = new Complex(3, 4);
 * const c2 = Complex.fromPolar(5, Math.PI / 4);
 * const product = c1.multiply(c2);
 */
export class Complex {
  /** Real part */
  real: number;
  /** Imaginary part */
  imag: number;

  /**
   * Create a complex number.
   * @param real - Real part
   * @param imag - Imaginary part
   */
  constructor(real: number, imag?: number);

  /**
   * Create a complex number from polar coordinates.
   * @param r - Magnitude (radius)
   * @param theta - Angle in radians
   */
  static fromPolar(r: number, theta: number): Complex;

  /**
   * Add another complex number.
   * @param other - Complex number to add
   * @returns New complex number (sum)
   */
  add(other: Complex): Complex;

  /**
   * Subtract another complex number.
   * @param other - Complex number to subtract
   * @returns New complex number (difference)
   */
  subtract(other: Complex): Complex;

  /**
   * Multiply by another complex number.
   * @param other - Complex number to multiply by
   * @returns New complex number (product)
   */
  multiply(other: Complex): Complex;

  /**
   * Scale by a scalar value.
   * @param scalar - Value to scale by
   * @returns New scaled complex number
   */
  scale(scalar: number): Complex;

  /**
   * Calculate the magnitude (absolute value).
   * @returns Magnitude √(real² + imag²)
   */
  magnitude(): number;

  /**
   * Get the complex conjugate.
   * @returns New complex number with negated imaginary part
   */
  conjugate(): Complex;
}

// ==========================================================================
// Fractals
// ==========================================================================

/**
 * Fractal generation utilities.
 *
 * @example
 * const iterations = Fractals.mandelbrot(x, y, 100);
 * const color = iterations === 100 ? 'black' : `hsl(${iterations * 3}, 100%, 50%)`;
 */
export class Fractals {
  /**
   * Calculate Mandelbrot set membership.
   * @param x - Real coordinate
   * @param y - Imaginary coordinate
   * @param maxIterations - Maximum iterations before assuming membership
   * @returns Number of iterations until escape (or maxIterations if in set)
   */
  static mandelbrot(x: number, y: number, maxIterations: number): number;

  /**
   * Calculate Julia set value.
   * @param x - Real coordinate
   * @param y - Imaginary coordinate
   * @param cx - Julia constant real part
   * @param cy - Julia constant imaginary part
   * @param maxIterations - Maximum iterations
   * @returns Number of iterations until escape
   */
  static julia(x: number, y: number, cx: number, cy: number, maxIterations: number): number;
}

// ==========================================================================
// Patterns
// ==========================================================================

/**
 * Pattern generation utilities.
 *
 * @example
 * const isBlack = Patterns.checkerboard(x, y, 32);
 */
export class Patterns {
  /**
   * Generate a checkerboard pattern.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param size - Size of each square
   * @returns true for one color, false for the other
   */
  static checkerboard(x: number, y: number, size: number): boolean;

  /**
   * Generate a stripe pattern.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param size - Stripe width
   * @param angle - Stripe angle in radians (default: 0 = horizontal)
   * @returns true for stripe, false for gap
   */
  static stripes(x: number, y: number, size: number, angle?: number): boolean;
}

// ==========================================================================
// Noise
// ==========================================================================

/**
 * Noise generation (Perlin-like).
 *
 * @example
 * const noise = new Noise(12345);
 * const value = noise.noise2D(x * 0.01, y * 0.01);
 */
export class Noise {
  /**
   * Create a noise generator.
   * @param seed - Random seed for reproducible noise
   */
  constructor(seed?: number);

  /**
   * Generate 2D noise value.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Noise value in range [-1, 1]
   */
  noise2D(x: number, y: number): number;

  /**
   * Generate 3D noise value.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @returns Noise value in range [-1, 1]
   */
  noise3D(x: number, y: number, z: number): number;
}

// ==========================================================================
// Penrose Tiling
// ==========================================================================

/**
 * Generate Penrose tiling as pixel data.
 * Creates aperiodic (non-repeating) tessellation pattern.
 *
 * @param width - Image width in pixels (default: 800)
 * @param height - Image height in pixels (default: 800)
 * @param options - Tiling options
 * @returns RGBA pixel data as Uint8ClampedArray (4 bytes per pixel)
 *
 * @example
 * const pixels = generatePenroseTilingPixels(400, 400, {
 *   divisions: 6,
 *   color1: [255, 100, 100, 255],
 *   color2: [100, 100, 255, 255]
 * });
 * const imageData = new ImageData(pixels, 400, 400);
 * ctx.putImageData(imageData, 0, 0);
 */
export function generatePenroseTilingPixels(
  width?: number,
  height?: number,
  options?: PenroseTilingOptions
): Uint8ClampedArray;

// ==========================================================================
// Tensor (Rank-2 Tensor for General Relativity)
// ==========================================================================

/** Tensor creation options */
export interface TensorOptions {
  /** Name of the tensor (e.g., 'Schwarzschild') */
  name?: string;
  /** Metric signature (e.g., [-1, 1, 1, 1]) */
  signature?: number[];
  /** Coordinate names (e.g., ['t', 'r', 'θ', 'φ']) */
  coordinates?: string[];
}

/**
 * Rank-2 Tensor class for general relativity calculations.
 * Provides immutable tensor operations following the Complex class pattern.
 *
 * @example
 * const g = Tensor.schwarzschild(10, 2);
 * console.log(g.get(0, 0)); // g_tt component
 */
export class Tensor {
  /** Tensor dimension (n for n×n tensor) */
  readonly dimension: number;
  /** Tensor name */
  readonly name: string;
  /** Metric signature */
  readonly signature: number[] | null;
  /** Coordinate names */
  readonly coordinates: string[] | null;

  /**
   * Create a new rank-2 tensor from a 2D array of components.
   * @param components - 2D array of tensor components
   * @param options - Optional metadata
   */
  constructor(components: number[][], options?: TensorOptions);

  // Static Factory Methods
  /** Create a Minkowski (flat spacetime) metric tensor */
  static minkowski(): Tensor;

  /**
   * Create a Schwarzschild metric tensor at a given radial position.
   * @param r - Radial coordinate (must be > rs)
   * @param rs - Schwarzschild radius (2GM/c²)
   * @param theta - Polar angle (default: equatorial plane)
   */
  static schwarzschild(r: number, rs: number, theta?: number): Tensor;

  /** Create contravariant Schwarzschild metric */
  static schwarzschildContravariant(r: number, rs: number, theta?: number): Tensor;

  /**
   * Create a Kerr metric tensor (rotating black hole).
   * @param r - Radial coordinate
   * @param theta - Polar angle
   * @param M - Mass parameter
   * @param a - Spin parameter (0 ≤ a ≤ M)
   */
  static kerr(r: number, theta: number, M: number, a: number): Tensor;

  /** Create contravariant Kerr metric */
  static kerrContravariant(r: number, theta: number, M: number, a: number): Tensor;

  /** Calculate Kerr horizon radius */
  static kerrHorizonRadius(M: number, a: number, inner?: boolean): number;

  /** Calculate ergosphere radius */
  static kerrErgosphereRadius(M: number, a: number, theta: number): number;

  /** Calculate ISCO radius for Kerr metric */
  static kerrISCO(M: number, a: number, prograde?: boolean): number;

  /** Calculate frame-dragging angular velocity */
  static kerrFrameDraggingOmega(r: number, theta: number, M: number, a: number): number;

  /** Calculate Kerr effective potential */
  static kerrEffectivePotential(M: number, a: number, E: number, L: number, r: number): number;

  /** Create a diagonal tensor */
  static diagonal(values: number[], options?: TensorOptions): Tensor;

  /** Create an identity tensor */
  static identity(n?: number): Tensor;

  /** Create a zero tensor */
  static zero(n?: number): Tensor;

  // Component Access
  /** Get a component at indices */
  get(i: number, j: number): number;

  /** Return new tensor with component changed */
  set(i: number, j: number, value: number): Tensor;

  /** Get diagonal components */
  getDiagonal(): number[];

  // Tensor Operations
  /** Add another tensor */
  add(other: Tensor): Tensor;

  /** Subtract another tensor */
  subtract(other: Tensor): Tensor;

  /** Multiply by scalar */
  scale(scalar: number): Tensor;

  /** Matrix multiply with another tensor */
  multiply(other: Tensor): Tensor;

  /** Transpose tensor */
  transpose(): Tensor;

  /** Compute inverse */
  inverse(): Tensor;

  // Derived Quantities
  /** Compute determinant */
  determinant(): number;

  /** Compute trace */
  trace(): number;

  /** Check if diagonal */
  isDiagonal(tolerance?: number): boolean;

  /** Check if symmetric */
  isSymmetric(tolerance?: number): boolean;

  // GR Utilities
  /**
   * Compute Christoffel symbols for a metric.
   * @param metricFn - Function returning metric at position
   * @param position - Position [t, r, θ, φ]
   * @param delta - Step size for numerical differentiation
   */
  static christoffel(
    metricFn: (position: number[]) => Tensor,
    position: number[],
    delta?: number
  ): number[][][];

  /** Analytical Christoffel symbols for Schwarzschild */
  static schwarzschildChristoffel(r: number, rs: number, theta: number): number[][][];

  /** Compute effective potential for Schwarzschild geodesics */
  static effectivePotential(M: number, L: number, r: number): number;

  /** ISCO radius for Schwarzschild */
  static iscoRadius(rs: number): number;

  /** Photon sphere radius */
  static photonSphereRadius(rs: number): number;

  // Display
  /** Get flat array of components */
  toArray(): number[];

  /** Get 2D array copy */
  toMatrix(): number[][];

  /** String representation */
  toString(precision?: number): string;

  /** LaTeX representation */
  toLatex(precision?: number): string;
}

// ==========================================================================
// General Relativity (gr.js)
// ==========================================================================

/**
 * Calculate gravitational lensing deflection.
 * @param b - Impact parameter
 * @param M - Mass
 * @returns Deflection angle in radians
 */
export function gravitationalLensingAngle(b: number, M: number): number;

/**
 * Calculate time dilation factor.
 * @param r - Radial coordinate
 * @param rs - Schwarzschild radius
 * @returns Time dilation factor (0-1)
 */
export function timeDilationFactor(r: number, rs: number): number;

/**
 * Calculate gravitational redshift.
 * @param r - Radial coordinate
 * @param rs - Schwarzschild radius
 * @returns Redshift z
 */
export function gravitationalRedshift(r: number, rs: number): number;

// ==========================================================================
// Orbital Mechanics (orbital.js)
// ==========================================================================

/** Orbital state vector */
export interface OrbitalState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

/** Keplerian orbital elements */
export interface OrbitalElements {
  a: number;  // Semi-major axis
  e: number;  // Eccentricity
  i: number;  // Inclination
  Omega: number;  // Right ascension of ascending node
  omega: number;  // Argument of periapsis
  nu: number;  // True anomaly
}

/**
 * Calculate orbital velocity at radius.
 * @param r - Orbital radius
 * @param M - Central mass
 * @returns Orbital velocity
 */
export function orbitalVelocity(r: number, M: number): number;

/**
 * Calculate orbital period.
 * @param a - Semi-major axis
 * @param M - Central mass
 * @returns Orbital period
 */
export function orbitalPeriod(a: number, M: number): number;

/**
 * Convert Keplerian elements to state vector.
 * @param elements - Orbital elements
 * @param mu - Gravitational parameter
 */
export function elementsToState(elements: OrbitalElements, mu: number): OrbitalState;

/**
 * Propagate orbit using Runge-Kutta.
 * @param state - Current state
 * @param dt - Time step
 * @param mu - Gravitational parameter
 */
export function propagateOrbit(state: OrbitalState, dt: number, mu: number): OrbitalState;

// ==========================================================================
// Quantum Mechanics (quantum.js)
// ==========================================================================

/**
 * Gaussian wave packet.
 * @param x - Position
 * @param x0 - Center position
 * @param k0 - Central wavenumber
 * @param sigma - Width parameter
 * @param t - Time
 * @returns Complex amplitude {re, im}
 */
export function gaussianWavePacket(
  x: number,
  x0: number,
  k0: number,
  sigma: number,
  t: number
): { re: number; im: number };

/**
 * Probability density |Ψ|².
 * @param psi - Wave function value {re, im}
 */
export function probabilityDensity(psi: { re: number; im: number }): number;

/**
 * Particle in a box wave function.
 * @param x - Position (0 to L)
 * @param L - Box length
 * @param n - Quantum number
 */
export function particleInBox(x: number, L: number, n: number): number;

/**
 * Harmonic oscillator wave function.
 * @param x - Position
 * @param n - Energy level
 * @param omega - Angular frequency
 * @param m - Mass
 */
export function harmonicOscillator(x: number, n: number, omega: number, m: number): number;

// ==========================================================================
// Heat Transfer (heat.js)
// ==========================================================================

/**
 * Calculate heat transfer between two objects.
 * @param T1 - Temperature of object 1
 * @param T2 - Temperature of object 2
 * @param k - Thermal conductivity
 * @param dt - Time step
 */
export function heatTransfer(T1: number, T2: number, k: number, dt: number): number;

/**
 * Calculate buoyancy force.
 * @param temperature - Object temperature
 * @param ambientTemp - Ambient temperature
 * @param coefficient - Buoyancy coefficient
 */
export function buoyancyForce(temperature: number, ambientTemp: number, coefficient: number): number;

/**
 * Temperature decay toward ambient.
 * @param temp - Current temperature
 * @param ambientTemp - Ambient temperature
 * @param rate - Decay rate
 * @param dt - Time step
 */
export function temperatureDecay(temp: number, ambientTemp: number, rate: number, dt: number): number;

// ==========================================================================
// Fluid Dynamics (fluid.js)
// ==========================================================================

/**
 * Calculate viscosity drag force.
 * @param velocity - Velocity vector
 * @param viscosity - Fluid viscosity
 */
export function viscosityDrag(velocity: { x: number; y: number }, viscosity: number): { x: number; y: number };

/**
 * Calculate surface tension force.
 * @param curvature - Surface curvature
 * @param tension - Surface tension coefficient
 */
export function surfaceTension(curvature: number, tension: number): number;

/**
 * Calculate Reynolds number.
 * @param velocity - Flow velocity
 * @param length - Characteristic length
 * @param viscosity - Kinematic viscosity
 */
export function reynoldsNumber(velocity: number, length: number, viscosity: number): number;

/**
 * Navier-Stokes pressure term.
 * @param density - Fluid density
 * @param pressure - Pressure
 */
export function pressureGradient(density: number, pressure: number): number;

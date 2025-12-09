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

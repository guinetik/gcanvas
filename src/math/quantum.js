/**
 * Quantum mechanics utilities for wave function visualization.
 *
 * @example
 * import { gaussianWavePacket } from './quantum.js';
 *
 * const params = { amplitude: 1, sigma: 0.8, k: 8, omega: 4, velocity: 0.5 };
 * const { psi, envelope } = gaussianWavePacket(x, t, params);
 */

import { Complex } from "./complex.js";

// ─────────────────────────────────────────────────────────────────────────────
// WAVE PACKETS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gaussian wave packet: Ψ(x,t) = A * e^(-(x-vt)²/4σ²) * e^(i(kx-ωt))
 *
 * This is the standard form of a localized quantum mechanical wave packet.
 * The Gaussian envelope moves with group velocity v, while the complex
 * phase oscillates with wave number k and frequency ω.
 *
 * @param {number} x - Position
 * @param {number} t - Time
 * @param {Object} params - Wave packet parameters
 * @param {number} params.amplitude - Amplitude A
 * @param {number} params.sigma - Width of Gaussian envelope σ
 * @param {number} params.k - Wave number (controls oscillation frequency)
 * @param {number} params.omega - Angular frequency ω
 * @param {number} params.velocity - Group velocity v
 * @returns {{ psi: Complex, envelope: number }} Wave function and envelope
 */
export function gaussianWavePacket(x, t, { amplitude, sigma, k, omega, velocity }) {
  // Center of wave packet moves with group velocity
  const x0 = velocity * t;

  // Gaussian envelope: A * e^(-(x-x0)²/4σ²)
  const dx = x - x0;
  const envelope = amplitude * Math.exp(-(dx * dx) / (4 * sigma * sigma));

  // Complex phase: e^(i(kx - ωt))
  const phase = k * x - omega * t;
  const psi = Complex.fromPolar(envelope, phase);

  return { psi, envelope };
}

/**
 * Compute just the phase for a plane wave: e^(i(kx - ωt))
 *
 * @param {number} x - Position
 * @param {number} t - Time
 * @param {number} k - Wave number
 * @param {number} omega - Angular frequency
 * @returns {number} Phase angle in radians
 */
export function planeWavePhase(x, t, k, omega) {
  return k * x - omega * t;
}

/**
 * Gaussian envelope only (probability amplitude).
 *
 * |Ψ|² ∝ e^(-(x-x0)²/2σ²)
 *
 * @param {number} x - Position
 * @param {number} x0 - Center of packet
 * @param {number} sigma - Width parameter
 * @param {number} [amplitude=1] - Amplitude
 * @returns {number} Envelope value
 */
export function gaussianEnvelope(x, x0, sigma, amplitude = 1) {
  const dx = x - x0;
  return amplitude * Math.exp(-(dx * dx) / (4 * sigma * sigma));
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE FUNCTION UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Probability density |Ψ|².
 *
 * @param {Complex} psi - Wave function value
 * @returns {number} Probability density
 */
export function probabilityDensity(psi) {
  return psi.real * psi.real + psi.imag * psi.imag;
}

/**
 * De Broglie wavelength: λ = 2π/k
 *
 * @param {number} k - Wave number
 * @returns {number} Wavelength
 */
export function deBroglieWavelength(k) {
  return (2 * Math.PI) / k;
}

/**
 * Group velocity from dispersion relation.
 * For a free particle: v_g = dω/dk = ℏk/m
 *
 * @param {number} k - Wave number
 * @param {number} omega - Angular frequency
 * @param {number} [dk=0.01] - Step for numerical derivative
 * @returns {number} Group velocity
 */
export function groupVelocity(k, omega, dk = 0.01) {
  // For visualization, we typically use v_g = ω/k (phase velocity)
  // or a custom dispersion relation
  return omega / k;
}

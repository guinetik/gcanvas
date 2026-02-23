/**
 * Riemann Zeta Function — Critical Line Computation
 *
 * Implements the Riemann-Siegel formula for efficient evaluation of
 * ζ(1/2 + it) on the critical line. Provides zero detection via
 * sign changes of the Z function with bisection refinement.
 *
 * @module math/zeta
 */
import { Complex } from "./complex.js";

/**
 * First 30 known non-trivial zeros of ζ(s) (imaginary parts).
 * All lie on Re(s) = 1/2 (verified computationally).
 * @type {number[]}
 */
export const KNOWN_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832,
  52.970321, 56.446248, 59.347044, 60.831779, 65.112544,
  67.079811, 69.546402, 72.067158, 75.704691, 77.144840,
  79.337375, 82.910381, 84.735493, 87.425275, 88.809111,
  92.491899, 94.651344, 95.870634, 98.831194, 101.317851,
];

/**
 * Stirling approximation for ln(Γ(z)) where z is complex.
 * Used internally for theta function computation.
 * @param {number} x - Real part
 * @param {number} y - Imaginary part
 * @returns {{ real: number, imag: number }}
 */
function lnGammaApprox(x, y) {
  const absZ = Math.sqrt(x * x + y * y);
  const argZ = Math.atan2(y, x);
  const lnZReal = Math.log(absZ);
  const lnZImag = argZ;

  // (z - 1/2) * ln(z)
  const zmhR = x - 0.5;
  const zmhI = y;
  const term1R = zmhR * lnZReal - zmhI * lnZImag;
  const term1I = zmhR * lnZImag + zmhI * lnZReal;

  // - z
  const term2R = -x;
  const term2I = -y;

  // ln(2π)/2
  const term3R = 0.5 * Math.log(2 * Math.PI);

  // Stirling correction: 1/(12z)
  const invZr = x / (x * x + y * y);
  const invZi = -y / (x * x + y * y);
  const c1R = invZr / 12;
  const c1I = invZi / 12;

  return {
    real: term1R + term2R + term3R + c1R,
    imag: term1I + term2I + c1I,
  };
}

/**
 * Riemann-Siegel theta function.
 * θ(t) = arg(Γ(1/4 + it/2)) - (t/2)ln(π)
 * @param {number} t
 * @returns {number} θ(t)
 */
export function riemannSiegelTheta(t) {
  const lnG = lnGammaApprox(0.25, t / 2);
  return lnG.imag - (t / 2) * Math.log(Math.PI);
}

/**
 * Riemann-Siegel Z function.
 * Z(t) ≈ 2 Σ_{n=1}^{N} cos(θ(t) - t·ln(n)) / √n + R
 * Sign changes correspond to zeros of ζ on the critical line.
 * @param {number} t
 * @returns {number} Z(t)
 */
export function riemannSiegelZ(t) {
  if (t < 1) return 0;

  const theta = riemannSiegelTheta(t);
  const N = Math.floor(Math.sqrt(t / (2 * Math.PI)));

  let sum = 0;
  for (let n = 1; n <= N; n++) {
    sum += Math.cos(theta - t * Math.log(n)) / Math.sqrt(n);
  }
  sum *= 2;

  // C0 correction term
  const p = Math.sqrt(t / (2 * Math.PI)) - N;
  const cos2pip = Math.cos(2 * Math.PI * p);
  if (Math.abs(cos2pip) > 0.01) {
    const C0 = Math.cos(2 * Math.PI * (p * p - p - 1 / 16)) / cos2pip;
    const remainder = Math.pow(-1, N - 1) * Math.pow(t / (2 * Math.PI), -0.25) * C0;
    sum += remainder;
  }

  return sum;
}

/**
 * Compute ζ(1/2 + it) as a complex number.
 * Reconstructs from Z(t) and θ(t): ζ(1/2 + it) = Z(t) · e^{-iθ(t)}
 * @param {number} t
 * @returns {Complex}
 */
export function zetaCriticalLine(t) {
  if (t < 1) {
    const N = 50;
    let real = 0;
    let imag = 0;
    for (let n = 1; n <= N; n++) {
      const logN = Math.log(n);
      const angle = -t * logN;
      const coeff = 1 / Math.sqrt(n);
      real += coeff * Math.cos(angle);
      imag += coeff * Math.sin(angle);
    }
    return new Complex(real, imag);
  }

  const Z = riemannSiegelZ(t);
  const theta = riemannSiegelTheta(t);
  return new Complex(Z * Math.cos(-theta), Z * Math.sin(-theta));
}

/**
 * Find zeros of ζ on the critical line within a range.
 * Scans Z(t) for sign changes, refines with bisection.
 * @param {number} tStart
 * @param {number} tEnd
 * @param {number} step
 * @returns {number[]}
 */
export function findZerosInRange(tStart, tEnd, step) {
  const zeros = [];
  let prevZ = riemannSiegelZ(tStart);

  for (let t = tStart + step; t <= tEnd; t += step) {
    const currZ = riemannSiegelZ(t);
    if (prevZ * currZ < 0) {
      let lo = t - step;
      let hi = t;
      let loZ = prevZ;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const midZ = riemannSiegelZ(mid);
        if (loZ * midZ < 0) {
          hi = mid;
        } else {
          lo = mid;
          loZ = midZ;
        }
      }
      zeros.push((lo + hi) / 2);
    }
    prevZ = currZ;
  }

  return zeros;
}

/**
 * Verify whether a t value corresponds to a known non-trivial zero.
 * @param {number} t
 * @param {number} tolerance
 * @returns {{ verified: boolean, knownValue: number|null, index: number }}
 */
export function verifyZero(t, tolerance = 0.1) {
  for (let i = 0; i < KNOWN_ZEROS.length; i++) {
    if (Math.abs(t - KNOWN_ZEROS[i]) < tolerance) {
      return { verified: true, knownValue: KNOWN_ZEROS[i], index: i + 1 };
    }
  }
  return { verified: false, knownValue: null, index: -1 };
}

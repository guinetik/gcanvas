/** Bohr radius in natural units — all distances are measured in units of a0. */
const BOHR_RADIUS = 1;

/** Sampling resolution for CDF-based inverse transform sampling. */
const SAMPLING = {
  rSteps: 500,
  thetaSteps: 200,
  rMaxScale: 4,       // multiplied by n^2
  rMaxPadding: 10,    // added to rMax
};

/**
 * Associated Laguerre polynomial L_n^alpha(x) via recurrence.
 * L_0^a(x) = 1
 * L_1^a(x) = 1 + a - x
 * k * L_k^a(x) = (2k - 1 + a - x) * L_{k-1}^a(x) - (k - 1 + a) * L_{k-2}^a(x)
 */
export function associatedLaguerre(n, alpha, x) {
  if (n === 0) return 1;
  if (n === 1) return 1 + alpha - x;
  let prev2 = 1;
  let prev1 = 1 + alpha - x;
  for (let k = 2; k <= n; k++) {
    const curr = ((2 * k - 1 + alpha - x) * prev1 - (k - 1 + alpha) * prev2) / k;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

/**
 * Associated Legendre polynomial P_l^m(x) via recurrence.
 * Handles negative m via the relation:
 * P_l^{-m}(x) = (-1)^m * (l-m)!/(l+m)! * P_l^m(x)
 */
export function associatedLegendre(l, m, x) {
  const absM = Math.abs(m);

  let pmm = 1;
  if (absM > 0) {
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let j = 1; j <= absM; j++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === absM) {
    return m < 0 ? negMFactor(l, m) * pmm : pmm;
  }

  let pmm1 = x * (2 * absM + 1) * pmm;
  if (l === absM + 1) {
    return m < 0 ? negMFactor(l, m) * pmm1 : pmm1;
  }

  let result = 0;
  for (let ll = absM + 2; ll <= l; ll++) {
    result = (x * (2 * ll - 1) * pmm1 - (ll + absM - 1) * pmm) / (ll - absM);
    pmm = pmm1;
    pmm1 = result;
  }

  return m < 0 ? negMFactor(l, m) * result : result;
}

function negMFactor(l, m) {
  const absM = Math.abs(m);
  let factor = (absM % 2 === 0) ? 1 : -1;
  for (let i = l - absM + 1; i <= l + absM; i++) {
    factor /= i;
  }
  return factor;
}

/**
 * Radial wave function R_{n,l}(r) for hydrogen atom.
 */
export function radialWaveFunction(n, l, r) {
  const rho = (2 * r) / (n * BOHR_RADIUS);

  const prefactor = Math.pow(2 / (n * BOHR_RADIUS), 3);
  const num = factorial(n - l - 1);
  const den = 2 * n * factorial(n + l);
  const norm = Math.sqrt(prefactor * num / den);

  const expPart = Math.exp(-rho / 2);
  const rhoPart = Math.pow(rho, l);
  const lagPart = associatedLaguerre(n - l - 1, 2 * l + 1, rho);

  return norm * expPart * rhoPart * lagPart;
}

/**
 * Angular wave function (real spherical harmonic theta part).
 * Uses |m| since the phi-dependent phase factor is handled separately in sampling.
 */
export function angularWaveFunction(l, m, theta) {
  const absM = Math.abs(m);
  const norm = Math.sqrt(
    ((2 * l + 1) / (4 * Math.PI)) * (factorial(l - absM) / factorial(l + absM))
  );
  return norm * associatedLegendre(l, absM, Math.cos(theta));
}

/**
 * Probability density |psi(n,l,m,r,theta)|^2 = |R_{n,l}(r)|^2 * |Y_l^m(theta)|^2
 */
export function probabilityDensity(n, l, m, r, theta) {
  const R = radialWaveFunction(n, l, r);
  const Y = angularWaveFunction(l, m, theta);
  return R * R * Y * Y;
}

function factorial(n) {
  if (n < 0) return NaN;
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

const ORBITAL_LETTERS = ["s", "p", "d", "f", "g", "h", "i"];

/**
 * Validate and clamp quantum numbers to valid ranges.
 */
export function validateQuantumNumbers(n, l, m) {
  n = Math.max(1, Math.round(n));
  l = Math.max(0, Math.min(n - 1, Math.round(l)));
  m = Math.max(-l, Math.min(l, Math.round(m)));
  return { n, l, m };
}

/**
 * Human-readable orbital label like "3d (m=1)".
 */
export function orbitalLabel(n, l, m) {
  const letter = ORBITAL_LETTERS[l] || l;
  if (l === 0) return `${n}${letter}`;
  return `${n}${letter} (m=${m})`;
}

/**
 * Sample particle positions from the hydrogen orbital probability density.
 * Uses CDF-based inverse transform sampling for r and theta, uniform phi.
 * Returns Float32Array of [x, y, z, probability, ...]
 */
export function sampleOrbitalPositions(n, l, m, count) {
  const result = new Float32Array(count * 4);

  const rMax = n * n * SAMPLING.rMaxScale + SAMPLING.rMaxPadding;
  const rSteps = SAMPLING.rSteps;
  const rDelta = rMax / rSteps;
  const radialPdf = new Float64Array(rSteps);
  const radialCdf = new Float64Array(rSteps);

  for (let i = 0; i < rSteps; i++) {
    const r = (i + 0.5) * rDelta;
    const R = radialWaveFunction(n, l, r);
    radialPdf[i] = r * r * R * R * rDelta;
  }

  radialCdf[0] = radialPdf[0];
  for (let i = 1; i < rSteps; i++) {
    radialCdf[i] = radialCdf[i - 1] + radialPdf[i];
  }
  const radialTotal = radialCdf[rSteps - 1];
  if (radialTotal === 0) return result;
  for (let i = 0; i < rSteps; i++) {
    radialCdf[i] /= radialTotal;
  }

  const thetaSteps = SAMPLING.thetaSteps;
  const thetaDelta = Math.PI / thetaSteps;
  const angularPdf = new Float64Array(thetaSteps);
  const angularCdf = new Float64Array(thetaSteps);

  for (let i = 0; i < thetaSteps; i++) {
    const theta = (i + 0.5) * thetaDelta;
    const Y = angularWaveFunction(l, m, theta);
    angularPdf[i] = Y * Y * Math.sin(theta) * thetaDelta;
  }

  angularCdf[0] = angularPdf[0];
  for (let i = 1; i < thetaSteps; i++) {
    angularCdf[i] = angularCdf[i - 1] + angularPdf[i];
  }
  const angularTotal = angularCdf[thetaSteps - 1];
  if (angularTotal === 0) return result;
  for (let i = 0; i < thetaSteps; i++) {
    angularCdf[i] /= angularTotal;
  }

  for (let p = 0; p < count; p++) {
    const ur = Math.random();
    let rIdx = binarySearch(radialCdf, ur);
    const r = (rIdx + 0.5) * rDelta;

    const ut = Math.random();
    let tIdx = binarySearch(angularCdf, ut);
    const theta = (tIdx + 0.5) * thetaDelta;

    const phi = Math.random() * 2 * Math.PI;

    const sinTheta = Math.sin(theta);
    const x = r * sinTheta * Math.cos(phi);
    const y = r * Math.cos(theta);
    const z = r * sinTheta * Math.sin(phi);

    const prob = probabilityDensity(n, l, m, r, theta);

    const idx = p * 4;
    result[idx] = x;
    result[idx + 1] = y;
    result[idx + 2] = z;
    result[idx + 3] = prob;
  }

  return result;
}

function binarySearch(cdf, value) {
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

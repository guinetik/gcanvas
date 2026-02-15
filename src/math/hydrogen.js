const BOHR_RADIUS = 1; // natural units

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
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

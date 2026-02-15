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

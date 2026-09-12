import { checkField } from "./grid.js";

function slope(a, b, c) {
  const left = b - a, right = c - b;
  if (left === 0 || right === 0 || Math.sign(left) !== Math.sign(right)) return 0;
  return Math.sign(left) * Math.min(2 * Math.abs(left), 2 * Math.abs(right), Math.abs((c - a) / 2));
}
function face(flux, mm, m, p, pp) {
  return flux >= 0 ? m + slope(mm, m, p) / 2 : p - slope(m, p, pp) / 2;
}

/** Negative u.grad(f), using MC-limited point reconstruction and cylindrical fluxes.
 * Subtracting the cell value at each face preserves constants without cancellation.
 */
export function advect(g, f, Fr, Fz, out) {
  checkField(g, f, true); checkField(g, out);
  if (f.buffer === out.buffer) throw new TypeError("Advection input and output must not alias");
  const W = g.W;
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nr; i++) {
      const k = g.idx(i, j), r = j * (g.nr + 1) + i, z = j * g.nr + i;
      const w = Fr[r], e = Fr[r + 1], s = Fz[z], n = Fz[z + g.nr];
      const fw = face(w, f[k - 2], f[k - 1], f[k], f[k + 1]);
      const fe = face(e, f[k - 1], f[k], f[k + 1], f[k + 2]);
      const fs = face(s, f[k - 2 * W], f[k - W], f[k], f[k + W]);
      const fn = face(n, f[k - W], f[k], f[k + W], f[k + 2 * W]);
      out[k] = -(e * (fe - f[k]) - w * (fw - f[k]) + n * (fn - f[k]) - s * (fs - f[k])) /
        (g.rc(i) * g.dr * g.dz);
      if (!Number.isFinite(out[k])) throw new RangeError("Nonfinite advection result");
    }
  }
}

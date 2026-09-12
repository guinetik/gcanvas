import { applyAxisGhosts, checkField } from "./grid.js";
import { zeroWallGhosts } from "./walls.js";

const CONFIG = { maxSweeps: 12000, atol: 1e-10, rtol: 1e-9, checkEvery: 8 };

/** Effective L5 coefficients after eliminating the even axis ghost. */
export function l5Row(g, i) {
  const h = 1 / g.dr ** 2, v = 1 / g.dz ** 2;
  if (i === 0) return { e: 4 * h, w: 0, z: v, d: 4 * h + 2 * v };
  const off = 3 / (2 * g.rc(i) * g.dr);
  return { e: h + off, w: h - off, z: v, d: 2 * h + 2 * v };
}

/** Elliptic row after eliminating quadratic zero-wall Dirichlet ghosts. */
export function ellipticRow(g, i, j, boundary = "analytic-extension") {
  const c = l5Row(g,i), row = { ...c, n: c.z, s: c.z };
  if (boundary === "zero-wall") {
    if (i === g.nr - 1) { row.d += 2 * row.e; row.w += row.e / 3; row.e = 0; }
    if (j === 0) { row.d += 2 * row.s; row.n += row.s / 3; row.s = 0; }
    if (j === g.nz - 1) { row.d += 2 * row.n; row.s += row.n / 3; row.n = 0; }
  } else if (boundary !== "analytic-extension") throw new RangeError("Unknown elliptic boundary");
  return row;
}

function value(g, f, k, c) {
  return c.e * f[k + 1] + c.w * f[k - 1] +
    c.z * (f[k + g.W] + f[k - g.W]) - c.d * f[k];
}

/** Apply L5 to point samples. Exterior ghosts must be current. No aliasing. */
export function applyL5(g, f, out) {
  checkField(g, f, true); checkField(g, out);
  if (f.buffer === out.buffer) throw new TypeError("L5 input and output must not alias");
  for (let i = 0; i < g.nr; i++) {
    const c = l5Row(g, i);
    for (let j = 0; j < g.nz; j++) {
      const k = g.idx(i, j);
      out[k] = value(g, f, k, c);
      if (!Number.isFinite(out[k])) throw new RangeError("Nonfinite L5 result");
    }
  }
}

/** Max absolute elliptic residual. Nonfinite data returns Infinity, never zero. */
export function poissonResidual(g, phi, chi, boundary = "analytic-extension") {
  checkField(g, phi); checkField(g, chi);
  if (!phi.every(Number.isFinite) || !chi.every(Number.isFinite)) return Infinity;
  let maximum = 0;
  for (let i = 0; i < g.nr; i++) {
    const c = l5Row(g, i);
    for (let j = 0; j < g.nz; j++) {
      const k = g.idx(i, j);
      const row = boundary === "analytic-extension" ? null : ellipticRow(g,i,j,boundary);
      const lap = row ? row.e*phi[k+1]+row.w*phi[k-1]+row.n*phi[k+g.W]+row.s*phi[k-g.W]-row.d*phi[k]
        : value(g, phi, k, c);
      const r = Math.abs(-lap - chi[k]);
      if (!Number.isFinite(r)) return Infinity;
      maximum = Math.max(maximum, r);
    }
  }
  return maximum;
}

/** Red-black GS for -L5 phi = chi, with analytic ghosts or eliminated wall rows.
 * Axis self-coupling is eliminated in l5Row; boundary ghosts refresh on return.
 */
export function solvePoisson(g, phi, chi, options = {}) {
  const o = { ...CONFIG, ...options };
  const boundary = o.boundary ?? "analytic-extension";
  if (!Number.isInteger(o.maxSweeps) || o.maxSweeps < 0 ||
      !Number.isInteger(o.checkEvery) || o.checkEvery < 1 ||
      !Number.isFinite(o.atol) || o.atol <= 0 || !Number.isFinite(o.rtol) || o.rtol < 0) {
    throw new RangeError("Invalid Poisson options");
  }
  checkField(g, phi); checkField(g, chi);
  let scale = 0;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nr; i++) scale = Math.max(scale, Math.abs(chi[g.idx(i, j)]));
  const target = o.atol + o.rtol * scale;
  let residual = poissonResidual(g, phi, chi, boundary), sweeps = 0;
  const rows = Array.from({ length: g.nr*g.nz }, (_, k) => ellipticRow(g,k%g.nr,Math.floor(k/g.nr),boundary));
  while (Number.isFinite(residual) && Number.isFinite(target) && residual > target && sweeps < o.maxSweeps) {
    for (let color = 0; color < 2; color++) {
      for (let j = 0; j < g.nz; j++) {
        for (let i = (color + j) & 1; i < g.nr; i += 2) {
          const k = g.idx(i, j), c = rows[j*g.nr+i];
          phi[k] = (chi[k] + c.e * phi[k + 1] + c.w * phi[k - 1] +
            c.n * phi[k + g.W] + c.s * phi[k - g.W]) / c.d;
        }
      }
    }
    sweeps++;
    if (sweeps % o.checkEvery === 0 || sweeps === o.maxSweeps) {
      residual = poissonResidual(g, phi, chi, boundary);
    }
  }
  if (boundary === "zero-wall") zeroWallGhosts(g,phi);
  else applyAxisGhosts(g, phi);
  const finite = Number.isFinite(residual) && Number.isFinite(target);
  const converged = finite && residual <= target;
  return { converged, reason: converged ? "converged" : finite ? "budget" : "nonfinite",
    sweeps, residual, target };
}

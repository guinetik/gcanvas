import { allocField, checkField } from "./grid.js";

const WEIGHTS = [-1 / 16, 9 / 16, 9 / 16, -1 / 16];

/** Allocate independent velocity/flux work arrays for one stage. */
export function allocVelocity(g) {
  return { psi: new Float64Array((g.nr + 1) * (g.nz + 1)),
    Fr: new Float64Array((g.nr + 1) * g.nz), Fz: new Float64Array(g.nr * (g.nz + 1)),
    ur: allocField(g), uz: allocField(g) };
}

/** Reconstruct regular phi at corners, then multiply by the exact corner r².
 * Tensor cubic interpolation prevents boundary-error jumps on smooth fields.
 */
export function cornerPsi(g, phi, psi, boundaryPsi, time = 0) {
  checkField(g, phi, true);
  if (psi.length !== (g.nr + 1) * (g.nz + 1)) throw new RangeError("Invalid corner storage");
  for (let j = 0; j <= g.nz; j++) {
    for (let i = 0; i <= g.nr; i++) {
      let v = 0;
      if (i > 0) {
        if (boundaryPsi && (i === g.nr || j === 0 || j === g.nz)) {
          v = boundaryPsi(g.rn(i), g.zn(j), time);
        } else {
          for (let y = 0; y < 4; y++)
            for (let x = 0; x < 4; x++)
              v += WEIGHTS[x] * WEIGHTS[y] * phi[g.idx(i + x - 2, j + y - 2)];
          v *= g.rn(i) ** 2;
        }
      }
      if (!Number.isFinite(v)) throw new RangeError("Nonfinite corner streamfunction");
      psi[j * (g.nr + 1) + i] = v;
    }
  }
}

/** Per-unit-angle integrated face volume fluxes from shared corner differences. */
export function faceFluxes(g, psi, Fr, Fz) {
  const stride = g.nr + 1;
  if (psi.length !== stride * (g.nz + 1) || Fr.length !== stride * g.nz ||
      Fz.length !== g.nr * (g.nz + 1)) throw new RangeError("Invalid flux storage");
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i <= g.nr; i++)
      Fr[j * stride + i] = i === 0 ? 0 : psi[j * stride + i] - psi[(j + 1) * stride + i];
  for (let j = 0; j <= g.nz; j++)
    for (let i = 0; i < g.nr; i++)
      Fz[j * g.nr + i] = psi[j * stride + i + 1] - psi[j * stride + i];
  if (!Fr.every(Number.isFinite) || !Fz.every(Number.isFinite)) throw new RangeError("Nonfinite flux");
}

/** Recover cell speeds by averaging face speeds, with ur=0 on the axis face. */
export function cellVelocity(g, Fr, Fz, ur, uz) {
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nr; i++) {
      const k = g.idx(i, j), r = j * (g.nr + 1) + i, z = j * g.nr + i;
      const west = i === 0 ? 0 : Fr[r] / (g.rn(i) * g.dz);
      ur[k] = 0.5 * (west + Fr[r + 1] / (g.rn(i + 1) * g.dz));
      uz[k] = 0.5 * (Fz[z] + Fz[z + g.nr]) / (g.rc(i) * g.dr);
      if (!Number.isFinite(ur[k]) || !Number.isFinite(uz[k])) throw new RangeError("Nonfinite velocity");
    }
  }
}

/** Maximum net volume flux per cylindrical cell volume; detects nonfinite input. */
export function maxAbsDivergence(g, Fr, Fz) {
  let result = 0;
  for (let j = 0; j < g.nz; j++) {
    for (let i = 0; i < g.nr; i++) {
      const r = j * (g.nr + 1) + i, z = j * g.nr + i;
      const div = Math.abs(Fr[r + 1] - Fr[r] + Fz[z + g.nr] - Fz[z]) / (g.rc(i) * g.dr * g.dz);
      if (!Number.isFinite(div)) return Infinity;
      result = Math.max(result, div);
    }
  }
  return result;
}

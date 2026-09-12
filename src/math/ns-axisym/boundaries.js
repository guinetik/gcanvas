import { applyAxisGhosts, checkField } from "./grid.js";

/** Fill only exterior ghosts from an analytic continuation, then mirror the axis.
 * This verification policy is not a generic face-Dirichlet or no-slip closure.
 */
export function fillAnalyticGhosts(g, f, time, sample) {
  checkField(g, f);
  for (let j = -g.G; j < g.nz + g.G; j++) {
    for (let i = 0; i < g.nr + g.G; i++) {
      if (i >= g.nr || j < 0 || j >= g.nz) f[g.idx(i, j)] = sample(g.rc(i), g.zc(j), time);
    }
  }
  applyAxisGhosts(g, f);
}

/** Build a stage-time analytic-extension policy from regular a, chi, phi samplers. */
export function analyticBoundary({ a, chi, phi }) {
  if (![a, chi, phi].every(f => typeof f === "function")) throw new TypeError("Missing exact field");
  return Object.freeze({
    kind: "analytic-extension",
    fill(g, state, time) {
      fillAnalyticGhosts(g, state.a, time, a);
      fillAnalyticGhosts(g, state.chi, time, chi);
      fillAnalyticGhosts(g, state.phi, time, phi);
    },
    psi: (r, z, time) => r * r * phi(r, z, time),
  });
}

import { applyAxisGhosts, checkField } from "./grid.js";

/** Quadratic continuation through the physical wall and two interior centers.
 * Locations are 0, h/2, 3h/2; the two ghosts lie at -h/2, -3h/2.
 * This supplies Dirichlet data on a cell-centered grid, not a higher-order
 * wall-vorticity formula. Thom's vorticity estimate remains first order.
 */
function extend(f, near, next, ghost1, ghost2, wall) {
  f[ghost1] = (8 * wall + f[next]) / 3 - 2 * f[near];
  f[ghost2] = 8 * wall + 2 * f[next] - 9 * f[near];
}

/** Fill exterior ghosts for zero Dirichlet scalar data on cylinder walls. */
export function zeroWallGhosts(g, f) {
  checkField(g, f);
  for (let j = 0; j < g.nz; j++) {
    extend(f, g.idx(g.nr - 1,j), g.idx(g.nr - 2,j), g.idx(g.nr,j), g.idx(g.nr + 1,j), 0);
  }
  for (let i = 0; i < g.nr + g.G; i++) {
    extend(f, g.idx(i,0), g.idx(i,1), g.idx(i,-1), g.idx(i,-2), 0);
    extend(f, g.idx(i,g.nz - 1), g.idx(i,g.nz - 2), g.idx(i,g.nz), g.idx(i,g.nz + 1), 0);
  }
  applyAxisGhosts(g, f);
}

/** Thom chi_wall = -2 psi_near/(r_wall² d²), d = half a cell.
 * Caps have the same radius as their adjacent cell; the outer wall needs
 * the explicit (r_cell/R)² conversion from phi to Stokes psi.
 */
export function thomGhosts(g, state) {
  const { chi, phi } = state;
  for (let j = 0; j < g.nz; j++) {
    const near = g.idx(g.nr - 1,j);
    const wall = -8 * (g.rc(g.nr - 1) / g.R) ** 2 * phi[near] / g.dr ** 2;
    extend(chi, near, g.idx(g.nr - 2,j), g.idx(g.nr,j), g.idx(g.nr + 1,j), wall);
  }
  // At diagonal exterior corners use the same radial-then-axial extension
  // order as phi. Evolution stencils only read the face ghost strips.
  for (let i = 0; i < g.nr + g.G; i++) {
    const low = g.idx(i,0), high = g.idx(i,g.nz - 1);
    extend(chi, low, g.idx(i,1), g.idx(i,-1), g.idx(i,-2), -8 * phi[low] / g.dz ** 2);
    extend(chi, high, g.idx(i,g.nz - 2), g.idx(i,g.nz), g.idx(i,g.nz + 1), -8 * phi[high] / g.dz ** 2);
  }
  applyAxisGhosts(g, chi);
}

/** Stationary closed cylinder, using Thom's wall-vorticity closure per stage. */
export function noSlipBoundary() {
  return Object.freeze({
    kind: "no-slip-thom",
    poissonBoundary: "zero-wall",
    // A conservative allowance for the explicit, potential-dependent wall
    // vorticity update. Its convergence/stability is tested with this factor.
    diffusionFactor: 4,
    fill(g,state) {
      zeroWallGhosts(g,state.a); zeroWallGhosts(g,state.phi); thomGhosts(g,state);
    },
    afterSolve(g,state) {
      zeroWallGhosts(g,state.phi); thomGhosts(g,state);
    },
    psi: () => 0,
  });
}

/** Independent tangential-slip estimate from three streamfunction points.
 * Quadratic derivative through wall psi=0 and the two nearest centers:
 * |dpsi/dn| = |9 psi_1 - psi_2|/(3 h). No prescribed velocity is read.
 */
export function wallSlip(g, phi) {
  checkField(g,phi,true);
  let radial = 0, caps = 0;
  for (let j = 0; j < g.nz; j++) {
    const p1 = g.rc(g.nr - 1) ** 2 * phi[g.idx(g.nr - 1,j)];
    const p2 = g.rc(g.nr - 2) ** 2 * phi[g.idx(g.nr - 2,j)];
    radial = Math.max(radial, Math.abs(9 * p1 - p2) / (3 * g.dr * g.R));
  }
  for (let i = 0; i < g.nr; i++) {
    for (const [near,next] of [[0,1],[g.nz - 1,g.nz - 2]]) {
      caps = Math.max(caps, g.rc(i) * Math.abs(9 * phi[g.idx(i,near)] - phi[g.idx(i,next)]) / (3 * g.dz));
    }
  }
  return { radial, caps, maximum: Math.max(radial,caps) };
}

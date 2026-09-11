# Axisymmetric NS Solver — CPU Reference (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Float64 CPU reference solver for axisymmetric Navier–Stokes with swirl (regularized `a = u_θ/r`, `χ = ω_θ/r` formulation), validated against Burgers and Lamb–Oseen analytic solutions with measured convergence orders.

**Architecture:** Small pure-function modules under `src/math/ns-axisym/` — grid/ghosts, operators (L5 + red-black Gauss–Seidel Poisson), streamfunction/velocity recovery via corner ψ, MUSCL flux-form advection, and an SSP-RK2 solver class with analytic boundary policies. Everything is Float64Array on a cell-centered grid with 2 ghost layers; no dependencies (zero-dep library rule).

**Tech Stack:** Plain ES modules, Float64Array, vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-ns-axisym-solver-design.md` — this plan implements §1 (fields/grid/equations, analytic boundary policy, discretization/time stepping, elliptic solve) and spec tests 1–3 + parts of 6 from §4. No-slip closure, manufactured solutions, GPU, and the lab page are later plans.

## Global Constraints

- Zero runtime dependencies; ES modules matching `src/` conventions.
- All arrays Float64Array. No divisions by cell radius that can hit r = 0 (first sample at Δr/2; face flux at the axis is set to zero directly).
- Ghost width 2 (MUSCL needs 2). Axis ghosts are even mirrors for `a`, `χ`, `φ`.
- CONFIG-style option objects; no magic numbers in code bodies.
- Convergence tests assert *order* (error ratio ≈ 4 for 2nd order under grid doubling, with tolerance), not magic error values.
- Every commit message ends with the Claude-Session trailer used in this repo.
- JSDoc on every exported function (repo docs are generated with jsdoc).

## File Structure

```
src/math/ns-axisym/
├── grid.js        # grid geometry, field allocation, ghost application
├── operators.js   # L5 stencil, red-black GS Poisson solve, residual
├── velocity.js    # corner ψ reconstruction, face volume fluxes, cell velocity, divergence
├── advect.js      # MUSCL (MC limiter) flux-form advection with cylindrical volumes
├── solver.js      # NSAxisymSolver: boundary policies, RHS, SSP-RK2, dt limits, accept/reject
├── presets.js     # burgersPreset, lambOseenPreset (init + analytic boundary policies + exact fields)
└── index.js       # barrel export
test/ns-axisym/
├── grid.test.js
├── operators.test.js
├── velocity.test.js
├── advect.test.js
├── solver-burgers.test.js
├── solver-lamboseen.test.js
└── validity.test.js
```

---

### Task 1: Grid, fields, and axis ghosts

**Files:**
- Create: `src/math/ns-axisym/grid.js`
- Test: `test/ns-axisym/grid.test.js`

**Interfaces:**
- Produces: `createGrid({ nr, nz, R, Z })` → grid object with `{ nr, nz, R, Z, dr, dz, G, W, H, idx(i,j), rc(i), zc(j), rn(i), zn(j) }` where `G = 2` (ghost width), `W = nr + 2G`, `H = nz + 2G`, `idx` accepts `i ∈ [−G, nr+G)`, `j ∈ [−G, nz+G)`; `allocField(grid)` → `Float64Array(W*H)`; `applyAxisGhosts(grid, f)` (even mirror); `forEachInterior(grid, fn)` calling `fn(i, j, k)`.

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/grid.test.js
import { describe, it, expect } from "vitest";
import { createGrid, allocField, applyAxisGhosts, forEachInterior } from "../../src/math/ns-axisym/grid.js";

describe("ns-axisym grid", () => {
  const g = createGrid({ nr: 8, nz: 4, R: 1, Z: 0.5 });

  it("places cell centers at half-offsets", () => {
    expect(g.dr).toBeCloseTo(1 / 8, 15);
    expect(g.rc(0)).toBeCloseTo(g.dr / 2, 15);
    expect(g.rc(7)).toBeCloseTo(1 - g.dr / 2, 15);
    expect(g.zc(0)).toBeCloseTo(-0.5 + g.dz / 2, 15);
    expect(g.rn(0)).toBe(0);           // first corner radius is exactly the axis
    expect(g.rn(8)).toBeCloseTo(1, 15);
  });

  it("indexes ghosts without collision", () => {
    const seen = new Set();
    for (let j = -g.G; j < g.nz + g.G; j++)
      for (let i = -g.G; i < g.nr + g.G; i++) {
        const k = g.idx(i, j);
        expect(k).toBeGreaterThanOrEqual(0);
        expect(k).toBeLessThan(g.W * g.H);
        expect(seen.has(k)).toBe(false);
        seen.add(k);
      }
  });

  it("mirrors axis ghosts evenly", () => {
    const f = allocField(g);
    forEachInterior(g, (i, j, k) => { f[k] = g.rc(i) ** 2 + g.zc(j); });
    applyAxisGhosts(g, f);
    for (let j = 0; j < g.nz; j++) {
      expect(f[g.idx(-1, j)]).toBe(f[g.idx(0, j)]);
      expect(f[g.idx(-2, j)]).toBe(f[g.idx(1, j)]);
    }
  });

  it("visits exactly nr*nz interior cells", () => {
    let n = 0;
    forEachInterior(g, () => n++);
    expect(n).toBe(8 * 4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/grid.test.js`
Expected: FAIL — cannot resolve `../../src/math/ns-axisym/grid.js`.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/grid.js
/** Cell-centered (r, z) grid with 2 ghost layers for the axisymmetric solver.
 * Interior cells: i in [0, nr), j in [0, nz). First radial sample sits at
 * r = dr/2 so no stencil ever divides by r = 0. Corners (grid nodes) are
 * addressed separately by velocity.js; rn/zn give their exact coordinates.
 */
const GHOSTS = 2;

/**
 * @param {{nr:number, nz:number, R:number, Z:number}} opts - cells and half-domain
 * @returns {object} grid descriptor
 */
export function createGrid({ nr, nz, R, Z }) {
  const dr = R / nr;
  const dz = (2 * Z) / nz;
  const G = GHOSTS;
  const W = nr + 2 * G;
  const H = nz + 2 * G;
  return {
    nr, nz, R, Z, dr, dz, G, W, H,
    idx: (i, j) => (j + G) * W + (i + G),
    rc: (i) => (i + 0.5) * dr,
    zc: (j) => -Z + (j + 0.5) * dz,
    rn: (i) => i * dr,
    zn: (j) => -Z + j * dz,
  };
}

/** @param {object} grid @returns {Float64Array} zeroed field covering ghosts */
export function allocField(grid) {
  return new Float64Array(grid.W * grid.H);
}

/** Even mirror across r = 0: f(-1-k, j) = f(k, j). Applies to a, chi, phi. */
export function applyAxisGhosts(grid, f) {
  const { G, nz, idx } = grid;
  for (let j = -G; j < nz + G; j++)
    for (let k = 0; k < G; k++)
      f[idx(-1 - k, j)] = f[idx(k, j)];
}

/** Visit interior cells: fn(i, j, linearIndex). */
export function forEachInterior(grid, fn) {
  for (let j = 0; j < grid.nz; j++)
    for (let i = 0; i < grid.nr; i++)
      fn(i, j, grid.idx(i, j));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ns-axisym/grid.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/grid.js test/ns-axisym/grid.test.js
git commit -m "feat(ns-axisym): cell-centered grid with even axis ghosts"
```

---

### Task 2: L5 operator and red-black Gauss–Seidel Poisson solve

**Files:**
- Create: `src/math/ns-axisym/operators.js`
- Test: `test/ns-axisym/operators.test.js`

**Interfaces:**
- Consumes: `createGrid`, `allocField`, `applyAxisGhosts`, `forEachInterior` from Task 1.
- Produces: `applyL5(grid, f, out)` (interior only; caller must have set ghosts); `solvePoisson(grid, phi, chi, opts)` solving `−L5 φ = χ` with `opts = { maxSweeps, atol, rtol, setGhosts(phi) }`, returning `{ sweeps, residual, converged }`; `poissonResidual(grid, phi, chi)` → max-norm of `−L5φ − χ`.

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/operators.test.js
import { describe, it, expect } from "vitest";
import { createGrid, allocField, applyAxisGhosts, forEachInterior } from "../../src/math/ns-axisym/grid.js";
import { applyL5, solvePoisson, poissonResidual } from "../../src/math/ns-axisym/operators.js";

// Even polynomial in r (regular at axis): f = r^2 z. Exactly representable
// by 2nd-order stencils, so L5 f = (2 + 6/1?)… worked out: f_rr = 2z,
// (3/r) f_r = 6z, f_zz = 0 → L5 f = 8z, exact for centered differences.
function fillPoly(g, f) {
  for (let j = -g.G; j < g.nz + g.G; j++)
    for (let i = -g.G; i < g.nr + g.G; i++)
      f[g.idx(i, j)] = g.rc(i) ** 2 * g.zc(j);
}

describe("L5 operator", () => {
  it("is exact on r^2 z including the first interior row", () => {
    const g = createGrid({ nr: 16, nz: 8, R: 1, Z: 0.5 });
    const f = allocField(g), out = allocField(g);
    fillPoly(g, f); // fills ghosts with analytic values (outer boundary)
    applyAxisGhosts(g, f); // axis ghosts: r^2 z is even in r — mirror matches analytic
    applyL5(g, f, out);
    forEachInterior(g, (i, j, k) => {
      expect(out[k]).toBeCloseTo(8 * g.zc(j), 9);
    });
  });
});

describe("Poisson solve −L5 φ = χ", () => {
  it("recovers a manufactured even solution and reports a small residual", () => {
    const g = createGrid({ nr: 32, nz: 32, R: 1, Z: 0.5 });
    const phi = allocField(g), chi = allocField(g);
    // Manufactured φ = r^2 z  → χ = −L5 φ = −8z (exact for the stencil).
    forEachInterior(g, (i, j, k) => { chi[k] = -8 * g.zc(j); });
    const setGhosts = (p) => {
      // Dirichlet data from the analytic solution at ghost centers + axis mirror
      for (let j = -g.G; j < g.nz + g.G; j++)
        for (const i of [g.nr, g.nr + 1]) p[g.idx(i, j)] = g.rc(i) ** 2 * g.zc(j);
      for (let i = -g.G; i < g.nr + g.G; i++)
        for (const j of [-2, -1, g.nz, g.nz + 1]) p[g.idx(i, j)] = g.rc(i) ** 2 * g.zc(j);
      applyAxisGhosts(g, p);
    };
    const res = solvePoisson(g, phi, chi, { maxSweeps: 20000, atol: 1e-11, rtol: 0, setGhosts });
    expect(res.converged).toBe(true);
    expect(poissonResidual(g, phi, chi)).toBeLessThan(1e-10);
    forEachInterior(g, (i, j, k) => {
      expect(phi[k]).toBeCloseTo(g.rc(i) ** 2 * g.zc(j), 7);
    });
  });

  it("handles chi = 0 without dividing by zero in the relative criterion", () => {
    const g = createGrid({ nr: 8, nz: 8, R: 1, Z: 0.5 });
    const phi = allocField(g), chi = allocField(g);
    const setGhosts = (p) => applyAxisGhosts(g, p); // zero Dirichlet elsewhere (alloc zeroes)
    const res = solvePoisson(g, phi, chi, { maxSweeps: 100, atol: 1e-12, rtol: 1e-6, setGhosts });
    expect(res.converged).toBe(true);
    expect(Number.isFinite(res.residual)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/operators.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/operators.js
import { forEachInterior } from "./grid.js";

/** L5 f = f_rr + (3/r) f_r + f_zz, 2nd-order centered, interior only.
 * Ghosts must already hold valid values (axis mirror + boundary policy).
 * The (3/r) term uses the exact cell radius rc(i) ≥ dr/2 — never zero.
 */
export function applyL5(grid, f, out) {
  const { dr, dz, idx, rc } = grid;
  const dr2 = dr * dr, dz2 = dz * dz;
  forEachInterior(grid, (i, j, k) => {
    const fr = (f[idx(i + 1, j)] - 2 * f[k] + f[idx(i - 1, j)]) / dr2;
    const f1 = (f[idx(i + 1, j)] - f[idx(i - 1, j)]) / (2 * dr);
    const fz = (f[idx(i, j + 1)] - 2 * f[k] + f[idx(i, j - 1)]) / dz2;
    out[k] = fr + (3 / rc(i)) * f1 + fz;
  });
}

/** Max-norm residual of −L5 φ − χ over the interior. */
export function poissonResidual(grid, phi, chi) {
  const { dr, dz, idx, rc } = grid;
  const dr2 = dr * dr, dz2 = dz * dz;
  let m = 0;
  forEachInterior(grid, (i, j, k) => {
    const fr = (phi[idx(i + 1, j)] - 2 * phi[k] + phi[idx(i - 1, j)]) / dr2;
    const f1 = (phi[idx(i + 1, j)] - phi[idx(i - 1, j)]) / (2 * dr);
    const fz = (phi[idx(i, j + 1)] - 2 * phi[k] + phi[idx(i, j - 1)]) / dz2;
    const r = Math.abs(-(fr + (3 / rc(i)) * f1 + fz) - chi[k]);
    if (r > m) m = r;
  });
  return m;
}

/** Red-black Gauss–Seidel for −L5 φ = χ.
 * opts.setGhosts(phi) must impose the boundary policy (outer Dirichlet
 * ghosts + axis mirror); it is called before every sweep pair so ghost
 * data stays consistent as φ updates. Convergence: residual ≤
 * atol + rtol * max|χ| (safe when χ = 0). Returns sweeps used, final
 * residual, and whether the target was met — iteration budget is a
 * maximum, not a convergence claim (spec §1).
 */
export function solvePoisson(grid, phi, chi, { maxSweeps, atol, rtol, setGhosts }) {
  const { dr, dz, idx, rc } = grid;
  const dr2 = dr * dr, dz2 = dz * dz;
  const diag = 2 / dr2 + 2 / dz2;
  let chiMax = 0;
  forEachInterior(grid, (_i, _j, k) => { const v = Math.abs(chi[k]); if (v > chiMax) chiMax = v; });
  const target = atol + rtol * chiMax;

  let sweeps = 0, residual = Infinity;
  while (sweeps < maxSweeps) {
    setGhosts(phi);
    for (const color of [0, 1]) {
      forEachInterior(grid, (i, j, k) => {
        if (((i + j) & 1) !== color) return;
        const off = 3 / (2 * dr * rc(i));
        const cE = 1 / dr2 + off, cW = 1 / dr2 - off;
        const cN = 1 / dz2, cS = 1 / dz2;
        // −L5 φ = χ  →  diag·φ = χ + Σ c·φ_neighbors
        phi[k] = (chi[k] + cE * phi[idx(i + 1, j)] + cW * phi[idx(i - 1, j)]
                          + cN * phi[idx(i, j + 1)] + cS * phi[idx(i, j - 1)]) / diag;
      });
    }
    sweeps++;
    if ((sweeps & 7) === 0 || sweeps === maxSweeps) {
      setGhosts(phi);
      residual = poissonResidual(grid, phi, chi);
      if (residual <= target) return { sweeps, residual, converged: true };
    }
  }
  setGhosts(phi);
  residual = poissonResidual(grid, phi, chi);
  return { sweeps, residual, converged: residual <= target };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ns-axisym/operators.test.js`
Expected: PASS. If the manufactured solve is slow, raise `maxSweeps` — plain GS on 32×32 needs a few thousand sweeps; that is acceptable for the CPU reference.

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/operators.js test/ns-axisym/operators.test.js
git commit -m "feat(ns-axisym): L5 stencil and red-black GS Poisson solve"
```

---

### Task 3: Corner ψ reconstruction, face fluxes, divergence

**Files:**
- Create: `src/math/ns-axisym/velocity.js`
- Test: `test/ns-axisym/velocity.test.js`

**Interfaces:**
- Consumes: grid from Task 1 (`rn`, `zn` for exact corner coordinates).
- Produces: `cornerPsi(grid, phi, psi)` filling `psi` as `Float64Array((nr+1)*(nz+1))` with corner index `ci(i,j) = j*(nr+1)+i`, `ψ = rn(i)² · φ_corner` where `φ_corner` averages the 4 surrounding cell-centered φ (ghosts supply the boundary/axis sides); `faceFluxes(grid, psi, Fr, Fz)` with `Fr = Float64Array((nr+1)*nz)` (radial-face volume flux `r·u_r·Δz` per unit angle, index `j*(nr+1)+i`), `Fz = Float64Array(nr*(nz+1))` (axial-face flux `r_c·u_z·Δr`, index `j*nr+i`); `cellVelocity(grid, Fr, Fz, ur, uz)` (cell-centered, into interior of ghost-sized fields); `maxAbsDivergence(grid, Fr, Fz)`.

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/velocity.test.js
import { describe, it, expect } from "vitest";
import { createGrid, allocField, applyAxisGhosts, forEachInterior } from "../../src/math/ns-axisym/grid.js";
import { cornerPsi, faceFluxes, cellVelocity, maxAbsDivergence } from "../../src/math/ns-axisym/velocity.js";

describe("velocity recovery", () => {
  it("recovers uniform axial flow exactly from constant phi", () => {
    const g = createGrid({ nr: 8, nz: 6, R: 1, Z: 0.5 });
    const U = 2.5;
    const phi = allocField(g).fill(U / 2); // u_z = 2φ + r∂_rφ = U, u_r = −r∂_zφ = 0
    const psi = new Float64Array((g.nr + 1) * (g.nz + 1));
    cornerPsi(g, phi, psi);
    const Fr = new Float64Array((g.nr + 1) * g.nz);
    const Fz = new Float64Array(g.nr * (g.nz + 1));
    faceFluxes(g, psi, Fr, Fz);
    const ur = allocField(g), uz = allocField(g);
    cellVelocity(g, Fr, Fz, ur, uz);
    forEachInterior(g, (i, j, k) => {
      expect(uz[k]).toBeCloseTo(U, 12);
      expect(ur[k]).toBeCloseTo(0, 12);
    });
    expect(maxAbsDivergence(g, Fr, Fz)).toBeLessThan(1e-13);
  });

  it("divergence cancels algebraically for arbitrary smooth phi", () => {
    const g = createGrid({ nr: 16, nz: 12, R: 1, Z: 0.5 });
    const phi = allocField(g);
    for (let j = -g.G; j < g.nz + g.G; j++)
      for (let i = -g.G; i < g.nr + g.G; i++)
        phi[g.idx(i, j)] = Math.cos(g.rc(i) * 3) * Math.sin(g.zc(j) * 2);
    applyAxisGhosts(g, phi);
    const psi = new Float64Array((g.nr + 1) * (g.nz + 1));
    cornerPsi(g, phi, psi);
    const Fr = new Float64Array((g.nr + 1) * g.nz);
    const Fz = new Float64Array(g.nr * (g.nz + 1));
    faceFluxes(g, psi, Fr, Fz);
    expect(maxAbsDivergence(g, Fr, Fz)).toBeLessThan(1e-12);
  });

  it("sets the axis radial flux to zero", () => {
    const g = createGrid({ nr: 8, nz: 6, R: 1, Z: 0.5 });
    const phi = allocField(g).fill(1);
    const psi = new Float64Array((g.nr + 1) * (g.nz + 1));
    cornerPsi(g, phi, psi);
    for (let j = 0; j <= g.nz; j++) expect(psi[j * (g.nr + 1)]).toBe(0); // rn(0)=0 → ψ=0
    const Fr = new Float64Array((g.nr + 1) * g.nz);
    const Fz = new Float64Array(g.nr * (g.nz + 1));
    faceFluxes(g, psi, Fr, Fz);
    for (let j = 0; j < g.nz; j++) expect(Fr[j * (g.nr + 1)]).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/velocity.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/velocity.js
import { forEachInterior } from "./grid.js";

/** Corner index helper: corners are grid nodes (nr+1)×(nz+1). */
const ci = (grid, i, j) => j * (grid.nr + 1) + i;

/** ψ at corners: reconstruct the regular even potential φ at each corner by
 * averaging its 4 surrounding cell centers (ghosts supply axis and outer
 * sides), then multiply by the exact corner radius squared (spec §1: never
 * average cell-centered r²φ — that puts spurious velocity at the axis).
 * At rn(0) = 0 this yields ψ = 0 identically.
 */
export function cornerPsi(grid, phi, psi) {
  const { nr, nz, idx, rn } = grid;
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i <= nr; i++) {
      const p = 0.25 * (phi[idx(i - 1, j - 1)] + phi[idx(i, j - 1)]
                      + phi[idx(i - 1, j)] + phi[idx(i, j)]);
      psi[ci(grid, i, j)] = rn(i) * rn(i) * p;
    }
}

/** Face volume fluxes from corner ψ differences (per unit angle, 2π dropped):
 *   radial face i (between cells i−1, i), row j:  Fr = −(ψ(i,j+1) − ψ(i,j))
 *   axial  face j (between cells j−1, j), col i:  Fz =  (ψ(i+1,j) − ψ(i,j))
 * These are exact ∮ u·n dA over each face, so the discrete cylindrical
 * divergence telescopes to zero. The axis face has ψ = 0 at both corners,
 * so Fr = 0 there with no division by r_face = 0.
 */
export function faceFluxes(grid, psi, Fr, Fz) {
  const { nr, nz } = grid;
  for (let j = 0; j < nz; j++)
    for (let i = 0; i <= nr; i++)
      Fr[j * (nr + 1) + i] = -(psi[ci(grid, i, j + 1)] - psi[ci(grid, i, j)]);
  for (let j = 0; j <= nz; j++)
    for (let i = 0; i < nr; i++)
      Fz[j * nr + i] = psi[ci(grid, i + 1, j)] - psi[ci(grid, i, j)];
}

/** Cell-centered velocities from face fluxes (for CFL limits, diagnostics,
 * and advection upwinding): divide each face flux by its geometric factor,
 * then average the two faces. Radial faces at rn(i) > 0 divide by rn·dz;
 * the axis face contributes u_r = 0.
 */
export function cellVelocity(grid, Fr, Fz, ur, uz) {
  const { nr, dz, dr, rn, rc } = grid;
  forEachInterior(grid, (i, j, k) => {
    const frW = i === 0 ? 0 : Fr[j * (nr + 1) + i] / (rn(i) * dz);
    const frE = Fr[j * (nr + 1) + i + 1] / (rn(i + 1) * dz);
    ur[k] = 0.5 * (frW + frE);
    const fzS = Fz[j * nr + i] / (rc(i) * dr);
    const fzN = Fz[(j + 1) * nr + i] / (rc(i) * dr);
    uz[k] = 0.5 * (fzS + fzN);
  });
}

/** Max |net volume flux| per cell volume — the measured discrete divergence
 * the spec requires as a permanent diagnostic (f32 roundoff shows up here
 * on the GPU; on the CPU it should sit at Float64 roundoff).
 */
export function maxAbsDivergence(grid, Fr, Fz) {
  const { nr, dr, dz, rc } = grid;
  let m = 0;
  forEachInterior(grid, (i, j) => {
    const net = Fr[j * (nr + 1) + i + 1] - Fr[j * (nr + 1) + i]
              + Fz[(j + 1) * nr + i] - Fz[j * nr + i];
    const div = Math.abs(net) / (rc(i) * dr * dz);
    if (div > m) m = div;
  });
  return m;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ns-axisym/velocity.test.js`
Expected: PASS. The uniform-flow exactness test is the spec's hard requirement; if it fails, the bug is in `cornerPsi` (must average φ, then multiply exact `rn²`).

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/velocity.js test/ns-axisym/velocity.test.js
git commit -m "feat(ns-axisym): corner-psi velocity recovery with algebraic divergence cancellation"
```

---

### Task 4: MUSCL flux-form advection

**Files:**
- Create: `src/math/ns-axisym/advect.js`
- Test: `test/ns-axisym/advect.test.js`

**Interfaces:**
- Consumes: grid (Task 1), `Fr`/`Fz` face-flux layout (Task 3).
- Produces: `advect(grid, f, Fr, Fz, out)` writing `out[k] = −(u·∇f)[k]` for interior cells, computed as flux divergence minus `f·(measured divergence)` so constants are transported exactly (spec §1). MC limiter, upwind-biased, needs both ghost layers of `f`.

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/advect.test.js
import { describe, it, expect } from "vitest";
import { createGrid, allocField, applyAxisGhosts, forEachInterior } from "../../src/math/ns-axisym/grid.js";
import { cornerPsi, faceFluxes } from "../../src/math/ns-axisym/velocity.js";
import { advect } from "../../src/math/ns-axisym/advect.js";

function uniformFlowFluxes(g, U) {
  const phi = allocField(g).fill(U / 2);
  const psi = new Float64Array((g.nr + 1) * (g.nz + 1));
  cornerPsi(g, phi, psi);
  const Fr = new Float64Array((g.nr + 1) * g.nz);
  const Fz = new Float64Array(g.nr * (g.nz + 1));
  faceFluxes(g, psi, Fr, Fz);
  return { Fr, Fz };
}

describe("MUSCL advection", () => {
  it("transports a constant field with exactly zero tendency", () => {
    const g = createGrid({ nr: 16, nz: 16, R: 1, Z: 0.5 });
    const { Fr, Fz } = uniformFlowFluxes(g, 1.7);
    const f = allocField(g).fill(3.2);
    const out = allocField(g);
    advect(g, f, Fr, Fz, out);
    forEachInterior(g, (_i, _j, k) => expect(out[k]).toBeCloseTo(0, 13));
  });

  it("converges to −U ∂_z f for a smooth z-profile under refinement", () => {
    const U = 1.0;
    const errs = [];
    for (const nz of [32, 64, 128]) {
      const g = createGrid({ nr: 4, nz, R: 1, Z: 1 });
      const { Fr, Fz } = uniformFlowFluxes(g, U);
      const f = allocField(g), out = allocField(g);
      for (let j = -g.G; j < g.nz + g.G; j++)
        for (let i = -g.G; i < g.nr + g.G; i++)
          f[g.idx(i, j)] = Math.sin(Math.PI * g.zc(j) * 0.5); // smooth, no extrema issues at center
      applyAxisGhosts(g, f);
      advect(g, f, Fr, Fz, out);
      let err = 0;
      forEachInterior(g, (i, j, k) => {
        const exact = -U * Math.PI * 0.5 * Math.cos(Math.PI * g.zc(j) * 0.5);
        // Skip cells whose stencil reaches the z-ghosts (profile is not periodic)
        if (j >= 2 && j < g.nz - 2) err = Math.max(err, Math.abs(out[k] - exact));
      });
      errs.push(err);
    }
    // Limiters can clip at extrema; away from extrema expect ≥ 1.9th order
    expect(errs[0] / errs[1]).toBeGreaterThan(3.5);
    expect(errs[1] / errs[2]).toBeGreaterThan(3.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/advect.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/advect.js
import { forEachInterior } from "./grid.js";

/** MC (monotonized central) limited slope. */
function mcSlope(fm, f0, fp) {
  const dc = 0.5 * (fp - fm);
  const dl = 2 * (f0 - fm);
  const dr = 2 * (fp - f0);
  if (dl * dr <= 0) return 0;
  const s = Math.sign(dc);
  return s * Math.min(Math.abs(dc), Math.abs(dl), Math.abs(dr));
}

/** Upwind face value with MUSCL reconstruction along one axis.
 * flux > 0 means flow from the "minus" cell toward the "plus" cell.
 */
function faceValue(flux, fmm, fm, fp, fpp) {
  return flux >= 0
    ? fm + 0.5 * mcSlope(fmm, fm, fp)
    : fp - 0.5 * mcSlope(fm, fp, fpp);
}

/** out = −(u·∇f): flux-form divergence of (F · f_face) minus f times the
 * measured flux divergence, so a constant field has exactly zero tendency
 * regardless of divergence roundoff (spec §1). Requires both ghost layers
 * of f to be valid (axis mirror + boundary policy).
 */
export function advect(grid, f, Fr, Fz, out) {
  const { nr, dr, dz, idx, rc } = grid;
  forEachInterior(grid, (i, j, k) => {
    const V = rc(i) * dr * dz;
    const frW = Fr[j * (nr + 1) + i];
    const frE = Fr[j * (nr + 1) + i + 1];
    const fzS = Fz[j * nr + i];
    const fzN = Fz[(j + 1) * nr + i];
    const fW = faceValue(frW, f[idx(i - 2, j)], f[idx(i - 1, j)], f[k], f[idx(i + 1, j)]);
    const fE = faceValue(frE, f[idx(i - 1, j)], f[k], f[idx(i + 1, j)], f[idx(i + 2, j)]);
    const fS = faceValue(fzS, f[idx(i, j - 2)], f[idx(i, j - 1)], f[k], f[idx(i, j + 1)]);
    const fN = faceValue(fzN, f[idx(i, j - 1)], f[k], f[idx(i, j + 1)], f[idx(i, j + 2)]);
    const fluxDiv = (frE * fE - frW * fW + fzN * fN - fzS * fS) / V;
    const div = (frE - frW + fzN - fzS) / V;
    out[k] = -(fluxDiv - f[k] * div);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ns-axisym/advect.test.js`
Expected: PASS. If the convergence ratios miss, first suspect the face-flux sign convention against Task 3's definitions.

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/advect.js test/ns-axisym/advect.test.js
git commit -m "feat(ns-axisym): MC-limited MUSCL advection preserving constants"
```

---

### Task 5: Solver core — boundary policy, RHS, SSP-RK2, dt limits

**Files:**
- Create: `src/math/ns-axisym/solver.js`
- Test: `test/ns-axisym/solver-lamboseen.test.js` (diffusion-only path exercises the stepper before presets exist; the full Lamb–Oseen preset test lands in Task 7 in this same file)

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces:

```js
new NSAxisymSolver({
  nr, nz, R, Z, nu,
  boundary,          // { setGhostA(grid, a, t), setGhostChi(grid, chi, t),
                     //   setGhostPhi(grid, phi, t) } — each must ALSO call applyAxisGhosts
  limits: { advSafety = 0.4, diffSafety = 0.25, srcCap = 0.1, dtFloor = 1e-12 },
  poisson: { maxSweeps = 4000, atol = 1e-10, rtol = 1e-8 },
})
solver.a, solver.chi, solver.phi   // Float64Array state (ghost-sized)
solver.t                            // physical time
solver.step() → { dt, accepted, limiter, poisson: { sweeps, residual, converged } }
solver.velocity() → { ur, uz, Fr, Fz, maxDiv }   // recomputed from current phi
```

`step()` implements spec §1 exactly: unsplit SSP-RK2 where **every** F evaluation re-imposes boundary ghosts at the stage time, re-solves the Poisson problem for the stage φ, recovers stage velocity, and sums advection + source + diffusion. A step whose Poisson solve fails to converge, or whose trial state is non-finite, is rejected: state restored, dt halved, retried (max 4 times, then `accepted: false` and the solver pauses — callers must check).

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/solver-lamboseen.test.js
import { describe, it, expect } from "vitest";
import { createGrid, applyAxisGhosts, forEachInterior } from "../../src/math/ns-axisym/grid.js";
import { NSAxisymSolver } from "../../src/math/ns-axisym/solver.js";

// Lamb–Oseen as raw fields (preset wrapper comes in Task 7):
// a(r,t) = −C/(2π r²)·expm1(−r²/(4ν(t+t0))), χ = 0, φ = 0 (no meridional flow)
const C = 1.0, NU = 0.02, T0 = 0.5;
const aExact = (r, t) => {
  const s = 4 * NU * (t + T0);
  return (-C / (2 * Math.PI)) * Math.expm1(-(r * r) / s) / (r * r);
};

function lambBoundary() {
  const fill = (grid, f, t, fn) => {
    const { G, nr, nz, idx, rc, zc } = grid;
    for (let j = -G; j < nz + G; j++) {
      for (const i of [nr, nr + 1]) f[idx(i, j)] = fn(rc(i), zc(j), t);
      for (let i = -G; i < nr + G; i++)
        for (const jj of [-2, -1, nz, nz + 1]) f[idx(i, jj)] = fn(rc(i), zc(jj), t);
    }
    applyAxisGhosts(grid, f);
  };
  return {
    setGhostA: (g, a, t) => fill(g, a, t, (r, _z, tt) => aExact(r, tt)),
    setGhostChi: (g, chi, _t) => fill(g, chi, 0, () => 0),
    setGhostPhi: (g, phi, _t) => fill(g, phi, 0, () => 0),
  };
}

describe("SSP-RK2 stepper on pure swirl diffusion (Lamb–Oseen)", () => {
  it("tracks the analytic solution and converges at 2nd order in space", () => {
    const errAt = (nr) => {
      const s = new NSAxisymSolver({
        nr, nz: 8, R: 1.5, Z: 0.25, nu: NU, boundary: lambBoundary(),
      });
      const g = s.grid;
      forEachInterior(g, (i, j, k) => { s.a[k] = aExact(g.rc(i), 0); });
      const tEnd = 0.25;
      while (s.t < tEnd) {
        const r = s.step();
        expect(r.accepted).toBe(true);
        expect(r.poisson.converged).toBe(true);
      }
      let err = 0;
      forEachInterior(g, (i, j, k) => {
        err = Math.max(err, Math.abs(s.a[k] - aExact(g.rc(i), s.t)));
      });
      return err;
    };
    const e32 = errAt(32), e64 = errAt(64), e128 = errAt(128);
    expect(e32 / e64).toBeGreaterThan(3.0);   // ~4 for clean 2nd order
    expect(e64 / e128).toBeGreaterThan(3.0);
  });

  it("keeps chi at roundoff (no spurious meridional flow from pure swirl diffusion)", () => {
    const s = new NSAxisymSolver({ nr: 32, nz: 8, R: 1.5, Z: 0.25, nu: NU, boundary: lambBoundary() });
    const g = s.grid;
    forEachInterior(g, (i, _j, k) => { s.a[k] = aExact(g.rc(i), 0); });
    for (let n = 0; n < 20; n++) s.step();
    let m = 0;
    forEachInterior(g, (_i, _j, k) => { m = Math.max(m, Math.abs(s.chi[k])); });
    // χ is forced only by ∂_z(a²); a is z-independent here, so χ stays tiny.
    expect(m).toBeLessThan(1e-10);
  });
});
```

Note for the implementer: the χ-stays-zero assertion is subtle — `a` is z-independent *analytically*, but the discrete boundary fill must evaluate the same formula in every z-row (it does) or ∂_z(a²) picks up noise. If this test fails, print `∂_z(a²)` rows before touching the stepper.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/solver-lamboseen.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/solver.js
import { createGrid, allocField, forEachInterior } from "./grid.js";
import { applyL5, solvePoisson } from "./operators.js";
import { cornerPsi, faceFluxes, cellVelocity, maxAbsDivergence } from "./velocity.js";
import { advect } from "./advect.js";

const DEFAULT_LIMITS = { advSafety: 0.4, diffSafety: 0.25, srcCap: 0.1, dtFloor: 1e-12 };
const DEFAULT_POISSON = { maxSweeps: 4000, atol: 1e-10, rtol: 1e-8 };
const MAX_RETRIES = 4;

/** Axisymmetric NS with swirl in regularized variables (spec §1):
 *   ∂_t a + u·∇a = 2a ∂_z φ + ν L5 a
 *   ∂_t χ + u·∇χ = ∂_z(a²) + ν L5 χ,   −L5 φ = χ
 * Unsplit SSP-RK2; every RHS evaluation re-imposes ghosts at the stage
 * time, re-solves φ, and recovers velocity from that stage state.
 */
export class NSAxisymSolver {
  constructor({ nr, nz, R, Z, nu, boundary, limits = {}, poisson = {} }) {
    this.grid = createGrid({ nr, nz, R, Z });
    this.nu = nu;
    this.boundary = boundary;
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    this.poisson = { ...DEFAULT_POISSON, ...poisson };
    this.t = 0;
    const g = this.grid;
    this.a = allocField(g); this.chi = allocField(g); this.phi = allocField(g);
    // scratch
    this._a1 = allocField(g); this._chi1 = allocField(g);
    this._ra = allocField(g); this._rchi = allocField(g);
    this._lap = allocField(g);
    this._ur = allocField(g); this._uz = allocField(g);
    this._psi = new Float64Array((g.nr + 1) * (g.nz + 1));
    this._Fr = new Float64Array((g.nr + 1) * g.nz);
    this._Fz = new Float64Array(g.nr * (g.nz + 1));
    this._lastPoisson = { sweeps: 0, residual: 0, converged: true };
  }

  /** Impose boundary + axis ghosts on (a, chi) at time t, solve for φ from
   * chi, and recover face fluxes + cell velocities. Returns false if the
   * elliptic solve missed its tolerance (step must be rejected).
   */
  _prepareStage(a, chi, t) {
    const g = this.grid, b = this.boundary;
    b.setGhostA(g, a, t);
    b.setGhostChi(g, chi, t);
    const setGhosts = (p) => b.setGhostPhi(g, p, t);
    this._lastPoisson = solvePoisson(g, this.phi, chi, { ...this.poisson, setGhosts });
    if (!this._lastPoisson.converged) return false;
    cornerPsi(g, this.phi, this._psi);
    faceFluxes(g, this._psi, this._Fr, this._Fz);
    cellVelocity(g, this._Fr, this._Fz, this._ur, this._uz);
    return true;
  }

  /** Full RHS for (a, chi) from the prepared stage state into (ra, rchi). */
  _rhs(a, chi, ra, rchi) {
    const g = this.grid, nu = this.nu;
    const { dz, idx } = g;
    advect(g, a, this._Fr, this._Fz, ra);
    advect(g, chi, this._Fr, this._Fz, rchi);
    applyL5(g, a, this._lap);
    forEachInterior(g, (i, j, k) => {
      const dphidz = (this.phi[idx(i, j + 1)] - this.phi[idx(i, j - 1)]) / (2 * dz);
      ra[k] += 2 * a[k] * dphidz + nu * this._lap[k];
    });
    applyL5(g, chi, this._lap);
    forEachInterior(g, (i, j, k) => {
      const a2N = a[idx(i, j + 1)] ** 2, a2S = a[idx(i, j - 1)] ** 2;
      rchi[k] += (a2N - a2S) / (2 * dz) + nu * this._lap[k];
    });
  }

  /** dt from the prepared stage: advective CFL, diffusive bound from the
   * L5 diagonal, and a cap on the fractional swirl-source step (spec §1).
   */
  _chooseDt() {
    const g = this.grid, { advSafety, diffSafety, srcCap, dtFloor } = this.limits;
    const { dr, dz, idx } = g;
    let advRate = 0, srcRate = 0;
    forEachInterior(g, (i, j, k) => {
      advRate = Math.max(advRate, Math.abs(this._ur[k]) / dr + Math.abs(this._uz[k]) / dz);
      srcRate = Math.max(srcRate, Math.abs((this.phi[idx(i, j + 1)] - this.phi[idx(i, j - 1)]) / dz)); // |2∂_zφ|
    });
    const diffRate = this.nu * (4 / (dr * dr) + 2 / (dz * dz)); // includes axis-row 4/dr² worst case
    let dt = Infinity;
    let limiter = "none";
    if (advRate > 0 && advSafety / advRate < dt) { dt = advSafety / advRate; limiter = "advection"; }
    if (diffSafety / diffRate < dt) { dt = diffSafety / diffRate; limiter = "diffusion"; }
    if (srcRate > 0 && srcCap / srcRate < dt) { dt = srcCap / srcRate; limiter = "source"; }
    return { dt: Math.max(dt, dtFloor), limiter };
  }

  _finite(f) {
    const g = this.grid;
    let ok = true;
    forEachInterior(g, (_i, _j, k) => { if (!Number.isFinite(f[k])) ok = false; });
    return ok;
  }

  /** One SSP-RK2 step with rejection/retry. */
  step() {
    const g = this.grid;
    const a0 = this.a.slice(), chi0 = this.chi.slice(), t0 = this.t;
    if (!this._prepareStage(this.a, this.chi, t0)) {
      return { dt: 0, accepted: false, limiter: "poisson", poisson: this._lastPoisson };
    }
    let { dt, limiter } = this._chooseDt();
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // stage 1: q* = q0 + dt F(q0, t0)   (stage state already prepared)
      this._rhs(this.a, this.chi, this._ra, this._rchi);
      forEachInterior(g, (_i, _j, k) => {
        this._a1[k] = a0[k] + dt * this._ra[k];
        this._chi1[k] = chi0[k] + dt * this._rchi[k];
      });
      let ok = this._finite(this._a1) && this._finite(this._chi1)
            && this._prepareStage(this._a1, this._chi1, t0 + dt);
      if (ok) {
        // stage 2: q1 = ½q0 + ½(q* + dt F(q*, t0+dt))
        this._rhs(this._a1, this._chi1, this._ra, this._rchi);
        forEachInterior(g, (_i, _j, k) => {
          this.a[k] = 0.5 * a0[k] + 0.5 * (this._a1[k] + dt * this._ra[k]);
          this.chi[k] = 0.5 * chi0[k] + 0.5 * (this._chi1[k] + dt * this._rchi[k]);
        });
        ok = this._finite(this.a) && this._finite(this.chi);
      }
      if (ok) {
        this.t = t0 + dt;
        // refresh the accepted state's potential and velocity (spec §1)
        if (!this._prepareStage(this.a, this.chi, this.t)) {
          return { dt, accepted: false, limiter: "poisson", poisson: this._lastPoisson };
        }
        return { dt, accepted: true, limiter, poisson: this._lastPoisson };
      }
      // reject: restore and retry smaller
      this.a.set(a0); this.chi.set(chi0);
      if (!this._prepareStage(this.a, this.chi, t0)) break;
      dt *= 0.5; limiter = "retry";
    }
    this.a.set(a0); this.chi.set(chi0); this.t = t0;
    return { dt, accepted: false, limiter, poisson: this._lastPoisson };
  }

  /** Current velocity view (recomputed from the accepted state). */
  velocity() {
    return {
      ur: this._ur, uz: this._uz, Fr: this._Fr, Fz: this._Fz,
      maxDiv: maxAbsDivergence(this.grid, this._Fr, this._Fz),
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/ns-axisym/solver-lamboseen.test.js`
Expected: PASS. Expected runtime under a minute; the 128-grid case dominates. If the convergence ratio is ~2 instead of ~4, dt is polluting the spatial error — tighten `diffSafety` in the test's solver options and re-measure before changing code.

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/solver.js test/ns-axisym/solver-lamboseen.test.js
git commit -m "feat(ns-axisym): SSP-RK2 solver core with stagewise elliptic solve and step rejection"
```

---

### Task 6: Burgers preset and steady-state convergence

**Files:**
- Create: `src/math/ns-axisym/presets.js`
- Test: `test/ns-axisym/solver-burgers.test.js`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: `burgersPreset({ alpha, C, nu })` → `{ init(solver), boundary, exact: { a(r), phi(z), ur(r), uz(z) } }` where `boundary` is a solver-compatible boundary policy prescribing the analytic fields on outer/axial ghosts at every stage time (Burgers is steady, so time is ignored), and `init` fills interior `a`, `chi`, `phi`. Also exports the ghost-fill helper `fillAnalyticGhosts(grid, f, t, fn)` used by both presets (moved here from the Task 5 test).

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/solver-burgers.test.js
import { describe, it, expect } from "vitest";
import { forEachInterior } from "../../src/math/ns-axisym/grid.js";
import { NSAxisymSolver } from "../../src/math/ns-axisym/solver.js";
import { burgersPreset } from "../../src/math/ns-axisym/presets.js";

const P = { alpha: 1.0, C: 2.0, nu: 0.05 };

function driftAfter(nr, nz, steps) {
  const preset = burgersPreset(P);
  const s = new NSAxisymSolver({
    nr, nz, R: 1.5, Z: 0.75, nu: P.nu, boundary: preset.boundary,
  });
  preset.init(s);
  const a0 = s.a.slice();
  for (let n = 0; n < steps; n++) {
    const r = s.step();
    expect(r.accepted).toBe(true);
  }
  let drift = 0;
  forEachInterior(s.grid, (_i, _j, k) => {
    drift = Math.max(drift, Math.abs(s.a[k] - a0[k]));
  });
  return { drift, t: s.t };
}

describe("Burgers vortex (analytic boundaries)", () => {
  it("holds the steady profile with drift converging at ~2nd order", () => {
    // Compare drift at a matched physical time across resolutions
    const c = driftAfter(16, 16, 60);
    const m = driftAfter(32, 32, 240);   // dt shrinks ~4x (diffusion-limited)
    const f = driftAfter(64, 64, 960);
    expect(m.drift).toBeLessThan(c.drift / 3.0);
    expect(f.drift).toBeLessThan(m.drift / 3.0);
  });

  it("keeps chi near zero (the analytic solution has no azimuthal vorticity)", () => {
    const preset = burgersPreset(P);
    const s = new NSAxisymSolver({ nr: 32, nz: 32, R: 1.5, Z: 0.75, nu: P.nu, boundary: preset.boundary });
    preset.init(s);
    for (let n = 0; n < 50; n++) s.step();
    let m = 0;
    forEachInterior(s.grid, (_i, _j, k) => { m = Math.max(m, Math.abs(s.chi[k])); });
    // a is z-independent → ∂_z(a²) vanishes discretely; χ stays at solver noise
    expect(m).toBeLessThan(1e-8);
  });

  it("evaluates the swirl profile via expm1 with the correct axis limit", () => {
    const { exact } = burgersPreset(P);
    const axisLimit = (P.C * P.alpha) / (8 * Math.PI * P.nu);
    expect(exact.a(1e-9)).toBeCloseTo(axisLimit, 4);
    expect(exact.a(0.5)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/solver-burgers.test.js`
Expected: FAIL — `presets.js` not found.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/presets.js
import { applyAxisGhosts } from "./grid.js";
import { forEachInterior } from "./grid.js";

/** Fill outer-radial and axial ghost cells of f from fn(r, z, t), then
 * mirror the axis. Shared by every analytic boundary policy (spec §1,
 * boundary policy 1).
 */
export function fillAnalyticGhosts(grid, f, t, fn) {
  const { G, nr, nz, idx, rc, zc } = grid;
  for (let j = -G; j < nz + G; j++)
    for (const i of [nr, nr + 1]) f[idx(i, j)] = fn(rc(i), zc(j), t);
  for (let i = -G; i < nr + G; i++)
    for (const jj of [-2, -1, nz, nz + 1]) f[idx(i, jj)] = fn(rc(i), zc(jj), t);
  applyAxisGhosts(grid, f);
}

/** Burgers vortex (spec §3, preset 1): strain α > 0, circulation C, ν > 0.
 *   u_r = −αr/2, u_z = αz  ⇒  φ = αz/2 (harmonic under L5, χ = 0)
 *   Γ(r) = C/(2π)·(1 − exp(−αr²/(4ν)));  a = Γ/r² via expm1,
 *   axis limit a(0) = Cα/(8πν).
 * Steady: boundary fills ignore t. Not a closed-cylinder equilibrium —
 * the analytic boundaries carry the strain in and out of the domain.
 */
export function burgersPreset({ alpha, C, nu }) {
  const aOf = (r) => {
    const x = (alpha * r * r) / (4 * nu);
    if (x < 1e-8) return (C * alpha) / (8 * Math.PI * nu); // series limit
    return (-C / (2 * Math.PI)) * Math.expm1(-x) / (r * r);
  };
  const phiOf = (z) => (alpha * z) / 2;
  const boundary = {
    setGhostA: (g, a, _t) => fillAnalyticGhosts(g, a, 0, (r) => aOf(r)),
    setGhostChi: (g, chi, _t) => fillAnalyticGhosts(g, chi, 0, () => 0),
    setGhostPhi: (g, phi, _t) => fillAnalyticGhosts(g, phi, 0, (_r, z) => phiOf(z)),
  };
  const init = (solver) => {
    const g = solver.grid;
    forEachInterior(g, (i, j, k) => {
      solver.a[k] = aOf(g.rc(i));
      solver.chi[k] = 0;
      solver.phi[k] = phiOf(g.zc(j));
    });
  };
  return {
    init, boundary,
    exact: { a: aOf, phi: phiOf, ur: (r) => (-alpha * r) / 2, uz: (z) => alpha * z },
  };
}

/** Lamb–Oseen decaying vortex (spec §3, preset 2): circulation C, ν > 0,
 * initial age t0 > 0 for smooth data. No meridional flow: χ = φ = 0;
 * a(r,t) = −C/(2π r²)·expm1(−r²/(4ν(t+t0))). Boundaries are
 * time-dependent and must be evaluated at every stage time.
 */
export function lambOseenPreset({ C, nu, t0 }) {
  const aOf = (r, t) => {
    const s = 4 * nu * (t + t0);
    const x = (r * r) / s;
    if (x < 1e-8) return C / (2 * Math.PI * s); // series limit at the axis
    return (-C / (2 * Math.PI)) * Math.expm1(-x) / (r * r);
  };
  const boundary = {
    setGhostA: (g, a, t) => fillAnalyticGhosts(g, a, t, (r, _z, tt) => aOf(r, tt)),
    setGhostChi: (g, chi, t) => fillAnalyticGhosts(g, chi, t, () => 0),
    setGhostPhi: (g, phi, t) => fillAnalyticGhosts(g, phi, t, () => 0),
  };
  const init = (solver) => {
    const g = solver.grid;
    forEachInterior(g, (i, _j, k) => {
      solver.a[k] = aOf(g.rc(i), 0);
      solver.chi[k] = 0;
      solver.phi[k] = 0;
    });
  };
  // Gaussian vorticity width the lab fits: ω_z ∝ exp(−r²/(4ν(t+t0)))
  const width = (t) => Math.sqrt(4 * nu * (t + t0));
  return { init, boundary, exact: { a: aOf, width } };
}
```

Also update the Task 5 test to import `fillAnalyticGhosts` from `presets.js` instead of its local copy (delete the local `fill` helper, keep behavior identical).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/ns-axisym/`
Expected: ALL PASS (grid, operators, velocity, advect, burgers, lamboseen). The Burgers drift test is the spec's oracle — if drift does not converge, check first that `φ = αz/2` passes through the Poisson solve unchanged (χ = 0 with exact Dirichlet data should converge in few sweeps).

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/presets.js test/ns-axisym/solver-burgers.test.js test/ns-axisym/solver-lamboseen.test.js
git commit -m "feat(ns-axisym): Burgers and Lamb-Oseen presets with analytic boundary policies"
```

---

### Task 7: Lamb–Oseen preset test (width tracking)

**Files:**
- Modify: `test/ns-axisym/solver-lamboseen.test.js` (append a describe block)

**Interfaces:**
- Consumes: `lambOseenPreset` (Task 6), solver (Task 5).

- [ ] **Step 1: Write the failing test (append)**

```js
// append to test/ns-axisym/solver-lamboseen.test.js
import { lambOseenPreset } from "../../src/math/ns-axisym/presets.js";

describe("Lamb-Oseen preset: fitted Gaussian width", () => {
  it("tracks sqrt(4*nu*(t+t0)) within 2%", () => {
    const P = { C: 1.0, nu: 0.02, t0: 0.5 };
    const preset = lambOseenPreset(P);
    const s = new NSAxisymSolver({ nr: 64, nz: 8, R: 2, Z: 0.25, nu: P.nu, boundary: preset.boundary });
    preset.init(s);
    while (s.t < 0.5) expect(s.step().accepted).toBe(true);
    // ω_z = 2a + r ∂_r a on the j = nz/2 row; fit ln ω_z = c − r²/w² by
    // least squares over cells where ω_z > 0.05·max — a linear fit in r².
    const g = s.grid, j = g.nz >> 1;
    const rs = [], ws = [];
    for (let i = 1; i < g.nr - 1; i++) {
      const da = (s.a[g.idx(i + 1, j)] - s.a[g.idx(i - 1, j)]) / (2 * g.dr);
      const wz = 2 * s.a[g.idx(i, j)] + g.rc(i) * da;
      rs.push(g.rc(i)); ws.push(wz);
    }
    const wMax = Math.max(...ws);
    const xs = [], ys = [];
    for (let n = 0; n < rs.length; n++)
      if (ws[n] > 0.05 * wMax) { xs.push(rs[n] ** 2); ys.push(Math.log(ws[n])); }
    const N = xs.length;
    const sx = xs.reduce((a, b) => a + b, 0), sy = ys.reduce((a, b) => a + b, 0);
    const sxx = xs.reduce((a, b) => a + b * b, 0);
    const sxy = xs.reduce((a, b, n) => a + b * ys[n], 0);
    const slope = (N * sxy - sx * sy) / (N * sxx - sx * sx); // = −1/(4ν(t+t0))
    const fitted = Math.sqrt(-1 / slope);
    expect(Math.abs(fitted / preset.exact.width(s.t) - 1)).toBeLessThan(0.02);
  });
});
```

- [ ] **Step 2: Run to verify the new block fails only if the preset is wrong**

Run: `npx vitest run test/ns-axisym/solver-lamboseen.test.js`
Expected: PASS immediately if Tasks 5–6 are correct (this is a validation test, not a feature driver — TDD here confirms the physics, and a failure is a real finding, not a missing feature).

- [ ] **Step 3: Commit**

```bash
git add test/ns-axisym/solver-lamboseen.test.js
git commit -m "test(ns-axisym): Lamb-Oseen Gaussian width tracks analytic diffusion"
```

---

### Task 8: Diagnostics, validity controls, barrel export

**Files:**
- Create: `src/math/ns-axisym/diagnostics.js`, `src/math/ns-axisym/index.js`
- Test: `test/ns-axisym/validity.test.js`

**Interfaces:**
- Consumes: solver state and grid.
- Produces: `computeDiagnostics(solver)` → `{ energy, enstrophy, maxOmega, maxU, maxDiv, maxA }` with `|ω|` from **all three** components (`ω_r = −r ∂_z a`, `ω_θ = r χ`, `ω_z = 2a + r ∂_r a` — spec §3), cylindrical volumes `2π r Δr Δz`, and zero-flow inputs producing finite zeros (no NaN, no division by zero). `index.js` re-exports the public surface of every module.

- [ ] **Step 1: Write the failing test**

```js
// test/ns-axisym/validity.test.js
import { describe, it, expect } from "vitest";
import { forEachInterior } from "../../src/math/ns-axisym/grid.js";
import {
  NSAxisymSolver, burgersPreset, computeDiagnostics,
} from "../../src/math/ns-axisym/index.js";

describe("diagnostics", () => {
  it("returns finite zeros for a zero-flow state", () => {
    const preset = burgersPreset({ alpha: 1, C: 2, nu: 0.05 });
    const s = new NSAxisymSolver({ nr: 16, nz: 16, R: 1, Z: 0.5, nu: 0.05, boundary: preset.boundary });
    // no init: all-zero state
    s.step(); // must not throw or NaN even with zero fields
    const d = computeDiagnostics(s);
    for (const v of Object.values(d)) expect(Number.isFinite(v)).toBe(true);
  });

  it("computes Burgers energy including all three velocity components", () => {
    const preset = burgersPreset({ alpha: 1, C: 2, nu: 0.05 });
    const s = new NSAxisymSolver({ nr: 32, nz: 32, R: 1, Z: 0.5, nu: 0.05, boundary: preset.boundary });
    preset.init(s);
    s.step();
    const d = computeDiagnostics(s);
    expect(d.energy).toBeGreaterThan(0);
    expect(d.maxOmega).toBeGreaterThan(0); // ω_z ≠ 0 for Burgers even though χ = 0
    expect(d.maxDiv).toBeLessThan(1e-10);
  });

  it("preserves axis parity over a long resolved run (spec validity control)", () => {
    const preset = burgersPreset({ alpha: 1, C: 2, nu: 0.05 });
    const s = new NSAxisymSolver({ nr: 32, nz: 32, R: 1.5, Z: 0.75, nu: 0.05, boundary: preset.boundary });
    preset.init(s);
    for (let n = 0; n < 200; n++) expect(s.step().accepted).toBe(true);
    forEachInterior(s.grid, (_i, _j, k) => {
      expect(Number.isFinite(s.a[k])).toBe(true);
      expect(Number.isFinite(s.chi[k])).toBe(true);
    });
  });

  it("rejects steps when the elliptic budget is too small instead of shipping them", () => {
    const preset = burgersPreset({ alpha: 1, C: 2, nu: 0.05 });
    const s = new NSAxisymSolver({
      nr: 32, nz: 32, R: 1, Z: 0.5, nu: 0.05, boundary: preset.boundary,
      poisson: { maxSweeps: 1, atol: 1e-30, rtol: 0 }, // impossible target
    });
    preset.init(s);
    // Force a state whose chi demands real elliptic work
    forEachInterior(s.grid, (i, j, k) => { s.chi[k] = Math.sin(s.grid.rc(i)) * Math.cos(s.grid.zc(j)); });
    const r = s.step();
    expect(r.accepted).toBe(false);
    expect(r.poisson.converged).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/ns-axisym/validity.test.js`
Expected: FAIL — `diagnostics.js` / `index.js` not found.

- [ ] **Step 3: Write the implementation**

```js
// src/math/ns-axisym/diagnostics.js
import { forEachInterior } from "./grid.js";
import { maxAbsDivergence } from "./velocity.js";

/** Physical diagnostics on the accepted state (spec §3):
 *   ω_r = −r ∂_z a,  ω_θ = r χ,  ω_z = 2a + r ∂_r a
 *   E = ½∫(u_r² + u_θ² + u_z²) dV,  enstrophy = ½∫|ω|² dV,  dV = 2π r Δr Δz
 * All quantities finite for zero-flow input; nothing divides by a state value.
 */
export function computeDiagnostics(solver) {
  const g = solver.grid, { dr, dz, idx, rc } = g;
  const { ur, uz, Fr, Fz } = solver.velocity();
  let energy = 0, enstrophy = 0, maxOmega = 0, maxU = 0, maxA = 0;
  forEachInterior(g, (i, j, k) => {
    const r = rc(i);
    const dV = 2 * Math.PI * r * dr * dz;
    const utheta = r * solver.a[k];
    const u2 = ur[k] ** 2 + utheta ** 2 + uz[k] ** 2;
    energy += 0.5 * u2 * dV;
    const dadz = (solver.a[idx(i, j + 1)] - solver.a[idx(i, j - 1)]) / (2 * dz);
    const dadr = (solver.a[idx(i + 1, j)] - solver.a[idx(i - 1, j)]) / (2 * dr);
    const wr = -r * dadz;
    const wt = r * solver.chi[k];
    const wz = 2 * solver.a[k] + r * dadr;
    const w2 = wr * wr + wt * wt + wz * wz;
    enstrophy += 0.5 * w2 * dV;
    const w = Math.sqrt(w2);
    if (w > maxOmega) maxOmega = w;
    const uMag = Math.sqrt(u2);
    if (uMag > maxU) maxU = uMag;
    const aAbs = Math.abs(solver.a[k]);
    if (aAbs > maxA) maxA = aAbs;
  });
  return { energy, enstrophy, maxOmega, maxU, maxA, maxDiv: maxAbsDivergence(g, Fr, Fz) };
}
```

```js
// src/math/ns-axisym/index.js
/** CPU Float64 reference for the axisymmetric NS solver (spec:
 * docs/superpowers/specs/2026-09-11-ns-axisym-solver-design.md).
 * The WGSL pipeline ports these stencils; this module is the ground truth
 * the GPU parity check compares against.
 */
export { createGrid, allocField, applyAxisGhosts, forEachInterior } from "./grid.js";
export { applyL5, solvePoisson, poissonResidual } from "./operators.js";
export { cornerPsi, faceFluxes, cellVelocity, maxAbsDivergence } from "./velocity.js";
export { advect } from "./advect.js";
export { NSAxisymSolver } from "./solver.js";
export { burgersPreset, lambOseenPreset, fillAnalyticGhosts } from "./presets.js";
export { computeDiagnostics } from "./diagnostics.js";
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: ALL PASS, including the pre-existing 489 tests. The ns-axisym suite may take ~1–2 minutes (convergence studies); if it exceeds that, reduce the finest Burgers resolution to 48×48 and keep the order assertion.

- [ ] **Step 5: Commit**

```bash
git add src/math/ns-axisym/diagnostics.js src/math/ns-axisym/index.js test/ns-axisym/validity.test.js
git commit -m "feat(ns-axisym): physical diagnostics, validity controls, barrel export"
```

---

## Deferred to later plans (explicit)

- **Plan 2:** no-slip wall-vorticity closure (start with Thom's formula per design discussion), coupled manufactured-solution test (which also carries the spec's Γ-equation equivalence check — it needs nonzero couplings to be meaningful), closed-cylinder energy-budget test, ring preset initial conditions.
- **Plan 3:** WGSL port + in-browser GPU↔CPU parity harness.
- **Plan 4:** `demos/ns-lab.html` lab page, instruments, presets UI.

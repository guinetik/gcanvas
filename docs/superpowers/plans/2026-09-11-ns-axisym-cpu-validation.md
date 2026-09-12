# Axisymmetric CPU reference — validation results

**Date:** 2026-09-11
**Result:** Phase 1 numerical acceptance passed for the cases and resolutions
below. The implementation is available through `src/math/ns-axisym.js`.

## Reproduction

With Node on PATH and the existing dependencies installed:

```bash
node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1 --minWorkers=1
```

For the numerical reference alone, insert `test/ns-axisym` after `run`.
Convergence tests print machine-readable `NS_*` JSON records containing
errors, time endpoints, step counts, retries, and elliptic residuals.

The full native Node run passed **520 tests in 31 files**, including **31
new numerical tests in 5 files**, in 37.64 seconds on this workstation.
The convergence file took 11.71 seconds. These timings are observations,
not performance targets for the browser or GPU.

The Windows command used the installed runtime at
`C:\nvm4w\nodejs\node.exe`. Bun 1.4.0 also passed the numerical tests using
the threads pool, but failed existing mock/class-loading tests in the full
suite. Native Node passed those unchanged tests. Use Node for repository
acceptance; Bun's default forks pool failed before test collection.

The Vite production build and both Terser minification commands passed.
Vite reported existing warnings about output format configuration and
duplicate `probabilityDensity` exports. No top-level library exports were
changed. There is no configured TypeScript or ESLint check in the package
scripts. `git diff --check` passed.

## Spatial convergence

Errors below are cylindrical-volume-weighted L2 errors in regularized
swirl a. Every resolution reaches exactly the same physical endpoint.
Maximum, axis-row, boundary-strip, potential, and velocity errors are
also recorded by the tests where applicable.

| Case | Grids | Endpoint | Coarse error | Medium error | Fine error | Successive orders |
|---|---|---:|---:|---:|---:|---|
| Burgers | 16², 32², 64² | 0.04 | 3.43813e-5 | 8.84845e-6 | 2.23808e-6 | 1.958, 1.983 |
| Lamb–Oseen | 16², 32², 64² | 0.04 | 3.91590e-4 | 9.69852e-5 | 2.40893e-5 | 2.014, 2.009 |
| Coupled manufactured flow | 8², 16², 32² | 0.02 | 3.04900e-7 | 7.46570e-8 | 1.80645e-8 | 2.030, 2.047 |

Domains are R = 1, Z = 0.5. Burgers uses α = 1, C = 2, ν = 0.1;
Lamb–Oseen uses C = 1, ν = 0.05, initial age t0 = 0.5. The manufactured
fixture uses ν = 0.05 and independently differentiated time-dependent
polynomial fields, with nonzero transport, swirl sources, and χ.

For the coupled case, observed orders are 2.020/2.027 for χ,
2.200/2.107 for φ, 1.995/1.999 for radial velocity, and 2.000/2.000 for
axial velocity. The additional elliptic test uses a non-polynomial even
potential, avoiding reliance on polynomial stencil exactness alone.

The spatial studies cap dt at 5e-4 and use an absolute Poisson target of
1e-11 (relative tolerance zero). Fine grids can require smaller steps.
All reported maximum accepted-state residuals are below 1e-11. A 0.9
adaptive step margin removed repeated retries caused by tiny changes in
the trial-stage limit: the final benchmark runs have zero retries.

The Lamb–Oseen fitted Gaussian width at 64² is 0.3286064924, with relative
error **0.00823%**. This measures the Gaussian width of axial vorticity,
not the radius of maximum swirl speed.

## Temporal convergence and calibration

On the fixed 8² coupled grid, dt = 0.004, 0.002, 0.001 gives successive
solution-difference ratios corresponding to order **2.013** for both a
and χ. The endpoint is 0.04 and the Poisson target is 1e-13.

On the 16² coupled spatial study, halving dt from 5e-4 to 2.5e-4 while
tightening the Poisson target from 1e-11 to 1e-12 changes swirl L2 error
by **0.0324%**. Spatial error dominates that measurement.

A temporary in-memory mutation reused the original potential and velocity
at the trial stage. Temporal order fell to **1.043**, below the acceptance
threshold. No mutation was retained in the source.

## Other validated behavior

- L5 axis elimination, polynomial consistency, Γ/L5 operator equivalence,
  non-polynomial elliptic convergence, zero-RHS harmonic data, budget
  exhaustion, and explicit rejection of nonfinite residuals.
- Uniform axial flow, Burgers strain, second-order boundary-adjacent
  velocity, and discrete divergence cancellation from shared corner fluxes.
- Constant preservation, both transport directions, radial transport, and
  an MC/SSP-RK2 pulse test without new extrema at the configured CFL.
- Combined transport/diffusion limits, χ creation from zero, unsafe fixed
  steps, a timestep below the useful minimum, and trial-limit retries.
- Independent accepted-state storage: failures during original, trial,
  and final preparation leave all accepted arrays, time, and step index
  unchanged. A successful adaptive retry matches a fresh fixed-step run.
- True zero-flow diagnostics, the cylindrical energy integral for uniform
  axial flow, solid-body rotation energy convergence, and all three
  vorticity components. Diagnostics are available immediately after
  initialization without advancing time.

## Scope and remaining work

This validates the Float64 CPU method for smooth resolved flows with the
explicit analytic-extension boundary policy. Boundary ghosts use known
exterior analytic data; they are not the no-slip wall closure. Small
nonzero χ errors in the analytic vortices converge away rather than being
misrepresented as machine-zero preservation.

The tests are consolidated into `operators`, `solver`, `diagnostics`,
`acceptance`, and `convergence` test files instead of one file per planned
subtask. Numerical implementation helpers remain internal to the math
subdirectory; a public facade supplies the solver, presets, and diagnostics.

Phase 2 is now implemented and separately documented in the
[wall validation report](2026-09-11-ns-axisym-wall-validation.md), including
Thom's closure, wall slip, the closed-cylinder energy budget, and ring data.
GPU/f32 parity, browser performance at 256×512, long-time complex-flow
studies, and the UI are not validated by these results. No inference of
finite-time blowup or global regularity follows from these finite tests.

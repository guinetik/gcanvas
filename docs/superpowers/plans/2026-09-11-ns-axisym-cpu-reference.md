# Axisymmetric NS Solver — CPU Reference (Phase 1) Implementation Plan

**Status:** Phase 1 CPU reference and phase 2 Thom walls implemented and
numerically validated for the documented test cases. See the
[phase 1 results](2026-09-11-ns-axisym-cpu-validation.md) and
[phase 2 results](2026-09-11-ns-axisym-wall-validation.md) for
measured orders, test commands, implementation mapping, and remaining scope.
**Goal:** A Float64 reference for axisymmetric Navier–Stokes with swirl,
validated with analytic benchmarks, a small coupled manufactured case,
and explicit tests of failed-step behavior.

**Architecture:** Pure numerical modules under `src/math/ns-axisym/`,
with an SSP-RK2 solver coordinating boundary data, elliptic solves,
transport, sources, and diagnostics. No runtime dependencies or browser
requirements in the numerical modules.

**Spec:** [Solver design](../specs/2026-09-11-ns-axisym-solver-design.md).
This phase covers analytic boundaries and spec tests 1–4 plus the relevant
validity controls. The completed phase 2 extension adds stationary no-slip
walls, Thom's closure, the closed-domain energy budget, and ring presets.
GPU and UI remain later phases. The checklists below retain the original
phase 1 task breakdown; the linked reports record executed acceptance.

## Execution and repository conventions

- Work through the dependencies below; check off steps only after their
  stated verification passes. This is an implementation plan, not tested
  production code. Derive and test the listed contracts before porting them.
- Follow current repository and session instructions. No unavailable skill
  or particular agent orchestration is a prerequisite.
- Plain ES modules and Float64Array fields; JSDoc on exported functions.
  Put configurable tolerances, iteration limits, and physical parameters
  in option objects. Mathematical stencil coefficients belong beside
  their derivation, rather than becoming arbitrary user options.
- Use small reviewable commits when committing is authorized. Use accurate
  session attribution; do not copy another agent's Claude-Session trailer.
- Run focused tests with `npm test -- test/ns-axisym/<file>.test.js`, then
  the complete suite with `npm test`. Use the installed Vitest dependency.
  Record actual results; do not hard-code an existing test count.
- No TypeScript or ESLint check is configured in the current package scripts.
  Recheck scripts at implementation time; do not invent a passing check.
- The directory split below implements the spec's conceptual
  `src/math/ns-axisym.js` reference. Supply a thin facade at that path.
  Keep internal numerical helpers out of the top-level GCanvas exports
  until a consumer needs them.

## Files and task order

```text
src/math/ns-axisym.js             # public facade
src/math/ns-axisym/
  grid.js                        # geometry, allocation, axis ghosts
  boundaries.js                  # analytic-extension boundary policy
  operators.js                   # L5 rows, residual, red-black GS
  velocity.js                    # corner potential, face fluxes, velocity
  advect.js                      # MC-limited transport
  solver.js                      # preparation, RHS, timestep, atomic RK2
  presets.js                     # Burgers, positive-age Lamb–Oseen
  diagnostics.js                 # full velocity/vorticity and integrals
  index.js                       # selected public exports
test/ns-axisym/
  helpers.js                     # independent norms, fixed-time driver
  fixtures.js                    # independent analytic/manufactured fields
  grid.test.js
  operators.test.js
  velocity.test.js
  advect.test.js
  solver.test.js
  solver-coupled.test.js
  solver-burgers.test.js
  solver-lamboseen.test.js
  diagnostics.test.js
  validity.test.js
```

Dependencies: grid → analytic boundary policy → operators → velocity →
advection → solver → coupled validation and benchmarks → diagnostics and
final acceptance. Keep fixtures independent of production RHS/stencils.

## Task 1: Grid and field contracts

**Files:** `grid.js`, `grid.test.js`.

- [ ] Implement `createGrid({ nr, nz, R, Z })`, `allocField(grid)`,
  `applyAxisGhosts(grid, field)`, and `forEachInterior(grid, fn)`.
- [ ] Validate integer dimensions large enough for all stencils (at least
  four cells per direction), finite positive R and Z, and array sizes.
  Validate physical viscosity separately in the solver.
- [ ] Fix ghost width G = 2, W = nr + 2G, H = nz + 2G, with
  `idx(i,j) = (j+G)W+i+G`. Interior indices are zero-based;
  `rc(i) = (i+½)dr`, `zc(j) = −Z+(j+½)dz`,
  `rn(i) = i dr`, `zn(j) = −Z+j dz`.
- [ ] Document that scalar arrays hold point samples at cell centers.
  Cylindrical midpoint quadrature uses volume per unit angle
  `V = rc(i) dr dz`; physical integrals multiply by 2π.
- [ ] Mirror regular a, χ, φ evenly:
  `f(−1−k,j) = f(k,j)`, including axial ghost rows after those rows
  have been filled. Axis ghosts must never read uninitialized corners.
- [ ] Test geometry, unique indexing, both ghost layers, corner parity,
  invalid options, and a deliberately nonconstant even field.
- [ ] Run `npm test -- test/ns-axisym/grid.test.js`.

## Task 2: Analytic boundary policy and independent fixtures

**Files:** `boundaries.js`, `fixtures.js`, `helpers.js`;
boundary assertions can live in `grid.test.js`.

- [ ] Define callbacks for a, χ, φ and boundary-corner ψ at a supplied
  physical time. Callbacks fill only their designated ghosts/boundary
  corners and never overwrite interior numerical a or χ.
- [ ] For phase 1, use an explicitly named **analytic-extension policy**:
  evaluate the known smooth field at both outer radial and axial ghost
  centers, then mirror the axis. This is a verification policy with known
  exterior data, not a generic implementation of face Dirichlet conditions.
  Do not describe ghost centers outside the domain as the physical wall.
- [ ] Provide exact ψ at physical outer/axial corners; axis ψ is zero.
  Test corners where policies meet, callback times, and untouched interiors.
  Verify boundary-adjacent solution/velocity errors under refinement.
- [ ] Add independent exact fields and error norms for later tests.
  Include true homogeneous zero data, not Burgers boundary data applied
  to an initially zero interior.
  Use weighted L2 = sqrt(Σ V·error² / Σ V) and the unweighted maximum
  absolute error; report per-field units or explicit normalization scales.
- [ ] Implement a bounded fixed-time driver: cap the final step to the
  remaining interval, check every acceptance result, enforce a maximum
  step count, and fail on no progress. All comparisons use the same
  physical endpoint; never assume a fixed step count matches time.
- [ ] Run grid/boundary tests before proceeding.

Phase 2 will add a separate no-slip policy with Thom's closure. This
analytic extension must not silently become its boundary treatment.

## Task 3: L5 and a consistent elliptic solve

**Files:** `operators.js`, `operators.test.js`.

- [ ] Implement `applyL5(grid, f, out)` and the coefficient rows used by
  `solvePoisson(grid, phi, chi, options)`. Input/output must not alias.
  Use the same effective rows for residual evaluation and diffusion limits.

For an interior row before ghost elimination:

```text
cE = 1/dr² + 3/(2 r_i dr)
cW = 1/dr² − 3/(2 r_i dr)
cN = cS = 1/dz²
L5 f = cE fE + cW fW + cN fN + cS fS − d fC
d = 2/dr² + 2/dz²
```

At i = 0 the even ghost equals fC. Eliminate it algebraically:

```text
cE = 4/dr², cW = 0
d = 4/dr² + 2/dz²
```

- [ ] Use this effective axis diagonal in GS. A copied ghost from the
  previous sweep is not an independent neighbor; retaining the generic
  diagonal and that stale copy is not the intended red-black GS update.
- [ ] Hold analytic-extension ghosts fixed for the current stage time.
  Perform separate red and black sweeps on the effective system.
  Refresh mirrors before diagnostics or stencil operations that read them.
- [ ] Define convergence as
  `max|−L5φ−χ| ≤ atol + rtol max|χ|`, with finite nonnegative tolerances,
  positive absolute tolerance, and configurable residual-check interval.
  Measure the initial residual too; return zero sweeps for an already
  converged state. Nonzero harmonic boundary data with χ = 0 must work.
- [ ] Reject NaN/Infinity in fields, ghosts, updates, or residuals.
  Return an explicit nonfinite failure; a reduction like
  `if (absResidual > max) ...` silently ignores NaN and is insufficient.
- [ ] Return `{ converged, reason, sweeps, residual, target }`.
  A maximum sweep count limits work and does not certify convergence.

Required tests:

- [ ] Constant fields, r²z with L5 = 8z, and r⁴ with L5 = 24r².
  The quadratic case checks exactness; the quartic case checks truncation
  and refinement, including the first radial row.
- [ ] Recover a nontrivial exact potential from independently calculated χ
  and boundary data, starting from a deliberately wrong potential.
- [ ] Verify one red/black update against the eliminated axis row, then
  convergence of a non-polynomial even solution.
- [ ] Check zero RHS with both homogeneous and nonzero harmonic boundaries,
  initial convergence, budget exhaustion, and injected nonfinite inputs.
- [ ] Check continuum equivalence
  `LΓ(r²f) = r²L5f` and `−LΓ(r²φ) = r²χ` on analytic fields.
  Independently discretized operators need convergence to this identity,
  not artificial bitwise equality; no time-dependent coupling is needed.
- [ ] Run `npm test -- test/ns-axisym/operators.test.js`.

## Task 4: Compatible fluxes and velocity recovery

**Files:** `velocity.js`, `velocity.test.js`.

Layouts, per unit angle:

```text
ψ:  (nr+1)(nz+1), corner index j(nr+1)+i
Fr: (nr+1)nz,     radial-face index j(nr+1)+i
Fz: nr(nz+1),     axial-face index j nr+i

Fr(i,j) = −[ψ(i,j+1) − ψ(i,j)] = integrated radial volume flux
Fz(i,j) =  [ψ(i+1,j) − ψ(i,j)] = integrated axial volume flux
div(i,j) = [FrE−FrW+FzN−FzS] / V
```

- [ ] Implement `cornerPsi`, `faceFluxes`, `cellVelocity`, and
  `maxAbsDivergence` with explicit buffer shapes and nonfinite checks.
- [ ] Interpolate regular φ before multiplying by exact corner r².
  For smooth analytic tests, use tensor-product four-point midpoint
  interpolation with weights (−1, 9, 9, −1)/16 on the surrounding four
  centers in each direction. Two ghost layers supply boundary stencils.
  Set physical boundary ψ from the policy and axis ψ to zero.
- [ ] Test reconstruction at boundary-adjacent faces as well as interiors.
  Simple four-cell averaging followed by exact boundary overrides can
  introduce a jump in interpolation error and first-order boundary
  velocity errors; the smooth higher-order interpolation avoids baking
  that mismatch into this reference.
- [ ] Recover face speeds by dividing Fr by r_face dz (zero on the axis)
  and Fz by r_cell dr. Average neighboring face speeds for cell velocities.
  Stability limits use face fluxes directly, not these averaged speeds.
- [ ] Verify constant φ gives exact uniform axial flow, linear-in-z φ
  gives Burgers strain, and a smooth nontrivial even φ has convergent
  face/cell velocity including axis and boundaries.
- [ ] Check divergence cancellation for arbitrary finite corner data,
  scaled to floating-point roundoff and local flux/volume magnitudes.
  These are discrete fluxes from reconstructed ψ, not exact integrals of
  an unknown continuum solution.
- [ ] Run `npm test -- test/ns-axisym/velocity.test.js`.

## Task 5: MC-limited scalar transport

**Files:** `advect.js`, `advect.test.js`.

- [ ] Implement `advect(grid, f, Fr, Fz, out)` as the negative advective
  derivative. Use both ghost layers, the MC limiter, and upstream
  reconstruction for positive and negative face fluxes.
- [ ] Use cylindrical V and the same Fr/Fz as the divergence diagnostic.
  A useful arithmetic form is
  `−[FrE(fE−fC)−FrW(fW−fC)+FzN(fN−fC)−FzS(fS−fC)]/V`.
  It incorporates the discrete-divergence correction and avoids subtracting
  two large flux divergences for a constant field.
- [ ] Define face values only once per shared face, or guarantee identical
  reconstruction from both adjacent cells. Document point-sample versus
  volume-average reconstruction; verify radial transport separately.
- [ ] Test constants under a nonuniform divergence-free velocity, both
  velocity signs, smooth axial and radial derivatives, and axis behavior.
  Add a bounded monotonicity/overshoot test at the intended timestep.
- [ ] Measure smooth transport order in weighted L2 and maximum norms,
  recording limiter effects near extrema separately. Do not exclude
  boundary cells from every accuracy check.
- [ ] Run `npm test -- test/ns-axisym/advect.test.js`.

## Task 6: Solver, timestep selection, and atomic acceptance

**Files:** `solver.js`, `solver.test.js`, `validity.test.js`.

Public contract:

```js
new NSAxisymSolver({ nr, nz, R, Z, nu, boundary, limits, poisson })
solver.initialize({ a, chi, phiGuess, time: 0 }) // prepares a valid state
solver.step({ maxDt, fixedDt })                // options may be omitted
solver.velocity()                             // accepted-state views only
solver.a; solver.chi; solver.phi               // read-only accepted-state views
solver.t
solver.stepIndex
// step result:
// { accepted, dt, attemptedDt, reason, attempts, limitingMechanism, poisson }
```

- [ ] Validate positive finite ν, required boundary callbacks, finite step
  options, and solver tolerances. Allocate original/stage/candidate/RHS
  buffers and keep their ownership explicit.
- [ ] Initialize by filling fields, boundaries, solving φ, and recovering
  velocity. Diagnostics must be valid at t = 0 without advancing a step.
  Accept field samplers (r,z,time) or correctly sized Float64Array inputs,
  copying supplied arrays into owned storage. Report initialization failure
  explicitly and prohibit stepping until a valid state exists.
  Treat returned arrays as read-only views; mutation requires reinitialization.
- [ ] Implement one stage-preparation operation taking explicit a, χ, time,
  potential guess, and output buffers. Each preparation validates fields
  and ghosts, solves −L5φ = χ, and recovers current fluxes.
- [ ] Implement the full RHS from this prepared stage:

```text
Fa = advect(a) + 2a ∂zφ + ν L5a
Fχ = advect(χ) + ∂z(a²) + ν L5χ
```

- [ ] Provide a default-zero, test-only source hook for the manufactured
  fixture. Its analytic source is evaluated at the same stage time and
  is included in source-resolution checks.

Timestep contract:

- [ ] Derive an advective rate from outgoing face fluxes divided by V:
  `[max(FrE,0)+max(−FrW,0)+max(FzN,0)+max(−FzS,0)]/V`.
  Include a conservative factor for the chosen MUSCL reconstruction.
  Face speeds can be large even when cell averages cancel.
- [ ] Combine advection and diffusion rates rather than assuming the
  minimum of unrelated limits is sufficient. A conservative starting
  form is `dtTransport = 1/max_i(A_i/Cadv + D_i/Cdiff)`,
  where D_i is the effective −νL5 diagonal including axis treatment.
  Document safety factors and validate the combined method.
- [ ] Cap |2∂zφ| dt and both source increments using per-field
  characteristic scales and absolute floors. Include ∂z(a²): χ can be
  created from zero even when strain is initially zero. Avoid a relative
  source limit that forces vanishing dt merely because χ starts at zero.
- [ ] Support finite maxDt and endpoint clipping. If all physical rates
  vanish, use a configured finite maximum step.
- [ ] Recheck stability/source limits after trial-stage preparation before
  evaluating its RHS. Reject nonfinite or unsafe trial states.
- [ ] A minimum useful dt is a failure threshold, never an upward clamp:
  if the stable dt is below it, return an explicit failure. Also reject
  steps where t + dt cannot advance floating-point time.
- [ ] fixedDt requests are validated against the same limits. Do not
  silently halve a fixed step; return an unsafe-fixed-step result.
  Explicit maxDt may shorten the final endpoint step, reported in dt.

Atomic SSP-RK2:

```text
prepare q0 at t0; compute F0 and its step limits
trial = q0 + dt F0
prepare trial at t0+dt; check limits; compute Ftrial
candidate = ½q0 + ½(trial + dt Ftrial)
prepare and validate candidate at t0+dt
only then publish candidate, its potential/velocity, time, and step index
```

- [ ] Adaptive retry restores/reuses the original prepared state and F0.
  Never use a failed trial's potential/velocity to evaluate F(q0).
- [ ] Every failure, including the final candidate Poisson solve, leaves
  accepted fields, ghosts, potential, velocity, time, and step index
  unchanged. Report dt = 0 and attemptedDt separately on failure.
- [ ] Stop on an unconverged original-state solve; smaller dt cannot fix
  its elliptic budget. Do not treat persistent Poisson failure as physical
  stiffness. Keep numerical validity separate from UI pause behavior.

Required control tests:

- [ ] Inject failures during initial, trial, and final preparation and
  verify all accepted-state data remains unchanged.
- [ ] Exercise an adaptive rejection followed by a successful smaller
  retry and compare with a fresh solver at that accepted timestep.
- [ ] Exercise unsafe fixed steps, combined transport/diffusion limits,
  a trial whose limits tighten, nonfinite ghosts, dt below the floor,
  and a source-producing state with initially zero χ.
- [ ] Assert stage callback times and state dependence; all diagnostic
  buffers must describe the same accepted time.
- [ ] Run solver/validity tests before analytic convergence studies.

## Task 7: Coupled validation before benchmarking

**Files:** `fixtures.js`, `solver-coupled.test.js`.

Burgers and Lamb–Oseen both have χ = 0 and cannot validate the evolving
elliptic coupling. Include one small analytic-boundary manufactured case
here; the no-slip manufactured case still belongs to phase 2.

- [ ] Choose smooth even fields, for example
  `a=A(t)(1+βr²)(1+γz)`,
  `φ=B(t)(1+κr²)(1+λz+μz²)`, with nonzero coefficients and smooth,
  nonconstant A and B. Keep the test domain and amplitudes resolved.
- [ ] Independently derive χ = −L5φ, velocity, derivatives, and forcing:

```text
Sa = ∂t a + u·∇a − 2a∂zφ − νL5a
Sχ = ∂tχ + u·∇χ − ∂z(a²) − νL5χ
```

  Do not construct expected sources by calling production discrete
  operators; that would cancel the very errors being tested.
- [ ] Compare a, χ, φ, and velocity at a common physical endpoint.
  Check spatial refinement with dt and elliptic errors made smaller.
- [ ] Test RK2 temporal order on a fixed spatial grid using dt, dt/2,
  dt/4 and self-convergence, or a much finer-time same-grid reference.
  This isolates temporal error from the spatial error floor.
- [ ] Tighten elliptic tolerance and halve dt in calibration runs to
  establish the measured order is not a solver-tolerance artifact.
- [ ] Verify the test is sensitive to stale stage velocity and omitted or
  split source terms, using temporary local mutations during development.
- [ ] Run `npm test -- test/ns-axisym/solver-coupled.test.js`.

## Task 8: Analytic presets and fixed-time convergence

**Files:** `presets.js`, `solver-burgers.test.js`,
`solver-lamboseen.test.js`.

- [ ] Implement Burgers and positive-age Lamb–Oseen presets using the
  boundary policy from Task 2. Validate α > 0, ν > 0, t0 > 0 where
  applicable, and finite circulation. Solver and preset viscosity must
  agree; do not allow two silently different parameter values.
- [ ] Supply independent exact fields, physical scales, initial data,
  and boundary callbacks. Use expm1 and a removable-axis-limit helper;
  a small-argument series retains correction terms instead of flattening
  the profile over an arbitrary radius interval.

```text
Burgers:
  Γ = C/(2π)[1−exp(−αr²/(4ν))]
  a = Γ/r², a(0) = Cα/(8πν)
  χ = 0, φ = αz/2, ur = −αr/2, uz = αz

Lamb–Oseen:
  s = 4ν(t+t0)
  Γ = C/(2π)[1−exp(−r²/s)]
  a = Γ/r², a(0) = C/(2πs)
  χ = φ = 0, Gaussian vorticity width = sqrt(s)
```

- [ ] Advance every spatial grid to the identical tEnd using the bounded
  endpoint driver. Record dt ranges, steps, rejected attempts, solve
  residuals, and actual endpoint; never estimate matched time by scaling
  a fixed number of steps.
- [ ] Measure weighted L2 and maximum errors over the whole domain, plus
  first-axis-row and boundary-strip errors. Report both successive
  observed orders `p=log(Eh/Eh2)/log(2)`.
- [ ] Use fixed domains and grid families such as 16×32 → 32×64 → 64×128,
  extended only if not asymptotic. Require decreasing finite errors and
  an evidence-based band around second order in smooth norms; document
  limiter-related maximum-norm behavior. Errors near roundoff need
  absolute checks rather than meaningless ratios.
- [ ] Test Burgers steady drift and recovered strain, not just swirl.
  For Lamb–Oseen, test the full evolving radial profile and χ/meridional
  error. For both presets, analytic z-boundary values and numerical interior can
  introduce z-dependent truncation error: require convergence to zero,
  not unconditional machine-zero χ.
- [ ] Fit Lamb–Oseen Gaussian width from reconstructed ωz with documented
  sample selection. Require enough samples, finite negative slope, a
  nonsingular fit, and refinement of width error. Report the practical
  relative-error target together with the profile/order results.
- [ ] Check every step result, including short symmetry tests.
  Assert actual even ghost parity as well as finite interior fields.
- [ ] Run both benchmark files and retain a small convergence table.

Do not loosen the order assertion, arbitrarily change a 64-cell grid to
48 while retaining a factor-two ratio, or attribute every failed ratio to
dt without measurement. Separate slow refinement studies from quick unit
checks if needed; preserve a documented command for the full acceptance set.

## Task 9: Diagnostics, public facade, and acceptance

**Files:** `diagnostics.js`, `index.js`, `src/math/ns-axisym.js`,
`diagnostics.test.js`; reuse validity fixtures.

- [ ] Implement diagnostics from a prepared accepted state:

```text
uθ = r a
ωr = −r ∂z a
ωθ = r χ
ωz = 2a + r ∂r a
E = ½ Σ |u|² (2π r dr dz)
enstrophy = ½ Σ |ω|² (2π r dr dz)
```

  Return energy, enstrophy, maxOmega, maxU, maxA, and maxDiv with time
  and step index. Check derivative ghosts and all results for finiteness.
- [ ] Test true zero flow with homogeneous boundaries: finite exact zeros,
  both immediately after initialization and after accepted steps.
- [ ] Test uniform axial flow against E = ½U²(2πR²Z), with zero vorticity.
  Test solid-body swirl a = Ω against |ω| = 2|Ω| and its analytic energy.
  These checks verify constants and cylindrical weights, not just positivity.
- [ ] Add a smooth field with nonzero χ and ∂z a to check all three
  vorticity contributions against independent values.
- [ ] Export the intended public solver, presets, diagnostics, and grid
  utilities; keep scratch/stencil helpers internal where practical.
  The single-file facade re-exports the directory's public API.
- [ ] Run all phase 1 tests, then `npm test`; record actual counts, runtime,
  failures, convergence orders, and calibrated tolerances in a short
  verification note beside this plan when implementing it.
- [ ] Check `git diff --check` and review public imports. Run
  `npm run build` if exports/build inputs change; retain no unintended
  generated artifacts.

Phase 1 is complete only with coupled temporal/spatial validation,
both analytic benchmarks, correct diagnostics, and atomic failure behavior.
It does not certify wall treatment, GPU parity, or finite-time blowup.

## Phase 2 completion

- [x] Stationary cylinder boundary policy with Thom's wall-vorticity estimate
  at the actual half-cell wall distance; refresh after every stage solve.
- [x] Quadratic Dirichlet ghost continuation and matching eliminated
  Poisson rows, including rectangular-grid and corner-strip checks.
- [x] Independent wall-slip measurement, coupled clamped manufactured
  refinement, and separate time-step/elliptic-tolerance calibration.
- [x] Unforced energy-decay and integrated dissipation-budget refinement.
- [x] Compact opposite-signed swirl rings with optional potential-derived
  meridional motion and parameter validation; no evolution forcing.

Thom remains the baseline. The measured slip order approaches two, so the
tested cases do not justify a higher-order closure or extra wall iteration.
See the phase 2 report for coefficients, limits, and measured errors.

## Follow-up implementation and remaining validation

- **Phase 3 follow-up:** The WGSL port, browser parity, and measured
  refinement/performance checks are implemented; see the
  [GPU report](2026-09-11-ns-axisym-gpu-validation.md). The 256×512 wall
  residual stall is resolved with a two-f32 potential representation at
  unchanged tolerances. Strict 64×128, zero-guess 32×64, and 20-step 256×512
  regressions pass, including independent CPU residual checks. Validate
  longer physical ring runs and interactive performance before accepting
  the live default.
- **Phase 4 implemented:** `demos/ns-lab.html` presents accepted GPU fields
  through GCanvas, with physical-time charts, profile comparisons, the
  three presets, pause/single-step/reset, and numerical failure states.
  The interactive preview defaults to 32×64; higher grids remain selectable. See the
  [lab report](2026-09-11-ns-axisym-lab-validation.md) for browser acceptance.
  Optional revolve rendering and reciprocal-vorticity extrapolation remain
  deferred; long-time ring validation is still required for stronger claims.

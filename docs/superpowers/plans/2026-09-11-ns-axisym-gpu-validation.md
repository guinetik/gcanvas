# Axisymmetric WebGPU solver — implementation and validation

**Date:** 2026-09-11. The GPU compute port passes the configured CPU/GPU
parity suite and spatial refinement checks on actual NVIDIA hardware.
**The 256×512 no-slip Poisson stall is resolved on the tested adapter:**
storing a small potential correction alongside its main f32 value passes
the unchanged tolerance and a 20-step regression. Long-time live-default
acceptance remains open.

Full structured output is in
[gpu-results.json](2026-09-11-ns-axisym-gpu-results.json). Its top-level
`passed` includes parity, refinement, failure checks, and the new
`precisionRegression`: strict-tolerance, cold-start, and 256×512 wall tests.
`liveDefaultValidated` remains explicitly false because these short
manufactured runs do not establish long-time physical-flow performance.

The complete native Node/Vitest run passes **533 tests in 34 files** in
**135.86 seconds**. This includes the unchanged CPU numerical acceptance
suite and three GPU host-contract tests. The separate actual-browser GPU
run takes **29.45 seconds** including the extended studies. The Vite build
and both Terser minifications pass, with the existing output-format and
duplicate `probabilityDensity` warnings. No TypeScript checker or ESLint
check is configured in this repository. `git diff --check` passes.

## Reproduction

With dependencies installed, a recent Node runtime, and Chrome:

```bash
node scripts/validate-ns-webgpu.mjs --performance --output docs/superpowers/plans/2026-09-11-ns-axisym-gpu-results.json
```

Omit `--performance` for parity and failure checks alone. Set
`NS_CHROME_PATH` for a different Chromium executable. The runner starts a
localhost Vite server and an isolated headless Chrome profile, runs real
WebGPU through the Chrome DevTools Protocol, writes results, and closes
its browser/server. It does not connect to a personal browser session or
use a software/CPU fallback. Temporary isolated profiles are retained in
the OS temporary directory; the runner does not recursively delete them.

For interactive use, run the Vite dev server and open
`/test/ns-axisym/browser/index.html?debug`. The page has a visible run
button, progress/pass/fail text, an optional extended study, and JSON output.
It is a development validation tool, outside the production demo build.

The recorded run used Headless Chrome 153 on Windows, an NVIDIA Lovelace
adapter, and `isFallbackAdapter: false`. Adapter model/description were
not exposed. Browser setup follows Chrome's
[headless WebGPU guidance](https://developer.chrome.com/blog/supercharge-web-ai-testing);
no unsafe-WebGPU flag was needed on this workstation.

## Implemented contract

`NSAxisymGPUSolver` is exported through `src/webgpu/index.js` and the
top-level GCanvas entry point. It owns its device and compute buffers;
the CPU reference remains independently importable from `src/math/ns-axisym.js`.

```js
const solver = new NSAxisymGPUSolver({ nr: 16, nz: 32, R: 1, Z: 0.5,
  nu: 0.05, boundary: noSlipBoundary() });
if (!await solver.init()) throw new Error(solver.lastError);
const initial = await solver.initialize({ a: initialA, chi: initialChi,
  phiGuess: initialPhi });
if (!initial.accepted) throw new Error(initial.reason);
const result = await solver.step();
if (!result.accepted) { /* pause and show reason / residual / target */ }
const diagnostics = solver.diagnostics(); // accepted time and step index
const debugCopy = await solver.readback(); // explicit, full debug copy
solver.destroy();
```

Initial samplers, analytic boundary policies, source callbacks, and
no-slip policies follow the CPU contracts. An analytic test source is
sampled on the host at each stage time; all spatial operators, Poisson
sweeps, boundary reconstruction, velocity, RHS, and RK integration execute
on the GPU. Production no-slip runs with no source need neither callback
sampling nor per-step field uploads. The CPU preset `init(solver)` helper
can return the GPU initialization promise; await it.

Every slot has separate state ping-pong buffers, face/corner data, velocity,
and compensation storage. Original accepted data survive trial and final
preparation. Red/black sweeps use separate dispatches and copy the untouched
color; there is no workgroup-only synchronization assumption. This follows
the cross-invocation memory constraints in the
[WGSL specification](https://www.w3.org/TR/WGSL/).

The Poisson operator uses difference-form residuals to avoid subtracting
large phi/h² terms unnecessarily. State is packed as
`(a, chi, phiHigh, phiCorrection)`, reusing the previously unused fourth
component without increasing GPU allocations. Each sweep retains the small
potential correction; residual evaluation applies the operator to both
components. Boundary reconstruction, strain, velocity, and wall-slip
diagnostics consume the represented potential. Thom's half-cell formulas
and quadratic Dirichlet continuation match the CPU implementation.
Boundaries refresh after each solved potential. Shared corner psi generates
compatible fluxes, stored in ordinary f32.

Every shader operation remains f32. This is a limited two-component
potential representation, not full IEEE binary64 emulation. WGSL permits
floating-point transformations, so portable exactness of the error-free
transform is not assumed; actual-adapter tests independently evaluate the
represented solution. Debug readback exposes Float32 `phiHigh` and
`phiCorrection` arrays plus their Float64 sum as `phi`. That host sum is
used only for inspection and independent validation, never step acceptance.

The final RK2 update is written as original + dt(RHS0 + RHS1)/2, with
Kahan compensation for a and chi. An initial uncorrected f32 implementation
lost small increments: Burgers appeared artificially exact on its finest
grid and the manufactured swirl stopped refining. Compensation restored
the measured orders below. A dedicated test adds increments below one
state ulp and verifies their accumulated, correctly rounded result.
This time-accumulation correction is separate from the potential pair.

Diagnostics first reduce per 8×8 workgroup, then reduce all groups on the
GPU to **64 bytes**. Each acceptance decision awaits this current result.
It includes full-vector energy/enstrophy, maxima, slip, divergence,
elliptic residual/scale, transport/source rates, and nonfinite flags.
Ordinary steps never read entire numerical fields back to the CPU.

`step()` rejects unsafe fixed steps, checks evolved trial limits, retries
adaptively, and refuses failed Poisson solves. It publishes time/state only
after final preparation succeeds. Concurrent operations are rejected.
Device loss disables subsequent work. Debug readback includes compensation
so rollback tests cover the hidden accumulation state as well as fields.

## CPU/GPU parity

Five cases run at **16×32**, R = 1, Z = 0.5, for **20 matched steps**
of dt = 2e-4, reaching t = 0.004. CPU and GPU use the same boundary/source
callbacks and the same Poisson parameters: atol = 2e-4, rtol = 1e-4,
maximum 12,000 sweeps, checking every 32 sweeps. These are f32 comparison
tolerances, not the tighter Float64 accuracy settings from phase 1.

Initial and every accepted state compare a, chi, phi, both velocity
components, full-vector diagnostics, time/index, and even axis parity.
The CPU independently evaluates the elliptic residual of the read-back
GPU fields, within 3e-6 of the GPU residual. GPU divergence must stay below
1e-5. Rejected unsafe steps preserve the accepted fields and velocity.

Final maximum absolute field differences:

| Case | a | chi | phi | ur | uz |
|---|---:|---:|---:|---:|---:|
| Rest, closed walls | 0 | 0 | 0 | 0 | 0 |
| Burgers | 4.30e-8 | 1.16e-9 | 0 | 2.98e-8 | 2.98e-8 |
| Lamb–Oseen | 7.63e-8 | 6.37e-9 | 0 | 0 | 0 |
| Axis-sensitive coupled | 2.37e-8 | 2.44e-8 | 1.10e-9 | 1.21e-6 | 3.53e-7 |
| Coupled Thom walls | 1.18e-8 | 6.69e-8 | 7.47e-10 | 2.99e-8 | 1.70e-8 |

Assertions use |GPU-CPU| <= atol + rtol max(|CPU|, scale). The JSON contains
per-field tolerances and error-to-bound ratios. For a: atol 2e-6,
rtol 2e-4, scale 0.1; for chi: 2e-5, 2e-3, 0.1; for phi: 2e-6,
2e-4, 0.01; for both velocities: 1e-5, 2e-3, 0.1. Diagnostic tolerances
are also explicit in the configuration. These are portability bounds;
the measured errors are substantially smaller on this adapter.

Ten additional browser checks pass: initial Poisson budget failure,
trial Poisson budget failure, injected final-preparation failure,
nonfinite source, injected nonfinite GPU data, injected nonfinite potential
correction, concurrent operation,
adaptive retry, device loss, and sub-ulp accumulation. The adaptive retry
accepts 5e-5 on its second attempt and matches a fresh fixed-step run,
including both compensation fields and both potential components.
Three Vitest tests separately cover
host configuration and missing/concurrent adapter initialization; those
three tests do not execute shaders.

## Refinement and performance

At common t = 0.01 with dt capped at 5e-4, Poisson atol 2e-4/rtol 1e-4:

| Case / weighted L2(a) | 16×32 | 32×64 | 64×128 | Orders |
|---|---:|---:|---:|---|
| Burgers | 9.31756e-6 | 2.41031e-6 | 6.14035e-7 | 1.951, 1.973 |
| Coupled Thom | 2.88008e-7 | 5.20586e-8 | 1.11519e-8 | 2.468, 2.223 |

The Thom case also has decreasing chi, phi, velocity, and slip errors.
Maximum slip is 7.04003e-4, 2.02111e-4, 5.22766e-5. L2 phi is
3.81080e-5, 1.10078e-5, 3.61921e-6. Each completed refinement also passes
an independent CPU residual check on the combined potential.
The structured results retain maximum, first-axis-row, and boundary-strip
errors rather than reducing acceptance to one visual comparison.

The 256×512 wall regression averages about **58 ms per awaited step** on
this workstation, with 877 total dispatches including initialization.
These are end-to-end host/GPU times including acceptance readbacks and
manufactured-source sampling, not isolated GPU kernel timings or a
browser frame-rate promise. A 60 Hz simulation rate is not demonstrated.

Persistent GPU allocations are 220,032 bytes at 16×32, 2,738,688 bytes
at 64×128, and 40,922,112 bytes at 256×512. Debug readback temporarily
adds four packed-field buffers' worth of staging memory. Ordinary scalar
checks always transfer 64 bytes regardless of resolution.

The 256×512 Burgers smoke run remains separate: its linear harmonic
potential needs no Poisson sweeps and is not a performance surrogate for
coupled wall flow.

## Potential precision regression

Before this change, the single-component potential failed the strict
64×128 Thom probe at residual 1.14679e-4 after 2,048 sweeps, against target
5.63983e-5. At 256×512, both 512 and 2,048 sweeps stalled at **6.81192e-4**
against the ordinary target 2.63999e-4. Increasing the sweep budget alone
did not help. The corrected representation passes without loosening either
tolerance:

| Probe | Initial sweeps | Initial residual / target | Evolution |
|---|---:|---|---|
| Strict 64×128, atol 5e-5 / rtol 1e-5 | 1,696 | 5.63385e-5 / 5.63983e-5 | 365 accepted steps to t = 0.01 |
| Cold-start 32×64, zero potential guess | 1,728 | 2.26920e-4 / 2.63934e-4 | One accepted step to t = 2e-5 |
| 256×512, budgets 512 and 2,048 | 32 | 1.60390e-5 / 2.63999e-4 | 20 accepted steps each, dt = 1e-6, t = 2e-5 |

Both 256×512 budgets produce the same final fields. The final GPU residual
is **1.40777614e-4**, versus target **2.63998705e-4**; independently applying
the CPU Float64 operator to the combined potential gives **1.40777607e-4**.
Dropping the correction gives **1.08501620e-3**, above that same target.
The fix therefore improves the represented solution, not just the reported
GPU residual. The regression requires this counterfactual failure as well
as successful acceptance. Independent residual agreement is bounded by
3e-6; the measured difference here is 7.28e-12.

At the 256×512 endpoint, L2 phi is 2.39051e-8; L2 ur and uz are both about
3.21e-7. L2 chi is 3.25253e-5, with maximum 1.05752e-3 in the boundary
strip. Maximum divergence is 1.52588e-6 and wall slip is 2.13564e-6.
These short-time errors do not replace the common-time refinement study.
The separate cold start verifies that the GPU also solves from a zero
potential guess, without a CPU elliptic solve providing its initial field.

## Limits and next work

These tests establish the recorded adapter's parity, measured refinement,
and potential precision regression at the documented tolerances. They do
not establish arbitrary accuracy or portability across every WebGPU
implementation. Before selecting 256×512 as the live default, validate
longer physical ring runs and the interactive performance budget. Consider
multigrid if measured convergence cost warrants it. Thom remains the wall
closure; this fix addresses elliptic storage precision.

The first rendering adapter, `compositeOnto(ctx)`, lab controls/charts, and
a short interactive GPU ring run are now implemented; see the
[lab validation report](2026-09-11-ns-axisym-lab-validation.md). Longer GPU
ring convergence studies and high-Reynolds-number acceptance remain future work.
No finite-time blowup or regularity claim follows from these runs.

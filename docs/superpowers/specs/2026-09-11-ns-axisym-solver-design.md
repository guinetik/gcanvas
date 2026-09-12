# Axisymmetric Navier–Stokes Solver — Design

**Date:** 2026-09-11
**Status:** CPU reference, Thom walls, GPU solver, and first interactive 2D
lab implemented. Numerical and browser results are linked below; long-time
physical-flow validation remains separate from this initial release.
**Purpose:** A numerically honest lab for axisymmetric viscous vortex
amplification, motivated by OpenAI's *Finite time blowup for Navier–Stokes*.
Axisymmetry with swirl retains genuine three-dimensional vortex stretching
while allowing computation on an (r, z) grid.

## Relationship to the paper

The paper's Theorem 1.1 constructs a forced flow from rest with smooth,
compactly supported forcing, unbounded velocity at finite time, and bounded
kinetic energy. Its axisymmetric concentrating background alone has a
singular momentum residual. Non-axisymmetric oscillatory pulses supply
averaged momentum fluxes that cancel this residual; further corrections
make the remaining forcing smooth (§§2.2, 3.3–3.4, 10).

This lab studies axisymmetric amplification and viscous competition. It
does not reproduce those angular disturbances or test the full proof.
Reproducing the construction would require additional dynamics and
resolution across its hierarchy of scales. Finite simulations can explore
resolved behavior, but cannot certify a singularity or its absence.

The Luo–Hou cylinder scenario is a separate reference: the original
numerical study concerns Euler flow with axial periodicity and an
impermeable wall, not viscous flow in a closed no-slip cylinder. The lab's
ring experiment must not be presented as a reproduction of that scenario.

## Decisions made

| Axis | Decision |
|---|---|
| Purpose | Study resolved axisymmetric amplification with visible numerical diagnostics |
| Dynamics | Axisymmetric Navier–Stokes with swirl and positive viscosity |
| Platform | WebGPU compute, f32, in-browser; no WebGL fallback |
| Formulation | Regularized vorticity–streamfunction with swirl |
| Validation | CPU Float64 reference, analytic solutions, convergence, GPU parity |
| Deliverable | Live lab page with instruments + validated presets |

## 1. Fields, grid, and equations

Use cylindrical coordinates and `ω = curl u`, so
`ω_θ = ∂_z u_r − ∂_r u_z`. Evolve two cell-centered fields:

- `a = u_θ/r` — regularized swirl, finite and even at the axis.
- `χ = ω_θ/r` — regularized azimuthal vorticity, finite and even at the axis.

Solve for the cell-centered potential `φ = ψ/r²`, where `ψ` is the Stokes
streamfunction. Define

```text
L5 = ∂_rr + (3/r)∂_r + ∂_zz
−L5 φ = χ
u_r = −r ∂_z φ
u_z = 2φ + r ∂_r φ
u_θ = r a
Γ = r u_θ = r² a
ψ = r² φ
```

With `u·∇ = u_r ∂_r + u_z ∂_z`, evolve

```text
∂_t a + u·∇a = 2a ∂_z φ + ν L5 a
∂_t χ + u·∇χ = ∂_z(a²) + ν L5 χ
```

These are the full axisymmetric equations for this variable choice. Label
the signed source texture `∂_z(a²)` as "swirl source for χ". This source
produces azimuthal vorticity from axial swirl variation; it is not the
entire vector stretching term `(ω·∇)u`.

For comparison, the equivalent angular-momentum equations are

```text
LΓ = ∂_rr − (1/r)∂_r + ∂_zz
∂_t Γ + u·∇Γ = ν LΓ Γ
∂_t χ + u·∇χ = ∂_z(Γ²)/r⁴ + ν L5 χ
−LΓ ψ = r² χ
```

`Γ` and `χ` have different diffusion operators. Compute the source from
stored `a`, never by dividing a differentiated `Γ²` by `r⁴`.

### Grid and axis

Domain `[0, R] × [−Z, Z]`, uniform spacing, config-driven. The first live
lab starts at a 32×64 interactive preview with R = Z = 1; 64×128 and higher
are available for refinement. 256×512 remains an optional heavier
setting pending longer physical-flow/performance acceptance. Scalar samples
start at `r = Δr/2`; meridional velocity
fluxes live on cell faces. Document scalar, face, and corner indices in
the CPU reference before porting its stencils.

At the axis, `a`, `χ`, and `φ` have even ghost extensions. Consequently
`u_θ = O(r)`, `Γ = O(r²)`, and `ψ = O(r²)`; `u_r` is odd and `u_z` is
even. Do not set the first interior swirl sample to zero. Merely avoiding
division by zero does not enforce regularity. Use even ghost values in
`L5`; for a smooth even scalar `f`, its radial axis limit is
`lim[r→0](∂_rr f + 3∂_r f/r) = 4∂_rr f(0)`.

Reconstruct the regular even `φ` at shared corners, then form
`ψ_corner = r_corner² φ_corner` using the exact corner radius. Supply
boundary values from the active policy and set axis `ψ` to zero. Do not
simply average cell-centered `r²φ` at the first radial face: that introduces
a spurious axis velocity even for constant `φ`. The reconstruction must
recover uniform axial flow exactly and converge for smooth even profiles.
Streamfunction differences give face volume fluxes:

```text
r_face u_r_face = −δ_z ψ_corner
u_z_face = δ_r ψ_corner / r_cell
```

This makes the cylindrical cell divergence cancel algebraically. Set the
axis radial volume flux to zero without dividing by `r_face = 0`. Use the
same face fluxes for transport and divergence diagnostics. Interpolation,
velocity recovery, and the elliptic stencil must converge together; retain
a measured divergence residual because f32 still introduces roundoff.

### Boundary policies

Each preset selects an explicit policy. Reapply boundary and ghost values
at every Runge–Kutta stage and at its stage time.

1. **Analytic boundaries:** Burgers and Lamb–Oseen prescribe their exact
   `a`, `χ`, and `ψ` on the outer radial and axial boundaries, with compatible
   ghost reconstruction and face fluxes. These boundaries can carry energy
   and momentum; do not apply a closed-domain energy test to them.
2. **Stationary no-slip cylinder:** The ring experiment uses `a = 0`,
   `ψ = 0`, and `∂_n ψ = 0` on the outer wall and end caps. Constant `ψ`
   enforces impermeability; its normal derivative enforces zero meridional
   tangential velocity. Determine wall `χ` and diffusion ghosts from the
   streamfunction and the tangential-velocity constraint. Do not set wall
   `χ = 0`, or treat Dirichlet `ψ` alone as no-slip.

For no-slip, solve the second-order elliptic equation with Dirichlet
potential data; enforce the derivative constraint through wall-vorticity
closure, not as an extra independent elliptic boundary condition.

**Phase 2 baseline: Thom's wall-vorticity formula.** Adapt it to the
regularized variables and actual wall-to-cell-center distance (`Δn/2` on
this grid), and document coefficients, diffusion ghosts, and corner
treatment in the CPU reference. Refresh wall vorticity from the current
stage's solved potential before evaluating diffusion. Additional
wall/elliptic iteration is not required for the initial implementation.

Thom's closure is locally first order at the boundary; that alone does not
determine the complete solver's global convergence order. Measure wall-slip
residuals from the reconstructed solution, rather than reporting a boundary
velocity explicitly set to zero, and retain the global refinement tests.
Keep Thom if those checks meet the accuracy targets. Upgrade to a polynomial
closure with second-order boundary consistency, or add wall/elliptic
iteration, only when measured wall-slip or global convergence failures are
attributable to the closure. Neither upgrade is a prerequisite for phase 2.

### Spatial discretization and time stepping

Use second-order diffusion, elliptic, and source differences. Use
second-order limited upwind reconstruction (MUSCL with an MC limiter) for
advection, with cylindrical volume weights. Approximate `u·∇f` by flux
divergence minus `f` times measured discrete velocity divergence, preserving
constant fields through transport. Limiters can reduce local order at
extrema; measure the complete scheme's convergence.

Use unsplit SSP-RK2 for `q = (a, χ)`:

```text
q*    = qⁿ + dt F(qⁿ, tⁿ)
qⁿ⁺¹ = ½qⁿ + ½[q* + dt F(q*, tⁿ + dt)]
```

Every `F` evaluation includes advection, both sources, and diffusion, with
`φ` and velocity recovered from that stage state. Refresh the accepted
state's potential and diagnostics as well. RK2 applied only to advection
followed by a separate source/diffusion update is not this method.

Choose `dt` per simulation step using all of:

- Advection: a configured safety factor times
  `1/max(|u_r|/Δr + |u_z|/Δz)` over the reconstruction stencil.
- Diffusion: a conservative bound from the actual `ν L5` matrix, including
  axis and wall closures. A monotone interior stencil has the forward-Euler
  bound `dt ≤ 1/max(−ν L5_ii)`; validate the full boundary-coupled scheme
  rather than applying a Cartesian bound blindly.
- Source/strain resolution: a configured cap on the fractional step from
  `2∂_z φ` and a scaled norm of the explicit source increment, with
  documented absolute floors. This resolves rapid growth; it does not
  suppress physical amplification or guarantee nonlinear stability.

Handle zero rates without division by zero. Validate the combined
advection/diffusion operator's step bound: taking the minimum of separate
forward-Euler limits alone need not preserve positivity. Use a conservative
combined rate bound and verify it in the CPU reference. Check the trial
stage against the same limits; reject and retry with smaller dt as needed.
Unsafe fixed steps pause instead of bypassing checks. Save seed, fixed
accepted dt, grid, coefficients, and boundary policy for repeatable runs;
cross-device f32 results need not be bitwise identical.

### Elliptic solve and numerical validity

Start with red-black Gauss–Seidel for `−L5φ = χ`, warm-started from the
previous stage. Use a mixed absolute/relative residual target with documented
normalization and units; handle `χ = 0` (as in Burgers). Check boundary
residuals separately. Iteration count is a maximum budget, not a convergence
criterion. CPU refinement tests establish tolerances that keep elliptic
error below measured discretization error.

If the iteration budget is exhausted, flag the step as unconverged and
pause. A small fixed sweep count is not assumed adequate at 256×512. If GS
cannot meet the runtime budget, add multigrid before claiming a validated
live default. A Poisson residual measures algebraic error, not total
solution error or an error bar on a blowup estimate.

## 2. WGSL pipeline

Module `src/webgpu/ns-axisym-solver.js` owns its GPUDevice and compute
buffers: `init() → Promise<bool>`, awaited `initialize()` and `step()`,
timestamped `diagnostics()`, debug `readback()`, and `destroy()`. Phase 3
keeps rendering separate from numerical acceptance. Phase 4 implements
`NSAxisymView` in `src/webgpu/ns-axisym-view.js`, with an offscreen canvas
and `compositeOnto(ctx)`, consuming accepted GPU buffers without a full
field readback each frame. `presentationState()` lends buffers only for
immediate read-only command submission; later solver steps can recycle them.
A timestamped radial profile uses 16×nr bytes of readback at most four
times per second, independently of the 64-byte numerical acceptance checks.
Presentation caches its rendered image until the accepted state, view
settings, or canvas size changes, so idle frames do not submit field draws.
The UI reports simulated-time progress per real second and offers a fast
preview reset; the numerical timestep is never enlarged for playback.
Shaders in `src/webgpu/shaders/ns/`, one `.wgsl?raw` file per pass. Exported
via `src/webgpu/index.js`. No WebGL fallback; the page shows a
"needs WebGPU" card.

The implemented f32 RK2 uses compensated accumulation of the two evolved
fields to retain increments smaller than one state ulp. The potential uses
two f32 components, a main value and a small correction, to resolve the
measured 256×512 elliptic residual floor. Residuals, boundaries, and derived
fields consume both components. Every shader operation remains f32; this
limited representation does not implement full IEEE binary64 arithmetic.
Debug readback reconstructs their sum in a Float64 array for independent
CPU validation; GPU acceptance uses the two stored components directly.
Two reduction dispatches produce a 64-byte result for each awaited check.
The [GPU validation report](../plans/2026-09-11-ns-axisym-gpu-validation.md)
records the passing strict-tolerance, cold-start, and 20-step 256×512 wall
regressions. Long-time physical-flow and live-performance validation remain.

Compute passes use 8×8 workgroups:

1. `boundary.wgsl` and `poisson.wgsl` — stage boundary data, wall-vorticity
   closure, red/black sweeps, and convergence checks.
2. `velocity.wgsl` — shared streamfunction reconstruction, compatible face
   fluxes, cell velocity, and reductions for step limits.
3. `rhs.wgsl` — limited advection, diffusion, and both sources from one
   immutable stage state; writes the RHS and signed swirl-source texture.
4. `rk-stage.wgsl` — combines original state, stage state, and RHS;
   validates the trial state before acceptance. Repeat boundary, elliptic,
   velocity, and RHS work for the second RK stage.
5. `diagnostics.wgsl` — reductions on the accepted state with physical time
   and step index attached to every readback.

Keep the original state until acceptance for retries. Allocate independent
stage/RHS buffers, potential storage, ghost data, velocity/source fields,
and reduction scratch. Red and black sweeps require separate dispatches:
workgroup barriers cannot synchronize different workgroups. Ping-pong
storage must preserve the untouched color across each sweep.

Step acceptance depends on current stability and convergence results.
Use GPU-side gating or awaited small readbacks; delayed UI readbacks must
never authorize unchecked steps. Instruments may asynchronously display
the last accepted sample, clearly timestamped.

Measure memory and dispatch counts from implemented stages and actual
Poisson convergence; do not assume 50 dispatches per step. Steps-per-frame
is a maximum scheduling budget. Slow hardware advances less simulated
time rather than loosening tolerances.

## 3. Lab page

Recover the full vorticity vector for diagnostics:

```text
ω_r = −r ∂_z a
ω_θ = r χ
ω_z = 2a + r ∂_r a
```

Use `|ω|` from all three components, never `|χ|` alone. Integrate with
cylindrical cell volumes `dV = 2π r Δr Δz`:

```text
E = ½ ∫ (u_r² + u_θ² + u_z²) dV
enstrophy = ½ ∫ |ω|² dV
```

For the unforced stationary no-slip case,
`dE/dt + ν∫|ω|² dV = 0` in the continuum. Measure the discrete budget
defect, including numerical advection dissipation, and verify that it
converges away. Analytic-boundary runs require boundary energy flux and
viscous work in their budget.

`demos/ns-lab.html` + `demos/js/ns-lab.js` (`ns-lab-ui.js` if the panel
grows, mirroring the singularity split). Extends `Game`, DEFAULTS +
deepMerge, fluid size. Nav entry under Physics. Info panel in the standard:
eyebrow "physics".

Layout — field left, instruments right:

- Field view: mirror the half-plane for scalar fields and apply cylindrical
  parity correctly to vector overlays. Modes: angular momentum `Γ`, `|ω|`,
  signed swirl source for `χ`, and streamlines. Optional NeonGlow and a
  plain toggle. Passive dye is deferred. An optional "revolve" view (the
  axisymmetric field swept around the axis as a 3D impression) may be added
  after the 2D view ships; any such render must remain visibly
  ring-symmetric — no fake non-axisymmetric turbulence.
- No pressure view: pressure never appears in this formulation and would
  require a second elliptic solve. Out of scope.
- Strip charts in GCanvas shapes: `max|ω|` and `max|u|`; energy and enstrophy;
  optional `1/max|ω|` with a linear fit. The reciprocal chart uses linear
  axes for its zero intercept; log charts handle zero without logging it.
- Label the fit "reciprocal-vorticity linear extrapolation" and show its
  time window and fit residual. It assumes growth proportional to
  `1/(T−t)`, which is not implied by the paper. Hide the intercept for flat
  or increasing reciprocal data, zero vorticity, or insufficient samples.
- Status: accepted dt and its limiting mechanism, elliptic and divergence
  residuals, wall-slip residual, iterations, steps/s, and resolution.
  Show core width in grid cells, flag under-resolution, and suppress
  extrapolation for unconverged or under-resolved runs. Define width per
  preset; mark ambiguous multi-peak fits unavailable.

Presets:

1. **Burgers check:** With strain `α > 0`, circulation `C`, and viscosity
   `ν > 0`, initialize and prescribe analytic boundaries from
   `u_r = −αr/2`, `u_z = αz`,
   `Γ = C/(2π)[1 − exp(−αr²/(4ν))]`, `χ = 0`, and `φ = αz/2`.
   Evaluate `a = Γ/r²` using `expm1` and its axis limit `Cα/(8πν)`.
   The closed form in `demos/js/navier-stokes.js` supplies the same swirl
   profile. Overlay analytic and computed velocity profiles. Boundary data
   maintain the imposed strain; this is not a closed-cylinder equilibrium.
   Lock analytic parameters during a run; changing them resets the test.
2. **Lamb–Oseen decay:** Choose initial age `t0 > 0` for smooth data,
   `Γ = C/(2π)[1 − exp(−r²/(4ν(t+t0)))]`, `χ = φ = 0`.
   Prescribe time-dependent analytic boundaries at every stage. Compare the
   fitted Gaussian vorticity width with `sqrt(4ν(t+t0))`; this width is not
   the radius of peak swirl speed. Lock parameters during the test. Energy
   refers to the finite computational cylinder, not the infinite vortex.
3. **Interacting swirl rings:** Smooth opposite-signed swirl annuli inside
   a stationary no-slip cylinder, with optional initial meridional motion
   from a smooth streamfunction. Initialize `χ` from that potential and
   choose profiles supported away from walls and regular at the axis.
   Record explicit formulas and parameters in the preset config. Subsequent
   motion follows the unforced equations, with no scripted forcing toward
   a wall. This is an exploratory interaction preset.

Controls: positive ν slider (log), preset switcher, pause + single-step,
R reset, view-mode cycle, steps-per-frame. Show boundary policy and
validation status alongside the preset. Mobile: panel toggle like
navier-stokes.

The first lab is available at `demos/ns-lab.html`, linked under Physics.
See the [lab validation report](../plans/2026-09-11-ns-axisym-lab-validation.md)
for implemented controls, browser checks, and limits. Reciprocal-vorticity
extrapolation and the optional revolve view remain deferred. Ring runs
label their initial support width; a unique evolving core width is not
assumed. Analytic runs fit the Gaussian vorticity width when resolved.

## 4. Validation and implementation order

Implement `src/math/ns-axisym.js` first as the CPU Float64 reference.
Document stencil coefficients, grid locations, ghost rules, elliptic
tolerances, and step limits there. Port validated operations to WGSL.

`test/ns-axisym.test.js` (vitest) must cover:

1. **Operator and axis consistency:** Even polynomial fields test `L5`,
   the first radial row, elliptic sign, and equivalence with Γ equations.
   Nonzero analytic potentials test velocity and full vorticity recovery.
2. **Burgers:** Steady profile error and drift converge under spatial
   refinement on a fixed domain (16×32 → 32×64 → 64×128, extended if not
   yet asymptotic). Reduce dt and solve tolerance enough to isolate spatial
   error. Check smooth norms and maximum error; expect second order for
   smooth resolved fields rather than a magic tolerance.
3. **Lamb–Oseen:** Profile error and fitted Gaussian width converge to the
   positive-age analytic solution at fixed physical times.
4. **Coupled manufactured solution:** Choose smooth regular `a` and `φ`,
   derive `χ = −L5φ` and analytic source terms independently, and supply
   sources only through the test harness. Exercise nonzero advection,
   swirl source, diffusion, and time-dependent boundaries together. Verify
   spatial convergence and RK2 temporal order with separate refinements,
   exposing stale stage velocities or source splitting.
5. **No-slip and energy:** A compatible smooth closed-cylinder manufactured
   case checks reconstructed wall/corner velocity and global convergence
   with Thom's baseline closure. Do not require second-order local boundary
   truncation error; use measured wall-slip and solution errors to decide
   whether the closure needs upgrading. A separate unforced viscous decay
   run checks the integrated energy budget and convergence of its defect,
   including numerical dissipation.
6. **Validity controls:** Check axis parity and finite fields over a long
   resolved run, reject unsafe steps (including diffusion-limited cases),
   and refuse unconverged elliptic solutions. Zero-flow and zero-χ cases
   must not divide by zero in diagnostics or relative residuals.

GPU↔CPU parity: in-browser debug check behind `?debug`, 16×32 grid,
20 steps with matched boundary policy, accepted dt, and solve tolerances.
Compare state, recovered velocity, diagnostics, and residuals using
`|GPU−CPU| ≤ atol + rtol·max(|CPU|, characteristic_scale)` with documented
per-field scales and tolerances. Include an axis-sensitive coupled case
and a no-slip case. Report visible pass/fail and structured results;
CPU-only CI must not be described as GPU validation.

Burgers is the permanent user-visible regression check, but does not
exercise nonzero χ or every coupling. Acceptance of the live default also
requires GPU parity and a measured convergence and performance run at the
intended resolution. Resolution or f32 limits that prevent validation are
visible run states, not evidence of blowup.

## Out of scope (explicitly)

- Full non-axisymmetric 3D dynamics, the paper's oscillatory stress
  construction, and proof verification.
- Reproduction of the Luo–Hou Euler boundary-singularity scenario.
- Pseudo-spectral methods, full IEEE binary64 GPU emulation, and adaptive
  mesh refinement. The measured need for a two-f32 potential correction
  above is a limited precision measure within scope.
- Claims of observed or excluded finite-time blowup from this lab.

## References

- OpenAI, *Finite time blowup for Navier–Stokes*, local source
  `C:\Users\guinetik\Documents\NS-OpenAI.pdf`, especially §§2–3 and 10.
  [Official companion repository](https://github.com/openai/NavierStokesAndEuler).
- Hou, *Blow-up or no blow-up? A unified computational and analytic
  approach to 3D incompressible Euler and Navier–Stokes equations*, for
  regularized axisymmetric variables:
  [author-hosted review](https://users.cms.caltech.edu/~hou/papers/Acta_Num_Hou_09.pdf).
- Luo and Hou, *Potentially Singular Solutions of the 3D Incompressible
  Euler Equations*, for the distinct periodic-cylinder setting:
  [original study](https://arxiv.org/abs/1310.0497).

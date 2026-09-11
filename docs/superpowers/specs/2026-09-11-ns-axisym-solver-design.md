# Axisymmetric Navier–Stokes Solver — Design

**Date:** 2026-09-11
**Status:** Approved in brainstorming; pending spec review
**Purpose:** A numerically honest Navier–Stokes solver for studying vortex
amplification phenomena (motivated by OpenAI's Sep 2026 finite-time blowup
paper), delivered as a live lab demo page. Not an art toy first — an
instrument. 2D NS is globally regular, so honesty requires genuine 3D
dynamics; axisymmetric-with-swirl is the tractable honest subset (where the
Burgers vortex and the Luo–Hou scenario live).

## Decisions made

| Axis | Decision |
|---|---|
| Purpose | Study the paper honestly (not primarily an art medium) |
| Dynamics | Axisymmetric with swirl on an (r, z) grid — real vortex stretching |
| Platform | WebGPU compute, f32, in-browser; no WebGL fallback |
| Formulation | Vorticity–streamfunction with swirl (approach A) |
| Deliverable | Live lab page with instruments + validated presets |

## 1. Fields, grid, discretization

State: three scalar fields on a uniform staggered (r, z) grid.

- `Γ = r·u_θ` — angular momentum (swirl). Finite at the axis by construction.
- `χ = ω_θ / r` — scaled azimuthal vorticity (smooth across the axis; the
  Luo–Hou variable choice).
- `ψ` — Stokes streamfunction, solved from χ each step;
  `u_r = −∂_z ψ / r`, `u_z = ∂_r ψ / r` (incompressibility by construction —
  no divergence drift at f32).

Evolution equations:

- `∂_t Γ + u·∇Γ = ν ∇²_* Γ`
- `∂_t χ + u·∇χ = ∂_z(Γ²)/r⁴ + ν ∇²_* χ`

The `∂_z(Γ²)/r⁴` term is vortex stretching — the amplification mechanism.
It gets its own texture and is rendered as a live heat map in the lab.
`∇²_*` is the axisymmetric Laplacian for the r-weighted variables.

Grid: cell-centered, first sample at `r = Δr/2` (never divides by r=0).
Domain `[0, R] × [−Z, Z]`. Axis BC: Γ = 0, χ even (ghost mirror). Outer,
top, bottom: no-slip walls (ψ = 0, Γ = 0) — walls are where Luo–Hou blowup
lives; a feature. Default resolution 256×512, config-driven.

Numerics: 2nd-order centered differences for diffusion and stretching;
3rd-order upwind-biased advection (centered advection rings at f32 and can
fabricate a fake singularity — the one unforgivable bug here); RK2 time
stepping; CFL-clamped dt recomputed per frame. Poisson: red-black
Gauss–Seidel in WGSL, iteration count from config, with a residual readback
displayed in the lab at all times — honesty includes showing error bars.

## 2. WGSL pipeline

New module `src/webgpu/ns-axisym-solver.js`, following the existing pipeline
contract: self-contained class owning its GPUDevice and offscreen canvas,
`init() → Promise<bool>`, per-step compute, `compositeOnto(ctx)`, `destroy()`.
Shaders in `src/webgpu/shaders/ns/`, one `.wgsl?raw` file per pass. Exported
via `src/webgpu/index.js`. No WebGL fallback; the page shows a
"needs WebGPU" card.

Compute passes per step (8×8 workgroups):

1. `velocity.wgsl` — u_r, u_z from ψ; max|u| reduction for CFL.
2. `advect.wgsl` — upwind transport of Γ and χ (RK2, ping-pong).
3. `stretch-diffuse.wgsl` — stretching source + viscosity; writes the
   stretching-magnitude texture.
4. `poisson.wgsl` — red-black GS sweeps on ψ (2×N dispatches); residual
   reduction on the last sweep.
5. `diagnostics.wgsl` — parallel reduction: max|ω| + location, kinetic
   energy, enstrophy, core radius (swirl-peak radius on the max-ω z-slice).
   One small buffer, read back asynchronously (instruments lag one frame).

Ping-pong pairs for Γ, χ, ψ; single textures for velocity and stretching.
~20 MB at default resolution. Determinism knob: `seed` + fixed-dt mode
(CFL clamp off) for reproducible runs, regression tests, and parameter
sweeps. Budget: ~50 dispatches/step; steps-per-frame exposed so slow
machines compute slower, never wronger.

## 3. Lab page

`demos/ns-lab.html` + `demos/js/ns-lab.js` (`ns-lab-ui.js` if the panel
grows, mirroring the singularity split). Extends `Game`, DEFAULTS +
deepMerge, fluid size. Nav entry under Physics. Info panel in the standard:
eyebrow "physics".

Layout — field left, instruments right:

- Field view: the (r, z) half-plane mirrored across the axis (reads as a
  full cross-section). View modes: swirl Γ, |ω|, stretching source,
  streamlines-over-dye. NeonGlow may composite on top; a "plain" toggle
  exists for honest screenshots.
- Instruments: three log strip charts in plain GCanvas shapes —
  `max|ω|(t)`; `E(t)` + enstrophy; and `1/max|ω| vs t` with a dashed linear
  extrapolation to zero (labeled "estimated blowup time — extrapolation").
  Status row: CFL dt, Poisson residual, steps/s.

Presets:

1. **Burgers check** — initialize from the closed form in
   `demos/js/navier-stokes.js`; must hold steady. Overlay analytic vs solved
   profile. The oracle preset; a live self-test.
2. **Lamb–Oseen decay** — overlay analytic core growth `√(4νt)`.
3. **Colliding swirl rings** — opposite-signed swirl annuli driven toward
   the outer wall; the Luo–Hou-flavored amplification scenario.

Controls: ν slider (log), preset switcher, pause + single-step, R reset,
view-mode cycle, steps-per-frame. Mobile: panel toggle like navier-stokes.

## 4. Testing

- `src/math/ns-axisym.js` — CPU Float64 reference solver, same grid and
  stencils, small and slow. It is the specification the WGSL ports.
- `test/ns-axisym.test.js` (vitest, against the CPU reference):
  1. Burgers steady state: residual at discretization level and converging
     at 2nd order across 16×32 → 32×64 → 64×128 (order is the assertion,
     not a magic tolerance).
  2. Lamb–Oseen: fitted core growth within a few % of `√(4νt)`.
  3. Energy budget: `dE/dt + dissipation ≈ 0` unforced.
  4. Axis regularity: symmetry preserved, no NaN over a long run.
- GPU↔CPU parity: in-browser debug check behind `?debug` — 16×32 grid,
  20 steps, max relative error under an f32 tolerance, console-reported.
  The only bridge across "CI can't see the GPU."
- The Burgers oracle preset is the permanent user-visible regression test.

## Out of scope (explicitly)

- Full 3D solver, pseudo-spectral methods, f64 GPU emulation.
- Reproducing the paper's forced construction (asymptotic; not simulable).
- Claiming observation of blowup — the lab shows amplification trends and
  extrapolations, always labeled as such.

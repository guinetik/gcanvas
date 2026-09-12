# Axisymmetric NS lab — first interactive view

**September 12 update:** the default is now a driven preset with pointer/touch
stirring. The original decay experiment remains selectable. See the
[driven-flow report](2026-09-12-ns-axisym-driven-validation.md) for its source
model and sustained-motion checks; the results below record the earlier
unforced baseline.

**Date:** 2026-09-11. The first 2D lab is implemented at
`demos/ns-lab.html`, linked under **Physics** in the demo navigation.
It uses the validated solver with Thom walls; numerical tolerances are
unchanged. The live preview starts at **32×64, R = Z = 1, ν = 0.01**, with
a maximum batch of four safe steps and flow-direction arrows enabled.
The 256×512 setting remains available for heavier experiments, without
claiming long-time or real-time acceptance at that resolution.

## What runs

- `demos/js/ns-lab.js`: a GCanvas `Game` with a field `GameObject`, async
  step scheduling, accepted-state histories, and resource cleanup.
- `demos/js/ns-lab-ui.js`: accessible DOM controls and GCanvas chart
  objects on a second canvas, rendered by the same animation schedule.
- `src/webgpu/ns-axisym-view.js` and `shaders/ns/view.wgsl`: direct GPU
  rendering of accepted buffers, plus a small cross-section extraction.
  The adapter owns its canvas and profile storage; the solver owns the
  shared device. Both view and solver are exported by GCanvas, as are the
  three numerical preset factories needed by the published demo bundle.

Field modes are signed angular momentum Γ, full vorticity magnitude |ω|,
signed swirl source ∂z(a²), meridional streamlines (ψ contours), and
regularized swirl a. The half-plane is mirrored at the axis; vector arrows
reverse their radial component and retain their axial component. There
is no invented angular turbulence. Streamline coverage uses the bilinear
field gradient to avoid asymmetric hardware-derivative antialiasing.

The color range stays fixed during evolution; contrast and plain-color
controls change presentation only. The charts use accepted physical time,
with zero-safe logarithmic energy/enstrophy and maximum-speed/vorticity
axes. A radial uθ profile includes the exact curve for Burgers and
Lamb–Oseen at the profile's own timestamp.

Profiles transfer **16×nr bytes** at most four times per second: **1,024
bytes** at 64×128, or **512 bytes** at the preview grid. Rendering performs no full-field readbacks.
The solver's acceptance checks still await their separate 64-byte GPU
reduction. The view submits read-only commands synchronously before the
borrowed accepted buffers may be recycled by a later solver step.
The rendered image is cached on a separate presentation canvas until
accepted time/state, view settings, or display size changes. Unchanged
animation frames do not resubmit the field shader or recopy its WebGPU
canvas. This reduces competition between presentation and solver work.

The guide explains why a spinning axisymmetric scalar field does not
rotate on screen. The UI measures accepted simulation-time progress and
step throughput per real second, including scheduling gaps. Fine grids
offer a **Use fast preview** reset, without changing viscosity or the
physical ring parameters. Increasing the step budget never enlarges dt.

Changing grid, viscosity, or preset resets the experiment. Reset waits for
pending work, discards stale samples, and destroys the old resources.
Pause finishes any pending accepted step; single-step advances exactly one
step. Failed solves pause with a visible reason. Missing WebGPU and device
loss are visible states. Backgrounding pauses the simulation. Playback
starts automatically unless reduced motion is requested or `?paused=1` is
present. `?debug` exposes `window.nsLab` for browser validation.

## Verification

The full baseline passed **537 tests in 35 files** under native Node/Vitest
(160.64 seconds). After the playback/presentation changes, all four
instrument tests were rerun under native Node and pass.
The four new instrument tests recover Gaussian widths and reject zero,
flat, inverted, unresolved, or strongly non-Gaussian fits, and check that
reset preset viscosity remains consistent. The Vite library build and
both Terser minifications pass. Existing duplicate `probabilityDensity`
and output-format warnings remain. No TypeScript checker or ESLint check
is configured in this repository.

The actual-browser lab suite passes **28 checks** on Chrome 153 / NVIDIA
Lovelace (`isFallbackAdapter: false`), including desktop and mobile:

- Initial preview ring solve: 672 sweeps; residual **2.14909e-4** below
  target **2.73357e-4**. Seventy-five interactive steps reach
  **t = 0.101784** in **3.41 real seconds**, with energy **0.131726**.
  The scalar image changes by **13.25%** (summed absolute RGB difference
  divided by initial summed RGB values), exceeding the 5% regression
  threshold. This establishes visible short-time evolution on the recorded
  hardware, not a convergence study or a portable performance guarantee.
- All five rendered modes are nonblank. Reflected scalar images differ
  by at most **1/255 per color channel** in the 256×256 image comparison.
- Presentation makes **zero full-field readbacks** and preserves physical
  time while paused. The radial profile agrees with interpolation of an
  independent debug field copy within **9.34e-8**. Unchanged frames reuse
  their image. Toggling arrows visibly changes 4,434 pixels in the 256×256
  comparison, with scalar values and physical time preserved.
- Play, pause, single-step, both analytic presets, viscosity/grid reset,
  fast-preview reset, reset during a pending step, and the under-resolution
  notice pass.
- Injected solve failure, absent WebGPU, and device loss pause visibly.
  No GPU validation errors were reported. Desktop has no horizontal
  overflow; the 390-pixel mobile instruments toggle opens correctly.

Structured evidence: [lab-results.json](2026-09-11-ns-axisym-lab-results.json).
The browser checks take about 6.63 seconds before screenshot/mobile work.
Screenshots were inspected at 1440×1080 and 390×844 viewport sizes.

The separate CPU/GPU parity, refinement, strict-tolerance, cold-start, and
256×512 precision regressions also pass after integration (31.61 seconds).
The 256×512 final independent residual remains **1.40777607e-4**, with the
same error norms and tolerance as the [GPU report](2026-09-11-ns-axisym-gpu-validation.md).

## Reproduce

```sh
npm run dev
# Open http://localhost:9195/demos/ns-lab.html

node scripts/validate-ns-webgpu.mjs --lab --output lab-results.json
# Optionally add --screenshot <existing-directory>/lab.png for desktop,
# mobile, and expanded-mobile captures plus the mobile toggle check.

node scripts/validate-ns-webgpu.mjs --performance --output gpu-results.json
node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1 --minWorkers=1
```

The browser runner uses its own localhost port **5199** and isolated
Chrome profile; it closes the browser/server afterward. Run one browser
validation process at a time. The ordinary preview server can stay open.

## Scope limits

### Presentation update · 2026-09-12

The lab now uses the shared `demos.css` font stacks and terminal palette.
Its header, field, and footer fit a fixed viewport grid; the field no longer
has a 480px minimum height. Experiment, Numerics, and Charts share a tabbed
instrument panel. On mobile the panel opens over the field, and experiment
notes open in a bounded overlay. Long content can scroll within its own
panel on short screens, without scrolling the page.

The updated Chrome integration run passes **37 checks**, including the
existing solver and presentation checks, both desktop overflow dimensions,
keyboard tab navigation, notes opening and closing, mobile chart rendering,
and a landscape viewport. Screenshots were inspected at 1440×1080 and
390×844; page bounds were also checked at 844×390. Numerical equations,
solver tolerances, presets, and the Physics gallery entry are unchanged.
Evidence: [layout-results.json](2026-09-12-ns-axisym-layout-results.json).

### Numerical scope

The ring experiment starts with the documented compact profile, support
half-widths 0.22 radially and 0.23 axially, separation 0.7, swirl strength
2, and potential strength 0.002. Its displayed width is explicitly the
initial radial support half-width, not a measurement of a deforming ring's
current core. Analytic runs show a Gaussian fit when available and flag
fewer than six radial cells across the width.

This first lab has no reciprocal-vorticity extrapolation, pressure solve,
or optional 3D revolve view. A Poisson pass does not certify total solution
accuracy. Longer ring convergence studies and the high-resolution runtime
budget remain separate work; no finite-time singularity claim is made.

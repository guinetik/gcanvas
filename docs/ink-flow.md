# Fluid Dynamics · Ink Flow

Open `demos/fluid-dynamics.html` or **Physics → Fluid Dynamics · Ink Flow**.

Drag to push the fluid and paint ink. Tap deposits ink and a small rotating impulse;
holding continues stirring. Each new stroke changes color. Shift reverses the spin.
Touching the fluid resumes a paused experiment. Set **Auto stir** to zero for manual
painting, or leave it on for continuously moving dye jets. Space pauses, R reseeds,
and H toggles controls. Clear container removes velocity and dye; active automatic
jets subsequently refill it. Resize preserves/resamples the current flow.

**Ink palette** offers Original Ink plus the six themes shared with the other
Navier–Stokes demos: Copper Tide, Ion Ice, Electric Orchid, Aurora, Solar Flare,
and Moonstone. Selection recolors all existing ink immediately, including paused
frames. The three transported dye quantities stay unchanged; a display color matrix
maps them into the chosen palette before exposure. CPU and GPU use the same matrix.
Original Ink restores the original RGB appearance exactly. Palette selection persists
through reseeding, clearing, quality changes, and resizing. Flow-speed colors retain
their fixed scale independently of the ink palette.

This is a separate planar, grid-based incompressible Navier–Stokes graphics demo.
`FluidGrid2D` is exported by GCanvas, and `FluidDynamicsDemo extends Game` owns input,
the update loop and GCanvas UI. `InkField extends GameObject` presents transported RGB
concentrations through Painter. Optional tracers follow computed velocity; they do
not drive the simulation. **Flow speed** colors the actual velocity magnitude.

Velocity and pressure run on the CPU using typed arrays. Face-centered velocity on a MAC grid,
semi-Lagrangian midpoint backtracing, implicit viscous diffusion and SOR pressure
projection evolve the flow. A separate WebGL2 half-float texture transports RGB dye
with bounded forward/backward correction to reduce smearing. The GPU samples the
staggered velocity grid directly; changing ink quality does not change the physics
grid. Only the small velocity texture is uploaded each step, with no GPU readbacks
in the animation loop. Walls block normal
flow and allow tangential slip. Pressure projection and diffusion have finite
iteration budgets: this is an interactive graphics approximation, not the validated
axisymmetric reference solver. Dye fading and moving body-force jets are explicit
presentation choices. It follows the advection/projection approach of
[Jos Stam’s Stable Fluids](https://doi.org/10.1145/311535.311548).

Resolution and quality:

- `Screen.width`, `height`, and `pixelRatio` determine the backing canvas, capped at
  2× pixel density. Input and GCanvas controls use matching canvas coordinates.
- Physics retains its 160-cell longest side. **Auto** uses `Screen.responsive()`
  to select an ink budget of 512 / 768 / 1024 pixels for mobile / tablet / desktop,
  bounded by display size. Sustained measured update/render cost above 24 ms reduces
  this budget in stages, preserving the current ink and simulation time.
- **Standard** caps ink at 512 pixels; **High** caps it at 1536. The panel displays
  the actual ink dimensions. These settings control transported detail, not a
  cosmetic enlargement of the coarse image. Physics resolution remains unchanged.
- If WebGL2 half-float targets are unavailable, CPU dye transport remains usable at
  physics resolution. `?cpu` forces this path for testing. Context loss restarts ink
  in the CPU fallback while preserving velocity/time; GPU restoration seeds from
  that fallback. Native GPU ink cannot be recovered from a lost context.

The axisymmetric lab stays in Physics with its own solver and validation. The
Navier–Stokes Vortex artwork stays in Math. This planar experiment shares the fluid
equations theme; it does not implement the OpenAI paper’s three-dimensional forced
construction or demonstrate a singularity. Existing SPH demos are unaffected.

Validation:

- `test/fluid-grid.test.js`: pressure/divergence reduction, impermeable walls,
  dye displacement and bounds, sustained forcing, viscous decay and invalid inputs.
- `scripts/validate-fluid-dynamics.mjs`: desktop/mobile Chrome, six simulated seconds
  of evolving dye, pause, mouse push, Retina taps and UI capture, viewport fit,
  fine-grid dye displacement/orientation, quality resizing, adaptive budgets,
  GPU context loss/restoration, and GL errors. Use `--cpu` to check fallback.
  Writes screenshots and a report under `.temp/`.
- `vite build`: verifies the public export and library bundle. The project has no
  configured TypeScript compiler or ESLint check.

# Navier–Stokes Vortex

Open `/demos/nsvortex.html` on the development server. The gallery lists it under Math. It merges Vortex Loom’s visuals with Fluid Singularities’ GCanvas UI into one demo. Both `/demos/singularity.html` and `/demos/vortex-loom.html` redirect here, preserving query parameters. The axisymmetric solver lab remains available separately.

The scene uses GCanvas `Game`, `GameObject`, `Camera3D`, `Painter`, and `WebGLAttractorPipeline`. Controls use `AccordionGroup`, `Slider`, `Dropdown`, `Button`, `Text`, and `VerticalLayout` with the existing vortex theme. The page uses only shared `demos.css`; there are no custom HTML controls or demo-specific styles. There is a Canvas fallback if WebGL is unavailable. No PDE solver runs in the animation loop.

## Connection to the paper

The source is [OpenAI’s *Finite Time Blowup for Navier–Stokes*, §2](https://cdn.openai.com/pdf/32d9f210-8b73-45e0-91bc-82a30aef8a9a/navier-stokes.pdf). Its leading core contracts, while successive non-axisymmetric oscillatory pulses grow under shear and then dissipate. Two pulse families play different roles in momentum transport.

The artwork reuses `singularity-model.js` for the asymptotic core scales with illustrative h = 0.005 and unit prefactors. Uniform camera magnification preserves the axial/radial aspect ratio. Display time advances linearly in −log₁₀(T − t), covering twelve decades in 96 seconds and stopping before T. This logarithmic clock is a presentation choice.

The seeded spirals, two colored wave families, pulse envelopes, angular modes, and acceleration of highlights are artistic choices. Increasing radial phase gradients illustrate shear. The artwork does not reproduce the constructed velocity field, its forcing, or its cancellation of momentum residuals. The cited construction is forced; this is not evidence about unforced Navier–Stokes blowup.

## Interaction

- Drag to orbit; scroll to zoom; Space to pause; H to hide the interface.
- Scrubbing pauses playback. Choose a palette or tempo, toggle the waves, and adjust camera zoom and auto orbit in the accordion panel.
- Core scales retains the radius, height, speed, energy readouts and logarithmic chart from Fluid Singularities. About the paper explains the artistic interpretation and links to the source.
- Follow core keeps shrinking structures visible. Fixed world scale shows their actual normalized contraction; eventually the core falls below one pixel.
- Seed generates another filament arrangement and stores its number in the URL. A shared `?seed=42` reproduces the geometry. `?paused=1` starts paused.
- Save artwork exports a PNG without the canvas interface. Reset time & camera returns to the start while preserving the current play/pause state; Replay at the endpoint starts playback again.
- Reduced-motion preference starts paused. Hidden tabs suspend the game loop.

## Validation

`test/vortex-loom.test.js` checks deterministic geometry, pulse birth/growth/decay, angular seams, finite geometry through the display range, and uniform camera scaling. Run it together with `test/singularity.test.js`.

Browser verification covers visible frame changes, a real click on a canvas button, pause/play, scrubbing, the finite endpoint and replay, palettes, waves, camera scale, interface hiding, export without the UI, PNG encoding, legacy redirects, and canvas controls fitting a 390 × 844 viewport.

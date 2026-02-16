# What's New in GCanvas 3.0

GCanvas 3.0 is the biggest release yet — a standards-aligned coordinate system, a rewritten interactivity API, GPU-accelerated rendering pipelines, professional UI components, fluid/gas physics, and 86 demos covering everything from generative art to 3D games.

---

## Breaking Changes

### Origin-Based Coordinate System

The default meaning of `x, y` has changed. In v2, coordinates referred to the **center** of an object. In v3, they refer to the **origin point** — top-left by default — matching the native Canvas API.

```javascript
// v2: x,y = center
const rect = new Rectangle({ x: 100, y: 100, width: 50, height: 30 });

// v3: x,y = top-left (default)
const rect = new Rectangle({ x: 100, y: 100, width: 50, height: 30 });

// v3: opt into center-based positioning
const rect = new Rectangle({ x: 100, y: 100, width: 50, height: 30, origin: Position.CENTER });
```

All nine anchor positions are available: `TOP_LEFT`, `TOP_CENTER`, `TOP_RIGHT`, `CENTER_LEFT`, `CENTER`, `CENTER_RIGHT`, `BOTTOM_LEFT`, `BOTTOM_CENTER`, `BOTTOM_RIGHT`. You can also set `originX` / `originY` to any value between 0 and 1.

New helper methods `getTopLeft()` and `getCenter()` return absolute positions regardless of origin setting.

**Quick migration**: add `origin: Position.CENTER` to existing shape constructors to preserve v2 behavior. See [MIGRATION-3.0.md](./MIGRATION-3.0.md) for a full guide.

### Event-Based Interactivity

The interactivity system was rewritten from lifecycle methods to an event emitter pattern.

```javascript
// v2
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.enableInteractivity(this.shape);
  }
  onPointerDown(e) { /* ... */ }
  onMouseOver() { /* ... */ }
}

// v3
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.interactive = true;
    this.on('inputdown', (e) => { /* ... */ });
    this.on('mouseover', () => { /* ... */ });
  }
}
```

Events: `inputdown`, `inputup`, `inputmove`, `click`, `mouseover`, `mouseout`. Listeners can be removed with `.off()`.

### Layout Defaults

`centerItems` in `verticalLayout` / `horizontalLayout` now defaults to `false`. Add `centerItems: true` explicitly if needed.

---

## New Features

### WebGL Attractor Pipeline

A multi-pass GPU rendering pipeline purpose-built for 3D strange attractors. It replaces `WebGLLineRenderer` in attractor demos and adds:

- **GPU color math** — HSL-to-RGB conversion runs entirely in the fragment shader
- **Energy flow** — layered sinusoidal brightness modulation with spark flashes
- **FBM noise background** — 5-octave animated noise with vignette
- **Multi-pass bloom** — bright-extract, two-pass Gaussian blur, additive composite
- **Post-processing** — depth fog, iridescence, chromatic aberration, ACES tonemapping, color grading (exposure, warmth, grain)

Each pipeline instance manages its own WebGL context and offscreen canvas, compositing onto the main 2D canvas.

### UI Components

Four new professional UI components in `src/game/ui/`, styled with a dark transparent + neon green aesthetic:

| Component | Description |
|-----------|-------------|
| **Accordion** | Collapsible sections with chevron indicators and smooth relayout |
| **Dropdown** | Combobox with scrollable options panel, supports wheel and touch-drag |
| **Slider** | Draggable track with filled glow, step quantization, and friction smoothing |
| **Stepper** | Numeric +/- buttons with configurable step size and bounds |

All components integrate with the existing `UI_THEME` system.

### Mask GameObject

Clipping masks for scenes and game objects. Supports circle, rectangle, ellipse, and custom path shapes — with rounded corners, inversion, scale, and animatable properties.

```javascript
const mask = Mask.circle(game.width / 2, game.height / 2, 100);
mask.apply(ctx);
// ... render masked content ...
mask.remove(ctx);
```

### FluidSystem

High-level fluid simulation built on the ParticleSystem and SPH solver:

- **Liquid mode** — cohesion, surface tension, pressure
- **Gas mode** — buoyancy, diffusion, turbulence
- **Blend mode** — mix both physics models
- **Heat zones** — thermal convection with configurable temperature regions

### Gesture Recognition

Unified gesture handling across desktop and mobile (`src/io/gesture.js`):

```javascript
const gesture = new Gesture(canvas, {
  onZoom: (delta, cx, cy) => { /* wheel or pinch */ },
  onPan: (dx, dy) => { /* drag or single-finger swipe */ },
  onTap: (x, y) => { /* click or quick tap */ },
});
```

Configurable sensitivity, tap detection thresholds, and drag start/end callbacks.

### Screen Utilities

Device detection and responsive helpers (`src/io/screen.js`):

- `Screen.isMobile`, `Screen.isTablet`, `Screen.isDesktop`
- `Screen.pixelRatio`, `Screen.orientation`, `Screen.hasTouch`
- `Screen.responsive(mobile, tablet, desktop)` — returns the right value for the current device

### Hydrogen Orbital Math

Quantum chemistry functions in `src/math/hydrogen.js` for visualizing hydrogen atom electron probability densities:

- Associated Laguerre and Legendre polynomials
- Radial wave functions
- CDF-based inverse transform sampling for orbital particle placement
- Used in the Hydrogen Orbitals demo with real-time 3D rendering

### New Shapes

- **Parallelogram** — configurable slant offset with `flipX` option
- **RightTriangle** — right isosceles triangle with computed hypotenuse

### Physics Module

Stateless physics calculations in `src/physics/`:

- Collision detection and response
- Force calculations and kinematics
- Composable `PhysicsUpdaters` for the ParticleSystem
- 3D bounds checking

### Audio Effects

New audio processing effects in `src/sound/`:

- Flanger, DJFilter, EQFilterBank, HighShelf
- AdvancedDelay, AdvancedDistortion, AdvancedTremolo
- Limiter, MasterGain

---

## New Demos

v3 ships with 86 demo pages. Highlights added in this release:

### Strange Attractors (10 demos)
Lorenz, Aizawa, Dadras, Thomas, Rossler, Halvorsen, Rabinovich-Fabrikant, Chen, Three-Scroll, and Chua's Circuit — all with interactive 3D rotation, zoom, WebGL bloom, and auto-rotation.

### 2D Attractors (3 demos)
Clifford, De Jong, and the Caos Playground — GPU-accelerated point rendering with parameter controls.

### Physics & Math
- **Hydrogen Orbitals** — real quantum wave functions rendered as 3D particle clouds with Camera3D and UI controls
- **Quantum Manifold** — abstract quantum field visualization
- **Cosmic Microwave Background** — WebGL particle simulation

### Generative Art
- **Study 009: Monad Melody** — interactive network visualization
- **Hyperbolic 001–005** — Wireframe Flux, Mobius Flow, Hyperbolic Fabric, Dini's Vortex, Fractal Terrain

---

## WebGL Renderers

The `src/webgl/` module now includes:

| Renderer | Purpose |
|----------|---------|
| `WebGLRenderer` | General-purpose custom shader effects |
| `WebGLParticleRenderer` | GPU point sprites (10k+ particles at 60fps) |
| `WebGLLineRenderer` | Pre-allocated line buffers with per-vertex color |
| `WebGLAttractorPipeline` | Multi-pass bloom + post-processing for 3D attractors |
| `WebGLDeJongRenderer` | GPU-side De Jong iteration |
| `WebGLCliffordRenderer` | GPU-side Clifford iteration |

All renderers are self-contained with their own offscreen canvas and GL context, compositing onto the main 2D canvas via `ctx.drawImage()`.

---

## Documentation

New docs added in this release:

- [MIGRATION-3.0.md](./MIGRATION-3.0.md) — full migration guide from v2
- [INTERACTIVITY_CHANGES.md](./INTERACTIVITY_CHANGES.md) — interactivity API transition
- [concepts/coordinate-system.md](./concepts/coordinate-system.md) — origin system explained
- [concepts/interactivity.md](./concepts/interactivity.md) — interactive GameObjects guide
- [modules/io/gesture.md](./modules/io/gesture.md) — gesture recognition
- [modules/util/screen.md](./modules/util/screen.md) — screen utilities
- [modules/webgl/procedural-attractor-renderer.md](./modules/webgl/procedural-attractor-renderer.md) — attractor pipeline
- [modules/math/heat.md](./modules/math/heat.md) — heat zone calculations

---

## Infrastructure

- **SEO** — all 86 demo pages now have meta description, Open Graph, Twitter Card tags, and canonical URLs
- **Google Analytics** — GA4 tracking on every demo page for direct-visit attribution
- **robots.txt + sitemap.xml** — proper crawl directives for search engines
- **404 page** — dark-themed error page matching the site style
- **Build pipeline** — `inject-seo.js` runs automatically during `build:demo`

---

## Summary

| | v2 | v3 |
|---|---|---|
| Coordinate default | Center | Top-left (origin-based) |
| Interactivity | Lifecycle methods | Event emitter |
| WebGL renderers | 3 | 6 |
| UI components | 4 | 8 |
| Demos | ~50 | 86 |
| Shapes | 40+ | 42+ |
| Physics | Collision only | Full module + fluid sim |
| Mobile support | Basic | Gesture + Screen utilities |
| SEO | 2 pages | All pages |

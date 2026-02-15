# Hydrogen Orbital Visualizer — Design Document

**Date:** 2026-02-15
**Status:** Approved

## Overview

Port of the C++/OpenGL hydrogen atom quantum orbital visualizer (from `D:\Developer\studies\Atoms`) to gcanvas using WebGL point sprites and the existing particle/camera infrastructure.

Users select quantum numbers (n, l, m) and see the corresponding electron probability cloud rendered as thousands of glowing particles in 3D with interactive camera controls.

## Approach

**Approach 1: Extend Attractor3DDemo Pattern** — reuse `WebGLParticleRenderer`, `Camera3D`, `AccordionGroup` UI, and `Game` class. Add new hydrogen math module.

## Architecture

```
HydrogenOrbitalDemo extends Game
├── Camera3D (mouse orbit, zoom, auto-rotate)
├── WebGLParticleRenderer (glow point sprites, 10k-50k particles)
├── AccordionGroup UI panel (right-aligned, 280px)
└── Info panel (top-center: title, orbital label, equation)
```

## Files

| File | Purpose |
|------|---------|
| `src/math/hydrogen.js` | Pure math: wave functions, spherical harmonics, sampling |
| `demos/js/hydrogen-orbital.js` | Demo class with rendering + UI |
| `demos/hydrogen-orbital.html` | HTML entry point |

## Math Module — `src/math/hydrogen.js`

Pure functions, no rendering, no state.

### Core Functions

1. **`associatedLaguerre(n, alpha, x)`** — L_n^alpha(x) via recurrence relation
2. **`associatedLegendre(l, m, x)`** — P_l^m(cos theta) via recurrence
3. **`radialWaveFunction(n, l, r)`** — R_{n,l}(r) = norm * exp(-rho/2) * rho^l * L_{n-l-1}^{2l+1}(rho)
4. **`angularWaveFunction(l, m, theta)`** — Real spherical harmonic theta-dependent part
5. **`probabilityDensity(n, l, m, r, theta)`** — |R|^2 * |Y|^2
6. **`sampleOrbitalPositions(n, l, m, count)`** — CDF-based rejection sampling, returns Float32Array of [x, y, z, probability]
7. **`validateQuantumNumbers(n, l, m)`** — Clamp to valid ranges
8. **`orbitalLabel(n, l, m)`** — Human-readable label (e.g. "3d (m=1)")

### Constants

- Bohr radius a0 = 1 (natural units)

### Sampling Strategy

CDF-based inverse transform sampling (from the original C++ implementation):
- Radial CDF from r^2 * |R(r)|^2
- Angular CDF from |P_l^m(cos theta)|^2 * sin(theta)
- Uniform phi in [0, 2pi]
- Spherical to Cartesian conversion for final positions

## Rendering

### Particle Lifecycle
- On quantum number change: call `sampleOrbitalPositions(n, l, m, count)`
- Map probability to color via colormap (log-compressed)
- Map probability to particle size (higher density = slightly larger)
- Feed into `WebGLParticleRenderer`

### Color Mapping
```
probability -> log10(p + epsilon) -> normalize [0,1] -> colormap lookup
```
Log compression ensures full orbital structure is visible.

### Colormaps
- **Inferno** (default): black -> purple -> red -> orange -> yellow -> white
- **Fire**: black -> dark red -> red -> orange -> yellow
- **Ocean**: black -> deep blue -> cyan -> white
- **Rainbow**: full hue sweep

### Per-Frame Update
- Camera rotation/inertia only (particles are static for a given orbital)
- Optional auto-rotation
- No continuous simulation needed

### Regeneration
- Brief fade transition when quantum numbers change
- Full particle resample on n/l/m change

## UI Panel

### Info Panel (top-center)
- Title: "Hydrogen Orbitals"
- Orbital label: dynamic (e.g. "3d (m=1)")
- Equation: psi(r,theta,phi) = R_{n,l}(r) * Y_l^m(theta,phi)

### AccordionGroup Panel (right-aligned, 280px)

**Always visible:**
- Dropdown: Preset orbitals (1s, 2s, 2p, 3s, 3p, 3d, 4s, 4p, 4d, 4f)
- Button: Restart

**Section: Quantum Numbers (expanded)**
- Stepper: n (1-7)
- Stepper: l (0 to n-1), auto-clamped
- Stepper: m (-l to +l), auto-clamped

**Section: Particles (collapsed)**
- Stepper: Count (5k / 10k / 20k / 50k)
- Slider: Point size (1-8)

**Section: Color (collapsed)**
- Dropdown: Colormap (Inferno, Fire, Ocean, Rainbow)
- Slider: Log compression strength
- Slider: Alpha / opacity

**Section: View (collapsed)**
- ToggleButton: Auto-rotate
- Slider: Rotation speed
- Slider: Zoom

### Cascade Behavior
- `_updatingSliders` guard flag (same as caos-playground)
- Changing n auto-clamps l to [0, n-1] and m to [-l, l]
- Changing l auto-clamps m to [-l, l]
- Preset dropdown sets all three quantum numbers + updates steppers programmatically

## Preset Orbitals

| Preset | n | l | m | Shape |
|--------|---|---|---|-------|
| 1s | 1 | 0 | 0 | Sphere |
| 2s | 2 | 0 | 0 | Sphere with node |
| 2p | 2 | 1 | 0 | Dumbbell |
| 3s | 3 | 0 | 0 | Sphere with 2 nodes |
| 3p | 3 | 1 | 0 | Dumbbell with node |
| 3d | 3 | 2 | 0 | Cloverleaf |
| 4s | 4 | 0 | 0 | Sphere with 3 nodes |
| 4p | 4 | 1 | 0 | Dumbbell with 2 nodes |
| 4d | 4 | 2 | 0 | Cloverleaf with node |
| 4f | 4 | 3 | 0 | Complex multi-lobe |

## Performance Targets

- 10k-50k particles (user-adjustable)
- 60fps on mid-range hardware
- Regeneration < 200ms for 20k particles
- Zero per-frame allocation (pre-allocated buffers via WebGLParticleRenderer)

## Dependencies

All existing gcanvas modules, no external dependencies:
- `WebGLParticleRenderer` — GPU point sprite rendering
- `Camera3D` — 3D projection with mouse control
- `AccordionGroup`, `Dropdown`, `Slider`, `Stepper`, `ToggleButton`, `Button` — UI
- `Scene`, `Text` — Info panel
- `Game` — Base class
- `Painter` — Color utilities

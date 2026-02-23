# Zeta Zeros — Critical Line Explorer

**Date:** 2026-02-23
**Status:** Design approved

## Overview

A generative art demo that traces ζ(1/2 + it) continuously along the Riemann zeta function's critical line, plotting the output as a spiral in the complex plane. When the curve passes through the origin, a non-trivial zero is detected — triggering a visual burst and procedural sound. Each zero is verified against known values, visually confirming the Riemann Hypothesis for computed zeros.

Inspired by Quanta Magazine's visualization of the zeta function spiral.

## Architecture

Extends `Game` class, Canvas 2D rendering via `Painter.useCtx()`. Follows the Schrodinger/Quantum Manifold demo patterns.

### File Structure

```
src/math/zeta.js           — Riemann-Siegel formula, zero detection, known zeros table
src/math/complex.js        — Add divideComplex(), conjugate(), arg() methods
demos/js/zeta-zeros.js     — Demo class extending Game
demos/zeta-zeros.html      — HTML entry point
```

## Math Engine: `src/math/zeta.js`

### Riemann-Siegel Formula

The standard efficient method for computing ζ on the critical line. Instead of summing the Dirichlet series directly (which converges slowly), use the Riemann-Siegel Z function:

```
Z(t) = 2 * Σ_{n=1}^{N} cos(θ(t) - t·ln(n)) / √n + R(t)
```

Where:
- `N = floor(sqrt(t / (2π)))`
- `θ(t)` is the Riemann-Siegel theta function
- `R(t)` is a remainder/correction term

The sign changes of Z(t) correspond to zeros of ζ(1/2 + it).

For the full complex value ζ(1/2 + it), compute via partial Dirichlet series with Euler-Maclaurin correction, or reconstruct from Z(t) and θ(t):
```
ζ(1/2 + it) = Z(t) · e^{-iθ(t)}
```

### Exported Functions

- `zetaCriticalLine(t)` → `Complex` — computes ζ(1/2 + it)
- `riemannSiegelZ(t)` → `number` — the real-valued Z function
- `riemannSiegelTheta(t)` → `number` — the theta function
- `findZerosInRange(tStart, tEnd, step)` → `number[]` — finds zeros via sign changes + bisection refinement
- `KNOWN_ZEROS` — first ~30 known non-trivial zero t-values for verification

### Complex Class Extensions

Add to `src/math/complex.js`:
- `divideComplex(other)` — full complex division: (a+bi)/(c+di)
- `conjugate()` — returns new Complex(real, -imag)
- `arg()` — returns Math.atan2(imag, real)

## Visual Design

### Main View — Spiral Plot

Full-screen canvas, dark background (`#0a0a12`).

**Complex output plane:**
- Centered on screen
- Subtle Re/Im axes with labels (Baskara pattern)
- Origin marked with crosshair

**Spiral trail:**
- Trail stored as array of `{ re, im, t, magnitude, speed }`
- Rendered as connected line segments via `Painter.useCtx()`
- Age-based alpha: older segments fade (linear falloff)
- Speed-based hue: slow movement = blue-violet (hue ~260), fast = cyan-teal (hue ~180)
- Line width: thicker near head, thinner at tail
- Glowing head particle: layered radial gradient (Baskara glow pattern)

**Zero events — when |ζ| drops below threshold:**
- Expanding ring flash at origin (Baskara merge effect)
- White blink on curve head (study009 blink pattern)
- Zero marker: small colored dot at origin with label `t₁ ≈ 14.134`
- Markers persist, accumulate as zeros are discovered
- Brief screen-wide radial pulse

**Zoom/pan:**
- Mouse wheel / pinch to zoom the output plane
- Drag to pan the view center
- Double-click to reset view

### Cross-Section Panel (Quantum Manifold pattern)

Bottom of screen, semi-transparent overlay:
- Plots |ζ(1/2 + it)| as a waveform vs t (horizontal axis)
- Vertical axis = magnitude
- Zeros visible as points touching the baseline
- Bright scanning cursor at current t position
- Discovered zeros marked with dots
- Area under curve filled with subtle gradient (Quantum Manifold cross-section style)

### Info Panel (Schrodinger pattern)

Top-center, using `Text` + `Scene` + `verticalLayout` + `applyAnchor`:
- Title: **"Riemann Zeta — Critical Line"**
- Equation: `ζ(½ + it)`
- Live values: `t = 14.13 | ζ = 0.002 + 0.001i | |ζ| = 0.002`
- Zeros found: `3 zeros found | all on Re = ½` (verification status)

### Color Palette

```javascript
const CONFIG = {
  colors: {
    background: "#0a0a12",
    axes: "rgba(255, 255, 255, 0.1)",
    axisLabels: "rgba(255, 255, 255, 0.25)",
    trailSlow: { h: 260, s: 80, l: 60 },   // blue-violet
    trailFast: { h: 180, s: 70, l: 55 },    // cyan-teal
    headGlow: [150, 200, 255],               // bright cyan
    zeroFlash: { h: 50, s: 90, l: 70 },     // golden
    zeroMarker: "#ffd700",                    // gold
    crossSection: {
      waveColor: "rgba(0, 200, 180, 0.8)",
      envelopeColor: "rgba(0, 200, 180, 0.15)",
      cursorColor: "#fff",
    },
  },
};
```

## Sound Design

Using `Synth` class, initialized on first click (Baskara/study009 pattern).

### Proximity Drone
- Continuous low sine oscillator
- Frequency inversely mapped to |ζ|: as magnitude → 0, frequency rises (100Hz → 600Hz)
- Volume also rises as |ζ| → 0
- Creates tension approaching each zero

### Zero Chime
- Triggered on zero detection
- Pentatonic scale, pitch mapped to zero index (1st zero = lowest, nth = higher)
- Triangle wave with smooth decay (~0.4s)
- Stereo panned based on screen position (study009 pattern)

### Ambient Speed Texture
- Optional filtered noise layer
- Bandpass filter frequency tracks curve speed (how fast ζ moves through output plane)
- Very subtle, adds organic texture

## Interaction

| Input | Action |
|-------|--------|
| Scroll / pinch | Zoom the output plane |
| Drag | Pan the view |
| +/- keys | Speed up / slow down t advancement |
| Space | Pause / resume |
| R | Restart from t = 0 |
| Double-click | Reset view (zoom + pan) |

## Mobile Support

- `Screen.responsive()` for font sizes, panel dimensions
- Cross-section panel height reduced on mobile
- Touch: pinch to zoom, drag to pan
- Info panel repositioned for portrait orientation

## Animation Flow

1. Demo starts, t = 0
2. t increases steadily (configurable speed, default ~2 units/second)
3. For each frame, compute ζ(1/2 + it) at current t
4. Append point to trail, render spiral
5. Check |ζ| — if below threshold, refine zero location via bisection
6. On zero: flash, chime, add marker, update counter
7. Cross-section panel updates continuously showing the waveform
8. Trail older than `maxTrailAge` fades out

## Performance Considerations

- Trail limited to ~3000 points (configurable)
- Riemann-Siegel formula is O(√t) per evaluation — fast enough for real-time
- Cross-section recomputes only visible range
- No WebGL needed — single curve with effects is well within Canvas 2D budget

## Known Non-Trivial Zeros (for verification)

First 20 zeros (imaginary parts):
```
14.1347, 21.0220, 25.0109, 30.4249, 32.9351,
37.5862, 40.9187, 43.3271, 48.0052, 49.7738,
52.9703, 56.4462, 59.3470, 60.8318, 65.1125,
67.0798, 69.5464, 72.0672, 75.7047, 77.1448
```

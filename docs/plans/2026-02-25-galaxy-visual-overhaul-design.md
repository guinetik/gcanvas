# Galaxy Visual Overhaul Design

**Date:** 2026-02-25
**Status:** Approved

## Problem

The galaxy demo looks cartoonish: stars are big round circles drawn with `ctx.arc()`, only 3-4k particles, no dust lanes or nebular glow, flat color palette. Needs to look like a real galaxy visualization.

## Solution

Replace Canvas 2D star rendering with `WebGLParticleRenderer` (GPU point sprites), increase particle count to 15-20k across 3 density layers, add rich color variety with HII regions, and draw arm-following nebular glow.

## WebGL Star Rendering

Replace `_drawStars` with `WebGLParticleRenderer`:
- Shape: **glow** preset, Blend: **additive**
- All stars rendered in a single `gl.drawArrays(gl.POINTS)` call
- CPU does: 3D projection + depth sort. GPU does: rendering
- Composite onto main 2D canvas via `ctx.drawImage`

## Multi-Layer Star Population

Three layers generated together, rendered in one batch:

| Layer | Count | Size (px) | Alpha | Purpose |
|-------|-------|-----------|-------|---------|
| Dust | ~10k | 0.5–1.5 | 0.05–0.2 | Sub-pixel haze filling arms |
| Stars | ~4k | 1–3 | 0.3–0.8 | Normal stars, twinkle |
| Bright | ~500 | 3–8 | 0.6–1.0 | Prominent colored stars |

Each star object gets a `layer` field. Generator distributes across layers.

## Color Palette

- **Core**: warm gold/amber (hue 40–60), high brightness
- **Arms**: blue-white young stars (hue 200–240) + pink/magenta HII regions (hue 320–340) clustered in arm segments
- **Field**: cool red-orange old stars (hue 10–30), dimmer
- **Dust**: faint blue-violet (hue 240–280), very low alpha for diffuse nebular glow

HII regions: every N-th arm segment (random) gets a cluster of pink-hued dust+bright stars.

## Arm-Following Nebular Glow

Canvas 2D layer drawn BEFORE WebGL composite:
- Sample ~20 points along each spiral arm path
- Draw soft radial gradients at each sample (low alpha, large radius)
- Colors: blue-violet base + occasional pink HII tints
- Creates the "glowing gas lane" look between individual stars

## Enhanced Black Hole

- Wider accretion disk with more color gradient bands
- Brighter gravitational lensing ring
- Optional faint jet cones above/below the disk plane

## Config Changes

Increase default star counts in `GALAXY_PRESETS`:
- Spiral: 3000 → 15000
- Grand Design: 4000 → 18000
- Flocculent: 3500 → 16000
- Barred: 3500 → 16000
- Elliptical: 4000 → 12000
- Irregular: 2500 → 10000

Add to `CONFIG.visual`:
- `dustFraction: 0.65` — fraction of total count that are dust particles
- `brightFraction: 0.03` — fraction that are bright prominent stars
- `hiiRegionChance: 0.15` — chance per arm segment of HII region
- `nebulaGlowSamples: 20` — points per arm for nebular glow

## Files to Change

1. **galaxy.config.js** — Updated star counts, new visual params, color config
2. **galaxy.generator.js** — 3-layer generation, HII region clusters, color assignment
3. **galaxy-playground.js** — WebGLParticleRenderer integration, nebular glow pass, enhanced black hole
4. **galaxy.ui.js** — No changes needed (star count slider range may need bump)

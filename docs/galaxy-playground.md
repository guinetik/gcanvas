# Galaxy Playground

Interactive galaxy visualization demo for GCanvas, ported from Genuary 2026. Supports multiple Hubble classification types with scientifically-inspired parameters and a tunable control panel.

## Features

- **Galaxy types**: Spiral (S), Grand Design (Sc), Flocculent (Sd), Barred Spiral (SB), Elliptical (E), Irregular (Irr)
- **Parameter panel**: Dropdown for type, sliders for morphology-specific params, structure controls (star count, radius)
- **Keplerian-inspired rotation**: Differential rotation using `src/math/orbital.js` conventions
- **3D projection**: Camera3D with mouse drag to tilt, click to pause

## Module Structure

```
demos/js/
├── galaxy-playground.js      # Main Game subclass
└── galaxy/
    ├── galaxy.config.js      # Presets, GALAXY_PARAMS, CONFIG
    ├── galaxy.generator.js   # generateGalaxy() for each type
    └── galaxy.ui.js          # Panel, sliders, dropdowns
```

## Galaxy Types (Hubble Sequence)

| Type | Key | Description |
|------|-----|-------------|
| Spiral | `spiral` | Classic 2-arm logarithmic spiral |
| Grand Design | `grandDesign` | Well-defined arms (Sc) |
| Flocculent | `flocculent` | Patchy, fragmented arms (Sd) |
| Barred Spiral | `barred` | Central bar + spiral arms (SB) |
| Elliptical | `elliptical` | Ellipsoidal, no disk (E) |
| Irregular | `irregular` | Clumpy, no regular structure (Irr) |

## Parameters

### Spiral / Grand Design / Flocculent

- **ARMS**: Number of spiral arms (1–6)
- **ARM WIDTH**: Scatter perpendicular to arms
- **PITCH**: Spiral tightness (logarithmic spiral exponent)
- **INNER RADIUS**: Starting radius of arms
- **FIELD STARS**: Fraction of stars outside arms

### Barred Spiral

- **BAR LENGTH**, **BAR WIDTH**: Central bar dimensions
- **ARMS**, **ARM WIDTH**, **PITCH**: Spiral parameters

### Elliptical

- **ELLIPTICITY**: E = 10×(1−b/a)
- **AXIS RATIO**: b/a (minor/major)

### Irregular

- **IRREGULARITY**: 0–1, mix of clumps vs random
- **CLUMPS**: Number of star-forming clumps

## Dependencies

- `Camera3D` — 3D projection and mouse control
- `Painter` — Canvas drawing
- `AccordionGroup`, `Slider`, `Dropdown`, `Stepper`, `Button`, `ToggleButton` — UI
- `Screen` — Responsive layout
- `src/math/orbital.js` — Keplerian rotation (conceptually; custom falloff for visualization)

## Usage

```javascript
import { GalaxyPlayground } from "./js/galaxy-playground.js";

const canvas = document.getElementById("game");
const game = new GalaxyPlayground(canvas);
game.start();
```

## Entry Point

- **HTML**: `demos/galaxy-playground.html`
- **Nav**: Physics section in `demos/index.html`

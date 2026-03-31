# Planetarium Demo — Design Spec

## Overview

A real-time solar system visualization using Sphere3D WebGL shaders for each celestial body, backed by Keplerian orbital mechanics. Camera3D for drag-rotate viewing with Gesture-based zoom/pan. Orbit paths drawn as projected 3D line segments.

## Goals

- Showcase Sphere3D shader types (star, rockyPlanet, gasGiant) in a coherent scene
- Real orbital mechanics: Kepler's equation solver, true anomaly, 3D orbital elements
- Aesthetic scaling: logarithmic distance compression, exaggerated radii, real period ratios
- Interactive: drag-rotate (Camera3D), wheel/pinch zoom (Gesture), click-drag pan
- Clean separation: reusable math in `src/`, demo-specific rendering in `demos/`

## Architecture

### New Library Code

#### `src/math/kepler.js` — Keplerian Orbit Solver

Pure functions, no visualization dependencies. Exported through `src/math/index.js`.

```
solveKeplerEquation(M, e, tolerance?, maxIter?)
  → E (eccentric anomaly)
  Iterative Newton-Raphson solver for Kepler's equation: M = E - e*sin(E)

meanAnomaly(period, time, epoch?)
  → M (mean anomaly in radians)
  M = 2*PI * (time - epoch) / period

trueAnomalyFromEccentric(E, e)
  → nu (true anomaly)
  Converts eccentric anomaly to true anomaly

orbitalPosition3D(elements, time)
  → { x, y, z } heliocentric cartesian coordinates
  Takes: { semiMajorAxis, eccentricity, inclination,
           longitudeOfAscendingNode, argumentOfPeriapsis, period, epoch }
  Pipeline: meanAnomaly → solveKepler → trueAnomaly → radius → rotate into 3D

orbitalRadius(semiMajorAxis, eccentricity, trueAnomaly)
  → r (distance from focus)
  r = a(1-e^2) / (1 + e*cos(nu))

orbitPathPoints(elements, numSegments?)
  → [{x, y, z}, ...] array of 3D points tracing the full orbit ellipse
  For drawing orbit paths — samples uniformly in mean anomaly
```

### Demo Code

#### File Structure

```
demos/
├── planetarium.html
└── js/
    └── planetarium/
        ├── index.js              # PlanetariumDemo extends Game — main loop
        ├── planetarium.config.js # CONFIG: camera, zoom, time, visual tuning
        ├── planetarium.data.js   # Orbital elements + shader configs per body
        ├── planetarium.bodies.js # CelestialBody class — Sphere3D + orbit state + path drawing
        └── planetarium.ui.js    # Info panel, planet labels, time controls
```

#### `planetarium.data.js` — Planetary Data

Real NASA orbital elements with two aesthetic transforms:

- **Distance scale**: logarithmic compression — `displayDistance = log(realAU) * scaleFactor + offset` so inner planets are visible but Jupiter isn't at the edge of the screen
- **Size scale**: exaggerated but proportional — real ratios preserved, minimum visible size enforced
- **Period scale**: real ratios, global `timeScale` multiplier (default: 1 Earth year ≈ 30 seconds)

Each body entry:

```js
{
  name: "Earth",
  // Orbital elements (real values)
  orbit: {
    semiMajorAxis: 1.0,        // AU
    eccentricity: 0.0167,
    inclination: 0.0,          // radians (reference plane)
    longitudeOfAscendingNode: 0,
    argumentOfPeriapsis: 1.796, // radians
    period: 365.25,            // days
  },
  // Display properties
  display: {
    radius: 0.04,              // fraction of min screen dimension
    shaderType: "rockyPlanet",
    shaderUniforms: {
      uBaseColor: [0.2, 0.4, 0.8],
      uHasAtmosphere: 1.0,
      uSeed: 3.0,
    },
  },
  // Moons (same structure, orbit relative to parent)
  moons: [
    {
      name: "Moon",
      orbit: { semiMajorAxis: 0.00257, eccentricity: 0.0549, ... },
      display: { radius: 0.012, shaderType: "rockyPlanet", ... },
    }
  ],
}
```

**Bodies included:**
- Sun (star shader, stationary at origin)
- Mercury, Venus, Earth, Mars (rockyPlanet shader, varying seeds/colors/atmosphere)
- Jupiter, Saturn, Uranus, Neptune (gasGiant shader, varying bands/storms)
- 3 moons: Moon (Earth), Io (Jupiter), Titan (Saturn)
- Saturn ring: projected 3D ellipse drawn in CelestialBody.draw()

#### `planetarium.bodies.js` — CelestialBody

Manages one celestial body:

- Holds a `Sphere3D` instance with appropriate shader
- Stores orbital elements and current orbital state (position, angle)
- `update(time)`: calls `orbitalPosition3D()` from kepler.js to get 3D position. For moons, position is relative to parent's current position.
- `draw(camera, centerX, centerY, zoom)`: projects through camera, draws sphere. Also draws orbit path by projecting `orbitPathPoints()` and connecting with `Painter.lines`.
- Saturn ring: draws a projected 3D ellipse at Saturn's position, tilted to Saturn's axial tilt.

#### `planetarium.config.js` — Configuration

```js
const CONFIG = {
  camera: {
    perspective: 1200,
    rotationX: 0.3,
    rotationY: -0.5,
    inertia: true,
    friction: 0.94,
    autoRotate: true,
    autoRotateSpeed: 0.15,
  },
  zoom: {
    initial: 1.0,
    min: 0.3,
    max: 5.0,
    speed: 0.08,
    easing: 0.08,
  },
  pan: {
    speed: 1.0,
    easing: 0.1,
  },
  time: {
    scale: 12.0,       // 1 Earth year ≈ 30 seconds
    paused: false,
  },
  display: {
    baseScreenSize: 900,
    orbitPathSegments: 128,
    orbitPathColor: "rgba(255, 255, 255, 0.12)",
    orbitPathLineWidth: 0.8,
    sunGlowLayers: 3,
    labelFont: "12px monospace",
    labelColor: "#aaaaaa",
  },
};
```

#### `index.js` — PlanetariumDemo

```
constructor:
  - backgroundColor = "#000"
  - enableFluidSize()

init:
  - Create Camera3D with CONFIG.camera
  - camera.enableMouseControl(canvas)
  - Create Gesture for zoom (onZoom) and pan (onPan)
  - Load planet data, create CelestialBody for each
  - Create starfield background (random points, static)
  - Create UI (info panel, labels)
  - pipeline.add(fpsCounter)

update(dt):
  - camera.update(dt)
  - Ease zoom and pan offsets
  - Advance simulation time: this.simTime += dt * CONFIG.time.scale
  - Update all bodies: body.update(this.simTime)

render:
  - super.render()
  - Draw starfield
  - Draw orbit paths (back-to-front by average depth)
  - Project all bodies, depth sort
  - Render sun with additive glow overlay
  - Render planets back-to-front
  - Render labels on top
```

#### `planetarium.ui.js` — UI

- Planet name labels (projected position + offset below sphere)
- Info panel (top-left): current time scale, planet count
- Click planet name to highlight / show orbital data (stretch goal, not MVP)
- Pause/resume with spacebar

### Interaction Model

| Input | Action |
|-------|--------|
| Click + drag | Camera rotation (Camera3D) |
| Mouse wheel | Zoom in/out (Gesture → targetZoom) |
| Two-finger pinch | Zoom in/out (Gesture) |
| Two-finger pan | Pan offset (Gesture → targetPanX/Y) |
| Spacebar | Pause/resume time |
| Double-click | Reset camera rotation |

### Rendering Order

1. Starfield background (static random dots)
2. Orbit paths (projected 3D ellipses, translucent)
3. Sun (star shader + additive glow layers)
4. Planets depth-sorted back-to-front (each with their moons)
5. Saturn ring (projected ellipse, drawn with planet)
6. Labels (screen-space, always on top)

## What's NOT Included

- N-body gravitational simulation (Kepler 2-body is correct for solar system)
- Asteroid belt, dwarf planets, comets
- Zoom-to-planet / follow camera
- Texture-mapped planets (shaders are procedural)
- Orbital trails / motion blur

## Testing

- `kepler.js` gets unit tests: Kepler solver convergence, known positions (Earth at perihelion/aphelion), circular orbit edge case (e=0), high eccentricity (e=0.9)
- Demo is visual — manual verification

# Artemis II Flight Path Demo — Design Spec

**Date:** 2026-04-02  
**Status:** Approved

---

## Overview

A physics-accurate visualization of the Artemis II mission trajectory. The spacecraft follows a hybrid free-return path: Trans-Lunar Injection from Earth, lunar flyby on the far side, free-return arc back to Earth reentry. The demo uses a precomputed RK4 n-body simulation (Earth + Moon + Orion) with a time slider, play/pause, and speed control. Rendered in 3D using Camera3D with mission phase tracking via StateMachine.

---

## Files

```
demos/artemis2.html
demos/js/artemis2.js           — main demo, extends Game
demos/js/artemis2.physics.js   — RK4 integrator, trajectory precomputation
demos/js/artemis2.hud.js       — HUD Scene (phase, elapsed, distances, velocity)
demos/js/artemis2.controls.js  — controls Scene (slider, play/pause, speed)
```

**Imports only from:**
- `src/index.js` — Game, Camera3D, Painter, Scene, Text, Rect, Circle, Line, Triangle, Button, Screen, Gesture, FPSCounter, verticalLayout, applyLayout, applyAnchor, Position, StateMachine
- `src/math/orbital.js` — gravitational constants, body masses (G, Earth/Moon mass)

No imports from `demos/js/planetarium/`.

---

## Coordinate Systems

### Physics coords (km)
The integrator and all HUD readouts operate in real kilometres. Earth-Moon distance ~384,400 km. No compromise on physical accuracy.

### Render coords (pixels at zoom=1)
A single `CONFIG.scale` constant (km → pixels) is chosen so the Earth-Moon distance spans ~60% of the canvas at the default zoom. Approximate value: `1 render unit = 3,000 km`.

```
renderX = physicsX / CONFIG.scale
renderY = physicsY / CONFIG.scale
renderZ = physicsZ / CONFIG.scale
```

Render coords are passed to `Camera3D.project()`. Camera3D zoom then provides interactive scaling on top.

### Body radii
Real radii are negligibly small at render scale. Bodies are drawn at clamped minimum sizes:
- Earth: `Math.max(realRadius / CONFIG.scale, 20)` px
- Moon: `Math.max(realRadius / CONFIG.scale, 10)` px
- Orion: 4px (fixed — physically a point at this scale)

HUD always shows real km values regardless of zoom.

### Default zoom
Computed at `init()`:
```js
this.defaultZoom = Screen.minDimension() / CONFIG.baseScreenSize;
```
So Earth-Moon leg always fits on load across all screen sizes.

---

## Physics & Trajectory (`artemis2.physics.js`)

### Bodies
3-body system: Earth, Moon, Orion. Sun's gravity omitted (negligible over 10 days at this scale).

### Initial conditions (approximate Artemis II parameters)
- Earth: origin, stationary (reference frame)
- Moon: ~384,400 km on slightly inclined orbit, velocity ~1.022 km/s
- Orion: launched from Earth at ~10.8 km/s on trans-lunar injection vector

### Integration
RK4 at 30-second timesteps over 10 days:
- Steps: 28,800
- Storage: `Float64Array` of `[ex,ey,ez, mx,my,mz, ox,oy,oz, ovx,ovy,ovz]` per frame
  - Earth and Moon positions stored (Moon moves during simulation)
  - Orion position + velocity stored (needed for HUD velocity readout)
- Memory: ~2.8 MB — trivial

### Phase boundary detection
During `computeTrajectory()`, phase timestamps are detected automatically:
- `LUNAR_FLYBY` starts when Orion distance to Moon < threshold and closing
- `FREE_RETURN` starts at closest Moon approach
- `REENTRY` starts when Orion distance to Earth < reentry corridor threshold

### Output
```js
{
  frames: Float64Array,
  phaseTimestamps: {
    TRANS_LUNAR:  0,
    LUNAR_FLYBY:  <seconds>,
    FREE_RETURN:  <seconds>,
    REENTRY:      <seconds>
  },
  count: 28800,
  dt: 30   // seconds per frame
}
```

---

## Mission Phase State Machine

Lives in `artemis2.js`, constructed after `computeTrajectory()`:

```js
this.missionFSM = StateMachine.fromSequence([
  { name: 'TRANS_LUNAR', enter: () => this.hud.setPhase('Trans-Lunar Injection') },
  { name: 'LUNAR_FLYBY', enter: () => this.hud.setPhase('Lunar Flyby') },
  { name: 'FREE_RETURN', enter: () => this.hud.setPhase('Free Return') },
  { name: 'REENTRY',     enter: () => this.hud.setPhase('Reentry') },
], { context: this });
```

Each `update()` frame checks `simClock` against `phaseTimestamps` and calls `missionFSM.setState()` when a boundary is crossed. StateMachine fires the `enter` callback which updates the HUD label.

---

## Controls (`artemis2.controls.js`)

Bottom-center `Scene`. All magic numbers in `CONFIG`. Built from Shape/GameObject primitives:

- `Rect` — panel background
- `Button` (from `src/game/ui/`) — play/pause toggle, speed options (1x / 10x / 100x / 1000x)
- `Rect` — slider track; `Circle` — draggable thumb
- `Text` (GameObject) — mission clock display above slider: `T+ DD:HH:MM:SS`

Slider drag handled via `canvas.addEventListener('mousedown/mousemove/mouseup')` in the controls class.

**Playback state** lives in `artemis2.js`. Controls expose callbacks only:
- `onPlay()`, `onPause()`, `onSeek(t)`, `onSpeedChange(multiplier)`

---

## HUD (`artemis2.hud.js`)

Top-left `Scene` with `verticalLayout`. Built from Shape/GameObject primitives:

- `Rect` — background panel
- `Line` — separator after title
- `Text` GameObjects — one per readout, updated each frame via `.setText()`

Readout fields:
```
ARTEMIS II
──────────────────
PHASE     Trans-Lunar Injection
ELAPSED   T+ 00:04:32
DIST/E    12,847 km
DIST/M    371,234 km
VELOCITY  10,421 m/s
```

All values derived from the interpolated frame state pushed from `artemis2.js` each `update()`.

---

## Rendering (`artemis2.js`)

### init()
1. `computeTrajectory()` — precompute all 28,800 frames
2. Generate starfield into offscreen canvas
3. Render full trajectory polyline into offscreen canvas (faint, static)
4. Set up `Camera3D`, `Gesture`, `Screen.init(this)`
5. Construct `missionFSM`, HUD, controls — add to pipeline

### update(dt)
1. If playing: `simClock += dt × speedMultiplier`, clamped to `[0, missionDuration]`
2. Interpolate `frames[]` at `simClock` → current positions + Orion velocity
3. Check phase boundaries → `missionFSM.setState()` if crossed
4. Push current state to HUD
5. Update controls slider position

### render()
```js
render() {
  super.render();                    // clear + pipeline (HUD, controls)
  this.drawStarfield();              // blit offscreen starfield
  this.drawTrajectoryFull();         // blit offscreen static polyline
  this.drawTrajectoryTraveled();     // bright polyline up to simClock
  this.drawBodies();                 // Earth, Moon, Orion projected via Camera3D
}
```

### Body drawing
Positions projected through `Camera3D.project(x, y, z)`:
- Earth — `Circle` with radial gradient (blue core, atmosphere glow)
- Moon — `Circle` with grey gradient  
- Orion — small `Triangle` oriented along velocity vector

### Trajectory trail
- **Static layer**: subsampled path (every 10th frame = ~2,880 segments) drawn directly each frame in `rgba(100,180,255,0.15)`. Not cached — Camera3D can rotate so a cached offscreen canvas would go stale on drag.
- **Traveled layer** (redrawn each frame): path from frame 0 to current frame at full resolution in `rgba(100,200,255,0.6)`

---

## CONFIG structure

```js
const CONFIG = {
  scale: 3000,             // km per render unit
  baseScreenSize: 900,     // reference for default zoom calculation
  minZoom: 0.2,
  maxZoom: 3.0,
  simulation: {
    dt: 30,                // seconds per integration step
    duration: 864000,      // 10 days in seconds
  },
  bodies: {
    earth: { mass: 5.972e24, radius: 6371, color: '#1a6faf', glowColor: 'rgba(100,180,255,0.3)', minRenderRadius: 20 },
    moon:  { mass: 7.342e22, radius: 1737, color: '#888888', glowColor: 'rgba(200,200,200,0.2)', minRenderRadius: 10 },
    orion: { color: '#ffcc00', minRenderRadius: 4 },
  },
  trail: {
    staticColor: 'rgba(100,180,255,0.15)',
    traveledColor: 'rgba(100,200,255,0.6)',
    traveledWidth: 1.5,
  },
  ui: {
    hudFont: 'monospace',
    hudFontSize: Screen.responsive(11, 13, 14),
    hudPadding: Screen.responsive(8, 10, 12),
    panelBg: 'rgba(0,10,20,0.75)',
    accentColor: '#4ab4ff',
  },
  speeds: [1, 10, 100, 1000],
  defaultSpeed: 100,
};
```

---

## Navigation entry

Add to `demos/index.html` physics section:
```html
<a href="artemis2.html" class="helix-link" style="--i:11">Artemis II Trajectory</a>
```

---

## Out of scope

- Actual ephemeris data (JPL HORIZONS) — approximate initial conditions only
- SPS burn simulation (no mid-course corrections modeled)
- Crew names / mission patch aesthetic (HUD keeps it clean)
- Sun gravity

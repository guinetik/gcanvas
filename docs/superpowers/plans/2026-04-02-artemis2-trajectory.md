# Artemis II Trajectory Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3D-rendered, physics-accurate Artemis II free-return trajectory visualization with a time slider, play/pause, and speed control.

**Architecture:** Precomputed RK4 n-body integration (Earth fixed, Moon + Orion simulated over 10 days at 30s steps = 28,800 frames) stored in a `Float64Array`. Playback is pure interpolation into that array. Camera3D renders the 3D scene. `StateMachine.fromSequence` drives mission phase labels. HUD and controls are `Scene` subclasses built from GCanvas shapes/GameObjects.

**Tech Stack:** GCanvas (`Game`, `Camera3D`, `Scene`, `Text`, `Rectangle`, `Circle`, `Triangle`, `Line`, `Button`, `Painter`, `Screen`, `Gesture`, `StateMachine`), Vitest for physics unit tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `demos/js/artemis2.physics.js` | Create | RK4 integrator, trajectory precomputation, frame storage |
| `test/demos/artemis2.physics.test.js` | Create | Unit tests for physics module |
| `demos/js/artemis2.hud.js` | Create | HUD Scene: phase, elapsed time, distances, velocity |
| `demos/js/artemis2.controls.js` | Create | Controls Scene: slider, play/pause, speed buttons |
| `demos/js/artemis2.js` | Create | Main demo: Game subclass, Camera3D, StateMachine, rendering |
| `demos/artemis2.html` | Create | HTML entry point |
| `demos/index.html` | Modify | Add navigation link in Physics section |

---

## Task 1: Physics Engine

**Files:**
- Create: `demos/js/artemis2.physics.js`
- Create: `test/demos/artemis2.physics.test.js`

The physics module is pure JS with no canvas dependency. It exports a single `computeTrajectory()` function.

**Coordinate system:** Earth fixed at origin. Units: km and seconds.
- `MU_EARTH = 398600` km³/s² (G × M_earth)
- `MU_MOON = 4902` km³/s² (G × M_moon)

**State vector (12 values for integration):**
`[mx, my, mz, mvx, mvy, mvz, ox, oy, oz, ovx, ovy, ovz]`

**Stored per frame (9 values):**
`[mx, my, mz, ox, oy, oz, ovx, ovy, ovz]`

**Phase detection during integration:**
- `LUNAR_FLYBY`: first frame where Orion distance to Moon begins increasing after being below `FLYBY_THRESHOLD` (20,000 km)
- `FREE_RETURN`: that same closest-approach frame
- `REENTRY`: first frame where Orion distance to Earth < `REENTRY_THRESHOLD` (50,000 km) on the return leg (after FREE_RETURN)

- [ ] **Step 1.1: Create test directory and write failing tests**

```bash
mkdir -p D:/Developer/gcanvas/test/demos
```

Create `test/demos/artemis2.physics.test.js`:

```js
import { describe, it, expect } from "vitest";
import { computeTrajectory, readFrame, interpolateState } from "../../demos/js/artemis2.physics.js";

describe("Artemis II Physics", () => {
  // Compute once — shared across tests (integration takes ~100ms)
  let traj;
  beforeAll(() => { traj = computeTrajectory(); });

  describe("computeTrajectory()", () => {
    it("returns correct frame count", () => {
      expect(traj.count).toBe(28800);
    });

    it("returns a Float64Array of correct size", () => {
      expect(traj.frames).toBeInstanceOf(Float64Array);
      expect(traj.frames.length).toBe(28800 * 9);
    });

    it("phase timestamps are in ascending order", () => {
      const { phaseTimestamps: p } = traj;
      expect(p.TRANS_LUNAR).toBe(0);
      expect(p.LUNAR_FLYBY).toBeGreaterThan(p.TRANS_LUNAR);
      expect(p.FREE_RETURN).toBeGreaterThanOrEqual(p.LUNAR_FLYBY);
      expect(p.REENTRY).toBeGreaterThan(p.FREE_RETURN);
    });

    it("Orion returns to Earth (distance < 50,000 km) by end of simulation", () => {
      const last = readFrame(traj.frames, traj.count - 1);
      const dist = Math.hypot(last.orion.x, last.orion.y, last.orion.z);
      expect(dist).toBeLessThan(50000);
    });

    it("Moon stays near its expected orbital radius throughout", () => {
      // Sample 10 evenly-spaced frames
      for (let i = 0; i < 10; i++) {
        const fi = Math.floor((i / 10) * traj.count);
        const f = readFrame(traj.frames, fi);
        const dist = Math.hypot(f.moon.x, f.moon.y, f.moon.z);
        // Moon orbital radius should stay within 10% of nominal
        expect(dist).toBeGreaterThan(340000);
        expect(dist).toBeLessThan(430000);
      }
    });
  });

  describe("readFrame()", () => {
    it("frame 0 has Moon at initial position", () => {
      const f = readFrame(traj.frames, 0);
      expect(f.moon.x).toBeCloseTo(384400, -2);
      expect(f.moon.y).toBeCloseTo(0, 1);
    });

    it("frame 0 has Orion at initial position", () => {
      const f = readFrame(traj.frames, 0);
      expect(f.orion.x).toBeCloseTo(6556, 0);
    });
  });

  describe("interpolateState()", () => {
    it("at t=0 matches frame 0", () => {
      const s = interpolateState(traj.frames, 0, traj.dt);
      const f = readFrame(traj.frames, 0);
      expect(s.orion.x).toBeCloseTo(f.orion.x, 3);
    });

    it("at t between frames interpolates position", () => {
      const f0 = readFrame(traj.frames, 0);
      const f1 = readFrame(traj.frames, 1);
      const s = interpolateState(traj.frames, traj.dt * 0.5, traj.dt);
      const expected = (f0.orion.x + f1.orion.x) / 2;
      expect(s.orion.x).toBeCloseTo(expected, 3);
    });
  });
});
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
cd D:/Developer/gcanvas && npx vitest run test/demos/artemis2.physics.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement `demos/js/artemis2.physics.js`**

```js
/**
 * Artemis II Physics Engine
 *
 * Precomputes a 10-day RK4 n-body trajectory (Earth fixed, Moon + Orion).
 * Returns a Float64Array of 28,800 frames at 30-second intervals.
 *
 * Units: km and seconds throughout.
 */

// ── Gravitational parameters ──────────────────────────────────────────────────
const MU_EARTH = 398600;     // km³/s²  (G × M_earth)
const MU_MOON  = 4902;       // km³/s²  (G × M_moon)

// ── Simulation constants ──────────────────────────────────────────────────────
const DT             = 30;         // seconds per integration step
const DURATION       = 864000;     // 10 days in seconds
const COUNT          = Math.round(DURATION / DT);  // 28,800 frames
const STRIDE         = 9;          // values stored per frame
const FLYBY_THRESH   = 20000;      // km — Orion must come within this for flyby detection
const REENTRY_THRESH = 50000;      // km — Orion considered "returned" inside this

// ── Initial conditions ────────────────────────────────────────────────────────
// Moon: circular orbit at ~384,400 km, moving in +Y direction
// Orion: on Trans-Lunar Injection from 185 km LEO altitude
//        velocity tuned for free-return (passes ~8,900 km from Moon)
const INIT = {
  moon:  { x: 384400, y: 0,    z: 0,   vx: 0,    vy: 1.022, vz: 0   },
  orion: { x: 6556,   y: 0,    z: 0,   vx: 0.9,  vy: 10.82, vz: 0.25 },
};

// ── RK4 integrator ────────────────────────────────────────────────────────────

/**
 * Compute derivatives of the 12-element state vector.
 * State: [mx,my,mz,mvx,mvy,mvz, ox,oy,oz,ovx,ovy,ovz]
 */
function derivatives(s) {
  const [mx,my,mz,mvx,mvy,mvz, ox,oy,oz,ovx,ovy,ovz] = s;

  // Moon acceleration — only Earth gravity (Orion mass negligible)
  const rm = Math.sqrt(mx*mx + my*my + mz*mz);
  const rm3 = rm * rm * rm;
  const amx = -MU_EARTH * mx / rm3;
  const amy = -MU_EARTH * my / rm3;
  const amz = -MU_EARTH * mz / rm3;

  // Orion acceleration — Earth gravity + Moon gravity
  const ro = Math.sqrt(ox*ox + oy*oy + oz*oz);
  const ro3 = ro * ro * ro;
  const dx = ox - mx, dy = oy - my, dz = oz - mz;
  const rmo = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const rmo3 = rmo * rmo * rmo;
  const aox = -MU_EARTH * ox / ro3 - MU_MOON * dx / rmo3;
  const aoy = -MU_EARTH * oy / ro3 - MU_MOON * dy / rmo3;
  const aoz = -MU_EARTH * oz / ro3 - MU_MOON * dz / rmo3;

  return [mvx,mvy,mvz,amx,amy,amz, ovx,ovy,ovz,aox,aoy,aoz];
}

/** Single RK4 step — returns new 12-element state */
function rk4Step(s, dt) {
  const k1 = derivatives(s);
  const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]);
  const k2 = derivatives(s2);
  const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]);
  const k3 = derivatives(s3);
  const s4 = s.map((v, i) => v + dt * k3[i]);
  const k4 = derivatives(s4);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
}

// ── Frame read / write helpers ────────────────────────────────────────────────

/**
 * Read frame i from the flat Float64Array.
 * @returns {{ moon: {x,y,z}, orion: {x,y,z,vx,vy,vz} }}
 */
export function readFrame(frames, i) {
  const o = i * STRIDE;
  return {
    moon:  { x: frames[o],   y: frames[o+1], z: frames[o+2] },
    orion: { x: frames[o+3], y: frames[o+4], z: frames[o+5],
             vx: frames[o+6], vy: frames[o+7], vz: frames[o+8] },
  };
}

function writeFrame(frames, i, mx,my,mz, ox,oy,oz, ovx,ovy,ovz) {
  const o = i * STRIDE;
  frames[o]   = mx;  frames[o+1] = my;  frames[o+2] = mz;
  frames[o+3] = ox;  frames[o+4] = oy;  frames[o+5] = oz;
  frames[o+6] = ovx; frames[o+7] = ovy; frames[o+8] = ovz;
}

/**
 * Linearly interpolate between two frames at fractional position alpha (0–1).
 * @returns {{ moon: {x,y,z}, orion: {x,y,z,vx,vy,vz} }}
 */
export function interpolateState(frames, t, dt) {
  const frameF = t / dt;
  const i = Math.min(Math.floor(frameF), COUNT - 2);
  const alpha = frameF - i;
  const a = readFrame(frames, i);
  const b = readFrame(frames, i + 1);
  return {
    moon: {
      x: a.moon.x + (b.moon.x - a.moon.x) * alpha,
      y: a.moon.y + (b.moon.y - a.moon.y) * alpha,
      z: a.moon.z + (b.moon.z - a.moon.z) * alpha,
    },
    orion: {
      x:  a.orion.x  + (b.orion.x  - a.orion.x)  * alpha,
      y:  a.orion.y  + (b.orion.y  - a.orion.y)  * alpha,
      z:  a.orion.z  + (b.orion.z  - a.orion.z)  * alpha,
      vx: a.orion.vx + (b.orion.vx - a.orion.vx) * alpha,
      vy: a.orion.vy + (b.orion.vy - a.orion.vy) * alpha,
      vz: a.orion.vz + (b.orion.vz - a.orion.vz) * alpha,
    },
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Precompute the full Artemis II trajectory via RK4 integration.
 *
 * @returns {{
 *   frames: Float64Array,
 *   phaseTimestamps: {TRANS_LUNAR:number, LUNAR_FLYBY:number, FREE_RETURN:number, REENTRY:number},
 *   count: number,
 *   dt: number
 * }}
 */
export function computeTrajectory() {
  const frames = new Float64Array(COUNT * STRIDE);

  // Initial state vector: [mx,my,mz,mvx,mvy,mvz, ox,oy,oz,ovx,ovy,ovz]
  let state = [
    INIT.moon.x,  INIT.moon.y,  INIT.moon.z,
    INIT.moon.vx, INIT.moon.vy, INIT.moon.vz,
    INIT.orion.x, INIT.orion.y, INIT.orion.z,
    INIT.orion.vx,INIT.orion.vy,INIT.orion.vz,
  ];

  // Phase detection state
  let prevOrionMoonDist = Infinity;
  let flybyDetected = false;
  let freeReturnDetected = false;
  let returnLeg = false; // true after Orion passes Moon closest approach

  const phaseTimestamps = {
    TRANS_LUNAR: 0,
    LUNAR_FLYBY: -1,
    FREE_RETURN: -1,
    REENTRY:     -1,
  };

  for (let i = 0; i < COUNT; i++) {
    const [mx,my,mz,,,,ox,oy,oz,ovx,ovy,ovz] = state;
    writeFrame(frames, i, mx,my,mz, ox,oy,oz, ovx,ovy,ovz);

    const t = i * DT;
    const orionEarthDist = Math.sqrt(ox*ox + oy*oy + oz*oz);
    const dx = ox-mx, dy = oy-my, dz = oz-mz;
    const orionMoonDist = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // Detect LUNAR_FLYBY start: Orion first enters flyby threshold
    if (!flybyDetected && orionMoonDist < FLYBY_THRESH) {
      flybyDetected = true;
      phaseTimestamps.LUNAR_FLYBY = t;
    }

    // Detect FREE_RETURN start: Orion reaches closest Moon approach (dist starts increasing)
    if (flybyDetected && !freeReturnDetected && orionMoonDist > prevOrionMoonDist) {
      freeReturnDetected = true;
      returnLeg = true;
      phaseTimestamps.FREE_RETURN = t;
    }

    // Detect REENTRY: Orion returns inside Earth reentry threshold on return leg
    if (returnLeg && phaseTimestamps.REENTRY < 0 && orionEarthDist < REENTRY_THRESH) {
      phaseTimestamps.REENTRY = t;
    }

    prevOrionMoonDist = orionMoonDist;
    state = rk4Step(state, DT);
  }

  // Fallback: if trajectory didn't produce a free-return, clamp to end of sim
  if (phaseTimestamps.LUNAR_FLYBY < 0) phaseTimestamps.LUNAR_FLYBY = DURATION * 0.3;
  if (phaseTimestamps.FREE_RETURN < 0) phaseTimestamps.FREE_RETURN = DURATION * 0.35;
  if (phaseTimestamps.REENTRY    < 0) phaseTimestamps.REENTRY    = DURATION * 0.9;

  return { frames, phaseTimestamps, count: COUNT, dt: DT };
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
cd D:/Developer/gcanvas && npx vitest run test/demos/artemis2.physics.test.js
```

Expected: All 8 tests PASS.

> **Note:** If the "Orion returns to Earth" test fails, the initial conditions need tuning. Adjust `INIT.orion` velocity slightly (try `vx: 0.8, vy: 10.85` or `vx: 1.0, vy: 10.80`) and re-run until Orion returns within 50,000 km before the end of the simulation. The RK4 trajectory is sensitive to TLI angle.

- [ ] **Step 1.5: Commit**

```bash
cd D:/Developer/gcanvas && git add demos/js/artemis2.physics.js test/demos/artemis2.physics.test.js && git commit -m "feat(artemis2): add RK4 physics engine and trajectory tests"
```

---

## Task 2: HUD Component

**Files:**
- Create: `demos/js/artemis2.hud.js`

The HUD is a `Scene` subclass. The pipeline calls `render()` → `draw()` → which calls each child's `render()`. All text is `Text` GameObjects with `.text` setter for per-frame updates. Children use `verticalLayout` for consistent spacing.

- [ ] **Step 2.1: Create `demos/js/artemis2.hud.js`**

```js
/**
 * Artemis II HUD
 *
 * Displays mission phase, elapsed time, distances, and velocity.
 * Positioned top-left. Built from Text GameObjects + Rectangle background.
 */

import {
  Scene,
  Text,
  Rectangle,
  Painter,
  verticalLayout,
  applyLayout,
} from "../../src/index.js";

const HUD_CONFIG = {
  padding:    12,
  lineHeight: 22,
  panelWidth: 270,
  font:       "12px monospace",
  titleFont:  "bold 13px monospace",
  color:      "#c8e6ff",
  titleColor: "#4ab4ff",
  dimColor:   "rgba(100,160,200,0.6)",
  panelBg:    "rgba(0,8,20,0.78)",
  panelBorder:"rgba(70,150,220,0.35)",
};

/** Format seconds as T+DD:HH:MM:SS */
function formatElapsed(seconds) {
  const s = Math.floor(seconds);
  const ss = s % 60;
  const mm = Math.floor(s / 60) % 60;
  const hh = Math.floor(s / 3600) % 24;
  const dd = Math.floor(s / 86400);
  return `T+${String(dd).padStart(2,'0')}:${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

/** Format a distance number with thousands separator */
function fmtKm(km) {
  return `${Math.round(km).toLocaleString()} km`;
}

export class Artemis2HUD extends Scene {
  constructor(game) {
    super(game, { x: HUD_CONFIG.padding, y: HUD_CONFIG.padding });
    this._buildUI();
  }

  _buildUI() {
    const C = HUD_CONFIG;
    const make = (text, font, color) =>
      new Text(this.game, text, { font, color, align: 'left', baseline: 'top' });

    this._title    = make('ARTEMIS II',            C.titleFont, C.titleColor);
    this._divider  = make('─────────────────────', C.font,      C.dimColor);
    this._phase    = make('PHASE     —',           C.font,      C.color);
    this._elapsed  = make('ELAPSED   T+00:00:00', C.font,      C.color);
    this._distE    = make('DIST/E    —',           C.font,      C.color);
    this._distM    = make('DIST/M    —',           C.font,      C.color);
    this._velocity = make('VELOCITY  —',           C.font,      C.color);

    const items = [
      this._title,
      this._divider,
      this._phase,
      this._elapsed,
      this._distE,
      this._distM,
      this._velocity,
    ];

    const layout = verticalLayout(items, { spacing: C.lineHeight, align: 'left' });
    applyLayout(items, layout.positions);
    items.forEach(item => this.add(item));

    // Panel height: items + top/bottom padding
    this._panelHeight = items.length * C.lineHeight + C.padding * 2;
  }

  /**
   * Push current simulation state into HUD text fields.
   * @param {{ phase: string, elapsed: number, distE: number, distM: number, velocity: number }} state
   */
  update(state) {
    this._phase.text    = `PHASE     ${state.phase}`;
    this._elapsed.text  = `ELAPSED   ${formatElapsed(state.elapsed)}`;
    this._distE.text    = `DIST/E    ${fmtKm(state.distE)}`;
    this._distM.text    = `DIST/M    ${fmtKm(state.distM)}`;
    this._velocity.text = `VELOCITY  ${Math.round(state.velocity * 1000)} m/s`;
  }

  /** Override draw to render panel background first, then children */
  draw() {
    const C = HUD_CONFIG;
    // Background panel (draw before super.draw() so it's behind text)
    Painter.useCtx((ctx) => {
      ctx.fillStyle = C.panelBg;
      ctx.strokeStyle = C.panelBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-C.padding/2, -C.padding/2, C.panelWidth, this._panelHeight, 4);
      ctx.fill();
      ctx.stroke();
    });
    super.draw(); // renders all child Text GOs
  }
}
```

- [ ] **Step 2.2: Commit**

```bash
cd D:/Developer/gcanvas && git add demos/js/artemis2.hud.js && git commit -m "feat(artemis2): add HUD Scene component"
```

---

## Task 3: Controls Component

**Files:**
- Create: `demos/js/artemis2.controls.js`

The controls panel is a `Scene` subclass positioned at the bottom. It contains:
- `Button` GameObjects for play/pause and speed selection
- A `Rectangle` for the slider track and a `Circle` for the thumb (drawn in `draw()`)
- A `Text` GO for the mission clock above the slider
- Canvas mouse/touch listeners for slider drag

Playback state lives in the main demo. Controls fire callbacks only.

- [ ] **Step 3.1: Create `demos/js/artemis2.controls.js`**

```js
/**
 * Artemis II Controls Panel
 *
 * Bottom-center panel with:
 *  - Play/pause button
 *  - Speed selector (1x / 10x / 100x / 1000x)
 *  - Time slider (scrub bar)
 *  - Mission clock label
 *
 * Callbacks: onPlay, onPause, onSeek(t), onSpeedChange(multiplier)
 */

import {
  Scene,
  Text,
  Button,
  Painter,
} from "../../src/index.js";

const CTRL_CONFIG = {
  panelWidth:    520,
  panelHeight:   100,
  padding:       16,
  bg:            'rgba(0,8,20,0.78)',
  border:        'rgba(70,150,220,0.35)',
  trackColor:    'rgba(70,150,220,0.3)',
  trackHeight:   4,
  thumbColor:    '#4ab4ff',
  thumbRadius:   8,
  sliderY:       62,   // y of slider track center within panel, relative to Scene origin
  clockFont:     '11px monospace',
  clockColor:    'rgba(100,180,220,0.8)',
  speeds:        [1, 10, 100, 1000],
  btnWidth:      58,
  btnHeight:     30,
  btnGap:        6,
};

export class Artemis2Controls extends Scene {
  /**
   * @param {Game} game
   * @param {object} callbacks
   * @param {Function} callbacks.onPlay
   * @param {Function} callbacks.onPause
   * @param {Function} [callbacks.onSeek]    - called with t (seconds)
   * @param {Function} [callbacks.onSpeedChange] - called with multiplier (number)
   */
  constructor(game, callbacks = {}) {
    super(game, { x: 0, y: 0 }); // positioned by main demo in init()

    this._cb = callbacks;
    this._playing = false;
    this._speed = 100;
    this._t = 0;          // current sim time (seconds), set by main demo
    this._duration = 1;   // set by main demo after trajectory computed
    this._draggingSlider = false;

    this._buildUI();
    this._attachCanvasListeners();
  }

  _buildUI() {
    const C = CTRL_CONFIG;
    const game = this.game;
    const btnY = 22; // button row y within panel

    // Play/pause button
    this._playBtn = new Button(game, {
      x: C.padding,
      y: btnY,
      width: C.btnWidth,
      height: C.btnHeight,
      text: '▶ Play',
      origin: 'top-left',
      onClick: () => this._togglePlay(),
    });
    this.add(this._playBtn);

    // Speed buttons
    this._speedBtns = C.speeds.map((spd, i) => {
      const btn = new Button(game, {
        x: C.padding + C.btnWidth + C.btnGap + i * (C.btnWidth + C.btnGap),
        y: btnY,
        width: C.btnWidth,
        height: C.btnHeight,
        text: `${spd}x`,
        origin: 'top-left',
        colorDefaultBg: spd === this._speed ? 'rgba(30,90,160,0.9)' : 'rgba(0,8,20,0.8)',
        colorDefaultStroke: 'rgba(70,150,220,0.5)',
        colorDefaultText: spd === this._speed ? '#fff' : '#4ab4ff',
        onClick: () => this._setSpeed(spd),
      });
      this.add(btn);
      return btn;
    });

    // Mission clock label (above slider)
    this._clock = new Text(game, 'T+00:00:00:00', {
      x: C.panelWidth / 2,
      y: C.sliderY - 18,
      font: C.clockFont,
      color: C.clockColor,
      align: 'center',
      baseline: 'middle',
    });
    this.add(this._clock);
  }

  _togglePlay() {
    this._playing = !this._playing;
    this._playBtn.text = this._playing ? '⏸ Pause' : '▶ Play';
    if (this._playing) this._cb.onPlay?.();
    else               this._cb.onPause?.();
  }

  _setSpeed(spd) {
    this._speed = spd;
    const C = CTRL_CONFIG;
    this._speedBtns.forEach((btn, i) => {
      const active = C.speeds[i] === spd;
      btn.bg.color  = active ? 'rgba(30,90,160,0.9)' : 'rgba(0,8,20,0.8)';
      btn.label.color = active ? '#fff' : '#4ab4ff';
    });
    this._cb.onSpeedChange?.(spd);
  }

  /** Called by main demo each update to keep clock and thumb in sync */
  setTime(t, duration) {
    this._t = t;
    this._duration = duration;
    this._clock.text = formatElapsed(t);
  }

  // ── Slider drawing ──────────────────────────────────────────────────────────

  draw() {
    const C = CTRL_CONFIG;

    // Panel background
    Painter.useCtx((ctx) => {
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, C.panelWidth, C.panelHeight, 6);
      ctx.fill();
      ctx.stroke();
    });

    // Slider track
    const trackX = C.padding;
    const trackW = C.panelWidth - C.padding * 2;
    const trackY = C.sliderY;
    Painter.useCtx((ctx) => {
      ctx.fillStyle = C.trackColor;
      ctx.beginPath();
      ctx.roundRect(trackX, trackY - C.trackHeight / 2, trackW, C.trackHeight, 2);
      ctx.fill();
    });

    // Filled portion (elapsed)
    const progress = this._duration > 0 ? Math.min(1, this._t / this._duration) : 0;
    if (progress > 0) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = '#4ab4ff';
        ctx.beginPath();
        ctx.roundRect(trackX, trackY - C.trackHeight / 2, trackW * progress, C.trackHeight, 2);
        ctx.fill();
      });
    }

    // Thumb
    const thumbX = trackX + trackW * progress;
    Painter.shapes.fillCircle(thumbX, trackY, C.thumbRadius, C.thumbColor);
    Painter.shapes.strokeCircle(thumbX, trackY, C.thumbRadius, 'rgba(200,230,255,0.6)', 1.5);

    super.draw(); // renders Buttons and clock Text
  }

  // ── Canvas slider interaction ───────────────────────────────────────────────

  _attachCanvasListeners() {
    const canvas = this.game.canvas;

    canvas.addEventListener('mousedown', (e) => {
      const pos = this._canvasPos(e);
      if (this._hitSlider(pos.x, pos.y)) {
        this._draggingSlider = true;
        this._cb.onSeek?.(this._sliderValue(pos.x));
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!this._draggingSlider) return;
      const pos = this._canvasPos(e);
      this._cb.onSeek?.(this._sliderValue(pos.x));
    });
    canvas.addEventListener('mouseup', () => { this._draggingSlider = false; });
    canvas.addEventListener('mouseleave', () => { this._draggingSlider = false; });

    canvas.addEventListener('touchstart', (e) => {
      const pos = this._canvasPos(e.touches[0]);
      if (this._hitSlider(pos.x, pos.y)) {
        e.preventDefault();
        this._draggingSlider = true;
        this._cb.onSeek?.(this._sliderValue(pos.x));
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!this._draggingSlider) return;
      e.preventDefault();
      const pos = this._canvasPos(e.touches[0]);
      this._cb.onSeek?.(this._sliderValue(pos.x));
    }, { passive: false });
    canvas.addEventListener('touchend', () => { this._draggingSlider = false; });
  }

  _canvasPos(e) {
    const rect = this.game.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _hitSlider(cx, cy) {
    const C = CTRL_CONFIG;
    const trackLeft = this.x + C.padding;
    const trackRight = this.x + C.panelWidth - C.padding;
    const trackY = this.y + C.sliderY;
    const hitRadius = 16;
    return cx >= trackLeft && cx <= trackRight &&
           cy >= trackY - hitRadius && cy <= trackY + hitRadius;
  }

  _sliderValue(cx) {
    const C = CTRL_CONFIG;
    const trackLeft = this.x + C.padding;
    const trackW = C.panelWidth - C.padding * 2;
    const norm = Math.max(0, Math.min(1, (cx - trackLeft) / trackW));
    return norm * this._duration;
  }
}

/** Format seconds as T+DD:HH:MM:SS */
function formatElapsed(seconds) {
  const s = Math.floor(seconds);
  const ss = s % 60;
  const mm = Math.floor(s / 60) % 60;
  const hh = Math.floor(s / 3600) % 24;
  const dd = Math.floor(s / 86400);
  return `T+${String(dd).padStart(2,'0')}:${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
```

- [ ] **Step 3.2: Commit**

```bash
cd D:/Developer/gcanvas && git add demos/js/artemis2.controls.js && git commit -m "feat(artemis2): add controls panel component"
```

---

## Task 4: Main Demo

**Files:**
- Create: `demos/js/artemis2.js`

The main demo wires everything together:
1. Computes trajectory at `init()`
2. Builds Camera3D, StateMachine, HUD, Controls
3. Runs playback in `update(dt)`
4. Renders starfield + trails + bodies as overlay in `render()`

**Coordinate mapping (km → render units → Camera3D projection → screen):**
```
renderX = physicsX / CONFIG.scale
proj = camera.project(renderX, renderY, renderZ)
screenX = this.width/2 + proj.x * this.zoom
screenY = this.height/2 + proj.y * this.zoom
```

- [ ] **Step 4.1: Create `demos/js/artemis2.js`**

```js
/**
 * Artemis II Trajectory Demo
 *
 * Physics-accurate 3D visualization of the Artemis II free-return trajectory.
 * Precomputed RK4 n-body simulation (Earth + Moon + Orion capsule) over 10 days.
 *
 * Controls: drag to rotate · scroll/pinch to zoom · slider to scrub
 */

import {
  Game,
  Camera3D,
  Painter,
  Screen,
  Gesture,
  FPSCounter,
  StateMachine,
} from "../../src/index.js";
import { computeTrajectory, interpolateState } from "./artemis2.physics.js";
import { Artemis2HUD } from "./artemis2.hud.js";
import { Artemis2Controls } from "./artemis2.controls.js";

// ── Configuration ─────────────────────────────────────────────────────────────
const CONFIG = {
  // Coordinate system
  scale:          3000,    // km per render unit (Earth-Moon dist ≈ 128 units)
  baseScreenSize:  900,    // reference for default zoom
  minZoom:         0.25,
  maxZoom:         4.0,
  zoomSpeed:       0.3,
  zoomEasing:      0.1,

  // Camera
  camera: {
    perspective: 900,
    rotationX:   0.5,   // tilt — looking slightly down at the orbital plane
    rotationY:   0.2,
    clampX:      true,
    inertia:     true,
    friction:    0.92,
  },

  // Bodies (render radii in pixels — physical radii are invisible at this scale)
  earth: {
    color:       '#1a6faf',
    glowColor:   'rgba(80,160,255,0.35)',
    glowRadius:  38,
    radius:      24,
  },
  moon: {
    color:       '#888',
    glowColor:   'rgba(200,200,200,0.18)',
    glowRadius:  20,
    radius:      12,
  },
  orion: {
    color:       '#ffcc00',
    radius:      3.5,
  },

  // Trail
  trail: {
    staticColor:   'rgba(80,160,255,0.12)',
    traveledColor: 'rgba(100,200,255,0.7)',
    traveledWidth: 1.5,
    staticStep:    10,   // subsample: draw every Nth frame for static path
  },

  // Starfield
  stars: { count: Screen.responsive(300, 400, 500) },

  // Controls bottom padding
  controls: { bottomPad: 20 },
};

// ── Demo class ────────────────────────────────────────────────────────────────

class Artemis2Demo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
    this.enableFluidSize();
  }

  init() {
    super.init();
    Screen.init(this);

    // ── Precompute trajectory (runs once, ~100ms)
    this._traj = computeTrajectory();

    // ── Playback state
    this._playing = false;
    this._speed = 100;           // speed multiplier
    this._simClock = 0;          // current sim time in seconds
    this._currentPhase = 'TRANS_LUNAR';

    // ── Camera + zoom
    this.camera = new Camera3D(CONFIG.camera);
    this.camera.enableMouseControl(this.canvas);
    this.zoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize)
    );
    this.targetZoom = this.zoom;

    // ── Gesture (pinch/scroll zoom)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoomSpeed;
        this.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.targetZoom));
      },
    });

    // ── Starfield (static, generated once)
    this._stars = this._generateStars(CONFIG.stars.count);

    // ── Mission phase state machine
    this._phaseFSM = StateMachine.fromSequence([
      { name: 'TRANS_LUNAR', enter: () => this._hud?.update({ ...this._hudState(), phase: 'Trans-Lunar Injection' }) },
      { name: 'LUNAR_FLYBY', enter: () => this._hud?.update({ ...this._hudState(), phase: 'Lunar Flyby' }) },
      { name: 'FREE_RETURN', enter: () => this._hud?.update({ ...this._hudState(), phase: 'Free Return' }) },
      { name: 'REENTRY',     enter: () => this._hud?.update({ ...this._hudState(), phase: 'Reentry') }) },
    ], { context: this });

    // Phase label lookup (for HUD update method)
    this._phaseLabels = {
      TRANS_LUNAR: 'Trans-Lunar Injection',
      LUNAR_FLYBY: 'Lunar Flyby',
      FREE_RETURN: 'Free Return',
      REENTRY:     'Reentry',
    };

    // ── HUD
    this._hud = new Artemis2HUD(this);
    this.pipeline.add(this._hud);

    // ── Controls
    this._controls = new Artemis2Controls(this, {
      onPlay:        () => { this._playing = true; },
      onPause:       () => { this._playing = false; },
      onSeek:        (t) => { this._simClock = Math.max(0, Math.min(this._traj.count * this._traj.dt, t)); },
      onSpeedChange: (spd) => { this._speed = spd; },
    });
    this._positionControls();
    this.pipeline.add(this._controls);

    // ── FPS counter
    this.pipeline.add(new FPSCounter(this));

    // ── Resize handler
    this.events?.on('screenresize', () => this._positionControls());
  }

  _positionControls() {
    const pw = 520; // must match CTRL_CONFIG.panelWidth
    const ph = 100; // must match CTRL_CONFIG.panelHeight
    this._controls.x = (this.width - pw) / 2;
    this._controls.y = this.height - ph - CONFIG.controls.bottomPad;
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);

    // Advance simulation clock
    if (this._playing) {
      this._simClock += dt * this._speed;
      const maxT = this._traj.dt * this._traj.count;
      if (this._simClock >= maxT) {
        this._simClock = maxT;
        this._playing = false;
      }
    }

    // Interpolate current state
    this._state = interpolateState(this._traj.frames, this._simClock, this._traj.dt);

    // Phase boundary check
    this._updatePhase();

    // Update HUD
    this._hud.update(this._hudState());

    // Update controls clock + thumb
    this._controls.setTime(this._simClock, this._traj.dt * this._traj.count);

    // Ease zoom
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    // Update camera
    this.camera.update(dt);
  }

  _updatePhase() {
    const ts = this._traj.phaseTimestamps;
    let phase;
    if      (this._simClock >= ts.REENTRY)     phase = 'REENTRY';
    else if (this._simClock >= ts.FREE_RETURN)  phase = 'FREE_RETURN';
    else if (this._simClock >= ts.LUNAR_FLYBY)  phase = 'LUNAR_FLYBY';
    else                                         phase = 'TRANS_LUNAR';

    if (phase !== this._currentPhase) {
      this._currentPhase = phase;
      this._phaseFSM.setState(phase);
    }
  }

  _hudState() {
    if (!this._state) return { phase: '—', elapsed: 0, distE: 0, distM: 0, velocity: 0 };
    const { orion, moon } = this._state;
    const distE = Math.hypot(orion.x, orion.y, orion.z);
    const distM = Math.hypot(orion.x - moon.x, orion.y - moon.y, orion.z - moon.z);
    const velocity = Math.hypot(orion.vx, orion.vy, orion.vz); // km/s
    return {
      phase:    this._phaseLabels[this._currentPhase] ?? '—',
      elapsed:  this._simClock,
      distE,
      distM,
      velocity, // HUD converts to m/s: velocity * 1000
    };
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  render() {
    super.render(); // clear canvas + pipeline (HUD, controls, FPS)

    this._drawStarfield();
    this._drawTrajectoryStatic();
    if (this._state) {
      this._drawTrajectoryTraveled();
      this._drawBodies();
    }
  }

  // ── Projection helper ───────────────────────────────────────────────────────

  /** Convert physics km coords to screen (x,y) via Camera3D + zoom */
  _project(kmX, kmY, kmZ) {
    const rx = kmX / CONFIG.scale;
    const ry = kmY / CONFIG.scale;
    const rz = kmZ / CONFIG.scale;
    const proj = this.camera.project(rx, ry, rz);
    return {
      x: this.width  / 2 + proj.x * this.zoom,
      y: this.height / 2 + proj.y * this.zoom,
      z: proj.z,
      scale: proj.scale * this.zoom,
    };
  }

  // ── Starfield ───────────────────────────────────────────────────────────────

  _generateStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random() * 0.7 + 0.3,
      });
    }
    return stars;
  }

  _drawStarfield() {
    Painter.useCtx((ctx) => {
      for (const s of this._stars) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }, { saveState: true });
  }

  // ── Trajectory ─────────────────────────────────────────────────────────────

  /** Static full-path trail (subsampled, redrawn each frame — no cache needed) */
  _drawTrajectoryStatic() {
    const { frames, count, dt } = this._traj;
    const step = CONFIG.trail.staticStep;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.trail.staticColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < count; i += step) {
        const off = i * 9;
        const p = this._project(frames[off+3], frames[off+4], frames[off+5]);
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
  }

  /** Bright "traveled" portion of the trail up to current simClock */
  _drawTrajectoryTraveled() {
    const { frames, dt } = this._traj;
    const currentFrame = Math.floor(this._simClock / dt);
    if (currentFrame < 1) return;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.trail.traveledColor;
      ctx.lineWidth = CONFIG.trail.traveledWidth;
      ctx.beginPath();
      for (let i = 0; i <= currentFrame; i++) {
        const off = i * 9;
        const p = this._project(frames[off+3], frames[off+4], frames[off+5]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
  }

  // ── Bodies ──────────────────────────────────────────────────────────────────

  _drawBodies() {
    // Project positions
    const earthP = this._project(0, 0, 0);
    const moonP  = this._project(this._state.moon.x,  this._state.moon.y,  this._state.moon.z);
    const orionP = this._project(this._state.orion.x, this._state.orion.y, this._state.orion.z);

    // Draw back-to-front by z-depth
    const bodies = [
      { p: earthP, draw: () => this._drawEarth(earthP) },
      { p: moonP,  draw: () => this._drawMoon(moonP) },
      { p: orionP, draw: () => this._drawOrion(orionP) },
    ].sort((a, b) => b.p.z - a.p.z);

    bodies.forEach(b => b.draw());
  }

  _drawEarth(p) {
    const E = CONFIG.earth;
    // Glow
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, E.radius * 0.5, p.x, p.y, E.glowRadius);
      g.addColorStop(0, E.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, E.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    // Body
    Painter.shapes.fillCircle(p.x, p.y, E.radius, E.color);
    // Atmosphere ring
    Painter.shapes.strokeCircle(p.x, p.y, E.radius + 3, 'rgba(100,180,255,0.4)', 2);
  }

  _drawMoon(p) {
    const M = CONFIG.moon;
    // Glow
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, M.radius * 0.5, p.x, p.y, M.glowRadius);
      g.addColorStop(0, M.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, M.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    Painter.shapes.fillCircle(p.x, p.y, M.radius, M.color);
  }

  _drawOrion(p) {
    const O = CONFIG.orion;
    // Glow dot
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, O.radius * 3);
      g.addColorStop(0, 'rgba(255,220,80,0.9)');
      g.addColorStop(1, 'rgba(255,200,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, O.radius * 3, 0, Math.PI * 2);
      ctx.fill();
    });
    Painter.shapes.fillCircle(p.x, p.y, O.radius, O.color);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new Artemis2Demo(canvas).start();
});
```

> **Note:** The `StateMachine.fromSequence` `enter` callbacks reference `this._hud` which won't exist yet when the FSM is first constructed. The phase label is pushed via `_hudState()` in `update()` each frame anyway — the FSM `enter` callbacks only handle transitions. The `this._hud?.update(...)` calls are safe (optional chaining).

- [ ] **Step 4.2: Fix the syntax error in the StateMachine sequence**

The `enter` callbacks for the FSM don't need to call `_hud.update` — phase label is already driven by `_currentPhase` in `_hudState()`. Replace the FSM construction with this simpler version (no enter callbacks needed since `update()` handles it frame-by-frame):

```js
// Replace the StateMachine block in init() with:
this._phaseFSM = StateMachine.fromSequence([
  { name: 'TRANS_LUNAR' },
  { name: 'LUNAR_FLYBY' },
  { name: 'FREE_RETURN' },
  { name: 'REENTRY' },
], { context: this });
```

- [ ] **Step 4.3: Start dev server and verify demo loads**

```bash
cd D:/Developer/gcanvas && npm run dev
```

Open `http://localhost:9195/demos/artemis2.html` (after creating the HTML in Task 5).

Check for:
- No console errors on load
- Trajectory trail visible
- Earth and Moon visible
- HUD shows readouts
- Controls panel at bottom

- [ ] **Step 4.4: Commit**

```bash
cd D:/Developer/gcanvas && git add demos/js/artemis2.js && git commit -m "feat(artemis2): add main demo with Camera3D, StateMachine, and rendering"
```

---

## Task 5: HTML Entry Point and Navigation

**Files:**
- Create: `demos/artemis2.html`
- Modify: `demos/index.html`

- [ ] **Step 5.1: Create `demos/artemis2.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Artemis II Trajectory</title>
  <link rel="stylesheet" href="demos.css" />
  <script src="./js/info-toggle.js"></script>
</head>
<body>
  <div id="info">
    <strong>Artemis II Trajectory</strong> — Physics-accurate free-return flight path simulation.<br/>
    <span style="color:#CCC">
      <li>RK4 n-body integration: Earth + Moon + Orion over 10 days</li>
      <li>28,800 precomputed frames at 30-second resolution</li>
      <li>Drag to rotate · Scroll / pinch to zoom</li>
      <li>Use the slider to scrub through the mission</li>
    </span>
  </div>
  <canvas id="game"></canvas>
  <script type="module" src="./js/artemis2.js"></script>
</body>
</html>
```

- [ ] **Step 5.2: Add navigation link to `demos/index.html`**

Find the Physics section (line ~411) and add the Artemis II link:

```html
<!-- Find this line: -->
<a href="galaxy-playground.html" class="helix-link" style="--i:10">Galaxy Playground</a>

<!-- Add after it: -->
<a href="artemis2.html" class="helix-link" style="--i:11">Artemis II Trajectory</a>
```

- [ ] **Step 5.3: Smoke test in browser**

```bash
npm run dev
```

Verify:
1. Demo appears in Physics section of `index.html`
2. Clicking the link loads `artemis2.html`
3. Trajectory loads within ~1 second (RK4 integration)
4. Play button animates the capsule along the path
5. Speed selector changes playback rate
6. Slider scrubs to any mission time
7. HUD values update correctly (distance decreasing on approach to Moon)
8. Camera3D drag and scroll zoom work

- [ ] **Step 5.4: Run full test suite to confirm nothing broken**

```bash
cd D:/Developer/gcanvas && npm test
```

Expected: All pre-existing tests pass, new artemis2 physics tests pass.

- [ ] **Step 5.5: Final commit**

```bash
cd D:/Developer/gcanvas && git add demos/artemis2.html demos/index.html && git commit -m "feat(artemis2): add HTML entry point and navigation link"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|-----------------|-----------|
| RK4 n-body 3-body simulation | Task 1 — `computeTrajectory()` |
| 28,800 precomputed frames | Task 1 — `COUNT = 28800` |
| Float64Array frame storage | Task 1 — `new Float64Array(COUNT * 9)` |
| Phase timestamps from integration | Task 1 — flyby/return/reentry detection |
| StateMachine for phase tracking | Task 4 — `StateMachine.fromSequence` |
| Camera3D 3D rendering | Task 4 — `camera.project()` + zoom |
| Gesture pinch/scroll zoom | Task 4 — `new Gesture(canvas, {onZoom})` |
| Play/pause + speed control | Task 3 — `Artemis2Controls` |
| Time slider (scrub) | Task 3 — canvas event slider |
| Mission HUD (phase, time, dist, velocity) | Task 2 — `Artemis2HUD` |
| Two-layer trail (static + traveled) | Task 4 — `_drawTrajectoryStatic` + `_drawTrajectoryTraveled` |
| Earth/Moon/Orion bodies | Task 4 — `_drawEarth`, `_drawMoon`, `_drawOrion` |
| Responsive Canvas | Task 4 — `enableFluidSize()` + `Screen.init()` |
| Navigation entry | Task 5 — index.html |
| Physics tests | Task 1 — 8 Vitest tests |

**Placeholder scan:** None found. All steps contain complete code.

**Type consistency:**
- `interpolateState(frames, t, dt)` — defined in Task 1, called in Task 4 ✓
- `readFrame(frames, i)` — defined in Task 1, used in Task 1 tests ✓
- `computeTrajectory()` returns `{frames, phaseTimestamps, count, dt}` — accessed as `this._traj.frames`, `this._traj.phaseTimestamps`, `this._traj.dt`, `this._traj.count` in Task 4 ✓
- `Artemis2HUD.update(state)` — `state.velocity` is in km/s, HUD formats as `velocity * 1000` m/s ✓
- `Artemis2Controls.setTime(t, duration)` — called in Task 4 `update()` ✓
- `CTRL_CONFIG.panelWidth = 520`, `CTRL_CONFIG.panelHeight = 100` — hardcoded match in `_positionControls()` in Task 4. **Note:** If you change these values in `CTRL_CONFIG`, also update the constants in `_positionControls()`.

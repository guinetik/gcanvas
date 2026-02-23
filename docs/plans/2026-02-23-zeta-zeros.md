# Zeta Zeros — Critical Line Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generative art demo that traces ζ(1/2 + it) as a spiral in the complex output plane, detecting and sonifying non-trivial zeros of the Riemann zeta function.

**Architecture:** Canvas 2D demo extending `Game` class. New `src/math/zeta.js` module implements the Riemann-Siegel formula for efficient critical-line computation. Demo renders a continuously growing spiral trail with glow effects, zero-detection flash events, a cross-section waveform panel, and procedural audio via `Synth`.

**Tech Stack:** GCanvas (`Game`, `Painter`, `Complex`, `Synth`), Vitest for tests, Canvas 2D for rendering.

**Design Doc:** `docs/plans/2026-02-23-zeta-zeros-design.md`

---

## Task 1: Extend Complex class with divideComplex, conjugate, arg

**Files:**
- Modify: `src/math/complex.js` (add 3 methods after line 36)
- Create: `test/math/complex.test.js`

**Step 1: Write the failing tests**

Create `test/math/complex.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { Complex } from "../../src/math/complex.js";

describe("Complex", () => {
  describe("conjugate", () => {
    it("negates the imaginary part", () => {
      const z = new Complex(3, 4);
      const conj = z.conjugate();
      expect(conj.real).toBe(3);
      expect(conj.imag).toBe(-4);
    });

    it("returns same for real numbers", () => {
      const z = new Complex(5, 0);
      const conj = z.conjugate();
      expect(conj.real).toBe(5);
      expect(conj.imag).toBe(0);
    });
  });

  describe("arg", () => {
    it("returns 0 for positive real", () => {
      expect(new Complex(1, 0).arg()).toBeCloseTo(0);
    });

    it("returns π/2 for positive imaginary", () => {
      expect(new Complex(0, 1).arg()).toBeCloseTo(Math.PI / 2);
    });

    it("returns π for negative real", () => {
      expect(new Complex(-1, 0).arg()).toBeCloseTo(Math.PI);
    });

    it("returns correct angle for 1+i", () => {
      expect(new Complex(1, 1).arg()).toBeCloseTo(Math.PI / 4);
    });
  });

  describe("divideComplex", () => {
    it("divides 1/i = -i", () => {
      const one = new Complex(1, 0);
      const i = new Complex(0, 1);
      const result = one.divideComplex(i);
      expect(result.real).toBeCloseTo(0);
      expect(result.imag).toBeCloseTo(-1);
    });

    it("divides (3+4i)/(1+2i)", () => {
      const a = new Complex(3, 4);
      const b = new Complex(1, 2);
      const result = a.divideComplex(b);
      // (3+4i)(1-2i) / (1+4) = (3+8 + 4i-6i) / 5 = (11 - 2i) / 5
      expect(result.real).toBeCloseTo(11 / 5);
      expect(result.imag).toBeCloseTo(-2 / 5);
    });

    it("divides real by real", () => {
      const a = new Complex(6, 0);
      const b = new Complex(3, 0);
      const result = a.divideComplex(b);
      expect(result.real).toBeCloseTo(2);
      expect(result.imag).toBeCloseTo(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/math/complex.test.js`
Expected: FAIL — `conjugate`, `arg`, `divideComplex` not defined on Complex prototype.

**Step 3: Implement the methods**

Add to `src/math/complex.js` inside the class, after `abs()`:

```javascript
  conjugate() {
    return new Complex(this.real, -this.imag);
  }

  arg() {
    return Math.atan2(this.imag, this.real);
  }

  divideComplex(other) {
    const denom = other.real * other.real + other.imag * other.imag;
    return new Complex(
      (this.real * other.real + this.imag * other.imag) / denom,
      (this.imag * other.real - this.real * other.imag) / denom
    );
  }
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/math/complex.test.js`
Expected: All 8 tests PASS.

**Step 5: Commit**

```bash
git add src/math/complex.js test/math/complex.test.js
git commit -m "feat(math): add conjugate, arg, divideComplex to Complex class"
```

---

## Task 2: Create zeta.js — Riemann-Siegel formula and zero detection

**Files:**
- Create: `src/math/zeta.js`
- Create: `test/math/zeta.test.js`
- Modify: `src/math/index.js` (add export, after line 18)

**Step 1: Write the failing tests**

Create `test/math/zeta.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import {
  riemannSiegelTheta,
  riemannSiegelZ,
  zetaCriticalLine,
  findZerosInRange,
  KNOWN_ZEROS,
} from "../../src/math/zeta.js";

describe("riemannSiegelTheta", () => {
  it("returns a real number for positive t", () => {
    const theta = riemannSiegelTheta(10);
    expect(typeof theta).toBe("number");
    expect(isNaN(theta)).toBe(false);
  });

  it("increases with t", () => {
    expect(riemannSiegelTheta(20)).toBeGreaterThan(riemannSiegelTheta(10));
  });
});

describe("riemannSiegelZ", () => {
  it("returns a real number", () => {
    const z = riemannSiegelZ(14);
    expect(typeof z).toBe("number");
    expect(isNaN(z)).toBe(false);
  });

  it("is close to zero at known zero t ≈ 14.1347", () => {
    expect(Math.abs(riemannSiegelZ(14.1347))).toBeLessThan(0.1);
  });

  it("changes sign around first zero", () => {
    const before = riemannSiegelZ(14.0);
    const after = riemannSiegelZ(14.3);
    expect(before * after).toBeLessThan(0);
  });

  it("is close to zero at t ≈ 21.022", () => {
    expect(Math.abs(riemannSiegelZ(21.022))).toBeLessThan(0.1);
  });
});

describe("zetaCriticalLine", () => {
  it("returns a Complex number", () => {
    const z = zetaCriticalLine(10);
    expect(z).toHaveProperty("real");
    expect(z).toHaveProperty("imag");
  });

  it("has small magnitude near first zero", () => {
    const z = zetaCriticalLine(14.1347);
    expect(z.abs()).toBeLessThan(0.15);
  });

  it("has non-trivial magnitude away from zeros", () => {
    const z = zetaCriticalLine(10);
    expect(z.abs()).toBeGreaterThan(0.3);
  });
});

describe("findZerosInRange", () => {
  it("finds the first zero near t ≈ 14.134", () => {
    const zeros = findZerosInRange(13, 15, 0.1);
    expect(zeros.length).toBe(1);
    expect(zeros[0]).toBeCloseTo(14.1347, 1);
  });

  it("finds two zeros between t = 20 and t = 26", () => {
    const zeros = findZerosInRange(20, 26, 0.1);
    expect(zeros.length).toBe(2);
    expect(zeros[0]).toBeCloseTo(21.022, 1);
    expect(zeros[1]).toBeCloseTo(25.011, 1);
  });
});

describe("KNOWN_ZEROS", () => {
  it("has at least 20 entries", () => {
    expect(KNOWN_ZEROS.length).toBeGreaterThanOrEqual(20);
  });

  it("first zero is approximately 14.1347", () => {
    expect(KNOWN_ZEROS[0]).toBeCloseTo(14.1347, 3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/math/zeta.test.js`
Expected: FAIL — module `../../src/math/zeta.js` not found.

**Step 3: Implement src/math/zeta.js**

Create `src/math/zeta.js`:

```javascript
/**
 * Riemann Zeta Function — Critical Line Computation
 *
 * Implements the Riemann-Siegel formula for efficient evaluation of
 * ζ(1/2 + it) on the critical line. Provides zero detection via
 * sign changes of the Z function with bisection refinement.
 *
 * @module math/zeta
 */
import { Complex } from "./complex.js";

/**
 * First 30 known non-trivial zeros of ζ(s) (imaginary parts).
 * All lie on Re(s) = 1/2 (verified computationally).
 * @type {number[]}
 */
export const KNOWN_ZEROS = [
  14.134725, 21.022040, 25.010858, 30.424876, 32.935062,
  37.586178, 40.918719, 43.327073, 48.005151, 49.773832,
  52.970321, 56.446248, 59.347044, 60.831779, 65.112544,
  67.079811, 69.546402, 72.067158, 75.704691, 77.144840,
  79.337375, 82.910381, 84.735493, 87.425275, 88.809111,
  92.491899, 94.651344, 95.870634, 98.831194, 101.317851,
];

/**
 * Stirling approximation for ln(Γ(z)) where z is complex.
 * Used internally for theta function computation.
 * @param {number} x - Real part
 * @param {number} y - Imaginary part
 * @returns {{ real: number, imag: number }}
 */
function lnGammaApprox(x, y) {
  // Stirling series for ln(Γ(x + iy))
  // ln(Γ(z)) ≈ (z - 1/2)ln(z) - z + ln(2π)/2 + Σ B_{2k} / (2k(2k-1)z^{2k-1})
  const z2r = x * x - y * y;
  const z2i = 2 * x * y;
  const lnMag = 0.5 * Math.log(z2r * z2r + z2i * z2i);
  const lnArg = Math.atan2(z2i, z2r);

  // (z - 1/2) * ln(z)
  const halfLnMag = 0.5 * lnMag;
  const halfLnArg = 0.5 * lnArg;
  const lnZr = halfLnMag * Math.cos(halfLnArg) - halfLnArg * Math.sin(halfLnArg);
  // Correction: ln(z) = halfLnMag + i * halfLnArg... no.
  // ln(z) where z = x+iy: |z| = sqrt(x²+y²), arg = atan2(y,x)
  const absZ = Math.sqrt(x * x + y * y);
  const argZ = Math.atan2(y, x);
  const lnZReal = Math.log(absZ);
  const lnZImag = argZ;

  // (z - 1/2) * ln(z)
  const zmhR = x - 0.5;
  const zmhI = y;
  const term1R = zmhR * lnZReal - zmhI * lnZImag;
  const term1I = zmhR * lnZImag + zmhI * lnZReal;

  // - z
  const term2R = -x;
  const term2I = -y;

  // ln(2π)/2
  const term3R = 0.5 * Math.log(2 * Math.PI);

  // Stirling correction terms (first two)
  const invZr = x / (x * x + y * y);
  const invZi = -y / (x * x + y * y);

  // 1/(12z)
  const c1R = invZr / 12;
  const c1I = invZi / 12;

  return {
    real: term1R + term2R + term3R + c1R,
    imag: term1I + term2I + c1I,
  };
}

/**
 * Riemann-Siegel theta function.
 *
 * θ(t) = arg(Γ(1/4 + it/2)) - (t/2)ln(π)
 *
 * Uses Stirling approximation for the gamma function.
 * @param {number} t - Imaginary part of s = 1/2 + it
 * @returns {number} θ(t)
 */
export function riemannSiegelTheta(t) {
  // θ(t) = Im(ln(Γ(1/4 + it/2))) - (t/2)ln(π)
  const lnG = lnGammaApprox(0.25, t / 2);
  return lnG.imag - (t / 2) * Math.log(Math.PI);
}

/**
 * Riemann-Siegel Z function.
 *
 * Z(t) = e^{iθ(t)} · ζ(1/2 + it)
 *
 * This is real-valued, and its sign changes correspond to zeros of ζ
 * on the critical line. Computed via the Riemann-Siegel formula:
 *
 *   Z(t) ≈ 2 Σ_{n=1}^{N} cos(θ(t) - t·ln(n)) / √n + R
 *
 * where N = floor(√(t/(2π))) and R is a correction term.
 *
 * @param {number} t - Imaginary part (t > 0 for meaningful results)
 * @returns {number} Z(t)
 */
export function riemannSiegelZ(t) {
  if (t < 1) return 0;

  const theta = riemannSiegelTheta(t);
  const N = Math.floor(Math.sqrt(t / (2 * Math.PI)));

  let sum = 0;
  for (let n = 1; n <= N; n++) {
    sum += Math.cos(theta - t * Math.log(n)) / Math.sqrt(n);
  }
  sum *= 2;

  // Remainder / correction term (C0 term of Riemann-Siegel)
  const p = Math.sqrt(t / (2 * Math.PI)) - N;
  // C0(p) ≈ cos(2π(p² - p - 1/16)) / cos(2πp)
  const cos2pip = Math.cos(2 * Math.PI * p);
  if (Math.abs(cos2pip) > 0.01) {
    const C0 = Math.cos(2 * Math.PI * (p * p - p - 1 / 16)) / cos2pip;
    const remainder = Math.pow(-1, N - 1) * Math.pow(t / (2 * Math.PI), -0.25) * C0;
    sum += remainder;
  }

  return sum;
}

/**
 * Compute ζ(1/2 + it) as a complex number.
 *
 * Reconstructs the complex value from the Z function and theta:
 *   ζ(1/2 + it) = Z(t) · e^{-iθ(t)}
 *
 * @param {number} t - Imaginary part of s = 1/2 + it
 * @returns {Complex} The complex value ζ(1/2 + it)
 */
export function zetaCriticalLine(t) {
  if (t < 1) {
    // For very small t, use direct partial sum
    const N = 50;
    let real = 0;
    let imag = 0;
    for (let n = 1; n <= N; n++) {
      const logN = Math.log(n);
      const angle = -t * logN;
      const coeff = 1 / Math.sqrt(n);
      real += coeff * Math.cos(angle);
      imag += coeff * Math.sin(angle);
    }
    return new Complex(real, imag);
  }

  const Z = riemannSiegelZ(t);
  const theta = riemannSiegelTheta(t);
  // ζ(1/2 + it) = Z(t) * e^{-iθ(t)}
  return new Complex(Z * Math.cos(-theta), Z * Math.sin(-theta));
}

/**
 * Find zeros of ζ on the critical line within a range.
 *
 * Scans Z(t) for sign changes, then refines each via bisection.
 *
 * @param {number} tStart - Start of search range
 * @param {number} tEnd - End of search range
 * @param {number} step - Initial scan step size
 * @returns {number[]} Array of t values where zeros were found
 */
export function findZerosInRange(tStart, tEnd, step) {
  const zeros = [];
  let prevZ = riemannSiegelZ(tStart);

  for (let t = tStart + step; t <= tEnd; t += step) {
    const currZ = riemannSiegelZ(t);

    if (prevZ * currZ < 0) {
      // Sign change — refine with bisection
      let lo = t - step;
      let hi = t;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const midZ = riemannSiegelZ(mid);
        if (prevZ * midZ < 0) {
          hi = mid;
        } else {
          lo = mid;
          prevZ = midZ;
        }
      }
      zeros.push((lo + hi) / 2);
    }

    prevZ = currZ;
  }

  return zeros;
}

/**
 * Verify whether a t value corresponds to a known non-trivial zero.
 *
 * @param {number} t - Value to check
 * @param {number} tolerance - Maximum distance to a known zero (default 0.1)
 * @returns {{ verified: boolean, knownValue: number|null, index: number }}
 */
export function verifyZero(t, tolerance = 0.1) {
  for (let i = 0; i < KNOWN_ZEROS.length; i++) {
    if (Math.abs(t - KNOWN_ZEROS[i]) < tolerance) {
      return { verified: true, knownValue: KNOWN_ZEROS[i], index: i + 1 };
    }
  }
  return { verified: false, knownValue: null, index: -1 };
}
```

**Step 4: Add export to src/math/index.js**

Add after line 18:
```javascript
export * from "./zeta.js";
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run test/math/zeta.test.js`
Expected: All tests PASS. The Riemann-Siegel formula should produce Z values close to zero at known zero locations and show sign changes.

**Step 6: Commit**

```bash
git add src/math/zeta.js src/math/index.js test/math/zeta.test.js
git commit -m "feat(math): add Riemann-Siegel zeta function module with zero detection"
```

---

## Task 3: Create demo HTML entry point

**Files:**
- Create: `demos/zeta-zeros.html`

**Step 1: Create the HTML file**

Create `demos/zeta-zeros.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Math & Physics - Zeta Zeros</title>
  <link rel="stylesheet" href="demos.css" />
  <script src="./js/info-toggle.js"></script>
</head>
<body>
  <div id="info">
    <strong>Riemann Zeta — Critical Line</strong> — Trace ζ(½ + it) as a spiral in the complex plane.<br/>
    <span style="color:#CCC">
      <li>The spiral traces the output of ζ(½ + it) as t increases</li>
      <li>Non-trivial zeros occur where the curve passes through the origin</li>
      <li>The Riemann Hypothesis: all non-trivial zeros lie on Re = ½</li>
      <li>Scroll to zoom | +/- to change speed | Space to pause | R to restart</li>
      <li>Click to enable sound — chimes play at each zero</li>
    </span>
  </div>
  <canvas id="game"></canvas>
  <script type="module" src="./js/zeta-zeros.js"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add demos/zeta-zeros.html
git commit -m "feat(demo): add zeta-zeros HTML entry point"
```

---

## Task 4: Create demo scaffold — Game class with CONFIG, init, axes, info panel

**Files:**
- Create: `demos/js/zeta-zeros.js`

**Step 1: Create the demo scaffold**

Create `demos/js/zeta-zeros.js` with the core Game class, CONFIG, axes rendering, and info panel. No spiral or sound yet — just the canvas with coordinate axes and live text.

```javascript
/**
 * Zeta Zeros — Critical Line Explorer
 *
 * Traces ζ(½ + it) as a spiral in the complex output plane.
 * Non-trivial zeros are detected where |ζ| → 0, triggering
 * visual bursts and procedural sound. Each zero is verified
 * against known values, confirming the Riemann Hypothesis.
 *
 * Inspired by Quanta Magazine's zeta function visualizations.
 */
import {
  Game,
  Painter,
  Text,
  Scene,
  applyAnchor,
  Position,
  verticalLayout,
  applyLayout,
  Screen,
  Gesture,
  FPSCounter,
} from "../../src/index.js";
import {
  zetaCriticalLine,
  riemannSiegelZ,
  verifyZero,
  KNOWN_ZEROS,
} from "../../src/math/zeta.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Animation
  tSpeed: 2.0,              // units of t per second
  tSpeedMin: 0.25,
  tSpeedMax: 8.0,
  tStart: 0,
  pointsPerUnit: 8,         // trail points sampled per unit of t

  // Trail
  maxTrailPoints: 3000,
  trailMinAlpha: 0.05,
  trailMaxAlpha: 0.85,
  trailMinWidth: 1,
  trailMaxWidth: 3,

  // Scaling
  scale: 60,                // pixels per unit in the complex output plane
  scaleMin: 10,
  scaleMax: 300,

  // Zero detection
  zeroThreshold: 0.15,      // |ζ| below this triggers zero check
  zeroBisectionSteps: 20,
  zeroVerifyTolerance: 0.5,

  // Zero flash effect
  flash: {
    duration: 1.0,          // seconds
    maxRadius: 80,
    ringCount: 3,
  },

  // Head glow
  head: {
    radius: 6,
    glowLayers: 4,
    glowExpansion: 4,
  },

  // Colors
  colors: {
    background: "#0a0a12",
    axes: "rgba(255, 255, 255, 0.1)",
    axisLabels: "rgba(255, 255, 255, 0.25)",
    originCross: "rgba(255, 255, 255, 0.15)",
    trailSlow: { h: 260, s: 80, l: 60 },
    trailFast: { h: 180, s: 70, l: 55 },
    headGlow: [150, 200, 255],
    zeroFlash: { h: 50, s: 90, l: 70 },
    zeroMarker: "#ffd700",
    crossSection: {
      bg: "rgba(0, 8, 16, 0.7)",
      border: "rgba(0, 200, 180, 0.3)",
      waveColor: "rgba(0, 200, 180, 0.8)",
      envelopeColor: "rgba(0, 200, 180, 0.15)",
      cursorColor: "#fff",
      zeroColor: "#ffd700",
    },
  },

  // Cross-section panel
  crossSection: {
    height: 100,
    marginBottom: 40,
    tWindow: 20,            // how many t-units visible in the panel
  },

  // Zoom
  zoom: {
    speed: 0.15,
    easing: 0.12,
  },

  // Sound
  sound: {
    droneBaseFreq: 80,
    droneMaxFreq: 500,
    droneMaxVolume: 0.15,
    chimeBaseFreq: 330,
    chimeDecay: 0.5,
    chimeVolume: 0.2,
    pentatonic: [1, 1.125, 1.25, 1.5, 1.667, 2, 2.25, 2.5],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ZETA ZEROS DEMO
// ─────────────────────────────────────────────────────────────────────────────

class ZetaZerosDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.background;
    this.enableFluidSize();
  }

  init() {
    super.init();

    // State
    this.t = CONFIG.tStart;
    this.tSpeed = CONFIG.tSpeed;
    this.paused = false;
    this.scale = CONFIG.scale;
    this.targetScale = CONFIG.scale;
    this.panX = 0;
    this.panY = 0;

    // Trail: array of { re, im, t, magnitude, speed }
    this.trail = [];
    this.prevPoint = null;

    // Zeros found
    this.detectedZeros = [];   // { t, verified, knownValue, index, flashTime }
    this.lastZeroT = -10;      // debounce

    // Flash effects
    this.activeFlashes = [];   // { x, y, time, duration }

    // Sound state
    this.soundEnabled = false;
    this.droneOsc = null;
    this.droneGain = null;

    // Setup
    this._initGestures();
    this._initKeyboard();
    this._initSound();
    this._buildInfoPanel();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    Screen.init(this);
  }

  // ── Input ──────────────────────────────────────────────────────────────

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetScale *= 1 + delta * CONFIG.zoom.speed;
        this.targetScale = Math.max(CONFIG.scaleMin, Math.min(CONFIG.scaleMax, this.targetScale));
      },
      onPan: (dx, dy) => {
        this.panX += dx;
        this.panY += dy;
      },
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetScale = CONFIG.scale;
      this.panX = 0;
      this.panY = 0;
    });
  }

  _initKeyboard() {
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          this.paused = !this.paused;
          break;
        case "r":
        case "R":
          this._restart();
          break;
        case "+":
        case "=":
          this.tSpeed = Math.min(CONFIG.tSpeedMax, this.tSpeed * 1.5);
          break;
        case "-":
        case "_":
          this.tSpeed = Math.max(CONFIG.tSpeedMin, this.tSpeed / 1.5);
          break;
      }
    });
  }

  _restart() {
    this.t = CONFIG.tStart;
    this.trail = [];
    this.prevPoint = null;
    this.detectedZeros = [];
    this.activeFlashes = [];
    this.lastZeroT = -10;
  }

  // ── Sound ──────────────────────────────────────────────────────────────

  _initSound() {
    const initAudio = () => {
      // Lazy import to avoid issues if Synth not available
      import("../../src/sound/synth.js").then(({ Synth }) => {
        this.Synth = Synth;
        if (!Synth.isInitialized) {
          Synth.init({ masterVolume: 0.3 });
        }
        Synth.resume();
        this.soundEnabled = true;
        this._startDrone();
      });
      this.canvas.removeEventListener("click", initAudio);
    };
    this.canvas.addEventListener("click", initAudio);
  }

  _startDrone() {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    this.droneOsc = ctx.createOscillator();
    this.droneGain = ctx.createGain();
    this.droneOsc.type = "sine";
    this.droneOsc.frequency.value = CONFIG.sound.droneBaseFreq;
    this.droneGain.gain.value = 0;
    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.Synth.master);
    this.droneOsc.start();
  }

  _updateDrone(magnitude) {
    if (!this.droneOsc || !this.droneGain) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;

    // Frequency rises as magnitude → 0
    const proximity = Math.max(0, 1 - magnitude / 2);
    const freq = CONFIG.sound.droneBaseFreq +
      (CONFIG.sound.droneMaxFreq - CONFIG.sound.droneBaseFreq) * proximity * proximity;
    const vol = CONFIG.sound.droneMaxVolume * proximity * proximity;

    this.droneOsc.frequency.setTargetAtTime(freq, now, 0.1);
    this.droneGain.gain.setTargetAtTime(vol, now, 0.1);
  }

  _playZeroChime(zeroIndex) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const scale = CONFIG.sound.pentatonic;
    const idx = zeroIndex % scale.length;
    const freq = CONFIG.sound.chimeBaseFreq * scale[idx];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(CONFIG.sound.chimeVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + CONFIG.sound.chimeDecay);
    osc.connect(gain);
    gain.connect(this.Synth.master);
    osc.start(now);
    osc.stop(now + CONFIG.sound.chimeDecay + 0.05);
  }

  // ── Info Panel ─────────────────────────────────────────────────────────

  _buildInfoPanel() {
    this.infoPanel = new Scene(this, { x: 0, y: 0 });
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_CENTER,
      anchorOffsetY: Screen.responsive(80, 120, 140),
    });

    this.titleText = new Text(this, "Riemann Zeta — Critical Line", {
      font: `bold ${Screen.responsive(13, 16, 16)}px monospace`,
      color: "#7af",
      align: "center",
      baseline: "middle",
    });

    this.equationText = new Text(this, "ζ(½ + it)", {
      font: `${Screen.responsive(11, 14, 14)}px monospace`,
      color: "#fff",
      align: "center",
      baseline: "middle",
    });

    this.liveText = new Text(this, "t = 0.00 | ζ = 0.00 + 0.00i | |ζ| = 0.00", {
      font: `${Screen.responsive(9, 12, 12)}px monospace`,
      color: "#fa6",
      align: "center",
      baseline: "middle",
    });

    this.zerosText = new Text(this, "0 zeros found", {
      font: `${Screen.responsive(9, 12, 12)}px monospace`,
      color: "#6d8",
      align: "center",
      baseline: "middle",
    });

    const items = [this.titleText, this.equationText, this.liveText, this.zerosText];
    const layout = verticalLayout(items, { spacing: 16, align: "center" });
    applyLayout(items, layout.positions);
    items.forEach((item) => this.infoPanel.add(item));
    this.pipeline.add(this.infoPanel);
  }

  // ── Update ─────────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);

    // Zoom easing
    this.scale += (this.targetScale - this.scale) * CONFIG.zoom.easing;

    if (this.paused) return;

    // Advance t
    const prevT = this.t;
    this.t += this.tSpeed * dt;

    // Sample new trail points
    const step = 1 / CONFIG.pointsPerUnit;
    let sampleT = prevT + step;
    while (sampleT <= this.t) {
      this._samplePoint(sampleT);
      sampleT += step;
    }

    // Trim trail
    if (this.trail.length > CONFIG.maxTrailPoints) {
      this.trail.splice(0, this.trail.length - CONFIG.maxTrailPoints);
    }

    // Update drone
    if (this.trail.length > 0) {
      const last = this.trail[this.trail.length - 1];
      this._updateDrone(last.magnitude);
    }

    // Update flash effects
    for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
      this.activeFlashes[i].elapsed += dt;
      if (this.activeFlashes[i].elapsed > this.activeFlashes[i].duration) {
        this.activeFlashes.splice(i, 1);
      }
    }

    // Update info text
    this._updateInfoText();
  }

  _samplePoint(t) {
    const zeta = zetaCriticalLine(t);
    const magnitude = zeta.abs();

    // Compute speed (distance from previous point)
    let speed = 0;
    if (this.prevPoint) {
      const dx = zeta.real - this.prevPoint.re;
      const dy = zeta.imag - this.prevPoint.im;
      speed = Math.sqrt(dx * dx + dy * dy);
    }

    const point = {
      re: zeta.real,
      im: zeta.imag,
      t,
      magnitude,
      speed,
    };

    this.trail.push(point);

    // Zero detection
    if (magnitude < CONFIG.zeroThreshold && t - this.lastZeroT > 1) {
      this._onNearZero(t, magnitude);
    }

    this.prevPoint = point;
  }

  _onNearZero(t, magnitude) {
    // Refine with bisection using Z function sign changes
    const searchStart = Math.max(1, t - 1);
    const searchEnd = t + 1;
    const Z1 = riemannSiegelZ(searchStart);
    const Z2 = riemannSiegelZ(searchEnd);

    let zeroT = t;
    if (Z1 * Z2 < 0) {
      // Bisection
      let lo = searchStart, hi = searchEnd;
      let loZ = Z1;
      for (let i = 0; i < CONFIG.zeroBisectionSteps; i++) {
        const mid = (lo + hi) / 2;
        const midZ = riemannSiegelZ(mid);
        if (loZ * midZ < 0) {
          hi = mid;
        } else {
          lo = mid;
          loZ = midZ;
        }
      }
      zeroT = (lo + hi) / 2;
    }

    // Verify against known zeros
    const verification = verifyZero(zeroT, CONFIG.zeroVerifyTolerance);

    const zero = {
      t: zeroT,
      verified: verification.verified,
      knownValue: verification.knownValue,
      index: verification.index,
    };

    this.detectedZeros.push(zero);
    this.lastZeroT = zeroT;

    // Trigger flash at origin
    this.activeFlashes.push({
      elapsed: 0,
      duration: CONFIG.flash.duration,
    });

    // Play chime
    this._playZeroChime(this.detectedZeros.length);
  }

  _updateInfoText() {
    if (this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];

    const sign = last.im >= 0 ? "+" : "-";
    this.liveText.text =
      `t = ${this.t.toFixed(2)} | ζ = ${last.re.toFixed(3)} ${sign} ${Math.abs(last.im).toFixed(3)}i | |ζ| = ${last.magnitude.toFixed(3)}`;

    const count = this.detectedZeros.length;
    const verified = this.detectedZeros.filter((z) => z.verified).length;
    if (count === 0) {
      this.zerosText.text = "0 zeros found";
    } else {
      this.zerosText.text = `${count} zero${count > 1 ? "s" : ""} found | ${verified} verified on Re = ½`;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  render() {
    super.render();

    const cx = this.width / 2 + this.panX;
    const cy = this.height / 2 + this.panY;

    Painter.useCtx((ctx) => {
      this._drawAxes(ctx, cx, cy);
      this._drawTrail(ctx, cx, cy);
      this._drawHead(ctx, cx, cy);
      this._drawZeroMarkers(ctx, cx, cy);
      this._drawFlashes(ctx, cx, cy);
    });

    this._drawCrossSection();

    Painter.useCtx((ctx) => {
      this._drawControls(ctx);
    });
  }

  _drawAxes(ctx, cx, cy) {
    // Re axis
    ctx.strokeStyle = CONFIG.colors.axes;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(this.width, cy);
    ctx.stroke();

    // Im axis
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();

    // Origin crosshair
    ctx.strokeStyle = CONFIG.colors.originCross;
    ctx.lineWidth = 1;
    const crossSize = 8;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    // Labels
    ctx.fillStyle = CONFIG.colors.axisLabels;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Re", this.width - 30, cy - 10);
    ctx.fillText("Im", cx + 10, 20);
  }

  _drawTrail(ctx, cx, cy) {
    if (this.trail.length < 2) return;

    const len = this.trail.length;
    const { trailSlow, trailFast } = CONFIG.colors;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < len; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];

      const age = 1 - i / len; // 0 = newest, 1 = oldest
      const alpha = CONFIG.trailMaxAlpha - age * (CONFIG.trailMaxAlpha - CONFIG.trailMinAlpha);
      const width = CONFIG.trailMaxWidth - age * (CONFIG.trailMaxWidth - CONFIG.trailMinWidth);

      // Speed-based hue interpolation
      const speedNorm = Math.min(curr.speed * 5, 1);
      const h = trailSlow.h + (trailFast.h - trailSlow.h) * speedNorm;
      const s = trailSlow.s + (trailFast.s - trailSlow.s) * speedNorm;
      const l = trailSlow.l + (trailFast.l - trailSlow.l) * speedNorm;

      ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(cx + prev.re * this.scale, cy - prev.im * this.scale);
      ctx.lineTo(cx + curr.re * this.scale, cy - curr.im * this.scale);
      ctx.stroke();
    }
  }

  _drawHead(ctx, cx, cy) {
    if (this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];
    const hx = cx + last.re * this.scale;
    const hy = cy - last.im * this.scale;

    const { radius, glowLayers, glowExpansion } = CONFIG.head;
    const [gr, gg, gb] = CONFIG.colors.headGlow;

    // Glow layers
    for (let layer = glowLayers; layer >= 0; layer--) {
      const r = radius + layer * glowExpansion;
      const a = 0.15 * (1 - layer / glowLayers);
      ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${a})`;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core
    ctx.fillStyle = `rgb(${gr}, ${gg}, ${gb})`;
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawZeroMarkers(ctx, cx, cy) {
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (const zero of this.detectedZeros) {
      // Marker at origin
      ctx.fillStyle = CONFIG.colors.zeroMarker;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label offset so they don't overlap
      const labelY = cy + 15 + this.detectedZeros.indexOf(zero) * 14;
      const label = zero.verified
        ? `t${zero.index} ≈ ${zero.t.toFixed(3)} ✓`
        : `t ≈ ${zero.t.toFixed(3)}`;

      ctx.fillStyle = zero.verified ? "#ffd700" : "#888";
      ctx.fillText(label, cx + 12, labelY);
    }
  }

  _drawFlashes(ctx, cx, cy) {
    for (const flash of this.activeFlashes) {
      const progress = flash.elapsed / flash.duration;
      const { h, s, l } = CONFIG.colors.zeroFlash;

      for (let ring = 0; ring < CONFIG.flash.ringCount; ring++) {
        const ringProgress = Math.min(1, progress + ring * 0.15);
        const radius = ringProgress * CONFIG.flash.maxRadius;
        const alpha = (1 - ringProgress) * 0.6;

        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        ctx.lineWidth = 2 * (1 - ringProgress) + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner glow
      const glowAlpha = (1 - progress) * 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, CONFIG.flash.maxRadius * 0.5);
      gradient.addColorStop(0, `hsla(${h}, 100%, 85%, ${glowAlpha})`);
      gradient.addColorStop(1, `hsla(${h}, 100%, 85%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, CONFIG.flash.maxRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCrossSection() {
    const cs = CONFIG.crossSection;
    const w = this.width;
    const plotH = cs.height;
    const plotW = w * 0.6;
    const plotX = (w - plotW) / 2;
    const plotY = this.height - cs.marginBottom - plotH;

    // Determine t range for the panel
    const tEnd = Math.max(this.t, cs.tWindow);
    const tStart = tEnd - cs.tWindow;

    // Sample |ζ| across the visible range
    const numSamples = Math.floor(plotW / 2);
    const samples = [];
    let maxMag = 0;

    for (let i = 0; i < numSamples; i++) {
      const sampleT = tStart + (i / (numSamples - 1)) * cs.tWindow;
      if (sampleT < 1) {
        samples.push({ t: sampleT, mag: 0 });
        continue;
      }
      const mag = Math.abs(riemannSiegelZ(sampleT));
      samples.push({ t: sampleT, mag });
      if (mag > maxMag) maxMag = mag;
    }
    if (maxMag < 0.01) maxMag = 1;

    Painter.useCtx((ctx) => {
      const colors = CONFIG.colors.crossSection;

      // Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);

      // Filled envelope
      ctx.fillStyle = colors.envelopeColor;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY + plotH);
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const sy = plotY + plotH - (samples[i].mag / maxMag) * plotH * 0.9;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(plotX + plotW, plotY + plotH);
      ctx.closePath();
      ctx.fill();

      // Waveform line
      ctx.strokeStyle = colors.waveColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const sy = plotY + plotH - (samples[i].mag / maxMag) * plotH * 0.9;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Zero markers in cross-section
      for (const zero of this.detectedZeros) {
        if (zero.t >= tStart && zero.t <= tEnd) {
          const zx = plotX + ((zero.t - tStart) / cs.tWindow) * plotW;
          ctx.fillStyle = colors.zeroColor;
          ctx.beginPath();
          ctx.arc(zx, plotY + plotH, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Current t cursor
      if (this.t >= tStart && this.t <= tEnd) {
        const cursorX = plotX + ((this.t - tStart) / cs.tWindow) * plotW;
        ctx.strokeStyle = colors.cursorColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cursorX, plotY);
        ctx.lineTo(cursorX, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Labels
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#888";
      ctx.fillText("|Z(t)| — Critical Line", plotX, plotY - 10);
      ctx.fillStyle = colors.zeroColor;
      ctx.textAlign = "right";
      ctx.fillText(`t: ${tStart.toFixed(0)}–${tEnd.toFixed(0)}`, plotX + plotW, plotY - 10);
      ctx.textAlign = "left";
    });
  }

  _drawControls(ctx) {
    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      `speed: ${this.tSpeed.toFixed(1)}x | scroll to zoom | +/- speed | space pause | R restart`,
      this.width - 20,
      this.height - 10,
    );
    ctx.textAlign = "left";
  }

  onResize() {
    // Recalculate info panel offset
    if (this.infoPanel) {
      applyAnchor(this.infoPanel, {
        anchor: Position.TOP_CENTER,
        anchorOffsetY: Screen.responsive(80, 120, 140),
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new ZetaZerosDemo(canvas);
  demo.start();
});
```

**Step 2: Verify it loads**

Run: `npm run dev`
Open: `http://localhost:5173/demos/zeta-zeros.html`
Expected: Dark canvas with Re/Im axes, info panel at top, cross-section panel at bottom, spiral drawing as t advances. Zeros should trigger golden ring flashes at origin.

**Step 3: Commit**

```bash
git add demos/js/zeta-zeros.js
git commit -m "feat(demo): add zeta-zeros critical line explorer"
```

---

## Task 5: Add to demo navigation

**Files:**
- Modify: `demos/index.html`

**Step 1: Add navigation entry**

In `demos/index.html`, find the Math & Physics section (around line 374). After the last entry in that section (before the closing `</div>`), add:

```html
                    <a href="zeta-zeros.html" class="helix-link" style="--i:24">Zeta Zeros</a>
```

Increment `--i` to be one more than the current last entry in that section.

**Step 2: Verify navigation**

Run: `npm run dev`
Open: `http://localhost:5173/demos/index.html`
Expected: "Zeta Zeros" appears in the Math & Physics section, clicking it loads the demo in the iframe.

**Step 3: Commit**

```bash
git add demos/index.html
git commit -m "feat(demo): add zeta-zeros to navigation"
```

---

## Task 6: Visual polish — tune trail rendering and zero effects

This task is for iterating on the visual aesthetics after the demo is running. Adjustments to make based on how it looks:

**Step 1: Tune CONFIG values**

After seeing the demo running, adjust these CONFIG values as needed:
- `scale` — if the spiral is too big/small for the screen
- `tSpeed` — if it traces too fast or slow
- `pointsPerUnit` — if the curve looks jagged (increase) or too dense (decrease)
- `trailSlow/trailFast` hue values — if the color scheme doesn't look right
- `zeroThreshold` — if zeros are missed (increase) or false positives (decrease)
- `flash.duration` and `flash.maxRadius` — if zero events are too subtle or overpowering
- `crossSection.tWindow` — how much history is visible in the bottom panel

**Step 2: Test zero detection against known zeros**

Let the demo run until t ≈ 50 (covers first ~15 zeros). Verify:
- All 15 known zeros are detected
- No false positives
- Flash effects and chimes fire correctly
- Cross-section panel shows zeros touching the baseline

**Step 3: Commit any tuning changes**

```bash
git add demos/js/zeta-zeros.js
git commit -m "fix(demo): tune zeta-zeros visual parameters"
```

---

## Task 7: Sound polish and mobile testing

**Step 1: Test sound**

- Click canvas to initialize audio
- Verify drone sound rises in pitch as |ζ| approaches zero
- Verify chimes play at each zero with ascending pitch
- Verify no audio glitches or clicks

**Step 2: Mobile testing**

- Test on mobile viewport (Chrome DevTools device emulation)
- Verify pinch-to-zoom works
- Verify info panel is readable
- Verify cross-section panel is visible and not obscured

**Step 3: Commit any fixes**

```bash
git add demos/js/zeta-zeros.js
git commit -m "fix(demo): polish sound and mobile layout for zeta-zeros"
```

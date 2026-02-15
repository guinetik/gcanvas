# Hydrogen Orbital Visualizer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the Atoms hydrogen quantum orbital visualizer to gcanvas using WebGL particle rendering and the playground UI pattern.

**Architecture:** New `src/math/hydrogen.js` module with pure math functions (Laguerre polynomials, Legendre polynomials, spherical harmonics, CDF sampling). Demo class `HydrogenOrbitalDemo` extends `Game`, uses `WebGLParticleRenderer` for GPU point sprites, `Camera3D` for 3D navigation, and `AccordionGroup` for a control panel following the quantum-manifold/caos-playground pattern.

**Tech Stack:** gcanvas (Game, Camera3D, WebGLParticleRenderer, AccordionGroup UI), Vitest for tests, no external dependencies.

---

## Task 1: Core Math — Associated Laguerre Polynomials

**Files:**
- Create: `src/math/hydrogen.js`
- Create: `test/math/hydrogen.test.js`

**Step 1: Write the failing test**

```javascript
// test/math/hydrogen.test.js
import { describe, it, expect } from "vitest";
import { associatedLaguerre } from "../../src/math/hydrogen.js";

describe("associatedLaguerre", () => {
  // L_0^alpha(x) = 1 for any alpha, x
  it("returns 1 for n=0", () => {
    expect(associatedLaguerre(0, 0, 5)).toBeCloseTo(1);
    expect(associatedLaguerre(0, 3, 2.5)).toBeCloseTo(1);
  });

  // L_1^alpha(x) = 1 + alpha - x
  it("returns 1+alpha-x for n=1", () => {
    expect(associatedLaguerre(1, 0, 2)).toBeCloseTo(-1);    // 1+0-2
    expect(associatedLaguerre(1, 3, 1)).toBeCloseTo(3);      // 1+3-1
    expect(associatedLaguerre(1, 2, 0.5)).toBeCloseTo(2.5);  // 1+2-0.5
  });

  // L_2^0(x) = 1 - 2x + x^2/2
  it("computes L_2^0 correctly", () => {
    expect(associatedLaguerre(2, 0, 0)).toBeCloseTo(1);
    expect(associatedLaguerre(2, 0, 2)).toBeCloseTo(-1);     // 1-4+2
    expect(associatedLaguerre(2, 0, 4)).toBeCloseTo(1);      // 1-8+8
  });

  // L_1^1(x) = 2 - x  (used in hydrogen 2p orbital)
  it("computes L_1^1 for hydrogen 2p", () => {
    expect(associatedLaguerre(1, 1, 0)).toBeCloseTo(2);
    expect(associatedLaguerre(1, 1, 1)).toBeCloseTo(1);
    expect(associatedLaguerre(1, 1, 2)).toBeCloseTo(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```javascript
// src/math/hydrogen.js

const BOHR_RADIUS = 1; // natural units

/**
 * Associated Laguerre polynomial L_n^alpha(x) via recurrence.
 * L_0^a(x) = 1
 * L_1^a(x) = 1 + a - x
 * k * L_k^a(x) = (2k - 1 + a - x) * L_{k-1}^a(x) - (k - 1 + a) * L_{k-2}^a(x)
 */
export function associatedLaguerre(n, alpha, x) {
  if (n === 0) return 1;
  if (n === 1) return 1 + alpha - x;
  let prev2 = 1;
  let prev1 = 1 + alpha - x;
  for (let k = 2; k <= n; k++) {
    const curr = ((2 * k - 1 + alpha - x) * prev1 - (k - 1 + alpha) * prev2) / k;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add src/math/hydrogen.js test/math/hydrogen.test.js
git commit -m "feat(math): add associated Laguerre polynomial"
```

---

## Task 2: Core Math — Associated Legendre Polynomials

**Files:**
- Modify: `src/math/hydrogen.js`
- Modify: `test/math/hydrogen.test.js`

**Step 1: Write the failing test**

Append to `test/math/hydrogen.test.js`:

```javascript
import { associatedLaguerre, associatedLegendre } from "../../src/math/hydrogen.js";

describe("associatedLegendre", () => {
  // P_0^0(x) = 1
  it("returns 1 for l=0 m=0", () => {
    expect(associatedLegendre(0, 0, 0.5)).toBeCloseTo(1);
  });

  // P_1^0(x) = x
  it("returns x for l=1 m=0", () => {
    expect(associatedLegendre(1, 0, 0.5)).toBeCloseTo(0.5);
    expect(associatedLegendre(1, 0, 0)).toBeCloseTo(0);
  });

  // P_1^1(x) = -sqrt(1-x^2)
  it("computes P_1^1 correctly", () => {
    expect(associatedLegendre(1, 1, 0)).toBeCloseTo(-1);
    expect(associatedLegendre(1, 1, 0.5)).toBeCloseTo(-Math.sqrt(0.75));
  });

  // P_2^0(x) = (3x^2 - 1)/2
  it("computes P_2^0 correctly", () => {
    expect(associatedLegendre(2, 0, 0)).toBeCloseTo(-0.5);
    expect(associatedLegendre(2, 0, 1)).toBeCloseTo(1);
  });

  // P_2^1(x) = -3x*sqrt(1-x^2)
  it("computes P_2^1 correctly", () => {
    expect(associatedLegendre(2, 1, 0.5)).toBeCloseTo(-3 * 0.5 * Math.sqrt(0.75));
  });

  // P_2^2(x) = 3(1-x^2)
  it("computes P_2^2 correctly", () => {
    expect(associatedLegendre(2, 2, 0)).toBeCloseTo(3);
    expect(associatedLegendre(2, 2, 0.5)).toBeCloseTo(3 * 0.75);
  });

  // Negative m: uses |m| (handled internally)
  it("handles negative m", () => {
    const pos = associatedLegendre(2, 1, 0.5);
    const neg = associatedLegendre(2, -1, 0.5);
    // P_l^{-m} = (-1)^m * (l-m)!/(l+m)! * P_l^m
    // For l=2,m=1: factor = -1 * 1!/3! = -1/6
    expect(neg).toBeCloseTo(pos * (-1) * (1 / 6));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: FAIL — associatedLegendre not exported

**Step 3: Write implementation**

Append to `src/math/hydrogen.js`:

```javascript
/**
 * Associated Legendre polynomial P_l^m(x) via recurrence.
 * Handles negative m via the relation:
 * P_l^{-m}(x) = (-1)^m * (l-m)!/(l+m)! * P_l^m(x)
 */
export function associatedLegendre(l, m, x) {
  const absM = Math.abs(m);

  // Start with P_m^m via the closed form:
  // P_m^m(x) = (-1)^m * (2m-1)!! * (1-x^2)^(m/2)
  let pmm = 1;
  if (absM > 0) {
    const somx2 = Math.sqrt((1 - x) * (1 + x));
    let fact = 1;
    for (let j = 1; j <= absM; j++) {
      pmm *= -fact * somx2;
      fact += 2;
    }
  }

  if (l === absM) {
    return m < 0 ? negMFactor(l, m) * pmm : pmm;
  }

  // P_{m+1}^m(x) = x * (2m+1) * P_m^m(x)
  let pmm1 = x * (2 * absM + 1) * pmm;
  if (l === absM + 1) {
    return m < 0 ? negMFactor(l, m) * pmm1 : pmm1;
  }

  // Recurrence for higher l:
  // (l-m)*P_l^m = x*(2l-1)*P_{l-1}^m - (l+m-1)*P_{l-2}^m
  let result = 0;
  for (let ll = absM + 2; ll <= l; ll++) {
    result = (x * (2 * ll - 1) * pmm1 - (ll + absM - 1) * pmm) / (ll - absM);
    pmm = pmm1;
    pmm1 = result;
  }

  return m < 0 ? negMFactor(l, m) * result : result;
}

function negMFactor(l, m) {
  const absM = Math.abs(m);
  let factor = (absM % 2 === 0) ? 1 : -1;
  // (l-|m|)! / (l+|m|)!
  for (let i = l - absM + 1; i <= l + absM; i++) {
    factor /= i;
  }
  return factor;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/math/hydrogen.js test/math/hydrogen.test.js
git commit -m "feat(math): add associated Legendre polynomial"
```

---

## Task 3: Core Math — Radial & Angular Wave Functions

**Files:**
- Modify: `src/math/hydrogen.js`
- Modify: `test/math/hydrogen.test.js`

**Step 1: Write the failing tests**

```javascript
import { associatedLaguerre, associatedLegendre, radialWaveFunction, angularWaveFunction, probabilityDensity } from "../../src/math/hydrogen.js";

describe("radialWaveFunction", () => {
  // R_1,0(r) for hydrogen 1s: 2 * exp(-r) (with a0=1)
  it("computes 1s radial correctly at r=0", () => {
    const R = radialWaveFunction(1, 0, 0);
    expect(R).toBeCloseTo(2); // 2 * e^0
  });

  it("computes 1s radial correctly at r=1", () => {
    const R = radialWaveFunction(1, 0, 1);
    expect(R).toBeCloseTo(2 * Math.exp(-1));
  });

  // R must be 0 at r=0 for l>0
  it("returns 0 at r=0 for l>0", () => {
    expect(radialWaveFunction(2, 1, 0)).toBeCloseTo(0);
    expect(radialWaveFunction(3, 2, 0)).toBeCloseTo(0);
  });

  // R should be finite and real for reasonable inputs
  it("produces finite values for higher n", () => {
    const R = radialWaveFunction(4, 2, 5);
    expect(isFinite(R)).toBe(true);
  });
});

describe("angularWaveFunction", () => {
  // Y_0^0 is constant: 1/(2*sqrt(pi))
  it("returns constant for l=0 m=0", () => {
    const y1 = angularWaveFunction(0, 0, 0);
    const y2 = angularWaveFunction(0, 0, Math.PI / 2);
    expect(y1).toBeCloseTo(y2);
    expect(y1).toBeCloseTo(1 / (2 * Math.sqrt(Math.PI)));
  });

  // Y_1^0 has cos(theta) dependence
  it("has cos(theta) dependence for l=1 m=0", () => {
    const atPole = angularWaveFunction(1, 0, 0);
    const atEquator = angularWaveFunction(1, 0, Math.PI / 2);
    expect(atEquator).toBeCloseTo(0, 5);
    expect(Math.abs(atPole)).toBeGreaterThan(0);
  });
});

describe("probabilityDensity", () => {
  // |psi|^2 should be positive
  it("returns positive values", () => {
    expect(probabilityDensity(1, 0, 0, 1, 0)).toBeGreaterThan(0);
    expect(probabilityDensity(2, 1, 0, 2, Math.PI / 4)).toBeGreaterThan(0);
  });

  // 1s orbital: spherically symmetric (no theta dependence)
  it("is spherically symmetric for 1s", () => {
    const p1 = probabilityDensity(1, 0, 0, 1, 0);
    const p2 = probabilityDensity(1, 0, 0, 1, Math.PI / 2);
    const p3 = probabilityDensity(1, 0, 0, 1, Math.PI);
    expect(p1).toBeCloseTo(p2);
    expect(p2).toBeCloseTo(p3);
  });

  // 2p (m=0): zero at theta=pi/2 is wrong, zero at r=0 is right
  it("is zero at r=0 for 2p orbital", () => {
    expect(probabilityDensity(2, 1, 0, 0, Math.PI / 4)).toBeCloseTo(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: FAIL — functions not exported

**Step 3: Write implementation**

Append to `src/math/hydrogen.js`:

```javascript
/**
 * Radial wave function R_{n,l}(r) for hydrogen atom.
 * R_{n,l}(r) = sqrt((2/(n*a0))^3 * (n-l-1)! / (2n*((n+l)!)^3)) * exp(-rho/2) * rho^l * L_{n-l-1}^{2l+1}(rho)
 * where rho = 2r / (n * a0)
 */
export function radialWaveFunction(n, l, r) {
  const rho = (2 * r) / (n * BOHR_RADIUS);

  // Normalization: sqrt( (2/(n*a0))^3 * (n-l-1)! / (2*n*((n+l)!)) )
  const prefactor = Math.pow(2 / (n * BOHR_RADIUS), 3);
  const num = factorial(n - l - 1);
  const den = 2 * n * factorial(n + l);
  const norm = Math.sqrt(prefactor * num / den);

  const expPart = Math.exp(-rho / 2);
  const rhoPart = Math.pow(rho, l);
  const lagPart = associatedLaguerre(n - l - 1, 2 * l + 1, rho);

  return norm * expPart * rhoPart * lagPart;
}

/**
 * Angular wave function (real spherical harmonic theta part).
 * Returns the normalized associated Legendre polynomial with spherical harmonic normalization.
 * Y_l^m depends on theta only (phi dependence handled separately in sampling).
 */
export function angularWaveFunction(l, m, theta) {
  const absM = Math.abs(m);
  const norm = Math.sqrt(
    ((2 * l + 1) / (4 * Math.PI)) * (factorial(l - absM) / factorial(l + absM))
  );
  return norm * associatedLegendre(l, absM, Math.cos(theta));
}

/**
 * Probability density |psi(n,l,m,r,theta)|^2 = |R_{n,l}(r)|^2 * |Y_l^m(theta)|^2
 */
export function probabilityDensity(n, l, m, r, theta) {
  const R = radialWaveFunction(n, l, r);
  const Y = angularWaveFunction(l, m, theta);
  return R * R * Y * Y;
}

function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/math/hydrogen.js test/math/hydrogen.test.js
git commit -m "feat(math): add radial/angular wave functions and probability density"
```

---

## Task 4: Core Math — CDF Sampling & Utilities

**Files:**
- Modify: `src/math/hydrogen.js`
- Modify: `test/math/hydrogen.test.js`

**Step 1: Write the failing tests**

```javascript
import { associatedLaguerre, associatedLegendre, radialWaveFunction, angularWaveFunction, probabilityDensity, sampleOrbitalPositions, validateQuantumNumbers, orbitalLabel } from "../../src/math/hydrogen.js";

describe("validateQuantumNumbers", () => {
  it("passes valid quantum numbers through", () => {
    expect(validateQuantumNumbers(3, 2, 1)).toEqual({ n: 3, l: 2, m: 1 });
  });

  it("clamps l to n-1", () => {
    expect(validateQuantumNumbers(2, 5, 0)).toEqual({ n: 2, l: 1, m: 0 });
  });

  it("clamps m to [-l, l]", () => {
    expect(validateQuantumNumbers(3, 1, 5)).toEqual({ n: 3, l: 1, m: 1 });
    expect(validateQuantumNumbers(3, 1, -5)).toEqual({ n: 3, l: 1, m: -1 });
  });

  it("clamps n to minimum 1", () => {
    expect(validateQuantumNumbers(0, 0, 0)).toEqual({ n: 1, l: 0, m: 0 });
  });
});

describe("orbitalLabel", () => {
  it("labels s orbital", () => {
    expect(orbitalLabel(1, 0, 0)).toBe("1s");
  });

  it("labels p orbital with m", () => {
    expect(orbitalLabel(2, 1, 0)).toBe("2p (m=0)");
    expect(orbitalLabel(2, 1, 1)).toBe("2p (m=1)");
  });

  it("labels d orbital", () => {
    expect(orbitalLabel(3, 2, -1)).toBe("3d (m=-1)");
  });

  it("labels f orbital", () => {
    expect(orbitalLabel(4, 3, 0)).toBe("4f (m=0)");
  });
});

describe("sampleOrbitalPositions", () => {
  it("returns Float32Array with 4 values per particle", () => {
    const result = sampleOrbitalPositions(1, 0, 0, 100);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(400); // 100 * 4 (x, y, z, prob)
  });

  it("places 1s orbital particles roughly spherically", () => {
    const result = sampleOrbitalPositions(1, 0, 0, 1000);
    let sumX = 0, sumY = 0, sumZ = 0;
    for (let i = 0; i < result.length; i += 4) {
      sumX += result[i];
      sumY += result[i + 1];
      sumZ += result[i + 2];
    }
    // Mean position should be near origin
    const count = result.length / 4;
    expect(Math.abs(sumX / count)).toBeLessThan(1);
    expect(Math.abs(sumY / count)).toBeLessThan(1);
    expect(Math.abs(sumZ / count)).toBeLessThan(1);
  });

  it("returns positive probability values", () => {
    const result = sampleOrbitalPositions(2, 1, 0, 100);
    for (let i = 3; i < result.length; i += 4) {
      expect(result[i]).toBeGreaterThanOrEqual(0);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: FAIL — functions not exported

**Step 3: Write implementation**

Append to `src/math/hydrogen.js`:

```javascript
const ORBITAL_LETTERS = ["s", "p", "d", "f", "g", "h", "i"];

/**
 * Validate and clamp quantum numbers to valid ranges.
 * n >= 1, 0 <= l < n, -l <= m <= l
 */
export function validateQuantumNumbers(n, l, m) {
  n = Math.max(1, Math.round(n));
  l = Math.max(0, Math.min(n - 1, Math.round(l)));
  m = Math.max(-l, Math.min(l, Math.round(m)));
  return { n, l, m };
}

/**
 * Human-readable orbital label like "3d (m=1)".
 */
export function orbitalLabel(n, l, m) {
  const letter = ORBITAL_LETTERS[l] || l;
  if (l === 0) return `${n}${letter}`;
  return `${n}${letter} (m=${m})`;
}

/**
 * Sample particle positions from the hydrogen orbital probability density.
 * Uses CDF-based inverse transform sampling for r and theta, uniform phi.
 * Returns Float32Array of [x, y, z, probability, x, y, z, probability, ...]
 */
export function sampleOrbitalPositions(n, l, m, count) {
  const result = new Float32Array(count * 4);

  // Build radial CDF: P(r) proportional to r^2 * |R_{n,l}(r)|^2
  const rMax = n * n * 4 + 10; // generous cutoff
  const rSteps = 500;
  const rDelta = rMax / rSteps;
  const radialPdf = new Float64Array(rSteps);
  const radialCdf = new Float64Array(rSteps);

  for (let i = 0; i < rSteps; i++) {
    const r = (i + 0.5) * rDelta;
    const R = radialWaveFunction(n, l, r);
    radialPdf[i] = r * r * R * R * rDelta;
  }

  // Cumulative sum
  radialCdf[0] = radialPdf[0];
  for (let i = 1; i < rSteps; i++) {
    radialCdf[i] = radialCdf[i - 1] + radialPdf[i];
  }
  // Normalize
  const radialTotal = radialCdf[rSteps - 1];
  for (let i = 0; i < rSteps; i++) {
    radialCdf[i] /= radialTotal;
  }

  // Build angular CDF: P(theta) proportional to |Y_l^m(theta)|^2 * sin(theta)
  const thetaSteps = 200;
  const thetaDelta = Math.PI / thetaSteps;
  const angularPdf = new Float64Array(thetaSteps);
  const angularCdf = new Float64Array(thetaSteps);

  for (let i = 0; i < thetaSteps; i++) {
    const theta = (i + 0.5) * thetaDelta;
    const Y = angularWaveFunction(l, m, theta);
    angularPdf[i] = Y * Y * Math.sin(theta) * thetaDelta;
  }

  angularCdf[0] = angularPdf[0];
  for (let i = 1; i < thetaSteps; i++) {
    angularCdf[i] = angularCdf[i - 1] + angularPdf[i];
  }
  const angularTotal = angularCdf[thetaSteps - 1];
  for (let i = 0; i < thetaSteps; i++) {
    angularCdf[i] /= angularTotal;
  }

  // Sample particles
  for (let p = 0; p < count; p++) {
    // Inverse CDF sampling for r
    const ur = Math.random();
    let rIdx = binarySearch(radialCdf, ur);
    const r = (rIdx + 0.5) * rDelta;

    // Inverse CDF sampling for theta
    const ut = Math.random();
    let tIdx = binarySearch(angularCdf, ut);
    const theta = (tIdx + 0.5) * thetaDelta;

    // Uniform phi
    const phi = Math.random() * 2 * Math.PI;

    // Spherical to Cartesian
    const sinTheta = Math.sin(theta);
    const x = r * sinTheta * Math.cos(phi);
    const y = r * Math.cos(theta);
    const z = r * sinTheta * Math.sin(phi);

    // Probability at this point
    const prob = probabilityDensity(n, l, m, r, theta);

    const idx = p * 4;
    result[idx] = x;
    result[idx + 1] = y;
    result[idx + 2] = z;
    result[idx + 3] = prob;
  }

  return result;
}

function binarySearch(cdf, value) {
  let lo = 0;
  let hi = cdf.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/math/hydrogen.test.js`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/math/hydrogen.js test/math/hydrogen.test.js
git commit -m "feat(math): add CDF sampling, validation, and orbital labels"
```

---

## Task 5: Export Hydrogen Module

**Files:**
- Modify: `src/math/index.js`

**Step 1: Add export**

Add to the end of `src/math/index.js`:

```javascript
export * from "./hydrogen.js";
```

**Step 2: Verify existing tests still pass**

Run: `npx vitest run test/math/`
Expected: PASS

**Step 3: Commit**

```bash
git add src/math/index.js
git commit -m "feat(math): export hydrogen module"
```

---

## Task 6: Demo Skeleton — Game Class + Camera + WebGL Renderer

**Files:**
- Create: `demos/js/hydrogen-orbital.js`
- Create: `demos/hydrogen-orbital.html`

**Step 1: Create HTML entry point**

```html
<!-- demos/hydrogen-orbital.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hydrogen Orbitals</title>
  <link rel="stylesheet" href="demos.css" />
  <script src="./js/info-toggle.js"></script>
</head>
<body>
  <div id="info">
    <strong>Hydrogen Orbitals</strong> — Quantum orbital probability clouds.<br/>
    <span style="color:#CCC">
      <li>Select orbital from the preset dropdown or adjust n, l, m</li>
      <li>Click + drag to rotate, scroll to zoom</li>
      <li>Particles represent electron probability density |&psi;|&sup2;</li>
    </span>
  </div>
  <canvas id="game"></canvas>
  <script type="module" src="./js/hydrogen-orbital.js"></script>
</body>
</html>
```

**Step 2: Create demo skeleton**

```javascript
// demos/js/hydrogen-orbital.js
import {
  Game,
  Painter,
  Camera3D,
  Text,
  applyAnchor,
  Position,
  Scene,
  verticalLayout,
  applyLayout,
  Screen,
  Gesture,
  FPSCounter,
} from "../../src/index.js";
import { WebGLParticleRenderer } from "../../src/webgl/webgl-particle-renderer.js";
import {
  sampleOrbitalPositions,
  validateQuantumNumbers,
  orbitalLabel,
  probabilityDensity,
} from "../../src/math/hydrogen.js";

const CONFIG = {
  quantum: { n: 1, l: 0, m: 0 },
  particles: { count: 20000, pointSize: 3 },
  camera: {
    perspective: 800,
    rotationX: -0.5,
    rotationY: 0.3,
    inertia: true,
    friction: 0.95,
    autoRotate: true,
    rotateSpeed: 0.2,
  },
  visual: {
    colormap: "inferno",
    logCompression: 12,
    alpha: 0.85,
  },
  zoom: {
    min: 0.3,
    max: 4.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },
  panel: { width: 280, padding: 14, marginRight: 16, marginTop: 16 },
};

// Inferno colormap stops
const COLORMAPS = {
  inferno: [
    [0, 0, 4],
    [40, 11, 84],
    [101, 21, 110],
    [159, 42, 99],
    [212, 72, 66],
    [245, 125, 21],
    [250, 193, 39],
    [252, 255, 164],
  ],
  fire: [
    [0, 0, 0],
    [128, 0, 0],
    [200, 0, 0],
    [255, 128, 0],
    [255, 255, 0],
    [255, 255, 255],
  ],
  ocean: [
    [0, 0, 20],
    [0, 20, 80],
    [0, 80, 160],
    [0, 180, 220],
    [100, 240, 255],
    [255, 255, 255],
  ],
  rainbow: [
    [255, 0, 0],
    [255, 127, 0],
    [255, 255, 0],
    [0, 255, 0],
    [0, 0, 255],
    [75, 0, 130],
    [148, 0, 211],
  ],
};

const PRESETS = {
  "1s":  { n: 1, l: 0, m: 0 },
  "2s":  { n: 2, l: 0, m: 0 },
  "2p":  { n: 2, l: 1, m: 0 },
  "3s":  { n: 3, l: 0, m: 0 },
  "3p":  { n: 3, l: 1, m: 0 },
  "3d":  { n: 3, l: 2, m: 0 },
  "4s":  { n: 4, l: 0, m: 0 },
  "4p":  { n: 4, l: 1, m: 0 },
  "4d":  { n: 4, l: 2, m: 0 },
  "4f":  { n: 4, l: 3, m: 0 },
};

class HydrogenOrbitalDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000810";
    this.enableFluidSize();
  }

  init() {
    super.init();

    this.n = CONFIG.quantum.n;
    this.l = CONFIG.quantum.l;
    this.m = CONFIG.quantum.m;
    this.particleCount = CONFIG.particles.count;
    this.time = 0;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
    });
    this.camera.autoRotate = CONFIG.camera.autoRotate;
    this.camera.autoRotateSpeed = CONFIG.camera.rotateSpeed;
    this.camera.bindMouse(this.canvas);

    // Zoom
    this.targetZoom = 1;
    this.currentZoom = 1;
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.targetZoom = this.defaultZoom;
    this.currentZoom = this.defaultZoom;
    this._initZoomControls();

    // WebGL particle renderer
    this.glRenderer = new WebGLParticleRenderer(CONFIG.particles.count, {
      width: this.width,
      height: this.height,
      shape: "glow",
      blendMode: "additive",
    });

    // Particle data arrays (reused each frame)
    this._particles = [];
    this._orbitalData = null;

    // Generate initial orbital
    this._regenerateOrbital();

    // FPS counter
    this.fps = new FPSCounter(this);
    this.pipeline.add(this.fps);
  }

  _initZoomControls() {
    const gesture = new Gesture(this.canvas);
    gesture.onPinch = (scale) => {
      this.targetZoom = Math.max(
        CONFIG.zoom.min,
        Math.min(CONFIG.zoom.max, this.targetZoom * scale)
      );
    };
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -CONFIG.zoom.speed : CONFIG.zoom.speed;
      this.targetZoom = Math.max(
        CONFIG.zoom.min,
        Math.min(CONFIG.zoom.max, this.targetZoom + delta * 0.1)
      );
    }, { passive: false });
  }

  _regenerateOrbital() {
    const v = validateQuantumNumbers(this.n, this.l, this.m);
    this.n = v.n;
    this.l = v.l;
    this.m = v.m;
    this._orbitalData = sampleOrbitalPositions(this.n, this.l, this.m, this.particleCount);
    this._buildParticles();
  }

  _buildParticles() {
    const data = this._orbitalData;
    if (!data) return;

    const count = data.length / 4;
    const colormap = COLORMAPS[CONFIG.visual.colormap] || COLORMAPS.inferno;
    const logComp = CONFIG.visual.logCompression;

    // Find max probability for normalization
    let maxProb = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > maxProb) maxProb = data[i];
    }

    this._particles.length = 0;
    const scale = this.n * 4; // visual scale grows with n

    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      const x = data[idx] / scale;
      const y = data[idx + 1] / scale;
      const z = data[idx + 2] / scale;
      const prob = data[idx + 3];

      // Log compression for color mapping
      const t = Math.max(0, Math.min(1,
        (Math.log10(prob + 1e-15) + logComp) / logComp
      ));

      const color = sampleColormap(colormap, t);

      this._particles.push({
        x: x * 100, // world units
        y: y * 100,
        z: z * 100,
        size: CONFIG.particles.pointSize * (0.5 + t * 0.5),
        color: { r: color[0], g: color[1], b: color[2], a: CONFIG.visual.alpha * t },
      });
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Smooth zoom
    this.currentZoom += (this.targetZoom - this.currentZoom) * CONFIG.zoom.easing;

    // Update camera
    this.camera.update(dt);
  }

  render() {
    super.render();
    const ctx = this.ctx;

    if (!this.glRenderer || !this.glRenderer.isAvailable()) return;

    // Project particles through camera
    const cx = this.width / 2;
    const cy = this.height / 2;
    const projected = [];

    for (const p of this._particles) {
      const pt = this.camera.project(p.x, p.y, p.z);
      if (pt.z < 0) continue; // behind camera

      const scale = this.currentZoom * (CONFIG.camera.perspective / (CONFIG.camera.perspective + pt.z));
      projected.push({
        x: cx + pt.x * scale,
        y: cy + pt.y * scale,
        size: p.size * scale,
        color: p.color,
        depth: pt.z,
      });
    }

    // Depth sort (back to front)
    projected.sort((a, b) => b.depth - a.depth);

    // Render via WebGL
    this.glRenderer.resize(this.width, this.height);
    this.glRenderer.clear();
    this.glRenderer.updateParticles(projected);
    this.glRenderer.render(projected.length);
    this.glRenderer.compositeOnto(ctx, 0, 0);
  }

  onResize() {
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
  }
}

function sampleColormap(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const n = stops.length - 1;
  const idx = t * n;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const frac = idx - lo;
  return [
    Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * frac),
    Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * frac),
    Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * frac),
  ];
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new HydrogenOrbitalDemo(canvas);
  demo.start();
});
```

**Step 3: Verify it loads without errors**

Run: `npm run dev`
Open: `http://localhost:5173/demos/hydrogen-orbital.html`
Expected: Black background with glow particles forming a spherical 1s orbital cloud. Mouse drag rotates, scroll zooms.

**Step 4: Commit**

```bash
git add demos/hydrogen-orbital.html demos/js/hydrogen-orbital.js
git commit -m "feat: add hydrogen orbital demo skeleton with Camera3D and WebGL particles"
```

---

## Task 7: Info Panel (Top-Center)

**Files:**
- Modify: `demos/js/hydrogen-orbital.js`

**Step 1: Add info panel to init()**

After the FPS counter setup, add:

```javascript
// Info panel
this.infoPanel = new Scene(this, { x: 0, y: 0, origin: "center" });
applyAnchor(this.infoPanel, {
  anchor: Position.TOP_CENTER,
  anchorOffsetY: 100,
});

this.titleText = new Text(this, "Hydrogen Orbitals", {
  font: "bold 18px monospace",
  color: "#ffffff",
});
this.orbitalText = new Text(this, orbitalLabel(this.n, this.l, this.m), {
  font: "14px monospace",
  color: "#88ccff",
});
this.equationText = new Text(this, "\u03C8(r,\u03B8,\u03C6) = R\u2099,\u2097(r) \u00B7 Y\u2097\u1D50(\u03B8,\u03C6)", {
  font: "12px monospace",
  color: "#668899",
});

const items = [this.titleText, this.orbitalText, this.equationText];
const layout = verticalLayout(items, { spacing: 6, align: "center" });
applyLayout(items, layout.positions);
items.forEach((item) => this.infoPanel.add(item));
this.pipeline.add(this.infoPanel);
```

Add an `_updateInfoPanel()` method:

```javascript
_updateInfoPanel() {
  if (this.orbitalText) {
    this.orbitalText.text = orbitalLabel(this.n, this.l, this.m);
  }
}
```

Call `this._updateInfoPanel()` at the end of `_regenerateOrbital()`.

**Step 2: Verify visually**

Run: `npm run dev`, check top-center info panel shows "Hydrogen Orbitals" / "1s" / equation.

**Step 3: Commit**

```bash
git add demos/js/hydrogen-orbital.js
git commit -m "feat: add info panel with orbital label and equation"
```

---

## Task 8: UI Panel — AccordionGroup with Preset Dropdown + Quantum Number Steppers

**Files:**
- Modify: `demos/js/hydrogen-orbital.js`

**Step 1: Add imports**

Add to the import from `../../src/index.js`:

```javascript
Slider, Dropdown, Button, ToggleButton, Stepper, AccordionGroup,
```

**Step 2: Add panel setup at end of init()**

```javascript
this._updatingSliders = false;
this._controls = {};
this._buildPanel();
```

**Step 3: Add _buildPanel() method**

```javascript
_buildPanel() {
  const sw = CONFIG.panel.width - CONFIG.panel.padding * 2;

  this.panel = new AccordionGroup(this, {
    width: CONFIG.panel.width,
    padding: CONFIG.panel.padding,
    spacing: 10,
    headerHeight: 28,
    debug: true,
    debugColor: "rgba(0, 255, 200, 0.08)",
  });
  this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
  this.panel.y = CONFIG.panel.marginTop;

  // Preset dropdown
  const presetOptions = Object.entries(PRESETS).map(([key, val]) => ({
    label: orbitalLabel(val.n, val.l, val.m),
    value: key,
  }));
  this._controls.preset = new Dropdown(this, {
    label: "ORBITAL",
    options: presetOptions,
    value: "1s",
    onChange: (key) => this._onPresetChange(key),
  });
  this.panel.addItem(this._controls.preset);

  // Restart button
  this._controls.restart = new Button(this, {
    text: "Restart",
    onClick: () => this._regenerateOrbital(),
  });
  this.panel.addItem(this._controls.restart);

  // --- Quantum Numbers section ---
  this._quantumSection = this.panel.addSection("Quantum Numbers", true);

  this._controls.n = new Stepper(this, {
    label: "n (PRINCIPAL)",
    value: this.n,
    min: 1,
    max: 7,
    step: 1,
    onChange: (v) => {
      if (this._updatingSliders) return;
      this.n = v;
      // Clamp l and m
      const clamped = validateQuantumNumbers(this.n, this.l, this.m);
      this.l = clamped.l;
      this.m = clamped.m;
      this._updatingSliders = true;
      this._controls.l.setBounds(0, this.n - 1);
      this._controls.l.value = this.l;
      this._controls.m.setBounds(-this.l, this.l);
      this._controls.m.value = this.m;
      this._updatingSliders = false;
      this._regenerateOrbital();
    },
  });
  this._quantumSection.addItem(this._controls.n);

  this._controls.l = new Stepper(this, {
    label: "l (ANGULAR)",
    value: this.l,
    min: 0,
    max: this.n - 1,
    step: 1,
    onChange: (v) => {
      if (this._updatingSliders) return;
      this.l = v;
      const clamped = validateQuantumNumbers(this.n, this.l, this.m);
      this.m = clamped.m;
      this._updatingSliders = true;
      this._controls.m.setBounds(-this.l, this.l);
      this._controls.m.value = this.m;
      this._updatingSliders = false;
      this._regenerateOrbital();
    },
  });
  this._quantumSection.addItem(this._controls.l);

  this._controls.m = new Stepper(this, {
    label: "m (MAGNETIC)",
    value: this.m,
    min: -this.l,
    max: this.l,
    step: 1,
    onChange: (v) => {
      if (this._updatingSliders) return;
      this.m = v;
      this._regenerateOrbital();
    },
  });
  this._quantumSection.addItem(this._controls.m);

  this.panel.commitSection(this._quantumSection);

  // --- Particles section ---
  this._particlesSection = this.panel.addSection("Particles", false);

  this._controls.count = new Stepper(this, {
    label: "COUNT",
    value: this.particleCount,
    min: 5000,
    max: 50000,
    step: 5000,
    formatValue: (v) => (v / 1000).toFixed(0) + "k",
    onChange: (v) => {
      if (this._updatingSliders) return;
      this.particleCount = v;
      this._regenerateOrbital();
    },
  });
  this._particlesSection.addItem(this._controls.count);

  this._controls.pointSize = new Slider(this, {
    label: "POINT SIZE",
    min: 1,
    max: 8,
    value: CONFIG.particles.pointSize,
    step: 0.5,
    formatValue: (v) => v.toFixed(1),
    onChange: (v) => {
      if (this._updatingSliders) return;
      CONFIG.particles.pointSize = v;
      this._buildParticles();
    },
  });
  this._particlesSection.addItem(this._controls.pointSize);

  this.panel.commitSection(this._particlesSection);

  // --- Color section ---
  this._colorSection = this.panel.addSection("Color", false);

  const colormapOptions = Object.keys(COLORMAPS).map((key) => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    value: key,
  }));
  this._controls.colormap = new Dropdown(this, {
    label: "COLORMAP",
    options: colormapOptions,
    value: CONFIG.visual.colormap,
    onChange: (v) => {
      if (this._updatingSliders) return;
      CONFIG.visual.colormap = v;
      this._buildParticles();
    },
  });
  this._colorSection.addItem(this._controls.colormap);

  this._controls.logComp = new Slider(this, {
    label: "LOG COMPRESSION",
    min: 4,
    max: 20,
    value: CONFIG.visual.logCompression,
    step: 1,
    formatValue: (v) => v.toFixed(0),
    onChange: (v) => {
      if (this._updatingSliders) return;
      CONFIG.visual.logCompression = v;
      this._buildParticles();
    },
  });
  this._colorSection.addItem(this._controls.logComp);

  this._controls.alpha = new Slider(this, {
    label: "OPACITY",
    min: 0.1,
    max: 1.0,
    value: CONFIG.visual.alpha,
    step: 0.05,
    formatValue: (v) => v.toFixed(2),
    onChange: (v) => {
      if (this._updatingSliders) return;
      CONFIG.visual.alpha = v;
      this._buildParticles();
    },
  });
  this._colorSection.addItem(this._controls.alpha);

  this.panel.commitSection(this._colorSection);

  // --- View section ---
  this._viewSection = this.panel.addSection("View", false);

  this._controls.autoRotate = new ToggleButton(this, {
    text: "Auto-Rotate",
    startToggled: CONFIG.camera.autoRotate,
    onToggle: (on) => {
      this.camera.autoRotate = on;
    },
  });
  this._viewSection.addItem(this._controls.autoRotate);

  this._controls.rotateSpeed = new Slider(this, {
    label: "ROTATION SPEED",
    min: 0.05,
    max: 1.0,
    value: CONFIG.camera.rotateSpeed,
    step: 0.05,
    formatValue: (v) => v.toFixed(2),
    onChange: (v) => {
      if (this._updatingSliders) return;
      this.camera.autoRotateSpeed = v;
    },
  });
  this._viewSection.addItem(this._controls.rotateSpeed);

  this.panel.commitSection(this._viewSection);

  this.panel.layout();
  this.pipeline.add(this.panel);
}
```

**Step 4: Add _onPresetChange() method**

```javascript
_onPresetChange(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  this._controls.preset.close();

  this._updatingSliders = true;

  this.n = preset.n;
  this.l = preset.l;
  this.m = preset.m;

  this._controls.n.value = this.n;
  this._controls.l.setBounds(0, this.n - 1);
  this._controls.l.value = this.l;
  this._controls.m.setBounds(-this.l, this.l);
  this._controls.m.value = this.m;

  this._updatingSliders = false;
  this._regenerateOrbital();
}
```

**Step 5: Update onResize() to reposition panel**

```javascript
onResize() {
  this.defaultZoom = Math.min(
    CONFIG.zoom.max,
    Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
  );
  if (this.panel) {
    this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
    this.panel.y = CONFIG.panel.marginTop;
  }
}
```

**Step 6: Verify visually**

Run: `npm run dev`, open the demo. Verify:
- Panel appears on the right
- Preset dropdown shows orbital names
- Steppers for n/l/m clamp correctly
- Changing a quantum number regenerates the orbital

**Step 7: Commit**

```bash
git add demos/js/hydrogen-orbital.js
git commit -m "feat: add AccordionGroup UI panel with quantum number controls"
```

---

## Task 9: Add Demo to Navigation

**Files:**
- Modify: `demos/index.html`

**Step 1: Find the appropriate section in demos/index.html**

Look for the section where quantum/physics demos are listed (near "Quantum Manifold" link).

**Step 2: Add the link**

```html
<a href="hydrogen-orbital.html" target="demo-frame">Hydrogen Orbitals</a>
```

**Step 3: Commit**

```bash
git add demos/index.html
git commit -m "feat: add Hydrogen Orbitals to demo navigation"
```

---

## Task 10: Visual Polish & Testing

**Files:**
- Modify: `demos/js/hydrogen-orbital.js`

**Step 1: Manual visual testing checklist**

Run `npm run dev` and verify each preset:

- [ ] 1s — Spherical cloud, densest at center
- [ ] 2s — Spherical with visible radial node (gap)
- [ ] 2p — Dumbbell shape along y-axis
- [ ] 3s — Spherical with two radial nodes
- [ ] 3p — Dumbbell with one radial node
- [ ] 3d — Cloverleaf pattern
- [ ] 4f — Complex multi-lobe structure
- [ ] Colormap switching works (Inferno/Fire/Ocean/Rainbow)
- [ ] Log compression slider reveals/hides faint regions
- [ ] Opacity slider works
- [ ] Auto-rotate toggle works
- [ ] Zoom (scroll + pinch) works
- [ ] Camera drag rotation works
- [ ] Responsive resize works

**Step 2: Run all existing tests to check for regressions**

Run: `npx vitest run`
Expected: No new failures (pre-existing scene3d.test.js failures are acceptable per MEMORY.md)

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Hydrogen Orbital Visualizer demo"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Associated Laguerre polynomials | `src/math/hydrogen.js`, `test/math/hydrogen.test.js` |
| 2 | Associated Legendre polynomials | same |
| 3 | Radial/angular wave functions + probability density | same |
| 4 | CDF sampling + validation + labels | same |
| 5 | Export hydrogen module | `src/math/index.js` |
| 6 | Demo skeleton (Game + Camera + WebGL) | `demos/js/hydrogen-orbital.js`, `demos/hydrogen-orbital.html` |
| 7 | Info panel | `demos/js/hydrogen-orbital.js` |
| 8 | AccordionGroup UI panel | `demos/js/hydrogen-orbital.js` |
| 9 | Add to navigation | `demos/index.html` |
| 10 | Visual polish & regression testing | all |

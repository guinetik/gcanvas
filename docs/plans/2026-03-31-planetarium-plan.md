# Planetarium Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time solar system visualization with Sphere3D shaders, Keplerian orbital mechanics, Camera3D drag-rotate, and Gesture zoom/pan.

**Architecture:** Reusable Kepler solver in `src/math/kepler.js` (pure functions, TDD). Demo split into 5 files following the galaxy pattern: config, data, bodies, UI, and main game class. Each planet is a `CelestialBody` wrapping a `Sphere3D` with orbital state. Rendering is manual projection + depth sort, same pattern as `sphere3d.js` and `schwarzschild.js`.

**Tech Stack:** GCanvas (Game, Sphere3D, Camera3D, Gesture, Painter, Screen, FPSCounter), Vitest for tests.

**IMPORTANT:** Another agent is concurrently working on dither-related files (`src/math/dither.js`, `demos/js/dither.js`, etc.). Do NOT modify any dither files.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/math/kepler.js` | Create | Pure Keplerian orbit solver functions |
| `src/math/index.js` | Modify | Add kepler.js exports |
| `test/math/kepler.test.js` | Create | Unit tests for Kepler solver |
| `demos/js/planetarium/planetarium.data.js` | Create | Real orbital elements + display config per body |
| `demos/js/planetarium/planetarium.config.js` | Create | CONFIG object for camera, zoom, time, display |
| `demos/js/planetarium/planetarium.bodies.js` | Create | CelestialBody class (Sphere3D + orbit + path drawing) |
| `demos/js/planetarium/planetarium.ui.js` | Create | Labels, info panel, time controls |
| `demos/js/planetarium/index.js` | Create | PlanetariumDemo extends Game — main loop |
| `demos/planetarium.html` | Create | HTML entry point |
| `demos/index.html` | Modify | Add Planetarium link to 3D section |

---

### Task 1: Kepler Solver — Tests

**Files:**
- Create: `test/math/kepler.test.js`

- [ ] **Step 1: Write tests for solveKeplerEquation**

```javascript
import { describe, it, expect } from "vitest";
import {
  solveKeplerEquation,
  meanAnomaly,
  trueAnomalyFromEccentric,
  keplerRadius,
  orbitalPosition3D,
  orbitPathPoints,
} from "../../src/math/kepler.js";

describe("Kepler Solver", () => {
  describe("solveKeplerEquation", () => {
    it("should return 0 for M=0, any eccentricity", () => {
      expect(solveKeplerEquation(0, 0)).toBeCloseTo(0, 10);
      expect(solveKeplerEquation(0, 0.5)).toBeCloseTo(0, 10);
      expect(solveKeplerEquation(0, 0.99)).toBeCloseTo(0, 6);
    });

    it("should return M for circular orbit (e=0)", () => {
      expect(solveKeplerEquation(1.0, 0)).toBeCloseTo(1.0, 10);
      expect(solveKeplerEquation(Math.PI, 0)).toBeCloseTo(Math.PI, 10);
    });

    it("should satisfy Kepler equation M = E - e*sin(E)", () => {
      const M = 1.5;
      const e = 0.3;
      const E = solveKeplerEquation(M, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(M, 8);
    });

    it("should converge for high eccentricity (e=0.9)", () => {
      const M = 0.5;
      const e = 0.9;
      const E = solveKeplerEquation(M, e);
      expect(E - e * Math.sin(E)).toBeCloseTo(M, 6);
    });

    it("should handle M = PI exactly", () => {
      const E = solveKeplerEquation(Math.PI, 0.5);
      expect(E - 0.5 * Math.sin(E)).toBeCloseTo(Math.PI, 8);
    });
  });

  describe("meanAnomaly", () => {
    it("should return 0 at epoch", () => {
      expect(meanAnomaly(365.25, 0, 0)).toBeCloseTo(0, 10);
    });

    it("should return 2*PI after one full period", () => {
      expect(meanAnomaly(365.25, 365.25, 0)).toBeCloseTo(2 * Math.PI, 8);
    });

    it("should return PI at half period", () => {
      expect(meanAnomaly(100, 50, 0)).toBeCloseTo(Math.PI, 8);
    });

    it("should account for epoch offset", () => {
      expect(meanAnomaly(100, 150, 100)).toBeCloseTo(Math.PI, 8);
    });
  });

  describe("trueAnomalyFromEccentric", () => {
    it("should return 0 when E=0", () => {
      expect(trueAnomalyFromEccentric(0, 0.5)).toBeCloseTo(0, 10);
    });

    it("should return PI when E=PI", () => {
      expect(trueAnomalyFromEccentric(Math.PI, 0.5)).toBeCloseTo(Math.PI, 6);
    });

    it("should equal E for circular orbit (e=0)", () => {
      expect(trueAnomalyFromEccentric(1.2, 0)).toBeCloseTo(1.2, 10);
    });

    it("should advance faster than E for e > 0 (first half)", () => {
      const E = 1.0;
      const nu = trueAnomalyFromEccentric(E, 0.5);
      expect(nu).toBeGreaterThan(E);
    });
  });

  describe("keplerRadius", () => {
    it("should return semiMajorAxis for circular orbit at any angle", () => {
      expect(keplerRadius(10, 0, 0)).toBeCloseTo(10, 10);
      expect(keplerRadius(10, 0, Math.PI)).toBeCloseTo(10, 10);
      expect(keplerRadius(10, 0, 1.5)).toBeCloseTo(10, 10);
    });

    it("should return perihelion at nu=0", () => {
      const a = 1.0;
      const e = 0.5;
      const perihelion = a * (1 - e);
      expect(keplerRadius(a, e, 0)).toBeCloseTo(perihelion, 8);
    });

    it("should return aphelion at nu=PI", () => {
      const a = 1.0;
      const e = 0.5;
      const aphelion = a * (1 + e);
      expect(keplerRadius(a, e, Math.PI)).toBeCloseTo(aphelion, 8);
    });
  });

  describe("orbitalPosition3D", () => {
    it("should place circular orbit in XY plane when inclination=0", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      // At t=0 (perihelion), should be at (a, 0, 0)
      const pos = orbitalPosition3D(elements, 0);
      expect(pos.x).toBeCloseTo(10, 4);
      expect(pos.y).toBeCloseTo(0, 4);
      expect(pos.z).toBeCloseTo(0, 4);
    });

    it("should be at negative x at half period for circular orbit", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      const pos = orbitalPosition3D(elements, 50);
      expect(pos.x).toBeCloseTo(-10, 4);
      expect(pos.y).toBeCloseTo(0, 2);
      expect(pos.z).toBeCloseTo(0, 4);
    });

    it("should produce z != 0 for inclined orbit", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: Math.PI / 6, // 30 degrees
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      // At quarter period, should have z component due to inclination
      const pos = orbitalPosition3D(elements, 25);
      expect(pos.z).not.toBeCloseTo(0, 1);
    });

    it("should maintain constant distance for circular orbit", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: Math.PI / 4,
        longitudeOfAscendingNode: 0.5,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      for (let t = 0; t < 100; t += 10) {
        const pos = orbitalPosition3D(elements, t);
        const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
        expect(dist).toBeCloseTo(10, 4);
      }
    });
  });

  describe("orbitPathPoints", () => {
    it("should return requested number of segments", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      const points = orbitPathPoints(elements, 64);
      expect(points).toHaveLength(64);
    });

    it("should form a closed loop (first ≈ last for circular orbit)", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      const points = orbitPathPoints(elements, 128);
      const first = points[0];
      const last = points[points.length - 1];
      // Not identical (samples don't include endpoint) but close
      expect(Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2 + (first.z - last.z) ** 2)).toBeLessThan(1);
    });

    it("should have all points at distance a for circular orbit", () => {
      const elements = {
        semiMajorAxis: 10,
        eccentricity: 0,
        inclination: 0,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
      const points = orbitPathPoints(elements, 32);
      for (const p of points) {
        const dist = Math.sqrt(p.x ** 2 + p.y ** 2 + p.z ** 2);
        expect(dist).toBeCloseTo(10, 4);
      }
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/math/kepler.test.js`
Expected: FAIL — module `../../src/math/kepler.js` not found

- [ ] **Step 3: Commit**

```bash
git add test/math/kepler.test.js
git commit -m "test: add Kepler solver test suite (red)"
```

---

### Task 2: Kepler Solver — Implementation

**Files:**
- Create: `src/math/kepler.js`
- Modify: `src/math/index.js`

- [ ] **Step 1: Implement kepler.js**

```javascript
/**
 * Keplerian orbital mechanics — pure functions.
 *
 * Solves the two-body problem for elliptical orbits using
 * classical orbital elements. No visualization dependencies.
 *
 * @module math/kepler
 */

const TWO_PI = 2 * Math.PI;

/**
 * Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E.
 *
 * Uses Newton-Raphson iteration with initial guess E₀ = M.
 *
 * @param {number} M - Mean anomaly (radians)
 * @param {number} e - Eccentricity (0 to <1)
 * @param {number} [tolerance=1e-10] - Convergence threshold
 * @param {number} [maxIter=50] - Maximum iterations
 * @returns {number} Eccentric anomaly E (radians)
 */
export function solveKeplerEquation(M, e, tolerance = 1e-10, maxIter = 50) {
  if (e === 0) return M;
  let E = M; // initial guess
  for (let i = 0; i < maxIter; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

/**
 * Compute mean anomaly at a given time.
 *
 * M = 2π * (t - epoch) / period
 *
 * @param {number} period - Orbital period (any time unit)
 * @param {number} time - Current time (same unit as period)
 * @param {number} [epoch=0] - Time of perihelion passage
 * @returns {number} Mean anomaly (radians)
 */
export function meanAnomaly(period, time, epoch = 0) {
  return TWO_PI * ((time - epoch) / period);
}

/**
 * Convert eccentric anomaly to true anomaly.
 *
 * tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
 *
 * @param {number} E - Eccentric anomaly (radians)
 * @param {number} e - Eccentricity
 * @returns {number} True anomaly ν (radians)
 */
export function trueAnomalyFromEccentric(E, e) {
  if (e === 0) return E;
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

/**
 * Orbital radius from true anomaly (conic section equation).
 *
 * r = a(1 - e²) / (1 + e*cos(ν))
 *
 * Note: named keplerRadius to avoid collision with orbitalRadius in orbital.js
 *
 * @param {number} semiMajorAxis - Semi-major axis a
 * @param {number} eccentricity - Eccentricity e
 * @param {number} trueAnomaly - True anomaly ν (radians)
 * @returns {number} Orbital radius
 */
export function keplerRadius(semiMajorAxis, eccentricity, trueAnomaly) {
  if (eccentricity === 0) return semiMajorAxis;
  const p = semiMajorAxis * (1 - eccentricity * eccentricity);
  return p / (1 + eccentricity * Math.cos(trueAnomaly));
}

/**
 * Compute 3D heliocentric cartesian position from orbital elements.
 *
 * Pipeline: time → mean anomaly → Kepler solve → true anomaly → radius → 3D rotation
 *
 * The orbital plane is rotated into 3D space using three Euler angles:
 * - Ω (longitude of ascending node): rotates around Z
 * - i (inclination): tilts the orbital plane
 * - ω (argument of periapsis): rotates within the orbital plane
 *
 * @param {Object} elements - Orbital elements
 * @param {number} elements.semiMajorAxis - Semi-major axis
 * @param {number} elements.eccentricity - Eccentricity (0 to <1)
 * @param {number} elements.inclination - Inclination (radians)
 * @param {number} elements.longitudeOfAscendingNode - Ω (radians)
 * @param {number} elements.argumentOfPeriapsis - ω (radians)
 * @param {number} elements.period - Orbital period
 * @param {number} [elements.epoch=0] - Epoch of perihelion passage
 * @param {number} time - Current time
 * @returns {{ x: number, y: number, z: number }} Cartesian position
 */
export function orbitalPosition3D(elements, time) {
  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: Omega,
    argumentOfPeriapsis: omega,
    period,
    epoch = 0,
  } = elements;

  // Step 1: Mean anomaly
  const M = meanAnomaly(period, time, epoch);

  // Step 2: Solve Kepler's equation
  const E = solveKeplerEquation(M, e);

  // Step 3: True anomaly
  const nu = trueAnomalyFromEccentric(E, e);

  // Step 4: Radius
  const r = keplerRadius(a, e, nu);

  // Step 5: Position in orbital plane
  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);

  // Step 6: Rotate into 3D space
  // Combined rotation matrix for Ω, i, ω
  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const x =
    (cosOmega * cosW - sinOmega * sinW * cosI) * xOrbital +
    (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrbital;

  const y =
    (sinOmega * cosW + cosOmega * sinW * cosI) * xOrbital +
    (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrbital;

  const z =
    (sinW * sinI) * xOrbital +
    (cosW * sinI) * yOrbital;

  return { x, y, z };
}

/**
 * Generate an array of 3D points tracing the full orbit ellipse.
 *
 * Samples uniformly in mean anomaly for even visual spacing.
 * Useful for drawing orbit path lines.
 *
 * @param {Object} elements - Orbital elements (same as orbitalPosition3D)
 * @param {number} [numSegments=128] - Number of sample points
 * @returns {Array<{ x: number, y: number, z: number }>} Orbit path points
 */
export function orbitPathPoints(elements, numSegments = 128) {
  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: Omega,
    argumentOfPeriapsis: omega,
  } = elements;

  // Precompute rotation matrix components
  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const points = new Array(numSegments);

  for (let j = 0; j < numSegments; j++) {
    const M = TWO_PI * (j / numSegments);
    const E = solveKeplerEquation(M, e);
    const nu = trueAnomalyFromEccentric(E, e);
    const r = keplerRadius(a, e, nu);

    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    points[j] = {
      x: (cosOmega * cosW - sinOmega * sinW * cosI) * xOrb +
         (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrb,
      y: (sinOmega * cosW + cosOmega * sinW * cosI) * xOrb +
         (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrb,
      z: (sinW * sinI) * xOrb + (cosW * sinI) * yOrb,
    };
  }

  return points;
}
```

- [ ] **Step 2: Export from src/math/index.js**

Add this line to the physics modules section of `src/math/index.js`:

```javascript
export * from "./kepler.js";
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run test/math/kepler.test.js`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/math/kepler.js src/math/index.js test/math/kepler.test.js
git commit -m "feat(math): add Keplerian orbit solver with tests"
```

---

### Task 3: Planetary Data

**Files:**
- Create: `demos/js/planetarium/planetarium.data.js`

- [ ] **Step 1: Create planetarium.data.js with real orbital elements**

NASA orbital elements scaled for visual display. Distance uses logarithmic compression. Sizes are exaggerated but proportional. Periods are real ratios.

```javascript
/**
 * Planetarium — Solar system data.
 *
 * Real orbital elements from NASA/JPL with aesthetic scaling for visualization.
 * Distances are log-compressed so inner planets are visible alongside gas giants.
 * Sizes are exaggerated but preserve relative proportions.
 * Periods use real ratios.
 *
 * @module planetarium/data
 */

const DEG = Math.PI / 180;

// ─────────────────────────────────────────────────────────────────────────────
// SCALING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert real AU distance to display units using log compression.
 * Ensures inner planets are visible while gas giants stay on screen.
 * f(x) = scaleFactor * ln(x + 1) + minDistance
 */
const DISTANCE_SCALE = 180;
const DISTANCE_MIN = 40;

function scaleDistance(au) {
  return DISTANCE_SCALE * Math.log(au + 1) + DISTANCE_MIN;
}

/**
 * Convert real equatorial radius (km) to display fraction of minDimension.
 * Log-compressed so Jupiter doesn't dwarf everything.
 * Minimum enforced so Mercury is still visible.
 */
const RADIUS_BASE = 0.01;
const RADIUS_SCALE = 0.012;
const RADIUS_MIN = 0.008;

function scaleRadius(realRadiusKm) {
  return Math.max(RADIUS_MIN, RADIUS_BASE + RADIUS_SCALE * Math.log(realRadiusKm / 2440 + 1));
}

// ─────────────────────────────────────────────────────────────────────────────
// SUN
// ─────────────────────────────────────────────────────────────────────────────

export const SUN = {
  name: "Sun",
  display: {
    radius: 0.06,
    shaderType: "star",
    shaderUniforms: {
      uStarColor: [1.0, 0.85, 0.4],
      uTemperature: 5778,
      uActivityLevel: 0.4,
      uRotationSpeed: 0.3,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLANETS
// ─────────────────────────────────────────────────────────────────────────────

export const PLANETS = [
  {
    name: "Mercury",
    orbit: {
      semiMajorAxis: scaleDistance(0.387),
      eccentricity: 0.2056,
      inclination: 7.005 * DEG,
      longitudeOfAscendingNode: 48.331 * DEG,
      argumentOfPeriapsis: 29.124 * DEG,
      period: 87.97,
    },
    display: {
      radius: scaleRadius(2440),
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.55, 0.52, 0.50],
        uHasAtmosphere: 0.0,
        uSeed: 1.0,
      },
    },
    moons: [],
  },
  {
    name: "Venus",
    orbit: {
      semiMajorAxis: scaleDistance(0.723),
      eccentricity: 0.0068,
      inclination: 3.395 * DEG,
      longitudeOfAscendingNode: 76.680 * DEG,
      argumentOfPeriapsis: 54.884 * DEG,
      period: 224.7,
    },
    display: {
      radius: scaleRadius(6052),
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.85, 0.65, 0.30],
        uHasAtmosphere: 1.0,
        uSeed: 2.0,
      },
    },
    moons: [],
  },
  {
    name: "Earth",
    orbit: {
      semiMajorAxis: scaleDistance(1.0),
      eccentricity: 0.0167,
      inclination: 0.0,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 102.937 * DEG,
      period: 365.25,
    },
    display: {
      radius: scaleRadius(6371),
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.2, 0.4, 0.8],
        uHasAtmosphere: 1.0,
        uSeed: 3.0,
      },
    },
    moons: [
      {
        name: "Moon",
        orbit: {
          semiMajorAxis: 12,
          eccentricity: 0.0549,
          inclination: 5.145 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 27.32,
        },
        display: {
          radius: 0.007,
          shaderType: "rockyPlanet",
          shaderUniforms: {
            uBaseColor: [0.7, 0.7, 0.7],
            uHasAtmosphere: 0.0,
            uSeed: 10.0,
          },
        },
      },
    ],
  },
  {
    name: "Mars",
    orbit: {
      semiMajorAxis: scaleDistance(1.524),
      eccentricity: 0.0934,
      inclination: 1.850 * DEG,
      longitudeOfAscendingNode: 49.558 * DEG,
      argumentOfPeriapsis: 286.502 * DEG,
      period: 686.97,
    },
    display: {
      radius: scaleRadius(3390),
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.75, 0.35, 0.15],
        uHasAtmosphere: 0.0,
        uSeed: 4.0,
      },
    },
    moons: [],
  },
  {
    name: "Jupiter",
    orbit: {
      semiMajorAxis: scaleDistance(5.203),
      eccentricity: 0.0489,
      inclination: 1.303 * DEG,
      longitudeOfAscendingNode: 100.464 * DEG,
      argumentOfPeriapsis: 273.867 * DEG,
      period: 4332.59,
    },
    display: {
      radius: scaleRadius(69911),
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.85, 0.65, 0.45],
        uSeed: 42.0,
        uStormIntensity: 0.7,
        uRotationSpeed: 1.2,
      },
    },
    moons: [
      {
        name: "Io",
        orbit: {
          semiMajorAxis: 10,
          eccentricity: 0.0041,
          inclination: 0.036 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 1.769,
        },
        display: {
          radius: 0.006,
          shaderType: "rockyPlanet",
          shaderUniforms: {
            uBaseColor: [0.9, 0.85, 0.35],
            uHasAtmosphere: 0.0,
            uSeed: 11.0,
          },
        },
      },
    ],
  },
  {
    name: "Saturn",
    orbit: {
      semiMajorAxis: scaleDistance(9.537),
      eccentricity: 0.0565,
      inclination: 2.485 * DEG,
      longitudeOfAscendingNode: 113.665 * DEG,
      argumentOfPeriapsis: 339.392 * DEG,
      period: 10759.22,
    },
    display: {
      radius: scaleRadius(58232),
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.85, 0.75, 0.50],
        uSeed: 99.0,
        uStormIntensity: 0.3,
        uRotationSpeed: 1.0,
      },
      ring: {
        innerRadius: 1.5,  // multiplier of planet display radius
        outerRadius: 2.4,
        color: "rgba(210, 180, 120, 0.25)",
        tilt: 26.73 * DEG,
      },
    },
    moons: [
      {
        name: "Titan",
        orbit: {
          semiMajorAxis: 16,
          eccentricity: 0.0288,
          inclination: 0.33 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 15.945,
        },
        display: {
          radius: 0.007,
          shaderType: "rockyPlanet",
          shaderUniforms: {
            uBaseColor: [0.85, 0.70, 0.40],
            uHasAtmosphere: 1.0,
            uSeed: 12.0,
          },
        },
      },
    ],
  },
  {
    name: "Uranus",
    orbit: {
      semiMajorAxis: scaleDistance(19.19),
      eccentricity: 0.0457,
      inclination: 0.773 * DEG,
      longitudeOfAscendingNode: 74.006 * DEG,
      argumentOfPeriapsis: 96.998 * DEG,
      period: 30688.5,
    },
    display: {
      radius: scaleRadius(25362),
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.55, 0.75, 0.85],
        uSeed: 77.0,
        uStormIntensity: 0.1,
        uRotationSpeed: 0.6,
      },
    },
    moons: [],
  },
  {
    name: "Neptune",
    orbit: {
      semiMajorAxis: scaleDistance(30.07),
      eccentricity: 0.0113,
      inclination: 1.770 * DEG,
      longitudeOfAscendingNode: 131.784 * DEG,
      argumentOfPeriapsis: 276.336 * DEG,
      period: 60182.0,
    },
    display: {
      radius: scaleRadius(24622),
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.25, 0.35, 0.75],
        uSeed: 55.0,
        uStormIntensity: 0.5,
        uRotationSpeed: 0.8,
      },
    },
    moons: [],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add demos/js/planetarium/planetarium.data.js
git commit -m "feat(planetarium): add solar system data with real orbital elements"
```

---

### Task 4: Configuration

**Files:**
- Create: `demos/js/planetarium/planetarium.config.js`

- [ ] **Step 1: Create CONFIG**

```javascript
/**
 * Planetarium — Configuration constants.
 *
 * @module planetarium/config
 */

import { Screen } from "../../../src/index.js";

export const CONFIG = {
  camera: {
    perspective: 1200,
    rotationX: 0.35,
    rotationY: -0.5,
    minRotationX: -1.2,
    maxRotationX: 1.2,
    inertia: true,
    friction: 0.94,
    autoRotate: true,
    autoRotateSpeed: 0.15,
    autoRotateAxis: "y",
    velocityScale: 2.0,
  },

  zoom: {
    min: 0.2,
    max: 6.0,
    speed: 0.5,
    easing: 0.1,
    baseScreenSize: 900,
  },

  pan: {
    speed: 1.5,
    easing: 0.1,
  },

  time: {
    // 1 Earth year ≈ 30 seconds at scale 12
    scale: 12.0,
  },

  display: {
    orbitPathSegments: 128,
    orbitPathColor: "rgba(255, 255, 255, 0.10)",
    orbitPathLineWidth: 0.6,
    moonOrbitPathColor: "rgba(255, 255, 255, 0.06)",
    moonOrbitPathLineWidth: 0.4,

    sunGlow: {
      layers: 3,
      baseAlpha: 0.08,
      baseSize: 1.6, // multiplier of sun display radius
      color: [1.0, 0.75, 0.3],
    },

    starfield: {
      count: 400,
      minBrightness: 0.3,
      maxBrightness: 0.9,
      minSize: 0.5,
      maxSize: 1.8,
    },

    labels: {
      font: "11px monospace",
      color: "#999999",
      offsetY: 18,
    },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add demos/js/planetarium/planetarium.config.js
git commit -m "feat(planetarium): add configuration constants"
```

---

### Task 5: CelestialBody Class

**Files:**
- Create: `demos/js/planetarium/planetarium.bodies.js`

This task builds the `CelestialBody` class that wraps Sphere3D with orbital state and orbit path rendering.

- [ ] **Step 1: Create planetarium.bodies.js**

```javascript
/**
 * Planetarium — CelestialBody.
 *
 * Wraps a Sphere3D with Keplerian orbital state and orbit path rendering.
 * Each body computes its own 3D position from orbital elements via kepler.js,
 * projects through a Camera3D, and draws itself + its orbit path.
 *
 * @module planetarium/bodies
 */

import { Sphere3D, Painter } from "../../../src/index.js";
import { orbitalPosition3D, orbitPathPoints } from "../../../src/math/kepler.js";
import { CONFIG } from "./planetarium.config.js";

export class CelestialBody {
  /**
   * @param {Object} data - Body definition from planetarium.data.js
   * @param {Object} camera - Camera3D instance
   * @param {number} minDim - Min screen dimension for radius scaling
   * @param {CelestialBody} [parent=null] - Parent body (for moons)
   */
  constructor(data, camera, minDim, parent = null) {
    this.name = data.name;
    this.data = data;
    this.parent = parent;
    this.camera = camera;

    // Sphere3D rendering
    const radius = data.display.radius * minDim;
    const sphereOpts = { camera };
    if (data.display.shaderType) {
      sphereOpts.useShader = true;
      sphereOpts.shaderType = data.display.shaderType;
      sphereOpts.shaderUniforms = { ...data.display.shaderUniforms };
    }
    this.sphere = new Sphere3D(radius, sphereOpts);
    this.displayRadius = radius;

    // 3D world position
    this.worldX = 0;
    this.worldY = 0;
    this.worldZ = 0;

    // Projected screen position (set each frame)
    this.screenX = 0;
    this.screenY = 0;
    this.depth = 0;
    this.scale = 1;

    // Orbit path cache (recomputed on resize, not per frame)
    this.orbitPathCache = null;
    if (data.orbit) {
      this.orbitPathCache = orbitPathPoints(data.orbit, CONFIG.display.orbitPathSegments);
    }

    // Ring data (Saturn)
    this.ring = data.display.ring || null;

    // Randomize starting epoch so planets don't all start aligned
    if (data.orbit) {
      data.orbit.epoch = -Math.random() * data.orbit.period;
    }
  }

  /**
   * Update world position from orbital mechanics.
   * @param {number} simTime - Simulation time in days
   */
  update(simTime) {
    if (!this.data.orbit) return; // Sun stays at origin

    const pos = orbitalPosition3D(this.data.orbit, simTime);
    if (this.parent) {
      this.worldX = this.parent.worldX + pos.x;
      this.worldY = this.parent.worldY + pos.y;
      this.worldZ = this.parent.worldZ + pos.z;
    } else {
      this.worldX = pos.x;
      this.worldY = pos.y;
      this.worldZ = pos.z;
    }
  }

  /**
   * Project world position through camera.
   * @param {number} centerX - Screen center X
   * @param {number} centerY - Screen center Y
   * @param {number} zoom - Current zoom level
   */
  project(centerX, centerY, zoom) {
    const proj = this.camera.project(this.worldX, this.worldY, this.worldZ);
    this.screenX = centerX + proj.x * zoom;
    this.screenY = centerY + proj.y * zoom;
    this.depth = proj.z;
    this.scale = proj.scale * zoom;
  }

  /**
   * Draw the sphere at its projected position.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.scale <= 0) return; // behind camera

    ctx.save();
    ctx.translate(this.screenX, this.screenY);
    ctx.scale(this.scale, this.scale);
    this.sphere.draw();
    ctx.restore();

    // Saturn ring
    if (this.ring) {
      this.drawRing(ctx);
    }
  }

  /**
   * Draw Saturn-style ring as a projected 3D ellipse.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawRing(ctx) {
    const ringRadius = this.displayRadius * this.ring.outerRadius * this.scale;
    const innerRadius = this.displayRadius * this.ring.innerRadius * this.scale;
    // Approximate ring tilt projection: compress Y by cos(tilt + camera X rotation)
    const tiltFactor = Math.abs(Math.cos(this.ring.tilt + this.camera.rotationX));

    ctx.save();
    ctx.translate(this.screenX, this.screenY);
    ctx.globalAlpha = 0.25;

    // Outer ring
    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius, ringRadius * tiltFactor, 0, 0, Math.PI * 2);
    ctx.strokeStyle = this.ring.color;
    ctx.lineWidth = Math.max(1, (ringRadius - innerRadius) * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw the orbit path as projected 3D line segments.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX - Screen center X
   * @param {number} centerY - Screen center Y
   * @param {number} zoom - Current zoom level
   */
  drawOrbitPath(ctx, centerX, centerY, zoom) {
    if (!this.orbitPathCache) return;

    const points = this.orbitPathCache;
    const isMoon = this.parent != null;
    const color = isMoon ? CONFIG.display.moonOrbitPathColor : CONFIG.display.orbitPathColor;
    const lineWidth = isMoon ? CONFIG.display.moonOrbitPathLineWidth : CONFIG.display.orbitPathLineWidth;

    // Offset for moons: orbit path is relative to parent
    const offsetX = isMoon ? this.parent.worldX : 0;
    const offsetY = isMoon ? this.parent.worldY : 0;
    const offsetZ = isMoon ? this.parent.worldZ : 0;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const proj = this.camera.project(
        p.x + offsetX,
        p.y + offsetY,
        p.z + offsetZ
      );
      const sx = centerX + proj.x * zoom;
      const sy = centerY + proj.y * zoom;

      if (!started) {
        ctx.moveTo(sx, sy);
        started = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }

    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Update display radius after screen resize.
   * @param {number} minDim - New min screen dimension
   */
  resize(minDim) {
    this.displayRadius = this.data.display.radius * minDim;
    this.sphere.radius = this.displayRadius;
    this.sphere._generateGeometry();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add demos/js/planetarium/planetarium.bodies.js
git commit -m "feat(planetarium): add CelestialBody class with orbit path rendering"
```

---

### Task 6: UI Module

**Files:**
- Create: `demos/js/planetarium/planetarium.ui.js`

- [ ] **Step 1: Create planetarium.ui.js**

```javascript
/**
 * Planetarium — UI rendering.
 *
 * Handles planet labels, starfield background, sun glow, and info text.
 * All functions are stateless renderers that take the current state.
 *
 * @module planetarium/ui
 */

import { Painter } from "../../../src/index.js";
import { CONFIG } from "./planetarium.config.js";

/**
 * Generate a static starfield (call once, reuse the array).
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Array<{x: number, y: number, brightness: number, size: number}>}
 */
export function generateStarfield(width, height) {
  const stars = [];
  const { count, minBrightness, maxBrightness, minSize, maxSize } = CONFIG.display.starfield;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      brightness: minBrightness + Math.random() * (maxBrightness - minBrightness),
      size: minSize + Math.random() * (maxSize - minSize),
    });
  }
  return stars;
}

/**
 * Render starfield background.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} stars - From generateStarfield
 */
export function drawStarfield(ctx, stars) {
  for (const star of stars) {
    ctx.globalAlpha = star.brightness;
    Painter.shapes.fillCircle(star.x, star.y, star.size, "#fff");
  }
  ctx.globalAlpha = 1;
}

/**
 * Render sun glow (additive blended concentric circles).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} screenX - Sun screen X
 * @param {number} screenY - Sun screen Y
 * @param {number} displayRadius - Sun display radius (already scaled)
 * @param {number} scale - Projection scale
 */
export function drawSunGlow(ctx, screenX, screenY, displayRadius, scale) {
  const { layers, baseAlpha, baseSize, color } = CONFIG.display.sunGlow;
  const r = displayRadius * scale;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < layers; i++) {
    const layerRadius = r * (baseSize + i * 0.8);
    const alpha = baseAlpha / (i + 1);
    const gradient = ctx.createRadialGradient(
      screenX, screenY, r * 0.5,
      screenX, screenY, layerRadius
    );
    gradient.addColorStop(0, `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, layerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Render planet name labels below each body.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<CelestialBody>} bodies - All bodies to label (already projected)
 */
export function drawLabels(ctx, bodies) {
  const { font, color, offsetY } = CONFIG.display.labels;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const body of bodies) {
    if (body.scale <= 0) continue;
    const labelY = body.screenY + body.displayRadius * body.scale + offsetY;
    ctx.fillText(body.name, body.screenX, labelY);
  }
}

/**
 * Render HUD info text.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} simTime - Current simulation time in days
 * @param {number} timeScale - Current time scale
 * @param {boolean} paused - Whether simulation is paused
 */
export function drawHUD(ctx, simTime, timeScale, paused) {
  const years = (simTime / 365.25).toFixed(1);
  const status = paused ? " [PAUSED]" : "";
  const text = `T+${years}y  ×${timeScale.toFixed(0)}${status}`;

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, 12, 12);
}
```

- [ ] **Step 2: Commit**

```bash
git add demos/js/planetarium/planetarium.ui.js
git commit -m "feat(planetarium): add UI rendering (starfield, glow, labels, HUD)"
```

---

### Task 7: Main Demo Class

**Files:**
- Create: `demos/js/planetarium/index.js`

- [ ] **Step 1: Create the PlanetariumDemo class**

```javascript
/**
 * Planetarium — Main demo.
 *
 * Solar system visualization with Sphere3D shaders and Keplerian orbits.
 *
 * @module planetarium/index
 */

import {
  Game,
  Camera3D,
  Gesture,
  Screen,
  FPSCounter,
  Keys,
} from "../../../src/index.js";
import { CONFIG } from "./planetarium.config.js";
import { SUN, PLANETS } from "./planetarium.data.js";
import { CelestialBody } from "./planetarium.bodies.js";
import {
  generateStarfield,
  drawStarfield,
  drawSunGlow,
  drawLabels,
  drawHUD,
} from "./planetarium.ui.js";

export class PlanetariumDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();
    Screen.init(this);

    // Simulation time (days)
    this.simTime = 0;
    this.timeScale = CONFIG.time.scale;
    this.paused = false;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      minRotationX: CONFIG.camera.minRotationX,
      maxRotationX: CONFIG.camera.maxRotationX,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      autoRotate: CONFIG.camera.autoRotate,
      autoRotateSpeed: CONFIG.camera.autoRotateSpeed,
      autoRotateAxis: CONFIG.camera.autoRotateAxis,
      velocityScale: CONFIG.camera.velocityScale,
    });
    this.camera.enableMouseControl(this.canvas);

    // Zoom
    const initialZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // Pan
    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;

    // Gesture (zoom + pan)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this.targetZoom));
      },
      onPan: (dx, dy) => {
        this.targetPanX += dx * CONFIG.pan.speed;
        this.targetPanY += dy * CONFIG.pan.speed;
      },
    });

    // Double-click reset
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.targetPanX = 0;
      this.targetPanY = 0;
      this.camera.reset();
    });

    // Spacebar pause
    this.keys = new Keys();
    this.keys.on("Space", () => {
      this.paused = !this.paused;
    });

    // Create celestial bodies
    const minDim = Math.min(this.width, this.height);
    this.sun = new CelestialBody(SUN, this.camera, minDim);
    this.planets = [];
    this.moons = [];

    for (const planetData of PLANETS) {
      const planet = new CelestialBody(planetData, this.camera, minDim);
      this.planets.push(planet);

      if (planetData.moons) {
        for (const moonData of planetData.moons) {
          const moon = new CelestialBody(moonData, this.camera, minDim, planet);
          this.moons.push(moon);
        }
      }
    }

    // All bodies flat list for rendering
    this.allBodies = [this.sun, ...this.planets, ...this.moons];

    // Starfield
    this.stars = generateStarfield(this.width, this.height);

    // FPS counter
    this.pipeline.add(new FPSCounter(this, { anchor: "bottom-right" }));
  }

  onResize() {
    const minDim = Math.min(this.width, this.height);
    for (const body of this.allBodies) {
      body.resize(minDim);
    }
    this.stars = generateStarfield(this.width, this.height);

    // Recalculate zoom
    const newDefaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.defaultZoom = newDefaultZoom;
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);

    // Ease zoom and pan
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;
    this.panX += (this.targetPanX - this.panX) * CONFIG.pan.easing;
    this.panY += (this.targetPanY - this.panY) * CONFIG.pan.easing;

    // Advance simulation
    if (!this.paused) {
      this.simTime += dt * this.timeScale;
    }

    // Update orbital positions (planets first, then moons)
    for (const planet of this.planets) {
      planet.update(this.simTime);
    }
    for (const moon of this.moons) {
      moon.update(this.simTime);
    }
  }

  render() {
    super.render(); // clears canvas + pipeline (FPS counter)

    const ctx = this.ctx;
    const centerX = this.width / 2 + this.panX;
    const centerY = this.height / 2 + this.panY;

    // 1. Starfield
    drawStarfield(ctx, this.stars);

    // 2. Orbit paths (planets, then moons)
    for (const planet of this.planets) {
      planet.drawOrbitPath(ctx, centerX, centerY, this.zoom);
    }
    for (const moon of this.moons) {
      moon.drawOrbitPath(ctx, centerX, centerY, this.zoom);
    }

    // 3. Project all bodies
    for (const body of this.allBodies) {
      body.project(centerX, centerY, this.zoom);
    }

    // 4. Depth sort (back to front)
    const sorted = [...this.allBodies].sort((a, b) => b.depth - a.depth);

    // 5. Render bodies
    for (const body of sorted) {
      // Sun glow behind the sun sphere
      if (body === this.sun) {
        drawSunGlow(ctx, body.screenX, body.screenY, body.displayRadius, body.scale);
      }
      body.draw(ctx);
    }

    // 6. Labels (always on top)
    drawLabels(ctx, this.allBodies);

    // 7. HUD
    drawHUD(ctx, this.simTime, this.timeScale, this.paused);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add demos/js/planetarium/index.js
git commit -m "feat(planetarium): add main PlanetariumDemo game class"
```

---

### Task 8: HTML Entry Point + Navigation

**Files:**
- Create: `demos/planetarium.html`
- Modify: `demos/index.html`

- [ ] **Step 1: Create planetarium.html**

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Planetarium</title>
  <link rel="stylesheet" href="demos.css" />
  <script src="./js/info-toggle.js"></script>
</head>

<body>
  <div id="info">
    <strong>Planetarium</strong> — Solar system with Keplerian orbital mechanics.<br />
    <span style="color:#CCC">
      <li>Drag to rotate view</li>
      <li>Scroll / pinch to zoom</li>
      <li>Two-finger drag to pan</li>
      <li>Space to pause, double-click to reset</li>
    </span>
  </div>
  <canvas id="game"></canvas>

  <script type="module">
    import { PlanetariumDemo } from "./js/planetarium/index.js";
    window.addEventListener("load", () => {
      const canvas = document.getElementById("game");
      const game = new PlanetariumDemo(canvas);
      game.enablePauseOnBlur(true);
      game.setFPS(60);
      game.start();
    });
  </script>
</body>

</html>
```

- [ ] **Step 2: Add to demos/index.html 3D section**

In `demos/index.html`, find the 3D section and add the Planetarium link after the existing entries:

```html
<a href="planetarium.html" class="helix-link" style="--i:3">Planetarium</a>
```

This goes after the Rubik's Cube link (which has `--i:2`).

- [ ] **Step 3: Commit**

```bash
git add demos/planetarium.html demos/index.html
git commit -m "feat(planetarium): add HTML entry point and nav link"
```

---

### Task 9: Integration Test + Visual Verification

**Files:**
- No new files

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (including the new kepler tests). No regressions.

- [ ] **Step 2: Start dev server and verify visually**

Run: `npm run dev`

Open the Planetarium demo in the browser. Verify:
- Sun renders at center with star shader and glow
- All 8 planets visible, orbiting at different speeds
- Inner planets (Mercury–Mars) orbit faster than outer planets
- Saturn has a visible ring
- Moon, Io, and Titan orbit their parents
- Orbit paths visible as translucent ellipses
- Drag rotates the view
- Scroll zooms in/out
- Two-finger pan works
- Spacebar pauses/resumes
- Double-click resets camera
- Labels appear below planets
- HUD shows time and scale
- FPS counter in bottom-right
- No console errors

- [ ] **Step 3: Fix any issues found during visual verification**

Address bugs or visual tweaks as needed. Common issues to watch for:
- Orbit paths not closing (off-by-one in segments)
- Moon orbits too large/small relative to planet size
- Sun glow too bright or too dim
- Labels overlapping at certain zoom levels
- Saturn ring looking wrong at certain camera angles

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(planetarium): address visual verification issues"
```

(Only if there were fixes needed. Skip if everything worked.)

---

## Task Dependency Graph

```
Task 1 (Kepler tests - red)
    → Task 2 (Kepler implementation - green)
        → Task 3 (Planet data) — can start after Task 2
        → Task 4 (Config) — independent, can parallel with Task 3
            → Task 5 (CelestialBody) — needs Tasks 2, 3, 4
                → Task 6 (UI) — independent of Task 5, can parallel
                    → Task 7 (Main demo) — needs Tasks 5, 6
                        → Task 8 (HTML + nav) — needs Task 7
                            → Task 9 (Integration test)
```

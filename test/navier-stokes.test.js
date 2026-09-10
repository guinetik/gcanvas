import { describe, expect, it, vi } from "vitest";

// Isolate the real numerical functions from browser-only engine initialization.
vi.mock("../src/index.js", () => ({ Game: class {}, GameObject: class {}, Painter: {}, Camera3D: class {}, Screen: {}, WebGLAttractorPipeline: class {} }));
import { angularVelocity, vortexVelocity, traceVortex, PRESETS } from "../demos/js/navier-stokes.js";

describe("Burgers vortex art field", () => {
  it("has a finite, continuous axis limit", () => {
    for (const parameters of Object.values(PRESETS)) {
      expect(Number.isFinite(angularVelocity(0, parameters))).toBe(true);
      expect(angularVelocity(1e-5, parameters)).toBeCloseTo(angularVelocity(0, parameters), 7);
      expect(Object.values(vortexVelocity(0, 0, 0, parameters)).every((value) => value === 0)).toBe(true);
    }
  });

  it("preserves incompressibility away from and on the axis", () => {
    const h = 1e-5;
    for (const parameters of Object.values(PRESETS)) {
      for (const point of [[0, 0, 0], [0.2, -0.4, 0.7], [1.1, 0.3, -1]]) {
        let divergence = 0;
        ["x", "y", "z"].forEach((axis, i) => {
          const plus = [...point], minus = [...point];
          plus[i] += h;
          minus[i] -= h;
          divergence += (vortexVelocity(...plus, parameters)[axis] - vortexVelocity(...minus, parameters)[axis]) / (2 * h);
        });
        expect(Math.abs(divergence)).toBeLessThan(1e-7);
      }
    }
  });

  it("conserves z r² along both outward branches, with inward radial motion", () => {
    for (const parameters of Object.values(PRESETS)) {
      for (const seed of [-0.04, 0.04]) {
        const { points, duration } = traceVortex(1.2, seed, 0.5, parameters);
        expect(duration).toBeGreaterThan(0);
        let previousRadius = Infinity;
        for (const point of points) {
          const r2 = point.x ** 2 + point.y ** 2;
          expect(r2).toBeLessThan(previousRadius);
          previousRadius = r2;
          expect(point.z * r2).toBeCloseTo(seed * 1.2 ** 2, 10);
          expect(point.heat).toBeGreaterThan(0);
          expect(point.heat).toBeLessThanOrEqual(1);
        }
        expect(Math.abs(points.at(-1).z)).toBeCloseTo(1.85, 10);
      }
    }
  });

  it("reduces core rotation when viscosity increases", () => {
    const p = PRESETS.balance;
    expect(angularVelocity(0.1, { ...p, viscosity: p.viscosity * 2 })).toBeLessThan(angularVelocity(0.1, p));
  });
});

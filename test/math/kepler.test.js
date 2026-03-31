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
        inclination: Math.PI / 6,
        longitudeOfAscendingNode: 0,
        argumentOfPeriapsis: 0,
        period: 100,
        epoch: 0,
      };
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

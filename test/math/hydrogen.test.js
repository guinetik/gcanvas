import { describe, it, expect } from "vitest";
import { associatedLaguerre, associatedLegendre, radialWaveFunction, angularWaveFunction, probabilityDensity } from "../../src/math/hydrogen.js";

describe("associatedLaguerre", () => {
  it("returns 1 for n=0", () => {
    expect(associatedLaguerre(0, 0, 5)).toBeCloseTo(1);
    expect(associatedLaguerre(0, 3, 2.5)).toBeCloseTo(1);
  });

  it("returns 1+alpha-x for n=1", () => {
    expect(associatedLaguerre(1, 0, 2)).toBeCloseTo(-1);
    expect(associatedLaguerre(1, 3, 1)).toBeCloseTo(3);
    expect(associatedLaguerre(1, 2, 0.5)).toBeCloseTo(2.5);
  });

  it("computes L_2^0 correctly", () => {
    expect(associatedLaguerre(2, 0, 0)).toBeCloseTo(1);
    expect(associatedLaguerre(2, 0, 2)).toBeCloseTo(-1);
    expect(associatedLaguerre(2, 0, 4)).toBeCloseTo(1);
  });

  it("computes L_1^1 for hydrogen 2p", () => {
    expect(associatedLaguerre(1, 1, 0)).toBeCloseTo(2);
    expect(associatedLaguerre(1, 1, 1)).toBeCloseTo(1);
    expect(associatedLaguerre(1, 1, 2)).toBeCloseTo(0);
  });
});

describe("associatedLegendre", () => {
  it("returns 1 for l=0 m=0", () => {
    expect(associatedLegendre(0, 0, 0.5)).toBeCloseTo(1);
  });

  it("returns x for l=1 m=0", () => {
    expect(associatedLegendre(1, 0, 0.5)).toBeCloseTo(0.5);
    expect(associatedLegendre(1, 0, 0)).toBeCloseTo(0);
  });

  it("computes P_1^1 correctly", () => {
    expect(associatedLegendre(1, 1, 0)).toBeCloseTo(-1);
    expect(associatedLegendre(1, 1, 0.5)).toBeCloseTo(-Math.sqrt(0.75));
  });

  it("computes P_2^0 correctly", () => {
    expect(associatedLegendre(2, 0, 0)).toBeCloseTo(-0.5);
    expect(associatedLegendre(2, 0, 1)).toBeCloseTo(1);
  });

  it("computes P_2^1 correctly", () => {
    expect(associatedLegendre(2, 1, 0.5)).toBeCloseTo(-3 * 0.5 * Math.sqrt(0.75));
  });

  it("computes P_2^2 correctly", () => {
    expect(associatedLegendre(2, 2, 0)).toBeCloseTo(3);
    expect(associatedLegendre(2, 2, 0.5)).toBeCloseTo(3 * 0.75);
  });

  it("handles negative m", () => {
    const pos = associatedLegendre(2, 1, 0.5);
    const neg = associatedLegendre(2, -1, 0.5);
    expect(neg).toBeCloseTo(pos * (-1) * (1 / 6));
  });
});

describe("radialWaveFunction", () => {
  it("computes 1s radial correctly at r=0", () => {
    const R = radialWaveFunction(1, 0, 0);
    expect(R).toBeCloseTo(2);
  });

  it("computes 1s radial correctly at r=1", () => {
    const R = radialWaveFunction(1, 0, 1);
    expect(R).toBeCloseTo(2 * Math.exp(-1));
  });

  it("returns 0 at r=0 for l>0", () => {
    expect(radialWaveFunction(2, 1, 0)).toBeCloseTo(0);
    expect(radialWaveFunction(3, 2, 0)).toBeCloseTo(0);
  });

  it("produces finite values for higher n", () => {
    const R = radialWaveFunction(4, 2, 5);
    expect(isFinite(R)).toBe(true);
  });
});

describe("angularWaveFunction", () => {
  it("returns constant for l=0 m=0", () => {
    const y1 = angularWaveFunction(0, 0, 0);
    const y2 = angularWaveFunction(0, 0, Math.PI / 2);
    expect(y1).toBeCloseTo(y2);
    expect(y1).toBeCloseTo(1 / (2 * Math.sqrt(Math.PI)));
  });

  it("has cos(theta) dependence for l=1 m=0", () => {
    const atPole = angularWaveFunction(1, 0, 0);
    const atEquator = angularWaveFunction(1, 0, Math.PI / 2);
    expect(atEquator).toBeCloseTo(0, 5);
    expect(Math.abs(atPole)).toBeGreaterThan(0);
  });
});

describe("probabilityDensity", () => {
  it("returns positive values", () => {
    expect(probabilityDensity(1, 0, 0, 1, 0)).toBeGreaterThan(0);
    expect(probabilityDensity(2, 1, 0, 2, Math.PI / 4)).toBeGreaterThan(0);
  });

  it("is spherically symmetric for 1s", () => {
    const p1 = probabilityDensity(1, 0, 0, 1, 0);
    const p2 = probabilityDensity(1, 0, 0, 1, Math.PI / 2);
    const p3 = probabilityDensity(1, 0, 0, 1, Math.PI);
    expect(p1).toBeCloseTo(p2);
    expect(p2).toBeCloseTo(p3);
  });

  it("is zero at r=0 for 2p orbital", () => {
    expect(probabilityDensity(2, 1, 0, 0, Math.PI / 4)).toBeCloseTo(0);
  });
});

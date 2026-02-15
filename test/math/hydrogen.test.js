import { describe, it, expect } from "vitest";
import { associatedLaguerre, associatedLegendre } from "../../src/math/hydrogen.js";

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

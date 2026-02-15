import { describe, it, expect } from "vitest";
import { associatedLaguerre } from "../../src/math/hydrogen.js";

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

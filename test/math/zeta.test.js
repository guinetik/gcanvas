import { describe, it, expect } from "vitest";
import {
  riemannSiegelTheta,
  riemannSiegelZ,
  zetaCriticalLine,
  findZerosInRange,
  verifyZero,
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

describe("verifyZero", () => {
  it("matches a known zero within tolerance", () => {
    const result = verifyZero(14.13, 0.1);
    expect(result.verified).toBe(true);
    expect(result.knownValue).toBeCloseTo(14.134725, 3);
    expect(result.index).toBe(1);
  });

  it("does not match when outside tolerance", () => {
    const result = verifyZero(16.0, 0.1);
    expect(result.verified).toBe(false);
    expect(result.knownValue).toBeNull();
    expect(result.index).toBe(-1);
  });

  it("matches second zero", () => {
    const result = verifyZero(21.02, 0.1);
    expect(result.verified).toBe(true);
    expect(result.index).toBe(2);
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

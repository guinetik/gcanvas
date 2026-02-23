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
      expect(conj.imag).toBeCloseTo(0);
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

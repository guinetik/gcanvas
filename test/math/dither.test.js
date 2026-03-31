import { describe, it, expect } from "vitest";
import { Dither } from "../../src/math/dither.js";

function makeGradient(w, h) {
  const data = new Float32Array(w * h);
  for (let i = 0; i < data.length; i++) {
    data[i] = i / (data.length - 1);
  }
  return data;
}

// ─── errorDiffusion core ───────────────────────────────────────────────────

describe("Dither.errorDiffusion", () => {
  it("is a static method", () => {
    expect(typeof Dither.errorDiffusion).toBe("function");
  });

  it("returns a Uint8ClampedArray of size width*height*4", () => {
    const w = 8, h = 8;
    const src = makeGradient(w, h);
    const result = Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(w * h * 4);
  });

  it("produces only black (0) or white (255) RGB values", () => {
    const w = 16, h = 16;
    const src = makeGradient(w, h);
    const result = Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toSatisfy((v) => v === 0 || v === 255);
      expect(result[i + 1]).toSatisfy((v) => v === 0 || v === 255);
      expect(result[i + 2]).toSatisfy((v) => v === 0 || v === 255);
    }
  });

  it("always sets alpha channel to 255", () => {
    const w = 8, h = 8;
    const src = makeGradient(w, h);
    const result = Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    for (let i = 3; i < result.length; i += 4) {
      expect(result[i]).toBe(255);
    }
  });

  it("matches floydSteinberg output when given FLOYD_STEINBERG kernel", () => {
    const w = 20, h = 20;
    const src = makeGradient(w, h);
    const fromGeneric = Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    const fromDirect = Dither.floydSteinberg(src, w, h);
    expect(Array.from(fromGeneric)).toEqual(Array.from(fromDirect));
  });

  it("does not modify the source array", () => {
    const w = 8, h = 8;
    const src = makeGradient(w, h);
    const copy = new Float32Array(src);
    Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    expect(Array.from(src)).toEqual(Array.from(copy));
  });

  it("handles all-black source (all zeros)", () => {
    const w = 4, h = 4;
    const src = new Float32Array(w * h); // all 0
    const result = Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toBe(0);
    }
  });

  it("handles all-white source (all ones)", () => {
    const w = 4, h = 4;
    const src = new Float32Array(w * h).fill(1.0);
    const result = Dither.errorDiffusion(src, w, h, Dither.FLOYD_STEINBERG);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toBe(255);
    }
  });
});

// ─── Kernel presets ────────────────────────────────────────────────────────

describe("Dither kernel presets", () => {
  const kernelNames = [
    "FLOYD_STEINBERG",
    "STUCKI",
    "JARVIS",
    "ATKINSON",
    "SIERRA",
    "SIERRA_TWO_ROW",
    "SIERRA_LITE",
    "BURKES",
  ];

  for (const name of kernelNames) {
    describe(`Dither.${name}`, () => {
      it("is defined", () => {
        expect(Dither[name]).toBeDefined();
      });

      it("has offsets array", () => {
        expect(Array.isArray(Dither[name].offsets)).toBe(true);
        expect(Dither[name].offsets.length).toBeGreaterThan(0);
      });

      it("has weights array with same length as offsets", () => {
        const k = Dither[name];
        expect(Array.isArray(k.weights)).toBe(true);
        expect(k.weights.length).toBe(k.offsets.length);
      });

      it("has a numeric divisor greater than 0", () => {
        expect(typeof Dither[name].divisor).toBe("number");
        expect(Dither[name].divisor).toBeGreaterThan(0);
      });

      it("each offset is a 2-element array [dx, dy]", () => {
        for (const offset of Dither[name].offsets) {
          expect(Array.isArray(offset)).toBe(true);
          expect(offset.length).toBe(2);
        }
      });
    });
  }

  it("FLOYD_STEINBERG has correct values", () => {
    const k = Dither.FLOYD_STEINBERG;
    expect(k.offsets).toEqual([[1, 0], [-1, 1], [0, 1], [1, 1]]);
    expect(k.weights).toEqual([7, 3, 5, 1]);
    expect(k.divisor).toBe(16);
  });

  it("ATKINSON has correct values", () => {
    const k = Dither.ATKINSON;
    expect(k.offsets).toEqual([[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]]);
    expect(k.weights).toEqual([1, 1, 1, 1, 1, 1]);
    expect(k.divisor).toBe(8);
  });

  it("STUCKI divisor is 42", () => {
    expect(Dither.STUCKI.divisor).toBe(42);
  });

  it("JARVIS divisor is 48", () => {
    expect(Dither.JARVIS.divisor).toBe(48);
  });

  it("SIERRA divisor is 32", () => {
    expect(Dither.SIERRA.divisor).toBe(32);
  });

  it("SIERRA_TWO_ROW divisor is 16", () => {
    expect(Dither.SIERRA_TWO_ROW.divisor).toBe(16);
  });

  it("SIERRA_LITE divisor is 4", () => {
    expect(Dither.SIERRA_LITE.divisor).toBe(4);
  });

  it("BURKES divisor is 32", () => {
    expect(Dither.BURKES.divisor).toBe(32);
  });
});

// ─── Convenience methods ───────────────────────────────────────────────────

describe("Dither convenience methods", () => {
  const methods = [
    ["stucki", "STUCKI"],
    ["jarvis", "JARVIS"],
    ["atkinson", "ATKINSON"],
    ["sierra", "SIERRA"],
    ["sierraTwoRow", "SIERRA_TWO_ROW"],
    ["sierraLite", "SIERRA_LITE"],
    ["burkes", "BURKES"],
  ];

  const w = 12, h = 12;
  const src = makeGradient(w, h);

  for (const [method, preset] of methods) {
    describe(`Dither.${method}`, () => {
      it("is a static method", () => {
        expect(typeof Dither[method]).toBe("function");
      });

      it("returns a Uint8ClampedArray of correct size", () => {
        const result = Dither[method](src, w, h);
        expect(result).toBeInstanceOf(Uint8ClampedArray);
        expect(result.length).toBe(w * h * 4);
      });

      it("produces only black/white RGB values", () => {
        const result = Dither[method](src, w, h);
        for (let i = 0; i < result.length; i += 4) {
          expect(result[i]).toSatisfy((v) => v === 0 || v === 255);
        }
      });

      it("always sets alpha to 255", () => {
        const result = Dither[method](src, w, h);
        for (let i = 3; i < result.length; i += 4) {
          expect(result[i]).toBe(255);
        }
      });

      it(`matches errorDiffusion with ${preset} kernel`, () => {
        const fromMethod = Dither[method](src, w, h);
        const fromGeneric = Dither.errorDiffusion(src, w, h, Dither[preset]);
        expect(Array.from(fromMethod)).toEqual(Array.from(fromGeneric));
      });
    });
  }
});

// ─── Existing floydSteinberg is unchanged ─────────────────────────────────

describe("Dither.floydSteinberg (existing, unchanged)", () => {
  it("still exists and returns correct size", () => {
    const w = 8, h = 8;
    const src = makeGradient(w, h);
    const result = Dither.floydSteinberg(src, w, h);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(w * h * 4);
  });

  it("still produces only black/white output", () => {
    const w = 16, h = 8;
    const src = makeGradient(w, h);
    const result = Dither.floydSteinberg(src, w, h);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i]).toSatisfy((v) => v === 0 || v === 255);
    }
  });
});

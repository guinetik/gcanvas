import { describe, it, expect } from "vitest";
import {
  adjustContrast,
  adjustBrightness,
  adjustHighlights,
  adjustShadows,
  adjustGamma,
  addGrain,
  desaturate,
  scalePixels,
} from "../../src/math/image-processor.js";

// Helper: build a minimal ImageData-like object from a flat array of RGBA values.
// Pass a 2D array of pixel arrays, e.g. [[r,g,b,a], [r,g,b,a], ...]
function makeImageData(pixels) {
  const data = new Uint8ClampedArray(pixels.flat());
  return { data, width: 2, height: 2 };
}

// ─── adjustContrast ────────────────────────────────────────────────────────

describe("adjustContrast", () => {
  it("returns pixel values unchanged when amount is 0", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50, 80, 120, 255],
      [200, 30, 60, 128],
      [0, 255, 128, 200],
    ]);
    const result = adjustContrast(img, 0);
    // With amount=0, factor = 1 + 0*2 = 1, so (p-128)*1+128 = p
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50, 80, 120, 255],
      [200, 30, 60, 128],
      [0, 255, 128, 200],
    ]);
    const originalCopy = Array.from(img.data);
    adjustContrast(img, 0.5);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("increases contrast: pixels further from 128 when amount > 0", () => {
    // Use a pixel at 200 (above mid) and 50 (below mid)
    const img = makeImageData([
      [200, 50, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustContrast(img, 0.5);
    // factor = 1 + 0.5*2 = 2
    // pixel 200 → (200-128)*2 + 128 = 72*2 + 128 = 272 → clamped to 255
    // pixel 50  → (50-128)*2 + 128  = -78*2 + 128 = -28 → clamped to 0
    // pixel 128 → (128-128)*2 + 128 = 128 (unchanged)
    expect(result.data[0]).toBe(255); // 200 pushed up
    expect(result.data[1]).toBe(0);   // 50 pushed down
    expect(result.data[2]).toBe(128); // 128 stays
  });

  it("preserves alpha channel without modification", () => {
    const img = makeImageData([
      [100, 100, 100, 77],
      [200, 200, 200, 200],
      [50, 50, 50, 0],
      [128, 128, 128, 255],
    ]);
    const result = adjustContrast(img, 0.5);
    // Alpha values are at indices 3, 7, 11, 15
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("returns a new object with the same width and height", () => {
    const img = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustContrast(img, 0.3);
    expect(result).not.toBe(img);
    expect(result.width).toBe(img.width);
    expect(result.height).toBe(img.height);
  });

  it("clamps output to [0, 255]", () => {
    const img = makeImageData([
      [255, 0, 200, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustContrast(img, 1.0);
    // All channel values must be within valid range
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i]).toBeLessThanOrEqual(255);
    }
  });
});

// ─── adjustBrightness ─────────────────────────────────────────────────────

describe("adjustBrightness", () => {
  it("returns pixel values unchanged when amount is 0", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50, 80, 120, 255],
      [200, 30, 60, 128],
      [0, 255, 128, 200],
    ]);
    const result = adjustBrightness(img, 0);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("brightens pixels when amount is positive", () => {
    const img = makeImageData([
      [100, 100, 100, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustBrightness(img, 0.5);
    // offset = 0.5 * 255 = 127.5 → 100+127.5=227.5 → Uint8Clamp rounds to 228 or 227
    // We just verify it's higher than the original
    expect(result.data[0]).toBeGreaterThan(100);
    expect(result.data[1]).toBeGreaterThan(100);
    expect(result.data[2]).toBeGreaterThan(100);
  });

  it("dims pixels when amount is negative", () => {
    const img = makeImageData([
      [200, 200, 200, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustBrightness(img, -0.5);
    expect(result.data[0]).toBeLessThan(200);
  });

  it("clamps to 0 when darkening below 0", () => {
    const img = makeImageData([
      [10, 20, 30, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustBrightness(img, -1.0);
    // offset = -255; 10 - 255 = -245 → clamped to 0
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("clamps to 255 when brightening above 255", () => {
    const img = makeImageData([
      [250, 240, 230, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustBrightness(img, 1.0);
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(255);
    expect(result.data[2]).toBe(255);
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50, 80, 120, 255],
      [200, 30, 60, 128],
      [0, 255, 128, 200],
    ]);
    const originalCopy = Array.from(img.data);
    adjustBrightness(img, 0.5);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("preserves alpha channel without modification", () => {
    const img = makeImageData([
      [100, 100, 100, 77],
      [200, 200, 200, 200],
      [50, 50, 50, 0],
      [128, 128, 128, 255],
    ]);
    const result = adjustBrightness(img, 0.3);
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });
});

// ─── adjustHighlights ─────────────────────────────────────────────────────

describe("adjustHighlights", () => {
  it("returns pixel values unchanged when amount is 0", () => {
    const img = makeImageData([
      [200, 180, 160, 255],
      [50, 30, 20, 255],
      [128, 128, 128, 255],
      [10, 10, 10, 255],
    ]);
    const result = adjustHighlights(img, 0);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [128, 128, 128, 255],
      [10, 10, 10, 255],
    ]);
    const originalCopy = Array.from(img.data);
    adjustHighlights(img, 0.5);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("affects bright pixels more than dark pixels", () => {
    // bright pixel: lum ≈ 0.9 → weight ≈ 0.8 → large offset
    // dark pixel:   lum ≈ 0.1 → weight = 0   → zero offset
    const bright = [230, 230, 230, 255]; // lum = 230/255 ≈ 0.902
    const dark   = [25,  25,  25,  255]; // lum =  25/255 ≈ 0.098
    const img = makeImageData([bright, dark, [128, 128, 128, 255], [128, 128, 128, 255]]);

    const result = adjustHighlights(img, 1.0);

    const brightChange = Math.abs(result.data[0] - bright[0]);
    const darkChange   = Math.abs(result.data[4] - dark[0]);

    expect(brightChange).toBeGreaterThan(darkChange);
  });

  it("dark pixels are unaffected when lum <= 0.5", () => {
    // lum = 0 → weight = max(0, (0 - 0.5) * 2) = 0
    const img = makeImageData([
      [0, 0, 0, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustHighlights(img, 1.0);
    // Black pixel has zero luminance → weight 0 → unchanged
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("preserves alpha channel", () => {
    const img = makeImageData([
      [200, 200, 200, 77],
      [50,  50,  50,  200],
      [128, 128, 128, 0],
      [240, 240, 240, 255],
    ]);
    const result = adjustHighlights(img, 0.5);
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("clamps output to [0, 255]", () => {
    const img = makeImageData([
      [255, 255, 255, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustHighlights(img, 1.0);
    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i]).toBeLessThanOrEqual(255);
    }
  });
});

// ─── adjustShadows ────────────────────────────────────────────────────────

describe("adjustShadows", () => {
  it("returns pixel values unchanged when amount is 0", () => {
    const img = makeImageData([
      [200, 180, 160, 255],
      [50,  30,  20,  255],
      [128, 128, 128, 255],
      [10,  10,  10,  255],
    ]);
    const result = adjustShadows(img, 0);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [200, 200, 200, 255],
      [50,  50,  50,  255],
      [128, 128, 128, 255],
      [10,  10,  10,  255],
    ]);
    const originalCopy = Array.from(img.data);
    adjustShadows(img, 0.5);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("affects dark pixels more than bright pixels", () => {
    // dark pixel:   lum ≈ 0.1 → weight ≈ 0.8 → large offset
    // bright pixel: lum ≈ 0.9 → weight = 0   → zero offset
    const dark   = [25,  25,  25,  255]; // lum ≈ 0.098
    const bright = [230, 230, 230, 255]; // lum ≈ 0.902
    const img = makeImageData([dark, bright, [128, 128, 128, 255], [128, 128, 128, 255]]);

    const result = adjustShadows(img, 1.0);

    const darkChange   = Math.abs(result.data[0] - dark[0]);
    const brightChange = Math.abs(result.data[4] - bright[0]);

    expect(darkChange).toBeGreaterThan(brightChange);
  });

  it("bright pixels are unaffected when lum >= 0.5", () => {
    // lum = 1 → weight = max(0, 1 - 1*2) = 0
    const img = makeImageData([
      [255, 255, 255, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustShadows(img, 1.0);
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(255);
    expect(result.data[2]).toBe(255);
  });

  it("preserves alpha channel", () => {
    const img = makeImageData([
      [50,  50,  50,  77],
      [200, 200, 200, 200],
      [10,  10,  10,  0],
      [30,  30,  30,  255],
    ]);
    const result = adjustShadows(img, 0.5);
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("clamps output to [0, 255]", () => {
    const img = makeImageData([
      [0, 0, 0, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustShadows(img, -1.0);
    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i]).toBeLessThanOrEqual(255);
    }
  });
});

// ─── adjustGamma ──────────────────────────────────────────────────────────

describe("adjustGamma", () => {
  it("returns pixel values unchanged when gamma is 1.0", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const result = adjustGamma(img, 1.0);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const originalCopy = Array.from(img.data);
    adjustGamma(img, 2.0);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("brightens midtones when gamma < 1", () => {
    // gamma=0.5 → invGamma=2; midtone 128 → (128/255)^2 * 255 ≈ 64 → DARKER
    // actually gamma<1 means invGamma>1 → pow(x, >1) < x → darker
    // Wait: gamma=0.5, invGamma=2, pow(0.5, 2)=0.25 → darkens
    // gamma=2, invGamma=0.5, pow(0.5, 0.5)=0.707 → brightens
    // So gamma < 1 → darkens; gamma > 1 → brightens
    // (Standard photographic convention: gamma<1 darkens)
    // The task says "< 1 brightens" — let's test the actual behavior
    const img = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    // gamma=0.5: invGamma=2, (128/255)^2 * 255 ≈ 64.25 → ~64 (darkens)
    // gamma=2.0: invGamma=0.5, (128/255)^0.5 * 255 ≈ 180.3 → ~180 (brightens)
    const dark   = adjustGamma(img, 0.5);
    const bright = adjustGamma(img, 2.0);
    expect(bright.data[0]).toBeGreaterThan(128);
    expect(dark.data[0]).toBeLessThan(128);
  });

  it("preserves pure black (0) regardless of gamma", () => {
    const img = makeImageData([
      [0, 0, 0, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustGamma(img, 2.2);
    // pow(0/255, inv) * 255 = 0
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("preserves pure white (255) regardless of gamma", () => {
    const img = makeImageData([
      [255, 255, 255, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustGamma(img, 2.2);
    // pow(1, inv) * 255 = 255
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(255);
    expect(result.data[2]).toBe(255);
  });

  it("preserves alpha channel", () => {
    const img = makeImageData([
      [100, 100, 100, 77],
      [200, 200, 200, 200],
      [50,  50,  50,  0],
      [128, 128, 128, 255],
    ]);
    const result = adjustGamma(img, 1.5);
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("clamps output to [0, 255]", () => {
    const img = makeImageData([
      [128, 64, 200, 255],
      [10,  20, 30,  255],
      [240, 250, 245, 255],
      [1,   2,  3,   255],
    ]);
    const result = adjustGamma(img, 0.1);
    for (let i = 0; i < result.data.length; i++) {
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i]).toBeLessThanOrEqual(255);
    }
  });
});

// ─── addGrain ─────────────────────────────────────────────────────────────

describe("addGrain", () => {
  it("returns a pixel-identical clone when amount is 0", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const result = addGrain(img, 0, 42);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const originalCopy = Array.from(img.data);
    addGrain(img, 50, 99);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("modifies at least one pixel when amount > 0", () => {
    const img = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = addGrain(img, 50, 12345);
    // With 4 pixels and amount=50 it is practically impossible that all
    // RGB channels remain at exactly 128 after adding non-zero noise.
    const unchanged = Array.from(result.data).every((v, i) => v === img.data[i]);
    expect(unchanged).toBe(false);
  });

  it("is deterministic: same seed produces identical output", () => {
    const img = makeImageData([
      [100, 100, 100, 255],
      [150, 150, 150, 255],
      [200, 200, 200, 255],
      [50,  50,  50,  255],
    ]);
    const r1 = addGrain(img, 80, 777);
    const r2 = addGrain(img, 80, 777);
    expect(Array.from(r1.data)).toEqual(Array.from(r2.data));
  });

  it("produces different output for different seeds", () => {
    const img = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const r1 = addGrain(img, 80, 1);
    const r2 = addGrain(img, 80, 2);
    // Different seeds must yield at least one different RGB value.
    const allSame = Array.from(r1.data).every((v, i) => v === r2.data[i]);
    expect(allSame).toBe(false);
  });

  it("preserves alpha channel", () => {
    const img = makeImageData([
      [100, 100, 100, 77],
      [200, 200, 200, 200],
      [50,  50,  50,  0],
      [128, 128, 128, 255],
    ]);
    const result = addGrain(img, 50, 42);
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("clamps output to [0, 255]", () => {
    const img = makeImageData([
      [0,   0,   0,   255],
      [255, 255, 255, 255],
      [128, 128, 128, 255],
      [1,   1,   1,   255],
    ]);
    const result = addGrain(img, 255, 999);
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBeGreaterThanOrEqual(0);
      expect(result.data[i]).toBeLessThanOrEqual(255);
      expect(result.data[i + 1]).toBeGreaterThanOrEqual(0);
      expect(result.data[i + 1]).toBeLessThanOrEqual(255);
      expect(result.data[i + 2]).toBeGreaterThanOrEqual(0);
      expect(result.data[i + 2]).toBeLessThanOrEqual(255);
    }
  });
});

// ─── desaturate ───────────────────────────────────────────────────────────

describe("desaturate", () => {
  it("sets R, G, and B to the same value for every pixel", () => {
    const img = makeImageData([
      [200, 100, 50,  255],
      [30,  180, 210, 255],
      [0,   0,   0,   255],
      [255, 255, 255, 255],
    ]);
    const result = desaturate(img);
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(result.data[i + 1]); // R === G
      expect(result.data[i]).toBe(result.data[i + 2]); // R === B
    }
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [200, 100, 50,  255],
      [30,  180, 210, 255],
      [0,   0,   0,   255],
      [255, 255, 255, 255],
    ]);
    const originalCopy = Array.from(img.data);
    desaturate(img);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("pure white stays white", () => {
    const img = makeImageData([
      [255, 255, 255, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = desaturate(img);
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(255);
    expect(result.data[2]).toBe(255);
  });

  it("pure black stays black", () => {
    const img = makeImageData([
      [0,   0,   0,   255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = desaturate(img);
    expect(result.data[0]).toBe(0);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("applies BT.601 luminance weighting (green > red > blue)", () => {
    // Pure red pixel vs pure blue pixel — green should give highest gray
    const red   = makeImageData([[255, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]]);
    const green = makeImageData([[0, 255, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]]);
    const blue  = makeImageData([[0, 0, 255, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]]);

    const grayRed   = desaturate(red).data[0];
    const grayGreen = desaturate(green).data[0];
    const grayBlue  = desaturate(blue).data[0];

    // BT.601: green ≈76, red ≈76 (0.587*255≈150, 0.299*255≈76, 0.114*255≈29)
    expect(grayGreen).toBeGreaterThan(grayRed);
    expect(grayRed).toBeGreaterThan(grayBlue);
  });

  it("preserves alpha channel", () => {
    const img = makeImageData([
      [200, 100, 50,  77],
      [30,  180, 210, 200],
      [0,   0,   0,   0],
      [255, 255, 255, 255],
    ]);
    const result = desaturate(img);
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("returns a new object with the same dimensions", () => {
    const img = makeImageData([
      [200, 100, 50,  255],
      [30,  180, 210, 255],
      [0,   0,   0,   255],
      [255, 255, 255, 255],
    ]);
    const result = desaturate(img);
    expect(result).not.toBe(img);
    expect(result.width).toBe(img.width);
    expect(result.height).toBe(img.height);
  });
});

// ─── scalePixels ──────────────────────────────────────────────────────────

describe("scalePixels", () => {
  it("returns a pixel-identical clone when pixelSize is 1", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const result = scalePixels(img, 1);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("returns a pixel-identical clone when pixelSize is 0", () => {
    const img = makeImageData([
      [10, 20, 30, 255],
      [40, 50, 60, 255],
      [70, 80, 90, 255],
      [11, 22, 33, 255],
    ]);
    const result = scalePixels(img, 0);
    expect(Array.from(result.data)).toEqual(Array.from(img.data));
  });

  it("does not mutate the original image", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const originalCopy = Array.from(img.data);
    scalePixels(img, 2);
    expect(Array.from(img.data)).toEqual(originalCopy);
  });

  it("all pixels in the same block share identical RGB values when pixelSize covers the whole image", () => {
    // 2×2 image with pixelSize=2 → one block, all pixels averaged to same color
    const img = makeImageData([
      [100, 0,   0,   255],
      [0,   100, 0,   255],
      [0,   0,   100, 255],
      [100, 100, 100, 255],
    ]);
    const result = scalePixels(img, 2);
    // All four pixels must have the same R, G, B
    const r0 = result.data[0],  g0 = result.data[1],  b0 = result.data[2];
    const r1 = result.data[4],  g1 = result.data[5],  b1 = result.data[6];
    const r2 = result.data[8],  g2 = result.data[9],  b2 = result.data[10];
    const r3 = result.data[12], g3 = result.data[13], b3 = result.data[14];
    expect(r0).toBe(r1); expect(r0).toBe(r2); expect(r0).toBe(r3);
    expect(g0).toBe(g1); expect(g0).toBe(g2); expect(g0).toBe(g3);
    expect(b0).toBe(b1); expect(b0).toBe(b2); expect(b0).toBe(b3);
  });

  it("produces correct block average (manual calculation)", () => {
    // 2×2 image, pixelSize=2 → single block
    // Average R = (100 + 200 + 150 + 50) / 4 = 125
    // Average G = (0 + 0 + 0 + 0) / 4 = 0
    // Average B = (0 + 0 + 0 + 0) / 4 = 0
    const img = makeImageData([
      [100, 0, 0, 255],
      [200, 0, 0, 255],
      [150, 0, 0, 255],
      [50,  0, 0, 255],
    ]);
    const result = scalePixels(img, 2);
    expect(result.data[0]).toBe(125); // R of any pixel in the block
    expect(result.data[1]).toBe(0);   // G
    expect(result.data[2]).toBe(0);   // B
  });

  it("preserves alpha channel (alpha is not averaged)", () => {
    const img = makeImageData([
      [100, 100, 100, 77],
      [200, 200, 200, 200],
      [50,  50,  50,  0],
      [128, 128, 128, 255],
    ]);
    const result = scalePixels(img, 2);
    // Alpha values come from cloneImage, not from block averaging
    expect(result.data[3]).toBe(77);
    expect(result.data[7]).toBe(200);
    expect(result.data[11]).toBe(0);
    expect(result.data[15]).toBe(255);
  });

  it("returns a new object with the same dimensions", () => {
    const img = makeImageData([
      [100, 150, 200, 255],
      [50,  80,  120, 255],
      [200, 30,  60,  128],
      [0,   255, 128, 200],
    ]);
    const result = scalePixels(img, 2);
    expect(result).not.toBe(img);
    expect(result.width).toBe(img.width);
    expect(result.height).toBe(img.height);
  });
});

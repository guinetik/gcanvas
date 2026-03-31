import { describe, it, expect } from "vitest";
import {
  adjustContrast,
  adjustBrightness,
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

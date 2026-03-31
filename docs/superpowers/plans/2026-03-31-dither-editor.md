# Dither Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive dither editor demo backed by new ImageProcessor functions, expanded dither algorithms, and a themeable UI system.

**Architecture:** Functional image processing pipeline (pure functions, no mutation). Generic error diffusion engine with kernel presets. UI theme registry with named themes. Demo uses Game class with AccordionGroup overlay and Gesture-based zoom/pan.

**Tech Stack:** GCanvas (Game, AccordionGroup, Slider, Dropdown, Button, ToggleButton, Gesture), Vitest for tests.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/math/image-processor.js` | Pure functions for pixel adjustments (contrast, brightness, highlights, shadows, gamma, grain, desaturate, scalePixels) |
| Modify | `src/math/dither.js` | Generic error diffusion engine + 7 new kernel presets + convenience methods |
| Modify | `src/math/index.js` | Export ImageProcessor functions |
| Modify | `src/game/ui/theme.js` | Theme registry, setTheme, getTheme, registerTheme, monochrome theme |
| Modify | `src/game/ui/index.js` | Export new theme functions |
| Create | `test/math/image-processor.test.js` | Tests for all ImageProcessor functions |
| Create | `test/math/dither.test.js` | Tests for error diffusion engine and new algorithms |
| Create | `test/ui/theme.test.js` | Tests for theme registry and switching |
| Create | `demos/js/dither-editor.js` | Demo implementation (Game subclass) |
| Create | `demos/dither-editor.html` | Demo HTML entry point |
| Modify | `demos/index.html:304-306` | Add nav link for Dither Editor |

---

### Task 1: ImageProcessor — Core adjustment functions

**Files:**
- Create: `src/math/image-processor.js`
- Create: `test/math/image-processor.test.js`
- Modify: `src/math/index.js:6` (add export)

- [ ] **Step 1: Write failing tests for adjustContrast and adjustBrightness**

Create `test/math/image-processor.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import {
  adjustContrast,
  adjustBrightness,
} from "../../src/math/image-processor.js";

// Helper: create a 2x2 ImageData-like object
function makeImageData(pixels) {
  // pixels is array of [r,g,b,a] quads
  const data = new Uint8ClampedArray(pixels.flat());
  return { data, width: 2, height: 2 };
}

describe("adjustContrast", () => {
  it("returns unchanged image at amount=0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = adjustContrast(input, 0);
    expect(result.data).toEqual(input.data);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it("does not mutate the input", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const origData = new Uint8ClampedArray(input.data);
    adjustContrast(input, 0.5);
    expect(input.data).toEqual(origData);
  });

  it("increases contrast when amount > 0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = adjustContrast(input, 0.5);
    // Dark pixels get darker, bright pixels get brighter
    expect(result.data[0]).toBeLessThan(100);
    expect(result.data[4]).toBeGreaterThan(200);
  });

  it("preserves alpha channel", () => {
    const input = makeImageData([
      [100, 100, 100, 128],
      [200, 200, 200, 64],
      [50, 50, 50, 255],
      [150, 150, 150, 0],
    ]);
    const result = adjustContrast(input, 0.5);
    expect(result.data[3]).toBe(128);
    expect(result.data[7]).toBe(64);
    expect(result.data[11]).toBe(255);
    expect(result.data[15]).toBe(0);
  });
});

describe("adjustBrightness", () => {
  it("returns unchanged image at amount=0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = adjustBrightness(input, 0);
    expect(result.data).toEqual(input.data);
  });

  it("brightens when amount > 0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = adjustBrightness(input, 0.5);
    expect(result.data[0]).toBeGreaterThan(100);
  });

  it("clamps to 0-255 range", () => {
    const input = makeImageData([
      [250, 250, 250, 255],
      [5, 5, 5, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);
    const bright = adjustBrightness(input, 1);
    expect(bright.data[0]).toBeLessThanOrEqual(255);
    const dark = adjustBrightness(input, -1);
    expect(dark.data[0]).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/math/image-processor.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement adjustContrast and adjustBrightness**

Create `src/math/image-processor.js`:

```javascript
/**
 * ImageProcessor — Pure functions for pixel-level image adjustments.
 *
 * Every function takes an ImageData-like object ({data, width, height})
 * and returns a new one. No mutation.
 */

/**
 * Clone an ImageData-like object.
 * @param {{data: Uint8ClampedArray, width: number, height: number}} img
 * @returns {{data: Uint8ClampedArray, width: number, height: number}}
 */
function cloneImage(img) {
  return {
    data: new Uint8ClampedArray(img.data),
    width: img.width,
    height: img.height,
  };
}

/** Clamp value to 0-255 */
function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Adjust contrast. amount in [-1, 1]. 0 = no change.
 * Uses the standard (pixel - 128) * factor + 128 formula.
 */
export function adjustContrast(img, amount) {
  const out = cloneImage(img);
  const factor = 1 + amount * 2; // amount=0 → factor=1, amount=1 → factor=3
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp((d[i] - 128) * factor + 128);
    d[i + 1] = clamp((d[i + 1] - 128) * factor + 128);
    d[i + 2] = clamp((d[i + 2] - 128) * factor + 128);
    // alpha unchanged
  }
  return out;
}

/**
 * Adjust brightness. amount in [-1, 1]. 0 = no change.
 */
export function adjustBrightness(img, amount) {
  const out = cloneImage(img);
  const offset = amount * 255;
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] + offset);
    d[i + 1] = clamp(d[i + 1] + offset);
    d[i + 2] = clamp(d[i + 2] + offset);
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/math/image-processor.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/math/image-processor.js test/math/image-processor.test.js
git commit -m "feat(image-processor): add adjustContrast and adjustBrightness"
```

---

### Task 2: ImageProcessor — Highlights, shadows, gamma

**Files:**
- Modify: `src/math/image-processor.js`
- Modify: `test/math/image-processor.test.js`

- [ ] **Step 1: Write failing tests for adjustHighlights, adjustShadows, adjustGamma**

Append to `test/math/image-processor.test.js`:

```javascript
import {
  adjustContrast,
  adjustBrightness,
  adjustHighlights,
  adjustShadows,
  adjustGamma,
} from "../../src/math/image-processor.js";

// ... existing tests ...

describe("adjustHighlights", () => {
  it("returns unchanged image at amount=0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [220, 220, 220, 255],
    ]);
    const result = adjustHighlights(input, 0);
    expect(result.data).toEqual(input.data);
  });

  it("affects bright pixels more than dark pixels", () => {
    const input = makeImageData([
      [50, 50, 50, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [200, 200, 200, 255],
    ]);
    const result = adjustHighlights(input, 0.5);
    const darkDelta = Math.abs(result.data[0] - 50);
    const brightDelta = Math.abs(result.data[4] - 200);
    expect(brightDelta).toBeGreaterThan(darkDelta);
  });
});

describe("adjustShadows", () => {
  it("returns unchanged image at amount=0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [220, 220, 220, 255],
    ]);
    const result = adjustShadows(input, 0);
    expect(result.data).toEqual(input.data);
  });

  it("affects dark pixels more than bright pixels", () => {
    const input = makeImageData([
      [50, 50, 50, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [200, 200, 200, 255],
    ]);
    const result = adjustShadows(input, 0.5);
    const darkDelta = Math.abs(result.data[0] - 50);
    const brightDelta = Math.abs(result.data[4] - 200);
    expect(darkDelta).toBeGreaterThan(brightDelta);
  });
});

describe("adjustGamma", () => {
  it("returns unchanged image at gamma=1.0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = adjustGamma(input, 1.0);
    expect(result.data).toEqual(input.data);
  });

  it("brightens midtones when gamma < 1", () => {
    const input = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustGamma(input, 0.5);
    expect(result.data[0]).toBeGreaterThan(128);
  });

  it("darkens midtones when gamma > 1", () => {
    const input = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = adjustGamma(input, 2.0);
    expect(result.data[0]).toBeLessThan(128);
  });

  it("preserves pure black and pure white", () => {
    const input = makeImageData([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);
    const result = adjustGamma(input, 0.5);
    expect(result.data[0]).toBe(0);
    expect(result.data[4]).toBe(255);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run test/math/image-processor.test.js`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement adjustHighlights, adjustShadows, adjustGamma**

Add to `src/math/image-processor.js`:

```javascript
/**
 * Adjust highlights (bright areas). amount in [-1, 1]. 0 = no change.
 * Weight is based on luminance — brighter pixels are affected more.
 */
export function adjustHighlights(img, amount) {
  const out = cloneImage(img);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const weight = Math.max(0, (lum - 0.5) * 2); // 0 for darks, 1 for whites
    const offset = amount * 128 * weight;
    d[i] = clamp(d[i] + offset);
    d[i + 1] = clamp(d[i + 1] + offset);
    d[i + 2] = clamp(d[i + 2] + offset);
  }
  return out;
}

/**
 * Adjust shadows (dark areas). amount in [-1, 1]. 0 = no change.
 * Weight is based on luminance — darker pixels are affected more.
 */
export function adjustShadows(img, amount) {
  const out = cloneImage(img);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const weight = Math.max(0, 1 - lum * 2); // 1 for blacks, 0 for brights
    const offset = amount * 128 * weight;
    d[i] = clamp(d[i] + offset);
    d[i + 1] = clamp(d[i + 1] + offset);
    d[i + 2] = clamp(d[i + 2] + offset);
  }
  return out;
}

/**
 * Adjust gamma curve. gamma=1.0 is neutral.
 * gamma < 1 brightens midtones, gamma > 1 darkens midtones.
 */
export function adjustGamma(img, gamma) {
  const out = cloneImage(img);
  const d = out.data;
  const invGamma = 1 / gamma;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(Math.pow(d[i] / 255, invGamma) * 255);
    d[i + 1] = clamp(Math.pow(d[i + 1] / 255, invGamma) * 255);
    d[i + 2] = clamp(Math.pow(d[i + 2] / 255, invGamma) * 255);
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/math/image-processor.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/math/image-processor.js test/math/image-processor.test.js
git commit -m "feat(image-processor): add highlights, shadows, gamma adjustments"
```

---

### Task 3: ImageProcessor — Grain, desaturate, scalePixels

**Files:**
- Modify: `src/math/image-processor.js`
- Modify: `test/math/image-processor.test.js`

- [ ] **Step 1: Write failing tests for addGrain, desaturate, scalePixels**

Append to `test/math/image-processor.test.js`:

```javascript
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

// ... existing tests ...

describe("addGrain", () => {
  it("returns unchanged image at amount=0", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = addGrain(input, 0);
    expect(result.data).toEqual(input.data);
  });

  it("modifies pixel values when amount > 0", () => {
    const input = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const result = addGrain(input, 50);
    let anyDifferent = false;
    for (let i = 0; i < result.data.length; i += 4) {
      if (result.data[i] !== 128) anyDifferent = true;
    }
    expect(anyDifferent).toBe(true);
  });

  it("produces deterministic results with same seed", () => {
    const input = makeImageData([
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
      [128, 128, 128, 255],
    ]);
    const a = addGrain(input, 50, 42);
    const b = addGrain(input, 50, 42);
    expect(a.data).toEqual(b.data);
  });
});

describe("desaturate", () => {
  it("converts color to grayscale", () => {
    const input = makeImageData([
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 255, 255],
    ]);
    const result = desaturate(input);
    // Each pixel: R=G=B (grayscale)
    expect(result.data[0]).toBe(result.data[1]);
    expect(result.data[1]).toBe(result.data[2]);
    // White stays white
    expect(result.data[12]).toBe(255);
    expect(result.data[13]).toBe(255);
    expect(result.data[14]).toBe(255);
  });

  it("preserves alpha", () => {
    const input = makeImageData([
      [255, 0, 0, 128],
      [0, 255, 0, 64],
      [0, 0, 255, 0],
      [255, 255, 255, 255],
    ]);
    const result = desaturate(input);
    expect(result.data[3]).toBe(128);
    expect(result.data[7]).toBe(64);
    expect(result.data[11]).toBe(0);
  });
});

describe("scalePixels", () => {
  it("returns same dimensions at pixelSize=1", () => {
    const input = makeImageData([
      [100, 100, 100, 255],
      [200, 200, 200, 255],
      [50, 50, 50, 255],
      [150, 150, 150, 255],
    ]);
    const result = scalePixels(input, 1);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect(result.data).toEqual(input.data);
  });

  it("creates blocky pixels at pixelSize > 1", () => {
    // 4x4 image with pixelSize=2 should average 2x2 blocks
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = i; // varying R values
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
    const input = { data, width: 4, height: 4 };
    const result = scalePixels(input, 2);
    // Pixels within a 2x2 block should be identical
    expect(result.data[0]).toBe(result.data[4]); // (0,0) and (1,0) same block
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run test/math/image-processor.test.js`
Expected: FAIL

- [ ] **Step 3: Implement addGrain, desaturate, scalePixels**

Add to `src/math/image-processor.js`:

```javascript
/**
 * Add film grain noise. amount in [0, 255]. seed for deterministic output.
 */
export function addGrain(img, amount, seed = Date.now()) {
  if (amount === 0) return cloneImage(img);
  const out = cloneImage(img);
  const d = out.data;
  // Simple seeded PRNG (same as Dither.stipple)
  let state = seed;
  const rand = () => {
    state = (state * 16807 + 0) % 2147483647;
    return state / 2147483647;
  };
  for (let i = 0; i < d.length; i += 4) {
    const noise = (rand() - 0.5) * 2 * amount;
    d[i] = clamp(d[i] + noise);
    d[i + 1] = clamp(d[i + 1] + noise);
    d[i + 2] = clamp(d[i + 2] + noise);
  }
  return out;
}

/**
 * Convert to grayscale using luminance weights (ITU-R BT.601).
 */
export function desaturate(img) {
  const out = cloneImage(img);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = clamp(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
  return out;
}

/**
 * Downscale then upscale for pixelated look.
 * pixelSize=1 is a no-op. pixelSize=4 means each 4x4 block becomes one color.
 */
export function scalePixels(img, pixelSize) {
  if (pixelSize <= 1) return cloneImage(img);
  const { width, height } = img;
  const src = img.data;
  const out = cloneImage(img);
  const d = out.data;

  for (let by = 0; by < height; by += pixelSize) {
    for (let bx = 0; bx < width; bx += pixelSize) {
      // Average the block
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < pixelSize && by + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && bx + dx < width; dx++) {
          const idx = ((by + dy) * width + (bx + dx)) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          count++;
        }
      }
      r = clamp(r / count);
      g = clamp(g / count);
      b = clamp(b / count);
      // Fill the block with the average
      for (let dy = 0; dy < pixelSize && by + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && bx + dx < width; dx++) {
          const idx = ((by + dy) * width + (bx + dx)) * 4;
          d[idx] = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
        }
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/math/image-processor.test.js`
Expected: PASS

- [ ] **Step 5: Export ImageProcessor functions from math index**

Add to `src/math/index.js` after line 6:

```javascript
export {
  adjustContrast,
  adjustBrightness,
  adjustHighlights,
  adjustShadows,
  adjustGamma,
  addGrain,
  desaturate,
  scalePixels,
} from "./image-processor.js";
```

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/math/image-processor.js src/math/index.js test/math/image-processor.test.js
git commit -m "feat(image-processor): add grain, desaturate, scalePixels + export from math"
```

---

### Task 4: Dither — Generic error diffusion engine + kernel presets

**Files:**
- Modify: `src/math/dither.js`
- Create: `test/math/dither.test.js`

- [ ] **Step 1: Write failing tests for errorDiffusion and kernel presets**

Create `test/math/dither.test.js`:

```javascript
import { describe, it, expect } from "vitest";
import { Dither } from "../../src/math/dither.js";

// Helper: 4x4 gradient source (0 to 1)
function makeGradient(w, h) {
  const data = new Float32Array(w * h);
  for (let i = 0; i < data.length; i++) {
    data[i] = i / (data.length - 1);
  }
  return data;
}

describe("Dither.errorDiffusion", () => {
  it("exists as a static method", () => {
    expect(typeof Dither.errorDiffusion).toBe("function");
  });

  it("returns Uint8ClampedArray of correct size", () => {
    const source = makeGradient(4, 4);
    const result = Dither.errorDiffusion(source, 4, 4, Dither.FLOYD_STEINBERG);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(4 * 4 * 4);
  });

  it("produces only black and white pixels", () => {
    const source = makeGradient(8, 8);
    const result = Dither.errorDiffusion(source, 8, 8, Dither.FLOYD_STEINBERG);
    for (let i = 0; i < result.length; i += 4) {
      expect(result[i] === 0 || result[i] === 255).toBe(true);
      expect(result[i]).toBe(result[i + 1]); // R=G=B
      expect(result[i + 3]).toBe(255); // full alpha
    }
  });

  it("matches floydSteinberg for FLOYD_STEINBERG kernel", () => {
    const source = makeGradient(8, 8);
    const generic = Dither.errorDiffusion(source, 8, 8, Dither.FLOYD_STEINBERG);
    const legacy = Dither.floydSteinberg(source, 8, 8);
    expect(generic).toEqual(legacy);
  });
});

describe("Dither kernel presets", () => {
  const presets = [
    "FLOYD_STEINBERG",
    "STUCKI",
    "JARVIS",
    "ATKINSON",
    "SIERRA",
    "SIERRA_TWO_ROW",
    "SIERRA_LITE",
    "BURKES",
  ];

  for (const name of presets) {
    it(`${name} preset is defined with matrix, divisor, offsets`, () => {
      const kernel = Dither[name];
      expect(kernel).toBeDefined();
      expect(Array.isArray(kernel.offsets)).toBe(true);
      expect(Array.isArray(kernel.weights)).toBe(true);
      expect(typeof kernel.divisor).toBe("number");
      expect(kernel.offsets.length).toBe(kernel.weights.length);
    });
  }
});

describe("Dither convenience methods", () => {
  const methods = [
    "stucki",
    "atkinson",
    "jarvis",
    "sierra",
    "sierraTwoRow",
    "sierraLite",
    "burkes",
  ];

  for (const name of methods) {
    it(`${name}() returns valid RGBA output`, () => {
      const source = makeGradient(4, 4);
      const result = Dither[name](source, 4, 4);
      expect(result).toBeInstanceOf(Uint8ClampedArray);
      expect(result.length).toBe(4 * 4 * 4);
    });
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/math/dither.test.js`
Expected: FAIL — errorDiffusion not defined, presets not defined

- [ ] **Step 3: Implement errorDiffusion engine and all kernel presets**

Add to `src/math/dither.js` inside the `Dither` class (after `_getBlueNoise` method, before closing brace on line 357):

```javascript
  /**
   * Generic error diffusion dithering using any kernel.
   * @param {Float32Array} source - Grayscale values 0-1
   * @param {number} width
   * @param {number} height
   * @param {{offsets: number[][], weights: number[], divisor: number}} kernel
   * @returns {Uint8ClampedArray} RGBA pixel data
   */
  static errorDiffusion(source, width, height, kernel) {
    const err = new Float32Array(source);
    const out = new Uint8ClampedArray(width * height * 4);
    const { offsets, weights, divisor } = kernel;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const old = err[i];
        const newVal = old > 0.5 ? 1.0 : 0.0;
        const e = old - newVal;

        const pixel = newVal * 255;
        const idx = i * 4;
        out[idx] = pixel;
        out[idx + 1] = pixel;
        out[idx + 2] = pixel;
        out[idx + 3] = 255;

        for (let k = 0; k < offsets.length; k++) {
          const nx = x + offsets[k][0];
          const ny = y + offsets[k][1];
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            err[ny * width + nx] += (e * weights[k]) / divisor;
          }
        }
      }
    }
    return out;
  }
```

Add kernel presets after the class closing brace (after `Dither.CGA_PALETTE`):

```javascript
/** Floyd-Steinberg kernel */
Dither.FLOYD_STEINBERG = {
  offsets: [[1,0], [-1,1], [0,1], [1,1]],
  weights: [7, 3, 5, 1],
  divisor: 16,
};

/** Stucki kernel */
Dither.STUCKI = {
  offsets: [[1,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2]],
  weights: [8,4,2,4,8,4,2,1,2,4,2,1],
  divisor: 42,
};

/** Jarvis-Judice-Ninke kernel */
Dither.JARVIS = {
  offsets: [[1,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1],[-2,2],[-1,2],[0,2],[1,2],[2,2]],
  weights: [7,5,3,5,7,5,3,1,3,5,3,1],
  divisor: 48,
};

/** Atkinson kernel (only distributes 3/4 of error) */
Dither.ATKINSON = {
  offsets: [[1,0],[2,0],[-1,1],[0,1],[1,1],[0,2]],
  weights: [1,1,1,1,1,1],
  divisor: 8,
};

/** Sierra (full) kernel */
Dither.SIERRA = {
  offsets: [[1,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1],[-1,2],[0,2],[1,2]],
  weights: [5,3,2,4,5,4,2,2,3,2],
  divisor: 32,
};

/** Sierra two-row kernel */
Dither.SIERRA_TWO_ROW = {
  offsets: [[1,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1]],
  weights: [4,3,1,2,3,2,1],
  divisor: 16,
};

/** Sierra Lite kernel */
Dither.SIERRA_LITE = {
  offsets: [[1,0],[-1,1],[0,1]],
  weights: [2,1,1],
  divisor: 4,
};

/** Burkes kernel */
Dither.BURKES = {
  offsets: [[1,0],[2,0],[-2,1],[-1,1],[0,1],[1,1],[2,1]],
  weights: [8,4,2,4,8,4,2],
  divisor: 32,
};
```

Add convenience methods inside the `Dither` class (after `errorDiffusion`):

```javascript
  /** Stucki error diffusion. */
  static stucki(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.STUCKI);
  }

  /** Jarvis-Judice-Ninke error diffusion. */
  static jarvis(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.JARVIS);
  }

  /** Atkinson error diffusion (high contrast, only 3/4 error diffused). */
  static atkinson(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.ATKINSON);
  }

  /** Sierra (full) error diffusion. */
  static sierra(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.SIERRA);
  }

  /** Sierra two-row error diffusion. */
  static sierraTwoRow(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.SIERRA_TWO_ROW);
  }

  /** Sierra Lite error diffusion. */
  static sierraLite(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.SIERRA_LITE);
  }

  /** Burkes error diffusion. */
  static burkes(source, width, height) {
    return Dither.errorDiffusion(source, width, height, Dither.BURKES);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/math/dither.test.js`
Expected: PASS

- [ ] **Step 5: Verify existing floydSteinberg still works by running all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/math/dither.js test/math/dither.test.js
git commit -m "feat(dither): add generic error diffusion engine with 8 kernel presets"
```

---

### Task 5: UI Theme — Registry and switching

**Files:**
- Modify: `src/game/ui/theme.js`
- Modify: `src/game/ui/index.js`
- Create: `test/ui/theme.test.js`

- [ ] **Step 1: Write failing tests for theme registry**

Create `test/ui/theme.test.js`:

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import {
  UI_THEME,
  createTheme,
  setTheme,
  getTheme,
  registerTheme,
  THEMES,
} from "../../src/game/ui/theme.js";

describe("Theme registry", () => {
  beforeEach(() => {
    // Reset to default theme before each test
    setTheme("default");
  });

  it("THEMES contains default and monochrome", () => {
    expect(THEMES.default).toBeDefined();
    expect(THEMES.monochrome).toBeDefined();
  });

  it("getTheme returns current theme", () => {
    const theme = getTheme();
    expect(theme).toBe(UI_THEME);
    expect(theme.colors).toBeDefined();
  });

  it("setTheme with string switches to named theme", () => {
    setTheme("monochrome");
    expect(UI_THEME.colors.neonGreen).not.toBe("#0f0");
  });

  it("setTheme with object applies custom theme", () => {
    const custom = createTheme("#ff0000");
    setTheme(custom);
    expect(UI_THEME.colors.neonGreen).toContain("255");
  });

  it("setTheme mutates UI_THEME in place (same reference)", () => {
    const ref = UI_THEME;
    setTheme("monochrome");
    expect(ref).toBe(UI_THEME); // Same object reference
  });

  it("registerTheme adds a new named theme", () => {
    const custom = createTheme("#ff6600");
    registerTheme("orange", custom);
    expect(THEMES.orange).toBeDefined();
    setTheme("orange");
    expect(UI_THEME.colors.neonGreen).toContain("255");
  });

  it("monochrome theme has white/gray palette", () => {
    const mono = THEMES.monochrome;
    expect(mono.colors.neonGreen).toBe("#ffffff");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/ui/theme.test.js`
Expected: FAIL — setTheme, getTheme, registerTheme, THEMES not exported

- [ ] **Step 3: Implement theme registry in theme.js**

Add to `src/game/ui/theme.js` after the `createTheme` function (before `export default UI_THEME`):

```javascript
/**
 * Named theme registry. Ships with "default" and "monochrome".
 */
export const THEMES = {
  default: { ...structuredClone(UI_THEME) },
  monochrome: createTheme("#ffffff"),
};

// Override monochrome backgrounds to be slightly lighter for contrast
Object.assign(THEMES.monochrome.colors, {
  darkBg: "rgba(30, 30, 30, 0.85)",
  darkerBg: "rgba(20, 20, 20, 0.92)",
  darkText: "#000",
  hoverBg: "#ffffff",
});

/**
 * Get the current active theme (same reference as UI_THEME).
 * @returns {Object}
 */
export function getTheme() {
  return UI_THEME;
}

/**
 * Switch the active theme. Mutates UI_THEME in place so existing references stay valid.
 * @param {string|Object} nameOrConfig - A registered theme name or a full theme object
 */
export function setTheme(nameOrConfig) {
  const source =
    typeof nameOrConfig === "string" ? THEMES[nameOrConfig] : nameOrConfig;
  if (!source) {
    console.warn(`Theme "${nameOrConfig}" not found`);
    return;
  }
  // Deep-copy source into UI_THEME (preserving the reference)
  _deepAssign(UI_THEME, source);
}

/**
 * Register a custom theme under a name.
 * @param {string} name
 * @param {Object} themeConfig - Full theme object (e.g. from createTheme)
 */
export function registerTheme(name, themeConfig) {
  THEMES[name] = themeConfig;
}

/** Deep assign source into target, recursing into plain objects. */
function _deepAssign(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      _deepAssign(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
```

- [ ] **Step 4: Update UI index exports**

Modify `src/game/ui/index.js` line 10 to export new functions:

```javascript
export { UI_THEME, createTheme, THEMES, setTheme, getTheme, registerTheme } from "./theme.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/ui/theme.test.js`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/game/ui/theme.js src/game/ui/index.js test/ui/theme.test.js
git commit -m "feat(theme): add theme registry with setTheme, getTheme, registerTheme + monochrome theme"
```

---

### Task 6: Dither Editor Demo — HTML + Game scaffold

**Files:**
- Create: `demos/dither-editor.html`
- Create: `demos/js/dither-editor.js`
- Modify: `demos/index.html:305`

- [ ] **Step 1: Create HTML entry point**

Create `demos/dither-editor.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dither Editor</title>
  <link rel="stylesheet" href="demos.css" />
  <script src="./js/info-toggle.js"></script>
  <meta name="description" content="Dither Editor - Load images, apply adjustments and dithering algorithms. Built with GCanvas." />
</head>
<body>
  <div id="info">
    <strong>Dither Editor</strong> — Load an image, apply adjustments and dithering algorithms in real-time.<br/>
    <span style="color:#CCC">
      <li>Drag & drop or click Load Image to open a file</li>
      <li>Adjust contrast, highlights, shadows, gamma, grain</li>
      <li>Choose from 11 dithering algorithms</li>
      <li>Mouse wheel to zoom, drag to pan</li>
      <li>Compare toggle to see original vs processed</li>
      <li>Export result as PNG</li>
    </span>
  </div>
  <canvas id="game"></canvas>
  <script type="module">
    import { DitherEditor } from "./js/dither-editor.js";
    window.addEventListener("load", () => {
      const canvas = document.getElementById("game");
      const game = new DitherEditor(canvas);
      game.start();
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Create Game scaffold with CONFIG and basic class**

Create `demos/js/dither-editor.js`:

```javascript
/**
 * Dither Editor Demo
 *
 * Image loading, real-time adjustments, comprehensive dithering algorithms,
 * zoom/pan, compare toggle, and PNG export.
 */
import {
  Game,
  Painter,
  Screen,
  Gesture,
  Dither,
  AccordionGroup,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  setTheme,
  adjustContrast,
  adjustBrightness,
  adjustHighlights,
  adjustShadows,
  adjustGamma,
  addGrain,
  desaturate,
  scalePixels,
} from "../../src/index.js";

const CONFIG = {
  panel: {
    width: 280,
    padding: 14,
    spacing: 10,
    marginRight: 16,
    marginTop: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    headerHeight: 28,
  },
  zoom: {
    min: 0.1,
    max: 10,
    speed: 0.3,
    easing: 0.15,
  },
  defaults: {
    contrast: 0,
    highlights: 0,
    shadows: 0,
    gamma: 1.0,
    grain: 0,
    algorithm: "floyd-steinberg",
    pixelSize: 1,
  },
  algorithms: [
    { label: "None", value: "none" },
    { label: "Floyd-Steinberg", value: "floyd-steinberg" },
    { label: "Bayer 8x8", value: "bayer" },
    { label: "Blue Noise", value: "blue-noise" },
    { label: "Stucki", value: "stucki" },
    { label: "Atkinson", value: "atkinson" },
    { label: "Jarvis", value: "jarvis" },
    { label: "Sierra", value: "sierra" },
    { label: "Sierra Two-Row", value: "sierra-two-row" },
    { label: "Sierra Lite", value: "sierra-lite" },
    { label: "Burkes", value: "burkes" },
    { label: "Stipple", value: "stipple" },
  ],
  debounceMs: 50,
};

export class DitherEditor extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#1a1a1a";
    this.enableFluidSize();
    setTheme("monochrome");
  }

  init() {
    super.init();
    Screen.init(this);

    // State
    this._sourceImage = null; // Original ImageData
    this._processedImage = null; // After adjustments + dither
    this._comparing = false;
    this._zoom = 1;
    this._targetZoom = 1;
    this._panX = 0;
    this._panY = 0;
    this._settings = { ...CONFIG.defaults };
    this._controls = {};
    this._debounceTimer = null;
    this._dirty = true;

    this._setupGesture();
    this._setupDragDrop();
    this._buildUI();
    this._generateDefaultImage();
  }

  _setupGesture() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta, mx, my) => {
        this._targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this._targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this._targetZoom));
      },
      onPan: (dx, dy) => {
        this._panX += dx;
        this._panY += dy;
      },
    });
  }

  _setupDragDrop() {
    this.canvas.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    this.canvas.addEventListener("drop", (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        this._loadFile(file);
      }
    });
  }

  _loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Draw to offscreen canvas to get ImageData
        const oc = document.createElement("canvas");
        oc.width = img.width;
        oc.height = img.height;
        const octx = oc.getContext("2d");
        octx.drawImage(img, 0, 0);
        this._sourceImage = octx.getImageData(0, 0, img.width, img.height);
        // Reset zoom/pan
        this._zoom = 1;
        this._targetZoom = 1;
        this._panX = 0;
        this._panY = 0;
        this._dirty = true;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  _openFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      if (input.files[0]) this._loadFile(input.files[0]);
    };
    input.click();
  }

  _generateDefaultImage() {
    const sz = 256;
    const source = Dither.generateSource(sz, sz, 0);
    // Convert Float32Array to ImageData
    const data = new Uint8ClampedArray(sz * sz * 4);
    for (let i = 0; i < source.length; i++) {
      const v = Math.round(source[i] * 255);
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    this._sourceImage = { data, width: sz, height: sz };
    this._dirty = true;
  }

  _buildUI() {
    const panelWidth = Screen.responsive(220, 250, CONFIG.panel.width);
    const padding = Screen.responsive(10, 12, CONFIG.panel.padding);

    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing: CONFIG.panel.spacing,
      headerHeight: CONFIG.panel.headerHeight,
    });

    // --- Image section ---
    const imageSection = this.panel.addSection("Image", { expanded: true });
    this._controls.loadBtn = new Button(this, {
      text: "Load Image",
      width: panelWidth - padding * 2,
      height: 36,
      onClick: () => this._openFilePicker(),
    });
    imageSection.addItem(this._controls.loadBtn);
    this.panel.commitSection(imageSection);

    // --- Adjustments section ---
    const adjSection = this.panel.addSection("Adjustments", { expanded: true });

    this._controls.contrast = new Slider(this, {
      label: "Contrast",
      min: -100, max: 100, value: 0, step: 1,
      width: panelWidth - padding * 2,
      onChange: (v) => { this._settings.contrast = v / 100; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.contrast);

    this._controls.highlights = new Slider(this, {
      label: "Highlights",
      min: -100, max: 100, value: 0, step: 1,
      width: panelWidth - padding * 2,
      onChange: (v) => { this._settings.highlights = v / 100; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.highlights);

    this._controls.shadows = new Slider(this, {
      label: "Shadows",
      min: -100, max: 100, value: 0, step: 1,
      width: panelWidth - padding * 2,
      onChange: (v) => { this._settings.shadows = v / 100; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.shadows);

    this._controls.gamma = new Slider(this, {
      label: "Gamma",
      min: 0.1, max: 3.0, value: 1.0, step: 0.05,
      width: panelWidth - padding * 2,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => { this._settings.gamma = v; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.gamma);

    this._controls.grain = new Slider(this, {
      label: "Grain",
      min: 0, max: 100, value: 0, step: 1,
      width: panelWidth - padding * 2,
      onChange: (v) => { this._settings.grain = v; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.grain);

    this.panel.commitSection(adjSection);

    // --- Dither section ---
    const ditherSection = this.panel.addSection("Dither", { expanded: true });

    this._controls.algorithm = new Dropdown(this, {
      label: "Algorithm",
      options: CONFIG.algorithms.map((a) => a.label),
      value: "Floyd-Steinberg",
      width: panelWidth - padding * 2,
      onChange: (v) => {
        const alg = CONFIG.algorithms.find((a) => a.label === v);
        this._settings.algorithm = alg ? alg.value : "none";
        this._scheduleProcess();
      },
    });
    ditherSection.addItem(this._controls.algorithm);

    this._controls.pixelSize = new Slider(this, {
      label: "Pixel Size",
      min: 1, max: 16, value: 1, step: 1,
      width: panelWidth - padding * 2,
      onChange: (v) => { this._settings.pixelSize = v; this._scheduleProcess(); },
    });
    ditherSection.addItem(this._controls.pixelSize);

    this.panel.commitSection(ditherSection);

    // --- Output section ---
    const outputSection = this.panel.addSection("Output", { expanded: true });

    this._controls.compare = new ToggleButton(this, {
      text: "Compare",
      width: panelWidth - padding * 2,
      height: 36,
      onToggle: (toggled) => {
        this._comparing = toggled;
      },
    });
    outputSection.addItem(this._controls.compare);

    this._controls.export = new Button(this, {
      text: "Export PNG",
      width: panelWidth - padding * 2,
      height: 36,
      onClick: () => this._exportPNG(),
    });
    outputSection.addItem(this._controls.export);

    this._controls.reset = new Button(this, {
      text: "Reset",
      width: panelWidth - padding * 2,
      height: 36,
      onClick: () => this._resetControls(),
    });
    outputSection.addItem(this._controls.reset);

    this.panel.commitSection(outputSection);
    this.panel.layoutAll();
    this.pipeline.add(this.panel);

    this._positionPanel();
  }

  _positionPanel() {
    const m = CONFIG.panel;
    this.panel.x = this.width - this.panel.width - m.marginRight;
    this.panel.y = m.marginTop;
  }

  _scheduleProcess() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._dirty = true;
    }, CONFIG.debounceMs);
  }

  _processImage() {
    if (!this._sourceImage) return;
    const s = this._settings;

    let img = this._sourceImage;

    // Adjustments pipeline
    if (s.contrast !== 0) img = adjustContrast(img, s.contrast);
    if (s.highlights !== 0) img = adjustHighlights(img, s.highlights);
    if (s.shadows !== 0) img = adjustShadows(img, s.shadows);
    if (s.gamma !== 1.0) img = adjustGamma(img, s.gamma);
    if (s.grain > 0) img = addGrain(img, s.grain);
    if (s.pixelSize > 1) img = scalePixels(img, s.pixelSize);

    // Dithering
    if (s.algorithm !== "none") {
      img = this._applyDither(img, s.algorithm);
    }

    this._processedImage = img;
    this._dirty = false;
  }

  _applyDither(img, algorithm) {
    const { width, height } = img;
    // Convert ImageData RGBA to Float32Array grayscale (0-1)
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = (img.data[idx] * 0.299 + img.data[idx + 1] * 0.587 + img.data[idx + 2] * 0.114) / 255;
    }

    let rgba;
    switch (algorithm) {
      case "floyd-steinberg":
        rgba = Dither.floydSteinberg(gray, width, height);
        break;
      case "bayer":
        rgba = Dither.bayer(gray, width, height);
        break;
      case "blue-noise":
        rgba = Dither.blueNoise(gray, width, height);
        break;
      case "stucki":
        rgba = Dither.stucki(gray, width, height);
        break;
      case "atkinson":
        rgba = Dither.atkinson(gray, width, height);
        break;
      case "jarvis":
        rgba = Dither.jarvis(gray, width, height);
        break;
      case "sierra":
        rgba = Dither.sierra(gray, width, height);
        break;
      case "sierra-two-row":
        rgba = Dither.sierraTwoRow(gray, width, height);
        break;
      case "sierra-lite":
        rgba = Dither.sierraLite(gray, width, height);
        break;
      case "burkes":
        rgba = Dither.burkes(gray, width, height);
        break;
      case "stipple":
        rgba = Dither.stipple(gray, width, height);
        break;
      default:
        return img;
    }

    return { data: rgba, width, height };
  }

  _exportPNG() {
    const img = this._processedImage || this._sourceImage;
    if (!img) return;
    const oc = document.createElement("canvas");
    oc.width = img.width;
    oc.height = img.height;
    const octx = oc.getContext("2d");
    const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
    octx.putImageData(imageData, 0, 0);
    oc.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dither-export.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  _resetControls() {
    this._settings = { ...CONFIG.defaults };
    this._controls.contrast.value = 0;
    this._controls.highlights.value = 0;
    this._controls.shadows.value = 0;
    this._controls.gamma.value = 1.0;
    this._controls.grain.value = 0;
    this._controls.pixelSize.value = 1;
    this._controls.algorithm.value = "Floyd-Steinberg";
    if (this._controls.compare.toggled) {
      this._controls.compare.toggle(false);
    }
    this._dirty = true;
  }

  update(dt) {
    super.update(dt);
    // Smooth zoom
    this._zoom += (this._targetZoom - this._zoom) * CONFIG.zoom.easing;

    if (this._dirty) {
      this._processImage();
    }
  }

  render() {
    super.render();

    const img = this._comparing ? this._sourceImage : this._processedImage;
    if (!img) return;

    // Draw image centered with zoom/pan
    const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);

    // Create or reuse offscreen canvas for the image
    if (!this._imgCanvas || this._imgCanvas.width !== img.width || this._imgCanvas.height !== img.height) {
      this._imgCanvas = document.createElement("canvas");
      this._imgCanvas.width = img.width;
      this._imgCanvas.height = img.height;
    }
    this._imgCanvas.getContext("2d").putImageData(imageData, 0, 0);

    const ctx = Painter.ctx;
    const cx = this.width / 2 + this._panX;
    const cy = this.height / 2 + this._panY;
    const dw = img.width * this._zoom;
    const dh = img.height * this._zoom;

    Painter.save();
    // Pixelated rendering
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._imgCanvas, cx - dw / 2, cy - dh / 2, dw, dh);
    Painter.restore();
  }

  onResize() {
    super.onResize();
    this._positionPanel();
  }
}
```

- [ ] **Step 3: Add navigation link in demos/index.html**

In `demos/index.html`, after line 305 (the Fractals link), add:

```html
                    <a href="dither-editor.html" class="helix-link" style="--i:2">Dither Editor</a>
```

- [ ] **Step 4: Run the dev server and test manually**

Run: `npm run dev`
Open: `http://localhost:5173/demos/dither-editor.html`
Verify:
- Canvas loads with default gradient image
- Panel appears on the right with 4 sections
- Sliders respond and trigger reprocessing
- Algorithm dropdown works
- Drag & drop loads an image
- Load Image button opens file picker
- Compare toggle swaps original/processed
- Export PNG downloads a file
- Mouse wheel zooms, drag pans
- Reset button returns all controls to defaults

- [ ] **Step 5: Commit**

```bash
git add demos/dither-editor.html demos/js/dither-editor.js demos/index.html
git commit -m "feat(demo): add Dither Editor with image loading, adjustments, and dithering"
```

---

### Task 7: Final integration test and cleanup

**Files:**
- All test files
- `demos/js/dither-editor.js` (if fixes needed)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Build the library**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Verify the built bundle exports new functions**

Run a quick check:

```bash
node -e "import('./dist/gcanvas.es.min.js').then(m => { console.log('adjustContrast:', typeof m.adjustContrast); console.log('setTheme:', typeof m.setTheme); console.log('Dither.stucki:', typeof m.Dither.stucki); })"
```

Expected: All three print `function`

- [ ] **Step 4: Commit any fixes**

If any fixes were needed:
```bash
git add -u
git commit -m "fix: address integration issues in dither editor"
```

/**
 * image-processor.js
 *
 * Pure image adjustment functions that operate on ImageData-like objects:
 *   { data: Uint8ClampedArray, width: number, height: number }
 *
 * All functions are non-mutating — they return a new image object.
 */

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Clamp a numeric value to the [0, 255] byte range.
 * @param {number} v
 * @returns {number}
 */
function clamp(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Return a deep copy of an ImageData-like object (new typed array, same dims).
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
function cloneImage(img) {
  return {
    data: new Uint8ClampedArray(img.data),
    width: img.width,
    height: img.height,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Adjust the contrast of an image.
 *
 * Formula applied per RGB channel (alpha is preserved unchanged):
 *   output = (pixel - 128) * factor + 128
 *   factor = 1 + amount * 2
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} amount  Contrast delta in [-1, 1].
 *   0  → no change
 *   1  → maximum increase
 *  -1  → maximum decrease (all pixels collapse toward 128)
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function adjustContrast(img, amount) {
  const out = cloneImage(img);
  const factor = 1 + amount * 2;
  const d = out.data;

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp((d[i]     - 128) * factor + 128); // R
    d[i + 1] = clamp((d[i + 1] - 128) * factor + 128); // G
    d[i + 2] = clamp((d[i + 2] - 128) * factor + 128); // B
    // d[i + 3] — alpha: leave untouched
  }

  return out;
}

/**
 * Adjust the brightness of an image.
 *
 * Formula applied per RGB channel (alpha is preserved unchanged):
 *   output = pixel + amount * 255
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} amount  Brightness delta in [-1, 1].
 *   0  → no change
 *   1  → maximum brighten (adds 255 to every channel)
 *  -1  → maximum darken  (subtracts 255 from every channel)
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function adjustBrightness(img, amount) {
  const out = cloneImage(img);
  const offset = amount * 255;
  const d = out.data;

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i]     + offset); // R
    d[i + 1] = clamp(d[i + 1] + offset); // G
    d[i + 2] = clamp(d[i + 2] + offset); // B
    // d[i + 3] — alpha: leave untouched
  }

  return out;
}

/**
 * Adjust highlights of an image — targets bright pixels more than dark ones.
 *
 * The per-pixel weight is derived from luminance:
 *   weight = max(0, (lum - 0.5) * 2)   → 0 for darks, 1 for whites
 *   output = pixel + amount * 128 * weight
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} amount  Adjustment in [-1, 1].
 *   0  → no change
 *   1  → maximum highlight boost
 *  -1  → maximum highlight reduction
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function adjustHighlights(img, amount) {
  const out = cloneImage(img);
  const d = out.data;

  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const weight = Math.max(0, (lum - 0.5) * 2); // 0 for darks, 1 for whites
    const offset = amount * 128 * weight;
    d[i]     = clamp(d[i]     + offset); // R
    d[i + 1] = clamp(d[i + 1] + offset); // G
    d[i + 2] = clamp(d[i + 2] + offset); // B
    // d[i + 3] — alpha: leave untouched
  }

  return out;
}

/**
 * Adjust shadows of an image — targets dark pixels more than bright ones.
 *
 * The per-pixel weight is derived from luminance:
 *   weight = max(0, 1 - lum * 2)   → 1 for blacks, 0 for brights
 *   output = pixel + amount * 128 * weight
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} amount  Adjustment in [-1, 1].
 *   0  → no change
 *   1  → maximum shadow lift
 *  -1  → maximum shadow crush
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function adjustShadows(img, amount) {
  const out = cloneImage(img);
  const d = out.data;

  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const weight = Math.max(0, 1 - lum * 2); // 1 for blacks, 0 for brights
    const offset = amount * 128 * weight;
    d[i]     = clamp(d[i]     + offset); // R
    d[i + 1] = clamp(d[i + 1] + offset); // G
    d[i + 2] = clamp(d[i + 2] + offset); // B
    // d[i + 3] — alpha: leave untouched
  }

  return out;
}

/**
 * Apply gamma correction to an image.
 *
 * Formula applied per RGB channel (alpha is preserved unchanged):
 *   output = (pixel / 255) ^ (1 / gamma) * 255
 *
 * gamma = 1.0  → no change
 * gamma < 1.0  → darkens midtones  (invGamma > 1, power curve pulls down)
 * gamma > 1.0  → brightens midtones (invGamma < 1, power curve lifts up)
 *
 * Pure black (0) and pure white (255) are always preserved.
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} gamma  Positive gamma value. 1.0 is neutral.
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function adjustGamma(img, gamma) {
  const out = cloneImage(img);
  const d = out.data;
  const invGamma = 1 / gamma;

  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(Math.pow(d[i]     / 255, invGamma) * 255); // R
    d[i + 1] = clamp(Math.pow(d[i + 1] / 255, invGamma) * 255); // G
    d[i + 2] = clamp(Math.pow(d[i + 2] / 255, invGamma) * 255); // B
    // d[i + 3] — alpha: leave untouched
  }

  return out;
}

/**
 * Add film-grain noise to an image.
 *
 * A deterministic LCG PRNG (seeded by `seed`) generates per-pixel noise in
 * the range [−amount, +amount] which is added equally to R, G, and B.
 * Alpha is preserved unchanged.
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} amount  Noise intensity in [0, 255]. 0 → no change.
 * @param {number} [seed]  RNG seed for determinism. Defaults to Date.now().
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function addGrain(img, amount, seed = Date.now()) {
  if (amount === 0) return cloneImage(img);
  const out = cloneImage(img);
  const d = out.data;
  let state = seed;
  const rand = () => {
    state = (state * 16807 + 0) % 2147483647;
    return state / 2147483647;
  };
  for (let i = 0; i < d.length; i += 4) {
    const noise = (rand() - 0.5) * 2 * amount;
    d[i]     = clamp(d[i]     + noise); // R
    d[i + 1] = clamp(d[i + 1] + noise); // G
    d[i + 2] = clamp(d[i + 2] + noise); // B
    // d[i + 3] — alpha: leave untouched
  }
  return out;
}

/**
 * Convert an image to grayscale using ITU-R BT.601 luminance coefficients.
 *
 * Formula per pixel:
 *   gray = R * 0.299 + G * 0.587 + B * 0.114
 *   R = G = B = gray
 *
 * Alpha is preserved unchanged.
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function desaturate(img) {
  const out = cloneImage(img);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = clamp(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    d[i]     = gray; // R
    d[i + 1] = gray; // G
    d[i + 2] = gray; // B
    // d[i + 3] — alpha: leave untouched
  }
  return out;
}

/**
 * Apply a pixelate effect by averaging pixel blocks.
 *
 * Each `pixelSize × pixelSize` block is replaced with the average colour of
 * all pixels in that block, producing a blocky, low-resolution appearance.
 * Alpha values are preserved unchanged (not averaged).
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} img
 * @param {number} pixelSize  Block size in pixels. ≤ 1 → no change.
 * @returns {{ data: Uint8ClampedArray, width: number, height: number }}
 */
export function scalePixels(img, pixelSize) {
  if (pixelSize <= 1) return cloneImage(img);
  const { width, height } = img;
  const src = img.data;
  const out = cloneImage(img);
  const d = out.data;
  for (let by = 0; by < height; by += pixelSize) {
    for (let bx = 0; bx < width; bx += pixelSize) {
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
      for (let dy = 0; dy < pixelSize && by + dy < height; dy++) {
        for (let dx = 0; dx < pixelSize && bx + dx < width; dx++) {
          const idx = ((by + dy) * width + (bx + dx)) * 4;
          d[idx]     = r;
          d[idx + 1] = g;
          d[idx + 2] = b;
          // d[idx + 3] — alpha: leave untouched (already copied by cloneImage)
        }
      }
    }
  }
  return out;
}

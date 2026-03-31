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

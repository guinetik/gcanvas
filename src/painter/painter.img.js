// ---------------------------------------------------------------------------
// src/painter-images.js
// Centralised helpers for Image, ImageData and bitmap work.
// ---------------------------------------------------------------------------
import { Painter } from "./painter";

/**
 * Painter.img – all Canvas 2D image utilities in one names‑space.
 * Relies on a live Painter.ctx that points at the active canvas context.
 */
export class PainterImages {
  /* ─────────────────────────────── DRAWING ────────────────────────────── */

  /**
   * Draw an image or canvas onto the current context.
   * @param {CanvasImageSource} source  <img>, <canvas>, <video>, etc.
   * @param {number}   x, y             Destination position (after transforms)
   * @param {object}  [opts]            Declarative options
   *   @prop {number}   width,height    Destination size (defaults → intrinsic)
   *   @prop {object}   crop            { sx, sy, sw, sh } source rectangle
   *   @prop {string}   anchor          top‑left | center | bottom‑right …
   *   @prop {number}   rotation        Radians, about anchor point
   *   @prop {number}   scaleX,scaleY   Independent or uniform scaling
   *   @prop {boolean}  flipX,flipY     Mirror horizontally / vertically
   *   @prop {number}   alpha           Multiplicative opacity (1 = opaque)
   *   @prop {boolean}  smoothing       ImageSmoothingEnabled toggle
   */
  static draw(
    source,
    x = 0,
    y = 0,
    {
      width,
      height,
      crop = null,
      anchor = "top‑left",
      rotation = 0,
      scaleX = 1,
      scaleY = 1,
      flipX = false,
      flipY = false,
      alpha = 1,
      smoothing = true,
    } = {}
  ) {
    const ctx = Painter.ctx;
    if (!ctx || !source) return;

    const iw = width ?? (crop ? crop.sw : source.width ?? source.videoWidth);
    const ih = height ?? (crop ? crop.sh : source.height ?? source.videoHeight);

    const ax = { left: 0, center: 0.5, right: 1 }[anchor.split("-").pop()] ?? 0;
    const ay = { top: 0, center: 0.5, bottom: 1 }[anchor.split("-")[0]] ?? 0;
    const ox = -iw * ax;
    const oy = -ih * ay;

    ctx.save();
    ctx.imageSmoothingEnabled = smoothing;
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    if (flipX || flipY) ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.scale(scaleX, scaleY);

    if (crop) {
      const { sx, sy, sw, sh } = crop;
      ctx.drawImage(source, sx, sy, sw, sh, ox, oy, iw, ih);
    } else {
      ctx.drawImage(source, ox, oy, iw, ih);
    }
    ctx.restore();
  }

  /** Quick alias for draw that only needs `{width,height}` overrides. */
  static blit(source, x, y, w, h) {
    this.draw(source, x, y, { width: w, height: h });
  }

  /* ───────────────────────────── PATTERNS ─────────────────────────────── */

  /** `ctx.createPattern` shortcut. */
  static createPattern(image, repetition = "repeat") {
    return Painter.ctx.createPattern(image, repetition);
  }

  /**
   * Fill a rectangle with a pattern in one line.
   */
  static fillPattern(image, x, y, width, height) {
    const ctx = Painter.ctx;
    ctx.save();
    ctx.fillStyle = image;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  /* ─────────────────────────── IMAGE DATA API ─────────────────────────── */

  static createImageData(width, height) {
    return Painter.ctx.createImageData(width, height);
  }

  static cloneImageData(imageData) {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  static getImageData(x, y, width, height) {
    return Painter.ctx.getImageData(x, y, width, height);
  }

  static putImageData(
    imageData,
    x,
    y,
    dirtyX = 0,
    dirtyY = 0,
    dirtyWidth = imageData.width,
    dirtyHeight = imageData.height
  ) {
    Painter.ctx.putImageData(
      imageData,
      x,
      y,
      dirtyX,
      dirtyY,
      dirtyWidth,
      dirtyHeight
    );
  }

  /**
   * Map‑style pixel transform: pass a callback that returns [r,g,b,a].
   * Very handy for simple filters without manual loop boilerplate.
   */
  static mapPixels(imageData, fn) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const idx = i >> 2;
      const res = fn(d[i], d[i + 1], d[i + 2], d[i + 3], idx);
      if (res) [d[i], d[i + 1], d[i + 2], d[i + 3]] = res;
    }
    return imageData;
  }

  /** Set one pixel in an ImageData object. */
  static setPixel(imageData, x, y, r, g, b, a = 255) {
    const i = (y * imageData.width + x) * 4;
    const d = imageData.data;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = a;
  }

  /* ───────────────────────────── BITMAP HELPERS ───────────────────────── */

  /** Convert the **current canvas** to an ImageBitmap (cheap GPU upload). */
  static async toBitmap({ type = "image/png", quality = 0.92 } = {}) {
    const canvas = Painter.ctx.canvas;
    const blob = await canvas.convertToBlob({ type, quality });
    return createImageBitmap(blob);
  }

  /** Create an ImageBitmap from any CanvasImageSource. */
  static async createBitmap(image) {
    return createImageBitmap(image);
  }

  /* ───────────── ImageData ← raw pixels convenience ───────────── */

  /**
   * Converts a flat RGBA array into an ImageData object.
   * @param {Uint8ClampedArray} rgbaArray
   * @param {number} width
   * @param {number} height
   * @returns {ImageData}
   */
  static toImageData(rgbaArray, width, height) {
    if (rgbaArray.length !== width * height * 4) {
      throw new Error("Invalid RGBA array size for given dimensions");
    }
    return new ImageData(rgbaArray, width, height);
  }

  /**
   * Asynchronously creates an ImageBitmap from raw RGBA data.
   * Can be used directly with createPattern or drawImage.
   * @param {Uint8ClampedArray} rgbaArray
   * @param {number} width
   * @param {number} height
   * @returns {Promise<ImageBitmap>}
   */
  static async createImageBitmapFromPixels(rgbaArray, width, height) {
    const imgData = this.toImageData(rgbaArray, width, height);
    return await createImageBitmap(imgData);
  }

  /**
   * Creates a pattern from ImageData via a temporary canvas.
   * @param {ImageData} imageData
   * @param {"repeat"|"repeat-x"|"repeat-y"|"no-repeat"} repeat
   * @returns {CanvasPattern}
   */
  static createPatternFromImageData(imageData, repeat = "repeat") {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);
    return ctx.createPattern(canvas, repeat);
  }

  /**
   * Shortcut to go directly from pixel array to CanvasPattern
   * @param {Uint8ClampedArray} rgbaArray
   * @param {number} width
   * @param {number} height
   * @param {string} repeat
   * @returns {CanvasPattern}
   */
  static createPatternFromPixels(rgbaArray, width, height, repeat = "repeat") {
    const imgData = this.toImageData(rgbaArray, width, height);
    return this.createPatternFromImageData(imgData, repeat);
  }
}

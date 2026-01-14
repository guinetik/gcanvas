import { Shape } from "./shape.js";
import { Painter } from "../painter";

/**
 * Draws an arbitrary pixel buffer inside the normal Shape pipeline.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * Usage:
 * const data   = Painter.img.getImageData(0, 0, 320, 200);     // any ImageData
 * const fract  = new ImageShape(data, { x: 100, y: 50, anchor: "center" });
 * scene.add(fract);                                           // acts like any Shape
 */
export class ImageShape extends Shape {
  /**
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Video|ImageData} bitmap  Anything the 2‑D API understands
   * @param {object} [options]                    Usual Shape options + anchor, etc.
   */
  constructor(bitmap, options = {}) {
    if (!bitmap && !options.width && !options.height) {
      throw new Error(
        "ImageShape must be initialized with either a bitmap or width and height"
      );
    }
    super(options);
    
    // Store the bitmap passed in
    this._bitmap = bitmap ?? Painter.img.createImageData(options.width, options.height);
    
    // Set dimensions based on bitmap or options
    this._width = options.width ?? bitmap?.width ?? 0;
    this._height = options.height ?? bitmap?.height ?? 0;
    
    // Set anchor point (default to center)
    this.anchor = options.anchor ?? "center";
    
    // Track anchor x/y offsets (0-1 range)
    this._anchorX = 0.5;
    this._anchorY = 0.5;
    this._updateAnchorOffsets();
    
    // Enable image smoothing by default
    this.smoothing = options.smoothing !== false;
    
    // ImageData can't be transformed directly; cache an off‑screen canvas
    if (bitmap instanceof ImageData) {
      this.buffer(bitmap);
    }
  }

  /**
   * Calculate anchor point offsets based on anchor string
   * @private
   */
  _updateAnchorOffsets() {
    // Parse anchor string to get x/y offsets
    const anchor = this.anchor?.toLowerCase() ?? "center";
    
    // X offset: left=0, center=0.5, right=1
    if (anchor.includes("left")) this._anchorX = 0;
    else if (anchor.includes("right")) this._anchorX = 1;
    else this._anchorX = 0.5;
    
    // Y offset: top=0, center=0.5, bottom=1
    if (anchor.includes("top")) this._anchorY = 0;
    else if (anchor.includes("bottom")) this._anchorY = 1;
    else this._anchorY = 0.5;
  }

  /**
   * Access the internal bitmap
   * @returns {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Video|ImageData} Current bitmap
   */
  get bitmap() {
    return this._bitmap;
  }

  /**
   * Change the internal bitmap
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Video|ImageData} bmp New bitmap
   */
  set bitmap(bmp) {
    //console.log("setting bitmap", bmp);
    if (!bmp) return;
    
    this._bitmap = bmp;
    
    // Update width and height if not already set
    if (!this._width && bmp.width) this._width = bmp.width;
    if (!this._height && bmp.height) this._height = bmp.height;
    
    // If it's ImageData, prepare the buffer
    if (bmp instanceof ImageData) {
      this.buffer(bmp);
    }
  }

  /**
   * Create or update the canvas buffer for ImageData
   * @param {ImageData} bitmap ImageData to put in the buffer
   */
  buffer(bitmap) {
    if (!bitmap) return;
    
    //console.log("Creating buffer for ImageData", bitmap.width, "x", bitmap.height);
    
    // Create the buffer canvas if needed
    if (!this._buffer) {
      this._buffer = document.createElement("canvas");
      //console.log("Created new buffer canvas");
    }
    
    // Resize buffer if needed
    if (this._buffer.width !== bitmap.width || this._buffer.height !== bitmap.height) {
      this._buffer.width = bitmap.width;
      this._buffer.height = bitmap.height;
      //console.log("Resized buffer to", bitmap.width, "x", bitmap.height);
    }
    
    // Draw the ImageData to the buffer canvas
    const ctx = this._buffer.getContext("2d");
    ctx.putImageData(bitmap, 0, 0);
    //console.log("Updated buffer with ImageData");
  }

  /**
   * Reset the image to an empty state
   */
  reset() {
    this._buffer = null;
    this._bitmap = Painter.img.createImageData(this.width, this.height);
  }

  /**
   * Set the anchor point
   * @param {string} anchor Anchor position (e.g. "center", "top-left")
   */
  setAnchor(anchor) {
    this.anchor = anchor;
    this._updateAnchorOffsets();
  }

  /* ------------------------------------------------------------------ draw */
  /**
   * Draw the image to the canvas
   */
  draw() {
    // Skip drawing if not visible or no bitmap available
    if (!this.visible) return;
    if (!this._bitmap && !this._buffer) return;

    super.draw();

    // For ImageData, we must use the buffer
    let source = (this._bitmap instanceof ImageData) ? this._buffer : this._bitmap;

    if (!source || (this._bitmap instanceof ImageData && !this._buffer)) {
      // If we need a buffer but don't have one yet, try to create it
      if (this._bitmap instanceof ImageData) {
        this.buffer(this._bitmap);
        source = this._buffer;
      }

      // If we still don't have a valid source, skip drawing
      if (!source) return;
    }

    // Delegates all transform/alpha/smoothing handling to Painter.img.draw
    Painter.img.draw(source, 0, 0, {
      width: this.width,
      height: this.height,
      anchor: this.anchor,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      alpha: this.opacity,
      smoothing: this.smoothing,
      flipX: this.scaleX < 0,
      flipY: this.scaleY < 0,
    });
  }

  /* ---------------------------------------------------- bounds & geometry */
  /** Re‑compute bounding box (called by base class when something changes). */
  calculateBounds() {
    return {
      x: -this._anchorX * this.width,
      y: -this._anchorY * this.height,
      width: this.width,
      height: this.height,
    };
  }
}
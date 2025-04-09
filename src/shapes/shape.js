import { Painter } from "../painter.js";
import { Transformable } from "./transformable.js";

/**
 * Shape - Abstract base for all drawable canvas primitives.
 * Now extends Transformable to have x, y, width, etc. standard properties.
 */
export class Shape extends Transformable {
  /**
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} [options={}]
   * @param {string|CanvasGradient|null} [options.fillColor]
   * @param {string|CanvasGradient|null} [options.strokeColor]
   * @param {number} [options.lineWidth=1]
   * @param {number} [options.rotation=0]
   * @param {number} [options.scaleX=1]
   * @param {number} [options.scaleY=1]
   * @param {number} [options.minX]
   * @param {number} [options.maxX]
   * @param {number} [options.minY]
   * @param {number} [options.maxY]
   */
  constructor(x, y, options = {}) {
    super(options); // Call Transformable constructor
    this.crisp = options.crisp ?? true; // For pixel-perfect rendering
    this.x = x;
    this.y = y;
    // Style
    this.fillColor = options.fillColor || null;
    this.strokeColor = options.strokeColor || null;
    this.lineWidth = options.lineWidth || 1;
    // Shadow
    this.shadowColor = options.shadowColor ?? null;
    this.shadowBlur = options.shadowBlur ?? 0;
    this.shadowOffsetX = options.shadowOffsetX ?? 0;
    this.shadowOffsetY = options.shadowOffsetY ?? 0;
    // Constraints (drawing boundaries, not physics)
    this.minX = options.minX;
    this.maxX = options.maxX;
    this.minY = options.minY;
    this.maxY = options.maxY;
  }

  /**
   * Applies positional bounding constraints if set.
   */
  applyConstraints() {
    if (this.minX !== undefined) this.x = Math.max(this.x, this.minX);
    if (this.maxX !== undefined) this.x = Math.min(this.x, this.maxX);
    if (this.minY !== undefined) this.y = Math.max(this.y, this.minY);
    if (this.maxY !== undefined) this.y = Math.min(this.y, this.maxY);
    if (this.crisp) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      this.width = Math.round(this.width);
      this.height = Math.round(this.height);
    }
  }

  /**
   * Abstract method to draw the shape using Painter.
   * Subclasses must override this.
   */
  draw() {
    this.applyConstraints();
  }

  /**
   * Render helper to wrap drawing calls in a canvas transform state.
   * Also respects this.opacity and this.visible from Transformable.
   */
  renderWithTransform(drawFn) {
    if (!this.visible) {
      //console.warn("Shape is not visible, skipping render.");
      return; // Don't render if not visible
    }
    Painter.ctx.save();
    Painter.ctx.globalAlpha = this.opacity;
    Painter.ctx.translate(this.x, this.y);
    Painter.ctx.rotate(this.rotation);
    Painter.ctx.scale(this.scaleX, this.scaleY);
    drawFn();
    Painter.ctx.restore();
  }

  /**
   * A default bounding box that uses (this.x, this.y, this.width, this.height).
   * If your shape has a different geometry, you might override this or
   * compute differently for circles, polygons, etc.
   *
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

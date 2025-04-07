import { Painter } from "/gcanvas/src/painter.js";
/**
 * Shape - Abstract base class for all drawable canvas primitives.
 *
 * Responsibilities:
 * - Holds rendering properties (position, style, transform)
 * - Knows how to draw itself using Painter
 *
 * Limitations:
 * - This is NOT a game object. It has no awareness of game state, time, or scenes.
 * - For use with drawing utilities or wrapping into GameObjects manually.
 */
export class Shape {
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
    this.x = x;
    this.y = y;
    // Style
    this.fillColor = options.fillColor || null;
    this.strokeColor = options.strokeColor || null;
    this.lineWidth = options.lineWidth || 1;
    // Transform
    this.rotation = options.rotation || 0;
    this.scaleX = options.scaleX || 1;
    this.scaleY = options.scaleY || 1;
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
  }

  /**
   * Abstract method to draw the shape using Painter.
   * Subclasses must override this.
   */
  draw() {
    throw new Error("Shape.draw() must be implemented by subclass");
  }

  /**
   * Internal render helper to wrap drawing calls in canvas transform state.
   * @param {Function} drawFn - Function that performs canvas drawing
   */
  renderWithTransform(drawFn) {
    Painter.ctx.save();
    Painter.ctx.translate(this.x, this.y);
    Painter.ctx.rotate(this.rotation);
    Painter.ctx.scale(this.scaleX, this.scaleY);
    drawFn();
    Painter.ctx.restore();
  }

  /**
   * Abstract method for bounding box detection.
   * Must be implemented by all concrete shapes.
   */
  getBounds() {
    return null;
  }
}

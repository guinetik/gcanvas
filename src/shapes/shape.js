import { Painter } from "../painter.js";
import { Transformable } from "./transformable.js";

/**
 * @class Shape
 * @extends Transformable
 * @description Abstract base class for all drawable canvas shapes.
 *
 * Shape extends Transformable to add drawing capabilities and styling options.
 * It provides the foundation for all visual elements that can be rendered on the canvas,
 * with consistent handling of fills, strokes, shadows, and transformations.
 *
 * Key features:
 * - Inherits all transformation properties (position, size, rotation, etc.)
 * - Adds styling options (fill color, stroke color, line width)
 * - Adds shadow effects (color, blur, offset)
 * - Provides boundary constraint capabilities
 * - Includes helper methods for canvas state management during rendering
 *
 * This is an abstract class - you should use one of its concrete implementations
 * or extend it to create your own custom shape.
 *
 * @property {string|CanvasGradient|null} fillColor - Fill color or gradient
 * @property {string|CanvasGradient|null} strokeColor - Stroke (outline) color or gradient
 * @property {number} lineWidth - Width of the stroke line
 * @property {string|null} shadowColor - Shadow color
 * @property {number} shadowBlur - Amount of shadow blur
 * @property {number} shadowOffsetX - Horizontal shadow offset
 * @property {number} shadowOffsetY - Vertical shadow offset
 * @property {number|undefined} minX - Minimum allowed X position
 * @property {number|undefined} maxX - Maximum allowed X position
 * @property {number|undefined} minY - Minimum allowed Y position
 * @property {number|undefined} maxY - Maximum allowed Y position
 * @property {boolean} crisp - Whether to round coordinates for pixel-perfect rendering
 *
 * @example
 * // Creating a custom shape
 * class Diamond extends Shape {
 *   constructor(x, y, width, height, options = {}) {
 *     super(x, y, {
 *       fillColor: options.fillColor || '#3498db',
 *       strokeColor: options.strokeColor || '#2980b9',
 *       lineWidth: options.lineWidth || 2,
 *       ...options
 *     });
 *
 *     this.width = width;
 *     this.height = height;
 *   }
 *
 *   draw() {
 *     super.draw(); // Apply constraints
 *
 *     this.renderWithTransform(() => {
 *       Painter.ctx.beginPath();
 *       Painter.ctx.moveTo(0, -this.height/2);  // Top
 *       Painter.ctx.lineTo(this.width/2, 0);    // Right
 *       Painter.ctx.lineTo(0, this.height/2);   // Bottom
 *       Painter.ctx.lineTo(-this.width/2, 0);   // Left
 *       Painter.ctx.closePath();
 *
 *       if (this.fillColor) {
 *         Painter.ctx.fillStyle = this.fillColor;
 *         Painter.ctx.fill();
 *       }
 *
 *       if (this.strokeColor) {
 *         Painter.ctx.strokeStyle = this.strokeColor;
 *         Painter.ctx.lineWidth = this.lineWidth;
 *         Painter.ctx.stroke();
 *       }
 *     });
 *   }
 * }
 *
 * @method draw() - Abstract method that concrete shapes must implement
 * @method renderWithTransform(callback) - Helper to handle canvas transform state
 * @method applyConstraints() - Applies position constraints and pixel alignment
 * @method getBounds() - Returns the bounding box for hit testing
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
    // Rotation
    this.rotation = options.rotation ?? 0;
    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;
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
    if (this.shadowColor) {
      Painter.dropShadow(
        this.shadowColor,
        this.shadowBlur,
        this.shadowOffsetX,
        this.shadowOffsetY
      );
    }
    Painter.ctx.translate(this.x, this.y);
    Painter.ctx.rotate(this.rotation);
    Painter.ctx.scale(this.scaleX, this.scaleY);
    drawFn();
    Painter.clearShadow();
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

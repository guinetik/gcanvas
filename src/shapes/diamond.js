// Diamond.js
import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Diamond - A drawable diamond-shaped canvas primitive.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Diamond center is at (width/2, height/2)
 *
 * Limitations:
 * - Not interactive or animated
 * - For visual use only (wrap in a GameObject for dynamic behavior)
 */
export class Diamond extends Shape {
  /**
   * @param {Object} [options] - Shape rendering options
   * @param {number} [options.width] - Total width of the diamond
   * @param {number} [options.height] - Total height of the diamond
   */
  constructor(options = {}) {
    super(options);
  }

  /**
   * Renders the diamond using four corner points.
   */
  draw() {
    super.draw();
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    // Diamond center is at (halfW, halfH) from bounding box top-left
    const cx = halfW;
    const cy = halfH;

    const points = [
      { x: cx, y: 0 },           // Top
      { x: this.width, y: cy },   // Right
      { x: cx, y: this.height },  // Bottom
      { x: 0, y: cy },            // Left
    ];

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

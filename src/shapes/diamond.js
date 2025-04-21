// Diamond.js
import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
/**
 * Diamond - A drawable diamond-shaped canvas primitive.
 *
 * Draws a centered diamond using four points around its bounds.
 * Uses Painter's polygon rendering under the hood.
 *
 * Limitations:
 * - Not interactive or animated
 * - For visual use only (wrap in a GameObject for dynamic behavior)
 */
export class Diamond extends Shape {
  /**
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {number} width - Total width of the diamond
   * @param {number} height - Total height of the diamond
   * @param {Object} [options] - Shape rendering options
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

    const points = [
      { x: 0, y: -halfH }, // Top
      { x: halfW, y: 0 }, // Right
      { x: 0, y: halfH }, // Bottom
      { x: -halfW, y: 0 }, // Left
    ];

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

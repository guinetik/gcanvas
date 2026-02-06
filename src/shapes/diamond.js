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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    const points = [
      { x: halfW + offsetX, y: offsetY },                    // Top
      { x: this.width + offsetX, y: halfH + offsetY },       // Right
      { x: halfW + offsetX, y: this.height + offsetY },      // Bottom
      { x: offsetX, y: halfH + offsetY },                    // Left
    ];

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

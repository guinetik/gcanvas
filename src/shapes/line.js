import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Line - A diagonal line shape.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Line goes from (0, 0) to (length, length) diagonally
 */
export class Line extends Shape {
  /**
   * Creates a line shape
   * @param {number} length - Length of the line (diagonal)
   * @param {Object} options - Style options
   */
  constructor(length = 40, options = {}) {
    super(options);
    this.length = length;
    // Bounding box for a diagonal line
    this.width = length;
    this.height = length;
  }

  draw() {
    super.draw();
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    // Line from top-left to bottom-right, offset by origin
    Painter.lines.line(
      offsetX,
      offsetY,
      this.length + offsetX,
      this.length + offsetY,
      this.stroke,
      this.lineWidth
    );
  }
}

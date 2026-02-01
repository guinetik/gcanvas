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
    // Line from top-left (0, 0) to bottom-right (length, length)
    Painter.lines.line(
      0,
      0,
      this.length,
      this.length,
      this.stroke,
      this.lineWidth
    );
  }
}

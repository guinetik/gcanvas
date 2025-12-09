import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Line extends Shape {
  /**
   * Creates a line shape centered around (x, y)
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} length - Length of the line
   * @param {Object} options - Style options
   */
  constructor(length = 40, options = {}) {
    super(options);
    this.length = length;
  }

  draw() {
    super.draw();
    const half = this.length / 2;
    Painter.lines.line(
      -half,
      -half,
      half,
      half,
      this.stroke,
      this.lineWidth
    );
  }
}

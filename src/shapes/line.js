import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

export class Line extends Shape {
  /**
   * Creates a line shape centered around (x, y)
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} length - Length of the line
   * @param {Object} options - Style options
   */
  constructor(x, y, length = 40, options = {}) {
    super(x, y, options);
    this.length = length;
  }

  draw() {
    this.applyConstraints();

    const half = this.length / 2;

    this.renderWithTransform(() => {
      Painter.line(-half, -half, half, half, this.strokeColor, this.lineWidth);
    });
  }
}

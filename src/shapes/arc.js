import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Arc - A circular arc (partial circle outline) without connecting to center.
 */
export class Arc extends Shape {
  /**
   *
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} startAngle - In radians
   * @param {number} endAngle - In radians
   * @param {object} options - Style options
   */
  constructor(radius, startAngle, endAngle, options = {}) {
    super(options);
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  draw() {
    super.draw();
    Painter.lines.beginPath();
    Painter.shapes.arc(0, 0, this.radius, this.startAngle, this.endAngle, false);

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }

  getBounds() {
    const r = this.radius;
    return {
      x: this.x,
      y: this.y,
      width: r * 2,
      height: r * 2,
    };
  }
}

import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

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
  constructor(x, y, radius, startAngle, endAngle, options = {}) {
    super(x, y, options);
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  draw() {
    this.applyConstraints();
    this.renderWithTransform(() => {
      const ctx = Painter.ctx;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, this.startAngle, this.endAngle, false);

      if (this.strokeColor) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
      }
    });
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

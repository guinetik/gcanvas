import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Arc - A circular arc (partial circle outline) without connecting to center.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Arc center is at (radius, radius)
 */
export class Arc extends Shape {
  /**
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
    this.width = radius * 2;
    this.height = radius * 2;
  }

  draw() {
    super.draw();
    // Arc center is at (radius, radius) from bounding box top-left
    const cx = this.radius;
    const cy = this.radius;

    Painter.lines.beginPath();
    Painter.shapes.arc(cx, cy, this.radius, this.startAngle, this.endAngle, false);

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

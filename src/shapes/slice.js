import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * PieSlice - A pie/wedge shape.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Slice center is at (radius, radius)
 */
export class PieSlice extends Shape {
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
    // Slice center is at (radius, radius) from bounding box top-left
    const cx = this.radius;
    const cy = this.radius;

    Painter.lines.beginPath();
    Painter.lines.moveTo(cx, cy);
    Painter.shapes.arc(cx, cy, this.radius, this.startAngle, this.endAngle);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

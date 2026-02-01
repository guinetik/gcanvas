import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Ring - A donut/ring shape with inner and outer radius.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Ring center is at (outerRadius, outerRadius)
 */
export class Ring extends Shape {
  constructor(outerRadius, innerRadius, options = {}) {
    super(options);
    this.outerRadius = outerRadius;
    this.innerRadius = innerRadius;
    this.width = outerRadius * 2;
    this.height = outerRadius * 2;
  }

  draw() {
    super.draw();
    // Ring center is at (outerRadius, outerRadius) from bounding box top-left
    const cx = this.outerRadius;
    const cy = this.outerRadius;

    Painter.lines.beginPath();
    Painter.shapes.arc(cx, cy, this.outerRadius, 0, Math.PI * 2);
    Painter.shapes.arc(cx, cy, this.innerRadius, 0, Math.PI * 2, true);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

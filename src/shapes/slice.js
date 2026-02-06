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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    // Slice center relative to bounding box
    const cx = this.radius + offsetX;
    const cy = this.radius + offsetY;

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

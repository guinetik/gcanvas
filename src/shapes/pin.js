import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Pin - A map pin/marker shape with circular head and pointed tail.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Pin head center is at (radius, radius)
 */
export class Pin extends Shape {
  constructor(radius = 20, options = {}) {
    super(options);
    this.radius = radius;
    this.width = radius * 2;
    this.height = radius * 2.5;
  }

  draw() {
    super.draw();
    const r = this.radius;
    const h = this.height;
    // Center of circular head is at (r, r) from top-left
    const cx = r;
    const cy = r;

    Painter.lines.beginPath();

    // Draw circle head (arc from 180° to 0°, which is bottom half)
    Painter.shapes.arc(cx, cy, r, Math.PI, 0);

    // Draw tail (triangle pointing down)
    Painter.lines.lineTo(cx + r, cy);     // Right side of circle base
    Painter.lines.lineTo(cx, h);          // Bottom point
    Painter.lines.lineTo(cx - r, cy);     // Left side of circle base
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

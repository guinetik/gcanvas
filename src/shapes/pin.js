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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    const r = this.radius;
    const h = this.height;
    // Center of circular head relative to bounding box
    const cx = r + offsetX;
    const cy = r + offsetY;

    Painter.lines.beginPath();

    // Draw circle head (arc from 180° to 0°, which is bottom half)
    Painter.shapes.arc(cx, cy, r, Math.PI, 0);

    // Draw tail (triangle pointing down)
    Painter.lines.lineTo(cx + r, cy);           // Right side of circle base
    Painter.lines.lineTo(cx, h + offsetY);      // Bottom point
    Painter.lines.lineTo(cx - r, cy);           // Left side of circle base
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

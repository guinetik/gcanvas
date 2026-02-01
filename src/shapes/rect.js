import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Rectangle - A drawable rectangle using the canvas.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws at (0, 0) in local coordinates
 * - The origin point is handled by the transformation pipeline
 * - Default origin (0, 0) = top-left; set origin: "center" for center-based positioning
 */
export class Rectangle extends Shape {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Renders the rectangle using Painter.
   */
  draw() {
    super.draw(); // Apply transforms from Transformable
    this.drawRect();
  }

  drawRect() {
    // Draw at (0, 0) - the transformation pipeline handles origin-based positioning
    if (this.color) {
      Painter.shapes.rect(0, 0, this.width, this.height, this.color);
    }

    if (this.stroke) {
      Painter.shapes.outlineRect(0, 0, this.width, this.height, this.stroke, this.lineWidth);
    }
  }
}

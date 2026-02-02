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
    // Calculate draw offset based on origin
    // For origin (0, 0) = top-left: draw at (0, 0)
    // For origin (0.5, 0.5) = center: draw at (-width/2, -height/2)
    // Use || 0 to convert -0 to 0 for consistent behavior
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    if (this.color) {
      Painter.shapes.rect(offsetX, offsetY, this.width, this.height, this.color);
    }

    if (this.stroke) {
      Painter.shapes.outlineRect(offsetX, offsetY, this.width, this.height, this.stroke, this.lineWidth);
    }
  }
}

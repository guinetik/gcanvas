import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Rectangle - A drawable centered rectangle using the canvas.
 *
 * Draws a rectangle from its center (not top-left) using Painter.
 */
export class Rectangle extends Shape {
  constructor(options = {}) {
    super(options);
  }

  /**
   * Renders the rectangle using Painter.
   */
  draw() {
    super.draw(); // Apply constraints from Shape
    this.drawRect();
  }

  drawRect() {
    // When in a group context, use relative coordinates
    const x = -this.width / 2;
    const y = -this.height / 2;
    
    if (this.color) {
      Painter.shapes.rect(x, y, this.width, this.height, this.color);
    }
  
    if (this.stroke) {
      Painter.shapes.outlineRect(x, y, this.width, this.height, this.stroke, this.lineWidth);
    }
  }
}

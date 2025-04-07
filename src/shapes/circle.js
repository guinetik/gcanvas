import { Shape } from "./shape.js";
import { Painter } from "../painter.js";
/**
 * Circle - A drawable canvas circle shape.
 * 
 * Responsibilities:
 * - Draws a circle using the Painter API
 * - Supports fill and stroke styles
 * - Supports canvas transforms (position, rotation, scale)
 * - Optional drawing constraints (bounds)
 * 
 * Limitations:
 * - Not interactive or self-animated (wrap in a GameObject for that)
 */
export class Circle extends Shape {
  /**
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {number} radius - Radius of the circle
   * @param {Object} [options] - Shape rendering options
   */
  constructor(x, y, radius, options = {}) {
    super(x, y, options);
    this.radius = radius;
  }

  /**
   * Renders the circle using the Painter API.
   */
  draw() {
    this.applyConstraints();

    this.renderWithTransform(() => {
      if (this.fillColor) {
        Painter.fillCircle(0, 0, this.radius, this.fillColor);
      }
      if (this.strokeColor) {
        Painter.strokeCircle(
          0,
          0,
          this.radius,
          this.strokeColor,
          this.lineWidth
        );
      }
    });
  }

  getBounds() {
    const size = this.radius * 2;
    return { x: this.x, y: this.y, width: size, height: size };
  }
  
}

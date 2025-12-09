import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * RoundedRectangle - A drawable centered rectangle with rounded corners.
 *
 * Draws a rounded rectangle from its center using Painter.
 */
export class RoundedRectangle extends Shape {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {number|number[]} radii - Corner radius or array of radii for each corner
   * @param {Object} [options] - Shape rendering options
   */
  constructor(radii = 0, options = {}) {
    super(options);
    // Handle radius either as a single value or array of 4 values
    if (typeof radii === "number") {
      this.radii = [radii, radii, radii, radii]; // [topLeft, topRight, bottomRight, bottomLeft]
    } else if (Array.isArray(radii)) {
      // Ensure we have exactly 4 values
      this.radii =
        radii.length === 4
          ? radii
          : [
              radii[0] || 0,
              radii[1] || radii[0] || 0,
              radii[2] || radii[0] || 0,
              radii[3] || radii[1] || radii[0] || 0,
            ];
    } else {
      this.radii = [0, 0, 0, 0];
    }
  }

  /**
   * Renders the rounded rectangle using Painter's roundRect method.
   */
  draw() {
    super.draw();
    const x = -this.width / 2;
    const y = -this.height / 2;
    // Use the Painter's roundRect utility methods
    if (this.color && this.stroke) {
      // If both fill and stroke are needed
      Painter.shapes.roundRect(
        x,
        y,
        this.width,
        this.height,
        this.radii,
        this.color,
        this.stroke,
        this.lineWidth
      );
    } else if (this.color) {
      // If only fill is needed
      Painter.shapes.fillRoundRect(
        x,
        y,
        this.width,
        this.height,
        this.radii,
        this.color
      );
    } else if (this.stroke) {
      // If only stroke is needed
      Painter.shapes.strokeRoundRect(
        x,
        y,
        this.width,
        this.height,
        this.radii,
        this.stroke,
        this.lineWidth
      );
    }
  }

  /**
   * Returns the bounding box for the rounded rectangle
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

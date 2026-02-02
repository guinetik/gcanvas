import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * RoundedRectangle - A drawable rectangle with rounded corners.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws at (0, 0) in local coordinates
 * - The origin point is handled by the transformation pipeline
 */
export class RoundedRectangle extends Shape {
  /**
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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    if (this.color && this.stroke) {
      Painter.shapes.roundRect(
        offsetX,
        offsetY,
        this.width,
        this.height,
        this.radii,
        this.color,
        this.stroke,
        this.lineWidth
      );
    } else if (this.color) {
      Painter.shapes.fillRoundRect(
        offsetX,
        offsetY,
        this.width,
        this.height,
        this.radii,
        this.color
      );
    } else if (this.stroke) {
      Painter.shapes.strokeRoundRect(
        offsetX,
        offsetY,
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

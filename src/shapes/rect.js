import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";

/**
 * Rectangle - A drawable centered rectangle using the canvas.
 * 
 * Draws a rectangle from its center (not top-left) using Painter.
 */
export class Rectangle extends Shape {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {Object} [options] - Shape rendering options
   */
  constructor(x, y, width, height, options = {}) {
    super(x, y, options);
    this.width = width;
    this.height = height;
  }

  /**
   * Renders the rectangle using Painter.
   */
  draw() {
    this.applyConstraints();

    this.renderWithTransform(() => {
      const x = -this.width / 2;
      const y = -this.height / 2;

      if (this.fillColor) {
        Painter.fillRect(x, y, this.width, this.height, this.fillColor);
      }

      if (this.strokeColor) {
        Painter.strokeRect(
          x,
          y,
          this.width,
          this.height,
          this.strokeColor,
          this.lineWidth
        );
      }
    });
  }

  getBounds() {
    //console.log("getBounds", this.x, this.y, this.width, this.height);
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
  
}

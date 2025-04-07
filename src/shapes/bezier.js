import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";

/**
 * BezierShape - A shape that renders any custom path using Painter.path().
 * Great for clouds, blobs, tails, ears, capes, bananas.
 */
export class BezierShape extends Shape {
  /**
   * 
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {Array} path - An array of path commands [['M', x, y], ['C', ...], ['Z']]
   * @param {object} options - fillColor, strokeColor, etc
   */
  constructor(x, y, path = [], options = {}) {
    super(x, y, options);
    this.path = path;
  }

  draw() {
    this.applyConstraints();
    this.renderWithTransform(() => {
      Painter.path(this.path, this.fillColor, this.strokeColor, this.lineWidth);
    });
  }

  getBounds() {
    // Not calculated from path (too complex); just approximate
    const s = 50;
    return {
      x: this.x,
      y: this.y,
      width: s * 2,
      height: s * 2
    };
  }
}

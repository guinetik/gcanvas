import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * BezierShape - A shape that renders any custom path using Painter.lines.path().
 * Great for clouds, blobs, tails, ears, capes, bananas.
 */
export class BezierShape extends Shape {
  /**
   *
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {Array} path - An array of path commands [['M', x, y], ['C', ...], ['Z']]
   * @param {object} options - color, stroke, etc
   */
  constructor(path = [], options = {}) {
    //this.logger.log("new Bezier", options);
    super(options);
    this.path = path;
  }

  draw() {
    super.draw();
    Painter.lines.path(
      this.path,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }

  getBounds() {
    // Not calculated from path (too complex); just approximate
    const s = 50;
    return {
      x: this.x,
      y: this.y,
      width: s * 2,
      height: s * 2,
    };
  }
}

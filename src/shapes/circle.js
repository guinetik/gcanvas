import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
/**
 * Circle - A drawable canvas circle shape.
 *
 * With the origin-based coordinate system (v3.0):
 * - Uses bounding box for origin calculations (same as rectangles)
 * - Default origin (0, 0) = top-left of bounding box
 * - Circle center is drawn at (radius, radius) from the origin
 * - Set origin: "center" to position by circle center
 *
 * Limitations:
 * - Not interactive or self-animated (wrap in a GameObject for that)
 */
export class Circle extends Shape {
  constructor(radius, options = {}) {
    super(options);
    this._radius = radius;
    this.width = radius * 2;
    this.height = radius * 2;
  }

  /**
   * Renders the circle using the Painter API.
   * Draws at (radius, radius) to place circle center correctly
   * relative to the bounding box top-left at (0, 0).
   */
  draw() {
    super.draw();
    // Circle center is at (radius, radius) from the bounding box top-left
    const cx = this._radius;
    const cy = this._radius;

    if (this.color) {
      Painter.shapes.fillCircle(cx, cy, this._radius, this.color);
    }
    if (this.stroke) {
      Painter.shapes.strokeCircle(
        cx,
        cy,
        this._radius,
        this.stroke,
        this.lineWidth
      );
    }
  }

  calculateBounds() {
    const size = this._radius * 2;
    this.trace("Circle.calculateBounds:" + size);
    return { x: this.x, y: this.y, width: size, height: size };
  }

  get radius() {
    return this._radius;
  }

  set radius(v) {
    this.validateProp(v, "radius");
    if (v != this._radius) {
      this._radius = v;
      this.width = v * 2;
      this.height = v * 2;
      this._boundsDirty = true;
      this.calculateBounds();
    }
  }
}

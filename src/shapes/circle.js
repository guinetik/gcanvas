import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
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
  constructor(radius, options = {}) {
    super(options);
    this._radius = radius;
    this.width = radius * 2;
    this.height = radius * 2;
  }

  /**
   * Renders the circle using the Painter API.
   */
  draw() {
    super.draw();
    if (this.color) {
      Painter.shapes.fillCircle(0, 0, this._radius, this.color);
    }
    if (this.stroke) {
      Painter.shapes.strokeCircle(
        0,
        0,
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

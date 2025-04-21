import { Renderable } from "./renderable.js";
import { Painter } from "../painter/painter.js";

/**
 * Transformable
 * --------------
 *
 * A renderable object that supports **canvas transformations**:
 * - Scaling
 * - Rotation
 *
 * ### Architectural Role
 *
 * - Extends the render lifecycle by wrapping `draw()` inside a transformed context.
 * - Adds transform properties (`scaleX`, `scaleY`, `rotation`)
 * - Introduces the `.transform` API for reflective property access
 *
 * This is the final base layer before custom shape logic is introduced.
 *
 * @abstract
 * @extends Renderable
 */
export class Transformable extends Renderable {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.rotation=0] - Rotation in radians (clockwise)
   * @param {number} [options.scaleX=1] - Horizontal scale factor
   * @param {number} [options.scaleY=1] - Vertical scale factor
   */
  constructor(options = {}) {
    super(options);
    this._rotation = options.rotation ?? 0;
    this._scaleX = options.scaleX ?? 1;
    this._scaleY = options.scaleY ?? 1;
    this.logger.log("Transformable", this.x, this.y, this.width, this.height);
  }

  /**
   * The main rendering method.
   * Applies transforms before calling `draw()`.
   */
  draw() {
    this.applyTransforms();
  }

  /**
   * Applies canvas transform context.
   * Order: rotate → scale
   */
  applyTransforms() {
    Painter.rotate(this._rotation);
    Painter.scale(this._scaleX, this._scaleY);
  }

  /**
   * Gets the object's rotation in radians.
   * @type {number}
   */
  get rotation() {
    return this._rotation;
  }

  set rotation(v) {
    this._rotation = v;
    this.markBoundsDirty();
  }

  /**
   * Gets horizontal scale factor.
   * @type {number}
   */
  get scaleX() {
    return this._scaleX;
  }

  set scaleX(v) {
    this._scaleX = v;
    this.markBoundsDirty();
  }

  /**
   * Gets vertical scale factor.
   * @type {number}
   */
  get scaleY() {
    return this._scaleY;
  }

  set scaleY(v) {
    this._scaleY = v;
    this.markBoundsDirty();
  }

  /**
   * Calculates the bounding box *after* applying rotation and scale.
   * Used by Geometry2d → getBounds().
   *
   * @override
   * @protected
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  calculateBounds() {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH },
    ];

    const cos = Math.cos(this._rotation);
    const sin = Math.sin(this._rotation);

    const transformed = corners.map(({ x, y }) => {
      x *= this._scaleX;
      y *= this._scaleY;

      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      return { x: rx + this.x, y: ry + this.y };
    });

    const xs = transformed.map((p) => p.x);
    const ys = transformed.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

import { Renderable } from "./renderable.js";
import { Painter } from "../painter/painter.js";
import { Transform } from "./transform.js";

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
 * - Introduces the `.transform` API for fluent, chainable property access
 *
 * ### Transform API
 *
 * The `.transform` property provides a fluent API for modifying properties:
 *
 * ```javascript
 * // Fluent chaining
 * shape.transform
 *   .x(100).y(200)
 *   .width(50).height(50)
 *   .rotation(45)
 *   .scale(0.8);
 *
 * // Batch updates
 * shape.transform.set({ x: 100, y: 200, rotation: 45 });
 *
 * // Relative transforms
 * shape.transform.translateBy(10, 20);
 * shape.transform.rotateBy(15);
 * ```
 *
 * This is the final base layer before custom shape logic is introduced.
 *
 * @abstract
 * @extends Renderable
 */
export class Transformable extends Renderable {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.rotation=0] - Rotation in degrees (clockwise)
   * @param {number} [options.scaleX=1] - Horizontal scale factor
   * @param {number} [options.scaleY=1] - Vertical scale factor
   */
  constructor(options = {}) {
    super(options);
    // Fix: wrap in parentheses to ensure ?? applies to the full expression
    this._rotation = (options.rotation ?? 0) * Math.PI / 180;
    this._scaleX = options.scaleX ?? 1;
    this._scaleY = options.scaleY ?? 1;

    /**
     * Fluent transform API for modifying spatial and transform properties.
     * @type {Transform}
     */
    this.transform = new Transform(this);

    this.logger.log("Transformable", this.x, this.y, this.width, this.height);
  }

  /**
   * The main rendering method.
   * Applies pivot-based transforms and draws debug bounding box.
   * Subclasses should call super.draw() before their drawing logic.
   *
   * The transform sequence:
   * 1. Translate to pivot point (based on origin)
   * 2. Apply rotation and scale
   * 3. Translate back so drawing starts at (0, 0)
   */
  draw() {
    this.applyTransforms();
    // Flush any stale canvas fill state before shape draws
    // This prevents color bleeding between consecutive shape renders
    const ctx = Painter.ctx;
    ctx.beginPath();
    ctx.fill();
    this.drawDebug();
  }

  /**
   * Applies canvas transform context.
   * Transforms are applied around local (0, 0) which is the origin point.
   * The shape's draw() method handles offset so its origin aligns with (0, 0).
   * 
   * This means:
   * - For center origin: rotate/scale around the shape's center
   * - For top-left origin: rotate/scale around the shape's top-left corner
   */
  applyTransforms() {
    if (this._isCaching) return;

    // Apply rotation and scale around local (0, 0)
    // After render() translates to (x, y), local (0, 0) is at (x, y) in world space
    // The shape's draw() offsets itself so its origin point is at (0, 0)
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
    this._rotation = v * Math.PI / 180;
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
   * Uses origin-based pivot for rotation calculations.
   * Used by Geometry2d → getBounds().
   *
   * @override
   * @protected
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  calculateBounds() {
    // Calculate pivot point based on origin (in local space)
    const pivotX = this.width * this.originX;
    const pivotY = this.height * this.originY;

    // Define corners relative to shape's top-left (0, 0)
    const corners = [
      { x: 0, y: 0 },                         // top-left
      { x: this.width, y: 0 },                // top-right
      { x: this.width, y: this.height },      // bottom-right
      { x: 0, y: this.height },               // bottom-left
    ];

    const cos = Math.cos(this._rotation);
    const sin = Math.sin(this._rotation);

    const transformed = corners.map(({ x, y }) => {
      // Translate corner relative to pivot (center of rotation)
      let cx = x - pivotX;
      let cy = y - pivotY;

      // Apply scale
      cx *= this._scaleX;
      cy *= this._scaleY;

      // Apply rotation around pivot
      const rx = cx * cos - cy * sin;
      const ry = cx * sin + cy * cos;

      // Translate back to world position
      // this.x, this.y is where the origin (pivot) is positioned in world space
      // So we add the rotated offset to the world position
      return { x: rx + this.x, y: ry + this.y };
    });

    const xs = transformed.map((p) => p.x);
    const ys = transformed.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Return bounds with top-left based x, y
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

import { Euclidian } from "./euclidian.js";

/**
 * Geometry2d
 * ----------
 *
 * A foundational class representing any object with spatial boundaries.
 * Builds upon `Euclidian` by adding:
 *
 * - **Bounding logic** with memoization
 * - **Constraint enforcement** (`minX`, `maxX`, etc.)
 * - **Property change tracking** for dirty bounding recalculations
 *
 * This class is *not* concerned with transforms, rendering, or visibility.
 * Instead, it's the core layer where **position + size = spatial identity**.
 *
 * ### Core Responsibilities
 *
 * 1. **Bounds Calculation**: Caches and computes bounding boxes using the Template Method pattern:
 *    - `getBounds()` → returns cached bounds
 *    - `calculateBounds()` → override point for subclasses
 * 2. **Constraints**: Applies optional min/max limits on x/y positions
 * 3. **Change Tracking**: Automatically marks bounds as dirty when spatial props are modified
 * 4. **Tick Awareness**: Supports `update(dt)` to re-evaluate bounds when needed
 *
 * ### Coordinate System
 *
 * - The `x` and `y` properties refer to the **center** of the object.
 * - Use `getLocalPosition()` for top-left alignment in layout systems.
 *
 * ### Subclassing Guidelines
 *
 * - Override `calculateBounds()` if the object has non-rectangular or transformed geometry.
 * - Call `markBoundsDirty()` in custom logic if bounds-affecting state changes.
 *
 * @abstract
 * @extends Euclidian
 */
export class Geometry2d extends Euclidian {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.minX] - Minimum X constraint (optional)
   * @param {number} [options.maxX] - Maximum X constraint (optional)
   * @param {number} [options.minY] - Minimum Y constraint (optional)
   * @param {number} [options.maxY] - Maximum Y constraint (optional)
   * @param {boolean} [options.crisp=true] - Whether to round to whole pixels
   */
  constructor(options = {}) {
    super(options);
    this._minX = options.minX;
    this._maxX = options.maxX;
    this._minY = options.minY;
    this._maxY = options.maxY;
    this._boundsDirty = true;
    this._cachedBounds = null;
    this.crisp = options.crisp ?? true;
    this.logger.log("Geometry2d", this.x, this.y, this.width, this.height);
  }

  update() {
    this.trace("Geometry2d.update");
    this.applyConstraints();
    this.getBounds(); // Trigger lazy recompute if dirty
  }

  /**
   * Gets the minimum allowed X value.
   * @type {number|undefined}
   */
  get minX() {
    return this._minX;
  }
  set minX(v) {
    this._minX = v;
  }

  /**
   * Gets the maximum allowed X value.
   * @type {number|undefined}
   */
  get maxX() {
    return this._maxX;
  }
  set maxX(v) {
    this._maxX = v;
  }

  /**
   * Gets the minimum allowed Y value.
   * @type {number|undefined}
   */
  get minY() {
    return this._minY;
  }
  set minY(v) {
    this._minY = v;
  }

  /**
   * Gets the maximum allowed Y value.
   * @type {number|undefined}
   */
  get maxY() {
    return this._maxY;
  }
  set maxY(v) {
    this._maxY = v;
  }

  /**
   * Whether the bounding box is dirty and needs recalculation.
   * @type {boolean}
   * @readonly
   */
  get boundsDirty() {
    return this._boundsDirty;
  }

  /**
   * Applies positional constraints and optionally rounds to whole pixels.
   */
  applyConstraints() {
    if (this._minX !== undefined) this.x = Math.max(this.x, this._minX);
    if (this._maxX !== undefined) this.x = Math.min(this.x, this._maxX);
    if (this._minY !== undefined) this.y = Math.max(this.y, this._minY);
    if (this._maxY !== undefined) this.y = Math.min(this.y, this._maxY);

    if (this.crisp) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      this.width = Math.round(this.width);
      this.height = Math.round(this.height);
    }
  }

  /**
   * Returns the object's bounding box.
   * Uses memoization to avoid unnecessary recomputation.
   *
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    if (this._boundsDirty || !this._cachedBounds) {
      //this.trace("Geometry2d.getBounds", this.name || this.constructor.name, this._boundsDirty, this._cachedBounds);
      this._cachedBounds = this.calculateBounds();
      this._boundsDirty = false;
    }
    return this._cachedBounds;
  }

  /**
   * Called by `getBounds()` when bounds are dirty.
   * Can be overridden to support more complex bounds (e.g. transformed shapes).
   *
   * @protected
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  calculateBounds() {
    return {
      width: this.width,
      height: this.height,
      x: this.x,
      y: this.y,
    };
  }

  /**
   * Returns the object's top-left corner.
   * Useful for layouting or aligning objects to pixel grids.
   *
   * @returns {{x: number, y: number}}
   */
  getLocalPosition() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
    };
  }

  /**
   * Marks bounds as dirty.
   * Called automatically by internal setters, but exposed for custom logic.
   *
   * @protected
   */
  markBoundsDirty() {
    this._boundsDirty = true;
  }

  validateProp(v, prop) {
    super.validateProp(v, prop);
    const originalProp = this[prop];
    if(v !== originalProp) {
      //console.log("Geometry2d.marking bounds dirty", this.name || this.constructor.name, prop, v, "originalProp", originalProp);
      this.markBoundsDirty();
    }
  }

  setTopLeft(x, y) {
    this.x = x + this.width / 2;
    this.y = y + this.height / 2;
    return this;
  }
  
  setCenter(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}

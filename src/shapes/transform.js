/**
 * Transform
 * ---------
 *
 * A fluent API for modifying spatial and transform properties of Transformable objects.
 * Provides a consistent, chainable interface for all transform operations.
 *
 * ### Usage
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
 * shape.transform.set({
 *   x: 100, y: 200,
 *   width: 50, height: 50,
 *   rotation: 45,
 *   scaleX: 0.8, scaleY: 0.8
 * });
 *
 * // Relative transforms
 * shape.transform.translateBy(10, 20);
 * shape.transform.rotateBy(15);
 * shape.transform.scaleBy(1.5);
 * ```
 *
 * ### Design Philosophy
 *
 * The Transform class enforces a consistent pattern for modifying shape properties:
 * - All modifications go through the transform API
 * - Direct property setters (shape.width = 100) can be disabled via strictTransforms
 * - Enables future features like transform animation, undo/redo, etc.
 */
export class Transform {
  /**
   * Global flag to control whether direct property setters throw errors.
   * When true, setting shape.width = 100 throws an error.
   * When false, it logs a deprecation warning and allows the operation.
   * @type {boolean}
   */
  static strictMode = false;

  /**
   * Creates a Transform instance bound to a Transformable owner.
   * @param {import('./transformable.js').Transformable} owner - The transformable object this transform controls
   */
  constructor(owner) {
    this._owner = owner;
  }

  /**
   * Gets the owner object this transform is bound to.
   * @returns {import('./transformable.js').Transformable}
   */
  get owner() {
    return this._owner;
  }

  // ============================================================
  // Position Methods
  // ============================================================

  /**
   * Sets the X position.
   * @param {number} value - X coordinate
   * @returns {Transform} this for chaining
   */
  x(value) {
    this._owner._x = value;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets the Y position.
   * @param {number} value - Y coordinate
   * @returns {Transform} this for chaining
   */
  y(value) {
    this._owner._y = value;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets both X and Y position.
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Transform} this for chaining
   */
  position(x, y) {
    this._owner._x = x;
    this._owner._y = y;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Translates position by relative amounts.
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   * @returns {Transform} this for chaining
   */
  translateBy(dx, dy) {
    this._owner._x += dx;
    this._owner._y += dy;
    this._owner.markBoundsDirty();
    return this;
  }

  // ============================================================
  // Dimension Methods
  // ============================================================

  /**
   * Sets the width.
   * @param {number} value - Width in pixels (must be >= 0)
   * @returns {Transform} this for chaining
   */
  width(value) {
    this._owner._width = Math.max(0, value);
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets the height.
   * @param {number} value - Height in pixels (must be >= 0)
   * @returns {Transform} this for chaining
   */
  height(value) {
    this._owner._height = Math.max(0, value);
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets both width and height.
   * @param {number} width - Width in pixels
   * @param {number} height - Height in pixels
   * @returns {Transform} this for chaining
   */
  size(width, height) {
    this._owner._width = Math.max(0, width);
    this._owner._height = Math.max(0, height);
    this._owner.markBoundsDirty();
    return this;
  }

  // ============================================================
  // Rotation Methods
  // ============================================================

  /**
   * Sets the rotation in degrees.
   * @param {number} degrees - Rotation angle in degrees
   * @returns {Transform} this for chaining
   */
  rotation(degrees) {
    this._owner._rotation = degrees * Math.PI / 180;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets the rotation in radians.
   * @param {number} radians - Rotation angle in radians
   * @returns {Transform} this for chaining
   */
  rotationRad(radians) {
    this._owner._rotation = radians;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Rotates by a relative amount in degrees.
   * @param {number} degrees - Amount to rotate in degrees
   * @returns {Transform} this for chaining
   */
  rotateBy(degrees) {
    this._owner._rotation += degrees * Math.PI / 180;
    this._owner.markBoundsDirty();
    return this;
  }

  // ============================================================
  // Scale Methods
  // ============================================================

  /**
   * Sets the horizontal scale factor.
   * @param {number} value - Scale factor (1 = 100%)
   * @returns {Transform} this for chaining
   */
  scaleX(value) {
    this._owner._scaleX = value;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets the vertical scale factor.
   * @param {number} value - Scale factor (1 = 100%)
   * @returns {Transform} this for chaining
   */
  scaleY(value) {
    this._owner._scaleY = value;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Sets both scale factors uniformly.
   * @param {number} value - Scale factor for both axes
   * @returns {Transform} this for chaining
   */
  scale(value) {
    this._owner._scaleX = value;
    this._owner._scaleY = value;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Multiplies current scale by a factor.
   * @param {number} factor - Multiplication factor
   * @returns {Transform} this for chaining
   */
  scaleBy(factor) {
    this._owner._scaleX *= factor;
    this._owner._scaleY *= factor;
    this._owner.markBoundsDirty();
    return this;
  }

  // ============================================================
  // Batch Operations
  // ============================================================

  /**
   * Sets multiple properties at once.
   * @param {Object} props - Object containing properties to set
   * @param {number} [props.x] - X position
   * @param {number} [props.y] - Y position
   * @param {number} [props.width] - Width
   * @param {number} [props.height] - Height
   * @param {number} [props.rotation] - Rotation in degrees
   * @param {number} [props.scaleX] - Horizontal scale
   * @param {number} [props.scaleY] - Vertical scale
   * @returns {Transform} this for chaining
   */
  set(props) {
    if (props.x !== undefined) this._owner._x = props.x;
    if (props.y !== undefined) this._owner._y = props.y;
    if (props.width !== undefined) this._owner._width = Math.max(0, props.width);
    if (props.height !== undefined) this._owner._height = Math.max(0, props.height);
    if (props.rotation !== undefined) this._owner._rotation = props.rotation * Math.PI / 180;
    if (props.scaleX !== undefined) this._owner._scaleX = props.scaleX;
    if (props.scaleY !== undefined) this._owner._scaleY = props.scaleY;

    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Resets all transforms to their default values.
   * Position and dimensions are preserved.
   * @returns {Transform} this for chaining
   */
  reset() {
    this._owner._rotation = 0;
    this._owner._scaleX = 1;
    this._owner._scaleY = 1;
    this._owner.markBoundsDirty();
    return this;
  }

  /**
   * Resets everything including position and dimensions.
   * @returns {Transform} this for chaining
   */
  resetAll() {
    this._owner._x = 0;
    this._owner._y = 0;
    this._owner._width = 0;
    this._owner._height = 0;
    this._owner._rotation = 0;
    this._owner._scaleX = 1;
    this._owner._scaleY = 1;
    this._owner.markBoundsDirty();
    return this;
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Creates a copy of the current transform values.
   * @returns {{x: number, y: number, width: number, height: number, rotation: number, scaleX: number, scaleY: number}}
   */
  toObject() {
    return {
      x: this._owner._x,
      y: this._owner._y,
      width: this._owner._width,
      height: this._owner._height,
      rotation: this._owner._rotation * 180 / Math.PI, // Convert back to degrees
      scaleX: this._owner._scaleX,
      scaleY: this._owner._scaleY
    };
  }

  /**
   * Copies transform values from another Transform or plain object.
   * @param {Transform|Object} source - Source to copy from
   * @returns {Transform} this for chaining
   */
  copyFrom(source) {
    const values = source instanceof Transform ? source.toObject() : source;
    return this.set(values);
  }

  /**
   * Static helper to handle property setter access.
   * Called by Geometry2d and Transformable setters to enforce strictMode.
   * @param {string} property - The property name being set
   * @param {*} value - The value being assigned
   * @throws {Error} When strictMode is true
   */
  static handleDirectSet(property, value) {
    if (Transform.strictMode) {
      throw new Error(
        `Direct property assignment "${property} = ${value}" is disabled. ` +
        `Use shape.transform.${property}(${value}) instead. ` +
        `Set Transform.strictMode = false to allow direct assignment.`
      );
    } else {
      console.warn(
        `[Deprecation] Direct assignment "${property} = ${value}" is deprecated. ` +
        `Use shape.transform.${property}(${value}) instead.`
      );
    }
  }
}

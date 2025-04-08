/**
 * @typedef {object} TransformOptions
 * @property {number} [x=0]         - X-coordinate (center or anchor).
 * @property {number} [y=0]         - Y-coordinate (center or anchor).
 * @property {number} [width=0]     - The width of the object or shape.
 * @property {number} [height=0]    - The height of the object or shape.
 * @property {number} [rotation=0]  - Rotation in radians.
 * @property {number} [scaleX=1]    - Horizontal scale factor.
 * @property {number} [scaleY=1]    - Vertical scale factor.
 * @property {number} [opacity=1]   - Opacity from 0 (transparent) to 1 (fully visible).
 * @property {boolean} [visible=true] - Whether this object is rendered at all.
 */

/**
 * Transformable provides the standard properties for position,
 * size, rotation, scaling, opacity, and visibility. It’s intended
 * to be extended by or mixed into other classes like GameObject or Shape.
 */
export class Transformable {
  /**
   * @param {TransformOptions} [options={}] - Transformation-related options.
   */
  constructor(options = {}) {
    /**
     * X-coordinate (center or anchor).
     * @type {number}
     */
    this.x = options.x ?? 0;

    /**
     * Y-coordinate (center or anchor).
     * @type {number}
     */
    this.y = options.y ?? 0;

    /**
     * Width of the object or shape.
     * @type {number}
     */
    this.width = options.width ?? 0;

    /**
     * Height of the object or shape.
     * @type {number}
     */
    this.height = options.height ?? 0;

    /**
     * Rotation in radians.
     * @type {number}
     */
    this.rotation = options.rotation ?? 0;

    /**
     * Horizontal scale factor.
     * @type {number}
     */
    this.scaleX = options.scaleX ?? 1;

    /**
     * Vertical scale factor.
     * @type {number}
     */
    this.scaleY = options.scaleY ?? 1;

    /**
     * Opacity from 0 (transparent) to 1 (fully visible).
     * @type {number}
     */
    this.opacity = options.opacity ?? 1;

    /**
     * Whether this object or shape is rendered at all.
     * @type {boolean}
     */
    this.visible = options.visible !== undefined ? options.visible : true;
  }
}

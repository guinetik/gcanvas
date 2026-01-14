import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * RightTriangle
 * -------------
 *
 * A right isoceles triangle shape, commonly used in tangram puzzles.
 *
 * The triangle has:
 * - Two equal legs of length `leg`
 * - A right angle (90°) at one corner
 * - Hypotenuse = leg × √2
 *
 * ### Positioning
 *
 * The triangle is centered at its centroid (center of mass).
 * Before rotation, the right angle points toward the bottom-left (-135° from center).
 *
 * ```
 *        ●────────● (leg, 0)
 *       /|
 *      / |
 *     /  |  centroid at (leg/3, leg/3)
 *    /   |
 *   ●────┘ right angle at origin
 * (0, leg)
 * ```
 *
 * ### Rotation Reference
 *
 * To orient the right angle toward a specific direction:
 * - Right angle pointing RIGHT: rotation = 0°
 * - Right angle pointing DOWN: rotation = 90°
 * - Right angle pointing LEFT: rotation = 180°
 * - Right angle pointing UP: rotation = 270°
 *
 * Add 135° to these values since the default right angle is at -135° from centroid.
 *
 * @extends Shape
 */
export class RightTriangle extends Shape {
  /**
   * @param {number} leg - Length of the two equal legs
   * @param {Object} [options={}] - Shape options (x, y, rotation, color, stroke, etc.)
   */
  constructor(leg = 50, options = {}) {
    super(options);
    this._leg = leg;
    this._updateDimensions();
  }

  /** @type {number} Length of the equal legs */
  get leg() {
    return this._leg;
  }

  set leg(v) {
    this._leg = v;
    this._updateDimensions();
    this.invalidateCache();
  }

  /** @type {number} Length of the hypotenuse (leg × √2) */
  get hypotenuse() {
    return this._leg * Math.SQRT2;
  }

  _updateDimensions() {
    // Bounding box of the centered triangle
    this._width = this._leg;
    this._height = this._leg;
  }

  /**
   * Get the vertices of the triangle, centered at origin.
   * Right angle is at the adjusted (0,0) before centering.
   * @returns {Array<{x: number, y: number}>}
   */
  getVertices() {
    const leg = this._leg;
    // Original vertices: right angle at (0,0), legs along +x and +y
    // Centroid at (leg/3, leg/3)
    const cx = leg / 3;
    const cy = leg / 3;

    return [
      { x: -cx, y: -cy },           // Right angle corner
      { x: leg - cx, y: -cy },      // End of horizontal leg
      { x: -cx, y: leg - cy },      // End of vertical leg
    ];
  }

  draw() {
    super.draw();
    const vertices = this.getVertices();

    Painter.shapes.polygon(
      vertices,
      this.color,
      this.stroke,
      this.lineWidth,
      this.lineJoin
    );
  }

  calculateBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this._width,
      height: this._height,
    };
  }
}

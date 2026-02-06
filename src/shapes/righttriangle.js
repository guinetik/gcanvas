import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * RightTriangle
 * -------------
 *
 * A right isoceles triangle shape, commonly used in tangram puzzles.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Right angle at (0, 0), legs along +x and +y axes
 *
 * The triangle has:
 * - Two equal legs of length `leg`
 * - A right angle (90°) at one corner
 * - Hypotenuse = leg × √2
 *
 * ```
 * (0,0) ●────────● (leg, 0)
 *       |       /
 *       |      /
 *       |     /
 *       |    /
 *       |   /
 *       ●  / (0, leg)
 * ```
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
    // Bounding box of the triangle
    this._width = this._leg;
    this._height = this._leg;
  }

  /**
   * Get the vertices of the triangle, relative to bounding box at (0, 0).
   * Right angle is at (0, 0).
   * @returns {Array<{x: number, y: number}>}
   */
  getVertices() {
    const leg = this._leg;

    // Vertices relative to bounding box at (0, 0)
    return [
      { x: 0, y: 0 },         // Right angle corner (top-left)
      { x: leg, y: 0 },       // End of horizontal leg (top-right)
      { x: 0, y: leg },       // End of vertical leg (bottom-left)
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

import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Parallelogram
 * -------------
 *
 * A four-sided shape with opposite sides parallel. The shape is defined by
 * its width, height, and slant offset.
 *
 * ### Geometry
 *
 * ```
 *    slant
 *   ├───┤
 *   ●───────────● ─┬─
 *  /           /   │ height
 * ●───────────●   ─┴─
 * ├───────────┤
 *     width
 * ```
 *
 * - `width`: Length of the top and bottom edges
 * - `height`: Perpendicular distance between top and bottom
 * - `slant`: Horizontal offset of top edge relative to bottom (positive = right, negative = left)
 *
 * ### Positioning
 *
 * The shape is centered at its geometric center (centroid).
 *
 * @extends Shape
 */
export class Parallelogram extends Shape {
  /**
   * @param {Object} [options={}] - Shape options
   * @param {number} [options.width=100] - Width of the parallel edges
   * @param {number} [options.height=50] - Height (perpendicular distance)
   * @param {number} [options.slant] - Horizontal offset of top edge (defaults to height for 45° slant)
   * @param {boolean} [options.flipX=false] - Mirror horizontally (slant in opposite direction)
   */
  constructor(options = {}) {
    super(options);
    this._pgWidth = options.width ?? 100;
    this._pgHeight = options.height ?? 50;
    this._slant = options.slant ?? this._pgHeight; // Default 45° slant
    this._flipX = options.flipX ?? false;
    this._updateDimensions();
  }

  /** @type {number} Width of the parallel edges */
  get pgWidth() {
    return this._pgWidth;
  }

  set pgWidth(v) {
    this._pgWidth = v;
    this._updateDimensions();
    this.invalidateCache();
  }

  /** @type {number} Height (perpendicular distance between edges) */
  get pgHeight() {
    return this._pgHeight;
  }

  set pgHeight(v) {
    this._pgHeight = v;
    this._updateDimensions();
    this.invalidateCache();
  }

  /** @type {number} Horizontal offset of top edge */
  get slant() {
    return this._slant;
  }

  set slant(v) {
    this._slant = v;
    this._updateDimensions();
    this.invalidateCache();
  }

  /** @type {boolean} Whether to mirror horizontally */
  get flipX() {
    return this._flipX;
  }

  set flipX(v) {
    this._flipX = v;
    this.invalidateCache();
  }

  _updateDimensions() {
    // Bounding box includes the slant
    this._width = this._pgWidth + Math.abs(this._slant);
    this._height = this._pgHeight;
  }

  /**
   * Get the vertices of the parallelogram, centered at origin.
   * @returns {Array<{x: number, y: number}>}
   */
  getVertices() {
    const w = this._pgWidth;
    const h = this._pgHeight;
    let slant = this._slant;

    if (this._flipX) {
      slant = -slant;
    }

    // Calculate total width for centering
    const totalWidth = w + Math.abs(slant);
    const offsetX = -totalWidth / 2 + (slant < 0 ? -slant : 0);

    // Vertices: bottom-left, bottom-right, top-right, top-left
    // Bottom edge at y = h/2, top edge at y = -h/2
    return [
      { x: offsetX, y: h / 2 },                    // Bottom-left
      { x: offsetX + w, y: h / 2 },                // Bottom-right
      { x: offsetX + w + slant, y: -h / 2 },       // Top-right
      { x: offsetX + slant, y: -h / 2 },           // Top-left
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

import { Painter } from "../painter/painter.js";
import { Transformable } from "./transformable.js";

/**
 * Shape
 * ------
 *
 * A base class for drawable geometric primitives (e.g., rectangles, circles).
 *
 * ### Role in the Engine
 *
 * Shape is the first class in the gcanvas hierarchy to express **canvas styling intent**.
 * It does not define geometry — that's up to the subclass — but it introduces:
 *
 * - Fill & stroke control
 * - Line width & join styles
 * - Shadow blur (inherited from `Renderable`)
 *
 * ### Styling Options
 *
 * Most canvas drawing operations respect the following:
 * - `color`
 * - `stroke`
 * - `lineWidth`
 * - `lineJoin`
 * - `lineCap`
 * - `miterLimit`
 * - `globalAlpha` (inherited via `Renderable.opacity`)
 *
 * Subclasses must implement their own `.draw()` logic using these styles.
 *
 * @abstract
 * @extends Transformable
 */
export class Shape extends Transformable {
  /**
   * @param {number} x - X center of the shape
   * @param {number} y - Y center of the shape
   * @param {Object} [options={}] - Styling and layout options
   * @param {string|null} [options.color=null] - Fill color (CSS color string)
   * @param {string|null} [options.stroke=null] - Stroke color (CSS color string)
   * @param {number} [options.lineWidth=1] - Line width in pixels
   * @param {string} [options.lineJoin="miter"] - "miter", "round", or "bevel"
   * @param {string} [options.lineCap="butt"] - "butt", "round", or "square"
   * @param {number} [options.miterLimit=10] - Maximum miter length
   */
  constructor(options = {}) {
    super(options);
    this._color = options.color ?? null;
    this._stroke = options.stroke ?? null;
    this._lineWidth = options.lineWidth ?? 1;
    this._lineJoin = options.lineJoin ?? "miter";
    this._lineCap = options.lineCap ?? "butt";
    this._miterLimit = options.miterLimit ?? 10;
    this.logger.log("Shape", this.x, this.y, this.width, this.height);
  }

  /** @type {string|null} Fill style for canvas fill operations */
  get color() {
    return this._color;
  }

  set color(v) {
    this._color = v;
    this.invalidateCache();
  }

  /** @type {string|null} Stroke style for canvas stroke operations */
  get stroke() {
    return this._stroke;
  }

  set stroke(v) {
    this._stroke = v;
    this.invalidateCache();
  }

  /** @type {number} Width of the stroke in pixels */
  get lineWidth() {
    return this._lineWidth;
  }

  set lineWidth(v) {
    this._lineWidth = Math.max(0, v);
    this.invalidateCache();
  }

  /** @type {"miter"|"round"|"bevel"} Style of line joins */
  get lineJoin() {
    return this._lineJoin;
  }

  set lineJoin(v) {
    this._lineJoin = v;
    this.invalidateCache();
  }

  /** @type {"butt"|"round"|"square"} Style of line caps */
  get lineCap() {
    return this._lineCap;
  }

  set lineCap(v) {
    this._lineCap = v;
    this.invalidateCache();
  }

  /** @type {number} Maximum miter length before switching to bevel */
  get miterLimit() {
    return this._miterLimit;
  }

  set miterLimit(v) {
    this._miterLimit = v;
    this.invalidateCache();
  }
}

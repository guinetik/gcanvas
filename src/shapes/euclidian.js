import { Loggable } from "../logger/loggable";
import { Painter } from "../painter/painter";
/**
 * Euclidian
 * ----------
 *
 * The root of all drawable objects in the gcanvas engine.
 *
 * This class defines the fundamental spatial contract:
 * - A 2D position in Euclidean space (`x`, `y`)
 * - A size (`width`, `height`)
 * - Optional debug rendering via `draw()` and `drawDebug()`
 *
 * ### Why This Exists
 *
 * Before something becomes a shape, a renderable, or a transformable object,
 * it first **exists in space**. This class introduces that concept of space,
 * without yet concerning itself with rendering pipelines, transformations,
 * or bounding box calculations.
 *
 * ### Core Characteristics
 *
 * - Provides visual presence on the canvas by exposing spatial dimensions
 * - Supports debug drawing for bounding boxes (green by default)
 * - Serves as the base class for all shape, UI, and layout components
 *
 * This class is intended to be subclassed and never used directly.
 *
 * @abstract
 * @extends Loggable
 */
export class Euclidian extends Loggable {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.x=0] - X position (center-based)
   * @param {number} [options.y=0] - Y position (center-based)
   * @param {number} [options.width=0] - Width in pixels
   * @param {number} [options.height=0] - Height in pixels
   * @param {boolean} [options.debug=false] - Enables visual debug overlay
   * @param {string} [options.debugColor="#0f0"] - Outline color for debug box
   */
  constructor(options = {}) {
    super(options);
    this._x = typeof options.x === "number" ? options.x : 0;
    this._y = typeof options.y === "number" ? options.y : 0;
    this._width = typeof options.width === "number" ? options.width : 0;
    this._height = typeof options.height === "number" ? options.height : 0;
    this.logger.log("Euclidian", this._x, this._y, this._width, this._height);
  }

  /** @type {number} X center position in canvas space */
  get x() {
    return this._x;
  }
  set x(v) {
    this.validateProp(v, "x");
    this._x = v;
  }

  /** @type {number} Y center position in canvas space */
  get y() {
    return this._y;
  }
  set y(v) {
    this.validateProp(v, "y");
    this._y = v;
  }

  /** @type {number} Width of the object (must be ≥ 0) */
  get width() {
    return this._width;
  }
  set width(v) {
    this.validateProp(v, "width");
    this._width = Math.max(0, v);
  }

  /** @type {number} Height of the object (must be ≥ 0) */
  get height() {
    return this._height;
  }
  set height(v) {
    this.validateProp(v, "height");
    this._height = Math.max(0, v);
  }

  /** @type {boolean} Whether to draw the debug box outline */
  get debug() {
    return this._debug;
  }
  set debug(v) {
    this.validateProp(v, "debug");
    this._debug = Boolean(v);
  }

  /** @type {string} Color of the debug box (e.g. "#0f0" or "red") */
  get debugColor() {
    return this._debugColor;
  }
  set debugColor(v) {
    this.validateProp(v, "debugColor");
    this._debugColor = v;
  }

  validateProp(v, prop) {
    //this.trace("Euclidian.validateProp " + prop + " = " + v);
    if (v === undefined || v === null) {
      throw new Error("Invalid property value: " + prop + " " + v);
    }
  }
}

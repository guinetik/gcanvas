import { Loggable } from "../logger/loggable";
import { Painter } from "../painter/painter";
import { Position } from "../util/position.js";

/**
 * Mapping from Position constants to normalized origin values (0-1).
 * Used to convert named anchors to originX/originY values.
 */
export const ORIGIN_MAP = {
  [Position.TOP_LEFT]:      { x: 0,   y: 0   },
  [Position.TOP_CENTER]:    { x: 0.5, y: 0   },
  [Position.TOP_RIGHT]:     { x: 1,   y: 0   },
  [Position.CENTER_LEFT]:   { x: 0,   y: 0.5 },
  [Position.CENTER]:        { x: 0.5, y: 0.5 },
  [Position.CENTER_RIGHT]:  { x: 1,   y: 0.5 },
  [Position.BOTTOM_LEFT]:   { x: 0,   y: 1   },
  [Position.BOTTOM_CENTER]: { x: 0.5, y: 1   },
  [Position.BOTTOM_RIGHT]:  { x: 1,   y: 1   },
};

/**
 * Euclidian
 * ----------
 *
 * The root of all drawable objects in the gcanvas engine.
 *
 * This class defines the fundamental spatial contract:
 * - A 2D position in Euclidean space (`x`, `y`)
 * - A size (`width`, `height`)
 * - An origin point (`originX`, `originY`) that defines where `x`, `y` positions the object
 * - Optional debug rendering via `draw()` and `drawDebug()`
 *
 * ### Why This Exists
 *
 * Before something becomes a shape, a renderable, or a transformable object,
 * it first **exists in space**. This class introduces that concept of space,
 * without yet concerning itself with rendering pipelines, transformations,
 * or bounding box calculations.
 *
 * ### Coordinate System (v3.0)
 *
 * GCanvas uses a **configurable origin** system inspired by Adobe Flash:
 * - `x`, `y` position the **origin point** of the object
 * - `originX`, `originY` define where that origin is (0-1 normalized values)
 * - By default, origin is (0, 0) = top-left, matching canvas API convention
 * - Set `origin: "center"` or `originX: 0.5, originY: 0.5` for center-based positioning
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
   * @param {number} [options.x=0] - X position (origin-based)
   * @param {number} [options.y=0] - Y position (origin-based)
   * @param {number} [options.width=0] - Width in pixels
   * @param {number} [options.height=0] - Height in pixels
   * @param {number} [options.originX=0] - X origin (0=left, 0.5=center, 1=right)
   * @param {number} [options.originY=0] - Y origin (0=top, 0.5=center, 1=bottom)
   * @param {string} [options.origin] - Origin shorthand using Position constants
   * @param {boolean} [options.debug=false] - Enables visual debug overlay
   * @param {string} [options.debugColor="#0f0"] - Outline color for debug box
   */
  constructor(options = {}) {
    super(options);
    this._x = typeof options.x === "number" ? options.x : 0;
    this._y = typeof options.y === "number" ? options.y : 0;
    this._width = typeof options.width === "number" ? options.width : 0;
    this._height = typeof options.height === "number" ? options.height : 0;

    // Initialize origin from shorthand or explicit values
    // Default is (0, 0) = top-left
    if (options.origin !== undefined) {
      const mapped = ORIGIN_MAP[options.origin];
      if (mapped) {
        this._originX = mapped.x;
        this._originY = mapped.y;
      } else {
        // Unknown origin string - fallback to top-left
        this._originX = 0;
        this._originY = 0;
      }
    } else {
      this._originX = typeof options.originX === "number" ? options.originX : 0;
      this._originY = typeof options.originY === "number" ? options.originY : 0;
    }

    this.logger.log("Euclidian", this._x, this._y, this._width, this._height, "origin:", this._originX, this._originY);
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

  /**
   * X origin as a normalized value (0-1).
   * 0 = left edge, 0.5 = center, 1 = right edge.
   * @type {number}
   */
  get originX() {
    return this._originX;
  }
  set originX(v) {
    this.validateProp(v, "originX");
    this._originX = v;
  }

  /**
   * Y origin as a normalized value (0-1).
   * 0 = top edge, 0.5 = center, 1 = bottom edge.
   * @type {number}
   */
  get originY() {
    return this._originY;
  }
  set originY(v) {
    this.validateProp(v, "originY");
    this._originY = v;
  }

  /**
   * Gets the current origin as a Position constant (if it matches one).
   * Returns undefined if the origin doesn't match a standard position.
   * @type {string|undefined}
   */
  get origin() {
    for (const [key, value] of Object.entries(ORIGIN_MAP)) {
      if (value.x === this._originX && value.y === this._originY) {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Sets the origin using a Position constant or string shorthand.
   * @param {string} v - Position constant (e.g., Position.CENTER or "center")
   */
  set origin(v) {
    const mapped = ORIGIN_MAP[v];
    if (mapped) {
      this._originX = mapped.x;
      this._originY = mapped.y;
    }
  }

  validateProp(v, prop) {
    //this.trace("Euclidian.validateProp " + prop + " = " + v);
    if (v === undefined || v === null) {
      throw new Error("Invalid property value: " + prop + " " + v);
    }
  }
}

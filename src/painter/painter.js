import { Logger } from "../logger/logger";
import { PainterColors } from "./painter.colors";
import { PainterEffects } from "./painter.effects";
import { PainterImages } from "./painter.img";
import { PainterLines } from "./painter.lines";
import { PainterOpacity } from "./painter.opacity";
import { PainterShapes } from "./painter.shapes";
import { PainterText } from "./painter.text";

/**
 * Painter - Static utility class for all canvas drawing operations
 * Provides a cleaner API for common canvas operations with additional utilities
 */
export class Painter {
  static #_colors = null;
  static #_effects = null;
  static #_img = null;
  static #_lines = null;
  static #_opacity = null;
  static #_shapes = null;
  static #_text = null;

  static #checkInitialized(propName, value) {
    if (!value) {
        throw new Error(`Painter.${propName} is not initialized. Call Painter.init(ctx) first.`);
    }
  }

  /**
   * @type {PainterColors}
   */
  static get colors() {
    this.#checkInitialized('colors', this.#_colors);
    return this.#_colors;
  }
  /**
   * @type {PainterEffects}
   */
  static get effects() {
    this.#checkInitialized('effects', this.#_effects);
    return this.#_effects;
  }
  /**
   * @type {PainterImages}
   */
  static get img() {
      this.#checkInitialized('img', this.#_img);
      return this.#_img;
  }
  /**
   * @type {PainterLines}
   */
  static get lines() {
      this.#checkInitialized('lines', this.#_lines);
      return this.#_lines;
  }
  /**
   * @type {PainterOpacity}
   */
  static get opacity() {
      this.#checkInitialized('opacity', this.#_opacity);
      return this.#_opacity;
  }
  /**
   * @type {PainterShapes}
   */
  static get shapes() {
      this.#checkInitialized('shapes', this.#_shapes);
      return this.#_shapes;
  }
  /**
   * @type {PainterText}
   */
  static get text() {
      this.#checkInitialized('text', this.#_text);
      return this.#_text;
  }
  /**
   * @type {Logger}
   */
  static logger;

  static set ctx(ctx) {
    this._ctx = ctx;
  }

  static get ctx() {
    if (!this._ctx) {
      throw new Error("Cannot access Painter.ctx before initialization!");
    }
    return this._ctx;
  }

  /**
   * Initialize the painter with a canvas context
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   */
  static init(ctx) {
    this._ctx = ctx;
    this.saveStack = [];
    this.#_colors = PainterColors;
    this.#_effects = PainterEffects;
    this.#_img = PainterImages;
    this.#_lines = PainterLines;
    this.#_opacity = PainterOpacity;
    this.#_shapes = PainterShapes;
    this.#_text = PainterText;
    Painter.logger = Logger.getLogger("Painter");
    Painter.saveStack = [];
  }

  static save() {
    // Extract just the method name from the stack trace
    const stackLine = new Error().stack.split("\n")[2] || "";
    const methodMatch = stackLine.match(/at\s+(\w+)\.(\w+)/);
    const callerInfo = methodMatch
      ? `${methodMatch[1]}.${methodMatch[2]}`
      : "unknown";

    // Add to tracking stack
    this.saveStack.push(callerInfo);

    // Log with caller info
    this.logger.log(`Painter.save() by: ${callerInfo}`);

    // Perform actual save
    this.ctx.save();
    Painter.opacity.saveOpacityState();
  }

  static restore() {
    // Check for stack underflow
    if (this.saveStack.length === 0) {
      console.error("PAINTER ERROR: restore() without matching save()!");
      return;
    }

    // Get the matching caller from stack
    const caller = this.saveStack.pop();

    // Log with caller info
    this.logger.log(`Painter.restore() balancing save from: ${caller}`);

    // Perform actual restore
    this.ctx.restore();
    this.ctx.fillStyle = null;
    this.ctx.strokeStyle = null;
    Painter.opacity.restoreOpacityState();
  }

  static translateTo(x, y) {
    // make sure x a valid number not NaN or undefined. default to 0 if so
    if (isNaN(x) || x === undefined) {
      x = 0;
    }
    if (isNaN(y) || y === undefined) {
      y = 0;    
    }
    this.logger.log("moveTo", x, y);
    this.ctx.translate(x, y);
  }

  static resetPosition() {
    // Reset just the translation portion of the transform
    this.logger.log("resetPosition");
    const transform = this.ctx.getTransform();
    this.ctx.setTransform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      0,
      0
    );
  }

  static withPosition(x, y, callback) {
    this.logger.log("withPosition", x, y);
    this.save();
    this.translateTo(x, y);
    callback();
    this.restore();
  }

  /**
   * Clear the entire canvas or a specific rectangle
   * @param {number} [x=0] - X coordinate
   * @param {number} [y=0] - Y coordinate
   * @param {number} [width=canvas.width] - Width
   * @param {number} [height=canvas.height] - Height
   * @returns {void}
   */
  static clear(
    x = 0,
    y = 0,
    width = Painter.ctx.canvas.width,
    height = Painter.ctx.canvas.height
  ) {
    Painter.ctx.clearRect(x, y, width, height);
  }

  /**
   * Translate the canvas
   * @param {number} x - X translation
   * @param {number} y - Y translation
   * @returns {void}
   */
  static translate(x, y) {
    Painter.ctx.translate(x, y);
  }

  /**
   * Rotate the canvas
   * @param {number} angle - Rotation angle in radians
   * @returns {void}
   */
  static rotate(angle) {
    Painter.logger.log("Painter.rotate", angle);
    Painter.ctx.rotate(angle);
  }

  /**
   * Scale the canvas
   * @param {number} x - X scale factor
   * @param {number} y - Y scale factor
   * @returns {void}
   */
  static scale(x, y) {
    Painter.logger.log("Painter.scale", x, y);
    Painter.ctx.scale(x, y);
  }
}

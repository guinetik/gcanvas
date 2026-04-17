/************************************************************
 * Text.js
 *
 * A simple GameObject for drawing styled text on the canvas.
 * Supports optional stroke, alignment, and baseline.
 ************************************************************/

import { GameObject } from "./go.js";
import { GameObjectShapeWrapper } from "./wrapper.js";
import { Painter } from "../../painter/painter.js";
import { TextShape } from "../../shapes/text.js";
import { UI_THEME } from "../ui/theme.js";

/**
 * Text - Renders a string onto the canvas using the Painter API.
 * @extends GameObjectShapeWrapper
 *
 * Creates a GameObject that wraps a TextShape, providing a convenient API
 * for text rendering with support for styling, alignment, and measurement.
 *
 * @example
 * ```js
 * const myText = new Text(game, "Hello World!", {
 *   x: 100,
 *   y: 50,
 *   font: "20px Arial",
 *   color: "#ff0",
 *   align: "center",
 *   baseline: "middle",
 *   stroke: true,
 *   strokeColor: "#000",
 *   lineWidth: 2,
 * });
 * game.pipeline.add(myText);
 * ```
 */
export class Text extends GameObjectShapeWrapper {
  /**
   * Create a Text component
   * @param {Game} game - The main game instance
   * @param {string} text - The text content to display
   * @param {object} [options={}] - Configuration options
   * @param {number} [options.x=0] - X-position
   * @param {number} [options.y=0] - Y-position
   * @param {string} [options.font] - CSS-style font string (defaults to `UI_THEME.fonts.gameObjectText`)
   * @param {string} [options.color="#fff"] - Text color
   * @param {string} [options.align="left"] - Text alignment
   * @param {string} [options.baseline="top"] - Text baseline
   * @param {boolean} [options.stroke=false] - Whether to stroke the text
   * @param {string} [options.strokeColor="#000"] - Stroke color
   * @param {number} [options.lineWidth=1] - Stroke width
   * @param {boolean} [options.interactive=false] - Whether the text should be interactive
   * @param {string} [options.anchor] - Optional anchor position (e.g., "top-left", "center")
   * @param {number} [options.padding] - Padding when using anchors
   */
  constructor(game, text, options = {}) {
    const defaultFont = options.font || UI_THEME.fonts.gameObjectText;
    // Create the TextShape
    const textShape = new TextShape(text, {
      font: defaultFont,
      color: options.color || "yellow",
      align: options.align || "left",
      baseline: options.baseline || "top",
      strokeColor: options.strokeColor || "#000",
      lineWidth: options.lineWidth || 1,
      debugColor: options.debugColor || "yellow",
      origin: options.origin,
      debug: options.debug,
    });
    // Pass the shape to the parent GameObjectShapeWrapper
    super(game, textShape, options);
    // Store reference to text-specific options for direct access
    this._textOptions = {
      font: defaultFont,
      color: options.color || "yellow",
      align: options.align || "left",
      baseline: options.baseline || "top",
    };
  }

  /**
   * Get the text content
   * @returns {string} Current text
   */
  get text() {
    return this.shape.text;
  }

  /**
   * Set the text content
   * @param {string} value - New text to display
   */
  set text(value) {
    this.shape.text = value;
    this.markBoundsDirty();
    // Eagerly pull the shape's freshly-measured dimensions up to the wrapper
    // so any parent layout pass that runs this frame sees the new size.
    // Without this, LayoutScene.update reads stale widths (runs before child
    // updates can sync) and stacks multi-text layouts at y=0 for one frame.
    if (this.shape._width) this._width = this.shape._width;
    if (this.shape._height) this._height = this.shape._height;
  }

  /**
   * Get the font style
   * @returns {string} Current font
   */
  get font() {
    return this.shape.font;
  }

  /**
   * Set the font style
   * @param {string} value - New font style
   */
  set font(value) {
    this.shape.font = value;
    this._textOptions.font = value;
    this.markBoundsDirty();
  }

  /**
   * Get the text color
   * @returns {string} Current color
   */
  get color() {
    return this.shape.color;
  }

  /**
   * Set the text color
   * @param {string} value - New color
   */
  set color(value) {
    this.shape.color = value;
    this._textOptions.color = value;
  }

  /**
   * Get text alignment
   * @returns {string} Current alignment
   */
  get align() {
    return this.shape.align;
  }

  /**
   * Set text alignment
   * @param {string} value - New alignment
   */
  set align(value) {
    this.shape.align = value;
    this._textOptions.align = value;
    this.markBoundsDirty();
  }

  /**
   * Get text baseline
   * @returns {string} Current baseline
   */
  get baseline() {
    return this.shape.baseline;
  }

  /**
   * Set text baseline
   * @param {string} value - New baseline
   */
  set baseline(value) {
    this.shape.baseline = value;
    this._textOptions.baseline = value;
    this.markBoundsDirty();
  }

  /**
   * Calculate the width based on the text content
   * @returns {number} Approximate width of the text
   */
  measureWidth() {
    if (!Painter.ctx) return 0;
    const width = Painter.text.measureTextWidth(this.text, this.font);
    return width;
  }

  /**
   * Calculate the height based on the font size
   * @returns {number} Approximate height of the text
   */
  measureHeight() {
    if (!this.font) return 16; // Default font size as fallback

    // Extract font size from font string (e.g., "16px Arial" → 16)
    const fontSize = parseInt(this.font);
    return isNaN(fontSize) ? 16 : fontSize;
  }

  /**
   * Gets the text bounds accounting for alignment and baseline
   * @returns {Object} Bounds object with { x, y, width, height }
   */
  getBounds() {
    const bounds = super.getBounds();

    // If the shape has alignment-aware bounds, use those
    if (this.shape.getTextBounds) {
      const textBounds = this.shape.getTextBounds();
      return {
        x: this.x,
        y: this.y,
        width: textBounds.width,
        height: textBounds.height,
      };
    }

    return bounds;
  }

  /**
   * Get debug bounds in local space, accounting for origin.
   * @returns {{x: number, y: number, width: number, height: number}} Debug bounds
   */
  getDebugBounds() {
    // Delegate to the shape's debug bounds if available
    if (this.shape && this.shape.getDebugBounds) {
      return this.shape.getDebugBounds();
    }
    // Fallback to parent implementation
    return super.getDebugBounds();
  }

  /**
   * Updates the GameObject and the wrapped TextShape
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);

    // Mirror the shape's measured dimensions back onto the wrapper so layout
    // systems (VerticalLayout, etc.) see correct widths. The shape is
    // authoritative for text dimensions because TextShape._calculateBounds
    // measures against the current font + text.
    if (this.shape) {
      if (this.shape.width) this._width = this.shape.width;
      if (this.shape.height) this._height = this.shape.height;
    }
  }

  /**
   * Override the wrapper sync so it does NOT push width/height onto the
   * shape. TextShape measures its own dimensions from font metrics; if the
   * wrapper force-synced zero-width down it would corrupt the shape and
   * break TextShape.draw's alignment offset calculation.
   */
  syncPropertiesToShape() {
    if (!this.shape) return;
    const propsToSync = [
      "rotation", "scaleX", "scaleY", "visible", "debug", "debugColor"
    ];
    for (const prop of propsToSync) {
      if (prop in this && prop in this.shape) {
        if (this[prop] !== this.shape[prop]) {
          this.shape[prop] = this[prop];
        }
      }
    }
  }
}

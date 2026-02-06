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
   * @param {string} [options.font="16px monospace"] - CSS-style font string
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
    // Create the TextShape
    const textShape = new TextShape(text, {
      font: options.font || "16px monospace",
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
      font: options.font || "16px monospace",
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

    // Sync dimensions from the text shape only if not explicitly set
    // Check if width/height were set via options (they would be non-zero)
    if (this.shape) {
      // Only auto-size if width/height are 0 or not set
      if (!this._width || this._width === 0) {
        this._width = this.shape.width || this.measureWidth();
      }
      if (!this._height || this._height === 0) {
        this._height = this.shape.height || this.measureHeight();
      }
    }
  }
}

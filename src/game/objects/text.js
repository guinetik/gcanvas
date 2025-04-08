/************************************************************
 * Text.js
 *
 * A simple GameObject for drawing styled text on the canvas.
 * Supports optional stroke, alignment, and baseline.
 ************************************************************/

import { GameObject } from "../go.js";
import { Painter } from "../../painter.js";

/**
 * Text - Renders a string onto the canvas using the Painter API.
 *
 * Example:
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
export class Text extends GameObject {
  /**
   * Create a Text GameObject.
   * @param {Game} game - The main game instance.
   * @param {string} text - The text content to display.
   * @param {object} [options] - Customization settings for position, style, etc.
   * @param {number} [options.x=0] - X-position of the text (top-left by default).
   * @param {number} [options.y=0] - Y-position of the text (top-left by default).
   * @param {string} [options.font="16px monospace"] - CSS-style font string (size + family).
   * @param {string} [options.color="#fff"] - Fill color for the text.
   * @param {string} [options.align="left"] - Canvas text alignment (left, right, center, etc.).
   * @param {string} [options.baseline="top"] - Canvas text baseline (top, middle, bottom, etc.).
   * @param {boolean} [options.stroke=false] - Whether to render a stroke around the text.
   * @param {string} [options.strokeColor="#000"] - Color for the text stroke.
   * @param {number} [options.lineWidth=1] - Stroke width.
   */
  constructor(game, text, options = {}) {
    super(game, options);

    /**
     * The string to be drawn on screen.
     * @type {string}
     */
    this.text = text;

    // Position
    this.x = options.x || 0;
    this.y = options.y || 0;

    // Font Style
    this.font = options.font || "16px monospace";
    this.color = options.color || "#fff";
    this.align = options.align || "left";
    this.baseline = options.baseline || "top";

    // Stroke Style
    this.stroke = options.stroke || false;
    this.strokeColor = options.strokeColor || "#000";
    this.lineWidth = options.lineWidth || 1;
  }

  /**
   * Called every frame by the pipeline to render the text at (x, y).
   */
  render() {
    Painter.setFont(this.font);
    Painter.setTextAlign(this.align);
    Painter.setTextBaseline(this.baseline);

    if (this.stroke) {
      Painter.strokeText(
        this.text,
        this.x,
        this.y,
        this.strokeColor,
        this.lineWidth,
        this.font
      );
    }

    Painter.fillText(this.text, this.x, this.y, this.color, this.font);
  }
}

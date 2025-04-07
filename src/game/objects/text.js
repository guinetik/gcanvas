import { GameObject } from "../go.js";
import { Painter } from "../../painter.js";

/**
 * Text - A GameObject for drawing styled text.
 */
export class Text extends GameObject {
  /**
   * @param {Game} game
   * @param {string} text - The text to display
   * @param {object} [options]
   * @param {number} [options.x=0]
   * @param {number} [options.y=0]
   * @param {string} [options.font="16px monospace"]
   * @param {string} [options.color="#fff"]
   * @param {string} [options.align="left"]
   * @param {string} [options.baseline="top"]
   * @param {boolean} [options.stroke=false]
   * @param {string} [options.strokeColor="#000"]
   * @param {number} [options.lineWidth=1]
   */
  constructor(game, text, options = {}) {
    super(game, options);
    this.text = text;

    this.x = options.x || 0;
    this.y = options.y || 0;
    this.font = options.font || "16px monospace";
    this.color = options.color || "#fff";
    this.align = options.align || "left";
    this.baseline = options.baseline || "top";

    this.stroke = options.stroke || false;
    this.strokeColor = options.strokeColor || "#000";
    this.lineWidth = options.lineWidth || 1;
  }

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

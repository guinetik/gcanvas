import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

/**
 * TextShape - A drawable text shape that supports rotation, scaling, and grouping.
 * Intended for use inside a Group.
 */
export class TextShape extends Shape {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {object} options
   * @param {string} [options.font="12px monospace"]
   * @param {string} [options.color="#000"]
   * @param {string} [options.align="center"]
   * @param {string} [options.baseline="top"]
   */
  constructor(x, y, text, options = {}) {
    super(x, y, options);
    this.text = text;
    this.font = options.font || "12px monospace";
    this.color = options.color || "#000";
    this.align = options.align || "center";
    this.baseline = options.baseline || "top";
  }

  draw() {
    super.draw();
    this.renderWithTransform(() => {
      Painter.setFont(this.font);
      Painter.setTextAlign(this.align);
      Painter.setTextBaseline(this.baseline);
      Painter.fillText(this.text, 0, 0, this.color);
    });
  }

  getBounds() {
    this.width = Painter.measureText(this.text);
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: parseInt(this.font), // rough height guess from font size
    };
  }
}

import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * PatternRectangle - A drawable centered rectangle filled with a pattern.
 * Supports lazy image loading and CanvasImageSource types.
 */
export class PatternRectangle extends Shape {
  /**
   * @param {CanvasImageSource|null} image - Optional pattern source
   * @param {string} [repetition='repeat'] - Pattern repetition mode
   * @param {Object} [options] - Shape rendering options
   */
  constructor(image = null, repetition = "repeat", options = {}) {
    super(options);
    this.image = image;
    this.repetition = repetition;
    this.pattern = null;

    if (image) this._tryCreatePattern(image);
  }

  _tryCreatePattern(image) {
    const isAsyncImage =
      image instanceof HTMLImageElement ||
      (typeof image.complete === "boolean");

    if (isAsyncImage) {
      if (image.complete) {
        this._createPattern();
      } else {
        image.addEventListener("load", () => this._createPattern(), {
          once: true,
        });
      }
    } else {
      this._createPattern();
    }
  }

  _createPattern() {
    this.pattern = Painter.img.createPattern(this.image, this.repetition);
  }

  setImage(image, repetition) {
    this.image = image;
    if (repetition) this.repetition = repetition;
    this.pattern = null;
    this._tryCreatePattern(image);
  }

  draw() {
    super.draw();

    if (!this.pattern && this.image) {
      this._tryCreatePattern(this.image);
    }

    const x = -this.width / 2;
    const y = -this.height / 2;

    if (this.pattern) {
      Painter.img.fillPattern(
        this.pattern,
        x,
        y,
        this.width,
        this.height
      );
    } else if (this.strokeColor) {
      Painter.shapes.outlineRect(
        x,
        y,
        this.width,
        this.height,
        this.strokeColor,
        this.lineWidth
      );
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

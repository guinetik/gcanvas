import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * PatternRectangle - A drawable centered rectangle filled with a pattern.
 *
 * Draws a rectangle from its center filled with an image pattern.
 */
export class PatternRectangle extends Shape {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {HTMLImageElement|HTMLCanvasElement} image - Image to create pattern from
   * @param {string} [repetition='repeat'] - 'repeat', 'repeat-x', 'repeat-y', or 'no-repeat'
   * @param {Object} [options] - Shape rendering options
   */
  constructor(x, y, width, height, image, repetition = "repeat", options = {}) {
    super(x, y, options);
    this.width = width;
    this.height = height;
    this.image = image;
    this.repetition = repetition;
    this.pattern = null;

    // Initialize pattern if image is already loaded
    if (image.complete) {
      this.createPattern();
    } else {
      // Set up image load event handler
      image.addEventListener("load", () => this.createPattern());
    }
  }

  /**
   * Creates the pattern from the image
   * @private
   */
  createPattern() {
    this.pattern = Painter.img.createPattern(this.image, this.repetition);
  }

  /**
   * Renders the pattern-filled rectangle
   */
  draw() {
    super.draw();

    // Skip drawing if pattern isn't ready
    if (!this.pattern && this.image.complete) {
      this.createPattern();
    }

    const x = -this.width / 2;
    const y = -this.height / 2;

    if (this.pattern) {
      // Use fillPattern if pattern is available
      Painter.fillPattern(
        this.image,
        this.repetition,
        x,
        y,
        this.width,
        this.height
      );
    } else if (this.strokeColor) {
      // Fallback to just the outline if pattern isn't ready
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

  /**
   * Update the pattern image
   * @param {HTMLImageElement|HTMLCanvasElement} image - New image for pattern
   * @param {string} [repetition] - New repetition style (optional)
   */
  setImage(image, repetition) {
    this.image = image;
    if (repetition) this.repetition = repetition;
    this.pattern = null; // Reset pattern

    if (image.complete) {
      this.createPattern();
    } else {
      image.addEventListener("load", () => this.createPattern());
    }
  }

  /**
   * Returns the bounding box
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

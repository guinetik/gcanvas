import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Arrow - An arrow shape pointing right.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Arrow center is at (length/2, width/2)
 */
export class Arrow extends Shape {
  constructor(length, options = {}) {
    super(options);
    this.length = length;
    // Set bounding box dimensions
    // Height is 2x width for the arrowhead
    if (!options.width) {
      this.width = length * 0.3; // Default shaft width
    }
    this.height = this.width * 2;
  }

  draw() {
    super.draw();
    const headLength = this.length * 0.4;
    const shaftLength = this.length - headLength;
    const shaftWidth = this.width / 2;
    // Arrow center is at (length/2, height/2) from bounding box top-left
    const cx = this.length / 2;
    const cy = this.height / 2;

    Painter.lines.beginPath();
    // Start at left side of shaft, top edge
    Painter.lines.moveTo(cx - shaftLength / 2, cy - shaftWidth / 2);
    // Right side of shaft, top edge
    Painter.lines.lineTo(cx + shaftLength / 2 - headLength, cy - shaftWidth / 2);
    // Top notch of arrowhead
    Painter.lines.lineTo(cx + shaftLength / 2 - headLength, 0);
    // Arrow tip
    Painter.lines.lineTo(this.length, cy);
    // Bottom notch of arrowhead
    Painter.lines.lineTo(cx + shaftLength / 2 - headLength, this.height);
    // Right side of shaft, bottom edge
    Painter.lines.lineTo(cx + shaftLength / 2 - headLength, cy + shaftWidth / 2);
    // Left side of shaft, bottom edge
    Painter.lines.lineTo(cx - shaftLength / 2, cy + shaftWidth / 2);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

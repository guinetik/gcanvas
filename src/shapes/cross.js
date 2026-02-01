import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Cross - A cross shape (plus or X), useful for UI, health, or icons.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Cross center is at (size/2, size/2)
 */
export class Cross extends Shape {
  /**
   * @param {number} size - Full size of the cross (width/height of bounding square)
   * @param {number} thickness - Width of the cross arms
   * @param {Object} [options] - Fill/stroke/transform options
   * @param {boolean} [options.diagonal=false] - Whether to draw a rotated X instead of a + shape
   */
  constructor(size, thickness, options = {}) {
    super(options);
    this.size = size;
    this.thickness = thickness;
    this.width = size;
    this.height = size;
    this.diagonal = options.diagonal || false;
  }

  draw() {
    super.draw();
    const s = this.size / 2;
    const t = this.thickness / 2;
    // Cross center is at (s, s) from bounding box top-left
    const cx = s;
    const cy = s;

    if (this.diagonal) {
      // Draw an X (rotated +)
      Painter.lines.beginPath();
      Painter.lines.moveTo(cx - s, cy - s + t);
      Painter.lines.lineTo(cx - s + t, cy - s);
      Painter.lines.lineTo(cx, cy - t);
      Painter.lines.lineTo(cx + s - t, cy - s);
      Painter.lines.lineTo(cx + s, cy - s + t);
      Painter.lines.lineTo(cx + t, cy);
      Painter.lines.lineTo(cx + s, cy + s - t);
      Painter.lines.lineTo(cx + s - t, cy + s);
      Painter.lines.lineTo(cx, cy + t);
      Painter.lines.lineTo(cx - s + t, cy + s);
      Painter.lines.lineTo(cx - s, cy + s - t);
      Painter.lines.lineTo(cx - t, cy);
      Painter.lines.closePath();
    } else {
      // Draw a + shape
      Painter.lines.beginPath();
      Painter.lines.moveTo(cx - t, 0);
      Painter.lines.lineTo(cx + t, 0);
      Painter.lines.lineTo(cx + t, cy - t);
      Painter.lines.lineTo(this.size, cy - t);
      Painter.lines.lineTo(this.size, cy + t);
      Painter.lines.lineTo(cx + t, cy + t);
      Painter.lines.lineTo(cx + t, this.size);
      Painter.lines.lineTo(cx - t, this.size);
      Painter.lines.lineTo(cx - t, cy + t);
      Painter.lines.lineTo(0, cy + t);
      Painter.lines.lineTo(0, cy - t);
      Painter.lines.lineTo(cx - t, cy - t);
      Painter.lines.closePath();
    }

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

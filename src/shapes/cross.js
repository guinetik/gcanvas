import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Cross - A cross shape (plus or X), useful for UI, health, or icons.
 */
export class Cross extends Shape {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} size - Full size of the cross (width/height of bounding square)
   * @param {number} thickness - Width of the cross arms
   * @param {Object} [options] - Fill/stroke/transform options
   * @param {boolean} [options.diagonal=false] - Whether to draw a rotated X instead of a + shape
   */
  constructor(size, thickness, options = {}) {
    super(options);
    this.size = size;
    this.thickness = thickness;
    this.diagonal = options.diagonal || false;
  }

  draw() {
    super.draw();
    const s = this.size / 2;
      const t = this.thickness / 2;

      if (this.diagonal) {
        // Draw an X (rotated +)
        Painter.lines.beginPath();
        Painter.lines.moveTo(-s, -s + t);
        Painter.lines.lineTo(-s + t, -s);
        Painter.lines.lineTo(0, -t);
        Painter.lines.lineTo(s - t, -s);
        Painter.lines.lineTo(s, -s + t);
        Painter.lines.lineTo(t, 0);
        Painter.lines.lineTo(s, s - t);
        Painter.lines.lineTo(s - t, s);
        Painter.lines.lineTo(0, t);
        Painter.lines.lineTo(-s + t, s);
        Painter.lines.lineTo(-s, s - t);
        Painter.lines.lineTo(-t, 0);
        Painter.lines.closePath();
      } else {
        // Draw a + shape
        Painter.lines.beginPath();
        Painter.lines.moveTo(-t, -s);
        Painter.lines.lineTo(t, -s);
        Painter.lines.lineTo(t, -t);
        Painter.lines.lineTo(s, -t);
        Painter.lines.lineTo(s, t);
        Painter.lines.lineTo(t, t);
        Painter.lines.lineTo(t, s);
        Painter.lines.lineTo(-t, s);
        Painter.lines.lineTo(-t, t);
        Painter.lines.lineTo(-s, t);
        Painter.lines.lineTo(-s, -t);
        Painter.lines.lineTo(-t, -t);
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

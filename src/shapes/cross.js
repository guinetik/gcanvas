import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

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
  constructor(x, y, size, thickness, options = {}) {
    super(x, y, options);
    this.size = size;
    this.thickness = thickness;
    this.diagonal = options.diagonal || false;
  }

  draw() {
    this.applyConstraints();

    this.renderWithTransform(() => {
      const s = this.size / 2;
      const t = this.thickness / 2;

      if (this.diagonal) {
        // Draw an X (rotated +)
        Painter.ctx.beginPath();
        Painter.ctx.moveTo(-s, -s + t);
        Painter.ctx.lineTo(-s + t, -s);
        Painter.ctx.lineTo(0, -t);
        Painter.ctx.lineTo(s - t, -s);
        Painter.ctx.lineTo(s, -s + t);
        Painter.ctx.lineTo(t, 0);
        Painter.ctx.lineTo(s, s - t);
        Painter.ctx.lineTo(s - t, s);
        Painter.ctx.lineTo(0, t);
        Painter.ctx.lineTo(-s + t, s);
        Painter.ctx.lineTo(-s, s - t);
        Painter.ctx.lineTo(-t, 0);
        Painter.ctx.closePath();
      } else {
        // Draw a + shape
        Painter.ctx.beginPath();
        Painter.ctx.moveTo(-t, -s);
        Painter.ctx.lineTo(t, -s);
        Painter.ctx.lineTo(t, -t);
        Painter.ctx.lineTo(s, -t);
        Painter.ctx.lineTo(s, t);
        Painter.ctx.lineTo(t, t);
        Painter.ctx.lineTo(t, s);
        Painter.ctx.lineTo(-t, s);
        Painter.ctx.lineTo(-t, t);
        Painter.ctx.lineTo(-s, t);
        Painter.ctx.lineTo(-s, -t);
        Painter.ctx.lineTo(-t, -t);
        Painter.ctx.closePath();
      }

      if (this.fillColor) {
        Painter.ctx.fillStyle = this.fillColor;
        Painter.ctx.fill();
      }

      if (this.strokeColor) {
        Painter.ctx.strokeStyle = this.strokeColor;
        Painter.ctx.lineWidth = this.lineWidth;
        Painter.ctx.stroke();
      }
    });
  }
}

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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    const s = this.size / 2;
    const t = this.thickness / 2;
    // Cross center relative to bounding box
    const cx = s + offsetX;
    const cy = s + offsetY;

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
      Painter.lines.moveTo(cx - t, offsetY);
      Painter.lines.lineTo(cx + t, offsetY);
      Painter.lines.lineTo(cx + t, cy - t);
      Painter.lines.lineTo(this.size + offsetX, cy - t);
      Painter.lines.lineTo(this.size + offsetX, cy + t);
      Painter.lines.lineTo(cx + t, cy + t);
      Painter.lines.lineTo(cx + t, this.size + offsetY);
      Painter.lines.lineTo(cx - t, this.size + offsetY);
      Painter.lines.lineTo(cx - t, cy + t);
      Painter.lines.lineTo(offsetX, cy + t);
      Painter.lines.lineTo(offsetX, cy - t);
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

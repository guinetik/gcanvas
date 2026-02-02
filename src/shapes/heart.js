import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Heart - A heart shape using Bezier curves.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Heart center is at (width/2, height/2)
 */
export class Heart extends Shape {
  constructor(options = {}) {
    super(options);
  }

  draw() {
    super.draw();
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    const w = this.width;
    const h = this.height;
    const halfW = w / 2;
    const topCurveHeight = h * 0.3;
    const lines = Painter.lines;

    lines.beginPath();
    // Start at top center
    lines.moveTo(halfW + offsetX, topCurveHeight + offsetY);
    // Left arc (from center to left side)
    lines.bezierCurveTo(halfW + offsetX, offsetY, offsetX, offsetY, offsetX, topCurveHeight + offsetY);
    // Bottom point (left side down to bottom center)
    lines.bezierCurveTo(offsetX, h * 0.8 + offsetY, halfW + offsetX, h + offsetY, halfW + offsetX, h + offsetY);
    // Right arc (bottom center up to right side)
    lines.bezierCurveTo(halfW + offsetX, h + offsetY, w + offsetX, h * 0.8 + offsetY, w + offsetX, topCurveHeight + offsetY);
    // Back to top center
    lines.bezierCurveTo(w + offsetX, offsetY, halfW + offsetX, offsetY, halfW + offsetX, topCurveHeight + offsetY);
    lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

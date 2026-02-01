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
    const w = this.width;
    const h = this.height;
    const halfW = w / 2;
    const topCurveHeight = h * 0.3;
    const lines = Painter.lines;

    lines.beginPath();
    // Start at top center
    lines.moveTo(halfW, topCurveHeight);
    // Left arc (from center to left side)
    lines.bezierCurveTo(halfW, 0, 0, 0, 0, topCurveHeight);
    // Bottom point (left side down to bottom center)
    lines.bezierCurveTo(0, h * 0.8, halfW, h, halfW, h);
    // Right arc (bottom center up to right side)
    lines.bezierCurveTo(halfW, h, w, h * 0.8, w, topCurveHeight);
    // Back to top center
    lines.bezierCurveTo(w, 0, halfW, 0, halfW, topCurveHeight);
    lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

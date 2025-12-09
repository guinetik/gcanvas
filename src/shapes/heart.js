import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Heart extends Shape {
  constructor(options = {}) {
    super(options);
  }

  draw() {
    super.draw();
    const w = this.width;
    const h = this.height;
    const topCurveHeight = h * 0.3;
    const lines = Painter.lines;
    lines.beginPath();
    lines.moveTo(0, topCurveHeight);
    // Left arc
    lines.bezierCurveTo(0, 0, -w / 2, 0, -w / 2, topCurveHeight);
    // Bottom point
    lines.bezierCurveTo(-w / 2, h * 0.8, 0, h, 0, h);
    // Right arc
    lines.bezierCurveTo(0, h, w / 2, h * 0.8, w / 2, topCurveHeight);
    lines.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveHeight);
    lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y + this.height / 2,
      width: this.width,
      height: this.height,
    };
  }
}

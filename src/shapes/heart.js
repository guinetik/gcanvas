import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

export class Heart extends Shape {
  constructor(x, y, width = 50, height = 50, options = {}) {
    super(x, y, options);
    this.width = width;
    this.height = height;
  }

  draw() {
    this.applyConstraints();

    const w = this.width;
    const h = this.height;
    const topCurveHeight = h * 0.3;

    this.renderWithTransform(() => {
      const ctx = Painter.ctx;

      ctx.beginPath();
      ctx.moveTo(0, topCurveHeight);

      // Left arc
      ctx.bezierCurveTo(
        0, 0,
        -w / 2, 0,
        -w / 2, topCurveHeight
      );

      // Bottom point
      ctx.bezierCurveTo(
        -w / 2, h * 0.8,
        0, h,
        0, h
      );

      // Right arc
      ctx.bezierCurveTo(
        0, h,
        w / 2, h * 0.8,
        w / 2, topCurveHeight
      );

      ctx.bezierCurveTo(
        w / 2, 0,
        0, 0,
        0, topCurveHeight
      );

      ctx.closePath();

      if (this.fillColor) {
        ctx.fillStyle = this.fillColor;
        ctx.fill();
      }

      if (this.strokeColor) {
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
      }
    });
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y + this.height / 2,
      width: this.width,
      height: this.height
    };
  }
}

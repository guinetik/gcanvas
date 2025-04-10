import { Shape } from "./shape.js";
import { Painter } from "../painter.js";
export class Arrow extends Shape {
  constructor(x, y, length, width, options = {}) {
    super(x, y, options);
    this.length = length;
    this.width = width;
  }

  draw() {
    this.applyConstraints();
    const halfW = this.width / 2;
    const headLength = this.length * 0.4;
    const shaftLength = this.length - headLength;

    this.renderWithTransform(() => {
      Painter.ctx.beginPath();
      Painter.ctx.moveTo(-shaftLength / 2, -halfW);
      Painter.ctx.lineTo(shaftLength / 2, -halfW);
      Painter.ctx.lineTo(shaftLength / 2, -this.width);
      Painter.ctx.lineTo(this.length / 2, 0);
      Painter.ctx.lineTo(shaftLength / 2, this.width);
      Painter.ctx.lineTo(shaftLength / 2, halfW);
      Painter.ctx.lineTo(-shaftLength / 2, halfW);
      Painter.ctx.closePath();

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

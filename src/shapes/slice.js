import { Shape } from "./shape.js";
import { Painter } from "../painter.js";
export class PieSlice extends Shape {
  constructor(x, y, radius, startAngle, endAngle, options = {}) {
    super(x, y, options);
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  draw() {
    super.draw();
    this.renderWithTransform(() => {
      Painter.ctx.beginPath();
      Painter.ctx.moveTo(0, 0);
      Painter.ctx.arc(0, 0, this.radius, this.startAngle, this.endAngle);
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

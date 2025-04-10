import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

export class Ring extends Shape {
  constructor(x, y, outerRadius, innerRadius, options = {}) {
    super(x, y, options);
    this.outerRadius = outerRadius;
    this.innerRadius = innerRadius;
  }

  draw() {
    super.draw();
    this.renderWithTransform(() => {
      Painter.ctx.beginPath();
      Painter.ctx.arc(0, 0, this.outerRadius, 0, Math.PI * 2);
      Painter.ctx.arc(0, 0, this.innerRadius, 0, Math.PI * 2, true);
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

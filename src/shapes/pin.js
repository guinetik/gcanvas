import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

export class Pin extends Shape {
  constructor(x, y, radius = 20, options = {}) {
    super(x, y, options);
    this.radius = radius;
  }

  draw() {
    this.applyConstraints();

    const r = this.radius;
    const h = r * 2.5;
    const baseY = 0;

    this.renderWithTransform(() => {
      Painter.ctx.beginPath();

      // Draw circle head
      Painter.ctx.arc(0, baseY, r, Math.PI, 0);

      // Draw tail (triangle)
      Painter.ctx.lineTo(r, baseY);
      Painter.ctx.lineTo(0, h);
      Painter.ctx.lineTo(-r, baseY);
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

  getBounds() {
    return {
      x: this.x,
      y: this.y + this.radius * 0.98, // shift center lower
      width: this.radius * 2,
      height: this.radius * 2.5,
    };
  }
}

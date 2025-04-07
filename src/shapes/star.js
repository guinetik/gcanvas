import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";

export class Star extends Shape {
  constructor(x, y, radius = 40, spikes = 5, inset = 0.5, options = {}) {
    super(x, y, options);
    this.radius = radius;
    this.spikes = spikes;
    this.inset = inset;
  }

  draw() {
    this.applyConstraints();

    const step = Math.PI / this.spikes;
    const rotationOffset = -Math.PI / 2;

    this.renderWithTransform(() => {
      Painter.ctx.beginPath();

      for (let i = 0; i < this.spikes * 2; i++) {
        const isOuter = i % 2 === 0;
        const r = isOuter ? this.radius : this.radius * this.inset;
        const angle = i * step + rotationOffset;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        if (i === 0) {
          Painter.ctx.moveTo(x, y);
        } else {
          Painter.ctx.lineTo(x, y);
        }
      }

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

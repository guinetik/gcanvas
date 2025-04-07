import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";
export class Hexagon extends Shape {
  constructor(x, y, radius, options = {}) {
    super(x, y, options);
    this.radius = radius;
  }

  draw() {
    this.applyConstraints();
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i;
      return {
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius,
      };
    });

    this.renderWithTransform(() => {
      Painter.polygon(points, this.fillColor, this.strokeColor, this.lineWidth);
    });
  }
}

import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

export class Polygon extends Shape {
  constructor(x, y, sides = 6, radius = 40, options = {}) {
    super(x, y, options);
    this.sides = sides;
    this.radius = radius;
  }

  draw() {
    super.draw();
    const points = [];
    const step = (2 * Math.PI) / this.sides;

    for (let i = 0; i < this.sides; i++) {
      const angle = i * step;
      points.push({
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      });
    }

    this.renderWithTransform(() => {
      Painter.polygon(points, this.fillColor, this.strokeColor, this.lineWidth);
    });
  }
}

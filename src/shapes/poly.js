import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Polygon extends Shape {
  constructor(sides = 6, radius = 40, options = {}) {
    super(options);
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
        y: Math.sin(angle) * this.radius,
      });
    }

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

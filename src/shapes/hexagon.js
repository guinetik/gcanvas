import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
export class Hexagon extends Shape {
  constructor(radius, options = {}) {
    super(options);
    this.radius = radius;
  }

  draw() {
    super.draw();
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i;
      return {
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius,
      };
    });

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

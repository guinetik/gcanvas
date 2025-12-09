import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Triangle extends Shape {
  constructor(size = 50, options = {}) {
    super(options);
    this.size = size;
  }

  draw() {
    super.draw();
    const half = this.size / 2;
    const points = [
      { x: 0, y: -half },
      { x: half, y: half },
      { x: -half, y: half },
    ];

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

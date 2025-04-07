import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";

export class Triangle extends Shape {
  constructor(x, y, size = 50, options = {}) {
    super(x, y, options);
    this.size = size;
  }

  draw() {
    this.applyConstraints();

    const half = this.size / 2;
    const points = [
      { x: 0, y: -half },
      { x: half, y: half },
      { x: -half, y: half }
    ];

    this.renderWithTransform(() => {
      Painter.polygon(points, this.fillColor, this.strokeColor, this.lineWidth);
    });
  }
}

import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Ring extends Shape {
  constructor(outerRadius, innerRadius, options = {}) {
    super(options);
    this.outerRadius = outerRadius;
    this.innerRadius = innerRadius;
  }

  draw() {
    super.draw();
    Painter.lines.beginPath();
    Painter.shapes.arc(0, 0, this.outerRadius, 0, Math.PI * 2);
    Painter.shapes.arc(0, 0, this.innerRadius, 0, Math.PI * 2, true);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

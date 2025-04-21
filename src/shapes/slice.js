import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
export class PieSlice extends Shape {
  constructor(radius, startAngle, endAngle, options = {}) {
    super(options);
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }

  draw() {
    super.draw();
    Painter.lines.beginPath();
    Painter.lines.moveTo(0, 0);
    Painter.shapes.arc(0, 0, this.radius, this.startAngle, this.endAngle);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

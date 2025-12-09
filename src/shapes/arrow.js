import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
export class Arrow extends Shape {
  constructor(length, options = {}) {
    super(options);
    this.length = length;
  }

  draw() {
    super.draw();
    const halfW = this.width / 2;
    const headLength = this.length * 0.4;
    const shaftLength = this.length - headLength;

    Painter.lines.beginPath();
    Painter.lines.moveTo(-shaftLength / 2, -halfW);
    Painter.lines.lineTo(shaftLength / 2, -halfW);
    Painter.lines.lineTo(shaftLength / 2, -this.width);
    Painter.lines.lineTo(this.length / 2, 0);
    Painter.lines.lineTo(shaftLength / 2, this.width);
    Painter.lines.lineTo(shaftLength / 2, halfW);
    Painter.lines.lineTo(-shaftLength / 2, halfW);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}

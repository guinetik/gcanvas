import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Pin extends Shape {
  constructor(radius = 20, options = {}) {
    super(options);
    this.radius = radius;
  }

  draw() {
    super.draw();
    const r = this.radius;
    const h = r * 2.5;
    const baseY = 0;

    Painter.lines.beginPath();

    // Draw circle head
    Painter.shapes.arc(0, baseY, r, Math.PI, 0);

    // Draw tail (triangle)
    Painter.lines.lineTo(r, baseY);
    Painter.lines.lineTo(0, h);
    Painter.lines.lineTo(-r, baseY);
    Painter.lines.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y + this.radius * 0.98, // shift center lower
      width: this.radius * 2,
      height: this.radius * 2.5,
    };
  }
}

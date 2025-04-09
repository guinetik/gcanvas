import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

export class Cloud extends Shape {
  constructor(x, y, size = 40, options = {}) {
    super(x, y, options);
    this.size = size;
  }

  draw() {
    super.draw();
    const r = this.size;

    // Construct the path using cubic Bézier segments
    const path = [
      ["M", -r, 0],
      ["C", -r, -r, 0, -r, 0, 0],
      ["C", 0, -r * 1.2, r * 1.2, -r, r, 0],
      ["C", r * 1.5, r * 0.5, r * 0.5, r * 1.2, 0, r],
      ["C", -r * 0.8, r * 1.3, -r * 1.2, r * 0.3, -r, 0],
      ["Z"],
    ];

    this.renderWithTransform(() => {
      Painter.path(path, this.fillColor, this.strokeColor, this.lineWidth);
    });
  }

  getBounds() {
    const s = this.size * 2;
    return {
      x: this.x,
      y: this.y,
      width: s,
      height: s,
    };
  }
}

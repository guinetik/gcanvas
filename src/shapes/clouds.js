import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

export class Cloud extends Shape {
  constructor(size = 40, options = {}) {
    super(options);
    this.size = size;
    this.width = size * 2;
    this.height = size * 2;
  }

  draw() {
    super.draw();
    const s = this.size;
    const ctx = Painter.ctx;

    // Draw cloud as overlapping filled circles
    const circles = [
      { x: -s * 0.5, y: 0, r: s * 0.4 },      // left
      { x: -s * 0.2, y: -s * 0.3, r: s * 0.35 }, // top-left
      { x: s * 0.2, y: -s * 0.35, r: s * 0.4 },  // top-right
      { x: s * 0.5, y: 0, r: s * 0.35 },      // right
      { x: 0, y: s * 0.15, r: s * 0.5 },      // bottom center (base)
    ];

    if (this.color) {
      ctx.fillStyle = this.color;
      for (const c of circles) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.stroke) {
      // For stroke, we'd need a more complex outline - skip for now
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.lineWidth;
      for (const c of circles) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
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

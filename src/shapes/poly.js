import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Polygon - A regular polygon with N sides.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Polygon center is at (radius, radius)
 */
export class Polygon extends Shape {
  constructor(sides = 6, radius = 40, options = {}) {
    super(options);
    this.sides = sides;
    this.radius = radius;
    this.width = radius * 2;
    this.height = radius * 2;
  }

  draw() {
    super.draw();
    const points = [];
    const step = (2 * Math.PI) / this.sides;
    // Polygon center is at (radius, radius) from bounding box top-left
    const cx = this.radius;
    const cy = this.radius;

    for (let i = 0; i < this.sides; i++) {
      const angle = i * step;
      points.push({
        x: cx + Math.cos(angle) * this.radius,
        y: cy + Math.sin(angle) * this.radius,
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

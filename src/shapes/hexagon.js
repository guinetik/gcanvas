import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Hexagon - A regular six-sided polygon shape.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Hexagon center is at (radius, radius)
 */
export class Hexagon extends Shape {
  constructor(radius, options = {}) {
    super(options);
    this.radius = radius;
    this.width = radius * 2;
    this.height = radius * 2;
  }

  draw() {
    super.draw();
    // Hexagon center is at (radius, radius) from bounding box top-left
    const cx = this.radius;
    const cy = this.radius;

    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i;
      return {
        x: cx + Math.cos(angle) * this.radius,
        y: cy + Math.sin(angle) * this.radius,
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

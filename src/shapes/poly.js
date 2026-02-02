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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    const points = [];
    const step = (2 * Math.PI) / this.sides;
    // Polygon center relative to bounding box
    const cx = this.radius + offsetX;
    const cy = this.radius + offsetY;

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

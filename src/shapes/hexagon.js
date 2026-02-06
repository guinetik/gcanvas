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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    // Hexagon center relative to bounding box
    const cx = this.radius + offsetX;
    const cy = this.radius + offsetY;

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

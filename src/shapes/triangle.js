import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Triangle - An equilateral triangle shape.
 *
 * With the origin-based coordinate system (v3.0):
 * - Default origin (0, 0) = top-left of bounding box
 * - Triangle points are positioned relative to bounding box
 */
export class Triangle extends Shape {
  constructor(size = 50, options = {}) {
    super(options);
    this.size = size;
    this.width = size;
    this.height = size;
  }

  draw() {
    super.draw();
    const half = this.size / 2;
    // Triangle positioned within its bounding box
    // Points relative to bounding box top-left at (0, 0)
    const points = [
      { x: half, y: 0 },           // top center
      { x: this.size, y: this.size }, // bottom right
      { x: 0, y: this.size },         // bottom left
    ];

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

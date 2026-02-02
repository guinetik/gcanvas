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
    
    // Calculate origin offset
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    const half = this.size / 2;
    // Triangle positioned within its bounding box, offset by origin
    const points = [
      { x: half + offsetX, y: offsetY },                    // top center
      { x: this.size + offsetX, y: this.size + offsetY },   // bottom right
      { x: offsetX, y: this.size + offsetY },               // bottom left
    ];

    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}

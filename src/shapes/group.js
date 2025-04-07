import { Shape } from "./shape.js";

/**
 * Group - A container that can transform and draw a collection of shapes together.
 *
 * Useful for composite visuals that move/scale/rotate as a unit.
 *
 * Note: This is purely visual and not a game entity.
 */
export class Group extends Shape {
  /**
   * @param {number} x - Group origin X (applies to all children)
   * @param {number} y - Group origin Y
   * @param {Object} [options] - Shape rendering options
   */
  constructor(x, y, options = {}) {
    super(x, y, options);
    this.children = [];
  }

  /**
   * Adds a shape to the group.
   * @param {Shape} shape
   */
  add(shape) {
    this.children = [...this.children, shape];
  }

  /**
   * Removes a shape from the group.
   * @param {Shape} shape
   */
  remove(shape) {
    this.children = this.children.filter((child) => child !== shape);
  }

  /**
   *Removes a shape from the group without creating a new array.
   * @param {Shape} shape
   */
  removeMutable(shape) {
    const index = this.children.indexOf(shape);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  /**
   * Removes all shapes from the group.
   */
  clear() {
    this.children = [];
  }

  /**
   * Renders all child shapes using the group's transform.
   */
  draw() {
    this.renderWithTransform(() => {
      this.children.forEach((child) => child.draw());
    });
  }

  getBounds() {
    if (this.children.length === 0) return null;

    const boxes = this.children
      .map((child) => {
        const b =
          typeof child.getBounds === "function" ? child.getBounds() : null;
        if (!b) return null;

        const halfW = b.width / 2;
        const halfH = b.height / 2;

        return {
          minX: b.x - halfW,
          maxX: b.x + halfW,
          minY: b.y - halfH,
          maxY: b.y + halfH,
        };
      })
      .filter((b) => b !== null);
    //console.log("boxes", boxes);
    if (boxes.length === 0) return null;

    const minX = Math.min(...boxes.map((b) => b.minX));
    const maxX = Math.max(...boxes.map((b) => b.maxX));
    const minY = Math.min(...boxes.map((b) => b.minY));
    const maxY = Math.max(...boxes.map((b) => b.maxY));

    const width = maxX - minX;
    const height = maxY - minY;

    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    return {
      x: this.x + centerX, // translate from local to world
      y: this.y + centerY,
      width,
      height,
    };
  }
}

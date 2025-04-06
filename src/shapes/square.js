import { Rectangle } from "./rect.js";
/**
 * Square - A shortcut for creating rectangles with equal width/height.
 */
export class Square extends Rectangle {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} size - Side length of the square
   * @param {Object} [options] - Shape rendering options
   */
  constructor(x, y, size, options = {}) {
    super(x, y, size, size, options);
  }
}

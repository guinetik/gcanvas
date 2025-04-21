import { Rectangle } from "./rect.js";
/**
 * Square - A shortcut for creating rectangles with equal width/height.
 */
export class Square extends Rectangle {
  /**
   * @param {number} size - Side length of the square
   * @param {Object} [options] - Shape rendering options
   */
  constructor(size, options = {}) {
    super(options);
    this.width = size;
    this.height = size;
  }
}

/**
 * Position utility for consistently positioning objects relative to containers
 * Provides anchor point constants and methods for calculating positions
 *
 * With the origin-based coordinate system (v3.0):
 * - Container x, y refers to the top-left corner (origin) of the container
 * - Object x, y refers to the top-left corner (origin) of the object
 * - Calculations position objects relative to their origin point
 */
export class Position {
  /**
   * Anchor position constants
   */
  static TOP_LEFT = "top-left";
  static TOP_CENTER = "top-center";
  static TOP_RIGHT = "top-right";
  static CENTER_LEFT = "center-left";
  static CENTER = "center";
  static CENTER_RIGHT = "center-right";
  static BOTTOM_LEFT = "bottom-left";
  static BOTTOM_CENTER = "bottom-center";
  static BOTTOM_RIGHT = "bottom-right";

  /**
   * Calculates position based on anchor point
   *
   * With the origin-based coordinate system (v3.0):
   * - Container x, y refers to the top-left corner (origin) of the container
   * - The returned x, y is the position for the object's origin (top-left)
   *
   * @param {string} anchor - Anchor position constant
   * @param {Object} object - Object being positioned (with width and height)
   * @param {Object} container - Container to position relative to (with x, y, width, height)
   * @param {number} margin - Margin from the container edges
   * @param {number} offsetX - Additional X offset
   * @param {number} offsetY - Additional Y offset
   * @returns {Object} Position and alignment information
   */
  static calculate(anchor, object, container, margin = 10, offsetX = 0, offsetY = 0) {
    // Ensure we have valid dimensions
    const objectWidth = object.width || 0;
    const objectHeight = object.height || 0;

    const containerWidth = container.width || 0;
    const containerHeight = container.height || 0;
    // Container x, y is the top-left corner (origin)
    const containerX = container.x || 0;
    const containerY = container.y || 0;

    // Calculate position based on anchor
    // Returns position for object's origin (top-left by default)
    let x, y, align, baseline;

    switch (anchor) {
      // Top row
      case Position.TOP_LEFT:
        x = containerX + margin;
        y = containerY + margin;
        align = "left";
        baseline = "top";
        break;

      case Position.TOP_CENTER:
        x = containerX + containerWidth / 2 - objectWidth / 2;
        y = containerY + margin;
        align = "center";
        baseline = "top";
        break;

      case Position.TOP_RIGHT:
        x = containerX + containerWidth - margin - objectWidth;
        y = containerY + margin;
        align = "right";
        baseline = "top";
        break;

      // Middle row
      case Position.CENTER_LEFT:
        x = containerX + margin;
        y = containerY + containerHeight / 2 - objectHeight / 2;
        align = "left";
        baseline = "middle";
        break;

      case Position.CENTER:
        x = containerX + containerWidth / 2 - objectWidth / 2;
        y = containerY + containerHeight / 2 - objectHeight / 2;
        align = "center";
        baseline = "middle";
        break;

      case Position.CENTER_RIGHT:
        x = containerX + containerWidth - margin - objectWidth;
        y = containerY + containerHeight / 2 - objectHeight / 2;
        align = "right";
        baseline = "middle";
        break;

      // Bottom row
      case Position.BOTTOM_LEFT:
        x = containerX + margin;
        y = containerY + containerHeight - margin - objectHeight;
        align = "left";
        baseline = "bottom";
        break;

      case Position.BOTTOM_CENTER:
        x = containerX + containerWidth / 2 - objectWidth / 2;
        y = containerY + containerHeight - margin - objectHeight;
        align = "center";
        baseline = "bottom";
        break;

      case Position.BOTTOM_RIGHT:
        x = containerX + containerWidth - margin - objectWidth;
        y = containerY + containerHeight - margin - objectHeight;
        align = "right";
        baseline = "bottom";
        break;

      default:
        // Fallback to top-left
        x = containerX + margin;
        y = containerY + margin;
        align = "left";
        baseline = "top";
    }

    // Apply custom offsets
    x += offsetX;
    y += offsetY;

    return { x, y, align, baseline };
  }

  /**
   * Calculates absolute position relative to the game canvas
   *
   * With the origin-based coordinate system (v3.0):
   * - The canvas origin is at (0, 0) top-left
   * - The returned x, y is the position for the object's origin (top-left)
   *
   * @param {string} anchor - Anchor position constant
   * @param {Object} object - Object being positioned
   * @param {Object} game - Game object with canvas dimensions
   * @param {number} margin - Margin from the edges
   * @param {number} offsetX - Additional X offset
   * @param {number} offsetY - Additional Y offset
   * @returns {Object} Position and alignment information
   */
  static calculateAbsolute(anchor, object, game, margin = 10, offsetX = 0, offsetY = 0) {
    // Canvas container starts at (0, 0) top-left
    const container = {
      x: 0,
      y: 0,
      width: game.width,
      height: game.height
    };

    return Position.calculate(anchor, object, container, margin, offsetX, offsetY);
  }
}

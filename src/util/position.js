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
   * - The returned x, y is the position for the object's origin point
   * - For top-left origin (default): x, y is where the top-left corner should be
   * - For center origin: x, y is where the center should be
   *
   * @param {string} anchor - Anchor position constant
   * @param {Object} object - Object being positioned (with width, height, originX, originY)
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
    
    // Get object's origin (default is 0, 0 = top-left)
    const originX = object.originX ?? 0;
    const originY = object.originY ?? 0;

    const containerWidth = container.width || 0;
    const containerHeight = container.height || 0;
    // Container x, y is the top-left corner (origin)
    const containerX = container.x || 0;
    const containerY = container.y || 0;

    // Calculate the anchor point in container coordinates (where we want the object to be)
    // Then adjust for object's origin to get the final position
    let anchorPointX, anchorPointY, align, baseline;

    switch (anchor) {
      // Top row
      case Position.TOP_LEFT:
        anchorPointX = containerX + margin;
        anchorPointY = containerY + margin;
        align = "left";
        baseline = "top";
        break;

      case Position.TOP_CENTER:
        anchorPointX = containerX + containerWidth / 2;
        anchorPointY = containerY + margin;
        align = "center";
        baseline = "top";
        break;

      case Position.TOP_RIGHT:
        anchorPointX = containerX + containerWidth - margin;
        anchorPointY = containerY + margin;
        align = "right";
        baseline = "top";
        break;

      // Middle row
      case Position.CENTER_LEFT:
        anchorPointX = containerX + margin;
        anchorPointY = containerY + containerHeight / 2;
        align = "left";
        baseline = "middle";
        break;

      case Position.CENTER:
        anchorPointX = containerX + containerWidth / 2;
        anchorPointY = containerY + containerHeight / 2;
        align = "center";
        baseline = "middle";
        break;

      case Position.CENTER_RIGHT:
        anchorPointX = containerX + containerWidth - margin;
        anchorPointY = containerY + containerHeight / 2;
        align = "right";
        baseline = "middle";
        break;

      // Bottom row
      case Position.BOTTOM_LEFT:
        anchorPointX = containerX + margin;
        anchorPointY = containerY + containerHeight - margin;
        align = "left";
        baseline = "bottom";
        break;

      case Position.BOTTOM_CENTER:
        anchorPointX = containerX + containerWidth / 2;
        anchorPointY = containerY + containerHeight - margin;
        align = "center";
        baseline = "bottom";
        break;

      case Position.BOTTOM_RIGHT:
        anchorPointX = containerX + containerWidth - margin;
        anchorPointY = containerY + containerHeight - margin;
        align = "right";
        baseline = "bottom";
        break;

      default:
        // Fallback to top-left
        anchorPointX = containerX + margin;
        anchorPointY = containerY + margin;
        align = "left";
        baseline = "top";
    }

    // Calculate final position based on object's origin
    // 
    // The anchor determines what point of the OBJECT should be at the anchor point:
    // - CENTER anchor: object's CENTER should be at anchorPoint
    // - TOP_LEFT anchor: object's TOP-LEFT should be at anchorPoint
    // - etc.
    //
    // But position (x, y) is where the object's ORIGIN is placed.
    // So we need to convert from "where should the anchor-aligned point be"
    // to "where should the origin be".
    
    // Determine what point of the object the anchor refers to (0-1 normalized)
    let anchorAlignX, anchorAlignY;
    if (anchor.includes("left")) {
      anchorAlignX = 0;
    } else if (anchor.includes("right")) {
      anchorAlignX = 1;
    } else {
      anchorAlignX = 0.5; // center
    }
    
    if (anchor.includes("top")) {
      anchorAlignY = 0;
    } else if (anchor.includes("bottom")) {
      anchorAlignY = 1;
    } else {
      anchorAlignY = 0.5; // center
    }
    
    // Calculate where the origin should be:
    // anchorPoint is where object's anchor-aligned point should be
    // Object's anchor-aligned point is at: origin + (anchorAlign - originAlign) * dimension
    // So: origin + (anchorAlign - origin) * dim = anchorPoint
    // Therefore: origin = anchorPoint - (anchorAlign - origin) * dim
    //                   = anchorPoint + (origin - anchorAlign) * dim
    const x = anchorPointX + (originX - anchorAlignX) * objectWidth + offsetX;
    const y = anchorPointY + (originY - anchorAlignY) * objectHeight + offsetY;

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

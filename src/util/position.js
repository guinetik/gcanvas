/**
 * Position utility for consistently positioning objects relative to containers
 * Provides anchor point constants and methods for calculating positions
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
    const containerX = container.x || 0;
    const containerY = container.y || 0;
    
    // Calculate position based on anchor
    let x, y, align, baseline;
    
    switch (anchor) {
      // Top row
      case Position.TOP_LEFT:
        x = (containerX - containerWidth/2) + margin + objectWidth/2;
        y = (containerY - containerHeight/2) + margin + objectHeight/2;
        align = "left";
        baseline = "top";
        break;
        
      case Position.TOP_CENTER:
        x = containerX;
        y = (containerY - containerHeight/2) + margin + objectHeight/2;
        align = "center";
        baseline = "top";
        break;
        
      case Position.TOP_RIGHT:
        x = (containerX + containerWidth/2) - margin - objectWidth/2;
        y = (containerY - containerHeight/2) + margin + objectHeight/2;
        align = "right";
        baseline = "top";
        break;
      
      // Middle row
      case Position.CENTER_LEFT:
        x = (containerX - containerWidth/2) + margin + objectWidth/2;
        y = containerY;
        align = "left";
        baseline = "middle";
        break;
        
      case Position.CENTER:
        x = containerX;
        y = containerY;
        align = "center";
        baseline = "middle";
        break;
        
      case Position.CENTER_RIGHT:
        x = (containerX + containerWidth/2) - margin - objectWidth/2;
        y = containerY;
        align = "right";
        baseline = "middle";
        break;
      
      // Bottom row
      case Position.BOTTOM_LEFT:
        //console.log("BOTTOM_LEFT", containerX, containerWidth, margin, objectWidth);
        x = (containerX - containerWidth/2) + margin + objectWidth/2;
        y = (containerY + containerHeight/2) - margin - objectHeight/2;
        align = "left";
        baseline = "bottom";
        break;
        
      case Position.BOTTOM_CENTER:
        x = containerX;
        y = (containerY + containerHeight/2) - margin - objectHeight/2;
        align = "center";
        baseline = "bottom";
        break;
        
      case Position.BOTTOM_RIGHT:
        x = (containerX + containerWidth/2) - margin - objectWidth/2;
        y = (containerY + containerHeight/2) - margin - objectHeight/2;
        align = "right";
        baseline = "bottom";
        break;
        
      default:
        // Fallback to top-left
        x = (containerX - containerWidth/2) + margin + objectWidth/2;
        y = (containerY - containerHeight/2) + margin + objectHeight/2;
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
   * @param {string} anchor - Anchor position constant
   * @param {Object} object - Object being positioned
   * @param {Object} game - Game object with canvas dimensions
   * @param {number} margin - Margin from the edges
   * @param {number} offsetX - Additional X offset
   * @param {number} offsetY - Additional Y offset
   * @returns {Object} Position and alignment information
   */
  static calculateAbsolute(anchor, object, game, margin = 10, offsetX = 0, offsetY = 0) {
    const container = {
      width: game.width,
      height: game.height,
      x: game.width / 2,
      y: game.height / 2
    };
    
    return Position.calculate(anchor, object, container, margin, offsetX, offsetY);
  }
}
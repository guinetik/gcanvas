import { Text } from "../objects";

/**
 * FPSCounter - A simple text object displaying frames per second
 * @extends Text
 */
export class FPSCounter extends Text {
  /**
   * Create an FPS counter
   * @param {Game} game - The main game instance
   * @param {Object} [options={}] - Configuration options
   */
  constructor(game, options = {}) {
    // Spread the user options but provide defaults for FPS counter
    super(game, "0 FPS", {
      x: 0,
      y: 0,
      font: "12px monospace",
      color: "#0f0", // Default to green
      align: "center",
      baseline: "middle",
      debug:false,
      ...options, // This will override defaults with user provided values
    });

    // FPS tracking properties
    this.fps = 0;
    this._frames = 0;
    this._accum = 0;
  }

  /**
   * Update the FPS counter
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    const fps = this.game.actualFps;
    if (!fps) return;
  
    this._frames++;
    this._accum += dt;
  
    if (this._accum >= 0.5) {
      this.fps = Math.round(fps);
      this.text = `${this.fps} FPS`;
      this._accum = 0;
      this._frames = 0;
    }
    super.update(dt);
  }

  /**
   * Override getBounds to return correct bounding box
   * @returns {Object} Bounding box with x, y, width, and height
   */
  getBounds() {
    // Use the shape's getTextBounds method if available
    if (this.shape && this.shape.getTextBounds) {
      const bounds = this.shape.getTextBounds();
      
      // Return bounds with the current object's x and y
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
    }
    
    // Fallback to parent implementation
    return super.getBounds();
  }

  getDebugBounds() {
    // Use the shape's getTextBounds method if available
    if (this.shape && this.shape.getDebugBounds) {
      const bounds = this.shape.getDebugBounds();
      
      // Return bounds with the current object's x and y
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
    }
    
    // Fallback to parent implementation
    return super.getDebugBounds();
  }
}
import { Painter } from "../painter/painter";
import { Geometry2d } from "./geometry.js";

export class Traceable extends Geometry2d {
  constructor(options = {}) {
    super(options);
    this._debug = Boolean(options.debug);
    this._debugColor =
      typeof options.debugColor === "string" ? options.debugColor : "#0f0";
    this.logger.log("Traceable", this.x, this.y, this.width, this.height);
  }

  /**
   * Draws debug bounding box in local space (after translation and transforms).
   * Should be called from within the transformed context.
   */
  drawDebug() {
    if (!this._debug) return;

    // Get the debug bounds in local space
    const debugBounds = this.getDebugBounds();
    this.logger.log(
      this.constructor.name,
      "drawDebug",
      debugBounds.x,
      debugBounds.y,
      debugBounds.width,
      debugBounds.height
    );

    // Draw debug rectangle in local space (already translated and transformed)
    Painter.shapes.outlineRect(
      debugBounds.x,
      debugBounds.y,
      debugBounds.width,
      debugBounds.height,
      this._debugColor,
      2
    );
  }

  /**
   * Returns debug bounds in local space.
   * Accounts for origin - debug box is drawn at the same offset as the shape.
   * Override in subclasses for custom debug bounds.
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getDebugBounds() {
    // Calculate offset based on origin (same as shapes use for drawing)
    const offsetX = -this.width * this.originX;
    const offsetY = -this.height * this.originY;
    
    return {
      x: offsetX,
      y: offsetY,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Logs the object's render state (debug only).
   * @param {string} [msg]
   */
  trace(msg = "render") {
    this.logger.log(
      this.name == null ? this.constructor.name : this.name,
      msg,
      "x",
      this.x,
      "y",
      this.y,
      "w",
      this.width,
      "h",
      this.height,
      "opacity",
      this._opacity,
      "visible",
      this._visible,
      "active",
      this._active,
      "debug",
      this.debug
    );
  }
}

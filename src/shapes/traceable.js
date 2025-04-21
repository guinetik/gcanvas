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

  async drawDebug() {
    if (!this._debug) return;

    // Get the debug bounds
    const debugBounds = this.getDebugBounds();

    this.logger.log(
      this.constructor.name,
      "drawDebug",
      debugBounds.x,
      debugBounds.y,
      debugBounds.width,
      debugBounds.height
    );

    Painter.save();
    Painter.scale(this.scaleX, this.scaleY);
    Painter.rotate(this.rotation);
    // Important: We DO NOT translate here - we draw in world coordinates
    // We're in pre-translation context from render()
    // Draw the debug rectangle around the object's actual position and size
    // For Scenes, this should create a box that surrounds all their content
    Painter.shapes.outlineRect(
      // Here's the key fix - respect the center-based coordinates
      this.x - debugBounds.width / 2,
      this.y - debugBounds.height / 2,
      debugBounds.width,
      debugBounds.height,
      this._debugColor,
      2
    );

    Painter.restore();
    this.drawCoordinateMarker();
  }

  getDebugBounds() {
    // Always return bounds centered around origin
    return {
      width: this.width,
      height: this.height,
      x: -this.width / 2,
      y: -this.height / 2,
    };
  }

  drawCoordinateMarker() {
    Painter.lines.line(this.x - 5, this.y, this.x + 5, this.y, "red", 1);
    Painter.lines.line(this.x, this.y - 5, this.x, this.y + 5, "red", 1);
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

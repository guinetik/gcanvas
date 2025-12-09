import { Logger } from "./logger";

export class Loggable {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name;
    this._logger = this.getLogger(options);
    //    console.log("Loggable constructor", options);
  }

  get logger() {
    if (this._logger == null) {
      return this.getLogger();
    }
    return this._logger;
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

  getLogger(options) {
    return Logger.getLogger(options.name || this.constructor.name);
  }
}

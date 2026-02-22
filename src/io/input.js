export class Input {
  static init(game) {
    // Set defaults for last initialized game (backwards compatibility)
    Input.game = game;
    Input.x = 0;
    Input.y = 0;
    Input.down = false;

    // Create bound handlers that know which game they belong to
    game.events.on("mousedown", (e) => Input._onDown(e, game));
    game.events.on("mouseup", (e) => Input._onUp(e, game));
    game.events.on("mousemove", (e) => Input._onMove(e, game));
    game.events.on("touchstart", (e) => Input._onTouchStart(e, game));
    game.events.on("touchend", (e) => Input._onTouchEnd(e, game));
    game.events.on("touchmove", (e) => Input._onTouchMove(e, game));
  }

  /**
   * Scales CSS pixel coordinates to canvas internal coordinates.
   * This handles the case where the canvas is CSS-scaled (display size differs from resolution).
   * @param {Object} game - The game instance
   * @param {number} cssX - X coordinate in CSS pixels
   * @param {number} cssY - Y coordinate in CSS pixels
   * @returns {{x: number, y: number}} Scaled coordinates in canvas pixels
   */
  static _scaleToCanvas(game, cssX, cssY) {
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS pixels to canvas internal pixels
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: cssX * scaleX,
      y: cssY * scaleY
    };
  }

  static _setPosition(x, y) {
    Input.x = x;
    Input.y = y;
  }

  static _onDown(e, game) {
    Input.down = true;
    const scaled = Input._scaleToCanvas(game, e.offsetX, e.offsetY);
    Input._setPosition(scaled.x, scaled.y);
    Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
    Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
    game.events.emit("inputdown", e);
  }

  static _onUp(e, game) {
    Input.down = false;
    const scaled = Input._scaleToCanvas(game, e.offsetX, e.offsetY);
    Input._setPosition(scaled.x, scaled.y);
    Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
    Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
    game.events.emit("inputup", e);
  }

  static _onMove(e, game) {
    const scaled = Input._scaleToCanvas(game, e.offsetX, e.offsetY);
    Input._setPosition(scaled.x, scaled.y);
    Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
    Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
    game.events.emit("inputmove", e);
  }

  static _onTouchStart(e, game) {
    const touch = e.touches[0];
    const rect = game.canvas.getBoundingClientRect();
    Input.down = true;
    // Calculate CSS-relative position, then scale to canvas coordinates
    const cssX = touch.clientX - rect.left;
    const cssY = touch.clientY - rect.top;
    const scaled = Input._scaleToCanvas(game, cssX, cssY);
    Input._setPosition(scaled.x, scaled.y);
    Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
    Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
    game.events.emit("inputdown", e);
  }

  static _onTouchEnd(e, game) {
    Input.down = false;
    // On touchend, e.touches is empty — use changedTouches for the ended touch
    const touch = e.changedTouches[0];
    if (touch) {
      const rect = game.canvas.getBoundingClientRect();
      const cssX = touch.clientX - rect.left;
      const cssY = touch.clientY - rect.top;
      const scaled = Input._scaleToCanvas(game, cssX, cssY);
      Input._setPosition(scaled.x, scaled.y);
      Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
      Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
    }
    game.events.emit("inputup", e);
  }

  static _onTouchMove(e, game) {
    const touch = e.touches[0];
    const rect = game.canvas.getBoundingClientRect();
    // Calculate CSS-relative position, then scale to canvas coordinates
    const cssX = touch.clientX - rect.left;
    const cssY = touch.clientY - rect.top;
    const scaled = Input._scaleToCanvas(game, cssX, cssY);
    Input._setPosition(scaled.x, scaled.y);
    Object.defineProperty(e, "x", { value: scaled.x, configurable: true });
    Object.defineProperty(e, "y", { value: scaled.y, configurable: true });
    game.events.emit("inputmove", e);
  }
}

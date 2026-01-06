export class Mouse {
  // Map of canvas -> game for multi-game support
  static _gameMap = new Map();

  static init(game) {
    // Store mapping from canvas to game
    Mouse._gameMap.set(game.canvas, game);

    // Set defaults for last initialized game (backwards compatibility)
    Mouse.game = game;
    Mouse.canvas = game.canvas;
    Mouse.x = 0;
    Mouse.y = 0;
    Mouse.leftDown = false;
    Mouse.middleDown = false;
    Mouse.rightDown = false;

    game.canvas.addEventListener("mousemove", Mouse._onMove);
    game.canvas.addEventListener("mousedown", Mouse._onDown);
    game.canvas.addEventListener("mouseup", Mouse._onUp);
    game.canvas.addEventListener("click", Mouse._onClick);
    game.canvas.addEventListener("wheel", Mouse._onWheel);
  }

  // Get the game instance for a given event's target canvas
  static _getGameForEvent(e) {
    const canvas = e.currentTarget;
    return Mouse._gameMap.get(canvas) || Mouse.game;
  }

  static _updatePosition(e, game) {
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();
    // Calculate CSS-relative position
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // Scale to canvas internal coordinates (handles CSS scaling)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    Mouse.x = cssX * scaleX;
    Mouse.y = cssY * scaleY;
  }

  static _onMove = (e) => {
    const game = Mouse._getGameForEvent(e);
    Mouse._updatePosition(e, game);
    game.events.emit("mousemove", e);
  };

  static _onDown = (e) => {
    const game = Mouse._getGameForEvent(e);
    Mouse._updatePosition(e, game);
    if (e.button === 0) Mouse.leftDown = true;
    if (e.button === 1) Mouse.middleDown = true;
    if (e.button === 2) Mouse.rightDown = true;
    game.events.emit("mousedown", e);
  };

  static _onUp = (e) => {
    const game = Mouse._getGameForEvent(e);
    Mouse._updatePosition(e, game);
    if (e.button === 0) Mouse.leftDown = false;
    if (e.button === 1) Mouse.middleDown = false;
    if (e.button === 2) Mouse.rightDown = false;
    game.events.emit("mouseup", e);
  };

  static _onClick = (e) => {
    const game = Mouse._getGameForEvent(e);
    Mouse._updatePosition(e, game);
    // Emit enhanced event with canvas-relative coordinates
    // Note: e is a MouseEvent, add canvas-relative x/y directly
    e.canvasX = Mouse.x;
    e.canvasY = Mouse.y;
    // Also set x/y for convenience (matches expected fluent API)
    Object.defineProperty(e, 'x', { value: Mouse.x, writable: false });
    Object.defineProperty(e, 'y', { value: Mouse.y, writable: false });
    game.events.emit("click", e);
  };

  static _onWheel = (e) => {
    const game = Mouse._getGameForEvent(e);
    Mouse._updatePosition(e, game);
    game.events.emit("wheel", e);
  };
}

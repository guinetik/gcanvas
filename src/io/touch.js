export class Touch {
  // Map of canvas -> game for multi-game support
  static _gameMap = new Map();

  static init(game) {
    // Store mapping from canvas to game
    Touch._gameMap.set(game.canvas, game);

    // Set defaults for last initialized game (backwards compatibility)
    Touch.game = game;
    Touch.canvas = game.canvas;
    Touch.x = 0;
    Touch.y = 0;
    Touch.active = false;

    game.canvas.addEventListener("touchstart", Touch._onStart);
    game.canvas.addEventListener("touchend", Touch._onEnd);
    game.canvas.addEventListener("touchmove", Touch._onMove);
  }

  // Get the game instance for a given event's target canvas
  static _getGameForEvent(e) {
    const canvas = e.currentTarget;
    return Touch._gameMap.get(canvas) || Touch.game;
  }

  static _updatePosition(touch, game) {
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();
    // Calculate CSS-relative position
    const cssX = touch.clientX - rect.left;
    const cssY = touch.clientY - rect.top;
    // Scale to canvas internal coordinates (handles CSS scaling)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    Touch.x = cssX * scaleX;
    Touch.y = cssY * scaleY;
  }

  static _onStart = (e) => {
    if (e.touches.length > 0) {
      const game = Touch._getGameForEvent(e);
      Touch.active = true;
      Touch._updatePosition(e.touches[0], game);
      game.events.emit("touchstart", e);
    }
  };

  static _onEnd = (e) => {
    const game = Touch._getGameForEvent(e);
    Touch.active = false;
    game.events.emit("touchend", e);
  };

  static _onMove = (e) => {
    if (e.touches.length > 0) {
      const game = Touch._getGameForEvent(e);
      Touch._updatePosition(e.touches[0], game);
      game.events.emit("touchmove", e);
    }
  };
}

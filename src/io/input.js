export class Input {
  static init(game) {
    Input.game = game;
    Input.x = 0;
    Input.y = 0;
    Input.down = false;
    game.events.on("mousedown", Input._onDown);
    game.events.on("mouseup", Input._onUp);
    game.events.on("mousemove", Input._onMove);
    game.events.on("touchstart", Input._onTouchStart);
    game.events.on("touchend", Input._onTouchEnd);
    game.events.on("touchmove", Input._onTouchMove);
  }

  static _setPosition(x, y) {
    Input.x = x;
    Input.y = y;
  }

  static _onDown = (e) => {
    Input.down = true;
    Input._setPosition(e.offsetX, e.offsetY);
    Object.defineProperty(e, "x", { value: e.offsetX, configurable: true });
    Object.defineProperty(e, "y", { value: e.offsetY, configurable: true });
    Input.game.events.emit("inputdown", e);
  };

  static _onUp = (e) => {
    Input.down = false;
    Input._setPosition(e.offsetX, e.offsetY);
    Object.defineProperty(e, "x", { value: e.offsetX, configurable: true });
    Object.defineProperty(e, "y", { value: e.offsetY, configurable: true });
    Input.game.events.emit("inputup", e);
  };

  static _onMove = (e) => {
    Input._setPosition(e.offsetX, e.offsetY);
    Object.defineProperty(e, "x", { value: e.offsetX, configurable: true });
    Object.defineProperty(e, "y", { value: e.offsetY, configurable: true });
    Input.game.events.emit("inputmove", e);
  };

  static _onTouchStart = (e) => {
    const touch = e.touches[0];
    const rect = Input.game.canvas.getBoundingClientRect();
    Input.down = true;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    Input._setPosition(x, y);
    Object.defineProperty(e, "x", { value: x, configurable: true });
    Object.defineProperty(e, "y", { value: y, configurable: true });
    Input.game.events.emit("inputdown", e);
  };

  static _onTouchEnd = (e) => {
    Input.down = false;
    Input.game.events.emit("inputup", e);
  };

  static _onTouchMove = (e) => {
    const touch = e.touches[0];
    const rect = Input.game.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    Input._setPosition(x, y);
    Object.defineProperty(e, "x", { value: x, configurable: true });
    Object.defineProperty(e, "y", { value: y, configurable: true });
    Input.game.events.emit("inputmove", e);
  };
}

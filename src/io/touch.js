export class Touch {
  static init(game) {
    Touch.game = game;
    Touch.canvas = game.canvas;
    Touch.x = 0;
    Touch.y = 0;
    Touch.active = false;

    Touch.canvas.addEventListener("touchstart", Touch._onStart);
    Touch.canvas.addEventListener("touchend", Touch._onEnd);
    Touch.canvas.addEventListener("touchmove", Touch._onMove);
  }

  static _updatePosition(touch) {
    const rect = Touch.canvas.getBoundingClientRect();
    Touch.x = touch.clientX - rect.left;
    Touch.y = touch.clientY - rect.top;
  }

  static _onStart = (e) => {
    if (e.touches.length > 0) {
      Touch.active = true;
      Touch._updatePosition(e.touches[0]);
      Touch.game.events.emit("touchstart", e);
    }
  };

  static _onEnd = (e) => {
    Touch.active = false;
    Touch.game.events.emit("touchend", e);
  };

  static _onMove = (e) => {
    if (e.touches.length > 0) {
      Touch._updatePosition(e.touches[0]);
      Touch.game.events.emit("touchmove", e);
    }
  };
}

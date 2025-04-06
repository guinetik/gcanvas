export class Mouse {
  static init(game) {
    Mouse.game = game;
    Mouse.canvas = game.canvas;
    Mouse.x = 0;
    Mouse.y = 0;
    Mouse.leftDown = false;
    Mouse.middleDown = false;
    Mouse.rightDown = false;

    Mouse.canvas.addEventListener("mousemove", Mouse._onMove);
    Mouse.canvas.addEventListener("mousedown", Mouse._onDown);
    Mouse.canvas.addEventListener("mouseup", Mouse._onUp);
    Mouse.canvas.addEventListener("click", Mouse._onClick);
    Mouse.canvas.addEventListener("wheel", Mouse._onWheel);
  }

  static _updatePosition(e) {
    const rect = Mouse.canvas.getBoundingClientRect();
    Mouse.x = e.clientX - rect.left;
    Mouse.y = e.clientY - rect.top;
  }

  static _onMove = (e) => {
    Mouse._updatePosition(e);
    Mouse.game.events.emit("mousemove", e);
  };

  static _onDown = (e) => {
    Mouse._updatePosition(e);
    if (e.button === 0) Mouse.leftDown = true;
    if (e.button === 1) Mouse.middleDown = true;
    if (e.button === 2) Mouse.rightDown = true;
    Mouse.game.events.emit("mousedown", e);
  };

  static _onUp = (e) => {
    Mouse._updatePosition(e);
    if (e.button === 0) Mouse.leftDown = false;
    if (e.button === 1) Mouse.middleDown = false;
    if (e.button === 2) Mouse.rightDown = false;
    Mouse.game.events.emit("mouseup", e);
  };

  static _onClick = (e) => {
    Mouse._updatePosition(e);
    Mouse.game.events.emit("click", e);
  };

  static _onWheel = (e) => {
    Mouse._updatePosition(e);
    Mouse.game.events.emit("wheel", e);
  };
}

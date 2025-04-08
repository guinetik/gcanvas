export function applyDraggable(go, shape, options = {}) {
  const game = go.game;
  go.dragging = false;
  go.dragOffset = { x: 0, y: 0 };
  go.target = { x: shape.x, y: shape.y };
  go.friction = options.friction ?? 0.2;
  go.enableInteractivity(shape);
  go.on("inputdown", (e) => {
    //console.log("started ", go.dragging);
    go.dragging = true;
    go.dragOffset.x = shape.x - e.x;
    go.dragOffset.y = shape.y - e.y;
    if (options.onDragStart) options.onDragStart();
  });
  game.events.on("inputmove", (e) => {
    if (go.dragging) {
      //console.log("dragging", go.dragging);
      go.target.x = e.x + go.dragOffset.x;
      go.target.y = e.y + go.dragOffset.y;
    }
  });
  game.events.on("inputup", () => {
    if (!go.dragging) return;
    //console.log("stop dragging", go.dragging);
    go.dragging = false;
    if (options.onDragEnd) options.onDragEnd();
  });
  // Patch update method to apply drag friction
  const originalUpdate = go.update.bind(go);
  go.update = function (dt) {
    go.x += (go.target.x - shape.x) * go.friction;
    go.y += (go.target.y - shape.y) * go.friction;
    originalUpdate(dt); // in case user defined one
  };
}

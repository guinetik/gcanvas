export function applyDraggable(go, options = {}) {
  const game = go.game;
  
  // Clear any existing state to avoid duplicates
  go.dragging = false;
  go.dragOffset = { x: 0, y: 0 };
  
  // Clean up any existing event handlers to prevent duplicates
  if (go._dragInputMoveHandler) {
    game.events.off("inputmove", go._dragInputMoveHandler);
  }
  if (go._dragInputUpHandler) {
    game.events.off("inputup", go._dragInputUpHandler);
  }
  
  // Make sure the object is interactive
  if (typeof go.enableInteractivity === 'function') {
    go.enableInteractivity(go);
  } else {
    go.interactive = true;
  }
  
  // Define the input handlers and store them on the object to allow cleanup
  go._dragInputDownHandler = (e) => {
//    console.log("Drag input down", go.constructor.name);
    go.dragging = true;
    
    // Calculate offset from mouse position to object center
    go.dragOffset.x = go.x - e.x;
    go.dragOffset.y = go.y - e.y;
    
    if (options.onDragStart) options.onDragStart();
  };
  
  go._dragInputMoveHandler = (e) => {
    //console.log("Drag input move", go.constructor.name, "dragging:", go.dragging);
    if (go.dragging) {
      //console.log("Actually dragging", go.x, go.y, "to", e.x + go.dragOffset.x, e.y + go.dragOffset.y);
      // Directly update position
      go.x = e.x + go.dragOffset.x;
      go.y = e.y + go.dragOffset.y;
    }
  };
  
  go._dragInputUpHandler = (e) => {
    //console.log("Drag input up", go.constructor.name, "dragging:", go.dragging);
    if (!go.dragging) return;
    
    go.dragging = false;
    if (options.onDragEnd) options.onDragEnd();
  };
  
  // Bind the event handlers
  go.on("inputdown", go._dragInputDownHandler);
  game.events.on("inputmove", go._dragInputMoveHandler);
  game.events.on("inputup", go._dragInputUpHandler);
  
  // Return a cleanup function
  return () => {
    // Remove event listeners
    go.off("inputdown", go._dragInputDownHandler);
    game.events.off("inputmove", go._dragInputMoveHandler);
    game.events.off("inputup", go._dragInputUpHandler);
    
    // Clean up properties
    delete go._dragInputDownHandler;
    delete go._dragInputMoveHandler;
    delete go._dragInputUpHandler;
    delete go.dragging;
    delete go.dragOffset;
  };
}
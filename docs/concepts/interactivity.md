# Interactivity Guide

> How to handle mouse, touch, and keyboard input in GCanvas GameObjects

## Overview

GCanvas provides a unified event system for handling user input. GameObjects can respond to mouse clicks, touch events, hover states, and keyboard input through an event emitter pattern.

## Making GameObjects Interactive

To enable input handling on a GameObject, simply set the `interactive` property to `true`:

```js
class MyObject extends GameObject {
  constructor(game) {
    super(game);
    this.interactive = true; // Enable hit testing and events
  }
}
```

Once interactive, the GameObject will:
- Participate in hit testing (pointer collision detection)
- Receive input events when clicked/touched
- Emit hover events (mouseover/mouseout)

## Input Events

### Available Events

| Event | When Fired | Event Data |
|-------|------------|------------|
| `inputdown` | Mouse click or touch start | `{ x, y, ...nativeEvent }` |
| `inputup` | Mouse release or touch end | `{ x, y, ...nativeEvent }` |
| `inputmove` | Pointer movement over object | `{ x, y, ...nativeEvent }` |
| `click` | Complete click/tap | `{ x, y, ...nativeEvent }` |
| `mouseover` | Pointer enters object | `{ x, y, ...nativeEvent }` |
| `mouseout` | Pointer leaves object | `{ x, y, ...nativeEvent }` |

### Event Coordinates

All pointer events include `e.x` and `e.y` in **canvas coordinates** (not screen coordinates).

### Listening to Events

Use the `.on(eventName, callback)` method to attach event handlers:

```js
class Button extends GameObject {
  constructor(game) {
    super(game);
    this.interactive = true;
    
    // Listen for click
    this.on('inputdown', (e) => {
      console.log('Button pressed at', e.x, e.y);
      this.handlePress();
    });
    
    // Listen for hover
    this.on('mouseover', () => {
      this.showHoverState();
    });
    
    this.on('mouseout', () => {
      this.hideHoverState();
    });
  }
  
  handlePress() {
    // Button logic
  }
}
```

## Complete Example

Here's a complete interactive button with hover and click feedback:

```js
import { Game, GameObject, Rectangle, TextShape } from '@guinetik/gcanvas';

class InteractiveButton extends GameObject {
  constructor(game, label, onClick) {
    super(game, { width: 200, height: 60 });
    
    // Enable interactivity
    this.interactive = true;
    
    // Store callback
    this.onClick = onClick;
    
    // Create button shape
    this.background = new Rectangle({
      width: 200,
      height: 60,
      color: '#4CAF50'
    });

    this.label = new TextShape(label, {
      font: '20px sans-serif',
      color: '#fff',
      align: 'center',
      baseline: 'middle'
    });
    
    // State
    this.hovered = false;
    this.pressed = false;
    
    // Setup events
    this.on('mouseover', () => {
      this.hovered = true;
      this.background.color = '#66BB6A';
    });
    
    this.on('mouseout', () => {
      this.hovered = false;
      this.pressed = false;
      this.background.color = '#4CAF50';
    });
    
    this.on('inputdown', () => {
      this.pressed = true;
      this.background.color = '#388E3C';
    });
    
    this.on('inputup', () => {
      if (this.pressed && this.hovered) {
        this.onClick?.(); // Fire callback
      }
      this.pressed = false;
      this.background.color = this.hovered ? '#66BB6A' : '#4CAF50';
    });
  }
  
  render() {
    // Draw background
    this.background.x = this.x;
    this.background.y = this.y;
    this.background.draw();
    
    // Draw label
    this.label.x = this.x;
    this.label.y = this.y;
    this.label.draw();
  }
}
```

## Interactive Objects in Scenes

GameObjects remain interactive when added to Scenes. The Pipeline automatically handles event dispatch to Scene children:

```js
class MyGame extends Game {
  init() {
    super.init();
    
    // Create a scene
    const uiScene = new Scene(this);
    
    // Create interactive button
    const button = new InteractiveButton(this, 'Click Me', () => {
      console.log('Button clicked!');
    });
    button.x = 100;
    button.y = 100;
    
    // Add to scene - events still work!
    uiScene.add(button);
    
    // Add scene to pipeline
    this.pipeline.add(uiScene);
  }
}
```

### Event Dispatch Order

Events are dispatched **front-to-back** (highest z-index first):

1. Pipeline checks top-level GameObjects from highest to lowest z-index
2. When a Scene is encountered, it checks its children (also front-to-back)
3. First object that is hit receives the event
4. Event propagation stops (no bubbling)

### Nested Scenes

Events work correctly in nested Scene hierarchies:

```js
const rootScene = new Scene(this);
const childScene = new Scene(this);
const button = new InteractiveButton(this, 'Nested Button', onClick);

button.interactive = true; // Make button interactive
childScene.add(button);    // Add to child scene
rootScene.add(childScene); // Nest scenes
this.pipeline.add(rootScene); // Add to pipeline

// Button will still receive events correctly!
```

## Keyboard Input

Keyboard events are handled globally through `game.input` or `game.events`:

### Using game.input

```js
update(dt) {
  // Check if key is currently pressed
  if (this.game.input.isKeyDown('ArrowUp')) {
    this.y -= 200 * dt;
  }
  
  if (this.game.input.isKeyDown('Space')) {
    this.jump();
  }
}
```

### Using game.events

```js
constructor(game) {
  super(game);
  
  // Listen for specific key events
  this.game.events.on(Keys.SPACE, () => {
    this.jump();
  });
  
  this.game.events.on(Keys.SPACE + '_up', () => {
    this.stopJump();
  });
  
  // Listen for any keydown/keyup
  this.game.events.on('keydown', (e) => {
    console.log('Key pressed:', e.key);
  });
}
```

### Available Key Constants

Import from `Keys`:

```js
import { Keys } from '@guinetik/gcanvas';

Keys.W, Keys.A, Keys.S, Keys.D
Keys.UP, Keys.DOWN, Keys.LEFT, Keys.RIGHT
Keys.SPACE, Keys.ENTER, Keys.ESC
Keys.SHIFT, Keys.CTRL, Keys.ALT
// ... and more
```

## Mouse/Pointer Position

Access the current pointer position through `game.mouse`:

```js
update(dt) {
  const dx = this.game.mouse.x - this.x;
  const dy = this.game.mouse.y - this.y;
  
  // Rotate to face mouse
  this.rotation = Math.atan2(dy, dx);
}
```

## Hit Testing

Hit testing is handled automatically by the `GameObject._hitTest(x, y)` method, which:

1. Checks if the GameObject is interactive
2. Transforms pointer coordinates to local space (accounting for position, rotation, scale, and parent transforms)
3. Tests if the point is inside the GameObject's bounds

You can override `getBounds()` to customize hit testing:

```js
class CustomShape extends GameObject {
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.customWidth,
      height: this.customHeight
    };
  }
}
```

## Common Patterns

### Toggle on Click

```js
constructor(game) {
  super(game);
  this.interactive = true;
  this.enabled = false;
  
  this.on('inputdown', () => {
    this.enabled = !this.enabled;
    this.updateVisual();
  });
}
```

### Drag and Drop

Use the built-in `applyDraggable` mixin:

```js
import { applyDraggable } from '@guinetik/gcanvas';

const box = new GameObject(game, { width: 100, height: 100 });
box.interactive = true;
applyDraggable(box);
```

### Hover State Tracking

```js
constructor(game) {
  super(game);
  this.interactive = true;
  this.isHovered = false;
  
  this.on('mouseover', () => {
    this.isHovered = true;
  });
  
  this.on('mouseout', () => {
    this.isHovered = false;
  });
}
```

### Global Input Listeners

For events that should always fire (not just on a specific object):

```js
constructor(game) {
  super(game);
  
  // Listen to ALL clicks, not just this object
  this.game.events.on('inputdown', (e) => {
    console.log('Click anywhere at', e.x, e.y);
  });
}
```

## Event Removal

Remove event listeners when cleaning up:

```js
destroy() {
  this.off('inputdown', this.handleClick);
  this.off('mouseover', this.handleHover);
  super.destroy();
}
```

## Migration from Old API

If you're updating code that uses the old API:

### Old Way (Deprecated)
```js
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.enableInteractivity(this.shape); // ❌ Doesn't exist
  }
  
  onPointerDown(e) { // ❌ Not called
    console.log('clicked');
  }
}
```

### New Way (Current)
```js
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.interactive = true; // ✅ Enable interactivity
    
    // ✅ Use event emitter pattern
    this.on('inputdown', (e) => {
      console.log('clicked');
    });
  }
}
```

## See Also

- [Event System Demo](../../demos/events.html) - Live demo showing all event types
- [GameObject API](../modules/game/README.md#gameobject-class)
- [Input Utilities](../modules/io/README.md)
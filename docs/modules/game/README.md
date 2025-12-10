# Game Module

> Core game loop, Pipeline, GameObjects, and Scenes.

## Overview

The game module provides the interactive layer of GCanvas. It manages the game loop, object lifecycle, input handling, and scene organization.

## Quick Start

```js
import { Game, Scene, GameObject, Circle } from 'gcanvas';

class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(30, { color: 'blue' });
    this.enableInteractivity(this.shape);
  }

  update(dt) {
    if (this.game.input.isKeyDown('ArrowRight')) {
      this.shape.x += 200 * dt;
    }
  }

  render() {
    this.shape.draw();
  }
}

class MyGame extends Game {
  init() {
    super.init();
    this.enableFluidSize();

    const scene = new Scene(this);
    scene.add(new Player(this));
    this.pipeline.add(scene);
  }
}

const game = new MyGame(document.getElementById('canvas'));
game.start();
```

## Core Classes

| Class | Description |
|-------|-------------|
| **Game** | Main loop, canvas management, input initialization |
| **Pipeline** | Manages object collections, update/render dispatch |
| **GameObject** | Base class for interactive entities |
| **Scene** | Hierarchical container for GameObjects |

## Game Class

The entry point for interactive applications.

```js
class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();      // Canvas fills viewport
    this.backgroundColor = '#1a1a2e';
  }

  init() {
    super.init();                // Initialize input systems
    // Create scenes and objects
  }

  update(dt) {
    super.update(dt);            // Update pipeline
    // Custom game logic
  }

  render() {
    super.render();              // Render pipeline
    // Custom rendering
  }
}

const game = new MyGame(canvas);
game.setFPS(60);                 // Set target FPS
game.start();                    // Begin game loop
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `canvas` | `HTMLCanvasElement` | The canvas element |
| `ctx` | `CanvasRenderingContext2D` | 2D context |
| `pipeline` | `Pipeline` | Object manager |
| `events` | `EventEmitter` | Event system |
| `width` | `number` | Canvas width |
| `height` | `number` | Canvas height |
| `running` | `boolean` | Is loop running? |
| `dt` | `number` | Last delta time |

### Key Methods

| Method | Description |
|--------|-------------|
| `start()` | Begin the game loop |
| `stop()` | Stop the game loop |
| `init()` | Initialize game (override) |
| `update(dt)` | Update logic (override) |
| `render()` | Render logic (override) |
| `enableFluidSize()` | Auto-resize to window |
| `setFPS(fps)` | Set target frame rate |
| `enablePauseOnBlur(bool)` | Pause when tab loses focus |

## Pipeline Class

Manages collections of objects for update and render.

```js
// Add objects
game.pipeline.add(scene);
game.pipeline.add(gameObject);

// Remove objects
game.pipeline.remove(object);

// Clear all
game.pipeline.clear();
```

Pipeline automatically:
- Calls `update(dt)` on active objects
- Calls `render()` on visible objects
- Sorts by zIndex
- Dispatches input events

## GameObject Class

Base class for all interactive entities.

```js
class Enemy extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Rectangle({ width: 40, height: 40, color: 'red' });
    this.enableInteractivity(this.shape);
    this.speed = 100;
  }

  update(dt) {
    this.shape.x += this.speed * dt;
  }

  render() {
    this.shape.draw();
  }

  // Input events
  onPointerDown(e) { }
  onPointerUp(e) { }
  onPointerMove(e) { }
  onMouseOver() { }
  onMouseOut() { }
}
```

### Lifecycle Methods

| Method | When Called |
|--------|-------------|
| `update(dt)` | Every frame (if active) |
| `render()` | Every frame (if visible) |
| `destroy()` | When removed from pipeline |

### Input Methods

| Method | Event |
|--------|-------|
| `onPointerDown(e)` | Click/tap start |
| `onPointerUp(e)` | Click/tap end |
| `onPointerMove(e)` | Pointer movement |
| `onMouseOver()` | Hover enter |
| `onMouseOut()` | Hover leave |

## Scene Class

Hierarchical container for GameObjects.

```js
const gameScene = new Scene(game);
const uiScene = new Scene(game);

// Add objects to scenes
gameScene.add(player);
gameScene.add(enemy);

uiScene.add(healthBar);
uiScene.add(scoreDisplay);

// Add scenes to pipeline (order matters)
game.pipeline.add(gameScene);  // Rendered first
game.pipeline.add(uiScene);    // Rendered on top
```

Scenes provide:
- Hierarchical organization
- Coordinate spaces
- Z-ordering of children
- Collective transforms

## UI Components

Built on GameObject and Scene:

| Component | Description |
|-----------|-------------|
| `Button` | Clickable with visual states |
| `ToggleButton` | On/off toggle |
| `Cursor` | Custom cursor |
| `FPSCounter` | FPS display |

```js
import { Button, FPSCounter } from 'gcanvas';

const button = new Button(game, 'Click Me', {
  x: 400,
  y: 300
});

button.on('click', () => {
  console.log('Clicked!');
});

scene.add(button);
scene.add(new FPSCounter(game, { anchor: 'bottom-right' }));
```

## Input Access

```js
// In GameObject or Game
update(dt) {
  // Keyboard
  if (this.game.input.isKeyDown('ArrowLeft')) { }
  if (this.game.input.isKeyDown('Space')) { }
  if (this.game.input.isKeyDown('KeyW')) { }

  // Mouse position
  const mx = this.game.mouse.x;
  const my = this.game.mouse.y;
}
```

## Events

```js
// Custom events
game.events.on('player-died', (data) => {
  console.log('Player died:', data);
});

game.events.emit('player-died', { score: 100 });

// Remove listener
game.events.off('player-died', handler);
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                         Game                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │                     Pipeline                        │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │                    Scene                      │  │ │
│  │  │  ┌────────────┐  ┌────────────┐              │  │ │
│  │  │  │ GameObject │  │ GameObject │  ...         │  │ │
│  │  │  │  + Shape   │  │  + Shape   │              │  │ │
│  │  │  └────────────┘  └────────────┘              │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
│                           │                              │
│                           ▼                              │
│                    ┌────────────┐                        │
│                    │ Game Loop  │                        │
│                    │ update(dt) │                        │
│                    │ render()   │                        │
│                    └────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Related

- [Game Lifecycle](../../concepts/lifecycle.md) - Update/render cycle
- [Two-Layer Architecture](../../concepts/two-layer-architecture.md) - Shape vs Game layer
- [First Game Guide](../../getting-started/first-game.md)

## See Also

- [Shapes Module](../shapes/README.md)
- [IO Module](../io/README.md) - Input handling
- [Motion Module](../motion/README.md) - Animation

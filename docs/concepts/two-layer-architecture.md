# Two-Layer Architecture

> Understanding when to use the Shape Layer vs the Game Layer.

## Overview

GCanvas provides two complementary approaches to building canvas applications:

1. **Shape Layer** - For declarative, static graphics
2. **Game Layer** - For interactive, dynamic applications

You can use either layer independently or combine them for complex applications.

## Shape Layer

The Shape Layer is for drawing graphics without a game loop. Shapes are self-contained objects that know how to render themselves.

### When to Use

- Static visualizations
- Data charts and graphs
- Decorative graphics
- Simple animations (manual redraw)
- Learning canvas fundamentals

### Key Classes

- `Shape` and subclasses (`Circle`, `Rectangle`, `Star`, etc.)
- `Group` for composing shapes
- `Painter` for direct canvas control

### Example

```js
import { Circle, Rectangle, Group, Painter } from 'gcanvas';

// Initialize Painter with canvas context
const canvas = document.getElementById('canvas');
Painter.init(canvas.getContext('2d'));

// Create shapes
const circle = new Circle(50, { x: 100, y: 100, color: 'red' });
const rect = new Rectangle(80, 40, { x: 200, y: 100, color: 'blue' });

// Draw immediately
Painter.clear();
circle.draw();
rect.draw();
```

### Characteristics

| Aspect | Shape Layer |
|--------|-------------|
| Loop | None (manual redraw) |
| State | Shapes hold their own state |
| Input | Manual event handling |
| Animation | Call draw() on each frame manually |
| Complexity | Simple, direct |

## Game Layer

The Game Layer provides a complete game loop with automatic updates, rendering, and input handling.

### When to Use

- Games and simulations
- Interactive applications
- Real-time animations
- Complex state management
- Multi-object coordination

### Key Classes

- `Game` - Main loop and canvas management
- `Pipeline` - Object lifecycle management
- `GameObject` - Interactive entities
- `Scene` - Hierarchical organization

### Example

```js
import { Game, Scene, GameObject, Circle } from 'gcanvas';

class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(40, { color: 'blue' });
    this.enableInteractivity(this.shape);
  }

  update(dt) {
    // Called every frame
    if (this.game.input.isKeyDown('ArrowRight')) {
      this.shape.x += 200 * dt;
    }
  }

  render() {
    // Called every frame after update
    this.shape.draw();
  }

  onPointerDown(e) {
    // Automatic input handling
    console.log('Clicked!');
  }
}

class MyGame extends Game {
  init() {
    this.enableFluidSize();
    const scene = new Scene(this);
    scene.add(new Player(this));
    this.pipeline.add(scene);
  }
}

const game = new MyGame(document.getElementById('canvas'));
game.start();
```

### Characteristics

| Aspect | Game Layer |
|--------|-------------|
| Loop | Automatic (requestAnimationFrame) |
| State | Managed by Pipeline |
| Input | Automatic dispatching to objects |
| Animation | Built-in with dt (delta time) |
| Complexity | Full-featured |

## Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                      Shape Layer                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │ Circle  │  │Rectangle│  │  Star   │  ... more shapes    │
│  └────┬────┘  └────┬────┘  └────┬────┘                      │
│       │            │            │                            │
│       └────────────┼────────────┘                            │
│                    ▼                                         │
│              ┌──────────┐                                    │
│              │  Group   │  (optional composition)            │
│              └────┬─────┘                                    │
│                   │                                          │
│                   ▼                                          │
│              ┌──────────┐                                    │
│              │  draw()  │  (manual call)                     │
│              └──────────┘                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Game Layer                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                       Game                           │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │                   Pipeline                   │    │    │
│  │  │  ┌─────────────────────────────────────┐    │    │    │
│  │  │  │               Scene                  │    │    │    │
│  │  │  │  ┌───────────┐  ┌───────────┐       │    │    │    │
│  │  │  │  │GameObject │  │GameObject │  ...  │    │    │    │
│  │  │  │  │  + Shape  │  │  + Shape  │       │    │    │    │
│  │  │  │  └───────────┘  └───────────┘       │    │    │    │
│  │  │  └─────────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│                     ┌────────────┐                           │
│                     │ Game Loop  │  (automatic)              │
│                     │ update(dt) │                           │
│                     │ render()   │                           │
│                     └────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Mixing Layers

You can use shapes without GameObjects, or combine both approaches:

```js
class HybridGame extends Game {
  init() {
    // Game layer for interactive elements
    const scene = new Scene(this);
    scene.add(new Player(this));
    this.pipeline.add(scene);

    // Shape layer for static background
    this.background = new Group();
    this.background.add(new Rectangle(this.width, this.height, { color: '#222' }));
  }

  render() {
    // Draw static shapes first
    this.background.draw();

    // Then let pipeline draw interactive objects
    super.render();
  }
}
```

## Decision Guide

| If you need... | Use |
|---------------|-----|
| Static graphics | Shape Layer |
| Simple animations | Shape Layer + manual loop |
| Keyboard/mouse input | Game Layer |
| Multiple interactive objects | Game Layer |
| Collision detection | Game Layer |
| Scene organization | Game Layer |
| Quick prototype | Shape Layer |
| Full game | Game Layer |

## Related

- [Architecture Overview](./architecture-overview.md) - Full system architecture
- [Rendering Pipeline](./rendering-pipeline.md) - Shape inheritance chain
- [Game Lifecycle](./lifecycle.md) - Update/render cycle

## See Also

- [Shapes Module](../modules/shapes/README.md)
- [Game Module](../modules/game/README.md)
- [Getting Started: Hello World](../getting-started/hello-world.md)

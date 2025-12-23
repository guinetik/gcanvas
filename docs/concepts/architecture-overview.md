# Architecture Overview

> High-level system architecture, module relationships, and design philosophy.

## Overview

GCanvas is a modular 2D rendering and game framework built on top of the HTML5 Canvas API. It follows a layered architecture where each module has a clear responsibility and minimal coupling to other modules.

The library is designed around three core principles:

1. **Modularity** - Use only what you need
2. **Composability** - Combine simple parts to build complex systems
3. **Zero Dependencies** - Pure JavaScript, works everywhere

## Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           GCanvas                                │
│                         (index.js)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Core Modules                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │   shapes/   │  │   game/     │  │    painter/     │   │   │
│  │  │  40+ shapes │  │  Game loop  │  │   Canvas API    │   │   │
│  │  │  hierarchy  │  │  Pipeline   │  │   abstraction   │   │   │
│  │  │  Group      │  │  GameObject │  │                 │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Support Modules                          │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │   │
│  │  │ motion │ │   io   │ │  math  │ │  util  │ │ mixins │  │   │
│  │  │ Tween  │ │ Events │ │ Random │ │ Layout │ │Draggable│  │   │
│  │  │ Easing │ │ Mouse  │ │ Noise  │ │Position│ │ Anchor │  │   │
│  │  │ Motion │ │ Keys   │ │Fractals│ │ZIndex  │ │        │  │   │
│  │  │Tweenetik│ │ Touch  │ │Patterns│ │ Tasks  │ │        │  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Utility Modules                          │   │
│  │                    ┌────────┐                             │   │
│  │                    │ logger │                             │   │
│  │                    │ Logger │                             │   │
│  │                    │Loggable│                             │   │
│  │                    │DebugTab│                             │   │
│  │                    └────────┘                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Module Responsibilities

### Core Modules

| Module | Responsibility | Key Classes |
|--------|---------------|-------------|
| **shapes** | Visual primitives and rendering | `Shape`, `Circle`, `Rectangle`, `Group`, `Transformable` |
| **game** | Game loop, lifecycle, object management | `Game`, `Pipeline`, `GameObject`, `Scene` |
| **painter** | Canvas context abstraction | `Painter`, `PainterShapes`, `PainterText` |

### Support Modules

| Module | Responsibility | Key Classes |
|--------|---------------|-------------|
| **motion** | Animation and tweening | `Motion`, `Tweenetik`, `Easing`, `Tween` |
| **io** | Input handling | `EventEmitter`, `Mouse`, `Keys`, `Touch`, `Input` |
| **math** | Mathematical utilities | `Random`, `Noise`, `Complex`, `Fractals`, `Patterns` |
| **util** | Layout and positioning | `Layout`, `Position`, `ZOrderedCollection` |
| **mixins** | Composable behaviors | `applyDraggable()`, `applyAnchor()` |

### Utility Modules

| Module | Responsibility | Key Classes |
|--------|---------------|-------------|
| **logger** | Debug and logging | `Logger`, `Loggable`, `DebugTab` |

## Data Flow

```
User Input                     Game Loop
    │                              │
    ▼                              ▼
┌────────┐     events         ┌────────┐
│   IO   │ ──────────────────►│  Game  │
└────────┘                    └────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐   ┌──────────┐
              │ Pipeline │  │ Tweenetik│   │  Painter │
              │ update() │  │ update() │   │  clear() │
              └──────────┘  └──────────┘   └──────────┘
                    │
                    ▼
              ┌──────────┐
              │GameObject│
              │ update() │
              │ render() │
              └──────────┘
                    │
                    ▼
              ┌──────────┐
              │  Shape   │
              │  draw()  │
              └──────────┘
                    │
                    ▼
              ┌──────────┐
              │ Painter  │
              │ Canvas   │
              └──────────┘
```

## Design Patterns

### 1. Inheritance Chain (Shapes)

Shapes use a linear inheritance hierarchy where each class adds specific functionality:

```
Euclidian → Geometry2d → Traceable → Renderable → Transformable → Shape
```

See: [Rendering Pipeline](./rendering-pipeline.md)

### 2. Static Singleton (Painter)

`Painter` is a static utility class initialized once with the canvas context:

```js
Painter.init(ctx);
Painter.shapes.circle(100, 100, 50);
```

### 3. Component Pattern (GameObject + Shape)

GameObjects compose shapes rather than inheriting from them:

```js
class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(40, { color: 'blue' });
  }
}
```

### 4. Mixin Pattern (Behaviors)

Optional behaviors are applied via mixin functions:

```js
applyDraggable(gameObject, gameObject.shape);
applyAnchor(gameObject, { anchor: 'top-right' });
```

### 5. Observer Pattern (Events)

The `EventEmitter` provides pub-sub event handling:

```js
game.events.on('click', (e) => { ... });
game.events.emit('custom-event', data);
```

## Entry Point

The main entry point (`src/index.js`) re-exports all modules:

```js
export * from "./util";
export * from "./math";
export * from "./logger";
export * from "./painter";
export * from "./shapes";
export * from "./io";
export * from "./game";
export * from "./motion";
export * from "./mixins";
```

This allows importing any component from the main package:

```js
import { Game, Circle, Painter, Motion } from '@guinetik/gcanvas';
```

## Related

- [Two-Layer Architecture](./two-layer-architecture.md) - Shape vs Game layer
- [Rendering Pipeline](./rendering-pipeline.md) - Shape inheritance chain
- [Game Lifecycle](./lifecycle.md) - Update/render cycle

## See Also

- [Shapes Module](../modules/shapes/README.md)
- [Game Module](../modules/game/README.md)
- [Painter Module](../modules/painter/README.md)

# GCanvas Documentation

> Pragmatic canvas primitives for 2D graphics, interactive demos, games, and creative coding.

GCanvas is a modular 2D rendering and game framework built on top of the HTML5 Canvas API. Inspired by the simplicity of p5.js and the composability of game engines.

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Getting Started](./getting-started/installation.md) | Installation and first steps |
| [Concepts](./concepts/architecture-overview.md) | Core architecture and design |
| [Shapes Module](./modules/shapes/README.md) | Drawing primitives and hierarchy |
| [Game Module](./modules/game/README.md) | Game loop and GameObjects |
| [Particle Module](./modules/particle/README.md) | High-performance particle systems |
| [Util Module](./modules/util/README.md) | Camera3D, Scene3D, layouts |
| [Collision Module](./modules/collision/README.md) | Collision detection and management |
| [State Module](./modules/state/README.md) | State machines for entities and games |
| [Painter Module](./modules/painter/README.md) | Low-level canvas API |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         GCanvas                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Shapes    │  │    Game     │  │      Painter        │  │
│  │  (Drawing)  │  │ (Lifecycle) │  │   (Canvas API)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Collision │ │  State  │ │ Motion  │ │   IO    │  ...    │
│  │ (Physics) │ │  (FSM)  │ │ (Anim)  │ │ (Input) │         │
│  └───────────┘ └─────────┘ └─────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

GCanvas is organized into **12 core modules**:

| Module | Purpose |
|--------|---------|
| **[shapes](./modules/shapes/README.md)** | 40+ drawable primitives and shape classes |
| **[game](./modules/game/README.md)** | Core game loop, Pipeline, GameObjects, Scenes |
| **[particle](./modules/particle/README.md)** | High-performance particle systems with pooling |
| **[collision](./modules/collision/README.md)** | Collision detection algorithms and group management |
| **[state](./modules/state/README.md)** | State machines with lifecycle callbacks |
| **[painter](./modules/painter/README.md)** | Low-level canvas drawing API |
| **[util](./modules/util/README.md)** | Camera3D, Scene3D, Layout, Position utilities |
| **motion** | Animation with Tweenetik and Motion patterns |
| **io** | Input handling (Mouse, Keyboard, Touch, Events) |
| **math** | Random, Noise, Fractals, Patterns |
| **mixins** | Draggable, Anchor behaviors |
| **logger** | Debug logging system |

## Two-Layer Architecture

GCanvas provides two complementary ways to work:

### Shape Layer (Declarative Drawing)

For static visuals and simple graphics. Use shapes directly without a game loop:

```js
import { Circle, Rectangle, Painter } from '@guinetik/gcanvas';

Painter.init(ctx);

const circle = new Circle(100, { x: 200, y: 150, color: 'red' });
circle.draw();
```

### Game Layer (Interactive Entities)

For games, simulations, and interactive applications:

```js
import { Game, Scene, GameObject, Circle } from '@guinetik/gcanvas';

class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(40, { color: 'blue' });
    
    // Enable interactivity
    this.interactive = true;
    
    // Listen for input events
    this.on('inputdown', (e) => {
      console.log('Player clicked!');
    });
  }

  update(dt) {
    // Game logic here
  }

  render() {
    this.shape.draw();
  }
}
```

[Learn more about the Two-Layer Architecture](./concepts/two-layer-architecture.md)

## The Rendering Pipeline

Every visual element inherits from a chain of base classes:

```
Euclidian          ─── Position (x, y) and size (width, height)
    │
Geometry2d         ─── Bounding boxes and constraints
    │
Traceable          ─── Debug visualization
    │
Renderable         ─── Visibility, opacity, shadows
    │
Transformable      ─── Rotation and scaling
    │
Shape              ─── Fill color, stroke, line styling
    │
[Circle, Rectangle, Star, Cube, ...]  ─── Concrete implementations
```

[Learn more about the Rendering Pipeline](./concepts/rendering-pipeline.md)

## Quick Start

### Installation

**NPM (Recommended):**

```bash
npm install @guinetik/gcanvas
```

**Or clone the repository:**

```bash
git clone https://github.com/guinetik/gcanvas.git
cd gcanvas
npm install
npm run dev
```

### Hello World

```html
<canvas id="game"></canvas>
<script type="module">
  import { Game, Scene, Rectangle, TextShape, Group } from '@guinetik/gcanvas';

  class HelloWorld extends Game {
    init() {
      super.init();
      this.enableFluidSize();
      this.backgroundColor = 'black';

      const box = new Rectangle({
        width: 200,
        height: 80,
        color: '#111',
        stroke: '#0f0',
        lineWidth: 2
      });

      const label = new TextShape('Hello World!', {
        font: '18px monospace',
        color: '#0f0',
        align: 'center',
        baseline: 'middle'
      });

      const group = new Group({ x: this.width / 2, y: this.height / 2, origin: "center" });
      group.add(box);
      group.add(label);

      const scene = new Scene(this);
      scene.add(group);
      this.pipeline.add(scene);
    }
  }

  const game = new HelloWorld(document.getElementById('game'));
  game.start();
</script>
```

[Full getting started guide](./getting-started/hello-world.md)

## Features

- **40+ Shape Primitives** - Circle, Rectangle, Star, Polygon, Heart, and more
- **2.5D Shapes** - Cube, Cylinder, Sphere, Cone, Prism with pseudo-3D rendering
- **Groups** - Composite shapes with collective transforms
- **Transforms** - Rotation, scale, opacity, constraints
- **Painter API** - Direct canvas control when needed
- **GameObjects** - Interactive entities with lifecycle methods
- **Scenes & Scene3D** - Hierarchical organization with optional 3D projection
- **Camera3D** - Pseudo-3D projection with mouse-controlled rotation
- **Particle Systems** - High-performance particles with object pooling and composable updaters
- **Collision Detection** - AABB, circles, lines, sweep tests, and group management
- **State Machines** - FSM with enter/update/exit lifecycle, timed transitions
- **UI Components** - Button, ToggleButton, Cursor, Layout managers
- **Motion System** - Stateless animation patterns (orbit, bounce, spiral...)
- **Tweenetik** - Property-based tweening with easing
- **Event System** - Mouse, touch, keyboard with unified input
- **Zero Dependencies** - Pure JavaScript, works everywhere

## Demo

See GCanvas in action: [gcanvas.guinetik.com](https://gcanvas.guinetik.com)

Or run locally:

```bash
npm run dev
```

## API Documentation

- [Shapes Module](./modules/shapes/README.md) - All drawable primitives
- [Game Module](./modules/game/README.md) - Game loop and objects
- [Particle Module](./modules/particle/README.md) - Particle systems
- [Util Module](./modules/util/README.md) - Camera3D, Scene3D, layouts
- [Collision Module](./modules/collision/README.md) - Collision detection
- [State Module](./modules/state/README.md) - State machines
- [Painter Module](./modules/painter/README.md) - Canvas abstraction

## Learn More

- [Architecture Overview](./concepts/architecture-overview.md)
- [Rendering Pipeline](./concepts/rendering-pipeline.md)
- [Game Lifecycle](./concepts/lifecycle.md)
- [Installation Guide](./getting-started/installation.md)

---

**Source:** [github.com/guinetik/gcanvas](https://github.com/guinetik/gcanvas)

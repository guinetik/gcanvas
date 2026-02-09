# GCanvas

![demo screenshot](./demo.png)

**GCanvas is a pragmatic set of canvas primitives**: a zero-dependency 2D shape library + an optional game layer (pipeline, input, scenes) for interactive demos, games, and generative art.

- **Demos**: [`https://gcanvas.guinetik.com`](https://gcanvas.guinetik.com)
- **Docs (in repo)**: [`docs/`](./docs/README.md)

---

## What’s in the box?

- **Shape layer**: declarative shapes (`Circle`, `Rectangle`, `Star`, `Group`, …)
- **Game layer**: `Game`, `Pipeline`, `Scene`, `GameObject`, UI, input events
- **Extras**: motion helpers, tweening, particles, collision, state machines, WebGL helpers, fluent API

---

## Installation

```bash
npm install @guinetik/gcanvas
```

---

## Quick start (Shape layer)

```js
import { Circle, Rectangle, Painter } from "@guinetik/gcanvas";

const canvas = document.getElementById("canvas");
Painter.init(canvas.getContext("2d"));

const circle = new Circle(50, { x: 80, y: 60, color: "#ff4d4d" });
const rect = new Rectangle({ x: 180, y: 40, width: 120, height: 80, color: "#4ecdc4" });

Painter.clear();
circle.draw();
rect.draw();
```

---

## Quick start (Game layer)

```js
import { Game, Scene, GameObject, Circle } from "@guinetik/gcanvas";

class Player extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(25, { color: "deepskyblue", origin: "center" });
    this.interactive = true;
    this.on("click", (e) => console.log("click", e.x, e.y));
  }

  update(dt) {
    // Keep centered on resize
    this.shape.x = this.game.width / 2;
    this.shape.y = this.game.height / 2;

    // Rotation is in DEGREES
    this.shape.rotation += 90 * dt;
  }

  render() {
    this.shape.draw();
  }
}

class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#0b0e14";
  }

  init() {
    super.init();
    const scene = new Scene(this);
    scene.add(new Player(this));
    this.pipeline.add(scene);
  }
}

window.addEventListener("load", () => {
  const game = new MyGame(document.getElementById("game"));
  game.start();
});
```

---

## Coordinate system (v3)

GCanvas v3 uses an **origin-based** coordinate system aligned with the Canvas API:

- Canvas `(0, 0)` is **top-left**
- Shapes default to `origin: "top-left"` so `(x, y)` is the **top-left of the bounding box**
- Set `origin: "center"` to position/rotate/scale around the center
- The **Fluent API defaults shapes to `origin: "center"`** for “creative coding” ergonomics

See: [`docs/concepts/coordinate-system.md`](./docs/concepts/coordinate-system.md) and [`docs/MIGRATION-3.0.md`](./docs/MIGRATION-3.0.md).

---

## Documentation

The docs in `docs/` are the source of truth for v3:

- [Getting started](./docs/getting-started/installation.md)
- [Shapes module](./docs/modules/shapes/README.md)
- [Game module](./docs/modules/game/README.md)
- [Fluent API](./docs/modules/fluent/README.md)
- [WebGL module](./docs/modules/webgl/README.md)

---

## Development

```bash
npm run dev
npm run test
npm run build
```
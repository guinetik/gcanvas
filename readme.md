# GCanvas 🎨

![demo screenshot](./demo.png)

A minimalist 2D canvas rendering library built for learning, expression, and creative coding.

Inspired by the simplicity of p5.js and the composability of game engines — **GCanvas** gives you structured primitives, a game loop, interactivity, and a growing set of intuitive, declarative shapes.

---

## 🌟 Features

- 🟣 **Primitives** like `Circle`, `Line`, `Rectangle`, `Star`, `Polygon`, and more
- 🔷 **2.5D Shapes** like `Cube`, `Cylinder`, `Prism`, `Sphere`, `Cone`
- 🧩 **Components** like `FPSCounter`, `StickFigure`, `Text`, `Group`
- ✨ **Transforms** — rotation, scale, constraints, group nesting
- 🎯 **Event system** — hover, click, mouse, and touch support
- 🧠 **Tweening** — physics-based spring motion built-in
- 🖼 **Painter-based API** for clear, centralized rendering control
- 📦 **Bundle-friendly** — works with Vite, Rollup, or standalone in `<script>`

---

## 📦 Installation

Coming soon to NPM.

For now, clone this repo:

```bash
git clone https://github.com/YOUR_USERNAME/gcanvas.git
cd gcanvas
npm install
```

To run the shape demo:

```bash
npm run dev
```

To build the library:

```bash
npm run build
```

To generate a readable single-file debug build:

```bash
npm run build:debug
```

---

## 🚀 Quick Start

### Using via ESM:

```js
import { Circle } from './dist/gcanvas.es.js';

const circle = new Circle(100, 100, 50, { fillColor: 'red' });
circle.draw(); // uses static Painter.ctx internally
```

### Using via `<script>`:

```html
<script src="./dist/gcanvas.umd.js"></script>
<script>
  const circle = new GCanvas.Circle(200, 200, 40, { fillColor: 'blue' });
  circle.draw();
</script>
```

---

## 🧠 Core Concepts

### 🖌 Shapes

All shapes extend `Shape` and support:

- `.x`, `.y`
- `.rotation`, `.scaleX`, `.scaleY`
- `.fillColor`, `.strokeColor`, `.lineWidth`
- `.draw()` — paints to the canvas via `Painter`

```js
new Rectangle(x, y, width, height, options);
new Star(x, y, radius, spikes, inset, options);
new Polygon(x, y, sides, radius, options);
```

### 🧱 Groups

Group shapes together, apply transforms as a unit:

```js
const group = new Group(x, y);
group.add(new Circle(0, 0, 30));
group.add(new Rectangle(0, 50, 40, 20));
group.draw();
```

### 🎮 GameObject

Every interactive thing lives as a `GameObject`. You can:

- Override `update(dt)` and `render()`
- Call `enableInteractivity(shape)` to receive mouse/touch events
- Listen to `.on('mouseover')`, `.on('click')`, etc.

---

## 📐 Examples

### 💫 Spinning Shape on Hover

```js
class SpinningShape extends GameObject {
  constructor(game) {
    super(game);
    this.shape = new Circle(200, 200, 50, { fillColor: 'cyan' });
    this.enableInteractivity(this.shape);
    this.hovered = false;

    this.on('mouseover', () => this.hovered = true);
    this.on('mouseout', () => this.hovered = false);
  }

  update(dt) {
    if (this.hovered) this.shape.rotation += 2 * dt;
  }

  render() {
    this.shape.draw();
  }
}
```

---

## 📊 Components

Built on top of primitives:

- `FPSCounter(game, options)` → shows frames per second
- `Text(game, "hello", { x, y })` → simple static label

---

## 📁 File Structure

```bash
src/
├── shapes/             # All shape definitions (Circle, Triangle, Cube, etc.)
├── motion/             # Tween classes
├── io/                 # Mouse, Touch, Input
├── game                # Game loop, pipeline, GameObject
├───── /components/     # FPSCounter, Text
├── painter.js          # Canvas context utils
├── index.js            # Public API entry point
```

---

## 🧪 Demo

Open [`/demos/index.html`](./demos/index.html) or run:

```bash
npm run dev
```

You'll see:

- 🧱 A grid of all shapes
- 🌀 Interactivity on hover
- 🎯 Grouped layout and labels
- 🧩 FPS counter
- 📚 Each item is a composable `GameObject`

---

## 📚 API Docs

Each shape and utility is JSDoc-annotated.  
We'll be publishing `.d.ts` typings soon for full TypeScript support.

---
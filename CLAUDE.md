# AGENTS.md - GCanvas Development Guidelines

## Project Overview

GCanvas is a zero-dependency HTML5 Canvas library for 2D graphics, games, and generative art. It provides a declarative API built on shapes, game objects, and a rendering pipeline.

**Repository:** https://github.com/guinetik/gcanvas

## Project Structure

```
gcanvas/
├── src/                    # Library source code
│   ├── index.js           # Main exports
│   ├── shapes/            # Shape primitives (Circle, Rect, Text, etc.)
│   ├── game/              # Game loop, pipeline, GameObjects
│   │   ├── objects/       # GameObject wrappers (Text, Scene, ImageGo)
│   │   ├── ui/            # UI components (Button, FPS counter)
│   │   └── pipeline.js    # Rendering pipeline
│   ├── painter/           # Low-level canvas drawing utilities
│   ├── motion/            # Animation & tweening (Tween, easing functions)
│   ├── math/              # Math utilities (Complex, noise, fractals)
│   ├── mixins/            # Composable behaviors (anchor, draggable)
│   ├── util/              # Utilities (layout, position, Camera3D)
│   ├── io/                # Input handling (keyboard, mouse, touch)
│   ├── collision/         # Collision detection
│   ├── state/             # State management
│   └── sound/             # Audio utilities
├── demos/                 # Demo applications
│   ├── js/               # Demo JavaScript files
│   ├── *.html            # Demo HTML entry points
│   └── demos.css         # Shared demo styles
├── tests/                 # Vitest test files
└── dist/                  # Built library (UMD & ES modules)
```

## Coding Guidelines

### 1. No Magic Numbers

**Always use a CONFIG object** at the top of files for configurable values.

```javascript
// BAD - magic numbers scattered in code
this.camera = new Camera3D({ perspective: 800 });
for (let i = 0; i < 300; i++) { ... }
const radius = 80;

// GOOD - centralized configuration
const CONFIG = {
  perspective: 800,
  numPoints: 300,
  helixRadius: 80,

  // Group related values
  physics: {
    gravity: 0.0001,
    damping: 0.99,
  },

  // Document units where helpful
  timeScale: 1.0,          // seconds
  gridSpacing: 30,         // pixels
};
```

### 2. Prefer Shapes and GameObjects Over Direct Canvas

The library provides abstractions - use them instead of raw canvas operations.

```javascript
// BAD - direct canvas drawing
ctx.beginPath();
ctx.arc(x, y, 50, 0, Math.PI * 2);
ctx.fillStyle = "red";
ctx.fill();

// GOOD - use Shape classes
import { Circle } from "../../src/index.js";
const circle = new Circle(x, y, 50, { fill: "red" });
circle.render(ctx);

// GOOD - use GameObjects for managed entities
import { Game, Scene, Text } from "../../src/index.js";
const label = new Text(this, "Hello", { color: "#fff", font: "16px monospace" });
this.pipeline.add(label);
```

### 3. Use Painter.useCtx for Low-Level Operations

When you must access the canvas context directly, wrap it with `Painter.useCtx`:

```javascript
import { Painter } from "../../src/index.js";

// BAD - direct ctx manipulation
ctx.save();
ctx.strokeStyle = "rgba(255,255,255,0.5)";
ctx.lineWidth = 2;
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();
ctx.restore();

// GOOD - Painter.useCtx handles save/restore automatically
Painter.useCtx((ctx) => {
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
});
```

### 4. Use Layout Utilities for Positioning

Don't manually calculate positions for multiple items:

```javascript
import { verticalLayout, applyLayout, applyAnchor, Position, Scene, Text } from "../../src/index.js";

// BAD - manual offset calculations
this.title = new Text(this, "Title", { y: 20 });
this.subtitle = new Text(this, "Subtitle", { y: 45 });
this.info = new Text(this, "Info", { y: 70 });

// GOOD - use layout utilities
const panel = new Scene(this, { x: 0, y: 0 });
applyAnchor(panel, { anchor: Position.TOP_CENTER, anchorOffsetY: 100 });

const items = [
  new Text(this, "Title", { font: "bold 16px monospace" }),
  new Text(this, "Subtitle", { font: "14px monospace" }),
  new Text(this, "Info", { font: "12px monospace" }),
];

const layout = verticalLayout(items, { spacing: 20, align: "center" });
applyLayout(items, layout.positions);
items.forEach(item => panel.add(item));
```

### 5. Extend Game Class for Demos

All demos should extend the `Game` class:

```javascript
import { Game, Painter } from "../../src/index.js";

const CONFIG = {
  // Configuration values
};

class MyDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();  // Responsive canvas
  }

  init() {
    super.init();
    // Initialize shapes, game objects, state
    this.pipeline.add(myGameObject);
  }

  update(dt) {
    super.update(dt);
    // Update logic (dt is delta time in seconds)
  }

  render() {
    super.render();  // Clears canvas, renders pipeline
    // Additional rendering if needed
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new MyDemo(canvas);
  demo.start();
});
```

## Key APIs Reference

### Shapes
- `Circle`, `Rect`, `Square`, `Triangle`, `Hexagon`, `Star`
- `Line`, `Arc`, `BezierShape`, `SVGShape`
- `Text` (shape), `ImageShape`, `Pattern`
- 3D shapes: `Cube`, `Sphere`, `Cylinder`, `Cone`, `Prism`

### GameObjects (in `src/game/objects/`)
- `Text` - Managed text with automatic updates
- `Scene` - Container for grouping objects
- `ImageGo` - Managed image display
- `LayoutScene` - Scene with layout helpers

### Motion & Animation
- `Tween` - Animate properties over time
- `TweenEnetik` - Advanced tweening
- Motion behaviors: `Orbit`, `Oscillate`, `Bounce`, `Spring`, etc.

### Utilities
- `Camera3D` - Pseudo-3D projection with mouse controls
- `verticalLayout`, `horizontalLayout`, `gridLayout` - Layout helpers
- `applyAnchor` - Position anchoring mixin
- `Position` - Position constants (TOP_CENTER, BOTTOM_LEFT, etc.)

### Math
- `Complex` - Complex number operations
- `Noise` - Perlin/simplex noise
- `Random` - Seeded random utilities
- Fractal generators

### Input
- `Keys` - Keyboard input
- `Input` - Mouse/pointer input
- `Touch` - Touch input handling

## Demo File Structure

```
demos/
├── mydemo.html           # HTML entry point
└── js/
    └── mydemo.js         # Demo implementation
```

### HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Demo Name</title>
  <link rel="stylesheet" href="demos.css" />
  <script src="./js/info-toggle.js"></script>
</head>
<body>
  <div id="info">
    <strong>Demo Title</strong> — Brief description.<br/>
    <span style="color:#CCC">
      <li>Feature 1</li>
      <li>Feature 2</li>
      <li>Controls info</li>
    </span>
  </div>
  <canvas id="game"></canvas>
  <script type="module" src="./js/mydemo.js"></script>
</body>
</html>
```

### Adding to Navigation

Update `demos/index.html` to add your demo to the appropriate section:

```html
<h2>Section Name</h2>
<a href="mydemo.html" target="demo-frame">My Demo</a>
```

## Development Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Build library to dist/
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run docs         # Generate JSDoc documentation
```

## Testing

Tests use Vitest and are located in `tests/`. Run with:

```bash
npm test
```

## Common Patterns

### Responsive Canvas
```javascript
this.enableFluidSize();  // Auto-resize to window
```

### Mouse/Touch Interaction
```javascript
this.canvas.addEventListener("click", () => this.handleClick());
this.canvas.addEventListener("touchstart", (e) => this.handleTouch(e));
```

### Color Utilities
```javascript
import { Painter } from "../../src/index.js";
const rgb = Painter.colors.hslToRgb(hue, saturation, lightness);
const hex = Painter.colors.rgbToHex(r, g, b);
```

### Animation Loop Access
```javascript
update(dt) {
  super.update(dt);
  this.time += dt;  // dt is in seconds
  // Animation logic
}
```

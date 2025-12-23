# Installation

> How to set up GCanvas in your project.

## Prerequisites

- Node.js 18+ (for development)
- Modern browser with ES6 support

## Option 1: Clone Repository

The recommended way to get started:

```bash
git clone https://github.com/guinetik/gcanvas.git
cd gcanvas
npm install
```

### Run Development Server

```bash
npm run dev
```

This starts Vite's dev server with hot reload. Open `http://localhost:5173` to see the demos.

### Build the Library

```bash
npm run build
```

Outputs to `dist/`:
- `gcanvas.es.js` - ES Module
- `gcanvas.es.min.js` - ES Module (minified)
- `gcanvas.umd.js` - UMD bundle
- `gcanvas.umd.min.js` - UMD bundle (minified)

## Option 2: NPM

```bash
npm install @guinetik/gcanvas
```

Then import in your project:

```js
import { Game, Circle, Rectangle } from '@guinetik/gcanvas';
```

## Option 3: Direct Script Include

### ES Module

```html
<script type="module">
  import { Circle, Painter } from './dist/gcanvas.es.min.js';

  const canvas = document.getElementById('canvas');
  Painter.init(canvas.getContext('2d'));

  const circle = new Circle(50, { x: 100, y: 100, color: 'red' });
  circle.draw();
</script>
```

### UMD Bundle

```html
<script src="./dist/gcanvas.umd.min.js"></script>
<script>
  const { Circle, Painter } = GCanvas;

  const canvas = document.getElementById('canvas');
  Painter.init(canvas.getContext('2d'));

  const circle = new GCanvas.Circle(50, { x: 100, y: 100, color: 'red' });
  circle.draw();
</script>
```

## Project Structure

```
gcanvas/
├── src/              # Source code
│   ├── shapes/       # Shape classes
│   ├── game/         # Game loop, objects
│   ├── painter/      # Canvas abstraction
│   ├── motion/       # Animation
│   ├── io/           # Input handling
│   └── index.js      # Main entry point
├── demos/            # Demo applications
├── dist/             # Built library
└── docs/             # Documentation
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build library |
| `npm run build:demo` | Build demos for deployment |
| `npm run docs` | Generate JSDoc documentation |
| `npm run test` | Run tests |

## TypeScript Support

TypeScript definitions are coming soon. For now, the library is written in JavaScript with JSDoc annotations.

## Browser Support

GCanvas works in all modern browsers:

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Next Steps

- [Hello World](./hello-world.md) - Draw your first shape
- [First Game](./first-game.md) - Create an interactive game
- [Architecture Overview](../concepts/architecture-overview.md) - Understand the design

## Troubleshooting

### Canvas not found

Make sure your canvas element has an ID and the script runs after DOM is ready:

```html
<canvas id="game"></canvas>
<script type="module">
  // Script runs after DOM is parsed when using type="module"
  const canvas = document.getElementById('game');
</script>
```

### Module not found

When using ES modules, ensure paths are correct:

```js
// Relative path from your script
import { Circle } from './dist/gcanvas.es.min.js';

// Or absolute path
import { Circle } from '/dist/gcanvas.es.min.js';
```

## Related

- [Hello World](./hello-world.md)
- [Architecture Overview](../concepts/architecture-overview.md)

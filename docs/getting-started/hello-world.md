# Hello World

> Draw your first shape with GCanvas.

## Overview

This guide shows the simplest way to draw a shape on canvas using GCanvas. We'll start with the Shape Layer (no game loop) and progress to a simple animation.

## Basic Setup

Create an HTML file with a canvas:

```html
<!DOCTYPE html>
<html>
<head>
  <title>GCanvas Hello World</title>
  <style>
    body { margin: 0; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas" width="800" height="600"></canvas>
  <script type="module">
    // Your code here
  </script>
</body>
</html>
```

## Step 1: Draw a Circle

```js
import { Circle, Painter } from './dist/gcanvas.es.min.js';

// Get canvas and initialize Painter
const canvas = document.getElementById('canvas');
Painter.init(canvas.getContext('2d'));

// Create a circle
const circle = new Circle(50, {
  x: 400,
  y: 300,
  color: 'red'
});

// Draw it
circle.draw();
```

**Result:** A red circle with radius 50, centered at (400, 300).

## Step 2: Add More Shapes

```js
import { Circle, Rectangle, Star, Painter } from './dist/gcanvas.es.min.js';

const canvas = document.getElementById('canvas');
Painter.init(canvas.getContext('2d'));

// Circle
const circle = new Circle(50, {
  x: 200,
  y: 300,
  color: '#ff6b6b'
});

// Rectangle
const rect = new Rectangle({
  x: 400,
  y: 300,
  width: 120,
  height: 80,
  color: '#4ecdc4',
  stroke: '#fff',
  lineWidth: 2
});

// Star
const star = new Star(40, 5, {
  x: 600,
  y: 300,
  color: '#ffe66d',
  rotation: Math.PI / 10
});

// Draw all shapes
circle.draw();
rect.draw();
star.draw();
```

## Step 3: Group Shapes Together

```js
import { Circle, Rectangle, TextShape, Group, Painter } from './dist/gcanvas.es.min.js';

const canvas = document.getElementById('canvas');
Painter.init(canvas.getContext('2d'));

// Create a group
const group = new Group({ x: 400, y: 300 });

// Add shapes to the group (positions relative to group)
group.add(new Rectangle({
  width: 200,
  height: 80,
  color: '#333',
  stroke: '#0f0',
  lineWidth: 2
}));

group.add(new TextShape('Hello World!', {
  font: '24px monospace',
  color: '#0f0',
  align: 'center',
  baseline: 'middle'
}));

// Draw the group
group.draw();

// Rotate the entire group
group.rotation = Math.PI / 12;  // 15 degrees
Painter.clear();
group.draw();
```

## Step 4: Simple Animation

Add a render loop for animation:

```js
import { Circle, Painter } from './dist/gcanvas.es.min.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
Painter.init(ctx);

// Create a circle
const circle = new Circle(50, {
  x: 400,
  y: 300,
  color: '#4ecdc4'
});

// Animation variables
let time = 0;

function animate() {
  // Clear canvas
  Painter.clear();

  // Update circle position (oscillate)
  time += 0.02;
  circle.x = 400 + Math.sin(time) * 200;
  circle.y = 300 + Math.cos(time * 0.5) * 100;

  // Pulse the opacity
  circle.opacity = 0.5 + Math.sin(time * 2) * 0.5;

  // Draw
  circle.draw();

  // Next frame
  requestAnimationFrame(animate);
}

// Start animation
animate();
```

## Complete Example

Here's a complete example with multiple animated shapes:

```html
<!DOCTYPE html>
<html>
<head>
  <title>GCanvas Hello World</title>
  <style>
    body { margin: 0; background: #1a1a2e; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script type="module">
    import { Circle, Rectangle, Star, Group, Painter } from './dist/gcanvas.es.min.js';

    // Setup
    const canvas = document.getElementById('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Painter.init(canvas.getContext('2d'));

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Create shapes
    const circle = new Circle(60, { color: '#ff6b6b' });
    const rect = new Rectangle({ width: 100, height: 60, color: '#4ecdc4' });
    const star = new Star(40, 5, { color: '#ffe66d' });

    let time = 0;

    function animate() {
      Painter.clear();
      time += 0.016;

      // Orbit the shapes around center
      const radius = 150;

      circle.x = centerX + Math.cos(time) * radius;
      circle.y = centerY + Math.sin(time) * radius;

      rect.x = centerX + Math.cos(time + Math.PI * 0.66) * radius;
      rect.y = centerY + Math.sin(time + Math.PI * 0.66) * radius;
      rect.rotation = time;

      star.x = centerX + Math.cos(time + Math.PI * 1.33) * radius;
      star.y = centerY + Math.sin(time + Math.PI * 1.33) * radius;
      star.rotation = -time * 2;

      // Draw
      circle.draw();
      rect.draw();
      star.draw();

      requestAnimationFrame(animate);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  </script>
</body>
</html>
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| `Painter.init(ctx)` | Initialize the drawing system with canvas context |
| `Painter.clear()` | Clear the entire canvas |
| `shape.draw()` | Draw a shape at its current position |
| `shape.x`, `shape.y` | Position (center of shape) |
| `shape.rotation` | Rotation in radians |
| `shape.opacity` | Transparency (0 to 1) |
| `Group` | Container for multiple shapes |

## Next Steps

- [First Game](./first-game.md) - Add interactivity with the Game layer
- [Rendering Pipeline](../concepts/rendering-pipeline.md) - Understand the shape hierarchy
- [Shapes Module](../modules/shapes/README.md) - Explore all available shapes

## Related

- [Installation](./installation.md)
- [Two-Layer Architecture](../concepts/two-layer-architecture.md)
- [Shapes Module](../modules/shapes/README.md)

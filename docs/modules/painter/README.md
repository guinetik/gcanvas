# Painter Module

> Low-level canvas drawing abstraction.

## Overview

Painter is a static utility class that wraps the Canvas 2D API. It provides centralized drawing operations and state management, used internally by all shapes.

## Quick Start

```js
import { Painter } from '@guinetik/gcanvas';

// Initialize with canvas context
const canvas = document.getElementById('canvas');
Painter.init(canvas.getContext('2d'));

// Draw shapes directly
Painter.shapes.fillCircle(200, 150, 50, 'red');
Painter.shapes.strokeRect(300, 100, 100, 80, 'blue', 2);

// Draw text
Painter.text.fill('Hello World', 400, 200, {
  font: '24px monospace',
  color: 'white'
});
```

## Architecture

Painter is composed of specialized sub-modules:

```
┌─────────────────────────────────────────────────────────────┐
│                         Painter                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   shapes    │  │    text     │  │   lines     │         │
│  │ fillCircle  │  │    fill     │  │   line      │         │
│  │ strokeRect  │  │   stroke    │  │  polyline   │         │
│  │    arc      │  │  measure    │  │   bezier    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   colors    │  │   opacity   │  │   effects   │         │
│  │    fill     │  │    push     │  │ setBlendMode│         │
│  │   stroke    │  │    pop      │  │   shadow    │         │
│  │  gradient   │  │   current   │  │   filter    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐                                            │
│  │    img      │                                            │
│  │   draw      │                                            │
│  │   crop      │                                            │
│  │  pattern    │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Core API

### Initialization

```js
Painter.init(ctx);           // Set the canvas context
const ctx = Painter.ctx;     // Get the context
```

### Canvas State

```js
Painter.save();              // Save canvas state
Painter.restore();           // Restore canvas state
Painter.clear();             // Clear entire canvas
Painter.clear(x, y, w, h);   // Clear rectangle
```

### Transforms

```js
Painter.translateTo(x, y);   // Move origin
Painter.rotate(radians);     // Rotate context
Painter.scale(sx, sy);       // Scale context
```

## Sub-Modules

### Painter.shapes

Drawing geometric shapes.

```js
// Circles
Painter.shapes.fillCircle(x, y, radius, color);
Painter.shapes.strokeCircle(x, y, radius, color, lineWidth);

// Rectangles
Painter.shapes.fillRect(x, y, width, height, color);
Painter.shapes.strokeRect(x, y, width, height, color, lineWidth);

// Rounded rectangles
Painter.shapes.fillRoundedRect(x, y, w, h, radius, color);
Painter.shapes.strokeRoundedRect(x, y, w, h, radius, color, lineWidth);

// Arcs
Painter.shapes.arc(x, y, radius, startAngle, endAngle, color);
```

### Painter.text

Text rendering and measurement.

```js
// Fill text
Painter.text.fill(text, x, y, {
  font: '16px Arial',
  color: 'white',
  align: 'center',      // left, center, right
  baseline: 'middle'    // top, middle, bottom
});

// Stroke text
Painter.text.stroke(text, x, y, {
  font: '24px Arial',
  color: 'black',
  lineWidth: 2
});

// Measure text
const metrics = Painter.text.measure(text, font);
console.log(metrics.width);
```

### Painter.lines

Line and path drawing.

```js
// Simple line
Painter.lines.line(x1, y1, x2, y2, color, lineWidth);

// Polyline
Painter.lines.polyline([
  { x: 0, y: 0 },
  { x: 100, y: 50 },
  { x: 200, y: 25 }
], color, lineWidth);

// Bezier curve
Painter.lines.bezier(
  x1, y1,           // Start
  cp1x, cp1y,       // Control point 1
  cp2x, cp2y,       // Control point 2
  x2, y2,           // End
  color, lineWidth
);
```

### Painter.colors

Fill and stroke color management.

```js
// Set fill style
Painter.colors.fill(color);

// Set stroke style
Painter.colors.stroke(color, lineWidth);

// Create gradient
const gradient = Painter.colors.linearGradient(x1, y1, x2, y2, stops);
// stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }]

const radial = Painter.colors.radialGradient(x, y, r1, r2, stops);
```

### Painter.opacity

Opacity stack management.

```js
// Push new opacity (multiplies with current)
Painter.opacity.pushOpacity(0.5);

// Drawing here is 50% transparent

// Pop to restore previous
Painter.opacity.popOpacity();

// Get current effective opacity
const current = Painter.opacity.currentOpacity;
```

### Painter.effects

Visual effects.

```js
// Blend modes
Painter.effects.setBlendMode('multiply');
Painter.effects.setBlendMode('screen');
Painter.effects.setBlendMode('source-over'); // default

// Shadow
Painter.effects.shadow(color, blur, offsetX, offsetY);
Painter.effects.clearShadow();
```

### Painter.img

Image drawing.

```js
// Draw image
Painter.img.draw(image, x, y);
Painter.img.draw(image, x, y, width, height);

// Draw cropped
Painter.img.drawCropped(
  image,
  sx, sy, sw, sh,   // Source rectangle
  dx, dy, dw, dh    // Destination rectangle
);

// Create pattern
const pattern = Painter.img.createPattern(image, 'repeat');
```

## Usage Patterns

### Direct Drawing (No Shapes)

```js
Painter.init(ctx);

function draw() {
  Painter.clear();

  // Draw background
  Painter.shapes.fillRect(0, 0, 800, 600, '#1a1a2e');

  // Draw shapes
  Painter.shapes.fillCircle(400, 300, 50, 'red');

  // Draw text
  Painter.text.fill('Score: 100', 10, 30, {
    font: '20px Arial',
    color: 'white'
  });
}
```

### With State Management

```js
Painter.save();
Painter.translateTo(400, 300);
Painter.rotate(Math.PI / 4);
Painter.shapes.fillRect(-50, -25, 100, 50, 'blue');
Painter.restore();
```

### Opacity Stacking

```js
Painter.opacity.pushOpacity(0.8);
  // 80% opacity
  Painter.shapes.fillCircle(100, 100, 50, 'red');

  Painter.opacity.pushOpacity(0.5);
    // 40% opacity (0.8 * 0.5)
    Painter.shapes.fillCircle(150, 100, 50, 'blue');
  Painter.opacity.popOpacity();

  // Back to 80%
  Painter.shapes.fillCircle(200, 100, 50, 'green');
Painter.opacity.popOpacity();
```

## When to Use Painter Directly

Most of the time, use Shape classes. Use Painter directly when:

- Drawing one-off graphics
- Custom shape implementations
- Performance-critical drawing
- Procedural graphics
- Effects not supported by shapes

## Example: Custom Shape

```js
class Diamond extends Shape {
  draw() {
    super.draw();  // Apply transforms

    const hw = this.width / 2;
    const hh = this.height / 2;

    Painter.ctx.beginPath();
    Painter.ctx.moveTo(0, -hh);
    Painter.ctx.lineTo(hw, 0);
    Painter.ctx.lineTo(0, hh);
    Painter.ctx.lineTo(-hw, 0);
    Painter.ctx.closePath();

    if (this.color) {
      Painter.colors.fill(this.color);
      Painter.ctx.fill();
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
      Painter.ctx.stroke();
    }
  }
}
```

## Related

- [Shapes Module](../shapes/README.md) - High-level shape classes
- [Rendering Pipeline](../../concepts/rendering-pipeline.md) - How shapes use Painter

## See Also

- [Hello World](../../getting-started/hello-world.md)
- [Architecture Overview](../../concepts/architecture-overview.md)

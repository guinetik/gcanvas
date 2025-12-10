# Rendering Pipeline

> The shape inheritance chain from Euclidian to concrete shapes.

## Overview

Every visual element in GCanvas inherits from a chain of base classes. Each layer adds specific functionality, building from simple spatial properties to full rendering capabilities.

## The Inheritance Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Euclidian                                                      │
│   ├── x, y (position)                                           │
│   ├── width, height (dimensions)                                │
│   └── debug rendering support                                   │
│       │                                                          │
│       ▼                                                          │
│   Geometry2d                                                     │
│   ├── getBounds() - bounding box calculation                    │
│   ├── minX, maxX, minY, maxY - constraints                      │
│   ├── crisp - pixel-perfect alignment                           │
│   └── dirty flag tracking                                       │
│       │                                                          │
│       ▼                                                          │
│   Traceable                                                      │
│   ├── drawDebug() - debug visualization                         │
│   └── logging capabilities                                      │
│       │                                                          │
│       ▼                                                          │
│   Renderable                                                     │
│   ├── visible - show/hide                                       │
│   ├── opacity - transparency (0-1)                              │
│   ├── shadowColor, shadowBlur, shadowOffset                     │
│   ├── blendMode - canvas composite operation                    │
│   ├── zIndex - stacking order                                   │
│   └── render() - main render lifecycle                          │
│       │                                                          │
│       ▼                                                          │
│   Transformable                                                  │
│   ├── rotation - angle in radians                               │
│   ├── scaleX, scaleY - scaling factors                          │
│   ├── applyTransforms() - canvas transform                      │
│   └── getTransformedBounds() - rotated bounds                   │
│       │                                                          │
│       ▼                                                          │
│   Shape                                                          │
│   ├── color - fill color                                        │
│   ├── stroke - stroke color                                     │
│   ├── lineWidth, lineJoin, lineCap                              │
│   └── draw() - abstract (override in subclasses)                │
│       │                                                          │
│       ▼                                                          │
│   ┌─────────┬─────────┬─────────┬─────────┬─────────┐           │
│   │ Circle  │Rectangle│  Star   │  Cube   │   ...   │           │
│   │ draw()  │ draw()  │ draw()  │ draw()  │         │           │
│   └─────────┴─────────┴─────────┴─────────┴─────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Details

### 1. Euclidian

**Source:** `src/shapes/euclidian.js`

The foundation class providing basic spatial properties.

```js
class Euclidian {
  x = 0;        // Center X position
  y = 0;        // Center Y position
  width = 0;    // Width
  height = 0;   // Height
}
```

**Key Concept:** Position is center-based, not top-left. A shape at `(100, 100)` has its center at that point.

### 2. Geometry2d

**Source:** `src/shapes/geometry.js`

Adds bounding box calculations and positional constraints.

```js
// Get the bounding box
const bounds = shape.getBounds();
// { x, y, width, height }

// Constrain position
shape.minX = 0;
shape.maxX = 800;
shape.applyConstraints();
```

### 3. Traceable

**Source:** `src/shapes/traceable.js`

Adds debug visualization capabilities.

```js
shape.drawDebug(ctx); // Draw bounding box and center point
```

### 4. Renderable

**Source:** `src/shapes/renderable.js`

Adds visual properties and the main `render()` lifecycle.

```js
shape.visible = true;
shape.opacity = 0.8;
shape.shadowColor = 'rgba(0,0,0,0.5)';
shape.shadowBlur = 10;
shape.shadowOffsetX = 5;
shape.shadowOffsetY = 5;
```

**The `render()` method:**

```js
render() {
  if (!this.visible || this.opacity <= 0) return;

  Painter.save();
  Painter.effects.setBlendMode(this.blendMode);
  Painter.opacity.pushOpacity(this.opacity);
  Painter.translateTo(this.x, this.y);

  // Apply shadows
  if (this.shadowColor) {
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    ctx.shadowOffsetX = this.shadowOffsetX;
    ctx.shadowOffsetY = this.shadowOffsetY;
  }

  this.draw();  // Call subclass implementation

  Painter.opacity.popOpacity();
  Painter.restore();
}
```

### 5. Transformable

**Source:** `src/shapes/transformable.js`

Adds rotation and scaling.

```js
shape.rotation = Math.PI / 4;  // 45 degrees
shape.scaleX = 2.0;
shape.scaleY = 0.5;
```

**Transform application:**

```js
applyTransforms() {
  if (this.rotation !== 0) {
    Painter.rotate(this.rotation);
  }
  if (this.scaleX !== 1 || this.scaleY !== 1) {
    Painter.scale(this.scaleX, this.scaleY);
  }
}
```

### 6. Shape

**Source:** `src/shapes/shape.js`

Adds canvas styling (fill and stroke).

```js
const circle = new Circle(50, {
  color: 'red',           // Fill color
  stroke: 'black',        // Stroke color
  lineWidth: 2,           // Stroke width
  lineJoin: 'round',      // Line join style
  lineCap: 'round'        // Line cap style
});
```

## The Render Flow

When `shape.render()` is called (or `shape.draw()` directly):

```
1. render() called
   │
   ├─► Check visible && opacity > 0
   │
   ├─► Painter.save()           ─── Save canvas state
   │
   ├─► Set blend mode
   │
   ├─► Push opacity
   │
   ├─► Translate to (x, y)      ─── Move to shape center
   │
   ├─► Apply shadows
   │
   ├─► draw() called            ─── Subclass implementation
   │   │
   │   ├─► applyTransforms()    ─── Rotation & scale
   │   │
   │   └─► Painter.shapes.*     ─── Actual drawing
   │
   ├─► Pop opacity
   │
   └─► Painter.restore()        ─── Restore canvas state
```

## Coordinate System

GCanvas uses a **center-based** coordinate system:

```
       ┌────────────────────────────────────┐
       │            Canvas                   │
       │                                     │
       │      (0,0) top-left                │
       │        ┌──────────────────┐        │
       │        │                  │        │
       │        │    (x, y)        │        │
       │        │       ●──────────┼─width  │
       │        │       │          │        │
       │        │       │          │        │
       │        └───────┼──────────┘        │
       │              height                 │
       │                                     │
       └────────────────────────────────────┘
```

The `(x, y)` point is the **center** of the shape, not the top-left corner.

## Creating Custom Shapes

Extend `Shape` and implement `draw()`:

```js
import { Shape, Painter } from 'gcanvas';

class CustomShape extends Shape {
  constructor(options = {}) {
    super(options);
    this.customProp = options.customProp ?? 'default';
  }

  draw() {
    super.draw();  // Apply transforms

    // Draw using Painter
    Painter.shapes.fillCircle(0, 0, this.width / 2, this.color);
    Painter.shapes.strokeCircle(0, 0, this.width / 2, this.stroke, this.lineWidth);
  }
}
```

## Related

- [Architecture Overview](./architecture-overview.md) - Full system architecture
- [Two-Layer Architecture](./two-layer-architecture.md) - Shape vs Game layer
- [Shape Hierarchy](../modules/shapes/hierarchy.md) - Detailed class documentation

## See Also

- [Euclidian](../modules/shapes/base/euclidian.md)
- [Geometry2d](../modules/shapes/base/geometry2d.md)
- [Renderable](../modules/shapes/base/renderable.md)
- [Transformable](../modules/shapes/base/transformable.md)
- [Shape](../modules/shapes/base/shape.md)

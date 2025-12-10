# Shapes Module

> 40+ drawable primitives and the shape inheritance hierarchy.

## Overview

The shapes module provides all visual primitives in GCanvas. Every shape inherits from a chain of base classes that add progressively more functionality.

## Quick Start

```js
import { Circle, Rectangle, Star, Group } from 'gcanvas';

// Create shapes
const circle = new Circle(50, { x: 100, y: 100, color: 'red' });
const rect = new Rectangle({ width: 80, height: 40, color: 'blue' });

// Draw
circle.draw();
rect.draw();

// Group shapes together
const group = new Group({ x: 400, y: 300 });
group.add(circle);
group.add(rect);
group.draw();
```

## Class Hierarchy

```
Euclidian ─────────── Position & size
    │
Geometry2d ────────── Bounding boxes & constraints
    │
Traceable ─────────── Debug visualization
    │
Renderable ────────── Visibility, opacity, shadows
    │
Transformable ─────── Rotation & scaling
    │
Shape ─────────────── Fill & stroke styling
    │
├── Circle
├── Rectangle
├── Star
├── Triangle
├── Polygon
├── ... (40+ shapes)
└── Group (container)
```

[View detailed hierarchy](./hierarchy.md)

## Base Classes

| Class | Purpose | Documentation |
|-------|---------|---------------|
| [Euclidian](./base/euclidian.md) | Position (x, y) and size (width, height) | [Link](./base/euclidian.md) |
| [Geometry2d](./base/geometry2d.md) | Bounding boxes and constraints | [Link](./base/geometry2d.md) |
| [Renderable](./base/renderable.md) | Visibility, opacity, shadows | [Link](./base/renderable.md) |
| [Transformable](./base/transformable.md) | Rotation and scaling | [Link](./base/transformable.md) |
| [Shape](./base/shape.md) | Fill, stroke, line styling | [Link](./base/shape.md) |

## Available Shapes

### 2D Primitives

| Shape | Description |
|-------|-------------|
| Circle | Basic circle with radius |
| Rectangle | Centered rectangle |
| RoundedRectangle | Rectangle with rounded corners |
| Square | Square (convenience) |
| Triangle | Three-sided polygon |
| Line | Line segment |
| Arc | Curved arc segment |
| Polygon | N-sided polygon |
| Hexagon | Six-sided shape |

### Complex Shapes

| Shape | Description |
|-------|-------------|
| Star | Star with configurable points |
| Heart | Heart shape |
| Diamond | Diamond/rhombus |
| Cross | Plus/cross shape |
| Arrow | Arrow shape |
| Pin | Map pin/marker |
| Ring | Hollow ring/donut |
| Cloud | Cloud-like shape |
| PieSlice | Pie chart slice |

### 3D-Looking Shapes

| Shape | Description |
|-------|-------------|
| Cube | Isometric cube with face colors |
| Sphere | Sphere with shading |
| Cylinder | Cylindrical shape |
| Cone | Cone/pyramid |
| Prism | Triangular prism |

### Special Shapes

| Shape | Description |
|-------|-------------|
| TextShape | Rotatable, scalable text |
| Image | Image rendering |
| SVGShape | SVG path-based shapes |
| BezierShape | Bezier curve shapes |
| PatternRectangle | Pattern-filled rectangle |
| StickFigure | Simple stick figure |

### Containers

| Class | Description |
|-------|-------------|
| Group | Container for composing multiple shapes |

## Common Properties

All shapes inherit these properties:

```js
// From Euclidian
shape.x          // Center X position
shape.y          // Center Y position
shape.width      // Width
shape.height     // Height

// From Geometry2d
shape.minX       // Minimum X constraint
shape.maxX       // Maximum X constraint
shape.minY       // Minimum Y constraint
shape.maxY       // Maximum Y constraint
shape.crisp      // Pixel-perfect alignment

// From Renderable
shape.visible    // Show/hide
shape.opacity    // Transparency (0-1)
shape.active     // Receive updates
shape.zIndex     // Stacking order
shape.shadowColor
shape.shadowBlur
shape.shadowOffsetX
shape.shadowOffsetY

// From Transformable
shape.rotation   // Rotation in degrees
shape.scaleX     // Horizontal scale
shape.scaleY     // Vertical scale

// From Shape
shape.color      // Fill color
shape.stroke     // Stroke color
shape.lineWidth  // Stroke width
shape.lineJoin   // "miter", "round", "bevel"
shape.lineCap    // "butt", "round", "square"
```

## Usage Patterns

### Basic Drawing

```js
const circle = new Circle(50, { x: 100, y: 100, color: 'red' });
circle.draw();
```

### With Transforms

```js
const rect = new Rectangle({
  width: 100,
  height: 50,
  color: '#4ecdc4',
  rotation: 45,      // 45 degrees
  scaleX: 1.5,
  opacity: 0.8
});
rect.draw();
```

### Grouping Shapes

```js
const group = new Group({ x: 400, y: 300 });
group.add(new Circle(30, { color: 'red' }));
group.add(new Rectangle({ y: 50, width: 60, height: 30, color: 'blue' }));

// Transform entire group
group.rotation = 15;
group.draw();
```

### Animation

```js
function animate() {
  Painter.clear();

  shape.rotation += 1;
  shape.x = 400 + Math.sin(Date.now() * 0.001) * 100;

  shape.draw();
  requestAnimationFrame(animate);
}
```

## Related

- [Rendering Pipeline](../../concepts/rendering-pipeline.md) - How shapes render
- [Two-Layer Architecture](../../concepts/two-layer-architecture.md) - Shape vs Game layer
- [Painter Module](../painter/README.md) - Low-level drawing API

## See Also

- [Hello World](../../getting-started/hello-world.md)
- [Shape Hierarchy](./hierarchy.md)

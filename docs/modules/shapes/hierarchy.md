# Shape Hierarchy

> Visual diagram and explanation of the shape inheritance chain.

## Overview

Every visual element in GCanvas inherits from a chain of base classes. Each layer adds specific functionality, building from simple spatial properties to full rendering capabilities.

## Full Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHAPE HIERARCHY                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Loggable (from logger module)                                         │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Euclidian                                                        │   │
│   │ ├── x, y         (position at origin point)                     │   │
│   │ ├── width, height (dimensions)                                  │   │
│   │ ├── originX, originY (pivot point 0-1)                          │   │
│   │ ├── origin       (shorthand: "top-left", "center", etc.)        │   │
│   │ ├── debug        (enable debug rendering)                       │   │
│   │ └── debugColor   (debug outline color)                          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Geometry2d                                                       │   │
│   │ ├── getBounds()      (bounding box with caching)                │   │
│   │ ├── calculateBounds() (override for custom bounds)              │   │
│   │ ├── getLocalPosition() (top-left corner)                        │   │
│   │ ├── minX, maxX, minY, maxY (constraints)                        │   │
│   │ ├── crisp            (pixel-perfect rounding)                   │   │
│   │ └── markBoundsDirty() (trigger recalculation)                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Traceable                                                        │   │
│   │ └── drawDebug()      (debug visualization)                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Renderable                                                       │   │
│   │ ├── visible          (show/hide)                                │   │
│   │ ├── opacity          (transparency 0-1)                         │   │
│   │ ├── active           (receive updates)                          │   │
│   │ ├── zIndex           (stacking order)                           │   │
│   │ ├── blendMode        (canvas composite operation)               │   │
│   │ ├── shadowColor/Blur/OffsetX/OffsetY                            │   │
│   │ ├── render()         (main render lifecycle)                    │   │
│   │ └── update(dt)       (per-frame update)                         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Transformable                                                    │   │
│   │ ├── rotation         (angle in degrees)                         │   │
│   │ ├── scaleX, scaleY   (scale factors)                            │   │
│   │ ├── applyTransforms() (apply to canvas context)                 │   │
│   │ └── calculateBounds() (transformed bounding box)                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Shape                                                            │   │
│   │ ├── color            (fill color)                               │   │
│   │ ├── stroke           (stroke color)                             │   │
│   │ ├── lineWidth        (stroke width)                             │   │
│   │ ├── lineJoin         (miter/round/bevel)                        │   │
│   │ ├── lineCap          (butt/round/square)                        │   │
│   │ └── miterLimit       (miter length limit)                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ├───────────────────────────────────────────────────────────┐     │
│       │                                                            │     │
│       ▼                                                            ▼     │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│   │ Circle            │  │ Rectangle         │  │ Star              │   │
│   │ ├── radius        │  │ ├── cornerRadius  │  │ ├── points        │   │
│   │ └── draw()        │  │ └── draw()        │  │ ├── innerRadius   │   │
│   └───────────────────┘  └───────────────────┘  │ └── draw()        │   │
│                                                  └───────────────────┘   │
│       ▼                                                                  │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│   │ Triangle          │  │ Polygon           │  │ Line              │   │
│   │ └── draw()        │  │ ├── sides         │  │ ├── x2, y2        │   │
│   └───────────────────┘  │ └── draw()        │  │ └── draw()        │   │
│                          └───────────────────┘  └───────────────────┘   │
│                                                                          │
│   ... and 30+ more concrete shapes                                      │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Group (extends Transformable, not Shape)                         │   │
│   │ ├── children         (array of shapes)                          │   │
│   │ ├── add(shape)       (add child)                                │   │
│   │ ├── remove(shape)    (remove child)                             │   │
│   │ └── draw()           (render all children)                      │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

| Layer | Responsibility | Key Methods/Properties |
|-------|---------------|----------------------|
| **Euclidian** | Spatial existence | `x`, `y`, `width`, `height`, `origin`, `originX`, `originY` |
| **Geometry2d** | Bounding & constraints | `getBounds()`, `minX/maxX/minY/maxY` |
| **Traceable** | Debug visualization | `drawDebug()` |
| **Renderable** | Render lifecycle | `render()`, `visible`, `opacity` |
| **Transformable** | Canvas transforms | `rotation`, `scaleX`, `scaleY` (pivot around origin) |
| **Shape** | Canvas styling | `color`, `stroke`, `lineWidth` |

## Why This Hierarchy?

### Separation of Concerns

Each layer handles one aspect:

1. **Euclidian**: "Where am I and how big?"
2. **Geometry2d**: "What's my bounding box?"
3. **Traceable**: "How do I debug?"
4. **Renderable**: "Am I visible? How do I draw?"
5. **Transformable**: "Am I rotated or scaled?"
6. **Shape**: "What color am I?"

### Extensibility

You can extend at any level:

```js
// Custom shape with fill/stroke
class CustomShape extends Shape {
  draw() {
    super.draw();  // Apply transforms
    // Custom drawing logic
  }
}

// Custom transformable without styling
class CustomTransformable extends Transformable {
  draw() {
    super.draw();  // Apply transforms
    // Custom logic without fill/stroke
  }
}
```

### Composition

Group allows composing without deep inheritance:

```js
const face = new Group({ x: 400, y: 300 });
face.add(new Circle(100, { color: '#ffd93d' }));           // Face
face.add(new Circle(15, { x: -30, y: -20, color: '#333' })); // Left eye
face.add(new Circle(15, { x: 30, y: -20, color: '#333' }));  // Right eye
face.add(new Arc({ y: 30, width: 60, color: '#333' }));      // Smile
```

## Render Flow

When `shape.draw()` is called:

```
shape.draw()
    │
    ├─► Transformable.draw()
    │   └─► applyTransforms()
    │       ├─► Painter.rotate(rotation)
    │       └─► Painter.scale(scaleX, scaleY)
    │
    └─► ConcreteShape.draw() (Circle, Rectangle, etc.)
        └─► Painter.shapes.fillCircle(...)
```

When `shape.render()` is called (full lifecycle):

```
shape.render()
    │
    ├─► Check visible && opacity > 0
    │
    ├─► Painter.save()
    │
    ├─► Set blend mode
    │
    ├─► Push opacity
    │
    ├─► Translate to (x, y)
    │
    ├─► Apply shadows
    │
    ├─► shape.draw()
    │   └─► [see above]
    │
    ├─► Pop opacity
    │
    └─► Painter.restore()
```

## Related

- [Rendering Pipeline](../../concepts/rendering-pipeline.md) - Detailed pipeline explanation
- [Shapes Module](./README.md) - All available shapes

## See Also

- [Euclidian](./base/euclidian.md)
- [Geometry2d](./base/geometry2d.md)
- [Renderable](./base/renderable.md)
- [Transformable](./base/transformable.md)
- [Shape](./base/shape.md)

# Transformable

> Rotation and scaling with transformed bounding boxes.

**Module:** [shapes](../README.md) | **Extends:** [Renderable](./renderable.md) | **Source:** `src/shapes/transformable.js`

## Overview

Transformable adds canvas transformation support:
- **Rotation** in degrees
- **Scaling** (horizontal and vertical)
- **Transformed bounds** calculation

This is the final base layer before custom shape styling is introduced.

## Constructor

```js
new Transformable(options)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rotation` | `number` | `0` | Rotation in degrees (clockwise) |
| `scaleX` | `number` | `1` | Horizontal scale factor |
| `scaleY` | `number` | `1` | Vertical scale factor |

Plus all options from [Renderable](./renderable.md).

## Properties

### Inherited

From Euclidian: `x`, `y`, `width`, `height`, `debug`, `debugColor`

From Geometry2d: `minX`, `maxX`, `minY`, `maxY`, `crisp`, `boundsDirty`

From Renderable: `visible`, `opacity`, `active`, `zIndex`, `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`, `tick`

### Own Properties

| Property | Type | Description |
|----------|------|-------------|
| `rotation` | `number` | Rotation angle in degrees |
| `scaleX` | `number` | Horizontal scale (1 = normal) |
| `scaleY` | `number` | Vertical scale (1 = normal) |

## Methods

### draw()

Applies transforms before subclass drawing. Always call `super.draw()` in subclasses.

```js
class MyShape extends Transformable {
  draw() {
    super.draw();  // Apply transforms
    // Custom drawing (in transformed space)
  }
}
```

### applyTransforms()

Applies rotation and scale to the canvas context. Called by `draw()`.

```js
applyTransforms() {
  Painter.rotate(this._rotation);
  Painter.scale(this._scaleX, this._scaleY);
}
```

Transform order: **rotate → scale**

### calculateBounds()

Returns the bounding box after applying rotation and scale.

```js
const bounds = shape.getBounds();
// Returns axis-aligned bounding box of the rotated/scaled shape
```

## Rotation

Rotation is specified in **degrees** (converted to radians internally):

```js
const shape = new Rectangle({
  width: 100,
  height: 50,
  rotation: 45  // 45 degrees clockwise
});

// Update rotation
shape.rotation = 90;   // 90 degrees
shape.rotation = -30;  // 30 degrees counter-clockwise
```

## Scaling

Scale factors multiply the shape's dimensions:

```js
const shape = new Circle(50, {
  scaleX: 2,   // Twice as wide
  scaleY: 0.5  // Half as tall
});

// Result: ellipse 200 wide, 50 tall
```

Common patterns:

```js
// Uniform scale
shape.scaleX = 2;
shape.scaleY = 2;  // 2x size in both dimensions

// Flip horizontally
shape.scaleX = -1;

// Flip vertically
shape.scaleY = -1;
```

## Transform Order

Transforms are applied in this order:

1. **Translate** to (x, y) — from Renderable
2. **Rotate** by rotation angle
3. **Scale** by scaleX, scaleY

```js
// Canvas transform stack:
ctx.translate(x, y);      // Move to position
ctx.rotate(rotation);     // Rotate around position
ctx.scale(scaleX, scaleY); // Scale from position
```

## Transformed Bounds

`getBounds()` returns the axis-aligned bounding box that contains the rotated/scaled shape:

```js
const rect = new Rectangle({
  x: 100,
  y: 100,
  width: 100,
  height: 50,
  rotation: 45
});

const bounds = rect.getBounds();
// Returns AABB that contains the rotated rectangle
// bounds.width and bounds.height will be larger than original
```

```
Original:           Rotated 45°:
┌──────────┐            ◇
│          │           ╱ ╲
│    ●     │          ╱   ╲
│          │         ◇  ●  ◇
└──────────┘          ╲   ╱
                       ╲ ╱
                        ◇
                    ┌───────┐
                    │ AABB  │
                    └───────┘
```

## Example: Spinning Shape

```js
import { Rectangle, Painter } from '@guinetik/gcanvas';

const canvas = document.getElementById('canvas');
Painter.init(canvas.getContext('2d'));

const rect = new Rectangle({
  x: 400,
  y: 300,
  width: 100,
  height: 60,
  color: '#4ecdc4'
});

function animate() {
  Painter.clear();

  // Rotate 1 degree per frame
  rect.rotation += 1;

  rect.draw();
  requestAnimationFrame(animate);
}

animate();
```

## Example: Pulsing Scale

```js
let time = 0;

function animate() {
  Painter.clear();
  time += 0.05;

  // Pulse between 0.8x and 1.2x
  const scale = 1 + Math.sin(time) * 0.2;
  shape.scaleX = scale;
  shape.scaleY = scale;

  shape.draw();
  requestAnimationFrame(animate);
}
```

## Inheritance

```
Renderable
    └── Transformable  <── You are here
            └── Shape
                    └── Circle, Rectangle, Star, ...
```

## Related

- [Renderable](./renderable.md) - Parent class
- [Shape](./shape.md) - Adds fill/stroke styling
- [Shape Hierarchy](../hierarchy.md) - Full inheritance diagram

## See Also

- [Shapes Module](../README.md)
- [Rendering Pipeline](../../../concepts/rendering-pipeline.md)

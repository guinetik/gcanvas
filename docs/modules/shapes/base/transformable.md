# Transformable

> Rotation and scaling with transformed bounding boxes.

**Module:** [shapes](../README.md) | **Extends:** [Renderable](./renderable.md) | **Source:** `src/shapes/transformable.js`

## Overview

Transformable adds canvas transformation support:
- **Rotation** in degrees (pivots around origin point)
- **Scaling** (horizontal and vertical, scales from origin point)
- **Transformed bounds** calculation

The `origin` property (inherited from Euclidian) determines the pivot point for all transforms. Default is `"top-left"`, but `"center"` is commonly used for intuitive rotation/scaling behavior.

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
// Rotates around top-left corner (default)
const shape = new Rectangle({
  width: 100,
  height: 50,
  rotation: 45  // 45 degrees clockwise
});

// Rotates around center (more intuitive)
const centeredShape = new Rectangle({
  width: 100,
  height: 50,
  origin: 'center',
  rotation: 45  // 45 degrees clockwise around center
});

// Update rotation
shape.rotation = 90;   // 90 degrees
shape.rotation = -30;  // 30 degrees counter-clockwise
```

## Scaling

Scale factors multiply the shape's dimensions from the origin point:

```js
// Scales from top-left corner (default)
const shape = new Circle(50, {
  scaleX: 2,   // Twice as wide
  scaleY: 0.5  // Half as tall
});

// Scales from center (more intuitive - shape stays centered)
const centeredShape = new Circle(50, {
  origin: 'center',
  scaleX: 2,   
  scaleY: 0.5  
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

// For pulse/bounce effects, use center origin:
const button = new Rectangle({
  origin: 'center',
  scaleX: 1,
  scaleY: 1
});
```

## Transform Order

Transforms are applied in this order:

1. **Translate** to (x, y) — the object's position
2. **Translate** to pivot point — based on origin (e.g., center of shape)
3. **Rotate** by rotation angle — around pivot point
4. **Scale** by scaleX, scaleY — from pivot point
5. **Translate** back from pivot — so drawing starts at correct position

```js
// Simplified canvas transform stack:
ctx.translate(x, y);           // Move to position
ctx.translate(pivotX, pivotY); // Move to pivot (originX * width, originY * height)
ctx.rotate(rotation);          // Rotate around pivot
ctx.scale(scaleX, scaleY);     // Scale from pivot
ctx.translate(-pivotX, -pivotY); // Move back so drawing starts at top-left
```

With `origin: "top-left"` (default), the pivot is at (0, 0), so rotation/scaling happen around the top-left corner. With `origin: "center"`, the pivot is at the center of the shape.

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
  color: '#4ecdc4',
  origin: 'center'  // Rotate around center for smooth spin
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
// Use center origin for symmetric pulsing
const shape = new Circle(50, {
  x: 400,
  y: 300,
  color: '#ff6b6b',
  origin: 'center'  // Pulse stays centered
});

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

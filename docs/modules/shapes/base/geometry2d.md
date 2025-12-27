# Geometry2d

> Bounding box calculations and positional constraints.

**Module:** [shapes](../README.md) | **Extends:** [Euclidian](./euclidian.md) | **Source:** `src/shapes/geometry.js`

## Overview

Geometry2d builds upon Euclidian by adding:

- **Bounding logic** with memoization
- **Constraint enforcement** (minX, maxX, minY, maxY)
- **Property change tracking** for efficient recalculations

This class is not concerned with transforms, rendering, or visibility. It's the core layer where **position + size = spatial identity**.

## Constructor

```js
new Geometry2d(options)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minX` | `number` | `undefined` | Minimum X constraint |
| `maxX` | `number` | `undefined` | Maximum X constraint |
| `minY` | `number` | `undefined` | Minimum Y constraint |
| `maxY` | `number` | `undefined` | Maximum Y constraint |
| `crisp` | `boolean` | `true` | Round to whole pixels |

Plus all options from [Euclidian](./euclidian.md).

## Properties

### Inherited from Euclidian

`x`, `y`, `width`, `height`, `debug`, `debugColor`

### Own Properties

| Property | Type | Description |
|----------|------|-------------|
| `minX` | `number \| undefined` | Minimum allowed X value |
| `maxX` | `number \| undefined` | Maximum allowed X value |
| `minY` | `number \| undefined` | Minimum allowed Y value |
| `maxY` | `number \| undefined` | Maximum allowed Y value |
| `crisp` | `boolean` | Whether to round to whole pixels |
| `boundsDirty` | `boolean` | Whether bounds need recalculation (readonly) |

## Methods

### getBounds()

Returns the object's bounding box. Uses memoization to avoid unnecessary recomputation.

```js
const bounds = shape.getBounds();
// { x: 100, y: 100, width: 50, height: 30 }
```

**Returns:** `{ x: number, y: number, width: number, height: number }`

### calculateBounds()

Called by `getBounds()` when bounds are dirty. Override in subclasses for custom bounds (e.g., rotated shapes).

```js
// Default implementation
calculateBounds() {
  return {
    x: this.x,
    y: this.y,
    width: this.width,
    height: this.height
  };
}
```

**Returns:** `{ x: number, y: number, width: number, height: number }`

### getLocalPosition()

Returns the object's top-left corner position. Useful for layout systems.

```js
const local = shape.getLocalPosition();
// { x: 75, y: 85 } for a shape at (100,100) with width 50, height 30
```

**Returns:** `{ x: number, y: number }`

### applyConstraints()

Applies positional constraints and optionally rounds to whole pixels.

```js
shape.minX = 0;
shape.maxX = 800;
shape.x = -50;      // Out of bounds
shape.applyConstraints();
console.log(shape.x); // 0 (constrained to minX)
```

### markBoundsDirty()

Marks bounds for recalculation. Called automatically when spatial properties change.

```js
shape.markBoundsDirty();
// Next getBounds() call will recalculate
```

### setTopLeft(x, y)

Sets position using top-left coordinates instead of center.

```js
shape.setTopLeft(0, 0); // Top-left at (0,0)
// Center is now at (width/2, height/2)
```

**Returns:** `this` (for chaining)

### setCenter(x, y)

Sets the center position (same as setting x and y directly).

```js
shape.setCenter(400, 300);
```

**Returns:** `this` (for chaining)

## Constraints Example

```js
const shape = new Circle(30, {
  x: 400,
  y: 300,
  minX: 50,
  maxX: 750,
  minY: 50,
  maxY: 550
});

// Shape can't go outside the constrained area
shape.x = 900;
shape.applyConstraints();
console.log(shape.x); // 750 (clamped to maxX)
```

## Crisp Rendering

When `crisp` is true, positions and dimensions are rounded to whole pixels:

```js
const shape = new Rectangle({
  x: 100.7,
  y: 50.3,
  width: 80.5,
  height: 40.2,
  crisp: true
});

shape.applyConstraints();
// x: 101, y: 50, width: 81, height: 40
```

This prevents blurry rendering from sub-pixel positioning.

## Dirty Tracking

Bounds are automatically marked dirty when spatial properties change:

```js
shape.x = 200;           // Marks bounds dirty
shape.getBounds();       // Recalculates and caches
shape.getBounds();       // Returns cached value (fast)
shape.width = 100;       // Marks bounds dirty again
```

## Inheritance

```
Euclidian
    └── Geometry2d  <── You are here
            └── Traceable
                    └── Renderable
                            └── Transformable
                                    └── Shape
```

## Related

- [Euclidian](./euclidian.md) - Parent class
- [Renderable](./renderable.md) - Next in hierarchy
- [Shape Hierarchy](../hierarchy.md) - Full inheritance diagram

## See Also

- [Shapes Module](../README.md)
- [Transformable](./transformable.md) - Adds rotation/scale-aware bounds

# Renderable

> Visibility, opacity, shadows, and the render lifecycle.

**Module:** [shapes](../README.md) | **Extends:** `Traceable` | **Source:** `src/shapes/renderable.js`

## Overview

Renderable introduces the core rendering lifecycle. It knows when to draw, how to draw, and when **not** to draw (invisible, opacity = 0).

This class adds:
- **Rendering lifecycle control** (`render()`)
- **Canvas state management** (save/restore)
- **Visual properties** (opacity, visibility)
- **Shadow styling** support

## Constructor

```js
new Renderable(options)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `visible` | `boolean` | `true` | Whether to draw this object |
| `opacity` | `number` | `1` | Alpha transparency (0–1) |
| `active` | `boolean` | `true` | Whether to receive updates |
| `zIndex` | `number` | `0` | Stacking order |
| `blendMode` | `string` | `"source-over"` | Canvas composite operation |
| `shadowColor` | `string` | `undefined` | Shadow color |
| `shadowBlur` | `number` | `0` | Shadow blur radius |
| `shadowOffsetX` | `number` | `0` | Shadow X offset |
| `shadowOffsetY` | `number` | `0` | Shadow Y offset |

Plus all options from [Geometry2d](./geometry2d.md).

## Properties

### Inherited

From Euclidian: `x`, `y`, `width`, `height`, `debug`, `debugColor`

From Geometry2d: `minX`, `maxX`, `minY`, `maxY`, `crisp`, `boundsDirty`

### Own Properties

| Property | Type | Description |
|----------|------|-------------|
| `visible` | `boolean` | Show/hide the object |
| `opacity` | `number` | Transparency (0 = invisible, 1 = opaque) |
| `active` | `boolean` | Whether to call `update()` |
| `zIndex` | `number` | Stacking order (higher = on top) |
| `shadowColor` | `string \| undefined` | CSS color for shadow |
| `shadowBlur` | `number` | Shadow blur radius in pixels |
| `shadowOffsetX` | `number` | Horizontal shadow offset |
| `shadowOffsetY` | `number` | Vertical shadow offset |
| `tick` | `number` | Total time object has been alive (readonly) |

## Methods

### render()

Main rendering lifecycle method. Handles canvas state, applies effects, and calls `draw()`.

```js
shape.render();
```

**Render flow:**

```
render()
├── Check visible && opacity > 0
├── Painter.save()
├── Set blend mode
├── Push opacity
├── Translate to (x, y)
├── Apply shadows
├── draw()  ← subclass implements this
├── Pop opacity
└── Painter.restore()
```

### draw()

Called by `render()` to do actual drawing. Override in subclasses.

```js
class MyShape extends Renderable {
  draw() {
    // Custom drawing logic
    Painter.shapes.fillCircle(0, 0, 50, 'red');
  }
}
```

### update(dt)

Called once per frame if the object is active.

```js
shape.update(0.016); // dt in seconds

// Override in subclasses
update(dt) {
  this.x += 100 * dt;  // Move 100 pixels per second
  super.update(dt);
}
```

**Parameters:**
- `dt` (`number`): Time since last frame in seconds

### applyShadow(ctx)

Applies shadow styles to the canvas context.

```js
shape.applyShadow(Painter.ctx);
```

## Visibility Control

```js
// Hide the shape (won't render)
shape.visible = false;

// Show the shape
shape.visible = true;

// Make semi-transparent
shape.opacity = 0.5;

// Fully transparent (same as invisible)
shape.opacity = 0;
```

## Shadow Effects

```js
const shape = new Circle(50, {
  x: 200,
  y: 200,
  color: '#4ecdc4',
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowBlur: 15,
  shadowOffsetX: 5,
  shadowOffsetY: 5
});
```

## Z-Index Ordering

Objects are rendered in z-index order (low to high):

```js
const background = new Rectangle({ zIndex: 0 });
const player = new Circle({ zIndex: 10 });
const ui = new Rectangle({ zIndex: 100 });

// Render order: background → player → ui
```

## Active vs Visible

| Property | Effect |
|----------|--------|
| `visible = false` | Skips `render()`, still calls `update()` |
| `active = false` | Skips `update()`, still calls `render()` |
| Both `false` | Object is completely dormant |

```js
// Pause updates but keep drawing
shape.active = false;

// Pause everything
shape.active = false;
shape.visible = false;
```

## Blend Modes

GCanvas supports standard canvas composite operations:

```js
shape.blendMode = 'multiply';
shape.blendMode = 'screen';
shape.blendMode = 'overlay';
// etc.
```

Common values: `source-over` (default), `multiply`, `screen`, `overlay`, `darken`, `lighten`

## Inheritance

```
Geometry2d
    └── Traceable
            └── Renderable  <── You are here
                    └── Transformable
                            └── Shape
```

## Related

- [Geometry2d](./geometry2d.md) - Parent class
- [Transformable](./transformable.md) - Adds rotation/scale
- [Shape Hierarchy](../hierarchy.md) - Full inheritance diagram

## See Also

- [Shapes Module](../README.md)
- [Game Lifecycle](../../../concepts/lifecycle.md) - Update/render cycle

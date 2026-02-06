# Euclidian

> The root class defining spatial properties for all visual objects.

**Module:** [shapes](../README.md) | **Extends:** `Loggable` | **Source:** `src/shapes/euclidian.js`

## Overview

Euclidian is the foundation of all drawable objects in GCanvas. It defines the fundamental spatial contract: a 2D position, size, and **origin point**. Before something becomes a shape, a renderable, or a transformable object, it first **exists in space**.

This class is abstract and intended to be subclassed.

## Constructor

```js
new Euclidian(options)
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | `Object` | `{}` | Configuration options |

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `x` | `number` | `0` | X position (at origin point) |
| `y` | `number` | `0` | Y position (at origin point) |
| `width` | `number` | `0` | Width in pixels |
| `height` | `number` | `0` | Height in pixels |
| `origin` | `string` | `"top-left"` | Origin point shorthand |
| `originX` | `number` | `0` | Normalized X origin (0-1) |
| `originY` | `number` | `0` | Normalized Y origin (0-1) |
| `debug` | `boolean` | `false` | Enable debug visualization |
| `debugColor` | `string` | `"#0f0"` | Debug outline color |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `x` | `number` | X position (at origin point) |
| `y` | `number` | Y position (at origin point) |
| `width` | `number` | Width of the object (always ≥ 0) |
| `height` | `number` | Height of the object (always ≥ 0) |
| `originX` | `number` | Normalized X origin (0 = left, 0.5 = center, 1 = right) |
| `originY` | `number` | Normalized Y origin (0 = top, 0.5 = center, 1 = bottom) |
| `origin` | `string` | Origin shorthand (getter/setter) |
| `debug` | `boolean` | Whether debug overlay is enabled |
| `debugColor` | `string` | Color of the debug box outline |

## Origin System

GCanvas uses an **origin-based** coordinate system. The origin determines:

1. Where `(x, y)` positions the object
2. The pivot point for rotation and scaling

### Default (Top-Left Origin)

```
    ┌────────────────────────────────┐
    │                                │
    │         (x, y)                 │
    │            ●───────────────┐   │
    │            │               │   │
    │            │    width      │   │
    │            │               │   │
    │            └───────────────┘   │
    │                   height       │
    │                                │
    └────────────────────────────────┘
```

With default `origin: "top-left"`, `(x, y)` is the **top-left corner** of the object.

### Center Origin

```
    ┌────────────────────────────────┐
    │                                │
    │         ┌───────────────┐      │
    │         │               │      │
    │         │     (x, y)    │      │
    │         │       ●       │      │
    │         │               │      │
    │         └───────────────┘      │
    │                                │
    └────────────────────────────────┘
```

With `origin: "center"`, `(x, y)` is the **center** of the object.

### Origin Values

| String | originX | originY | Description |
|--------|---------|---------|-------------|
| `"top-left"` | 0 | 0 | Default - top-left corner |
| `"top-center"` | 0.5 | 0 | Top edge center |
| `"top-right"` | 1 | 0 | Top-right corner |
| `"center-left"` | 0 | 0.5 | Left edge center |
| `"center"` | 0.5 | 0.5 | Center of object |
| `"center-right"` | 1 | 0.5 | Right edge center |
| `"bottom-left"` | 0 | 1 | Bottom-left corner |
| `"bottom-center"` | 0.5 | 1 | Bottom edge center |
| `"bottom-right"` | 1 | 1 | Bottom-right corner |

## Example

```js
import { Rectangle } from '@guinetik/gcanvas';

// Top-left origin (default)
const rect1 = new Rectangle({
  x: 100,
  y: 100,
  width: 50,
  height: 30
});
// Top-left corner at (100, 100)
// Bottom-right corner at (150, 130)

// Center origin
const rect2 = new Rectangle({
  x: 100,
  y: 100,
  width: 50,
  height: 30,
  origin: "center"
});
// Center at (100, 100)
// Top-left corner at (75, 85)
// Bottom-right corner at (125, 115)

// Custom origin (bottom-center for sprites)
const sprite = new Rectangle({
  x: 100,
  y: groundY,
  width: 32,
  height: 48,
  originX: 0.5,
  originY: 1
});
// Bottom-center (feet) at (100, groundY)
```

## Property Validation

All properties are validated on set:

```js
shape.x = 100;        // Valid
shape.x = null;       // Throws Error: "Invalid property value: x null"
shape.x = undefined;  // Throws Error: "Invalid property value: x undefined"
```

Width and height are clamped to be non-negative:

```js
shape.width = -10;    // Sets width to 0
shape.height = -5;    // Sets height to 0
```

Origin values are clamped to [0, 1]:

```js
shape.originX = 0.5;  // Valid
shape.originX = 2;    // Clamped to 1
shape.originX = -1;   // Clamped to 0
```

## Inheritance

```
Loggable
    └── Euclidian  <── You are here
            └── Geometry2d
                    └── Traceable
                            └── Renderable
                                    └── Transformable
                                            └── Shape
```

## Related

- [Geometry2d](./geometry2d.md) - Adds bounding boxes and constraints
- [Shape Hierarchy](../hierarchy.md) - Full inheritance diagram
- [Coordinate System](../../../concepts/coordinate-system.md) - Full coordinate system guide
- [Rendering Pipeline](../../../concepts/rendering-pipeline.md) - How shapes render

## See Also

- [Shapes Module](../README.md)
- [Renderable](./renderable.md)
- [Migration Guide 3.0](../../../MIGRATION-3.0.md) - Migrating from center-based system

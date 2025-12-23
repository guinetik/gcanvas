# Euclidian

> The root class defining spatial properties for all visual objects.

**Module:** [shapes](../README.md) | **Extends:** `Loggable` | **Source:** `src/shapes/euclidian.js`

## Overview

Euclidian is the foundation of all drawable objects in GCanvas. It defines the fundamental spatial contract: a 2D position and size. Before something becomes a shape, a renderable, or a transformable object, it first **exists in space**.

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
| `x` | `number` | `0` | X position (center-based) |
| `y` | `number` | `0` | Y position (center-based) |
| `width` | `number` | `0` | Width in pixels |
| `height` | `number` | `0` | Height in pixels |
| `debug` | `boolean` | `false` | Enable debug visualization |
| `debugColor` | `string` | `"#0f0"` | Debug outline color |

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `x` | `number` | X center position in canvas space |
| `y` | `number` | Y center position in canvas space |
| `width` | `number` | Width of the object (always ≥ 0) |
| `height` | `number` | Height of the object (always ≥ 0) |
| `debug` | `boolean` | Whether debug overlay is enabled |
| `debugColor` | `string` | Color of the debug box outline |

## Coordinate System

GCanvas uses a **center-based** coordinate system:

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

The `(x, y)` point is the **center** of the object, not the top-left corner.

## Example

```js
import { Euclidian } from '@guinetik/gcanvas';

// Euclidian is abstract, but shows the basic spatial contract
const spatial = {
  x: 100,       // Center at x=100
  y: 100,       // Center at y=100
  width: 50,    // 50 pixels wide
  height: 30    // 30 pixels tall
};

// Top-left corner would be at (75, 85)
// x - width/2 = 100 - 25 = 75
// y - height/2 = 100 - 15 = 85
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
- [Rendering Pipeline](../../../concepts/rendering-pipeline.md) - How shapes render

## See Also

- [Shapes Module](../README.md)
- [Renderable](./renderable.md)

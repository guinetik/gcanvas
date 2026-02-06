# Migration Guide: GCanvas 2.x to 3.0

## Overview

GCanvas 3.0 introduces an **origin-based coordinate system**, replacing the previous center-based system. This change aligns GCanvas with standard canvas API conventions and provides more intuitive positioning.

## Breaking Changes

### 1. Position Coordinates (x, y)

**Before (v2.x)**: `x, y` referred to the **center** of an object
```javascript
// v2.x: Rectangle centered at (100, 100)
// Top-left was actually at (75, 85) for a 50x30 rect
const rect = new Rectangle({ x: 100, y: 100, width: 50, height: 30 });
```

**After (v3.0)**: `x, y` refers to the **origin point** (top-left by default)
```javascript
// v3.0: Rectangle with top-left at (100, 100)
const rect = new Rectangle({ x: 100, y: 100, width: 50, height: 30 });
```

### 2. Migration Strategy

To migrate existing code, you have two options:

#### Option A: Use `origin: Position.CENTER` (Recommended for quick migration)
```javascript
import { Position } from 'gcanvas';

// Keep center-based behavior by specifying origin
const rect = new Rectangle({
  x: 100, y: 100,
  width: 50, height: 30,
  origin: Position.CENTER  // <-- Add this
});
```

#### Option B: Adjust coordinates manually
```javascript
// v2.x code
const rect = new Rectangle({ x: 100, y: 100, width: 50, height: 30 });

// Equivalent v3.0 code (calculate top-left from center)
const rect = new Rectangle({
  x: 100 - 50/2,  // 75
  y: 100 - 30/2,  // 85
  width: 50,
  height: 30
});
```

### 3. Layout Utilities

The `centerItems` option in layout functions now defaults to `false`:

```javascript
// v2.x: centerItems defaulted to true
const layout = verticalLayout(items, { spacing: 10 });

// v3.0: centerItems now defaults to false
// For the same behavior as v2.x:
const layout = verticalLayout(items, { spacing: 10, centerItems: true });
```

### 4. Position.calculate() Changes

The Position utility now calculates positions for object origins (top-left by default):

```javascript
// Container at (0, 0) with size 400x300
const container = { x: 0, y: 0, width: 400, height: 300 };
const object = { width: 80, height: 40 };

// v2.x: Position.CENTER returned center coordinates (200, 150)
// v3.0: Position.CENTER returns top-left of centered object (160, 130)
const pos = Position.calculate(Position.CENTER, object, container);
// pos = { x: 160, y: 130 } (top-left of centered 80x40 object)
```

## New Features

### Origin Properties

All shapes and GameObjects now have configurable origin points:

```javascript
// Normalized values (0-1)
shape.originX = 0.5;  // Center horizontally
shape.originY = 0.5;  // Center vertically

// Or use Position constants
shape.origin = Position.CENTER;
shape.origin = Position.TOP_LEFT;      // (0, 0) - default
shape.origin = Position.BOTTOM_RIGHT;  // (1, 1)
```

### ORIGIN_MAP

A mapping from Position constants to normalized origin values:

```javascript
import { ORIGIN_MAP, Position } from 'gcanvas';

ORIGIN_MAP[Position.CENTER];      // { x: 0.5, y: 0.5 }
ORIGIN_MAP[Position.TOP_LEFT];    // { x: 0, y: 0 }
ORIGIN_MAP[Position.BOTTOM_RIGHT]; // { x: 1, y: 1 }
```

### Helper Methods

New methods for getting position regardless of origin:

```javascript
const shape = new Rectangle({
  x: 100, y: 100,
  width: 80, height: 40,
  origin: Position.CENTER
});

shape.getTopLeft();  // { x: 60, y: 80 }
shape.getCenter();   // { x: 100, y: 100 }
```

## Common Migration Patterns

### Centering an object on screen

**v2.x:**
```javascript
const obj = new Circle(game.width / 2, game.height / 2, 50);
```

**v3.0 (Option A - set origin):**
```javascript
const obj = new Circle({
  x: game.width / 2,
  y: game.height / 2,
  radius: 50,
  origin: Position.CENTER
});
```

**v3.0 (Option B - calculate top-left):**
```javascript
const obj = new Circle({
  x: game.width / 2 - 50,  // center minus radius
  y: game.height / 2 - 50,
  radius: 50
});
```

### Positioning from top-left corner

**v2.x:**
```javascript
// Rectangle with top-left at (10, 20)
const rect = new Rectangle({
  x: 10 + width/2,   // Add half width to get center
  y: 20 + height/2,  // Add half height to get center
  width: width,
  height: height
});
```

**v3.0:**
```javascript
// Rectangle with top-left at (10, 20) - now intuitive!
const rect = new Rectangle({
  x: 10,
  y: 20,
  width: width,
  height: height
});
```

### Hit testing

Hit testing now checks if point is within `(0, 0) to (width, height)` in local space, rather than `(-width/2, -height/2) to (width/2, height/2)`. This is handled automatically by the framework.

## Checklist

- [ ] Review all shape instantiations for position values
- [ ] Decide migration strategy per object: Option A (`origin: Position.CENTER`) or Option B (recalculate)
- [ ] Update layout utility calls to add `centerItems: true` if needed
- [ ] Update any custom Position.calculate() usage
- [ ] Test hit detection on interactive objects
- [ ] Verify visual positioning of all objects

## Getting Help

If you encounter issues during migration:

1. Check the debug bounds: Set `debug: true` on shapes to visualize their bounding boxes
2. Use the new `getTopLeft()` and `getCenter()` methods to verify positions
3. Remember: `origin: Position.CENTER` gives you v2.x behavior

## Summary

| Feature | v2.x | v3.0 |
|---------|------|------|
| Default `x, y` meaning | Center | Top-left (origin) |
| Default origin | Center (0.5, 0.5) | Top-left (0, 0) |
| `centerItems` default | `true` | `false` |
| Canvas API alignment | Misaligned | Aligned |
| Quick migration | N/A | Use `origin: Position.CENTER` |

# Gesture

High-level gesture recognition for zoom, pan, and tap across mouse and touch input.

## Overview

The `Gesture` class provides unified gesture handling that works seamlessly on both desktop and mobile:

| Input | Desktop | Mobile |
|-------|---------|--------|
| **Zoom** | Mouse wheel | Two-finger pinch |
| **Pan** | Mouse drag | Single finger drag |
| **Tap** | Quick click | Quick tap |

## Import

```javascript
import { Gesture } from '@guinetik/gcanvas';
```

## Basic Usage

```javascript
class MyDemo extends Game {
  init() {
    super.init();
    
    // State
    this.zoom = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // Create gesture handler
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta, cx, cy) => {
        // delta > 0 = zoom in, delta < 0 = zoom out
        const factor = delta > 0 ? 1.1 : 0.9;
        this.zoom *= factor;
        this.zoom = Math.max(0.1, Math.min(10, this.zoom));
      },
      onPan: (dx, dy) => {
        this.offsetX += dx;
        this.offsetY += dy;
      },
      onTap: (x, y) => {
        console.log(`Tapped at ${x}, ${y}`);
      }
    });
  }
  
  stop() {
    super.stop();
    // Clean up gesture handler
    this.gesture.destroy();
  }
}
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onZoom` | `Function` | `null` | Callback: `(delta, centerX, centerY) => void` |
| `onPan` | `Function` | `null` | Callback: `(dx, dy) => void` |
| `onTap` | `Function` | `null` | Callback: `(x, y) => void` |
| `onDragStart` | `Function` | `null` | Callback: `(x, y) => void` |
| `onDragEnd` | `Function` | `null` | Callback: `() => void` |
| `wheelZoomFactor` | `number` | `0.1` | Zoom sensitivity for mouse wheel |
| `pinchZoomFactor` | `number` | `1` | Zoom sensitivity for pinch gesture |
| `panScale` | `number` | `1` | Scale factor for pan deltas |
| `tapThreshold` | `number` | `10` | Max movement (px) to count as tap |
| `tapTimeout` | `number` | `300` | Max duration (ms) for tap |
| `preventDefault` | `boolean` | `true` | Prevent default browser behavior |

## Properties

### `isDragging`

```javascript
if (gesture.isDragging) {
  // User is currently dragging
}
```

Returns `true` if a drag operation is in progress.

### `canvas`

Reference to the canvas element the gesture handler is attached to.

## Methods

### `destroy()`

Remove all event listeners and clean up resources.

```javascript
gesture.destroy();
```

Always call this when the gesture handler is no longer needed to prevent memory leaks.

## Callback Details

### onZoom

```javascript
onZoom: (delta, centerX, centerY) => void
```

- `delta` - Positive for zoom in, negative for zoom out
  - Mouse wheel: ±`wheelZoomFactor` (default ±0.1)
  - Pinch: proportional to pinch movement × `pinchZoomFactor`
- `centerX`, `centerY` - The focal point of the zoom (mouse position or pinch center)

### onPan

```javascript
onPan: (dx, dy) => void
```

- `dx`, `dy` - Delta movement in pixels (scaled by `panScale`)

### onTap

```javascript
onTap: (x, y) => void
```

- `x`, `y` - Canvas-relative position of the tap
- Only fires if movement < `tapThreshold` and duration < `tapTimeout`

## Common Patterns

### Zoom with Limits

```javascript
const gesture = new Gesture(canvas, {
  onZoom: (delta) => {
    const factor = delta > 0 ? 1.1 : 0.9;
    this.targetZoom = Math.max(0.1, Math.min(10, this.targetZoom * factor));
  }
});

// In update() - smooth zoom transition
this.zoom += (this.targetZoom - this.zoom) * 0.1;
```

### Pan with Zoom Scaling

When zoomed in, pan deltas should be scaled so panning feels consistent:

```javascript
const gesture = new Gesture(canvas, {
  onPan: (dx, dy) => {
    // Scale pan by current zoom level
    this.targetOffsetX += dx / this.zoom;
    this.targetOffsetY += dy / this.zoom;
  }
});
```

### Cycle States on Tap

```javascript
const gesture = new Gesture(canvas, {
  onTap: () => {
    this.currentState = (this.currentState + 1) % this.states.length;
  }
});
```

### Disable Pan During Animation

```javascript
const gesture = new Gesture(canvas, {
  onPan: (dx, dy) => {
    if (this.isAnimating) return; // Ignore pan during animation
    this.offsetX += dx;
    this.offsetY += dy;
  }
});
```

## Integration with Camera3D

The Gesture class works alongside Camera3D for complete 3D control:

```javascript
class MyDemo extends Game {
  init() {
    // Camera handles orbit rotation
    this.camera = new Camera3D({ /* ... */ });
    this.camera.enableMouseControl(this.canvas);
    
    // Gesture handles zoom (camera doesn't do wheel zoom by default)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= delta > 0 ? 1.1 : 0.9;
      },
      // Don't handle pan - let camera handle drag for rotation
      onPan: null
    });
  }
}
```

## See Also

- [Screen](../util/screen.md) - Device detection and responsive utilities
- [Touch](./touch.md) - Low-level touch tracking
- [Mouse](./mouse.md) - Low-level mouse tracking

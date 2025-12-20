# Camera3D

> Pseudo-3D projection with perspective, rotation, and interactive mouse/touch controls.

## Overview

Camera3D provides 3D to 2D projection for creating pseudo-3D effects on a 2D canvas. It handles:

- **Perspective projection** with configurable distance
- **3-axis rotation** (X, Y, Z)
- **Mouse/touch drag rotation** with sensitivity control
- **Auto-rotation** for ambient effects
- **Double-click reset** to initial orientation

## Quick Start

```js
import { Camera3D } from 'gcanvas';

// Create camera with initial rotation
const camera = new Camera3D({
  rotationX: 0.3,    // Tilt down slightly
  rotationY: 0,      // No horizontal rotation
  perspective: 800,  // Perspective distance
});

// Enable mouse drag rotation
camera.enableMouseControl(canvas);

// In render loop - project 3D points to 2D
const { x, y, scale, z } = camera.project(x3d, y3d, z3d);

// Draw at projected position (relative to screen center)
ctx.save();
ctx.translate(canvas.width / 2, canvas.height / 2);
ctx.fillRect(x, y, 10 * scale, 10 * scale);
ctx.restore();
```

## Constructor Options

```js
const camera = new Camera3D({
  // Rotation (radians)
  rotationX: 0,           // Vertical tilt (up/down)
  rotationY: 0,           // Horizontal spin (left/right)
  rotationZ: 0,           // Roll

  // Perspective
  perspective: 800,       // Higher = less distortion

  // Mouse control
  sensitivity: 0.005,     // Drag sensitivity
  clampX: true,           // Limit vertical rotation
  minRotationX: -1.5,     // Min X rotation
  maxRotationX: 1.5,      // Max X rotation

  // Auto-rotation
  autoRotate: false,      // Enable auto-rotation
  autoRotateSpeed: 0.5,   // Radians per second
  autoRotateAxis: 'y',    // Axis: 'x', 'y', or 'z'
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rotationX` | `number` | `0` | Initial X rotation (radians) |
| `rotationY` | `number` | `0` | Initial Y rotation (radians) |
| `rotationZ` | `number` | `0` | Initial Z rotation (radians) |
| `perspective` | `number` | `800` | Perspective distance |
| `sensitivity` | `number` | `0.005` | Mouse drag sensitivity |
| `clampX` | `boolean` | `true` | Clamp vertical rotation |
| `minRotationX` | `number` | `-1.5` | Min X rotation limit |
| `maxRotationX` | `number` | `1.5` | Max X rotation limit |
| `autoRotate` | `boolean` | `false` | Enable auto-rotation |
| `autoRotateSpeed` | `number` | `0.5` | Auto-rotation speed |
| `autoRotateAxis` | `string` | `'y'` | Auto-rotation axis |

---

## Core Methods

### project(x, y, z)

Project a 3D point to 2D screen coordinates.

```js
const point3d = { x: 100, y: 50, z: -200 };
const projected = camera.project(point3d.x, point3d.y, point3d.z);

// Result:
// {
//   x: 120,      // Screen X (relative to origin)
//   y: 45,       // Screen Y (relative to origin)
//   z: -180,     // Depth (for sorting)
//   scale: 0.8   // Size multiplier (perspective)
// }
```

### projectAll(points)

Project multiple points at once.

```js
const points3d = [
  { x: 0, y: 0, z: -100 },
  { x: 100, y: 0, z: 0 },
  { x: 0, y: 100, z: 100 },
];

const projected = camera.projectAll(points3d);
// Returns array of projected points
```

### update(dt)

Update camera for auto-rotation (call in game loop).

```js
update(dt) {
  super.update(dt);
  this.camera.update(dt);  // Updates auto-rotation
}
```

---

## Mouse/Touch Control

### enableMouseControl(canvas, options)

Enable interactive rotation via mouse drag or touch.

```js
camera.enableMouseControl(canvas);

// With options
camera.enableMouseControl(canvas, {
  invertX: false,  // Invert horizontal drag
  invertY: false,  // Invert vertical drag
});
```

Features:
- **Drag** to rotate camera
- **Double-click** to reset to initial rotation
- **Touch** support for mobile devices
- Auto-pauses auto-rotation during drag

### disableMouseControl()

Remove mouse/touch controls.

```js
camera.disableMouseControl();
```

### isDragging()

Check if user is currently dragging.

```js
if (!camera.isDragging()) {
  // Do something when not interacting
}
```

---

## Rotation Control

### setRotation(x, y, z)

Set rotation angles directly.

```js
camera.setRotation(0.5, -0.3, 0);
```

### rotate(dx, dy, dz)

Add to current rotation.

```js
camera.rotate(0.01, 0.02, 0);  // Incremental rotation
```

### reset()

Reset to initial rotation values.

```js
camera.reset();
```

### lookAt(x, y, z)

Set rotation to face a point.

```js
camera.lookAt(100, 50, 200);  // Look toward point
```

---

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `rotationX` | `number` | Current X rotation |
| `rotationY` | `number` | Current Y rotation |
| `rotationZ` | `number` | Current Z rotation |
| `perspective` | `number` | Perspective distance |
| `autoRotate` | `boolean` | Is auto-rotating |
| `autoRotateSpeed` | `number` | Auto-rotation speed |
| `sensitivity` | `number` | Mouse sensitivity |

---

## Usage Patterns

### With Scene3D

The most common usage - let Scene3D handle projection automatically:

```js
import { Camera3D, Scene3D, GameObject } from 'gcanvas';

class MyDemo extends Game {
  init() {
    super.init();

    this.camera = new Camera3D({
      rotationX: 0.2,
      perspective: 800,
    });
    this.camera.enableMouseControl(this.canvas);

    this.scene3d = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
    });

    // Add objects - Scene3D handles projection
    const obj = new MyObject(this);
    obj.z = 100;  // Set z coordinate
    this.scene3d.add(obj);

    this.pipeline.add(this.scene3d);
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);
  }
}
```

### With ParticleSystem

For 3D particle effects:

```js
import { Camera3D, ParticleSystem, ParticleEmitter, Updaters } from 'gcanvas';

const camera = new Camera3D({ rotationX: 0.3 });
camera.enableMouseControl(canvas);

const particles = new ParticleSystem(game, {
  camera: camera,
  depthSort: true,
  updaters: [Updaters.velocity, Updaters.lifetime],
});

particles.addEmitter("3d-burst", new ParticleEmitter({
  position: { x: 0, y: 0, z: 0 },
  spread: { x: 50, y: 50, z: 50 },  // 3D spread
  velocitySpread: { x: 100, y: 100, z: 100 },
}));
```

### Manual Projection

For direct control over rendering:

```js
render() {
  super.render();

  const cx = this.width / 2;
  const cy = this.height / 2;

  Painter.useCtx((ctx) => {
    ctx.save();
    ctx.translate(cx, cy);

    // Project and draw each point
    for (const point of this.points3d) {
      const p = this.camera.project(point.x, point.y, point.z);

      // Skip points behind camera
      if (p.z < -this.camera.perspective + 10) continue;

      // Draw with perspective scaling
      const size = 10 * p.scale;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}
```

### Depth Sorting

Sort objects back-to-front for correct overlap:

```js
// Build render list with z values
const renderList = this.objects.map(obj => {
  const p = this.camera.project(obj.x, obj.y, obj.z);
  return { obj, ...p };
});

// Sort back-to-front (higher z = further back)
renderList.sort((a, b) => b.z - a.z);

// Render in order
for (const item of renderList) {
  // Draw at item.x, item.y with item.scale
}
```

---

## Understanding Perspective

The `perspective` value controls distortion:

| Value | Effect |
|-------|--------|
| **Low (200-400)** | Strong perspective, dramatic depth |
| **Medium (600-1000)** | Natural looking, balanced |
| **High (1500+)** | Flat, orthographic-like |

```js
// Dramatic perspective
new Camera3D({ perspective: 300 });

// Subtle perspective
new Camera3D({ perspective: 1200 });
```

---

## Understanding Rotation

| Axis | Effect | Positive Direction |
|------|--------|-------------------|
| **X** | Vertical tilt | Tilt forward (look down) |
| **Y** | Horizontal spin | Rotate right |
| **Z** | Roll | Clockwise roll |

```js
// Looking down at a table
new Camera3D({ rotationX: 0.8, rotationY: 0 });

// Side view
new Camera3D({ rotationX: 0, rotationY: 1.57 });

// Tilted view
new Camera3D({ rotationX: 0.3, rotationY: -0.5 });
```

---

## Coordinate System

Camera3D uses a right-handed coordinate system:

```
        +Y (up)
         │
         │
         │
         └──────── +X (right)
        /
       /
      +Z (toward viewer)
```

- **X**: Positive is right
- **Y**: Positive is up
- **Z**: Positive is toward the viewer

Points with larger Z values appear in front; smaller Z values appear behind.

---

## Related

- [Scene3D](./scene3d.md) - Scene with automatic camera projection
- [Particle Module](../particle/README.md) - 3D particle effects

## See Also

- [Game Module](../game/README.md) - Game loop integration
- [Painter Module](../painter/README.md) - Direct canvas drawing

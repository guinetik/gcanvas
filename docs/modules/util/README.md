# Util Module

> Utilities for 3D projection, layout, positioning, and more.

## Overview

The util module provides helper classes and functions for common tasks:

| Utility | Description |
|---------|-------------|
| [**Camera3D**](./camera3d.md) | Pseudo-3D projection with mouse controls |
| [**Scene3D**](./scene3d.md) | Scene with automatic 3D projection |
| **Layout** | Vertical, horizontal, and grid layouts |
| **Position** | Anchor constants and positioning |

## Quick Navigation

- [Camera3D](./camera3d.md) - 3D to 2D projection, rotation, mouse control
- [Scene3D](./scene3d.md) - Scene that projects children through Camera3D

## 3D System Overview

GCanvas provides a pseudo-3D system that projects 3D coordinates to 2D canvas:

```
┌─────────────────────────────────────────────────────────────┐
│                     Camera3D                                 │
│  • Rotation (X, Y, Z axes)                                  │
│  • Perspective projection                                    │
│  • Mouse/touch rotation control                              │
│  • Auto-rotation                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Scene3D                                  │
│  • Container for GameObjects with z-coordinates             │
│  • Automatic projection through camera                       │
│  • Depth sorting (back-to-front)                            │
│  • Perspective scaling                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  ParticleSystem                              │
│  • 3D particle effects                                       │
│  • Camera integration                                        │
│  • Depth-sorted rendering                                    │
└─────────────────────────────────────────────────────────────┘
```

## Basic 3D Setup

```js
import { Game, Camera3D, Scene3D, GameObject, Rectangle } from '@guinetik/gcanvas';

class My3DDemo extends Game {
  init() {
    super.init();

    // Create camera
    this.camera = new Camera3D({
      rotationX: 0.3,
      perspective: 800,
      autoRotate: true,
    });
    this.camera.enableMouseControl(this.canvas);

    // Create 3D scene centered on screen
    this.scene3d = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
      depthSort: true,
    });

    // Add objects with z coordinates
    for (let i = 0; i < 5; i++) {
      const box = new BoxObject(this);
      box.x = (i - 2) * 100;
      box.z = Math.sin(i) * 100;  // Vary depth
      this.scene3d.add(box);
    }

    this.pipeline.add(this.scene3d);
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);
  }
}
```

## Related

- [Camera3D](./camera3d.md) - Full camera documentation
- [Scene3D](./scene3d.md) - Full scene documentation
- [Particle Module](../particle/README.md) - 3D particle effects

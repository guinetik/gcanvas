# Scene3D

> A Scene that automatically projects children through Camera3D for pseudo-3D effects.

## Overview

Scene3D bridges the GameObject/Scene system with Camera3D. It allows you to position GameObjects in 3D space (x, y, z) and automatically projects them through the camera for rendering.

**Key Features:**
- Extends the standard Scene class
- Projects children through Camera3D automatically
- Supports z-coordinate on any GameObject
- Depth sorting (back-to-front rendering)
- Perspective scaling based on depth

## Quick Start

```js
import { Game, Camera3D, Scene3D, GameObject, Rectangle } from '@guinetik/gcanvas';

class BoxObject extends GameObject {
  constructor(game) {
    super(game);
    this.z = 0;  // Add z coordinate
    this.shape = new Rectangle({
      width: 60,
      height: 60,
      color: '#4a9eff',
      stroke: '#fff',
    });
  }

  draw() {
    this.shape.draw();
  }
}

class My3DDemo extends Game {
  init() {
    super.init();

    // Create camera
    this.camera = new Camera3D({
      rotationX: 0.3,
      perspective: 800,
    });
    this.camera.enableMouseControl(this.canvas);

    // Create 3D scene (centered on screen)
    this.scene3d = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
      depthSort: true,
    });

    // Add objects with different z positions
    const front = new BoxObject(this);
    front.x = -80;
    front.z = 100;  // In front

    const middle = new BoxObject(this);
    middle.x = 0;
    middle.z = 0;   // Center

    const back = new BoxObject(this);
    back.x = 80;
    back.z = -100;  // Behind

    this.scene3d.add(front);
    this.scene3d.add(middle);
    this.scene3d.add(back);

    this.pipeline.add(this.scene3d);
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);
  }
}
```

## Constructor Options

```js
const scene3d = new Scene3D(game, {
  // Position (screen coordinates where scene is centered)
  x: game.width / 2,
  y: game.height / 2,

  // Required: Camera for projection
  camera: myCamera,

  // Optional settings
  depthSort: true,      // Sort children by depth (back-to-front)
  scaleByDepth: true,   // Scale children based on perspective
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `camera` | `Camera3D` | **required** | Camera for 3D projection |
| `depthSort` | `boolean` | `true` | Sort children back-to-front |
| `scaleByDepth` | `boolean` | `true` | Apply perspective scaling |
| `x`, `y` | `number` | `0` | Scene position (typically screen center) |

---

## Adding Objects

Scene3D works with any GameObject. Just add a `z` property:

```js
// Standard GameObject
class MyObject extends GameObject {
  constructor(game) {
    super(game);
    this.z = 0;  // Initialize z coordinate
  }
}

// Add to scene
const obj = new MyObject(this);
obj.x = 100;   // Horizontal position
obj.y = 50;    // Vertical position
obj.z = -200;  // Depth (negative = behind, positive = in front)
scene3d.add(obj);
```

If an object doesn't have a `z` property, it defaults to `0` (center plane).

---

## Depth Sorting

When `depthSort: true`, Scene3D renders objects from back to front, ensuring correct overlap:

```js
// Objects overlap correctly
const scene3d = new Scene3D(this, {
  camera: this.camera,
  depthSort: true,  // Enable depth sorting
});

// Back object won't obscure front object
backObj.z = -100;   // Behind
frontObj.z = 100;   // In front
```

Disable for performance if objects don't overlap:

```js
// All objects at same z - no need to sort
const scene3d = new Scene3D(this, {
  camera: this.camera,
  depthSort: false,
});
```

---

## Perspective Scaling

When `scaleByDepth: true`, objects scale based on their distance from the camera:

```js
// Objects shrink as they move away
const scene3d = new Scene3D(this, {
  camera: this.camera,
  scaleByDepth: true,  // Enable perspective scaling
});

nearObj.z = 200;   // Appears larger
farObj.z = -300;   // Appears smaller
```

Disable for flat rendering (no size change with depth):

```js
// All objects same size regardless of z
const scene3d = new Scene3D(this, {
  camera: this.camera,
  scaleByDepth: false,
});
```

---

## Common Patterns

### Responsive Centering

Keep Scene3D centered when window resizes:

```js
class MyDemo extends Game {
  init() {
    super.init();
    this.enableFluidSize();

    this.scene3d = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
    });
  }

  update(dt) {
    super.update(dt);

    // Keep centered on resize
    this.scene3d.x = this.width / 2;
    this.scene3d.y = this.height / 2;
  }
}
```

### Grid of Objects

Create a 3D grid layout:

```js
const spacing = 80;
const gridSize = 5;

for (let x = 0; x < gridSize; x++) {
  for (let z = 0; z < gridSize; z++) {
    const obj = new GridCell(this);
    obj.x = (x - gridSize / 2) * spacing;
    obj.y = 0;
    obj.z = (z - gridSize / 2) * spacing;
    this.scene3d.add(obj);
  }
}
```

### Orbiting Objects

Animate z-coordinates for 3D motion:

```js
class OrbitingObject extends GameObject {
  constructor(game, angle, radius) {
    super(game);
    this.angle = angle;
    this.radius = radius;
    this.z = 0;
  }

  update(dt) {
    this.angle += dt;
    this.x = Math.cos(this.angle) * this.radius;
    this.z = Math.sin(this.angle) * this.radius;
  }
}
```

### Multiple Layers

Use multiple Scene3D instances for layered effects:

```js
// Background layer (far away, slow parallax)
this.bgScene = new Scene3D(this, {
  x: cx, y: cy,
  camera: this.camera,
});

// Main layer
this.mainScene = new Scene3D(this, {
  x: cx, y: cy,
  camera: this.camera,
});

// Foreground layer (close, fast parallax)
this.fgScene = new Scene3D(this, {
  x: cx, y: cy,
  camera: this.camera,
});

// Add to pipeline in order
this.pipeline.add(this.bgScene);
this.pipeline.add(this.mainScene);
this.pipeline.add(this.fgScene);
```

---

## With ParticleSystem

Scene3D and ParticleSystem both use Camera3D independently. Add them to the same pipeline:

```js
class EffectsDemo extends Game {
  init() {
    super.init();

    this.camera = new Camera3D({ rotationX: 0.3 });
    this.camera.enableMouseControl(this.canvas);

    // 3D scene for objects
    this.scene3d = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
    });

    // Particle system with same camera
    this.particles = new ParticleSystem(this, {
      camera: this.camera,
      depthSort: true,
    });

    // Both in pipeline
    this.pipeline.add(this.scene3d);
    this.pipeline.add(this.particles);
  }
}
```

---

## How It Works

Scene3D overrides the Scene's `draw()` method to:

1. **Build render list** - Collect visible children with their 3D positions
2. **Project through camera** - Convert 3D (x, y, z) to 2D screen coordinates
3. **Cull behind camera** - Skip objects behind the camera plane
4. **Sort by depth** - Order back-to-front (if enabled)
5. **Render with scaling** - Draw each child at projected position with perspective scale

```
Child Object (x, y, z)
        │
        ▼
  Camera3D.project()
        │
        ▼
  Screen Position (x, y, scale)
        │
        ▼
  Painter.translateTo() + scale()
        │
        ▼
  child.draw()
```

---

## Differences from Scene

| Feature | Scene | Scene3D |
|---------|-------|---------|
| Coordinate system | 2D (x, y) | 3D (x, y, z) |
| Projection | None | Camera3D |
| Depth sorting | By zIndex | By projected z |
| Perspective scaling | No | Yes (optional) |
| Camera required | No | Yes |

---

## API Reference

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `camera` | `Camera3D` | Camera used for projection |
| `depthSort` | `boolean` | Whether to sort by depth |
| `scaleByDepth` | `boolean` | Whether to scale by perspective |
| `children` | `Array` | Child GameObjects (inherited) |

### Methods

Inherits all methods from Scene:

| Method | Description |
|--------|-------------|
| `add(child)` | Add a GameObject |
| `remove(child)` | Remove a GameObject |
| `clear()` | Remove all children |

---

## Related

- [Camera3D](./camera3d.md) - Camera projection and controls
- [Game Module](../game/README.md) - Scene base class

## See Also

- [Particle Module](../particle/README.md) - 3D particle effects
- [Shapes Module](../shapes/README.md) - Shape primitives

# Coordinate System

GCanvas uses a **top-left based coordinate system** by default, matching standard canvas API conventions. The `origin` property allows you to configure the pivot point for positioning, rotation, and scaling.

## TL;DR

| Default | Behavior |
|---------|----------|
| `x, y` position | Top-left corner of shape (unless origin changed) |
| `origin: "top-left"` | Default - position is top-left corner |
| `origin: "center"` | Position is center point |
| Canvas `(0, 0)` | Top-left corner of canvas |
| Child coordinates | Relative to parent's position |

---

## 1. The Origin Property

Every shape has a configurable origin point that defines:
1. Where `(x, y)` positions the object
2. The pivot point for rotation and scaling

### String Values

| Value | originX | originY | Description |
|-------|---------|---------|-------------|
| `"top-left"` | 0 | 0 | Default - position is top-left corner |
| `"center"` | 0.5 | 0.5 | Position is center point |
| `"top-center"` | 0.5 | 0 | Top edge, horizontally centered |
| `"bottom-center"` | 0.5 | 1 | Bottom edge, horizontally centered |
| `"top-right"` | 1 | 0 | Top-right corner |
| `"bottom-left"` | 0 | 1 | Bottom-left corner |
| `"bottom-right"` | 1 | 1 | Bottom-right corner |

### Normalized Values

You can also use numeric values (0-1):

```javascript
// Custom origin - bottom-center for sprites standing on ground
const sprite = new Rectangle({
  x: 100, y: groundY,
  width: 32, height: 48,
  originX: 0.5,
  originY: 1  // feet at x,y position
});
```

---

## 2. Default Positioning (Top-Left)

By default, `x` and `y` position the **top-left corner** of a shape:

```javascript
// Rectangle with top-left at (100, 100)
const rect = new Rectangle({
  x: 100, y: 100,
  width: 80, height: 40,
  color: "#0f0"
});
// Top-left IS at (100, 100) - intuitive!
// Bottom-right is at (180, 140)
```

Canvas origin `(0, 0)` is the **top-left corner**:
- **X increases** going right
- **Y increases** going down

---

## 3. Center-Based Positioning (Opt-in)

For game objects, animations, or when you want rotation/scaling around the center, use `origin: "center"`:

```javascript
// Rectangle with CENTER at (100, 100)
const rect = new Rectangle({
  x: 100, y: 100,
  width: 80, height: 40,
  color: "#0ff",
  origin: "center"
});
// Center is at (100, 100)
// Top-left is at (60, 80)
// Bottom-right is at (140, 120)
```

### Comparison

| System | `x: 100, y: 100` for 80x40 rect | Rotation pivot |
|--------|--------------------------------|----------------|
| **Top-left (default)** | Top-left at (100, 100) | Around top-left corner |
| **Center (opt-in)** | Center at (100, 100) | Around center |

---

## 4. How Origin Affects Transforms

### Rotation

The origin point is the pivot for rotation:

```
origin: "top-left"               origin: "center"
●─────────┐                     ┌─────────┐
│         │  rotation           │    ●    │  rotation
│         │  pivots here ───►   │         │  pivots here
└─────────┘                     └─────────┘
```

```javascript
// Door animation - rotates around hinge (top-left)
const door = new Rectangle({
  x: 0, y: 100,
  width: 60, height: 120,
  rotation: 45  // Opens from top-left corner
});

// Spinning coin - rotates around center
const coin = new Circle(30, {
  x: 200, y: 200,
  origin: "center",
  rotation: 45  // Spins around center
});
```

### Scaling

Scaling expands/contracts from the origin point:

```javascript
// Button with center origin - scale grows in all directions
const button = new Rectangle({
  x: 200, y: 150,
  width: 100, height: 40,
  origin: "center",
  scaleX: 1.2,
  scaleY: 1.2  // Grows equally in all directions
});

// Character squash - compresses toward ground
const character = new Rectangle({
  x: 100, y: groundY,
  width: 32, height: 48,
  originX: 0.5,
  originY: 1,  // Bottom-center
  scaleY: 0.8  // Squashes toward the ground
});
```

---

## 5. Parent-Child Relationships

When you add objects to a **Scene**, their coordinates become **relative to the parent's position**:

```javascript
// Scene with top-left at (200, 200)
const scene = new Scene(this, { x: 200, y: 200 });

// Child at (50, 30) relative to scene
const child = new Circle(20, { x: 50, y: 30, color: "#0f0" });
scene.add(child);

// Child's screen position: (200 + 50, 200 + 30) = (250, 230)
```

### Visual Diagram

```
Canvas (0,0)───────────────────────────────►X
    │
    │      Scene at (200, 200)
    │      ●─────────────────────┐
    │      │    Scene's local    │
    │      │    origin (0, 0)    │
    │      │         ───────────┼──► Scene's X
    │      │         │          │
    │      │         │  Child   │
    │      │         │  (50,30) │
    │      │         ▼     ◉    │
    │      │    Scene's Y       │
    │      └────────────────────┘
    │
    ▼
    Y
```

### Nested Scenes

Coordinates stack through the hierarchy:

```javascript
const outer = new Scene(this, { x: 100, y: 100 });
const inner = new Scene(this, { x: 50, y: 50 });
const shape = new Circle(10, { x: 25, y: 25, color: "#ff0" });

inner.add(shape);
outer.add(inner);
this.pipeline.add(outer);

// Screen position calculation:
// outer.x + inner.x + shape.x = 100 + 50 + 25 = 175
// outer.y + inner.y + shape.y = 100 + 50 + 25 = 175
// Shape appears at screen (175, 175)
```

---

## 6. Camera3D and Scene3D

When using 3D projection, `Camera3D.project()` returns coordinates centered at the origin. That's why Scene3D must be positioned at canvas center:

```javascript
const camera = new Camera3D({ perspective: 800 });

// Scene3D MUST be centered for 3D projection to work correctly
const scene3d = new Scene3D(this, {
  x: this.width / 2,
  y: this.height / 2,
  camera: camera
});

// Object at 3D origin (0, 0, 0) appears at screen center
// Object at (100, 0, 0) appears right of center
```

### Manual Centering

If rendering 3D-projected content outside of Scene3D, manually center:

```javascript
Painter.useCtx((ctx) => {
  ctx.save();
  ctx.translate(this.game.width / 2, this.game.height / 2);
  
  // Now draw at projected coordinates
  const projected = camera.project(x, y, z);
  ctx.fillRect(projected.x - 5, projected.y - 5, 10, 10);
  
  ctx.restore();
});
```

---

## 7. Circles and Bounding Boxes

For circles, the origin is based on the **bounding box**, not the visual circle:

```javascript
// Circle with top-left origin (default)
const circle = new Circle(50, { x: 100, y: 100 });
// Bounding box top-left at (100, 100)
// Circle center at (100 + 50, 100 + 50) = (150, 150)

// Circle with center origin
const circle = new Circle(50, { x: 100, y: 100, origin: "center" });
// Circle center at (100, 100)
// Bounding box top-left at (50, 50)
```

---

## 8. Fluent API Note

The Fluent API (`gcanvas()`, `sketch()`) defaults shapes to `origin: "center"` for intuitive positioning. This means:

```javascript
// Fluent API - shapes centered by default
gcanvas({ bg: '#111' })
  .scene('game')
    .go({ x: 200, y: 125 })
      .circle({ radius: 40, fill: '#00ff88' })  // Centered at (200, 125)
  .start();

// Traditional API - shapes at top-left by default
const circle = new Circle(40, { x: 200, y: 125, color: '#00ff88' });
// Top-left of bounding box at (200, 125)
```

---

## 9. Practical Tips

### Quick Reference

| I want to... | Do this |
|--------------|---------|
| Place object at screen position | Set `x`, `y` directly (top-left by default) |
| Center object on screen | `x: game.width / 2, y: game.height / 2, origin: "center"` |
| Game object with rotation/scaling | Add `origin: "center"` |
| Sprite standing on ground | Use `originX: 0.5, originY: 1` |
| UI element at top-left | Default origin works |
| UI element at top-right | Use `origin: "top-right"` |

### Common Patterns

```javascript
import { Position } from "gcanvas";

// Character sprite - feet at position
const player = new Sprite(this, {
  x: groundX,
  y: groundY,
  originX: 0.5,
  originY: 1
});

// Centered button with hover effect
const button = new Button(this, {
  x: this.width / 2,
  y: this.height / 2,
  origin: "center"  // or Position.CENTER
});

// HUD score at top-left
const score = new Text(this, "Score: 0", {
  x: 10, y: 10
  // Default top-left origin
});

// HUD lives at top-right
const lives = new Text(this, "Lives: 3", {
  x: this.width - 10,
  y: 10,
  origin: "top-right"
});
```

---

## See Also

- [Migration Guide 3.0](../MIGRATION-3.0.md) - Migrating from center-based system
- [Coordinate System Refactor RFC](../coordinate-system-refactor.md) - Design decisions
- [Shapes vs GameObjects](./shapes-vs-gameobjects.md) - Understanding the two hierarchies
- [Rendering Pipeline](./rendering-pipeline.md) - How objects are rendered each frame

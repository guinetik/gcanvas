# Coordinate System

GCanvas uses a **center-based coordinate system** where `x` and `y` refer to an object's center point, not its top-left corner. This guide explains how positioning works throughout the library.

## TL;DR

| Situation | How It Works |
|-----------|--------------|
| Object at `(100, 100)` | Center is at screen position (100, 100) |
| Child at `(10, 20)` in a Scene at `(100, 100)` | Child center is at screen position (110, 120) |
| Camera3D `project()` returns `(0, 0)` | Object is at the center of the 3D view |
| Scene3D at `(width/2, height/2)` | 3D origin appears at canvas center |

---

## 1. Center-Based Positioning

Unlike many graphics libraries that use top-left corners, GCanvas positions objects by their **center point**. This makes rotation and scaling more intuitive since transforms happen around the object's center.

```javascript
// This circle's CENTER is at (100, 100)
const circle = new Circle(50, { x: 100, y: 100, color: "#0f0" });

// The circle extends from:
// - Left edge: 50 (100 - radius)
// - Right edge: 150 (100 + radius)
// - Top edge: 50 (100 - radius)
// - Bottom edge: 150 (100 + radius)
```

### Comparison with Top-Left Systems

| System | `x: 100, y: 100` means... | Rotation pivot |
|--------|---------------------------|----------------|
| **GCanvas (center)** | Center at (100, 100) | Around center |
| Top-left systems | Top-left at (100, 100) | Around top-left corner |

**Why center-based?** When you rotate or scale an object, it transforms around its center naturally. No need to manually adjust the pivot point.

---

## 2. Basic Positioning

When you add an object directly to the pipeline, its coordinates are **absolute screen coordinates**.

```javascript
class MyGame extends Game {
  init() {
    super.init();

    // Circle centered at screen position (200, 150)
    const circle = new Circle(30, { x: 200, y: 150, color: "#0ff" });
    this.pipeline.add(circle);

    // Rectangle centered at screen position (400, 300)
    const rect = new Rectangle({
      x: 400, y: 300,
      width: 100, height: 60,
      color: "#f0f"
    });
    this.pipeline.add(rect);
  }
}
```

Canvas origin `(0, 0)` is the **top-left corner**:
- **X increases** going right
- **Y increases** going down

---

## 3. Parent-Child Relationships

When you add objects to a **Scene**, their coordinates become **relative to the parent's center**.

```javascript
// Scene centered at (200, 200)
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
    │      ┌─────────────────────┐
    │      │    Scene's local    │
    │      │    origin (0, 0)    │
    │      │         ●───────────┼──► Scene's X
    │      │         │           │
    │      │         │  Child at │
    │      │         │  (50, 30) │
    │      │         ▼     ◉     │
    │      │    Scene's Y        │
    │      └─────────────────────┘
    │
    ▼
    Y
```

When the Scene renders:
1. Canvas translates to `(200, 200)` — Scene's position
2. Child renders at `(50, 30)` — relative to Scene's origin
3. Final screen position: `(250, 230)`

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

## 4. Camera3D and Scene3D

When using 3D projection, an additional coordinate transformation layer is introduced.

### How Camera3D.project() Works

`Camera3D.project(x, y, z)` transforms a 3D world position to 2D screen coordinates:

```javascript
const camera = new Camera3D({ perspective: 800 });

// Object at 3D position (100, 0, 200)
const projected = camera.project(100, 0, 200);
// Returns: { x: 80, y: 0, z: 200, scale: 0.8 }
```

**Key insight:** The returned `x` and `y` are offsets **from the center of the view**, not absolute screen coordinates. An object at world origin `(0, 0, 0)` projects to screen `(0, 0)`.

### Why Scene3D Centers the View

Since Camera3D returns origin-centered coordinates, Scene3D must translate to the canvas center:

```javascript
// Scene3D at canvas center
const scene3d = new Scene3D(this, {
  x: this.width / 2,   // 400 for 800px canvas
  y: this.height / 2,  // 300 for 600px canvas
  camera: this.camera
});
```

This means:
- 3D origin `(0, 0, 0)` appears at screen center
- Objects with positive X move right of center
- Objects with positive Y move down from center
- Objects with positive Z are further away (smaller due to perspective)

### Code Example: Basic Scene3D

```javascript
import { Game, Scene3D, Sphere3D, Camera3D } from "gcanvas";

class My3DDemo extends Game {
  init() {
    super.init();

    // Create camera with perspective
    this.camera = new Camera3D({
      perspective: 800,
      rotationY: 0.3
    });

    // Scene3D MUST be centered for 3D projection to work correctly
    this.scene = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera
    });

    // Sphere at 3D origin - appears at screen center
    const sphere1 = new Sphere3D(50, {
      x: 0, y: 0, z: 0,
      color: "#0ff",
      camera: this.camera
    });

    // Sphere offset in 3D space - appears right of center
    const sphere2 = new Sphere3D(30, {
      x: 150, y: 0, z: 0,
      color: "#f0f",
      camera: this.camera
    });

    this.scene.add(sphere1);
    this.scene.add(sphere2);
    this.pipeline.add(this.scene);
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);  // For auto-rotation/inertia
  }
}
```

### Common Gotcha: Manual Centering

If you're rendering 3D-projected content **outside** of Scene3D, you must manually center:

```javascript
// In ParticleSystem.renderWithDepthSort():
// When NOT inside a Scene3D, we must translate to center ourselves
if (!this.worldSpace && !isInsideScene3D) {
  ctx.save();
  ctx.translate(this.game.width / 2, this.game.height / 2);
  // ... render particles at projected positions ...
  ctx.restore();
}
```

Similarly, `Sphere3D` with shader rendering extracts the current transform to find the scene center:

```javascript
// From sphere3d.js - getting scene center for WebGL compositing
const transform = ctx.getTransform();
const sceneX = transform.e;  // Translation X (scene center)
const sceneY = transform.f;  // Translation Y (scene center)
```

---

## 5. Anchoring and Layouts

### Position Anchoring

The `applyAnchor` mixin positions objects relative to the game canvas or a parent container:

```javascript
import { Text, applyAnchor, Position } from "gcanvas";

// Anchor text to top-center of canvas
const title = new Text(this, "Game Title", { font: "24px sans-serif" });
applyAnchor(title, {
  anchor: Position.TOP_CENTER,
  anchorMargin: 20  // 20px from top edge
});
this.pipeline.add(title);
```

Available positions:
- `Position.TOP_LEFT`, `Position.TOP_CENTER`, `Position.TOP_RIGHT`
- `Position.CENTER_LEFT`, `Position.CENTER`, `Position.CENTER_RIGHT`
- `Position.BOTTOM_LEFT`, `Position.BOTTOM_CENTER`, `Position.BOTTOM_RIGHT`

### Relative Anchoring

Anchor relative to another object:

```javascript
const panel = new Scene(this, { x: 200, y: 200, width: 300, height: 200 });

const label = new Text(this, "Panel Title", {});
applyAnchor(label, {
  anchor: Position.TOP_CENTER,
  anchorRelative: panel,  // Position relative to panel
  anchorMargin: 10
});

panel.add(label);
```

### Layout Utilities

Layouts automatically position multiple items:

```javascript
import { verticalLayout, applyLayout, Scene, Text } from "gcanvas";

const items = [
  new Text(this, "Option 1", {}),
  new Text(this, "Option 2", {}),
  new Text(this, "Option 3", {})
];

// Compute vertical layout
const layout = verticalLayout(items, {
  spacing: 15,
  padding: 10,
  align: "center"
});

// Apply positions to items
applyLayout(items, layout.positions);

// Add to scene (layout is centered by offset)
const menu = new Scene(this, { x: this.width / 2, y: this.height / 2 });
items.forEach(item => menu.add(item));
```

**How layouts work internally:**
1. Layouts compute positions in a top-left coordinate system starting at `(0, 0)`
2. `applyLayout` applies these positions plus any offset
3. LayoutScene subclasses (like `VerticalLayout`) apply a centering offset:
   - Vertical: `offsetY = -totalHeight / 2`
   - Horizontal: `offsetX = -totalWidth / 2`

### LayoutScene Classes

For automatic positioning, use the LayoutScene subclasses:

```javascript
import { HorizontalLayout, VerticalLayout, TileLayout, Position } from "gcanvas";

// HorizontalLayout positions children in a row
const toolbar = new HorizontalLayout(this, {
  anchor: Position.TOP_CENTER,
  spacing: 10,
  padding: 10,
});

// VerticalLayout positions children in a column
const menu = new VerticalLayout(this, {
  anchor: Position.CENTER,
  spacing: 15,
});

// TileLayout positions children in a grid
const grid = new TileLayout(this, {
  columns: 4,
  spacing: 10,
});
```

LayoutScenes extend Scene, so children use **relative coordinates** just like regular Scenes. The layout system automatically computes and applies positions.

---

## 6. Practical Tips

### Quick Reference

| I want to... | Do this |
|--------------|---------|
| Place object at screen position | Set `x`, `y` directly, add to pipeline |
| Place object relative to parent | Add to Scene, set local `x`, `y` |
| Center object on screen | `x: game.width / 2, y: game.height / 2` |
| Anchor to screen edge | Use `applyAnchor` with `Position` constant |
| Use 3D projection | Use `Scene3D` centered at canvas center |
| Position particles with Camera3D | Set `camera` and `depthSort: true` on ParticleSystem |

### Common Mistakes

**1. Forgetting to center Scene3D**
```javascript
// WRONG - 3D origin appears at top-left
const scene = new Scene3D(this, { x: 0, y: 0, camera });

// CORRECT - 3D origin appears at canvas center
const scene = new Scene3D(this, {
  x: this.width / 2,
  y: this.height / 2,
  camera
});
```

**2. Confusing local and screen coordinates**
```javascript
const scene = new Scene(this, { x: 100, y: 100 });
const child = new Circle(20, { x: 50, y: 50 });
scene.add(child);

// WRONG assumption: child is at screen (50, 50)
// CORRECT: child is at screen (150, 150)
```

**3. Not updating Camera3D in game loop**
```javascript
update(dt) {
  super.update(dt);
  // If using auto-rotation or inertia, camera needs update
  this.camera.update(dt);
}
```

**4. Using world coordinates with Camera3D outside Scene3D**
```javascript
// If using Camera3D projection directly (not in Scene3D),
// remember to translate to canvas center before drawing
Painter.useCtx((ctx) => {
  ctx.translate(this.width / 2, this.height / 2);
  // Now draw at projected coordinates
});
```

---

## See Also

- [Shapes vs GameObjects](./shapes-vs-gameobjects.md) - Understanding the two hierarchies (Shape vs GameObject, Scene3D, Layouts)
- [Rendering Pipeline](./rendering-pipeline.md) - How objects are rendered each frame
- [Camera3D Module](../modules/util/camera3d.md) - Full Camera3D API reference
- [Scene3D Module](../modules/util/scene3d.md) - Scene3D API and usage patterns

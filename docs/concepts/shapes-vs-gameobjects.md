# Shapes vs GameObjects

GCanvas serves two distinct use cases with different abstractions. Understanding when to use each is key to working effectively with the library.

## Overview

| Aspect | Shapes | GameObjects |
|--------|--------|-------------|
| Purpose | Direct canvas rendering | Managed game pipeline |
| Game loop | Not required | Required |
| Rendering | Call `render()` manually | Automatic via pipeline |
| State | Stateless between frames | Maintains state |
| Lifecycle | None | `update(dt)` / `draw()` |
| Best for | Generative art, static visuals | Games, animations, interactive apps |

## The Two Hierarchies

### Shape Hierarchy (Drawing)

```
Euclidian → Geometry2d → Renderable → Transformable → Shape
```

- **Euclidian**: Basic positioning (x, y, width, height)
- **Geometry2d**: Bounds constraints, bounding box calculations
- **Renderable**: Visibility, opacity, shadows
- **Transformable**: Rotation, scaling
- **Shape**: Styling (fill, stroke, lineWidth)

### GameObject Hierarchy (Pipeline)

```
GameObject → Scene / Sprite / Text
```

- **GameObject**: Base class with `update(dt)` and `draw()` lifecycle
- **Scene**: Container for other GameObjects
- **Sprite**: Animated GameObject with frame-by-frame timeline
- **Text**: Text rendering with automatic updates

### Containers

| Container | Holds | Has update()? |
|-----------|-------|---------------|
| `Group` | Shapes | No |
| `Scene` | GameObjects | Yes |

## When to Use What

| Use Case | Use This | Why |
|----------|----------|-----|
| Static visualization | `Shape` + `render()` | No update loop needed |
| Generative art | `Shape`, `Group` | Direct control, no overhead |
| Game character | `Sprite` (GameObject) | Needs update cycle for animation |
| UI elements | `Text`, `Scene` | Pipeline handles positioning |
| Complex scene | `Scene` with children | Hierarchical transforms, lifecycle |
| Composite shape | `Group` | Transform multiple shapes together |

## Example: Shapes Only (No Game Loop)

You can use GCanvas purely for drawing without any game infrastructure:

```javascript
import { Circle, Rectangle, Group, Painter } from "gcanvas";

// Get canvas context
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
Painter.ctx = ctx;

// Create shapes
const circle = new Circle(50, { x: 100, y: 100, color: "#0f0" });
const rect = new Rectangle({ x: 200, y: 100, width: 80, height: 60, color: "#0ff" });

// Render directly - no game loop needed
circle.render();
rect.render();

// Group multiple shapes
const group = new Group({ x: 300, y: 100, rotation: Math.PI / 4 });
group.add(new Circle(20, { color: "#f0f" }));
group.add(new Rectangle({ y: 30, width: 40, height: 20, color: "#ff0" }));
group.render();
```

> **Note:** This is perfect for one-off drawings, generative art, or when you want full control over the render loop.

## Example: GameObjects with Pipeline

When you need animation, input handling, and managed lifecycles:

```javascript
import { Game, Scene, Sprite, Text, Circle, Keys } from "gcanvas";

class MyGame extends Game {
  init() {
    super.init();

    // Create a scene (GameObject container)
    this.scene = new Scene(this, { anchor: "center" });

    // Create a sprite with animation (GameObject)
    this.player = new Sprite(this, { x: 0, y: 0, frameRate: 10 });
    this.player.addFrame(new Circle(20, { color: "#0f0" }));
    this.player.addFrame(new Circle(25, { color: "#0ff" }));
    this.player.play();

    // Add to scene
    this.scene.add(this.player);

    // Add scene to pipeline - now it's managed
    this.pipeline.add(this.scene);

    // Input handling
    this.events.on(Keys.SPACE, () => this.player.pause());
  }

  update(dt) {
    super.update(dt);
    // Player sprite automatically updates via pipeline
  }
}
```

> **Note:** GameObjects get their `update(dt)` called automatically by the pipeline each frame.

## Creating Custom GameObjects with Shapes

The most common pattern is to create a custom GameObject that owns and renders Shape instances:

```javascript
import { Game, GameObject, Rectangle, Scene } from "gcanvas";

/**
 * Custom GameObject that owns a Shape
 */
class PlaceholderBox extends GameObject {
  constructor(game) {
    // ⚠️ IMPORTANT: Pass width/height for hit testing to work!
    super(game, { width: 100, height: 100 });

    // Create the shape (this is just data - not in the pipeline)
    this.shape = new Rectangle({
      width: 100,
      height: 100,
      color: "#4CAF50",
      stroke: "#fff",
      lineWidth: 2,
    });

    // Enable interactivity
    this.interactive = true;
    
    // Listen for events
    this.on('inputdown', (e) => {
      console.log("Box clicked!");
    });
  }

  /**
   * Update logic (called every frame by pipeline)
   */
  update(dt) {
    super.update(dt);
    // Add game logic here (movement, animation, etc.)
  }

  /**
   * Render the shape
   * ⚠️ IMPORTANT: Use shape.render(), NOT shape.draw()!
   */
  render() {
    super.render();  // GameObject's render (handles transform context)
    this.shape.render();  // ✅ Shape's render (handles visibility/opacity/transforms)
  }
}

class MyGame extends Game {
  init() {
    super.init();
    
    const scene = new Scene(this);
    scene.x = this.width / 2;
    scene.y = this.height / 2;
    
    // Add custom GameObject to scene
    const box = new PlaceholderBox(this);
    scene.add(box);
    
    this.pipeline.add(scene);
  }
}
```

### Why `shape.render()` and not `shape.draw()`?

Shapes have two methods:

| Method | Purpose | When to Use |
|--------|---------|-------------|
| `render()` | Public API - handles visibility, opacity, transforms, then calls `draw()` | ✅ Always use this |
| `draw()` | Internal - the actual drawing logic | ❌ Never call directly |

**Correct:**
```javascript
render() {
  super.render();
  this.shape.render();  // ✅ Handles all transform/visibility logic
}
```

**Wrong:**
```javascript
render() {
  super.render();
  this.shape.draw();  // ❌ Skips visibility/opacity/transform setup!
}
```

### Why pass `width` and `height` to GameObject?

GameObject needs dimensions for **hit testing** (click/hover detection). Without it, your interactive events won't fire:

```javascript
// ❌ WRONG - Events won't work!
constructor(game) {
  super(game);  // No width/height!
  this.interactive = true;
  this.on('inputdown', () => console.log('Never fires!'));
}

// ✅ CORRECT - Events work!
constructor(game) {
  super(game, { width: 100, height: 100 });  // Defines hit area
  this.interactive = true;
  this.on('inputdown', () => console.log('Works!'));
}
```

## Bridging: Shape to GameObject

Sometimes you have a Shape (or Group of shapes) that you want to add to the pipeline. Use `ShapeGOFactory`:

```javascript
import { Game, Group, Circle, Rectangle, ShapeGOFactory } from "gcanvas";

class MyGame extends Game {
  init() {
    super.init();

    // Create a Group of shapes
    const avatar = new Group();
    avatar.add(new Circle(30, { color: "#0f0" }));           // head
    avatar.add(new Rectangle({ y: 50, width: 40, height: 60, color: "#0f0" })); // body

    // Wrap it as a GameObject so it can join the pipeline
    const avatarGO = ShapeGOFactory.create(this, avatar, {
      x: 100,
      y: 100,
      interactive: true  // enables click/hover events
    });

    // Now it's a proper GameObject
    this.pipeline.add(avatarGO);
  }
}
```

> **Important:** Never put GameObjects inside Groups. Group is a Shape container - it won't call `update()` on its children. Always use Scene for GameObjects.

## Quick Reference

| Class | Type | Container | Has update()? |
|-------|------|-----------|---------------|
| `Circle`, `Rectangle`, etc. | Shape | Group | No |
| `Group` | Shape container | Group | No |
| `TextShape` | Shape | Group | No |
| `GameObject` | Base GO | Scene / Pipeline | Yes |
| `Scene` | GO container | Scene / Pipeline | Yes |
| `Sprite` | Animated GO | Scene / Pipeline | Yes |
| `Text` | Text GO | Scene / Pipeline | Yes |

## 3D Extensions: Scene3D and Camera3D

The 3D system extends the **GameObject hierarchy**, not the Shape hierarchy. This is important to understand:

```
GameObject Hierarchy (Pipeline)
│
├── Scene ───────────────── 2D container
│   └── Scene3D ─────────── 3D projection container (extends Scene)
│
├── LayoutScene ─────────── Auto-layout container
│   ├── HorizontalLayout
│   ├── VerticalLayout
│   ├── TileLayout
│   └── GridLayout
```

### Why Scene3D Extends Scene (Not Group)

Scene3D is a **GameObject container** that:
- Has `update(dt)` lifecycle (needed to update camera)
- Contains GameObjects with `z` coordinates
- Projects children through Camera3D automatically
- Depth-sorts children for correct rendering

```javascript
import { Game, Scene3D, Camera3D, GameObject, Rectangle } from "gcanvas";

class Box3D extends GameObject {
  constructor(game) {
    super(game);
    this.z = 0;  // 3D coordinate - works because Scene3D handles it
    this.shape = new Rectangle({ width: 60, height: 60, color: "#4a9eff" });
  }

  render() {
    this.shape.render();
  }
}

class My3DDemo extends Game {
  init() {
    super.init();

    this.camera = new Camera3D({ perspective: 800 });

    // Scene3D must be centered for 3D origin to appear at screen center
    this.scene3d = new Scene3D(this, {
      x: this.width / 2,
      y: this.height / 2,
      camera: this.camera,
      depthSort: true,
    });

    // Add GameObjects with z coordinates
    const front = new Box3D(this);
    front.z = 100;   // In front

    const back = new Box3D(this);
    back.z = -100;   // Behind

    this.scene3d.add(front);
    this.scene3d.add(back);
    this.pipeline.add(this.scene3d);
  }
}
```

### Shapes in 3D Context

Shapes themselves don't have `z` - they're 2D primitives. The 3D projection happens at the **GameObject level**:

```javascript
// ❌ Shapes don't have z coordinates
const circle = new Circle(50, { x: 100, y: 100, z: 50 }); // z is ignored!

// ✅ GameObjects in Scene3D have z coordinates
class MyObject extends GameObject {
  constructor(game) {
    super(game);
    this.z = 50;  // This works in Scene3D
    this.shape = new Circle(50, { color: "#0f0" });
  }
}
```

### Camera3D Projection Summary

| Component | Type | Purpose |
|-----------|------|---------|
| `Camera3D` | Utility | Projects 3D → 2D, handles rotation |
| `Scene3D` | GameObject | Container that applies Camera3D to children |
| `Sphere3D`, `Cube3D`, etc. | Shape | 3D-looking shapes (use their own projection) |

**Key insight:** `Sphere3D` and `Cube3D` are Shapes that internally use Camera3D for their own faces. They can work standalone or inside Scene3D for additional transformations.

## Layout Scenes

Layout scenes are specialized **Scene** subclasses for automatic positioning:

```javascript
import { HorizontalLayout, VerticalLayout, Rectangle, ShapeGOFactory } from "gcanvas";

// Create layout (extends Scene)
const toolbar = new HorizontalLayout(this, {
  anchor: Position.TOP_CENTER,
  spacing: 10,
  padding: 10,
});

// Add GameObjects (not Shapes directly!)
const buttonShape = new Rectangle({ width: 80, height: 40, color: "#4CAF50" });
const buttonGO = ShapeGOFactory.create(this, buttonShape);
toolbar.add(buttonGO);

this.pipeline.add(toolbar);
```

Layout scenes automatically:
- Position children in sequence (horizontal, vertical, tile, grid)
- Handle scrolling when content exceeds viewport
- Maintain proper GameObject lifecycle

## Complete Hierarchy Reference

```
                    SHAPES (Drawing)                    GAMEOBJECTS (Pipeline)
                    ─────────────────                   ──────────────────────

                    Euclidian                           GameObject
                        │                                   │
                    Geometry2d                         ┌────┴────┬────────┐
                        │                              │         │        │
                    Renderable                       Scene    Sprite    Text
                        │                              │
                    Transformable                 ┌────┴────┐
                        │                         │         │
                      Shape                   Scene3D   LayoutScene
                        │                                   │
           ┌────────────┼────────────┐              ┌──────┼──────┐
           │            │            │              │      │      │
        Circle     Rectangle      Star      Horizontal  Vertical  Tile
           │            │            │        Layout    Layout   Layout
        Group      TextShape     Polygon
    (container)
```

**Key rules:**
- Shapes go in `Group`
- GameObjects go in `Scene` (or Scene3D, LayoutScene)
- Never mix: don't put GameObjects in Group, don't expect Shapes to have `update()`

## TL;DR

**Just Drawing?**
- Use `Shape`, `Group`
- Call `.render()` yourself
- No Game class needed

**Building a Game?**
- Use `GameObject`, `Scene`, `Sprite`
- Add to `pipeline`
- Extend `Game` class

**Need 3D?**
- Use `Scene3D` with `Camera3D`
- Add `z` property to GameObjects
- Shapes render in 2D; projection happens at GameObject level

**Need Layouts?**
- Use `HorizontalLayout`, `VerticalLayout`, `TileLayout`, or `GridLayout`
- Wrap Shapes with `ShapeGOFactory.create()` to add to layouts
- Layouts are Scenes with automatic positioning

## See Also

- [Coordinate System](./coordinate-system.md) - How positioning works (center-based, parent-child, Camera3D)
- [Rendering Pipeline](./rendering-pipeline.md) - Deep dive into the Shape hierarchy
- [Architecture Overview](./architecture-overview.md) - High-level system design
- [Lifecycle](./lifecycle.md) - GameObject lifecycle details

### Module References

- [Camera3D Module](../modules/util/camera3d.md) - Full Camera3D API reference
- [Scene3D Module](../modules/util/scene3d.md) - Scene3D API and usage patterns
- [Shapes Module](../modules/shapes/README.md) - All shape primitives
- [Game Module](../modules/game/README.md) - Game, Scene, Pipeline reference

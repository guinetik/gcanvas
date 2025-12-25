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

## TL;DR

**Just Drawing?**
- Use `Shape`, `Group`
- Call `.render()` yourself
- No Game class needed

**Building a Game?**
- Use `GameObject`, `Scene`, `Sprite`
- Add to `pipeline`
- Extend `Game` class

## See Also

- [Coordinate System](./coordinate-system.md) - How positioning works (center-based, parent-child, Camera3D)
- [Rendering Pipeline](./rendering-pipeline.md) - Deep dive into the Shape hierarchy
- [Architecture Overview](./architecture-overview.md) - High-level system design
- [Lifecycle](./lifecycle.md) - GameObject lifecycle details

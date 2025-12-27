# Game Lifecycle

> Understanding the update/render cycle and frame timing.

## Overview

The Game class manages the core game loop using `requestAnimationFrame`. It provides a fixed-timestep update cycle with automatic delta time calculation, ensuring consistent gameplay regardless of frame rate.

## The Game Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                         Game Loop                                │
│                                                                  │
│   game.start()                                                  │
│       │                                                          │
│       ▼                                                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  requestAnimationFrame                   │   │
│   │                          │                               │   │
│   │                          ▼                               │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                   loop(timestamp)                │   │   │
│   │   │                                                  │   │   │
│   │   │   1. Calculate elapsed time                      │   │   │
│   │   │      elapsed = timestamp - lastTime              │   │   │
│   │   │                                                  │   │   │
│   │   │   2. Accumulate time                            │   │   │
│   │   │      accumulator += elapsed                      │   │   │
│   │   │                                                  │   │   │
│   │   │   3. While accumulator >= frameInterval:         │   │   │
│   │   │      │                                           │   │   │
│   │   │      ├─► update(dt)                             │   │   │
│   │   │      │      │                                    │   │   │
│   │   │      │      ├─► Pipeline.update(dt)             │   │   │
│   │   │      │      │      └─► GameObject.update(dt)    │   │   │
│   │   │      │      │                                    │   │   │
│   │   │      │      └─► Tweenetik.updateAll(dt)         │   │   │
│   │   │      │                                           │   │   │
│   │   │      └─► accumulator -= frameInterval            │   │   │
│   │   │                                                  │   │   │
│   │   │   4. render()                                    │   │   │
│   │   │      │                                           │   │   │
│   │   │      ├─► Painter.clear()                        │   │   │
│   │   │      │                                           │   │   │
│   │   │      └─► Pipeline.render()                      │   │   │
│   │   │             └─► GameObject.render()             │   │   │
│   │   │                    └─► Shape.draw()             │   │   │
│   │   │                                                  │   │   │
│   │   │   5. requestAnimationFrame(loop)                │   │   │
│   │   │                                                  │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                          │                               │   │
│   │                          └───────────────────────────────┼───┘
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Fixed Timestep

GCanvas uses a **fixed timestep** pattern. This means:

- Updates happen at a consistent rate (default: 60 FPS)
- `dt` (delta time) is always the same value
- Game logic is frame-rate independent

```js
// Default: 60 FPS = 16.67ms per frame
game.setFPS(60);

// dt in update() is always 1/60 = 0.01667 seconds
update(dt) {
  // Move 200 pixels per second, regardless of actual frame rate
  this.x += 200 * dt;
}
```

## Lifecycle Methods

### Game Lifecycle

```js
class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    // 1. Constructor: Setup canvas, context, pipeline
  }

  init() {
    super.init();
    // 2. Init: Create scenes, objects, set up game state
    // Called once before start()
  }

  update(dt) {
    super.update(dt);
    // 3. Update: Game logic (called every frame)
    // dt = time since last update in seconds
  }

  render() {
    super.render();
    // 4. Render: Drawing (called every frame after update)
  }
}

const game = new MyGame(canvas);
game.start();  // Calls init() then starts the loop
```

### GameObject Lifecycle

```js
class Player extends GameObject {
  constructor(game) {
    super(game);
    // 1. Constructor: Create shapes, set initial state
  }

  update(dt) {
    // 2. Update: Movement, physics, game logic
    // Called every frame while active
  }

  render() {
    // 3. Render: Draw the object
    // Called every frame while visible
  }

  destroy() {
    super.destroy();
    // 4. Destroy: Cleanup when removed
  }
}
```

## Delta Time (dt)

The `dt` parameter represents time elapsed since the last update, in **seconds**.

```js
update(dt) {
  // dt ≈ 0.01667 at 60 FPS
  // dt ≈ 0.03333 at 30 FPS

  // Movement: pixels per second
  this.x += this.speed * dt;  // speed = 200 means 200 px/sec

  // Rotation: radians per second
  this.rotation += Math.PI * dt;  // Half rotation per second

  // Timers
  this.timer += dt;
  if (this.timer >= 2.0) {  // 2 seconds
    this.doSomething();
    this.timer = 0;
  }
}
```

## Frame Rate Control

```js
// Set target FPS
game.setFPS(60);   // Default
game.setFPS(30);   // Lower for mobile/performance

// Current frame number
console.log(game.frame);

// Pause on blur (tab switch)
game.enablePauseOnBlur(true);
```

## Pipeline Execution Order

The Pipeline manages multiple objects and ensures proper execution order:

```
Pipeline.update(dt)
├─► Filter active objects
├─► Sort by zIndex
├─► For each object:
│   └─► object.update(dt)
└─► Tweenetik.updateAll(dt)

Pipeline.render()
├─► Filter visible objects
├─► Sort by zIndex (low to high)
└─► For each object:
    └─► object.render()
```

## Scenes and Hierarchy

Scenes create nested lifecycles:

```js
// Scene contains GameObjects
const scene = new Scene(game);
scene.add(player);
scene.add(enemy);
game.pipeline.add(scene);

// Lifecycle flows through hierarchy:
// Pipeline.update()
//   └─► Scene.update()
//       ├─► player.update()
//       └─► enemy.update()
```

## State Management

```js
class MyGame extends Game {
  init() {
    this.state = 'menu';  // menu, playing, paused, gameover
  }

  update(dt) {
    switch (this.state) {
      case 'menu':
        this.menuScene.update(dt);
        break;
      case 'playing':
        this.gameScene.update(dt);
        break;
      case 'paused':
        // Don't update game objects
        break;
    }
  }
}
```

## Performance Tips

1. **Use `active` flag** - Set `gameObject.active = false` to skip updates
2. **Use `visible` flag** - Set `shape.visible = false` to skip rendering
3. **Pool objects** - Reuse objects instead of creating/destroying
4. **Batch similar operations** - Group shapes in containers
5. **Profile with DevTools** - Use browser performance tools

## Related

- [Architecture Overview](./architecture-overview.md) - Full system architecture
- [Two-Layer Architecture](./two-layer-architecture.md) - Shape vs Game layer
- [Rendering Pipeline](./rendering-pipeline.md) - Shape inheritance chain

## See Also

- [Game Module](../modules/game/README.md)
- [Pipeline](../modules/game/pipeline.md)
- [GameObject](../modules/game/gameobject.md)

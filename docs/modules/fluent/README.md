# Fluent Module

> Declarative, chainable API for rapid game development.

## Overview

The Fluent module provides a builder-pattern API layer on top of GCanvas's object-oriented architecture. Instead of manually instantiating classes and wiring them together, you chain method calls to declaratively build your game structure.

### Traditional API vs Fluent API

**Traditional approach:**
```js
import { Game, Scene, GameObject, Circle } from 'gcanvas';

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.init();
game.backgroundColor = 'black';

const scene = new Scene(game);
scene.name = 'game';
game.pipeline.add(scene);

const player = new GameObject({ x: 400, y: 300 });
player.game = game;
const circle = new Circle(30, { color: 'lime' });
player.setRenderable(circle);
scene.add(player);

game.start();
```

**Fluent approach:**
```js
import { gcanvas } from 'gcanvas';

gcanvas({ bg: 'black' })
  .scene('game')
    .go({ x: 400, y: 300, name: 'player' })
      .circle({ radius: 30, fill: 'lime' })
  .start();
```

### Two Entry Points

| Entry Point | Purpose | Best For |
|-------------|---------|----------|
| `gcanvas(options)` | Full game development API | Games, interactive apps, complex scenes |
| `sketch(w, h, bg)` | Minimal creative coding API | Quick prototypes, generative art, Genuary-style sketches |

---

## Quick Start

```js
import { gcanvas } from 'gcanvas';

// Create a game with a pulsing circle
gcanvas({ bg: '#1a1a2e' })
  .scene('game')
    .go({ x: 400, y: 300 })
      .circle({ radius: 40, fill: '#00ff88' })
      .pulse({ min: 0.8, max: 1.2, duration: 1 })
  .start();
```

---

## Entry Points

### gcanvas(options)

The main entry point for the full fluent API.

```js
import { gcanvas } from 'gcanvas';

const game = gcanvas({
  canvas: document.getElementById('game'),  // Optional: use existing canvas
  width: 800,                               // Canvas width (default: 800)
  height: 600,                              // Canvas height (default: 600)
  bg: 'black',                              // Background color
  fluid: true,                              // Enable responsive sizing (default: true)
  fps: 60,                                  // Target FPS (default: 60)
  container: document.body,                 // Container for auto-created canvas
  pixelRatio: window.devicePixelRatio       // Pixel ratio for HiDPI
});
```

**Returns:** `FluentGame` instance

### sketch(w, h, bg)

Ultra-simple mode for quick creative coding prototypes.

```js
import { sketch } from 'gcanvas';

sketch(800, 600, '#1a1a1a')
  .circle(400, 300, 50, 'lime')
  .update((dt, ctx) => {
    ctx.shapes[0].x += Math.sin(ctx.time) * 2;
  })
  .start();
```

**Parameters:**
- `w` - Canvas width (default: 800)
- `h` - Canvas height (default: 600)
- `bg` - Background color (default: 'black')

**Returns:** `SketchAPI` object

---

## Builder Chain Architecture

The fluent API uses a chain of builder classes that wrap the underlying GCanvas classes:

```
FluentGame ─────────── Wraps Game
    │
    └── FluentScene ──── Wraps Scene
            │
            └── FluentGO ─── Wraps GameObject
                    │
                    └── FluentGO (children)
```

### Navigation

Each builder provides methods to navigate the chain:

```js
gcanvas({ bg: 'black' })
  .scene('game')           // → FluentScene
    .go({ x: 100, y: 100 }) // → FluentGO
      .circle({ radius: 20 })
      .end()               // ← Back to FluentScene
    .go({ x: 200, y: 100 }) // → Another FluentGO
      .rect({ width: 40, height: 40 })
  .scene('ui')             // → New FluentScene (auto-navigates up)
    .go({ x: 20, y: 20 })
      .text('Score: 0')
  .start();                // Start the game
```

### Shared Context

All builders share access to:
- **refs** - Named object references (objects with `name` property)
- **state** - Shared state object for game data

---

## FluentGame API

The root builder class wrapping the `Game` instance.

### Scene Management

#### .scene(name, options)

Create or switch to a scene.

```js
// Basic scene creation
.scene('game')

// With options
.scene('game', {
  zIndex: 0,           // Render order
  active: true,        // Visibility
  onEnter: (ctx) => {},  // Called when scene becomes visible
  onExit: (ctx) => {}    // Called when scene hides
})

// With custom Scene class
.scene('game', MyCustomScene)
.scene('game', MyCustomScene, { zIndex: 0 })
```

**Signatures:**
- `scene(name)` - Create/switch to named scene
- `scene(name, options)` - Create with options
- `scene(name, CustomSceneClass)` - Custom class
- `scene(name, CustomSceneClass, options)` - Custom class with options
- `scene(CustomSceneClass)` - Custom class, name from class name
- `scene(CustomSceneClass, options)` - Custom class with options

#### .inScene(name)

Switch to an existing scene without creating it. Throws if scene doesn't exist.

```js
.scene('game')
  .go({ name: 'player' })
    .circle({ radius: 20 })
.scene('ui')
  .go({ name: 'score' })
    .text('0')
// Later, switch back without recreating
.inScene('game')
  .go({ name: 'enemy' })
    .rect({ width: 30, height: 30 })
```

#### .go(options)

Shortcut to create a GameObject in the current scene.

```js
gcanvas({ bg: 'black' })
  .go({ x: 400, y: 300 })  // Creates 'default' scene automatically
    .circle({ radius: 30 })
  .start();
```

### Scene Visibility

#### .showScene(name)

Show a scene and trigger its `onEnter` callback.

#### .hideScene(name)

Hide a scene and trigger its `onExit` callback.

#### .transition(from, to, options)

Transition between scenes.

```js
.transition('menu', 'game', {
  fade: 0.5,              // Fade duration in seconds
  onComplete: () => {}    // Completion callback
})
```

### State Management

#### .state(initialState)

Set initial state values.

```js
gcanvas({ bg: 'black' })
  .state({ score: 0, lives: 3, level: 1 })
  .scene('game')
    // ...
```

#### .getState(key)

Get a state value.

```js
const score = game.getState('score');
```

#### .setState(key, value)

Set a state value.

```js
game.setState('score', game.getState('score') + 100);
```

### Events & Lifecycle

#### .on(event, handler)

Register event handlers.

```js
// Update loop
.on('update', (dt, ctx) => {
  // Called every frame
  // dt = delta time, ctx = context object
})

// Keyboard events with key filtering
.on('keydown:space', (ctx, event) => {
  ctx.refs.player.jump();
})

.on('keydown:escape', (ctx) => {
  ctx.showScene('pause');
})

// Raw events
.on('click', (ctx, event) => {
  console.log('Clicked at', event.x, event.y);
})

.on('keydown', (ctx, event) => {
  console.log('Key pressed:', event.key);
})
```

**Event handler context object:**
```js
{
  refs,           // Named object references
  state,          // Shared state object
  scenes,         // All scenes (as object)
  game,           // Underlying Game instance
  width,          // Canvas width
  height,         // Canvas height
  showScene,      // Helper function
  hideScene,      // Helper function
  transition      // Helper function
}
```

### Plugins & Extensions

#### .use(plugin)

Use a plugin or composable scene builder function.

```js
// Plugin function
const playerModule = (g) => g
  .inScene('game')
    .go({ x: 400, y: 300, name: 'player' })
      .circle({ radius: 25, fill: 'lime' });

// Usage
gcanvas({ bg: 'black' })
  .scene('game')
  .use(playerModule)
  .start();
```

### Lifecycle

#### .start()

Start the game loop.

#### .stop()

Stop the game loop.

#### .restart()

Restart the game.

### Accessors

| Property | Type | Description |
|----------|------|-------------|
| `.game` | `Game` | Underlying Game instance |
| `.refs` | `Object` | Named object references |
| `.scenes` | `Map<string, Scene>` | All scenes |
| `.canvas` | `HTMLCanvasElement` | Canvas element |
| `.width` | `number` | Canvas width |
| `.height` | `number` | Canvas height |

---

## FluentScene API

Builder for scene operations.

### GameObject Creation

#### .go(options)

Create a GameObject in this scene.

```js
.scene('game')
  .go({ x: 100, y: 100, name: 'player', visible: true })
    .circle({ radius: 20 })
```

**Options:**
- `x`, `y` - Position (default: 0, 0)
- `name` - Name for refs lookup
- `visible` - Initial visibility (default: true)
- Any custom properties passed to GameObject

**Signatures:**
- `go()` - Plain GameObject at origin
- `go(options)` - Plain GameObject with options
- `go(CustomClass)` - Custom GameObject class
- `go(CustomClass, options)` - Custom class with options
- `go(options, builderFn)` - With builder callback
- `go(CustomClass, options, builderFn)` - Custom class with builder

#### .group(name, builderFn)

Create multiple GOs with a builder function.

```js
.scene('game')
  .group('enemies', (api) => {
    for (let i = 0; i < 5; i++) {
      api.go({ x: 100 + i * 80, y: 100 })
        .rect({ width: 30, height: 30, fill: 'red' });
    }
  })
```

### Layer Management

#### .layer(name, zIndex)

Create a z-indexed layer within the scene.

```js
.scene('game')
  .layer('background', -10)
    .go({ x: 400, y: 300 })
      .rect({ width: 800, height: 600, fill: '#333' })
    .endLayer()
  .layer('foreground', 10)
    .go({ x: 400, y: 300 })
      .circle({ radius: 30, fill: 'lime' })
```

### Lifecycle Hooks

#### .onEnter(handler)

Register scene enter callback.

```js
.scene('game', {
  onEnter: (ctx) => console.log('Entered game scene')
})
// Or
.scene('game')
  .onEnter((ctx) => console.log('Entered game scene'))
```

#### .onExit(handler)

Register scene exit callback.

### Navigation

| Method | Returns | Description |
|--------|---------|-------------|
| `.scene(name, opts)` | `FluentScene` | Switch to another scene |
| `.end()` | `FluentGame` | Return to game context |
| `.start()` | `FluentGame` | Start the game |
| `.stop()` | `FluentGame` | Stop the game |
| `.on(event, handler)` | `FluentGame` | Register event (delegates to game) |
| `.use(plugin)` | `FluentGame` | Use plugin (delegates to game) |
| `.state(obj)` | `FluentGame` | Set state (delegates to game) |

### Accessors

| Property | Type | Description |
|----------|------|-------------|
| `.sceneInstance` | `Scene` | Underlying Scene instance |
| `.refs` | `Object` | Named object references |
| `.state` | `Object` | Shared state |
| `.parent` | `FluentGame` | Parent FluentGame |

---

## FluentGO API

Builder for GameObject operations.

### Shape Methods

All shape methods accept an options object and return `FluentGO` for chaining.

#### Basic Shapes

```js
.circle({ radius: 30, fill: 'red', stroke: 'white', lineWidth: 2 })
.rect({ width: 100, height: 50, fill: 'blue' })
.roundRect({ width: 100, height: 50, radius: 10, fill: 'blue' })
.square({ size: 50, fill: 'green' })
.triangle({ size: 40, fill: 'yellow' })
.line({ x2: 100, y2: 50, stroke: 'white', lineWidth: 2 })
```

#### Complex Shapes

```js
.star({ points: 5, radius: 30, innerRadius: 15, fill: 'gold' })
.hexagon({ radius: 25, fill: 'purple' })
.diamond({ width: 40, height: 60, fill: 'cyan' })
.heart({ size: 30, fill: 'red' })
.arc({ radius: 40, startAngle: 0, endAngle: Math.PI, fill: 'orange' })
.ring({ innerRadius: 20, outerRadius: 40, fill: 'teal' })
.arrow({ width: 60, height: 20, fill: 'white' })
.cross({ size: 30, thickness: 8, fill: 'red' })
.pin({ radius: 15, fill: 'red' })
.cloud({ width: 80, height: 40, fill: 'white' })
.poly({ points: [[0,-30], [30,30], [-30,30]], fill: 'lime' })
```

#### Special Shapes

```js
.text('Hello World', { font: '24px monospace', fill: 'white' })
.image('/path/to/image.png', { width: 64, height: 64 })
.svg('M10 10 L90 10 L50 90 Z', { fill: 'red', scale: 0.5 })
```

#### Generic Shape

```js
.add(CustomShapeClass, { /* options */ })
```

**Common shape options:**
- `fill` - Fill color (alias for `color`)
- `stroke` - Stroke color
- `lineWidth` - Stroke width
- `opacity` - Shape opacity (0-1)

### Motion Methods

Built-in motion presets that animate the GameObject.

#### .oscillate(opts)

Oscillate a property between min and max values.

```js
.oscillate({
  prop: 'y',        // Property to animate (default: 'y')
  min: -50,         // Minimum offset (default: -50)
  max: 50,          // Maximum offset (default: 50)
  duration: 2       // Duration in seconds (default: 2)
})
```

#### .pulse(opts)

Pulse scale between min and max.

```js
.pulse({
  prop: 'scale',    // Property (default: 'scale')
  min: 0.8,         // Minimum value (default: 0.8)
  max: 1.2,         // Maximum value (default: 1.2)
  duration: 1       // Duration (default: 1)
})
```

#### .orbit(opts)

Orbit around a center point.

```js
.orbit({
  centerX: 400,     // Orbit center X (default: base position)
  centerY: 300,     // Orbit center Y
  radiusX: 100,     // X radius (default: 100)
  radiusY: 100,     // Y radius (default: 100)
  duration: 3,      // Orbit period (default: 3)
  clockwise: true   // Direction (default: true)
})
```

#### .float(opts)

Random wandering motion.

```js
.float({
  radius: 20,       // Float radius (default: 20)
  speed: 0.5,       // Float speed (default: 0.5)
  randomness: 0.3,  // Randomness factor (default: 0.3)
  duration: 5       // Duration (default: 5)
})
```

#### .shake(opts)

Shake effect.

```js
.shake({
  intensity: 5,     // Shake intensity (default: 5)
  frequency: 20,    // Shake frequency (default: 20)
  decay: 0.9,       // Decay factor (default: 0.9)
  duration: 0.5     // Duration (default: 0.5)
})
```

#### .bounce(opts)

Bouncing motion.

```js
.bounce({
  height: 100,      // Bounce height (default: 100)
  bounces: 3,       // Number of bounces (default: 3)
  duration: 2       // Duration (default: 2)
})
```

#### .spring(opts)

Spring physics motion.

#### .spiral(opts)

Spiral outward or inward.

```js
.spiral({
  startRadius: 50,  // Starting radius (default: 50)
  endRadius: 150,   // Ending radius (default: 150)
  revolutions: 3,   // Number of revolutions (default: 3)
  duration: 4       // Duration (default: 4)
})
```

#### .pendulum(opts)

Pendulum swing motion.

```js
.pendulum({
  amplitude: 45,    // Swing amplitude in degrees (default: 45)
  duration: 2,      // Period (default: 2)
  damped: false     // Apply damping (default: false)
})
```

#### .waypoint(opts)

Move between waypoints.

```js
.waypoint({
  waypoints: [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 300 },
    { x: 100, y: 300 }
  ],
  speed: 100,       // Movement speed (default: 100)
  waitTime: 0       // Wait time at each point (default: 0)
})
```

#### .motion(type, opts)

Generic motion by type name.

```js
.motion('oscillate', { prop: 'x', min: -30, max: 30 })
```

### Tween

#### .tween(props, opts)

Tween properties over time.

```js
.tween({ x: 500, y: 400, opacity: 0.5 }, {
  duration: 1,              // Duration in seconds (default: 1)
  easing: 'easeOutQuad',    // Easing function (default: 'easeOutQuad')
  delay: 0,                 // Delay before starting (default: 0)
  onComplete: () => {}      // Completion callback
})
```

### Transform Shortcuts

```js
.pos(x, y)              // Set position
.scale(sx, sy)          // Set scale (sy defaults to sx)
.rotate(degrees)        // Set rotation in degrees
.opacity(value)         // Set opacity (0-1)
.zIndex(value)          // Set z-index
```

### Child GameObjects

#### .child(opts, builderFn)

Create a child GameObject.

```js
.go({ x: 400, y: 300, name: 'parent' })
  .circle({ radius: 50, fill: 'blue' })
  .child({ x: 30, y: 0 })  // Position relative to parent
    .circle({ radius: 10, fill: 'red' })
  .end()  // Back to parent
```

**Signatures:**
- `child()` - Plain child GO
- `child(options)` - Plain child with options
- `child(CustomClass)` - Custom child class
- `child(CustomClass, options)` - Custom class with options
- `child(options, builderFn)` - With builder callback
- `child(CustomClass, options, builderFn)` - Custom class with builder

### Events

#### .on(event, handler)

Register event handler on this GO.

```js
.go({ x: 400, y: 300 })
  .circle({ radius: 30 })
  .on('click', (ctx, event) => {
    console.log('Clicked!', ctx.go);
  })
```

#### .update(fn)

Custom update function for this GO.

```js
.go({ x: 400, y: 300 })
  .circle({ radius: 30 })
  .update((dt, ctx) => {
    ctx.go.rotation += dt * 2;
  })
```

**Update context:**
```js
{
  go,       // This GameObject
  shapes,   // Shapes added to this GO
  refs,     // Named object references
  state     // Shared state
}
```

### Navigation

| Method | Returns | Description |
|--------|---------|-------------|
| `.end()` | Parent context | Navigate back to parent |
| `.go(opts)` | `FluentGO` | Create sibling GO |
| `.scene(name, opts)` | `FluentScene` | Switch to scene |
| `.start()` | `FluentGame` | Start the game |

### Accessors

| Property | Type | Description |
|----------|------|-------------|
| `.goInstance` | `GameObject` | Underlying GameObject |
| `.shapes` | `Array` | Shapes added to this GO |
| `.refs` | `Object` | Named object references |
| `.state` | `Object` | Shared state |

---

## FluentLayer API

Builder for z-indexed layers within a scene.

### Methods

```js
.layer('foreground', 10)
  .go({ x: 100, y: 100 })
    .circle({ radius: 20 })
  .visible(true)          // Set layer visibility
  .opacity(0.8)           // Set layer opacity
  .endLayer()             // Return to scene
```

| Method | Returns | Description |
|--------|---------|-------------|
| `.go(opts, builderFn)` | `FluentGO` or `FluentLayer` | Create GO in layer |
| `.visible(bool)` | `FluentLayer` | Set layer visibility |
| `.opacity(value)` | `FluentLayer` | Set layer opacity |
| `.endLayer()` | `FluentScene` | Return to scene |
| `.end()` | `FluentScene` | Return to scene |
| `.scene(name, opts)` | `FluentScene` | Switch to scene |
| `.start()` | `FluentGame` | Start the game |

---

## Sketch Mode API

Ultra-simple API for quick creative coding.

### Shapes

All shape methods take positional arguments and return the sketch API for chaining.

```js
sketch(800, 600, 'black')
  .circle(x, y, radius, fill)
  .rect(x, y, width, height, fill)
  .square(x, y, size, fill)
  .star(x, y, points, radius, fill)
  .triangle(x, y, size, fill)
  .hexagon(x, y, radius, fill)
  .line(x1, y1, x2, y2, stroke, lineWidth)
  .ring(x, y, innerRadius, outerRadius, fill)
  .text(content, x, y, { fill, font })
```

### Bulk Creation

#### .grid(cols, rows, spacing, fn)

Create a grid of shapes.

```js
sketch(800, 600, 'black')
  .grid(10, 10, 80, (api, x, y, col, row) => {
    api.circle(x, y, 20, `hsl(${(col + row) * 20}, 70%, 60%)`);
  })
  .start();
```

#### .repeat(count, fn)

Repeat shape creation.

```js
sketch(800, 600, 'black')
  .repeat(20, (api, i, total) => {
    const angle = (i / total) * Math.PI * 2;
    const x = 400 + Math.cos(angle) * 200;
    const y = 300 + Math.sin(angle) * 200;
    api.circle(x, y, 15, `hsl(${i * 18}, 70%, 60%)`);
  })
  .start();
```

#### .radial(cx, cy, radius, count, fn)

Create shapes in a circular pattern.

```js
sketch(800, 600, 'black')
  .radial(400, 300, 150, 12, (api, x, y, angle, i) => {
    api.star(x, y, 5, 20, `hsl(${i * 30}, 70%, 60%)`);
  })
  .start();
```

### Lifecycle

#### .setup(fn)

Register a setup function called once before start.

```js
.setup((api) => {
  // Initialize shapes
})
```

#### .update(fn)

Register an update function called every frame.

```js
.update((dt, ctx) => {
  // ctx.shapes - array of GameObjects
  // ctx.time - elapsed time in seconds
  // ctx.frame - current frame number
  // ctx.width, ctx.height - canvas dimensions
  // ctx.mouse.x, ctx.mouse.y - mouse position
  // ctx.refs - named objects
  // ctx.game - Game instance
})
```

#### .start()

Start the sketch.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `.width` | `number` | Canvas width |
| `.height` | `number` | Canvas height |
| `.game` | `FluentGame` | Underlying FluentGame (after start) |

---

## Advanced Patterns

### Class Injection

Use custom Scene or GameObject classes with the fluent API.

```js
// Custom Scene class
class GameScene extends Scene {
  init() {
    this.spawnTimer = 0;
  }

  update(dt) {
    super.update(dt);
    this.spawnTimer += dt;
    if (this.spawnTimer > 1) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }
  }

  spawnEnemy() { /* ... */ }
}

// Custom GameObject class
class Player extends GameObject {
  constructor(opts) {
    super(opts);
    this.speed = 200;
    this.health = 100;
  }

  update(dt) {
    super.update(dt);
    // Custom update logic
  }
}

// Usage
gcanvas({ bg: 'black' })
  .scene('game', GameScene)
  .go(Player, { x: 400, y: 500, name: 'player' })
    .circle({ radius: 25, fill: 'lime' })
  .start();
```

### Composable Scene Modules

Create reusable scene builder functions.

```js
// scenes/player.js
export const playerModule = (g) => g
  .inScene('game')
    .go({ x: 400, y: 500, name: 'player' })
      .circle({ radius: 25, fill: '#00ff88' })
      .on('update', (ctx) => {
        // Player update logic
      });

// scenes/enemies.js
export const enemiesModule = (g) => g
  .inScene('game')
    .group('enemies', (api) => {
      for (let i = 0; i < 5; i++) {
        api.go({ x: 100 + i * 150, y: 100, name: `enemy_${i}` })
          .rect({ width: 40, height: 40, fill: 'red' });
      }
    });

// scenes/ui.js
export const uiModule = (g) => g
  .scene('ui', { zIndex: 100 })
    .go({ x: 20, y: 20, name: 'scoreText' })
      .text('SCORE: 0', { font: '20px monospace', fill: 'white' });

// main.js
import { gcanvas } from 'gcanvas';
import { playerModule } from './scenes/player';
import { enemiesModule } from './scenes/enemies';
import { uiModule } from './scenes/ui';

gcanvas({ bg: 'black' })
  .scene('game')
  .use(playerModule)
  .use(enemiesModule)
  .use(uiModule)
  .on('update', (dt, ctx) => {
    // Main game loop
  })
  .start();
```

### State Management

```js
gcanvas({ bg: 'black' })
  // Initialize state
  .state({
    score: 0,
    lives: 3,
    level: 1,
    paused: false
  })
  .scene('game')
    .go({ x: 20, y: 20, name: 'scoreText' })
      .text('Score: 0', { fill: 'white' })
      .update((dt, ctx) => {
        // Update text based on state
        const score = ctx.state.score;
        ctx.shapes[0].text = `Score: ${score}`;
      })
  .on('update', (dt, ctx) => {
    // Increment score
    ctx.state.score += dt * 10;
  })
  .on('keydown:p', (ctx) => {
    ctx.state.paused = !ctx.state.paused;
  })
  .start();
```

---

## Context Object Reference

Event handlers receive a context object with the following properties:

### Game-level context (.on handlers)

```js
{
  refs,           // Named object references (objects with name prop)
  state,          // Shared state object
  scenes,         // All scenes as { name: Scene }
  game,           // Underlying Game instance
  width,          // Canvas width
  height,         // Canvas height
  showScene,      // (name) => void - Show a scene
  hideScene,      // (name) => void - Hide a scene
  transition      // (from, to, opts) => void - Transition scenes
}
```

### GO-level context (.update handlers)

```js
{
  go,             // This GameObject instance
  shapes,         // Array of shapes on this GO
  refs,           // Named object references
  state           // Shared state object
}
```

### Sketch context (.update handlers)

```js
{
  shapes,         // Array of GameObjects (one per shape)
  time,           // Elapsed time in seconds
  frame,          // Current frame number
  width,          // Canvas width
  height,         // Canvas height
  mouse,          // { x, y } mouse position
  refs,           // Named objects
  game            // Underlying Game instance
}
```

---

## Related

- [Game Module](../game/README.md) - Game loop and GameObjects
- [Shapes Module](../shapes/README.md) - Shape classes and hierarchy
- [Motion Module](../motion/README.md) - Animation functions
- [Collision Module](../collision/README.md) - Collision detection

## See Also

- [Fluent API Demo](../../demos/fluent.html) - Interactive examples
- [Space Invaders](../../demos/space.html) - Full game using fluent API

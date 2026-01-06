# First Game

> Create an interactive game with the Game layer.

## Overview

This guide shows how to use the Game layer to create interactive applications. We'll build a simple game with keyboard input, collision detection, and animations.

## Basic Game Setup

```js
import { Game, Scene, GameObject, Circle, Group, Rectangle, TextShape } from '@guinetik/gcanvas';

class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();  // Canvas fills window
    this.backgroundColor = '#1a1a2e';
  }

  init() {
    super.init();  // Initialize input systems

    // Create a scene
    this.scene = new Scene(this);
    this.pipeline.add(this.scene);

    // Add game objects
    this.scene.add(new Player(this));
  }
}

// Start the game
const canvas = document.getElementById('game');
const game = new MyGame(canvas);
game.start();
```

## Creating a Player

```js
class Player extends GameObject {
  constructor(game) {
    super(game);

    // Create the player shape
    this.shape = new Circle(30, {
      color: '#4ecdc4',
      stroke: '#fff',
      lineWidth: 2
    });

    // Position at center
    this.shape.x = game.width / 2;
    this.shape.y = game.height / 2;

    // Movement speed (pixels per second)
    this.speed = 300;

    // Enable mouse/touch input on this shape
    this.enableInteractivity(this.shape);
  }

  update(dt) {
    // Handle keyboard input
    const input = this.game.input;

    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
      this.shape.x -= this.speed * dt;
    }
    if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
      this.shape.x += this.speed * dt;
    }
    if (input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) {
      this.shape.y -= this.speed * dt;
    }
    if (input.isKeyDown('ArrowDown') || input.isKeyDown('KeyS')) {
      this.shape.y += this.speed * dt;
    }

    // Keep player on screen
    this.shape.x = Math.max(30, Math.min(this.game.width - 30, this.shape.x));
    this.shape.y = Math.max(30, Math.min(this.game.height - 30, this.shape.y));
  }

  render() {
    this.shape.draw();
  }

  // Called when player is clicked
  onPointerDown(e) {
    console.log('Player clicked!');
  }
}
```

## Adding Enemies

```js
class Enemy extends GameObject {
  constructor(game, x, y) {
    super(game);

    this.shape = new Rectangle({
      x: x,
      y: y,
      width: 40,
      height: 40,
      color: '#ff6b6b'
    });

    // Random direction
    this.vx = (Math.random() - 0.5) * 200;
    this.vy = (Math.random() - 0.5) * 200;
  }

  update(dt) {
    // Move
    this.shape.x += this.vx * dt;
    this.shape.y += this.vy * dt;

    // Bounce off walls
    if (this.shape.x < 20 || this.shape.x > this.game.width - 20) {
      this.vx *= -1;
    }
    if (this.shape.y < 20 || this.shape.y > this.game.height - 20) {
      this.vy *= -1;
    }

    // Rotate
    this.shape.rotation += dt * 2;
  }

  render() {
    this.shape.draw();
  }
}
```

## Complete Game Example

Here's a complete game from `demos/js/basic.js`:

```js
import {
  Game,
  GameObject,
  Scene,
  Circle,
  Rectangle,
  TextShape,
  Group,
  Motion,
  Easing,
  FPSCounter
} from '@guinetik/gcanvas';

/**
 * HelloWorldBox - A simple animated text box
 */
class HelloWorldBox extends GameObject {
  constructor(game) {
    super(game);

    // Create a group to hold shapes
    this.group = new Group({});

    // Background box
    this.box = new Rectangle({
      width: 200,
      height: 80,
      color: '#333'
    });

    // Text label
    this.label = new TextShape('Hello World!', {
      font: '18px monospace',
      color: '#0f0',
      align: 'center',
      baseline: 'middle'
    });

    // Add to group
    this.group.add(this.box);
    this.group.add(this.label);

    // Animation time
    this.animTime = 0;
  }

  update(dt) {
    this.animTime += dt;

    // Pulse the text opacity
    const pulse = Motion.pulse(
      0, 1,           // min, max opacity
      this.animTime,
      2,              // 2 second cycle
      true,           // loop
      false,          // no yoyo
      Easing.easeInOutSine
    );
    this.label.opacity = pulse.value;

    // Float the group
    const float = Motion.float(
      { x: 0, y: 0 },
      this.animTime,
      5,              // 5 second cycle
      0.5,            // speed
      0.5,            // randomness
      50,             // radius
      true,
      Easing.easeInOutSine
    );
    this.group.x = float.x;
    this.group.y = float.y;

    super.update(dt);
  }

  render() {
    this.group.render();
  }
}

/**
 * DemoGame - Main game class
 */
class DemoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = 'black';
  }

  init() {
    super.init();

    // Create main scene
    this.gameScene = new Scene(this);
    this.gameScene.add(new HelloWorldBox(this));
    this.pipeline.add(this.gameScene);

    // Add orbiting circle
    this.floatingCircle = new Circle(30, {
      x: this.width / 2 + 200,
      y: this.height / 2,
      color: '#0f0'
    });
    this.floatingCircle.animTime = 0;
    this.pipeline.add(this.floatingCircle);

    // Add FPS counter
    this.pipeline.add(new FPSCounter(this, {
      anchor: 'bottom-right'
    }));
  }

  update(dt) {
    super.update(dt);

    // Center the scene
    this.gameScene.x = this.width / 2;
    this.gameScene.y = this.height / 2;

    // Orbit the circle
    this.floatingCircle.animTime += dt;
    const orbit = Motion.orbit(
      this.width / 2, this.height / 2,
      200, 200,       // radius X, Y
      0,              // start angle
      this.floatingCircle.animTime,
      8,              // 8 second orbit
      true,           // loop
      true            // clockwise
    );
    this.floatingCircle.x = orbit.x;
    this.floatingCircle.y = orbit.y;
  }
}

// Run the game
window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const game = new DemoGame(canvas);
  game.start();
});
```

## HTML Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My First Game</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script type="module" src="./game.js"></script>
</body>
</html>
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| `Game` | Main class managing loop, canvas, input |
| `Scene` | Container for GameObjects |
| `GameObject` | Interactive entity with update/render |
| `enableInteractivity(shape)` | Enable click/hover on a shape |
| `dt` | Delta time in seconds |
| `game.input.isKeyDown(key)` | Check if key is pressed |
| `Motion.*` | Animation helper functions |
| `FPSCounter` | Built-in FPS display |

## Input Reference

```js
// Keyboard
game.input.isKeyDown('ArrowUp')
game.input.isKeyDown('KeyW')
game.input.isKeyDown('Space')

// Mouse position
game.mouse.x
game.mouse.y

// GameObject events
onPointerDown(e) { }
onPointerUp(e) { }
onPointerMove(e) { }
onMouseOver() { }
onMouseOut() { }
```

## Next Steps

- [Game Module](../modules/game/README.md) - Full Game API reference
- [Motion Patterns](../modules/motion/README.md) - Animation functions
- [Input Handling](../modules/io/README.md) - Mouse, keyboard, touch

## Related

- [Hello World](./hello-world.md)
- [Two-Layer Architecture](../concepts/two-layer-architecture.md)
- [Game Lifecycle](../concepts/lifecycle.md)

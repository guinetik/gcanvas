# IsometricCamera

A camera for isometric views with step-based rotation and smooth animation.

Unlike `Camera3D` which provides free 3D rotation, `IsometricCamera` is designed for isometric games where the view rotates in fixed increments (e.g., 45° or 90°), similar to classic games like SimCity or Age of Empires.

## Features

- **Step-based rotation** - Rotate in fixed increments (default 45°)
- **Smooth animation** - Animated transitions between angles with easing
- **Easy integration** - Works seamlessly with `IsometricScene`
- **Multiple easing options** - Choose from various easing functions
- **Callbacks** - Get notified when rotation starts/ends

## Basic Usage

```javascript
import { IsometricCamera, IsometricScene } from '@guinetik/gcanvas';

// Create camera with 90° rotation steps (recommended for isometric)
const camera = new IsometricCamera({
  rotationStep: Math.PI / 2,  // 90 degrees (default)
  animationDuration: 0.5      // 500ms transition
});

// Create scene with camera attached
const scene = new IsometricScene(game, {
  x: game.width / 2,
  y: game.height / 2,
  camera: camera
});

// Rotate the view
camera.rotateRight(); // Rotate 45° clockwise
camera.rotateLeft();  // Rotate 45° counter-clockwise
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `angle` | number | `0` | Initial viewing angle in radians |
| `rotationStep` | number | `Math.PI / 2` | Rotation step size (default 90°). Use 90° for proper isometric look. |
| `animationDuration` | number | `0.4` | Transition duration in seconds |
| `easing` | string | `'easeInOutCubic'` | Easing function name |

> **Note:** 45° rotation steps can cause visual flattening at certain angles due to how isometric projection works. 90° steps are recommended for the best visual results (like SimCity, Age of Empires).

## Available Easing Functions

- `linear` - No easing
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad` - Quadratic
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic` - Cubic
- `easeOutBack` - Overshoot effect

## API Reference

### Methods

#### `rotateRight()`
Rotate view clockwise by one step. Returns `this` for chaining.

```javascript
camera.rotateRight(); // Rotate 45° right
```

#### `rotateLeft()`
Rotate view counter-clockwise by one step. Returns `this` for chaining.

```javascript
camera.rotateLeft(); // Rotate 45° left
```

#### `rotateTo(angle)`
Rotate to a specific angle (animated).

```javascript
camera.rotateTo(Math.PI / 2); // Rotate to 90°
```

#### `setAngle(angle)`
Set angle immediately (no animation).

```javascript
camera.setAngle(0); // Jump to 0° instantly
```

#### `update(dt)`
Update camera animation. Call each frame with delta time in seconds.

```javascript
// In your update loop
camera.update(dt);
```

> Note: If using with `IsometricScene`, the scene calls this automatically.

#### `isAnimating()`
Check if camera is currently animating.

```javascript
if (!camera.isAnimating()) {
  // Safe to trigger another rotation
}
```

#### `getAngleDegrees()`
Get current angle in degrees (0-360).

#### `getNormalizedAngle()`
Get angle in radians, normalized to 0-2π range.

#### `reset()`
Reset camera to angle 0.

### Callbacks

#### `onRotationStart(callback)`
Set callback for when rotation begins.

```javascript
camera.onRotationStart((startAngle, targetAngle) => {
  console.log(`Rotating from ${startAngle} to ${targetAngle}`);
});
```

#### `onRotationEnd(callback)`
Set callback for when rotation completes.

```javascript
camera.onRotationEnd((finalAngle) => {
  console.log(`Rotation complete at ${finalAngle}`);
});
```

## Integration with IsometricScene

When attached to an `IsometricScene`, the camera's angle is automatically applied to the `toIsometric()` projection:

```javascript
// Attach camera to scene
scene.setCamera(camera);

// The scene automatically:
// 1. Updates the camera each frame
// 2. Applies camera rotation to all projections
// 3. Handles depth sorting correctly during rotation
```

### How It Works

The camera modifies the isometric projection by rotating grid coordinates before projecting:

```javascript
// Standard isometric projection
isoX = (x - y) * (tileWidth / 2)
isoY = (x + y) * (tileHeight / 2)

// With camera rotation
rotatedX = x * cos(angle) - y * sin(angle)
rotatedY = x * sin(angle) + y * cos(angle)
isoX = (rotatedX - rotatedY) * (tileWidth / 2)
isoY = (rotatedX + rotatedY) * (tileHeight / 2)
```

## UI Controls Example

Add rotation buttons to your game:

```javascript
import { Button, Keys } from '@guinetik/gcanvas';

// Arrow buttons
const leftBtn = new Button(game, {
  x: 50, y: game.height - 50,
  width: 50, height: 50,
  text: "◀",
  onClick: () => camera.rotateLeft()
});

const rightBtn = new Button(game, {
  x: 110, y: game.height - 50,
  width: 50, height: 50,
  text: "▶",
  onClick: () => camera.rotateRight()
});

game.pipeline.add(leftBtn);
game.pipeline.add(rightBtn);

// Keyboard controls (Q/E)
game.events.on(Keys.Q, () => camera.rotateLeft());
game.events.on(Keys.E, () => camera.rotateRight());
```

## Why 90° Rotation Steps?

Isometric projection uses the formula:
- `screenX = (x - y) * tileWidth / 2`
- `screenY = (x + y) * tileHeight / 2`

At 45° rotation angles (like 45°, 135°, 225°, 315°), the `(x + y)` term can become very small, causing the view to appear flat. At 90° increments (0°, 90°, 180°, 270°), the rotation simply swaps axes, maintaining the proper 3D look.

This is why classic isometric games like SimCity and Age of Empires use 4-direction rotation (90° steps).

## See Also

- [IsometricScene](./isometric.md) - Isometric scene rendering
- [Camera3D](./camera3d.md) - Free 3D rotation camera
- [Button](./button.md) - UI buttons

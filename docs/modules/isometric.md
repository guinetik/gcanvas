# IsometricScene

> A Scene subclass for rendering isometric tile-based games and visualizations.

## Overview

`IsometricScene` extends `Scene` to provide automatic isometric projection for child GameObjects. It uses the standard "diamond" isometric projection where grid coordinates (x, y) are transformed to 2D screen positions, with optional z-axis support for height above the ground plane.

## Quick Start

```javascript
import { Game, IsometricScene, GameObject } from "gcanvas";

class MyGame extends Game {
  init() {
    super.init();

    // Create an isometric scene centered on canvas
    const isoScene = new IsometricScene(this, {
      x: this.width / 2,
      y: this.height / 2,
      tileWidth: 64,
      tileHeight: 32,
      gridSize: 10,
      depthSort: true,
    });

    // Add objects using grid coordinates
    const player = new Player(this);
    player.x = 0;  // Grid X
    player.y = 0;  // Grid Y
    player.z = 0;  // Height above ground
    isoScene.add(player);

    this.pipeline.add(isoScene);
  }
}
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tileWidth` | number | 64 | Width of a tile in pixels |
| `tileHeight` | number | tileWidth / 2 | Height of a tile in pixels |
| `gridSize` | number | 10 | Size of the grid (used for scale calculations) |
| `depthSort` | boolean | true | Sort children by depth (back-to-front) |
| `scaleByDepth` | boolean | false | Scale children by perspective distance |
| `elevationScale` | number | 1 | Multiplier for z-axis visual offset |
| `camera` | IsometricCamera | null | Optional camera for animated view rotation |

## Coordinate System

IsometricScene uses a diamond-shaped isometric projection:

```
          Y-
           \
            \
             \
    X- ------+------ X+
             /
            /
           /
          Y+
```

- **Grid coordinates (x, y)**: Position on the isometric grid
- **Z coordinate**: Height above the ground plane
- **Screen coordinates**: Calculated automatically via projection

### Projection Formula

```javascript
// Grid to screen conversion
screenX = (x - y) * (tileWidth / 2)
screenY = (x + y) * (tileHeight / 2) - z * elevationScale
```

## API Reference

### toIsometric(x, y, z?)

Converts grid coordinates to screen coordinates.

```javascript
const screen = isoScene.toIsometric(5, 3, 0);
// { x: 64, y: 128, depth: 8 }
```

**Parameters:**
- `x` (number): Grid X coordinate
- `y` (number): Grid Y coordinate
- `z` (number, optional): Height above ground (default: 0)

**Returns:** `{ x: number, y: number, depth: number }`

### fromIsometric(screenX, screenY)

Converts screen coordinates back to grid coordinates (inverse transform).

```javascript
const grid = isoScene.fromIsometric(64, 128);
// { x: 5, y: 3 }
```

**Parameters:**
- `screenX` (number): Screen X relative to scene center
- `screenY` (number): Screen Y relative to scene center

**Returns:** `{ x: number, y: number }`

### getTileAt(screenX, screenY)

Gets the tile coordinates at a screen position (floored to integers).

```javascript
const tile = isoScene.getTileAt(mouseX - scene.x, mouseY - scene.y);
// { x: 5, y: 3 }
```

**Parameters:**
- `screenX` (number): Screen X relative to scene center
- `screenY` (number): Screen Y relative to scene center

**Returns:** `{ x: number, y: number }`

### getDepthScale(y)

Calculates scale factor for perspective effect based on Y position.

```javascript
const scale = isoScene.getDepthScale(5);
// 1.0 (range: 0.7 to 1.3)
```

**Parameters:**
- `y` (number): Grid Y position

**Returns:** `number` (scale factor)

## Depth Sorting

When `depthSort` is enabled (default), children are rendered in back-to-front order based on:

1. **zIndex** (primary): Higher zIndex renders on top
2. **Isometric depth** (secondary): Calculated as `x + y - z * 0.01`

Objects further back (lower x + y values) render first, allowing closer objects to overlap them correctly.

```javascript
// Force an object to render behind/in front
myObject.zIndex = -1;  // Render behind others
myObject.zIndex = 10;  // Render on top
```

## Working with Children

### Grid-Based GameObjects

Children added to IsometricScene use grid coordinates:

```javascript
class Tile extends GameObject {
  constructor(game, gridX, gridY) {
    super(game);
    this.x = gridX;  // Grid coordinate, not pixels
    this.y = gridY;
    this.z = 0;      // Ground level
  }

  render() {
    // Render at local origin - scene handles projection
    Painter.shapes.fillRect(-16, -8, 32, 16, "#8B4513");
  }
}
```

### Manual Projection

For complex rendering (shadows, effects), access the scene's projection:

```javascript
class Ball extends GameObject {
  render() {
    // Get projected position for manual drawing
    const pos = this.parent.toIsometric(this.x, this.y, 0);
    const elevation = this.z * 0.7;

    // Draw shadow at ground level
    Painter.shapes.fillCircle(pos.x, pos.y, 10, "rgba(0,0,0,0.3)");

    // Draw ball at elevated position
    Painter.shapes.fillCircle(pos.x, pos.y - elevation, 10, "blue");
  }
}
```

## Example: Tile Map

```javascript
class TileMap extends GameObject {
  constructor(game, isoScene) {
    super(game);
    this.isoScene = isoScene;
    this.tiles = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 2, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];
    this.colors = {
      0: "#90EE90",  // Grass
      1: "#8B4513",  // Wall
      2: "#4169E1",  // Water
    };
    this.zIndex = -1;
  }

  render() {
    const size = this.tiles.length;
    const halfW = this.isoScene.tileWidth / 2;
    const halfH = this.isoScene.tileHeight / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const tileType = this.tiles[y][x];
        const pos = this.isoScene.toIsometric(x - size/2, y - size/2);

        // Draw diamond tile
        Painter.useCtx((ctx) => {
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - halfH);
          ctx.lineTo(pos.x + halfW, pos.y);
          ctx.lineTo(pos.x, pos.y + halfH);
          ctx.lineTo(pos.x - halfW, pos.y);
          ctx.closePath();
          ctx.fillStyle = this.colors[tileType];
          ctx.fill();
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }
    }
  }
}
```

## Example: Mouse Picking

```javascript
class PickableGrid extends IsometricScene {
  constructor(game, options) {
    super(game, { ...options, interactive: true });
    this.hoveredTile = null;
  }

  onMouseMove(e) {
    // Convert screen position to scene-local coordinates
    const localX = e.clientX - this.x;
    const localY = e.clientY - this.y;

    // Get tile at mouse position
    this.hoveredTile = this.getTileAt(localX, localY);
  }
}
```

## See Also

- [Scene](./scene.md) - Base container class
- [Scene3D](./scene3d.md) - Camera-based 3D projection
- [Rendering Pipeline](../concepts/rendering-pipeline.md) - How rendering works

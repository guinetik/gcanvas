# Collision Module

> 2D collision detection utilities and group-based collision management.

## Overview

The collision module provides both low-level collision detection algorithms and a high-level system for managing collision groups in games. It supports various collision shapes including rectangles, circles, lines, and multi-segment paths.

## Quick Start

```js
import { Collision, CollisionSystem } from '@guinetik/gcanvas';

// Low-level: Direct collision checks
const playerBounds = player.getBounds();
const enemyBounds = enemy.getBounds();

if (Collision.rectRect(playerBounds, enemyBounds)) {
  console.log('Hit!');
}

// High-level: Group-based collision management
const collisions = new CollisionSystem()
  .createGroup('players')
  .createGroup('enemies')
  .createGroup('bullets')
  .onCollision('bullets', 'enemies', (bullet, enemy) => {
    bullet.destroy();
    enemy.takeDamage(10);
  });

// In game loop
collisions.update();
```

## Core Classes

| Class | Description |
|-------|-------------|
| **Collision** | Static utility methods for collision detection |
| **CollisionSystem** | Group-based collision management with callbacks |

---

## Collision Class

Static utility class with various collision detection algorithms. All methods work with bounds objects: `{ x, y, width, height }` for rectangles, `{ x, y, radius }` for circles.

### Rectangle vs Rectangle (AABB)

The most common collision check - axis-aligned bounding boxes.

```js
const a = { x: 100, y: 100, width: 50, height: 50 };
const b = { x: 120, y: 120, width: 50, height: 50 };

if (Collision.rectRect(a, b)) {
  console.log('Rectangles overlap!');
}

// Alias
Collision.intersects(a, b);
```

### Circle vs Circle

For circular hitboxes - more accurate for round objects.

```js
const circleA = { x: 100, y: 100, radius: 30 };
const circleB = { x: 150, y: 100, radius: 25 };

if (Collision.circleCircle(circleA, circleB)) {
  console.log('Circles overlap!');
}
```

### Circle vs Rectangle

Mixed shape collision - finds closest point on rectangle to circle center.

```js
const circle = { x: 100, y: 100, radius: 30 };
const rect = { x: 120, y: 80, width: 60, height: 40 };

if (Collision.circleRect(circle, rect)) {
  console.log('Circle and rectangle overlap!');
}
```

### Point Collision

Check if a point (like mouse cursor) is inside a shape.

```js
// Point in rectangle
if (Collision.pointRect(mouseX, mouseY, button.getBounds())) {
  button.highlight();
}

// Point in circle
if (Collision.pointCircle(mouseX, mouseY, planet)) {
  showTooltip('Planet selected');
}
```

### Line vs Rectangle

For laser beams, lightning bolts, and raycast-style collision.

```js
// Basic line collision
if (Collision.lineRect(x1, y1, x2, y2, target.getBounds())) {
  console.log('Line hits target!');
}

// With thickness (for thick beams)
if (Collision.lineRect(x1, y1, x2, y2, target.getBounds(), 10)) {
  console.log('Thick beam hits target!');
}
```

### Line vs Line

Check if two line segments intersect.

```js
if (Collision.lineLine(x1, y1, x2, y2, x3, y3, x4, y4)) {
  console.log('Lines cross!');
}
```

### Multi-Segment Collision

For complex shapes like branching lightning or paths.

```js
const lightningSegments = [
  { x1: 400, y1: 0, x2: 380, y2: 50 },
  { x1: 380, y1: 50, x2: 420, y2: 100 },
  { x1: 420, y1: 100, x2: 390, y2: 150 }
];

if (Collision.segmentsRect(lightningSegments, player.getBounds(), 8)) {
  player.takeDamage();
}
```

### Collision Response

Get information needed to respond to collisions.

```js
// Get overlap depth
const overlap = Collision.getOverlap(playerBounds, wallBounds);
if (overlap) {
  console.log(`Overlap: ${overlap.x}px x ${overlap.y}px`);
}

// Get minimum translation vector (for pushing objects apart)
const mtv = Collision.getMTV(playerBounds, wallBounds);
if (mtv) {
  player.x += mtv.x;
  player.y += mtv.y;
}
```

### Sweep Test (Continuous Collision)

Prevents fast-moving objects from tunneling through thin walls.

```js
const bullet = { x: 100, y: 100, width: 10, height: 10 };
const wall = { x: 200, y: 50, width: 20, height: 200 };
const velocityX = 500;
const velocityY = 0;

const hit = Collision.sweep(bullet, velocityX, velocityY, wall);
if (hit) {
  console.log(`Hit at time: ${hit.time}`);
  console.log(`Normal: ${hit.normalX}, ${hit.normalY}`);

  // Move to collision point
  bullet.x += velocityX * hit.time;
  bullet.y += velocityY * hit.time;
}
```

### Method Reference

| Method | Signature | Description |
|--------|-----------|-------------|
| `rectRect` | `(a, b)` | AABB collision |
| `intersects` | `(a, b)` | Alias for rectRect |
| `circleCircle` | `(a, b)` | Circle collision |
| `circleRect` | `(circle, rect)` | Mixed shape collision |
| `pointRect` | `(px, py, rect)` | Point in rectangle |
| `pointCircle` | `(px, py, circle)` | Point in circle |
| `lineRect` | `(x1, y1, x2, y2, rect, thickness?)` | Line segment vs rectangle |
| `lineLine` | `(x1, y1, x2, y2, x3, y3, x4, y4)` | Line vs line |
| `segmentsRect` | `(segments, rect, thickness?)` | Multi-segment vs rectangle |
| `getOverlap` | `(a, b)` | Get overlap depth |
| `getMTV` | `(a, b)` | Get minimum translation vector |
| `sweep` | `(rect, vx, vy, target)` | Continuous collision detection |

---

## CollisionSystem Class

High-level system for managing collision groups and callbacks. Ideal for games with multiple entity types.

### Creating Groups

```js
const collisions = new CollisionSystem();

// Create groups for different entity types
collisions.createGroup('players');
collisions.createGroup('enemies');
collisions.createGroup('bullets');
collisions.createGroup('pickups');
collisions.createGroup('walls');
```

### Adding Objects to Groups

Objects must have either a `getBounds()` method or a `bounds` property.

```js
// Add single object
collisions.add('players', player);
collisions.add('enemies', alien);

// Add multiple objects
aliens.forEach(alien => collisions.add('enemies', alien));
```

### Registering Collision Callbacks

```js
// When bullets hit enemies
collisions.onCollision('bullets', 'enemies', (bullet, enemy) => {
  bullet.destroy();
  enemy.takeDamage(10);
  spawnExplosion(enemy.x, enemy.y);
});

// When player touches pickups
collisions.onCollision('players', 'pickups', (player, pickup) => {
  pickup.collect();
  player.score += pickup.value;
});

// When player hits walls (for collision response)
collisions.onCollision('players', 'walls', (player, wall) => {
  const mtv = Collision.getMTV(player.getBounds(), wall.getBounds());
  if (mtv) {
    player.x += mtv.x;
    player.y += mtv.y;
  }
});
```

### Update Loop

Call `update()` each frame to check all registered collision pairs.

```js
class MyGame extends Game {
  update(dt) {
    super.update(dt);

    // Check all collisions
    this.collisions.update();
  }
}
```

### Manual Collision Checks

For cases where you need more control than callbacks.

```js
// Check specific pair, get all collisions
const hits = collisions.check('bullets', 'enemies');
for (const [bullet, enemy] of hits) {
  // Handle collision
}

// Check one object against a group
const enemy = collisions.checkAgainstGroup(bullet, 'enemies');
if (enemy) {
  // First enemy hit
}

// Get all objects hit
const allEnemies = collisions.checkAllAgainstGroup(bullet, 'enemies');
```

### Removing Objects

```js
// Remove from specific group
collisions.remove('enemies', deadEnemy);

// Remove from all groups
collisions.removeFromAll(destroyedObject);

// Clear entire group
collisions.clearGroup('bullets');

// Clear everything
collisions.clearAll();
```

### Active Object Filtering

CollisionSystem automatically skips inactive objects. It checks for:
- `obj.active === false`
- `obj.destroyed === true`
- `obj.alive === false`

```js
// These objects are automatically skipped
enemy.active = false;     // Skipped
bullet.destroyed = true;  // Skipped
player.alive = false;     // Skipped
```

### Method Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `createGroup(name)` | `this` | Create a collision group |
| `add(group, obj)` | `this` | Add object to group |
| `remove(group, obj)` | `boolean` | Remove object from group |
| `removeFromAll(obj)` | `void` | Remove from all groups |
| `clearGroup(name)` | `void` | Clear all objects in group |
| `clearAll()` | `void` | Clear all groups |
| `getGroup(name)` | `Array` | Get all objects in group |
| `onCollision(a, b, callback)` | `this` | Register collision callback |
| `offCollision(a, b)` | `void` | Remove collision callback |
| `update()` | `void` | Check all collision pairs |
| `check(a, b)` | `Array<[obj, obj]>` | Get all colliding pairs |
| `checkAgainstGroup(obj, group)` | `Object\|null` | First collision in group |
| `checkAllAgainstGroup(obj, group)` | `Array` | All collisions in group |

---

## Complete Example

A Space Invaders-style collision setup:

```js
import { Game, CollisionSystem, Collision } from '@guinetik/gcanvas';

class SpaceGame extends Game {
  init() {
    super.init();

    // Set up collision system
    this.collisions = new CollisionSystem()
      .createGroup('player')
      .createGroup('aliens')
      .createGroup('playerBullets')
      .createGroup('alienBullets')
      .createGroup('shields');

    // Player bullets hit aliens
    this.collisions.onCollision('playerBullets', 'aliens', (bullet, alien) => {
      bullet.destroy();
      alien.hit();
      this.score += 100;
    });

    // Alien bullets hit player
    this.collisions.onCollision('alienBullets', 'player', (bullet, player) => {
      bullet.destroy();
      this.handlePlayerHit();
    });

    // Any bullet hits shields
    this.collisions.onCollision('playerBullets', 'shields', (bullet, shield) => {
      bullet.destroy();
      shield.damage();
    });

    this.collisions.onCollision('alienBullets', 'shields', (bullet, shield) => {
      bullet.destroy();
      shield.damage();
    });

    // Register initial objects
    this.collisions.add('player', this.player);
    this.aliens.forEach(a => this.collisions.add('aliens', a));
    this.shields.forEach(s => this.collisions.add('shields', s));
  }

  spawnBullet(bullet, group) {
    this.bullets.push(bullet);
    this.collisions.add(group, bullet);
  }

  update(dt) {
    super.update(dt);

    // One line handles all collision logic!
    this.collisions.update();
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CollisionSystem                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     Groups                           │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │    │
│  │  │ players │  │ enemies │  │ bullets │  ...        │    │
│  │  │  Set()  │  │  Set()  │  │  Set()  │             │    │
│  │  └─────────┘  └─────────┘  └─────────┘             │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 Collision Pairs                      │    │
│  │  bullets vs enemies → callback                       │    │
│  │  bullets vs player  → callback                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Collision (Static Utils)                │    │
│  │  rectRect() | circleCircle() | lineRect() | ...     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Related

- [Game Module](../game/README.md) - Game loop and GameObjects
- [State Module](../state/README.md) - State machines for entity lifecycle

## See Also

- [Motion Module](../motion/README.md) - Animation and movement
- [Shapes Module](../shapes/README.md) - Drawing primitives with bounds

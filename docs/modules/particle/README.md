# Particle Module

> High-performance particle systems with object pooling, composable updaters, and optional 3D projection.

## Overview

The particle module provides a flexible system for creating visual effects like fire, smoke, sparks, rain, and explosions. It features:

- **Object pooling** to minimize garbage collection
- **Composable updaters** for modular physics and effects
- **Named emitters** for easy management
- **Optional Camera3D integration** with depth sorting
- **Blend modes** for additive/screen effects

## Quick Start

```js
import { Game, ParticleSystem, ParticleEmitter, Updaters } from '@guinetik/gcanvas';

class MyGame extends Game {
  init() {
    super.init();

    // Create particle system
    this.particles = new ParticleSystem(this, {
      maxParticles: 5000,
      blendMode: "screen",
      updaters: [
        Updaters.velocity,
        Updaters.lifetime,
        Updaters.gravity(150),
        Updaters.fadeOut,
      ],
    });

    // Add a fountain emitter
    this.particles.addEmitter("fountain", new ParticleEmitter({
      position: { x: 400, y: 500 },
      velocity: { x: 0, y: -300 },
      velocitySpread: { x: 50, y: 30 },
      lifetime: { min: 1, max: 3 },
      size: { min: 2, max: 6 },
      color: { r: 100, g: 180, b: 255, a: 1 },
      rate: 100,
      shape: "circle",
    }));

    this.pipeline.add(this.particles);
  }

  update(dt) {
    super.update(dt);
    // Particles update automatically via pipeline
  }
}
```

## Core Classes

| Class | Description |
|-------|-------------|
| **ParticleSystem** | GameObject that manages particles and emitters |
| **ParticleEmitter** | Defines spawn position, velocity, and appearance |
| **Updaters** | Composable behavior functions |
| **Particle** | Individual particle data (managed internally) |

---

## ParticleSystem

The main container that manages particles, emitters, and rendering.

### Constructor Options

```js
const particles = new ParticleSystem(game, {
  maxParticles: 5000,        // Maximum active particles
  camera: myCamera,          // Optional Camera3D for 3D projection
  depthSort: true,           // Sort by depth (requires camera)
  blendMode: "screen",       // Canvas blend mode
  worldSpace: false,         // Position in world vs screen space
  updaters: [                // Behavior functions
    Updaters.velocity,
    Updaters.lifetime,
  ],
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxParticles` | `number` | `5000` | Maximum active particles |
| `camera` | `Camera3D` | `null` | Camera for 3D projection |
| `depthSort` | `boolean` | `false` | Enable depth sorting |
| `blendMode` | `string` | `"source-over"` | Canvas composite operation |
| `worldSpace` | `boolean` | `false` | World vs screen space positioning |
| `updaters` | `Function[]` | `[velocity, lifetime]` | Behavior functions |

### Emitter Management

```js
// Add emitter with name
particles.addEmitter("fire", fireEmitter);
particles.addEmitter("sparks", sparkEmitter);

// Get emitter by name
const fire = particles.getEmitter("fire");
fire.position.x = 200;

// Remove emitter
particles.removeEmitter("sparks");

// Access all emitters
for (const [name, emitter] of particles.emitters) {
  emitter.active = false;
}
```

### Spawning Particles

```js
// Continuous emission via emitter rate
// (happens automatically in update)

// Burst spawn
particles.burst(50, "fire");           // By emitter name
particles.burst(50, myEmitter);        // By emitter instance

// Manual emission
particles.emit(10, myEmitter);
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `particleCount` | `number` | Current active particles |
| `poolSize` | `number` | Recycled particles ready for reuse |
| `emitters` | `Map<string, ParticleEmitter>` | All registered emitters |

### Methods

| Method | Description |
|--------|-------------|
| `addEmitter(name, emitter)` | Register an emitter |
| `removeEmitter(name)` | Remove an emitter |
| `getEmitter(name)` | Get emitter by name |
| `burst(count, emitterOrName)` | Spawn burst of particles |
| `emit(count, emitter)` | Emit particles from emitter |
| `clear()` | Remove all active particles |

---

## ParticleEmitter

Defines how particles are spawned - their position, velocity, appearance, and rate.

### Constructor Options

```js
const emitter = new ParticleEmitter({
  // Emission rate (particles per second, 0 for burst-only)
  rate: 50,

  // Spawn position and randomization
  position: { x: 400, y: 300, z: 0 },
  spread: { x: 20, y: 0, z: 20 },

  // Initial velocity and randomization
  velocity: { x: 0, y: -200, z: 0 },
  velocitySpread: { x: 50, y: 30, z: 50 },

  // Particle lifetime (seconds)
  lifetime: { min: 1, max: 3 },

  // Particle size (pixels)
  size: { min: 2, max: 8 },

  // Base color
  color: { r: 255, g: 100, b: 50, a: 1 },

  // Shape: "circle", "square", "triangle"
  shape: "circle",

  // Start active?
  active: true,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rate` | `number` | `10` | Particles per second |
| `position` | `{x, y, z}` | `{0, 0, 0}` | Spawn center |
| `spread` | `{x, y, z}` | `{0, 0, 0}` | Position randomization |
| `velocity` | `{x, y, z}` | `{0, 0, 0}` | Initial velocity |
| `velocitySpread` | `{x, y, z}` | `{0, 0, 0}` | Velocity randomization |
| `lifetime` | `{min, max}` | `{1, 2}` | Lifetime in seconds |
| `size` | `{min, max}` | `{1, 1}` | Size in pixels |
| `color` | `{r, g, b, a}` | `{255, 255, 255, 1}` | Base color |
| `shape` | `string` | `"circle"` | Particle shape |
| `active` | `boolean` | `true` | Is emitting? |

### Runtime Modification

Emitters can be modified at runtime:

```js
const emitter = particles.getEmitter("fountain");

// Move emitter
emitter.position.x = mouseX;
emitter.position.y = mouseY;

// Change color
emitter.color = { r: 255, g: 0, b: 0, a: 1 };

// Adjust rate
emitter.rate = 200;

// Pause/resume
emitter.active = false;
emitter.active = true;
```

---

## Updaters

Updaters are composable functions that define particle behavior. Each updater has the signature:

```js
(particle, dt, system) => void
```

### Built-in Updaters

```js
import { Updaters } from '@guinetik/gcanvas';

const particles = new ParticleSystem(game, {
  updaters: [
    // Core physics
    Updaters.velocity,           // Apply velocity to position
    Updaters.lifetime,           // Track age, kill when expired

    // Forces
    Updaters.gravity(200),       // Downward acceleration
    Updaters.rise(100),          // Upward acceleration (fire, smoke)
    Updaters.damping(0.98),      // Velocity friction

    // Visual effects
    Updaters.fadeOut,            // Fade alpha over lifetime
    Updaters.fadeInOut,          // Fade in then out
    Updaters.shrink(0),          // Shrink to 0 over lifetime
    Updaters.grow(2),            // Grow to 2x over lifetime

    // Color
    Updaters.colorOverLife(
      { r: 255, g: 200, b: 100 }, // Start color
      { r: 100, g: 50, b: 20 }    // End color
    ),

    // Movement modifiers
    Updaters.wobble(10),         // Random velocity jitter
    Updaters.attract(            // Attract to point
      { x: 400, y: 300 },
      100
    ),

    // Boundaries
    Updaters.bounds(
      { left: 0, right: 800, top: 0, bottom: 600 },
      0.8  // Bounce factor
    ),
  ],
});
```

### Updater Reference

| Updater | Parameters | Description |
|---------|------------|-------------|
| `velocity` | - | Apply velocity to position |
| `lifetime` | - | Track age, kill when expired |
| `gravity(strength)` | `strength=200` | Downward acceleration |
| `rise(strength)` | `strength=100` | Upward acceleration |
| `damping(factor)` | `factor=0.98` | Velocity friction |
| `fadeOut` | - | Fade alpha over lifetime |
| `fadeInOut` | - | Fade in then out |
| `shrink(endScale)` | `endScale=0` | Shrink over lifetime |
| `grow(endScale)` | `endScale=2` | Grow over lifetime |
| `colorOverLife(start, end)` | Color objects | Interpolate color |
| `wobble(strength)` | `strength=10` | Random velocity jitter |
| `attract(target, strength)` | Position, `strength=100` | Attract to point |
| `bounds(bounds, bounce)` | Rect, `bounce=0.8` | Bounce off boundaries |

### Custom Updaters

Create your own updater functions:

```js
// Simple updater
const spin = (p, dt) => {
  p.rotation = (p.rotation ?? 0) + dt * 5;
};

// Factory for configurable updater
const orbit = (centerX, centerY, speed) => (p, dt) => {
  const angle = Math.atan2(p.y - centerY, p.x - centerX);
  const dist = Math.hypot(p.x - centerX, p.y - centerY);
  const newAngle = angle + speed * dt;
  p.x = centerX + Math.cos(newAngle) * dist;
  p.y = centerY + Math.sin(newAngle) * dist;
};

// Use in system
const particles = new ParticleSystem(game, {
  updaters: [
    Updaters.velocity,
    Updaters.lifetime,
    spin,
    orbit(400, 300, 2),
  ],
});
```

---

## Particle Properties

Each particle has these properties (accessible in updaters):

| Property | Type | Description |
|----------|------|-------------|
| `x`, `y`, `z` | `number` | Position |
| `vx`, `vy`, `vz` | `number` | Velocity |
| `size` | `number` | Current size |
| `color` | `{r, g, b, a}` | Current color |
| `age` | `number` | Time alive (seconds) |
| `lifetime` | `number` | Total lifetime (seconds) |
| `progress` | `number` | `age / lifetime` (0-1) |
| `alive` | `boolean` | Is particle active? |
| `shape` | `string` | Particle shape |
| `custom` | `Object` | Custom data storage |

---

## 3D Particles with Camera3D

For 3D particle effects, pass a Camera3D instance:

```js
import { Camera3D, ParticleSystem, ParticleEmitter, Updaters } from '@guinetik/gcanvas';

class My3DParticles extends Game {
  init() {
    super.init();

    // Create camera
    this.camera = new Camera3D({
      rotationX: 0.3,
      perspective: 800,
      autoRotate: true,
    });
    this.camera.enableMouseControl(this.canvas);

    // Create 3D particle system
    this.particles = new ParticleSystem(this, {
      camera: this.camera,
      depthSort: true,           // Sort back-to-front
      blendMode: "screen",
      updaters: [
        Updaters.velocity,
        Updaters.lifetime,
        Updaters.fadeOut,
      ],
    });

    // Emitter with z-axis spread
    this.particles.addEmitter("explosion", new ParticleEmitter({
      position: { x: 0, y: 0, z: 0 },    // Center of 3D space
      spread: { x: 50, y: 50, z: 50 },   // 3D spread
      velocity: { x: 0, y: -100, z: 0 },
      velocitySpread: { x: 100, y: 100, z: 100 },
      lifetime: { min: 1, max: 2 },
      size: { min: 4, max: 10 },
      rate: 50,
    }));

    this.pipeline.add(this.particles);
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);
  }
}
```

---

## Common Effects

### Fire

```js
particles.addEmitter("fire", new ParticleEmitter({
  position: { x: 400, y: 550 },
  spread: { x: 30, y: 0 },
  velocity: { x: 0, y: -80 },
  velocitySpread: { x: 20, y: 15 },
  lifetime: { min: 0.5, max: 1.5 },
  size: { min: 8, max: 16 },
  color: { r: 255, g: 120, b: 40, a: 1 },
  rate: 100,
  shape: "circle",
}));

// With color updater for orange -> red -> dark
updaters: [
  Updaters.velocity,
  Updaters.lifetime,
  Updaters.rise(80),
  Updaters.fadeOut,
  Updaters.colorOverLife(
    { r: 255, g: 150, b: 50 },
    { r: 80, g: 20, b: 10 }
  ),
]
```

### Snow

```js
particles.addEmitter("snow", new ParticleEmitter({
  position: { x: 400, y: -20 },
  spread: { x: 500, y: 0 },
  velocity: { x: 0, y: 50 },
  velocitySpread: { x: 20, y: 10 },
  lifetime: { min: 5, max: 10 },
  size: { min: 2, max: 5 },
  color: { r: 255, g: 255, b: 255, a: 0.8 },
  rate: 30,
  shape: "circle",
}));

updaters: [
  Updaters.velocity,
  Updaters.lifetime,
  Updaters.wobble(15),
]
```

### Explosion Burst

```js
// Create emitter with rate 0 (burst only)
const explosionEmitter = new ParticleEmitter({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  velocitySpread: { x: 300, y: 300 },
  lifetime: { min: 0.5, max: 1.5 },
  size: { min: 4, max: 12 },
  color: { r: 255, g: 200, b: 50, a: 1 },
  rate: 0,  // No continuous emission
  shape: "circle",
});

// Trigger explosion at position
explosionEmitter.position.x = clickX;
explosionEmitter.position.y = clickY;
particles.burst(100, explosionEmitter);
```

### Confetti

```js
const colors = [
  { r: 255, g: 80, b: 80 },
  { r: 80, g: 255, b: 80 },
  { r: 80, g: 80, b: 255 },
  { r: 255, g: 255, b: 80 },
];

const confettiEmitter = new ParticleEmitter({
  velocity: { x: 0, y: -200 },
  velocitySpread: { x: 150, y: 80 },
  lifetime: { min: 2, max: 4 },
  size: { min: 6, max: 12 },
  rate: 0,
  shape: "triangle",
});

// Burst with random colors
for (let i = 0; i < 50; i++) {
  confettiEmitter.color = { ...colors[i % colors.length], a: 1 };
  particles.burst(1, confettiEmitter);
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ParticleSystem                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      Emitters                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │ "fire"   │  │ "sparks" │  │ "smoke"  │            │  │
│  │  │ rate: 50 │  │ rate: 20 │  │ rate: 10 │            │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Active Particles (pooled)                 │  │
│  │  [p1, p2, p3, ... pN]  ←→  [pool of recycled]         │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     Updaters                           │  │
│  │  velocity → lifetime → gravity → fadeOut → ...        │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     Rendering                          │  │
│  │  Simple 2D  |  Camera3D + Depth Sort                  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Performance Tips

1. **Use object pooling** - The system automatically pools particles. Keep `maxParticles` reasonable.

2. **Limit updaters** - Each updater runs on every particle every frame. Use only what you need.

3. **Use appropriate shapes** - `"circle"` is fastest, `"triangle"` slightly slower.

4. **Disable depth sorting** - If you don't need 3D, skip `depthSort: true`.

5. **Use `"screen"` blend mode wisely** - Additive blending is visually nice but can be expensive with many particles.

---

## Related

- [Game Module](../game/README.md) - Game loop and GameObjects
- [Scene3D](../util/scene3d.md) - 3D scene projection

## See Also

- [Camera3D](../util/camera3d.md) - 3D camera and projection
- [Motion Module](../motion/README.md) - Animation patterns
- [WebGL Module](../webgl/README.md) - GPU-accelerated particle rendering (10,000+ particles)
- [Physics Module](../physics/README.md) - Particle collisions and forces
- [Heat Module](../math/heat.md) - Thermal dynamics for particles
- [Fluid Dynamics](../../fluid-dynamics.md) - SPH fluid/gas simulation

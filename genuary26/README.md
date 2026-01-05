# Genuary 2026 - GCanvas Showcase

> **IMPORTANT FOR CLAUDE**: This document outlines what this project is, what it should achieve, and which gcanvas library features MUST be used. Read this before implementing any daily prompt.

## What is Genuary?

[Genuary](https://genuary.art) is a month-long generative art challenge where artists create one piece per day following official prompts. This project implements Genuary 2026 prompts as a showcase of the **gcanvas** library's capabilities.

## Project Goals

1. **Showcase gcanvas library features** - Each daily implementation should demonstrate library capabilities, NOT raw canvas drawing
2. **Use proper abstractions** - ParticleSystem, not hand-rolled physics. Motion.spring, not manual interpolation
3. **3D when appropriate** - Many prompts benefit from Camera3D with mouse orbit controls
4. **Interactive** - Click, drag, mouse reactivity make demos engaging
5. **Terminal aesthetic** - Green (#0f0) on black, monospace fonts, minimal UI

## What NOT To Do

```javascript
// BAD - Drawing directly with canvas
ctx.beginPath();
ctx.arc(x, y, 50, 0, Math.PI * 2);
ctx.fillStyle = "green";
ctx.fill();

// BAD - Hand-rolled physics
p.vx += (target.x - p.x) * 0.1;
p.vy += (target.y - p.y) * 0.1;
p.x += p.vx;
p.y += p.vy;

// BAD - Manual particle management
const particles = [];
particles.push({ x, y, vx, vy });
for (const p of particles) { ... }
```

## What TO Do

```javascript
// GOOD - Use library's ParticleSystem
import { ParticleSystem, ParticleEmitter, Updaters } from '../../../src/index.js';

const particles = new ParticleSystem(this, {
  camera: this.camera,
  depthSort: true,
  maxParticles: 5000,
  blendMode: "screen",
  updaters: [
    Updaters.velocity,
    Updaters.lifetime,
    Updaters.attract(target, 100),
    Updaters.damping(0.95),
    Updaters.fadeOut,
  ],
});

// GOOD - Use Motion for animations
import { Motion } from '../../../src/index.js';

const result = Motion.spring(startX, targetX, elapsedTime, duration, false, false, {
  stiffness: 0.5,
  damping: 0.7,
});
this.x = result.value;
```

---

## GCanvas Library Features Reference

### ParticleSystem (`src/particle/`)

High-performance particles with pooling, 3D support, and composable behaviors.

#### Setup Pattern
```javascript
import { Game, Camera3D, ParticleSystem, ParticleEmitter, Updaters, Painter } from '../../../src/index.js';

class MyDemo extends Game {
  init() {
    super.init();
    Painter.init(this.ctx);

    this.camera = new Camera3D({
      perspective: 800,
      rotationX: 0.3,
      inertia: true,
      friction: 0.95,
      clampX: false,  // Free rotation
    });
    this.camera.enableMouseControl(this.canvas);

    this.particles = new ParticleSystem(this, {
      camera: this.camera,
      depthSort: true,
      maxParticles: 10000,
      blendMode: "screen",
      updaters: [
        Updaters.velocity,
        Updaters.lifetime,
        Updaters.gravity(150),
        Updaters.fadeOut,
        Updaters.shrink(0.2),
      ],
    });

    this.particles.addEmitter("main", new ParticleEmitter({
      rate: 100,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: -200, z: 0 },
      velocitySpread: { x: 50, y: 20, z: 50 },
      lifetime: { min: 2, max: 4 },
      size: { min: 3, max: 8 },
      color: { r: 0, g: 255, b: 100, a: 1 },
      shape: "circle",
    }));

    this.pipeline.add(this.particles);
  }
}
```

#### ParticleEmitter Options
```javascript
new ParticleEmitter({
  rate: 10,                    // Particles per second
  position: { x, y, z },       // Spawn position
  spread: { x, y, z },         // Position randomization
  velocity: { x, y, z },       // Initial velocity
  velocitySpread: { x, y, z }, // Velocity randomization
  lifetime: { min, max },      // Particle lifetime (seconds)
  size: { min, max },          // Particle size range
  color: { r, g, b, a },       // Base color
  shape: "circle",             // "circle", "square", "triangle"
  active: true,                // Enable/disable
});
```

#### Available Updaters
```javascript
Updaters.velocity              // Apply velocity to position
Updaters.lifetime              // Age tracking, kills expired particles
Updaters.gravity(strength)     // Downward force (default: 200)
Updaters.rise(strength)        // Upward force (default: 100)
Updaters.damping(factor)       // Velocity friction (default: 0.98)
Updaters.fadeOut               // Alpha: 1 -> 0 over lifetime
Updaters.fadeInOut             // Alpha: 0 -> 1 -> 0
Updaters.shrink(endScale)      // Size decay (default: 0)
Updaters.grow(endScale)        // Size growth (default: 2)
Updaters.colorOverLife(startColor, endColor)
Updaters.wobble(strength)      // Random jitter (default: 10)
Updaters.bounds(bounds, bounce)
Updaters.attract(target, strength)  // Attraction to point (default: 100)
```

#### Custom Updaters
```javascript
// Custom updater for mouse repulsion
const mouseRepel = (particle, dt, system) => {
  const dx = particle.x - this.mouseX;
  const dy = particle.y - this.mouseY;
  const distSq = dx * dx + dy * dy;
  const radius = 150;

  if (distSq < radius * radius && distSq > 0) {
    const dist = Math.sqrt(distSq);
    const force = (1 - dist / radius) * 200 * dt;
    particle.vx += (dx / dist) * force;
    particle.vy += (dy / dist) * force;
  }
};

// Add to updaters array
updaters: [
  Updaters.velocity,
  Updaters.lifetime,
  mouseRepel,  // Custom updater
  Updaters.fadeOut,
]
```

#### Burst vs Continuous Emission
```javascript
// Continuous: rate-based
emitter.rate = 100;  // 100 particles/second

// Burst: instant spawn
this.particles.burst(500, "main");  // Spawn 500 immediately
```

---

### Motion System (`src/motion/`)

Stateless animations driven by elapsed time. Perfect for game loops.

#### Available Motion Functions
```javascript
Motion.spring(start, end, time, duration, loop, yoyo, params, callbacks)
Motion.oscillate(min, max, time, duration, loop, easing, callbacks)
Motion.pulse(min, max, time, duration, loop, yoyo, easing, callbacks)
Motion.bounce(start, end, time, duration, loop, yoyo, bounceCount, easing, callbacks)
Motion.orbit(cx, cy, rx, ry, startAngle, time, duration, loop, clockwise, easing, callbacks)
Motion.spiral(cx, cy, startR, endR, startAngle, revolutions, time, duration, loop, yoyo, easing, callbacks)
Motion.bezier(p0, p1, p2, p3, time, duration, loop, yoyo, easing, callbacks)
Motion.parabolic(start, peak, end, time, duration, loop, yoyo, easing, callbacks)
Motion.swing(cx, cy, maxAngle, time, duration, loop, yoyo, easing, callbacks)
Motion.pendulum(originAngle, amplitude, time, duration, loop, damped, easing, callbacks)
Motion.shake(cx, cy, intensity, frequency, time, duration, loop, decay, easing, callbacks)
Motion.hop(startX, startY, endX, endY, time, duration, hopCount, loop, easing, callbacks)
Motion.float(target, time, duration, speed, randomness, radius, loop, easing, callbacks)
Motion.waypoint(target, time, waypoints, speed, waitTime, loop, easing, callbacks)
```

#### Spring Animation Pattern
```javascript
class MyDemo extends Game {
  init() {
    this.animTime = 0;
    this.springs = [];

    // Create spring targets
    for (const target of targets) {
      this.springs.push({
        startX: randomOffscreen(),
        startY: randomOffscreen(),
        targetX: target.x,
        targetY: target.y,
        delay: Math.random() * 2,
        time: 0,
      });
    }
  }

  update(dt) {
    this.animTime += dt;

    for (const s of this.springs) {
      if (this.animTime < s.delay) continue;
      s.time += dt;

      const result = Motion.spring(
        s.startX, s.targetX,
        s.time, 2.0,  // 2 second duration
        false, false,
        { stiffness: 0.5, damping: 0.7 }
      );

      s.x = result.value;
      s.completed = result.completed;
    }
  }
}
```

#### Result Object Format
```javascript
const result = Motion.spring(...);
// Returns:
{
  value: number,      // Current animated value
  t: number,          // Normalized time (0-1)
  progress: number,   // Alias for t
  completed: boolean, // True when done (non-looping)
  loop: boolean,      // Whether looping
  state: object,      // Internal state for continuity
}
```

---

### Camera3D (`src/util/camera3d.js`)

Pseudo-3D projection with mouse controls, inertia, and rotation options.

#### Configuration
```javascript
const camera = new Camera3D({
  // Perspective
  perspective: 800,        // Higher = less distortion

  // Initial rotation (radians)
  rotationX: 0,            // Tilt up/down
  rotationY: 0,            // Spin left/right
  rotationZ: 0,            // Roll

  // Position
  x: 0, y: 0, z: 0,

  // Mouse controls
  sensitivity: 0.005,

  // Rotation clamping
  clampX: false,           // FALSE = free rotation (recommended)
  clampY: false,
  minRotationX: -1.5,
  maxRotationX: 1.5,

  // Inertia (momentum after release)
  inertia: true,
  friction: 0.95,          // 0.9 = fast stop, 0.98 = slow drift
  velocityScale: 1.0,

  // Auto-rotation
  autoRotate: false,
  autoRotateSpeed: 0.5,
  autoRotateAxis: 'y',
});

camera.enableMouseControl(this.canvas);
```

#### Projection
```javascript
// In render():
const proj = this.camera.project(x, y, z);
// proj.x, proj.y = screen offset from center
// proj.scale = perspective scale (smaller = further)
// proj.z = depth (for sorting)

const screenX = this.width / 2 + proj.x;
const screenY = this.height / 2 + proj.y;
const size = baseSize * proj.scale;
```

---

### Shapes (`src/shapes/`)

Use shapes instead of raw canvas drawing.

#### 2D Shapes
```javascript
import { Circle, Rectangle, Triangle, Star, Hexagon, Line, Arc } from '../../../src/index.js';

const circle = new Circle(x, y, radius, { fill: "#0f0", stroke: "#fff" });
const rect = new Rectangle(x, y, width, height, { fill: "rgba(0,255,0,0.5)" });
const star = new Star(x, y, 5, innerRadius, outerRadius, { fill: "#0f0" });

// Render
circle.render(ctx);
```

#### 3D Shapes
```javascript
import { Cube3D, Sphere3D } from '../../../src/index.js';

const cube = new Cube3D(size, {
  camera: this.camera,
  x: 0, y: 0, z: 0,
  faceColors: {
    front: "#0f0",
    back: "#0a0",
    // ...
  },
});
```

---

### Easing Functions (`src/motion/easing.js`)

```javascript
import { Easing } from '../../../src/index.js';

Easing.linear
Easing.smoothstep
Easing.smootherstep
Easing.easeInQuad / easeOutQuad / easeInOutQuad
Easing.easeInCubic / easeOutCubic / easeInOutCubic
Easing.easeInSine / easeOutSine / easeInOutSine
Easing.easeInExpo / easeOutExpo / easeInOutExpo
Easing.easeInElastic / easeOutElastic / easeInOutElastic
Easing.easeInBounce / easeOutBounce / easeInOutBounce
Easing.easeInBack / easeOutBack / easeInOutBack
```

---

### Game Class Pattern

Every Genuary day should follow this pattern:

```javascript
import { Game, Camera3D, Painter, ParticleSystem, ParticleEmitter, Updaters } from '../../../src/index.js';

const CONFIG = {
  // All magic numbers go here
  perspective: 800,
  particleCount: 5000,
  baseHue: 135,  // Green
  // ...
};

class DayXXDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    // Camera setup
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      inertia: true,
      friction: 0.95,
      clampX: false,
    });
    this.camera.enableMouseControl(this.canvas);

    // Particle system
    this.particles = new ParticleSystem(this, { ... });
    this.pipeline.add(this.particles);

    // Input tracking
    this.canvas.addEventListener('mousemove', (e) => { ... });
    this.canvas.addEventListener('click', () => { ... });
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);
    // Animation logic using Motion.*
  }

  render() {
    // Motion blur trail
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Pipeline renders automatically via super.render() if needed
    // Or manual rendering with 3D projection
  }
}

export default function dayXX(canvas) {
  const game = new DayXXDemo(canvas);
  game.start();  // start() calls init() internally - don't call both!
  return { stop: () => game.stop(), game };
}
```

---

## Visual Style Guide

### Colors
- **Background**: `#000` (pure black)
- **Primary**: `#0f0` or `hsl(135, 100%, 50%)` (bright green)
- **Secondary**: `#0a0` or darker greens for depth
- **Reactive**: White (`#fff`) when mouse is near
- **Blend mode**: `"screen"` or `"lighter"` for additive glow

### Motion Blur Trail
```javascript
// Instead of ctx.clearRect(), use semi-transparent overlay
ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
ctx.fillRect(0, 0, w, h);
```

### Glow Effect
```javascript
const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
gradient.addColorStop(0, `hsla(135, 100%, 60%, 1)`);
gradient.addColorStop(0.4, `hsla(135, 100%, 50%, 0.4)`);
gradient.addColorStop(1, 'transparent');

ctx.fillStyle = gradient;
ctx.globalCompositeOperation = 'lighter';
ctx.beginPath();
ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
ctx.fill();
ctx.globalCompositeOperation = 'source-over';
```

---

## File Structure

```
genuary26/
├── index.html        # Main showcase page
├── genuary.css       # Terminal aesthetic styling
├── README.md         # This file
└── js/
    ├── main.js       # Bootstrap, scroll handling, lifecycle
    ├── prompts.js    # Day prompts data
    └── days/
        ├── day01.js  # "One color, one shape"
        ├── day02.js  # "Twelve principles of animation"
        ├── day03.js  # "Fibonacci forever"
        ├── day05.js  # "Write 'Genuary'. Avoid using a font."
        └── ...       # More days
```

---

## Checklist for Each Day

- [ ] Uses `ParticleSystem` or `Shapes`, NOT raw canvas drawing
- [ ] Uses `Motion.*` for animations, NOT hand-rolled interpolation
- [ ] Uses `Camera3D` with `clampX: false` for 3D demos
- [ ] `CONFIG` object contains ALL magic numbers
- [ ] Mouse reactivity (hover effects, click interactions)
- [ ] Green aesthetic (`hsl(135, ...)`)
- [ ] Motion blur trail (`rgba(0,0,0,0.15)`)
- [ ] Exports `{ stop: () => game.stop(), game }` for lifecycle

---

## Example: Day 5 - Particle Text

The prompt is "Write 'Genuary'. Avoid using a font."

**Proper Implementation:**
1. Define letters as 5x7 pixel grids (coordinate arrays)
2. Create `ParticleEmitter` for each pixel position
3. Use `Updaters.attract` to pull particles toward letter positions
4. Use `Camera3D` with free rotation for 3D effect
5. Custom updater for mouse repulsion
6. Motion.spring for staggered spawn animation
7. Particles form volumetric letters, not single points

**Key Points:**
- Particles should have varied Z positions (3D volume, not flat)
- Spawn from random 3D positions, fly into letter formation
- Mouse repels particles, they return to targets
- White glow when mouse is near

# FluidSystem

High-level fluid simulation system built on `ParticleSystem`.

Integrates SPH physics, collision detection, and boundary handling into a cohesive, configurable fluid simulation.

## Import

```javascript
import { FluidSystem } from "gcanvas";
```

## Basic Usage

```javascript
// Create a liquid simulation
const fluid = new FluidSystem(game, {
  maxParticles: 500,
  particleSize: 20,
  bounds: { x: 50, y: 50, w: 700, h: 500 },
  physics: 'liquid',
});

// Spawn particles
fluid.spawn(300);

// Add to game pipeline
game.pipeline.add(fluid);
```

## Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxParticles` | number | 500 | Maximum particle count |
| `particleSize` | number | 20 | Base particle diameter |
| `bounds` | Object | null | Containment bounds `{ x, y, w, h }` |
| `physics` | string | 'liquid' | Physics mode: `'liquid'`, `'gas'`, or `'blend'` |
| `gravity` | number | 200 | Gravity strength |
| `gravityEnabled` | boolean | true | Whether gravity is active |
| `damping` | number | 0.98 | Velocity damping per frame |
| `bounce` | number | 0.3 | Bounce factor on collision |
| `maxSpeed` | number | 400 | Maximum particle speed |

### Fluid Sub-Options (`options.fluid`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `smoothingRadius` | number | particleSize * 2 | SPH smoothing radius |
| `restDensity` | number | 3.0 | Target density |
| `pressureStiffness` | number | 80 | Pressure force multiplier |
| `nearPressureStiffness` | number | 3 | Near pressure multiplier |
| `viscosity` | number | 0.005 | Viscosity strength |

### Collision Sub-Options (`options.collision`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable particle collision |
| `strength` | number | 5000 | Collision repulsion strength |

### Boundary Sub-Options (`options.boundary`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable boundary forces |
| `strength` | number | 4000 | Boundary repulsion strength |
| `radius` | number | particleSize * 0.8 | Boundary force range |

## Methods

### spawn(count, options?)

Spawn particles within the bounds or at a specified position.

```javascript
// Spawn at bounds center (default)
fluid.spawn(200);

// Spawn at specific position
fluid.spawn(100, { x: 400, y: 300, spreadX: 50, spreadY: 50 });
```

### setBounds(bounds)

Update containment bounds.

```javascript
fluid.setBounds({ x: 100, y: 100, w: 600, h: 400 });
```

### reset()

Reset all particles to initial spawn positions.

```javascript
fluid.reset();
```

### toggleGravity()

Toggle gravity on/off. Returns new state.

```javascript
const gravityOn = fluid.toggleGravity();
```

### setPhysicsMode(mode)

Switch physics mode.

```javascript
fluid.setPhysicsMode('liquid');  // SPH fluid
fluid.setPhysicsMode('gas');     // Gas dynamics
fluid.setPhysicsMode(0.5);       // 50% blend
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `particles` | Array | Live particle array |
| `bounds` | Object | Current bounds `{ x, y, w, h }` |
| `gravityEnabled` | boolean | Gravity state |
| `physicsBlend` | number | 0 = liquid, 1 = gas |
| `config` | Object | Merged configuration |

## Example: Complete Demo

```javascript
import { Game, FluidSystem, FPSCounter } from "gcanvas";

class FluidDemo extends Game {
  init() {
    super.init();
    
    // Create fluid system
    this.fluid = new FluidSystem(this, {
      maxParticles: 400,
      particleSize: 25,
      bounds: { x: 50, y: 50, w: this.width - 100, h: this.height - 100 },
      physics: 'liquid',
      gravity: 200,
    });
    
    this.fluid.spawn(400);
    this.pipeline.add(this.fluid);
    this.pipeline.add(new FPSCounter(this));
    
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'g') this.fluid.toggleGravity();
      if (e.key === 'r') this.fluid.reset();
    });
  }
}
```

## Integration with Existing Code

FluidSystem reuses existing modules:

- `ParticleSystem` - Base particle management
- `Collision.applyCircleSeparation()` - Particle-particle collision
- `computeFluidForces()` - SPH physics from `math/fluid.js`
- `computeGasForces()` - Gas dynamics from `math/fluid.js`

## Performance Notes

- O(n²) collision detection is used for simplicity
- For >1000 particles, consider spatial hashing optimization
- The `blendMode: 'source-over'` default prevents washed-out colors


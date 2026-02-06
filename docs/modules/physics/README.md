# Physics Module

The Physics module provides particle dynamics for realistic simulations. It includes collision detection, elastic collision response with momentum conservation, boundary bouncing, and force calculations.

## Quick Start

```javascript
import { 
  ParticleSystem, 
  Updaters, 
  Physics, 
  PhysicsUpdaters 
} from '@guinetik/gcanvas';

// Create particle system with physics
const particles = new ParticleSystem(game, {
  maxParticles: 1000,
  updaters: [
    Updaters.velocity,
    Updaters.lifetime,
    PhysicsUpdaters.particleCollisions(0.9),
    PhysicsUpdaters.bounds3D({ minX: 0, maxX: 800, minY: 0, maxY: 600 }),
    PhysicsUpdaters.gravity(0, 200, 0),
  ]
});
```

## Core Classes

### Physics (Static Utility Class)

Stateless physics calculations. All methods are pure functions.

#### Collision Detection

```javascript
// Check if two particles are colliding
const collision = Physics.checkCollision(p1, p2, threshold);
// Returns: { dist, overlap, dx, dy, dz } or null

// Calculate elastic collision response
const response = Physics.elasticCollision(p1, p2, collision, restitution);
// Returns: { v1: {vx, vy, vz}, v2: {vx, vy, vz} } or null

// Separate overlapping particles
Physics.separate(p1, p2, collision, separationFactor);
```

#### Boundary Collision

```javascript
// Box boundaries
const hit = Physics.boundsCollision(particle, {
  minX: 0, maxX: 800,
  minY: 0, maxY: 600,
  minZ: -200, maxZ: 200  // Optional for 3D
}, restitution);

// Spherical boundary
Physics.sphereBoundsCollision(particle, {
  x: 400, y: 300, z: 0,
  radius: 200
}, restitution, inside);
```

#### Force Calculations

```javascript
// Inverse-square attraction (like gravity)
const force = Physics.attract(p1, p2, strength, minDist);
// Returns: { fx, fy, fz, dist }

// Linear attraction (constant force)
const force = Physics.attractLinear(p1, p2, strength);

// Apply force to particle
Physics.applyForce(particle, fx, fy, fz, dt);
```

#### Kinematics

```javascript
// Kinetic energy: 0.5 * m * v²
const ke = Physics.kineticEnergy(particle);

// Speed (velocity magnitude)
const speed = Physics.speed(particle);

// Distance between particles
const dist = Physics.distance(p1, p2);
const distSq = Physics.distanceSquared(p1, p2); // Faster

// Limit velocity
Physics.clampVelocity(particle, maxSpeed);
```

### PhysicsUpdaters

Composable updaters for ParticleSystem integration.

#### Mutual Forces

```javascript
// Gravity-like attraction between all particles
PhysicsUpdaters.mutualAttraction(strength, cutoffDistance, minDistance)

// Linear attraction (constant force, not inverse-square)
PhysicsUpdaters.mutualAttractionLinear(strength, cutoffDistance)

// Attract to a point
PhysicsUpdaters.attractToPoint(target, strength, minDist)
```

#### Collisions

```javascript
// Elastic particle-particle collisions
PhysicsUpdaters.particleCollisions(restitution, threshold)

// Soft separation (lighter weight than full collisions)
PhysicsUpdaters.separation(strength, threshold)
```

#### Boundaries

```javascript
// Box boundary with bounce
PhysicsUpdaters.bounds3D(bounds, restitution)

// Spherical containment
PhysicsUpdaters.sphereBounds(sphere, restitution)
```

#### Environmental Forces

```javascript
// Uniform gravity
PhysicsUpdaters.gravity(gx, gy, gz)

// Velocity drag
PhysicsUpdaters.drag(coefficient)

// Max speed limit
PhysicsUpdaters.maxSpeed(maxSpeed)

// Thermal motion (random jitter)
PhysicsUpdaters.thermal(temperature, scale)

// Orbital motion around center
PhysicsUpdaters.orbital(center, strength)
```

## Particle Properties for Physics

For physics calculations, particles should have:

```javascript
{
  // Position
  x, y, z,
  
  // Velocity
  vx, vy, vz,
  
  // Size for collision detection
  size: 10,  // or radius
  
  // Mass (optional, defaults to 1)
  mass: 1.0,
  // OR
  custom: { mass: 1.0 }
}
```

## Examples

### Bouncing Balls

```javascript
const particles = new ParticleSystem(game, {
  maxParticles: 100,
  updaters: [
    Updaters.velocity,
    Updaters.lifetime,
    PhysicsUpdaters.gravity(0, 400, 0),
    PhysicsUpdaters.particleCollisions(0.8),
    PhysicsUpdaters.bounds3D({
      minX: 0, maxX: game.width,
      minY: 0, maxY: game.height
    }, 0.9),
  ]
});

// Spawn balls with mass
const emitter = new ParticleEmitter({
  rate: 0,
  lifetime: { min: 30, max: 60 },
  size: { min: 10, max: 30 },
  velocity: { x: 0, y: 0, spread: 100 },
});
emitter.emit = (p) => {
  // Default emit
  ParticleEmitter.prototype.emit.call(emitter, p);
  // Add mass based on size
  p.custom.mass = p.size / 10;
};
```

### Gravitational N-Body

```javascript
const particles = new ParticleSystem(game, {
  maxParticles: 50,
  updaters: [
    Updaters.velocity,
    PhysicsUpdaters.mutualAttraction(500, 500, 20),
    PhysicsUpdaters.particleCollisions(0.5),
    PhysicsUpdaters.maxSpeed(300),
  ]
});
```

### Thermal Gas

```javascript
let temperature = 1.0;

const particles = new ParticleSystem(game, {
  maxParticles: 500,
  updaters: [
    Updaters.velocity,
    PhysicsUpdaters.thermal(() => temperature, 20),
    PhysicsUpdaters.separation(50, 1.5),
    PhysicsUpdaters.sphereBounds({ x: 400, y: 300, z: 0, radius: 200 }, 0.95),
    Updaters.damping(0.99),
  ]
});

// Adjust temperature over time
temperature = Math.sin(time) * 0.5 + 0.5;
```

## Performance Tips

1. **Use distance cutoffs**: `mutualAttraction(100, 200)` only calculates forces within 200px
2. **Use squared distance**: `Physics.distanceSquared()` avoids sqrt
3. **Limit particle count**: Physics is O(n²) for mutual interactions
4. **Use separation instead of collisions**: Lighter weight for soft effects
5. **Enable WebGL rendering**: GPU rendering handles more particles visually

## Physics Formulas

### Elastic Collision
```
Impulse = -(1 + e) * v_rel / (1/m1 + 1/m2)
v1' = v1 + impulse/m1 * n
v2' = v2 - impulse/m2 * n
```

### Inverse Square Force
```
F = G * m1 * m2 / r²
```

### Kinetic Energy
```
KE = 0.5 * m * v²
```

## See Also

- [Particle Module](../particle/README.md) - ParticleSystem integration
- [Heat Module](../math/heat.md) - Thermal dynamics and buoyancy
- [Fluid Dynamics](../../fluid-dynamics.md) - SPH fluid/gas simulation
- [WebGL Module](../webgl/README.md) - GPU-accelerated particle rendering

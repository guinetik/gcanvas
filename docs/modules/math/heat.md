# Heat Dynamics Module

Particle-based heat physics for simulating thermal behavior like lava lamps, fluid convection, and thermal particle systems.

## Quick Start

```javascript
import {
  zoneTemperature,
  thermalBuoyancy,
  thermalGravity,
  heatTransfer,
  applyParticleHeatTransfer
} from '@guinetik/gcanvas';

// Update particle temperature based on position
particle.temp = zoneTemperature(particle.y / canvasHeight, particle.temp, {
  heatZone: 0.92,   // Bottom 8% is hot
  coolZone: 0.2,    // Top 20% is cold
  rate: 0.0055
});

// Apply buoyancy (hot rises, cold sinks)
const lift = thermalBuoyancy(particle.temp, 0.5, 0.00018);
particle.vy -= lift;
```

## Core API

### Temperature Functions

#### zoneTemperature(position, currentTemp, config)

Calculate temperature change based on position in thermal zones. Uses smooth transitions for realistic heat gradients.

```javascript
const temp = zoneTemperature(normalizedY, currentTemp, {
  heatZone: 0.92,      // Y position where heating begins (0-1)
  coolZone: 0.2,       // Y position where cooling begins (0-1)
  rate: 0.0055,        // Base temperature change rate
  heatMultiplier: 1.5, // Heating rate multiplier
  coolMultiplier: 1.5, // Cooling rate multiplier
  middleMultiplier: 0.05, // Middle zone rate
  transitionWidth: 0.1 // Smooth transition width
});
```

**Zone Layout (normalized y: 0 = top, 1 = bottom):**
- **Cool zone**: y < coolZone (temperature approaches 0)
- **Middle zone**: between coolZone and heatZone (linear gradient)
- **Heat zone**: y > heatZone (temperature approaches 1)

### Buoyancy Functions

#### thermalBuoyancy(temperature, neutralTemp, strength)

Calculate buoyancy force from temperature differential. Hot particles rise, cold particles sink.

```javascript
// Hot particle rises (negative velocity = up)
const lift = thermalBuoyancy(0.9, 0.5, 0.00018);
particle.vy -= lift;

// Cold particle sinks (positive velocity = down)
const sink = thermalBuoyancy(0.2, 0.5, 0.00018);
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `temperature` | number | Particle temperature [0, 1] |
| `neutralTemp` | number | Temperature where buoyancy = 0 (typically 0.5) |
| `strength` | number | Buoyancy force coefficient |

**Returns:** Velocity adjustment (negative = rise, positive = sink)

#### thermalGravity(radius, baseRadius, gravity)

Calculate weight-adjusted gravity. Larger particles experience more gravitational pull.

```javascript
const weight = thermalGravity(particle.radius, 0.04, 0.000052);
particle.vy += weight;
```

### Heat Transfer Functions

#### heatTransfer(temp1, temp2, distance, maxDistance, rate)

Calculate heat transfer between two particles using Newton's law of cooling.

```javascript
const dist = Math.sqrt(dx*dx + dy*dy);
const maxDist = (p1.r + p2.r) * 1.5;
const delta = heatTransfer(p1.temp, p2.temp, dist, maxDist, 0.0022);
p1.temp += delta;
p2.temp -= delta; // Energy conservation
```

#### heatTransferFalloff(temp1, temp2, distance, maxDistance, rate, falloff)

Heat transfer with distance falloff for more realistic localized behavior.

```javascript
// Linear falloff (default)
const delta = heatTransferFalloff(t1, t2, dist, maxDist, 0.003, 1);

// Quadratic falloff (more localized)
const delta = heatTransferFalloff(t1, t2, dist, maxDist, 0.003, 2);
```

### Particle System Integration

#### applyParticleHeatTransfer(particles, options)

Apply heat transfer between nearby particles. Follows the same pattern as `Collision.applyCircleSeparation`.

```javascript
applyParticleHeatTransfer(particles, {
  maxDistance: 50,          // Max distance for transfer
  rate: 0.01,               // Transfer rate coefficient
  falloff: 1,               // Distance falloff (1=linear, 2=quadratic)
  temperatureKey: 'temperature', // Key in particle.custom
  filter: null,             // Optional filter function
  useSizeAsRadius: true     // Use particle.size for distance calc
});
```

**With filter (Maxwell's Demon pattern):**

```javascript
applyParticleHeatTransfer(particles, {
  maxDistance: 36,
  rate: 0.015,
  filter: (p) => !p.custom.sorted, // Exclude sorted particles
});
```

## Example: Lava Lamp Simulation

```javascript
const CONFIG = {
  heat: {
    heatZone: 0.92,
    coolZone: 0.2,
    rate: 0.0055,
    buoyancy: 0.00018,
    gravity: 0.000052,
  }
};

class LavaLamp extends Game {
  update(dt) {
    super.update(dt);

    for (const blob of this.blobs) {
      // Normalize Y position (0 = top, 1 = bottom)
      const normalizedY = blob.y / this.height;

      // Update temperature based on zone
      blob.temp = zoneTemperature(normalizedY, blob.temp, {
        heatZone: CONFIG.heat.heatZone,
        coolZone: CONFIG.heat.coolZone,
        rate: CONFIG.heat.rate
      });

      // Apply buoyancy (hot rises)
      const buoyancy = thermalBuoyancy(blob.temp, 0.5, CONFIG.heat.buoyancy);
      blob.vy -= buoyancy;

      // Apply weight-based gravity
      const weight = thermalGravity(blob.r, 0.04, CONFIG.heat.gravity);
      blob.vy += weight;
    }

    // Heat transfer between nearby blobs
    applyParticleHeatTransfer(this.blobs, {
      maxDistance: 40,
      rate: 0.02,
      temperatureKey: 'temp'
    });
  }
}
```

## Coupling with Fluid Dynamics

The heat module pairs with `src/math/fluid.js` for thermal buoyancy in fluid simulations:

```javascript
import { computeThermalBuoyancy } from '@guinetik/gcanvas';

// Assign temperature to particles
for (const p of particles) {
  p.custom.temperature = zoneTemperature(
    p.y / height,
    p.custom.temperature || 0.5,
    heatConfig
  );
}

// Compute buoyancy forces
const buoyancyForces = computeThermalBuoyancy(particles, {
  gas: { buoyancy: 260, neutralTemperature: 0.5 }
});

// Add to fluid forces
for (let i = 0; i < particles.length; i++) {
  fluidForces[i].y += buoyancyForces[i].y;
}
```

## Temperature Visualization

Map temperature to color using HSL:

```javascript
function tempToColor(temp) {
  // Hot = red (0), Neutral = yellow (60), Cold = blue (240)
  const hue = (1 - temp) * 240;
  return `hsl(${hue}, 80%, 50%)`;
}

// In render
ctx.fillStyle = tempToColor(particle.temp);
```

## See Also

- [Fluid Dynamics](../../fluid-dynamics.md) - SPH fluid/gas simulation
- [Particle Module](../particle/README.md) - ParticleSystem integration
- [Physics Module](../physics/README.md) - Collision detection

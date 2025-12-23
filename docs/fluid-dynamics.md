# Fluid & Gas Dynamics (Math-Only)

Pure math helpers for SPH-style liquids and lightweight gas simulation. The math stays in `src/math/fluid.js`; consumers (games/demos) are responsible for applying forces to their particles.

## What’s Included
- SPH density, pressure, and viscosity kernels (`computeDensities`, `computePressures`, `computeFluidForces`).
- Simplified gas mixing with diffusion/pressure/turbulence (`computeGasForces`).
- Thermal buoyancy coupling (`computeThermalBuoyancy`) that pairs with `src/math/heat.js`.
- Force blending and pure Euler integration (`blendForces`, `integrateEuler`).
- Config factory with no magic numbers (`getDefaultFluidConfig`).

## Config
Defined in `src/math/fluid.js` and merged via `mergeConfig` internally.

```js
const CONFIG = {
  kernel: { smoothingRadius: 28 },
  fluid: {
    restDensity: 1.1,
    particleMass: 1,
    pressureStiffness: 1800,
    viscosity: 0.18,
    surfaceTension: 0,
    maxForce: 6000,
  },
  gas: {
    interactionRadius: 34,
    pressure: 12,
    diffusion: 0.08,
    drag: 0.04,
    buoyancy: 260,
    neutralTemperature: 0.5,
    turbulence: 16,
  },
  external: { gravity: { x: 0, y: 820 } },
};
```

Override by passing `{ fluid: { … }, gas: { … }, kernel: { … } }` to any helper.

## Particle Shape
Any object with `{ x, y, vx, vy, size?, mass?, custom? }`. Mass is resolved from:
`custom.mass` → `mass` → `size` → `config.fluid.particleMass`.

## Core API (pure)
- `computeDensities(particles, cfg?)` → `Float32Array densities`.
- `computePressures(densities, cfg?)` → `Float32Array pressures`.
- `computeFluidForces(particles, cfg?)` → `{ forces, densities, pressures }`.
- `computeGasForces(particles, cfg?)` → `{ forces }`.
- `computeThermalBuoyancy(particles, cfg?)` → `forces[]` using `temperature` or `custom.temperature`.
- `blendForces(a, b, t)` → lerped forces.
- `integrateEuler(particles, forces, dt, cfg?)` → new `{ x, y, vx, vy }[]` (no mutation).

## Applying in a Game (pattern)
1) Build forces:

```js
import { computeFluidForces, computeGasForces, blendForces, computeThermalBuoyancy } from "../../src/math/fluid.js";

const liquid = computeFluidForces(particles, { kernel: { smoothingRadius: 26 } });
const gas = computeGasForces(particles, { gas: { interactionRadius: 40 } });
const buoyancy = computeThermalBuoyancy(particles);

// Combine as you see fit (example: mix liquid & gas modes, then add buoyancy)
const mixed = blendForces(liquid.forces, gas.forces, modeT); // modeT: 0..1
for (let i = 0; i < particles.length; i++) {
  mixed[i].x += buoyancy[i].x;
  mixed[i].y += buoyancy[i].y;
}
```

2) Apply to your particles (consumer-controlled):

```js
// Mutate in your game loop; math module stays pure.
for (let i = 0; i < particles.length; i++) {
  const p = particles[i];
  const f = mixed[i];
  const mass = p.custom.mass ?? 1;
  p.vx += (f.x / mass) * dt;
  p.vy += (f.y / mass) * dt;
}
```

3) Let your normal updaters move/render (e.g., `ParticleSystem` velocity updater).

## Heat Coupling
Assign `p.temperature` or `p.custom.temperature` each frame (e.g., via `heat.zoneTemperature`). Pass the same particles to `computeThermalBuoyancy` and add the resulting forces.

## Notes & Tips
- Keep `smoothingRadius` proportional to particle spacing (roughly 2–3× average spacing).
- Clamp velocities in the consumer if you target 10k–20k particles to keep the frame budget.
- For gases, favor lower `pressure` and higher `diffusion` to avoid jitter.
- The math never allocates inside the hot path besides output arrays; reuse them between frames if you need fewer allocations (pass your own particles array). 


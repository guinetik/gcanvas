/**
 * @module physics/physics-updaters
 * @description Composable physics updaters for ParticleSystem.
 * 
 * These updaters add physics behavior to particles:
 * - Mutual attraction/repulsion between particles
 * - Particle-particle elastic collisions
 * - 3D boundary bouncing
 * - Gravity fields
 * 
 * @example
 * import { ParticleSystem, PhysicsUpdaters } from '@guinetik/gcanvas';
 * 
 * const system = new ParticleSystem(game, {
 *   updaters: [
 *     Updaters.velocity,
 *     Updaters.lifetime,
 *     PhysicsUpdaters.mutualAttraction(50, 100),
 *     PhysicsUpdaters.particleCollisions(0.9),
 *     PhysicsUpdaters.bounds3D({ minX: 0, maxX: 800, minY: 0, maxY: 600, minZ: -200, maxZ: 200 }),
 *   ]
 * });
 */

import { Physics } from './physics.js';

/**
 * Physics updaters for ParticleSystem
 */
export const PhysicsUpdaters = {
  /**
   * Apply mutual attraction/repulsion between all particles.
   * Uses inverse-square law (like gravity).
   * 
   * @param {number} [strength=100] - Force strength (positive=attract, negative=repel)
   * @param {number} [cutoffDistance=200] - Max distance for force calculation (optimization)
   * @param {number} [minDistance=5] - Minimum distance to prevent extreme forces
   * @returns {Function} Updater function
   * 
   * @example
   * PhysicsUpdaters.mutualAttraction(50, 150) // Gravity-like attraction
   * PhysicsUpdaters.mutualAttraction(-100, 100) // Repulsion
   */
  mutualAttraction: (strength = 100, cutoffDistance = 200, minDistance = 5) => {
    const cutoffSq = cutoffDistance * cutoffDistance;
    
    return (p, dt, system) => {
      if (!p.alive) return;
      
      const particles = system.particles;
      const mass1 = p.mass ?? p.custom?.mass ?? 1;
      
      for (let i = 0; i < particles.length; i++) {
        const other = particles[i];
        if (other === p || !other.alive) continue;
        
        // Quick distance check (squared for performance)
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const dz = (other.z || 0) - (p.z || 0);
        const distSq = dx * dx + dy * dy + dz * dz;
        
        if (distSq > cutoffSq || distSq < 0.01) continue;
        
        const dist = Math.sqrt(distSq);
        const safeDist = Math.max(dist, minDistance);
        
        // Mass-weighted force: F = G * m1 * m2 / r²
        const mass2 = other.mass ?? other.custom?.mass ?? 1;
        const force = (strength * mass1 * mass2) / (safeDist * safeDist);
        
        // Apply to velocity (normalized direction * force * dt)
        const f = force * dt / dist;
        p.vx += dx * f;
        p.vy += dy * f;
        if (p.vz !== undefined) p.vz += dz * f;
      }
    };
  },

  /**
   * Apply linear mutual attraction/repulsion (constant force, not inverse-square).
   * 
   * @param {number} [strength=50] - Force strength
   * @param {number} [cutoffDistance=100] - Max distance for force
   * @returns {Function} Updater function
   */
  mutualAttractionLinear: (strength = 50, cutoffDistance = 100) => {
    const cutoffSq = cutoffDistance * cutoffDistance;
    
    return (p, dt, system) => {
      if (!p.alive) return;
      
      for (const other of system.particles) {
        if (other === p || !other.alive) continue;
        
        const dx = other.x - p.x;
        const dy = other.y - p.y;
        const dz = (other.z || 0) - (p.z || 0);
        const distSq = dx * dx + dy * dy + dz * dz;
        
        if (distSq > cutoffSq || distSq < 0.01) continue;
        
        const dist = Math.sqrt(distSq);
        const f = strength * dt / dist;
        
        p.vx += dx * f;
        p.vy += dy * f;
        if (p.vz !== undefined) p.vz += dz * f;
      }
    };
  },

  /**
   * Handle particle-particle elastic collisions with momentum conservation.
   * 
   * @param {number} [restitution=0.9] - Bounciness (0-1)
   * @param {number} [threshold=1.0] - Collision distance multiplier
   * @returns {Function} Updater function
   * 
   * @example
   * PhysicsUpdaters.particleCollisions(0.95) // High bounce
   * PhysicsUpdaters.particleCollisions(0.5)  // Low bounce (more energy loss)
   */
  particleCollisions: (restitution = 0.9, threshold = 1.0) => {
    // Track processed pairs to avoid double-processing
    const processedPairs = new Set();
    
    return (p, dt, system) => {
      if (!p.alive) return;
      
      // Clear set at start of new frame (check first particle)
      if (system.particles.indexOf(p) === 0) {
        processedPairs.clear();
      }
      
      const pIndex = system.particles.indexOf(p);
      
      for (let i = pIndex + 1; i < system.particles.length; i++) {
        const other = system.particles[i];
        if (!other.alive) continue;
        
        // Create unique pair key
        const pairKey = `${pIndex}-${i}`;
        if (processedPairs.has(pairKey)) continue;
        
        const collision = Physics.checkCollision(p, other, threshold);
        if (collision) {
          processedPairs.add(pairKey);
          
          // Separate overlapping particles
          Physics.separate(p, other, collision, 0.5);
          
          // Apply elastic collision response
          const response = Physics.elasticCollision(p, other, collision, restitution);
          if (response) {
            p.vx = response.v1.vx;
            p.vy = response.v1.vy;
            p.vz = response.v1.vz;
            
            other.vx = response.v2.vx;
            other.vy = response.v2.vy;
            other.vz = response.v2.vz;
          }
        }
      }
    };
  },

  /**
   * Bounce particles off 3D box boundaries.
   * 
   * @param {Object} bounds - Boundary box
   * @param {number} bounds.minX - Left boundary
   * @param {number} bounds.maxX - Right boundary
   * @param {number} bounds.minY - Top boundary
   * @param {number} bounds.maxY - Bottom boundary
   * @param {number} [bounds.minZ] - Near boundary (optional for 3D)
   * @param {number} [bounds.maxZ] - Far boundary (optional for 3D)
   * @param {number} [restitution=0.9] - Bounciness
   * @returns {Function} Updater function
   */
  bounds3D: (bounds, restitution = 0.9) => (p, dt) => {
    if (!p.alive) return;
    Physics.boundsCollision(p, bounds, restitution);
  },

  /**
   * Bounce particles inside a spherical boundary.
   * 
   * @param {Object} sphere - Sphere definition
   * @param {number} sphere.x - Center X
   * @param {number} sphere.y - Center Y
   * @param {number} [sphere.z=0] - Center Z
   * @param {number} sphere.radius - Sphere radius
   * @param {number} [restitution=0.9] - Bounciness
   * @returns {Function} Updater function
   */
  sphereBounds: (sphere, restitution = 0.9) => (p, dt) => {
    if (!p.alive) return;
    Physics.sphereBoundsCollision(p, sphere, restitution, true);
  },

  /**
   * Attract particles toward a point.
   * 
   * @param {Object|Function} target - Target {x, y, z} or function returning target
   * @param {number} [strength=100] - Attraction strength
   * @param {number} [minDist=10] - Minimum distance
   * @returns {Function} Updater function
   */
  attractToPoint: (target, strength = 100, minDist = 10) => (p, dt) => {
    if (!p.alive) return;
    const t = typeof target === 'function' ? target() : target;
    const force = Physics.attract(p, t, strength, minDist);
    p.vx += force.fx * dt;
    p.vy += force.fy * dt;
    if (p.vz !== undefined) p.vz += force.fz * dt;
  },

  /**
   * Apply uniform gravity (constant downward acceleration).
   * 
   * @param {number} [gx=0] - Gravity X component
   * @param {number} [gy=200] - Gravity Y component (positive = down)
   * @param {number} [gz=0] - Gravity Z component
   * @returns {Function} Updater function
   */
  gravity: (gx = 0, gy = 200, gz = 0) => (p, dt) => {
    if (!p.alive) return;
    p.vx += gx * dt;
    p.vy += gy * dt;
    if (p.vz !== undefined) p.vz += gz * dt;
  },

  /**
   * Clamp particle velocity to a maximum speed.
   * 
   * @param {number} maxSpeed - Maximum speed
   * @returns {Function} Updater function
   */
  maxSpeed: (maxSpeed) => (p, dt) => {
    if (!p.alive) return;
    Physics.clampVelocity(p, maxSpeed);
  },

  /**
   * Apply drag/friction proportional to velocity squared.
   * 
   * @param {number} [coefficient=0.01] - Drag coefficient
   * @returns {Function} Updater function
   */
  drag: (coefficient = 0.01) => (p, dt) => {
    if (!p.alive) return;
    const speed = Physics.speed(p);
    if (speed > 0.01) {
      const dragForce = coefficient * speed * speed;
      const dragFactor = Math.max(0, 1 - (dragForce * dt / speed));
      p.vx *= dragFactor;
      p.vy *= dragFactor;
      if (p.vz !== undefined) p.vz *= dragFactor;
    }
  },

  /**
   * Apply separation force to prevent particle overlap.
   * Lighter-weight alternative to full collision response.
   * 
   * @param {number} [strength=100] - Separation force strength
   * @param {number} [threshold=1.2] - How close before separating (multiplier of combined radii)
   * @returns {Function} Updater function
   */
  separation: (strength = 100, threshold = 1.2) => (p, dt, system) => {
    if (!p.alive) return;
    
    for (const other of system.particles) {
      if (other === p || !other.alive) continue;
      
      const collision = Physics.checkCollision(p, other, threshold);
      if (collision) {
        // Repulsion force based on overlap
        const force = strength * collision.overlap;
        const nx = -collision.dx / collision.dist;
        const ny = -collision.dy / collision.dist;
        const nz = -collision.dz / collision.dist;
        
        p.vx += nx * force * dt;
        p.vy += ny * force * dt;
        if (p.vz !== undefined) p.vz += nz * force * dt;
      }
    }
  },

  /**
   * Apply thermal motion (random velocity jitter based on temperature).
   * 
   * @param {number|Function} temperature - Temperature value or function returning temperature
   * @param {number} [scale=10] - Scale factor for jitter
   * @returns {Function} Updater function
   */
  thermal: (temperature, scale = 10) => (p, dt) => {
    if (!p.alive) return;
    const temp = typeof temperature === 'function' ? temperature() : temperature;
    const jitter = temp * scale * dt;
    p.vx += (Math.random() - 0.5) * jitter;
    p.vy += (Math.random() - 0.5) * jitter;
    if (p.vz !== undefined) p.vz += (Math.random() - 0.5) * jitter;
  },

  /**
   * Orbital motion around a center point.
   * Applies centripetal force for stable orbits.
   * 
   * @param {Object} center - Orbit center {x, y, z}
   * @param {number} [strength=100] - Orbital force strength
   * @returns {Function} Updater function
   */
  orbital: (center, strength = 100) => (p, dt) => {
    if (!p.alive) return;
    
    const dx = center.x - p.x;
    const dy = center.y - p.y;
    const dz = (center.z || 0) - (p.z || 0);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    
    // Centripetal force = v² / r, but we use strength as a constant
    const force = strength / dist;
    
    p.vx += (dx / dist) * force * dt;
    p.vy += (dy / dist) * force * dt;
    if (p.vz !== undefined) p.vz += (dz / dist) * force * dt;
  },
};

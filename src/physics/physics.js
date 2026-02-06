/**
 * @module physics/physics
 * @description Stateless physics calculations for particle systems.
 * 
 * Provides core physics primitives:
 * - Collision detection (particle-particle, particle-boundary)
 * - Elastic collision response with momentum conservation
 * - Force calculations (attraction, repulsion, gravity)
 * - Kinetic energy calculations
 * 
 * All methods are static and pure - no internal state.
 * 
 * @example
 * import { Physics } from '@guinetik/gcanvas';
 * 
 * // Check collision between two particles
 * const collision = Physics.checkCollision(p1, p2);
 * if (collision) {
 *   const response = Physics.elasticCollision(p1, p2, collision);
 *   if (response) {
 *     Object.assign(p1, response.v1);
 *     Object.assign(p2, response.v2);
 *   }
 * }
 */

/**
 * Physics - Stateless physics calculations
 * @class
 */
export class Physics {
  /**
   * Calculate attraction/repulsion force between two points using inverse square law.
   * @param {Object} p1 - First position {x, y, z}
   * @param {Object} p2 - Second position {x, y, z}
   * @param {number} [strength=100] - Force multiplier (positive=attract, negative=repel)
   * @param {number} [minDist=1] - Minimum distance to prevent infinite force
   * @returns {{fx: number, fy: number, fz: number, dist: number}} Force vector and distance
   */
  static attract(p1, p2, strength = 100, minDist = 1) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);

    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq) || minDist;
    const safeDist = Math.max(dist, minDist);

    // Inverse square law: F = strength / dist^2
    const force = strength / (safeDist * safeDist);

    // Normalize direction and apply force
    return {
      fx: (dx / dist) * force,
      fy: (dy / dist) * force,
      fz: (dz / dist) * force,
      dist: dist,
    };
  }

  /**
   * Calculate linear attraction force (constant strength, not inverse square).
   * @param {Object} p1 - First position {x, y, z}
   * @param {Object} p2 - Second position {x, y, z}
   * @param {number} [strength=100] - Force multiplier
   * @returns {{fx: number, fy: number, fz: number, dist: number}} Force vector and distance
   */
  static attractLinear(p1, p2, strength = 100) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    return {
      fx: (dx / dist) * strength,
      fy: (dy / dist) * strength,
      fz: (dz / dist) * strength,
      dist: dist,
    };
  }

  /**
   * Check if two particles are colliding based on their sizes.
   * @param {Object} p1 - First particle {x, y, z, size}
   * @param {Object} p2 - Second particle {x, y, z, size}
   * @param {number} [threshold=1.0] - Collision distance multiplier
   * @returns {{dist: number, overlap: number, dx: number, dy: number, dz: number}|null} Collision data or null
   */
  static checkCollision(p1, p2, threshold = 1.0) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const r1 = (p1.size || p1.radius || 1);
    const r2 = (p2.size || p2.radius || 1);
    const collisionDist = (r1 + r2) * threshold;

    if (dist < collisionDist && dist > 0) {
      return {
        dist: dist,
        overlap: collisionDist - dist,
        dx: dx,
        dy: dy,
        dz: dz,
      };
    }
    return null;
  }

  /**
   * Calculate elastic collision response with conservation of momentum.
   * @param {Object} p1 - First particle {vx, vy, vz, mass}
   * @param {Object} p2 - Second particle {vx, vy, vz, mass}
   * @param {Object} collision - Collision data from checkCollision
   * @param {number} [restitution=0.9] - Coefficient of restitution (0-1, 1=perfectly elastic)
   * @returns {{v1: {vx, vy, vz}, v2: {vx, vy, vz}}|null} New velocities or null if separating
   */
  static elasticCollision(p1, p2, collision, restitution = 0.9) {
    const m1 = p1.mass ?? p1.custom?.mass ?? 1;
    const m2 = p2.mass ?? p2.custom?.mass ?? 1;
    const totalMass = m1 + m2;

    // Normalize collision axis
    const dist = collision.dist || 1;
    const nx = collision.dx / dist;
    const ny = collision.dy / dist;
    const nz = collision.dz / dist;

    // Relative velocity along collision axis
    const dvx = p1.vx - p2.vx;
    const dvy = p1.vy - p2.vy;
    const dvz = (p1.vz || 0) - (p2.vz || 0);
    const relVel = dvx * nx + dvy * ny + dvz * nz;

    // Don't resolve if already moving apart
    if (relVel < 0) {
      return null;
    }

    // Impulse magnitude (conservation of momentum + restitution)
    const impulse = (-(1 + restitution) * relVel) / totalMass;

    return {
      v1: {
        vx: p1.vx + impulse * m2 * nx,
        vy: p1.vy + impulse * m2 * ny,
        vz: (p1.vz || 0) + impulse * m2 * nz,
      },
      v2: {
        vx: p2.vx - impulse * m1 * nx,
        vy: p2.vy - impulse * m1 * ny,
        vz: (p2.vz || 0) - impulse * m1 * nz,
      },
    };
  }

  /**
   * Separate two overlapping particles to prevent sticking.
   * @param {Object} p1 - First particle {x, y, z}
   * @param {Object} p2 - Second particle {x, y, z}
   * @param {Object} collision - Collision data from checkCollision
   * @param {number} [separationFactor=0.5] - How much overlap to resolve (0-1)
   */
  static separate(p1, p2, collision, separationFactor = 0.5) {
    const m1 = p1.mass ?? p1.custom?.mass ?? 1;
    const m2 = p2.mass ?? p2.custom?.mass ?? 1;
    const totalMass = m1 + m2;

    const dist = collision.dist || 1;
    const nx = collision.dx / dist;
    const ny = collision.dy / dist;
    const nz = collision.dz / dist;

    const separation = collision.overlap * separationFactor;

    // Move particles apart proportional to inverse mass
    const move1 = separation * (m2 / totalMass);
    const move2 = separation * (m1 / totalMass);

    p1.x -= nx * move1;
    p1.y -= ny * move1;
    if (p1.z !== undefined) p1.z -= nz * move1;

    p2.x += nx * move2;
    p2.y += ny * move2;
    if (p2.z !== undefined) p2.z += nz * move2;
  }

  /**
   * Check and respond to 3D boundary collision with bounce.
   * @param {Object} p - Particle {x, y, z, vx, vy, vz, size}
   * @param {Object} bounds - Boundary box {minX, maxX, minY, maxY, minZ, maxZ}
   * @param {number} [restitution=0.9] - Bounciness (0-1)
   * @returns {boolean} True if collision occurred
   */
  static boundsCollision(p, bounds, restitution = 0.9) {
    const radius = (p.size || p.radius || 1) / 2;
    let collided = false;

    // X bounds
    if (bounds.minX !== undefined) {
      const minX = bounds.minX + radius;
      const maxX = bounds.maxX - radius;

      if (p.x < minX) {
        p.x = minX;
        if (p.vx < 0) p.vx = -p.vx * restitution;
        collided = true;
      } else if (p.x > maxX) {
        p.x = maxX;
        if (p.vx > 0) p.vx = -p.vx * restitution;
        collided = true;
      }
    }

    // Y bounds
    if (bounds.minY !== undefined) {
      const minY = bounds.minY + radius;
      const maxY = bounds.maxY - radius;

      if (p.y < minY) {
        p.y = minY;
        if (p.vy < 0) p.vy = -p.vy * restitution;
        collided = true;
      } else if (p.y > maxY) {
        p.y = maxY;
        if (p.vy > 0) p.vy = -p.vy * restitution;
        collided = true;
      }
    }

    // Z bounds (optional for 3D)
    if (bounds.minZ !== undefined && p.z !== undefined) {
      const minZ = bounds.minZ + radius;
      const maxZ = bounds.maxZ - radius;

      if (p.z < minZ) {
        p.z = minZ;
        if (p.vz < 0) p.vz = -p.vz * restitution;
        collided = true;
      } else if (p.z > maxZ) {
        p.z = maxZ;
        if (p.vz > 0) p.vz = -p.vz * restitution;
        collided = true;
      }
    }

    return collided;
  }

  /**
   * Check collision with a spherical boundary.
   * @param {Object} p - Particle {x, y, z, vx, vy, vz, size}
   * @param {Object} sphere - Sphere {x, y, z, radius}
   * @param {number} [restitution=0.9] - Bounciness (0-1)
   * @param {boolean} [inside=true] - True to contain inside, false to bounce off outside
   * @returns {boolean} True if collision occurred
   */
  static sphereBoundsCollision(p, sphere, restitution = 0.9, inside = true) {
    const dx = p.x - sphere.x;
    const dy = p.y - sphere.y;
    const dz = (p.z || 0) - (sphere.z || 0);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const particleRadius = (p.size || p.radius || 1) / 2;
    const effectiveRadius = sphere.radius - particleRadius;

    if (inside && dist > effectiveRadius) {
      // Particle outside sphere - bounce back in
      const nx = dx / dist;
      const ny = dy / dist;
      const nz = dz / dist;

      // Position correction
      p.x = sphere.x + nx * effectiveRadius;
      p.y = sphere.y + ny * effectiveRadius;
      if (p.z !== undefined) p.z = sphere.z + nz * effectiveRadius;

      // Velocity reflection
      const vDotN = p.vx * nx + p.vy * ny + (p.vz || 0) * nz;
      if (vDotN > 0) {
        p.vx -= 2 * vDotN * nx * restitution;
        p.vy -= 2 * vDotN * ny * restitution;
        if (p.vz !== undefined) p.vz -= 2 * vDotN * nz * restitution;
      }

      return true;
    }

    return false;
  }

  /**
   * Calculate kinetic energy of a particle.
   * @param {Object} p - Particle {vx, vy, vz, mass}
   * @returns {number} Kinetic energy (0.5 * m * v²)
   */
  static kineticEnergy(p) {
    const vx = p.vx || 0;
    const vy = p.vy || 0;
    const vz = p.vz || 0;
    const mass = p.mass ?? p.custom?.mass ?? 1;
    return 0.5 * mass * (vx * vx + vy * vy + vz * vz);
  }

  /**
   * Calculate speed (velocity magnitude) of a particle.
   * @param {Object} p - Particle {vx, vy, vz}
   * @returns {number} Speed
   */
  static speed(p) {
    const vx = p.vx || 0;
    const vy = p.vy || 0;
    const vz = p.vz || 0;
    return Math.sqrt(vx * vx + vy * vy + vz * vz);
  }

  /**
   * Calculate distance between two particles.
   * @param {Object} p1 - First position {x, y, z}
   * @param {Object} p2 - Second position {x, y, z}
   * @returns {number} Distance
   */
  static distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate squared distance between two particles (faster than distance).
   * @param {Object} p1 - First position {x, y, z}
   * @param {Object} p2 - Second position {x, y, z}
   * @returns {number} Squared distance
   */
  static distanceSquared(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = (p2.z || 0) - (p1.z || 0);
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Clamp velocity magnitude to a maximum.
   * @param {Object} p - Particle {vx, vy, vz}
   * @param {number} maxSpeed - Maximum speed
   */
  static clampVelocity(p, maxSpeed) {
    const speed = Physics.speed(p);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      p.vx *= scale;
      p.vy *= scale;
      if (p.vz !== undefined) p.vz *= scale;
    }
  }

  /**
   * Apply a force to a particle (F = ma, so a = F/m).
   * @param {Object} p - Particle {vx, vy, vz, mass}
   * @param {number} fx - Force X component
   * @param {number} fy - Force Y component
   * @param {number} fz - Force Z component
   * @param {number} dt - Delta time
   */
  static applyForce(p, fx, fy, fz, dt) {
    const mass = p.mass ?? p.custom?.mass ?? 1;
    const invMass = mass > 0 ? 1 / mass : 0;
    p.vx += fx * invMass * dt;
    p.vy += fy * invMass * dt;
    if (p.vz !== undefined) p.vz += (fz || 0) * invMass * dt;
  }
}

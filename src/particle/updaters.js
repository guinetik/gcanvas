/**
 * Updaters - Composable particle behavior functions
 *
 * Each updater is a function with signature: (particle, dt, system) => void
 * Some updaters are factories that return the actual updater function.
 *
 * Usage:
 *   updaters: [Updaters.velocity, Updaters.lifetime, Updaters.gravity(200)]
 */
export const Updaters = {
  /**
   * Apply velocity to position.
   */
  velocity: (p, dt) => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  },

  /**
   * Track age and kill particle when lifetime exceeded.
   */
  lifetime: (p, dt) => {
    p.age += dt;
    if (p.age >= p.lifetime) {
      p.alive = false;
    }
  },

  /**
   * Apply downward gravity.
   * @param {number} [strength=200] - Gravity strength (pixels/second²)
   * @returns {Function} Updater function
   */
  gravity: (strength = 200) => (p, dt) => {
    p.vy += strength * dt;
  },

  /**
   * Apply upward gravity (for rising particles like fire).
   * @param {number} [strength=100] - Rise strength (pixels/second²)
   * @returns {Function} Updater function
   */
  rise: (strength = 100) => (p, dt) => {
    p.vy -= strength * dt;
  },

  /**
   * Apply velocity damping/friction.
   * @param {number} [factor=0.98] - Damping factor (0-1, lower = more friction)
   * @returns {Function} Updater function
   */
  damping: (factor = 0.98) => (p, dt) => {
    // Apply per-frame (not dt-based for simplicity)
    p.vx *= factor;
    p.vy *= factor;
    p.vz *= factor;
  },

  /**
   * Fade out alpha over lifetime.
   */
  fadeOut: (p, dt) => {
    p.color.a = Math.max(0, 1 - p.progress);
  },

  /**
   * Fade in then out (peak at 50% lifetime).
   */
  fadeInOut: (p, dt) => {
    const t = p.progress;
    p.color.a = t < 0.5 ? t * 2 : (1 - t) * 2;
  },

  /**
   * Shrink size over lifetime.
   * @param {number} [endScale=0] - Final size multiplier (0 = disappear)
   * @returns {Function} Updater function
   */
  shrink: (endScale = 0) => {
    // Store initial size on first call
    return (p, dt) => {
      if (p.custom._initialSize === undefined) {
        p.custom._initialSize = p.size;
      }
      p.size = p.custom._initialSize * (1 - p.progress * (1 - endScale));
    };
  },

  /**
   * Grow size over lifetime.
   * @param {number} [endScale=2] - Final size multiplier
   * @returns {Function} Updater function
   */
  grow: (endScale = 2) => {
    return (p, dt) => {
      if (p.custom._initialSize === undefined) {
        p.custom._initialSize = p.size;
      }
      p.size = p.custom._initialSize * (1 + p.progress * (endScale - 1));
    };
  },

  /**
   * Interpolate color over lifetime.
   * @param {Object} startColor - Start color { r, g, b }
   * @param {Object} endColor - End color { r, g, b }
   * @returns {Function} Updater function
   */
  colorOverLife: (startColor, endColor) => (p, dt) => {
    const t = p.progress;
    p.color.r = Math.floor(startColor.r + (endColor.r - startColor.r) * t);
    p.color.g = Math.floor(startColor.g + (endColor.g - startColor.g) * t);
    p.color.b = Math.floor(startColor.b + (endColor.b - startColor.b) * t);
  },

  /**
   * Add random wobble to velocity.
   * @param {number} [strength=10] - Wobble strength
   * @returns {Function} Updater function
   */
  wobble: (strength = 10) => (p, dt) => {
    p.vx += (Math.random() - 0.5) * strength * dt;
    p.vy += (Math.random() - 0.5) * strength * dt;
  },

  /**
   * Bounce off screen boundaries.
   * @param {Object} bounds - Boundary { left, right, top, bottom }
   * @param {number} [bounce=0.8] - Bounce factor (0-1)
   * @returns {Function} Updater function
   */
  bounds: (bounds, bounce = 0.8) => (p, dt) => {
    if (p.x < bounds.left) {
      p.x = bounds.left;
      p.vx = Math.abs(p.vx) * bounce;
    } else if (p.x > bounds.right) {
      p.x = bounds.right;
      p.vx = -Math.abs(p.vx) * bounce;
    }

    if (p.y < bounds.top) {
      p.y = bounds.top;
      p.vy = Math.abs(p.vy) * bounce;
    } else if (p.y > bounds.bottom) {
      p.y = bounds.bottom;
      p.vy = -Math.abs(p.vy) * bounce;
    }
  },

  /**
   * Attract particles toward a point.
   * @param {Object} target - Target position { x, y, z }
   * @param {number} [strength=100] - Attraction strength
   * @returns {Function} Updater function
   */
  attract: (target, strength = 100) => (p, dt) => {
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const dz = (target.z ?? 0) - p.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 1) {
      const force = strength * dt / dist;
      p.vx += dx * force;
      p.vy += dy * force;
      p.vz += dz * force;
    }
  },
};

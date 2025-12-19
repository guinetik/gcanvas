/**
 * ParticleEmitter - Configuration and spawning logic for particles
 *
 * Defines spawn position, velocity, lifetime, and appearance properties.
 * Supports continuous emission (rate) and burst spawning.
 */
export class ParticleEmitter {
  /**
   * @param {Object} options - Emitter configuration
   * @param {number} [options.rate=10] - Particles per second (continuous emission)
   * @param {Object} [options.position] - Spawn position { x, y, z }
   * @param {Object} [options.spread] - Position randomization { x, y, z }
   * @param {Object} [options.velocity] - Initial velocity { x, y, z }
   * @param {Object} [options.velocitySpread] - Velocity randomization { x, y, z }
   * @param {Object} [options.lifetime] - Particle lifetime { min, max } in seconds
   * @param {Object} [options.size] - Particle size { min, max }
   * @param {Object} [options.color] - Base color { r, g, b, a }
   * @param {string} [options.shape] - Particle shape: "circle", "square", "triangle"
   */
  constructor(options = {}) {
    // Emission rate (particles per second)
    this.rate = options.rate ?? 10;

    // Spawn position and spread
    this.position = { x: 0, y: 0, z: 0, ...options.position };
    this.spread = { x: 0, y: 0, z: 0, ...options.spread };

    // Initial velocity and spread
    this.velocity = { x: 0, y: 0, z: 0, ...options.velocity };
    this.velocitySpread = { x: 0, y: 0, z: 0, ...options.velocitySpread };

    // Particle lifetime range (seconds)
    this.lifetime = { min: 1, max: 2, ...options.lifetime };

    // Particle size range
    this.size = { min: 1, max: 1, ...options.size };

    // Base color
    this.color = { r: 255, g: 255, b: 255, a: 1, ...options.color };

    // Particle shape
    this.shape = options.shape ?? "circle";

    // Emitter state
    this.active = options.active !== false;
    this._timer = 0;
  }

  /**
   * Random value in range [-spread, spread].
   * @private
   */
  _spread(spread) {
    return (Math.random() - 0.5) * 2 * spread;
  }

  /**
   * Random value in range [min, max].
   * @private
   */
  _range(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Initialize a particle with emitter settings.
   * @param {Particle} p - Particle to initialize
   */
  emit(p) {
    // Position with spread
    p.x = this.position.x + this._spread(this.spread.x);
    p.y = this.position.y + this._spread(this.spread.y);
    p.z = this.position.z + this._spread(this.spread.z);

    // Velocity with spread
    p.vx = this.velocity.x + this._spread(this.velocitySpread.x);
    p.vy = this.velocity.y + this._spread(this.velocitySpread.y);
    p.vz = this.velocity.z + this._spread(this.velocitySpread.z);

    // Lifetime
    p.lifetime = this._range(this.lifetime.min, this.lifetime.max);
    p.age = 0;
    p.alive = true;

    // Size
    p.size = this._range(this.size.min, this.size.max);

    // Color (copy to avoid shared reference)
    p.color.r = this.color.r;
    p.color.g = this.color.g;
    p.color.b = this.color.b;
    p.color.a = this.color.a;

    // Shape
    p.shape = this.shape;
  }

  /**
   * Update emitter and return number of particles to spawn.
   * @param {number} dt - Delta time in seconds
   * @returns {number} Number of particles to spawn this frame
   */
  update(dt) {
    if (!this.active || this.rate <= 0) return 0;

    this._timer += dt;
    const interval = 1 / this.rate;
    let count = 0;

    while (this._timer >= interval) {
      this._timer -= interval;
      count++;
    }

    return count;
  }

  /**
   * Reset emission timer.
   */
  reset() {
    this._timer = 0;
  }
}

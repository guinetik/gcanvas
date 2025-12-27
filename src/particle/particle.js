/**
 * Particle - Lightweight data class for particle systems
 *
 * Plain object with no methods for performance (2500+ particles efficient).
 * Uses object pooling via reset() to minimize garbage collection.
 */
export class Particle {
  constructor() {
    // Position (3D capable)
    this.x = 0;
    this.y = 0;
    this.z = 0;

    // Velocity
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Appearance
    this.size = 1;
    this.color = { r: 255, g: 255, b: 255, a: 1 };
    this.shape = "circle"; // "circle", "square", "triangle"

    // Lifecycle
    this.age = 0;
    this.lifetime = 1;
    this.alive = true;

    // Custom data (for domain-specific behaviors like orbital mechanics)
    this.custom = {};
  }

  /**
   * Reset all properties for object pooling.
   * Called when particle is returned to pool.
   */
  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;

    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    this.size = 1;
    this.color.r = 255;
    this.color.g = 255;
    this.color.b = 255;
    this.color.a = 1;
    this.shape = "circle";

    this.age = 0;
    this.lifetime = 1;
    this.alive = true;

    // Clear custom data
    for (const key in this.custom) {
      delete this.custom[key];
    }
  }

  /**
   * Progress through lifetime (0 = just born, 1 = about to die).
   * Useful for fade/shrink effects.
   * @type {number}
   */
  get progress() {
    return this.lifetime > 0 ? this.age / this.lifetime : 1;
  }
}

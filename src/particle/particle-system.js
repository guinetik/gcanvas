/**
 * ParticleSystem - High-performance particle management GameObject
 *
 * Features:
 * - Object pooling to minimize garbage collection
 * - Composable updaters for physics and effects
 * - Optional Camera3D integration with depth sorting
 * - Multiple emitter support
 * - Blend mode control
 *
 * @example
 * const particles = new ParticleSystem(this, {
 *   camera: this.camera,
 *   depthSort: true,
 *   maxParticles: 3000,
 *   blendMode: "screen",
 *   updaters: [Updaters.velocity, Updaters.lifetime, Updaters.gravity(150)],
 * });
 * particles.addEmitter("fountain", new ParticleEmitter({ rate: 50 }));
 * this.pipeline.add(particles);
 */
import { GameObject } from "../game/objects/go.js";
import { Painter } from "../painter/painter.js";
import { Particle } from "./particle.js";
import { Updaters } from "./updaters.js";

export class ParticleSystem extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options - System configuration
   * @param {number} [options.maxParticles=5000] - Maximum active particles
   * @param {Camera3D} [options.camera] - Optional camera for 3D projection
   * @param {boolean} [options.depthSort=false] - Enable depth sorting (requires camera)
   * @param {string} [options.blendMode="source-over"] - Canvas blend mode
   * @param {Function[]} [options.updaters] - Array of updater functions
   * @param {boolean} [options.worldSpace=false] - Position particles in world space
   */
  constructor(game, options = {}) {
    super(game, options);

    // Particle storage
    this.particles = [];
    this.pool = [];
    this.maxParticles = options.maxParticles ?? 5000;

    // Emitters
    this.emitters = new Map();

    // Optional Camera3D for 3D projection
    this.camera = options.camera ?? null;
    this.depthSort = options.depthSort ?? false;

    // Updaters (composable behaviors)
    this.updaters = options.updaters ?? [
      Updaters.velocity,
      Updaters.lifetime,
    ];

    // Rendering
    this.blendMode = options.blendMode ?? "source-over";
    this.worldSpace = options.worldSpace ?? false;

    // Stats
    this._particleCount = 0;
  }

  /**
   * Add an emitter to the system.
   * @param {string} name - Emitter identifier
   * @param {ParticleEmitter} emitter - Emitter instance
   * @returns {ParticleSystem} this (for chaining)
   */
  addEmitter(name, emitter) {
    this.emitters.set(name, emitter);
    return this;
  }

  /**
   * Remove an emitter from the system.
   * @param {string} name - Emitter identifier
   * @returns {ParticleSystem} this (for chaining)
   */
  removeEmitter(name) {
    this.emitters.delete(name);
    return this;
  }

  /**
   * Get an emitter by name.
   * @param {string} name - Emitter identifier
   * @returns {ParticleEmitter|undefined}
   */
  getEmitter(name) {
    return this.emitters.get(name);
  }

  /**
   * Acquire a particle from pool or create new.
   * @returns {Particle}
   */
  acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return new Particle();
  }

  /**
   * Release a particle back to pool.
   * @param {Particle} particle
   */
  release(particle) {
    particle.reset();
    this.pool.push(particle);
  }

  /**
   * Emit particles using an emitter.
   * @param {number} count - Number of particles to emit
   * @param {ParticleEmitter} emitter - Emitter to use
   */
  emit(count, emitter) {
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const p = this.acquire();
      emitter.emit(p);
      this.particles.push(p);
    }
  }

  /**
   * Burst spawn particles.
   * @param {number} count - Number of particles
   * @param {ParticleEmitter|string} emitterOrName - Emitter instance or name
   */
  burst(count, emitterOrName) {
    const emitter = typeof emitterOrName === "string"
      ? this.emitters.get(emitterOrName)
      : emitterOrName;

    if (emitter) {
      this.emit(count, emitter);
    }
  }

  /**
   * Update all emitters and particles.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);

    // Update emitters and spawn particles
    for (const emitter of this.emitters.values()) {
      if (emitter.active) {
        const count = emitter.update(dt);
        this.emit(count, emitter);
      }
    }

    // Update particles (iterate backwards for safe removal)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Apply all updaters
      for (const updater of this.updaters) {
        updater(p, dt, this);
      }

      // Remove dead particles
      if (!p.alive) {
        this.release(p);
        this.particles.splice(i, 1);
      }
    }

    this._particleCount = this.particles.length;
  }

  /**
   * Render all particles.
   */
  render() {
    super.render();

    if (this.particles.length === 0) return;

    if (this.camera && this.depthSort) {
      this.renderWithDepthSort();
    } else {
      this.renderSimple();
    }
  }

  /**
   * Simple 2D rendering (no depth sorting).
   */
  renderSimple() {
    Painter.useCtx((ctx) => {
      ctx.globalCompositeOperation = this.blendMode;

      for (const p of this.particles) {
        this.drawParticle(ctx, p, p.x, p.y, 1);
      }

      ctx.globalCompositeOperation = "source-over";
    });
  }

  /**
   * 3D rendering with Camera3D projection and depth sorting.
   */
  renderWithDepthSort() {
    // Build render list with projections
    const renderList = [];

    for (const p of this.particles) {
      const projected = this.camera.project(p.x, p.y, p.z);

      // Cull particles behind camera
      if (projected.z < -this.camera.perspective + 10) continue;

      renderList.push({
        p,
        x: projected.x,
        y: projected.y,
        z: projected.z,
        scale: projected.scale,
      });
    }

    // Sort back to front
    renderList.sort((a, b) => b.z - a.z);

    // Draw all particles
    Painter.useCtx((ctx) => {
      ctx.globalCompositeOperation = this.blendMode;

      // Translate to center if using camera (camera projects relative to origin)
      // Only do this if NOT inside a Scene3D (which already handles projection/centering)
      const isProjected = this.parent && this.parent.constructor.name === "Scene3D";

      if (!this.worldSpace && !isProjected) {
        ctx.save();
        ctx.translate(this.game.width / 2, this.game.height / 2);
      }

      for (const item of renderList) {
        this.drawParticle(ctx, item.p, item.x, item.y, item.scale);
      }

      if (!this.worldSpace && !isProjected) {
        ctx.restore();
      }

      ctx.globalCompositeOperation = "source-over";
    });
  }

  /**
   * Draw a single particle.
   * Override this method for custom particle rendering.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Particle} p - Particle to draw
   * @param {number} x - Screen X position
   * @param {number} y - Screen Y position
   * @param {number} scale - Size scale factor (from perspective)
   */
  drawParticle(ctx, p, x, y, scale) {
    const { r, g, b, a } = p.color;
    const size = p.size * scale;

    if (size < 0.5 || a <= 0) return;

    ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`;

    const shape = p.shape ?? "circle";
    const half = size / 2;

    ctx.beginPath();

    if (shape === "circle") {
      ctx.arc(x, y, half, 0, Math.PI * 2);
    } else if (shape === "square") {
      ctx.rect(x - half, y - half, size, size);
    } else if (shape === "triangle") {
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + half, y + half);
      ctx.lineTo(x - half, y + half);
      ctx.closePath();
    }

    ctx.fill();
  }

  /**
   * Clear all particles and return them to pool.
   */
  clear() {
    for (const p of this.particles) {
      this.release(p);
    }
    this.particles = [];
    this._particleCount = 0;
  }

  /**
   * Get current particle count.
   * @type {number}
   */
  get particleCount() {
    return this._particleCount;
  }

  /**
   * Get pool size (recycled particles ready for reuse).
   * @type {number}
   */
  get poolSize() {
    return this.pool.length;
  }
}

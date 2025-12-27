/// <reference lib="es2015" />

/**
 * GCanvas Particle System Module
 * High-performance particle system with optional Camera3D support.
 * @module particle
 */

import { GameObject, GameObjectOptions, Game } from './game';

// ==========================================================================
// Particle Class
// ==========================================================================

/** RGBA color object */
export interface ParticleColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Particle shape type */
export type ParticleShape = 'circle' | 'square' | 'triangle';

/**
 * Lightweight data class for particle systems.
 * Uses object pooling via reset() to minimize garbage collection.
 *
 * @example
 * const p = new Particle();
 * p.x = 100;
 * p.y = 200;
 * p.vx = 5;
 * p.lifetime = 2;
 */
export class Particle {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Z position (for 3D systems) */
  z: number;

  /** X velocity */
  vx: number;
  /** Y velocity */
  vy: number;
  /** Z velocity */
  vz: number;

  /** Particle size */
  size: number;
  /** Particle color */
  color: ParticleColor;
  /** Particle shape */
  shape: ParticleShape;

  /** Current age in seconds */
  age: number;
  /** Maximum lifetime in seconds */
  lifetime: number;
  /** Whether particle is alive */
  alive: boolean;

  /** Custom data for domain-specific behaviors */
  custom: Record<string, any>;

  /** Progress through lifetime (0 = born, 1 = about to die) */
  readonly progress: number;

  constructor();

  /** Reset all properties for object pooling */
  reset(): void;
}

// ==========================================================================
// ParticleEmitter Class
// ==========================================================================

/** Options for ParticleEmitter */
export interface ParticleEmitterOptions {
  /** Emission rate (particles per second) */
  rate?: number;
  /** Position X */
  x?: number;
  /** Position Y */
  y?: number;
  /** Position Z */
  z?: number;
  /** Position spread (randomness) */
  spread?: { x?: number; y?: number; z?: number };
  /** Initial velocity */
  velocity?: { x?: number; y?: number; z?: number };
  /** Velocity spread (randomness) */
  velocitySpread?: { x?: number; y?: number; z?: number };
  /** Particle size range [min, max] */
  size?: [number, number];
  /** Particle lifetime range [min, max] */
  lifetime?: [number, number];
  /** Particle color */
  color?: ParticleColor | ((particle: Particle) => ParticleColor);
  /** Particle shape */
  shape?: ParticleShape;
  /** Custom initializer function */
  init?: (particle: Particle, emitter: ParticleEmitter) => void;
}

/**
 * Emitter that spawns particles with configurable properties.
 *
 * @example
 * const emitter = new ParticleEmitter({
 *   rate: 50,
 *   x: 400, y: 300,
 *   velocity: { x: 0, y: -100 },
 *   velocitySpread: { x: 50, y: 20 },
 *   lifetime: [1, 3],
 *   size: [2, 8],
 * });
 */
export class ParticleEmitter {
  /** Whether emitter is active */
  active: boolean;
  /** Emission rate (particles per second) */
  rate: number;
  /** Emitter position X */
  x: number;
  /** Emitter position Y */
  y: number;
  /** Emitter position Z */
  z: number;

  constructor(options?: ParticleEmitterOptions);

  /**
   * Update emitter and return number of particles to spawn.
   * @param dt - Delta time in seconds
   * @returns Number of particles to spawn this frame
   */
  update(dt: number): number;

  /**
   * Initialize a particle with this emitter's settings.
   * @param particle - Particle to initialize
   */
  emit(particle: Particle): void;

  /** Start emitting */
  start(): void;

  /** Stop emitting */
  stop(): void;

  /** Burst spawn a specific number of particles */
  burst(count: number): void;
}

// ==========================================================================
// ParticleSystem Class
// ==========================================================================

/** Options for ParticleSystem */
export interface ParticleSystemOptions extends GameObjectOptions {
  /** Maximum active particles (default: 5000) */
  maxParticles?: number;
  /** Optional Camera3D for 3D projection */
  camera?: any; // Camera3D
  /** Enable depth sorting (requires camera) */
  depthSort?: boolean;
  /** Canvas blend mode (default: 'source-over') */
  blendMode?: GlobalCompositeOperation;
  /** Array of updater functions */
  updaters?: ParticleUpdater[];
  /** Position particles in world space */
  worldSpace?: boolean;
}

/** Particle updater function signature */
export type ParticleUpdater = (particle: Particle, dt: number, system: ParticleSystem) => void;

/**
 * High-performance particle management GameObject.
 *
 * @example
 * const particles = new ParticleSystem(this, {
 *   camera: this.camera,
 *   depthSort: true,
 *   maxParticles: 3000,
 *   blendMode: 'screen',
 *   updaters: [Updaters.velocity, Updaters.lifetime, Updaters.gravity(150)],
 * });
 * particles.addEmitter('fountain', new ParticleEmitter({ rate: 50 }));
 * this.pipeline.add(particles);
 */
export class ParticleSystem extends GameObject {
  /** Active particles */
  particles: Particle[];
  /** Object pool for recycled particles */
  pool: Particle[];
  /** Maximum particles allowed */
  maxParticles: number;
  /** Named emitters */
  emitters: Map<string, ParticleEmitter>;
  /** Optional Camera3D for 3D projection */
  camera: any | null;
  /** Whether to depth sort particles */
  depthSort: boolean;
  /** Updater functions */
  updaters: ParticleUpdater[];
  /** Canvas blend mode (set via options, not an accessor) */
  readonly _blendMode: GlobalCompositeOperation;
  /** Position in world space */
  worldSpace: boolean;

  /** Current particle count */
  readonly particleCount: number;
  /** Pool size (recycled particles ready for reuse) */
  readonly poolSize: number;

  constructor(game: Game, options?: ParticleSystemOptions);

  /**
   * Add an emitter to the system.
   * @param name - Emitter identifier
   * @param emitter - Emitter instance
   */
  addEmitter(name: string, emitter: ParticleEmitter): ParticleSystem;

  /**
   * Remove an emitter from the system.
   * @param name - Emitter identifier
   */
  removeEmitter(name: string): ParticleSystem;

  /**
   * Get an emitter by name.
   * @param name - Emitter identifier
   */
  getEmitter(name: string): ParticleEmitter | undefined;

  /**
   * Acquire a particle from pool or create new.
   */
  acquire(): Particle;

  /**
   * Release a particle back to pool.
   * @param particle - Particle to release
   */
  release(particle: Particle): void;

  /**
   * Emit particles using an emitter.
   * @param count - Number of particles to emit
   * @param emitter - Emitter to use
   */
  emitParticles(count: number, emitter: ParticleEmitter): void;

  /**
   * Burst spawn particles.
   * @param count - Number of particles
   * @param emitterOrName - Emitter instance or name
   */
  burst(count: number, emitterOrName: ParticleEmitter | string): void;

  /** Clear all particles and return them to pool */
  clear(): void;

  /**
   * Draw a single particle (override for custom rendering).
   * @param ctx - Canvas context
   * @param p - Particle to draw
   * @param x - Screen X position
   * @param y - Screen Y position
   * @param scale - Size scale factor
   */
  drawParticle(ctx: CanvasRenderingContext2D, p: Particle, x: number, y: number, scale: number): void;
}

// ==========================================================================
// Updaters
// ==========================================================================

/**
 * Collection of composable particle updater functions.
 *
 * @example
 * const system = new ParticleSystem(game, {
 *   updaters: [
 *     Updaters.velocity,
 *     Updaters.lifetime,
 *     Updaters.gravity(200),
 *     Updaters.fadeOut,
 *     Updaters.shrink,
 *   ]
 * });
 */
export namespace Updaters {
  /** Apply velocity to position */
  const velocity: ParticleUpdater;

  /** Update age and kill expired particles */
  const lifetime: ParticleUpdater;

  /** Fade out alpha over lifetime */
  const fadeOut: ParticleUpdater;

  /** Shrink size over lifetime */
  const shrink: ParticleUpdater;

  /** Grow size over lifetime */
  const grow: ParticleUpdater;

  /**
   * Apply gravity acceleration.
   * @param strength - Gravity strength (pixels per second squared)
   * @param axis - Axis to apply gravity ('y' by default)
   */
  function gravity(strength: number, axis?: 'x' | 'y' | 'z'): ParticleUpdater;

  /**
   * Apply friction/drag.
   * @param factor - Friction factor (0-1, lower = more friction)
   */
  function friction(factor: number): ParticleUpdater;

  /**
   * Apply wind force.
   * @param forceX - X force
   * @param forceY - Y force
   */
  function wind(forceX: number, forceY: number): ParticleUpdater;

  /**
   * Constrain particles to bounds.
   * @param bounds - Bounding box
   * @param bounce - Bounce factor (0-1)
   */
  function bounds(bounds: { x: number; y: number; width: number; height: number }, bounce?: number): ParticleUpdater;

  /**
   * Color transition over lifetime.
   * @param startColor - Starting color
   * @param endColor - Ending color
   */
  function colorTransition(startColor: ParticleColor, endColor: ParticleColor): ParticleUpdater;

  /**
   * Attract/repel from a point.
   * @param x - Attractor X position
   * @param y - Attractor Y position
   * @param strength - Attraction strength (negative = repel)
   */
  function attract(x: number, y: number, strength: number): ParticleUpdater;

  /**
   * Apply turbulence/noise to velocity.
   * @param strength - Turbulence strength
   * @param scale - Noise scale
   */
  function turbulence(strength: number, scale?: number): ParticleUpdater;

  /**
   * Orbital motion around a point.
   * @param centerX - Center X
   * @param centerY - Center Y
   * @param speed - Angular speed
   */
  function orbital(centerX: number, centerY: number, speed: number): ParticleUpdater;
}


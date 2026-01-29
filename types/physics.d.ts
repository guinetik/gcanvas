/**
 * Physics module type definitions
 */

/**
 * Collision result from checkCollision
 */
export interface CollisionResult {
  /** Distance between particle centers */
  dist: number;
  /** Overlap amount (how much they're intersecting) */
  overlap: number;
  /** X component of distance vector */
  dx: number;
  /** Y component of distance vector */
  dy: number;
  /** Z component of distance vector */
  dz: number;
}

/**
 * Force vector result
 */
export interface ForceResult {
  /** Force X component */
  fx: number;
  /** Force Y component */
  fy: number;
  /** Force Z component */
  fz: number;
  /** Distance between objects */
  dist: number;
}

/**
 * Velocity result from collision response
 */
export interface VelocityResult {
  vx: number;
  vy: number;
  vz: number;
}

/**
 * Elastic collision response result
 */
export interface ElasticCollisionResult {
  /** New velocity for first particle */
  v1: VelocityResult;
  /** New velocity for second particle */
  v2: VelocityResult;
}

/**
 * 3D bounding box
 */
export interface Bounds3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ?: number;
  maxZ?: number;
}

/**
 * Sphere definition
 */
export interface Sphere {
  x: number;
  y: number;
  z?: number;
  radius: number;
}

/**
 * Position in 3D space
 */
export interface Position3D {
  x: number;
  y: number;
  z?: number;
}

/**
 * Particle with physics properties
 */
export interface PhysicsParticle extends Position3D {
  vx: number;
  vy: number;
  vz?: number;
  size?: number;
  radius?: number;
  mass?: number;
  alive?: boolean;
  custom?: {
    mass?: number;
    [key: string]: any;
  };
}

/**
 * Particle updater function signature
 */
export type ParticleUpdater = (
  particle: PhysicsParticle,
  dt: number,
  system?: any
) => void;

/**
 * Static physics calculations
 */
export class Physics {
  /**
   * Calculate attraction/repulsion force using inverse square law
   */
  static attract(
    p1: Position3D,
    p2: Position3D,
    strength?: number,
    minDist?: number
  ): ForceResult;

  /**
   * Calculate linear attraction force (constant strength)
   */
  static attractLinear(
    p1: Position3D,
    p2: Position3D,
    strength?: number
  ): ForceResult;

  /**
   * Check if two particles are colliding
   */
  static checkCollision(
    p1: PhysicsParticle,
    p2: PhysicsParticle,
    threshold?: number
  ): CollisionResult | null;

  /**
   * Calculate elastic collision response
   */
  static elasticCollision(
    p1: PhysicsParticle,
    p2: PhysicsParticle,
    collision: CollisionResult,
    restitution?: number
  ): ElasticCollisionResult | null;

  /**
   * Separate overlapping particles
   */
  static separate(
    p1: PhysicsParticle,
    p2: PhysicsParticle,
    collision: CollisionResult,
    separationFactor?: number
  ): void;

  /**
   * Check and respond to 3D boundary collision
   */
  static boundsCollision(
    p: PhysicsParticle,
    bounds: Bounds3D,
    restitution?: number
  ): boolean;

  /**
   * Check collision with spherical boundary
   */
  static sphereBoundsCollision(
    p: PhysicsParticle,
    sphere: Sphere,
    restitution?: number,
    inside?: boolean
  ): boolean;

  /**
   * Calculate kinetic energy
   */
  static kineticEnergy(p: PhysicsParticle): number;

  /**
   * Calculate speed (velocity magnitude)
   */
  static speed(p: PhysicsParticle): number;

  /**
   * Calculate distance between two positions
   */
  static distance(p1: Position3D, p2: Position3D): number;

  /**
   * Calculate squared distance (faster)
   */
  static distanceSquared(p1: Position3D, p2: Position3D): number;

  /**
   * Clamp velocity to maximum speed
   */
  static clampVelocity(p: PhysicsParticle, maxSpeed: number): void;

  /**
   * Apply force to particle
   */
  static applyForce(
    p: PhysicsParticle,
    fx: number,
    fy: number,
    fz: number,
    dt: number
  ): void;
}

/**
 * Composable physics updaters for ParticleSystem
 */
export const PhysicsUpdaters: {
  /**
   * Apply mutual attraction/repulsion between particles
   */
  mutualAttraction(
    strength?: number,
    cutoffDistance?: number,
    minDistance?: number
  ): ParticleUpdater;

  /**
   * Apply linear mutual attraction
   */
  mutualAttractionLinear(
    strength?: number,
    cutoffDistance?: number
  ): ParticleUpdater;

  /**
   * Handle particle-particle elastic collisions
   */
  particleCollisions(
    restitution?: number,
    threshold?: number
  ): ParticleUpdater;

  /**
   * Bounce off 3D box boundaries
   */
  bounds3D(bounds: Bounds3D, restitution?: number): ParticleUpdater;

  /**
   * Bounce inside spherical boundary
   */
  sphereBounds(sphere: Sphere, restitution?: number): ParticleUpdater;

  /**
   * Attract toward a point
   */
  attractToPoint(
    target: Position3D | (() => Position3D),
    strength?: number,
    minDist?: number
  ): ParticleUpdater;

  /**
   * Apply uniform gravity
   */
  gravity(gx?: number, gy?: number, gz?: number): ParticleUpdater;

  /**
   * Limit maximum speed
   */
  maxSpeed(maxSpeed: number): ParticleUpdater;

  /**
   * Apply velocity drag
   */
  drag(coefficient?: number): ParticleUpdater;

  /**
   * Apply separation force to prevent overlap
   */
  separation(strength?: number, threshold?: number): ParticleUpdater;

  /**
   * Apply thermal motion (random jitter)
   */
  thermal(
    temperature: number | (() => number),
    scale?: number
  ): ParticleUpdater;

  /**
   * Apply orbital motion around center
   */
  orbital(center: Position3D, strength?: number): ParticleUpdater;
};

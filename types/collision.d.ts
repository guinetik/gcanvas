/**
 * GCanvas Collision Detection Types
 * Collision detection utilities for 2D game development.
 * @module collision
 */

import { Bounds } from './common';

// ==========================================================================
// Collision Shapes
// ==========================================================================

/** Circle definition for collision detection */
export interface CollisionCircle {
  x: number;
  y: number;
  radius: number;
}

/** Line segment definition for collision detection */
export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Sweep collision result */
export interface SweepResult {
  /** Time of collision (0-1 within the movement) */
  time: number;
  /** X component of collision normal */
  normalX: number;
  /** Y component of collision normal */
  normalY: number;
}

/** Overlap result between two rectangles */
export interface OverlapResult {
  /** Horizontal overlap amount */
  x: number;
  /** Vertical overlap amount */
  y: number;
}

/** Minimum translation vector to separate colliding objects */
export interface MTVResult {
  /** X translation to separate */
  x: number;
  /** Y translation to separate */
  y: number;
}

// ==========================================================================
// Collision Static Class
// ==========================================================================

/**
 * Static collision detection utilities.
 * Provides various algorithms for 2D collision detection.
 */
export class Collision {
  /**
   * Test if two axis-aligned rectangles intersect (AABB collision)
   */
  static rectRect(a: Bounds, b: Bounds): boolean;

  /**
   * Alias for rectRect - matches common naming convention
   */
  static intersects(a: Bounds, b: Bounds): boolean;

  /**
   * Test if a point is inside a rectangle
   */
  static pointRect(px: number, py: number, rect: Bounds): boolean;

  /**
   * Test if two circles intersect
   */
  static circleCircle(a: CollisionCircle, b: CollisionCircle): boolean;

  /**
   * Test if a point is inside a circle
   */
  static pointCircle(px: number, py: number, circle: CollisionCircle): boolean;

  /**
   * Test if a circle and rectangle intersect
   */
  static circleRect(circle: CollisionCircle, rect: Bounds): boolean;

  /**
   * Test if a line segment intersects a rectangle
   * @param x1 - Line start X
   * @param y1 - Line start Y
   * @param x2 - Line end X
   * @param y2 - Line end Y
   * @param rect - Target rectangle
   * @param thickness - Optional line thickness
   */
  static lineRect(x1: number, y1: number, x2: number, y2: number, rect: Bounds, thickness?: number): boolean;

  /**
   * Test if two line segments intersect
   */
  static lineLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean;

  /**
   * Test if multiple line segments intersect a rectangle
   * Useful for complex shapes like lightning bolts
   */
  static segmentsRect(segments: LineSegment[], rect: Bounds, thickness?: number): boolean;

  /**
   * Get the intersection depth between two rectangles
   * Returns null if no collision
   */
  static getOverlap(a: Bounds, b: Bounds): OverlapResult | null;

  /**
   * Get the minimum translation vector to separate two rectangles
   * Returns null if no collision
   */
  static getMTV(a: Bounds, b: Bounds): MTVResult | null;

  /**
   * Check if a moving rectangle will collide with a static one (sweep test)
   * Useful for fast-moving objects like bullets
   * @param rect - Moving rectangle
   * @param vx - Velocity X
   * @param vy - Velocity Y
   * @param target - Target rectangle
   */
  static sweep(rect: Bounds, vx: number, vy: number, target: Bounds): SweepResult | null;
}

// ==========================================================================
// CollisionSystem Class
// ==========================================================================

/** Object that can participate in collision detection */
export interface Collidable {
  getBounds?(): Bounds;
  bounds?: Bounds;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  active?: boolean;
  destroyed?: boolean;
  alive?: boolean;
}

/** Collision pair callback options */
export interface CollisionPairOptions {
  /** If true, only trigger once per pair per frame */
  once?: boolean;
}

/** Callback for collision events */
export type CollisionCallback<A = Collidable, B = Collidable> = (objA: A, objB: B) => void;

/**
 * Manages collision groups and detection.
 * Provides an organized way to manage multiple groups of collidable objects
 * and efficiently check collisions between them.
 */
export class CollisionSystem {
  constructor();

  /**
   * Create a new collision group
   * @returns this for chaining
   */
  createGroup(name: string): this;

  /**
   * Add an object to a collision group
   * @returns this for chaining
   */
  add<T extends Collidable>(groupName: string, obj: T): this;

  /**
   * Remove an object from a collision group
   * @returns True if object was in the group
   */
  remove(groupName: string, obj: Collidable): boolean;

  /**
   * Remove an object from all groups
   */
  removeFromAll(obj: Collidable): void;

  /**
   * Clear all objects from a group
   */
  clearGroup(groupName: string): void;

  /**
   * Clear all groups
   */
  clearAll(): void;

  /**
   * Get all objects in a group
   */
  getGroup<T extends Collidable>(groupName: string): T[];

  /**
   * Register a collision callback between two groups
   * @returns this for chaining
   */
  onCollision<A extends Collidable, B extends Collidable>(
    groupA: string,
    groupB: string,
    callback: CollisionCallback<A, B>,
    options?: CollisionPairOptions
  ): this;

  /**
   * Remove all collision callbacks for a pair of groups
   */
  offCollision(groupA: string, groupB: string): void;

  /**
   * Check and handle all registered collision pairs
   * Call this each frame in your update loop
   */
  update(): void;

  /**
   * Check collisions between two specific groups (without callbacks)
   * @returns Array of [objA, objB] colliding pairs
   */
  check<A extends Collidable, B extends Collidable>(groupA: string, groupB: string): [A, B][];

  /**
   * Check if an object collides with any object in a group
   * @returns First colliding object, or null
   */
  checkAgainstGroup<T extends Collidable>(obj: Collidable, groupName: string): T | null;

  /**
   * Check if an object collides with any object in a group
   * @returns All colliding objects
   */
  checkAllAgainstGroup<T extends Collidable>(obj: Collidable, groupName: string): T[];
}

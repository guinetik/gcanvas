/**
 * GCanvas Util Module
 * Utility classes and functions for layout, positioning, z-ordering, and task management.
 * @module util
 */

import { Point, LayoutResult } from './common';
import { Transformable } from './shapes';

// ==========================================================================
// Z-Ordered Collection
// ==========================================================================

/** Options for ZOrderedCollection */
export interface ZOrderedCollectionOptions {
  /** Sort children by zIndex when rendering */
  sortByZIndex?: boolean;
}

/**
 * Z-ordered collection for managing child objects.
 * Maintains rendering order based on zIndex property.
 */
export class ZOrderedCollection {
  /** Array of child objects */
  children: Transformable[];

  constructor(options?: ZOrderedCollectionOptions);

  /**
   * Add an object to the collection.
   * @param object - Object to add
   */
  add(object: Transformable): void;

  /**
   * Remove an object from the collection.
   * @param object - Object to remove
   * @returns Whether object was found and removed
   */
  remove(object: Transformable): boolean;

  /** Remove all objects */
  clear(): void;

  /**
   * Get children sorted by zIndex.
   * @returns Sorted array of children
   */
  getSortedChildren(): Transformable[];

  /** Move object to front (highest z-order) */
  bringToFront(object: Transformable): void;

  /** Move object to back (lowest z-order) */
  sendToBack(object: Transformable): void;

  /** Move object forward one z-level */
  bringForward(object: Transformable): void;

  /** Move object backward one z-level */
  sendBackward(object: Transformable): void;
}

// ==========================================================================
// Position Constants
// ==========================================================================

/**
 * Position/anchor utilities with layout constants.
 * Provides named constants for common anchor positions.
 *
 * @example
 * const pos = Position.parse(Position.CENTER, canvasWidth, canvasHeight);
 */
export class Position {
  static readonly TOP_LEFT: string;
  static readonly TOP_CENTER: string;
  static readonly TOP_RIGHT: string;
  static readonly CENTER_LEFT: string;
  static readonly CENTER: string;
  static readonly CENTER_RIGHT: string;
  static readonly BOTTOM_LEFT: string;
  static readonly BOTTOM_CENTER: string;
  static readonly BOTTOM_RIGHT: string;

  /**
   * Parse a position string into coordinates.
   * @param position - Position string (e.g., "center", "top-left")
   * @param containerWidth - Container width
   * @param containerHeight - Container height
   * @param objectWidth - Optional object width for centering
   * @param objectHeight - Optional object height for centering
   * @returns Calculated position
   */
  static parse(
    position: string,
    containerWidth: number,
    containerHeight: number,
    objectWidth?: number,
    objectHeight?: number
  ): Point;
}

// ==========================================================================
// Task Manager
// ==========================================================================

/**
 * Task manager for scheduling delayed operations.
 */
export class TaskManager {
  /**
   * Add a task to be executed after a delay.
   * @param task - Function to execute
   * @param delay - Delay in seconds (default: 0)
   */
  add(task: () => void, delay?: number): void;

  /**
   * Update all tasks.
   * @param dt - Delta time in seconds
   */
  update(dt: number): void;

  /** Clear all pending tasks */
  clear(): void;
}

// ==========================================================================
// Layout Functions
// ==========================================================================

/** Item with dimensions for layout calculations */
export interface LayoutItem {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

/** Options for applyLayout */
export interface ApplyLayoutOptions {
  /** X offset to apply to all positions */
  offsetX?: number;
  /** Y offset to apply to all positions */
  offsetY?: number;
  /** Transform function to apply to positions */
  transform?: (pos: Point) => Point;
}

/** Options for horizontal/vertical layouts */
export interface LinearLayoutOptions {
  /** Space between items (default: 10) */
  spacing?: number;
  /** Padding around entire layout (default: 0) */
  padding?: number;
  /** Alignment: "start", "center", or "end" (default: "start") */
  align?: 'start' | 'center' | 'end';
  /** Position items relative to their centers (default: true) */
  centerItems?: boolean;
}

/** Options for tile layout */
export interface TileLayoutOptions {
  /** Number of columns (default: 4) */
  columns?: number;
  /** Space between items (default: 10) */
  spacing?: number;
  /** Padding around entire layout (default: 0) */
  padding?: number;
  /** Position items relative to their centers (default: true) */
  centerItems?: boolean;
}

/** Options for grid layout */
export interface GridLayoutOptions {
  /** Number of columns */
  columns?: number;
  /** Number of rows */
  rows?: number;
  /** Fixed cell width */
  cellWidth?: number;
  /** Fixed cell height */
  cellHeight?: number;
  /** Space between cells (default: 10) */
  spacing?: number;
  /** Padding around entire layout (default: 0) */
  padding?: number;
  /** Position items relative to their centers (default: true) */
  centerItems?: boolean;
}

/**
 * Apply calculated positions to items.
 * @param items - Array of objects to position (must have x, y properties)
 * @param positions - Array of position objects from layout functions
 * @param options - Options for applying positions
 * @returns The items with updated positions
 */
export function applyLayout<T extends LayoutItem>(
  items: T[],
  positions: Point[],
  options?: ApplyLayoutOptions
): T[];

/**
 * Create a horizontal layout (items arranged left to right).
 * @param items - Array of objects with width and height
 * @param options - Layout options
 * @returns Layout result with positions and dimensions
 *
 * @example
 * const result = horizontalLayout(buttons, { spacing: 20 });
 * applyLayout(buttons, result.positions);
 */
export function horizontalLayout(
  items: LayoutItem[],
  options?: LinearLayoutOptions
): LayoutResult;

/**
 * Create a vertical layout (items arranged top to bottom).
 * @param items - Array of objects with width and height
 * @param options - Layout options
 * @returns Layout result with positions and dimensions
 */
export function verticalLayout(
  items: LayoutItem[],
  options?: LinearLayoutOptions
): LayoutResult;

/**
 * Create a tile layout (items in a grid with fixed columns).
 * @param items - Array of objects with width and height
 * @param options - Layout options
 * @returns Layout result with positions and dimensions
 */
export function tileLayout(
  items: LayoutItem[],
  options?: TileLayoutOptions
): LayoutResult;

/**
 * Create a flexible grid layout.
 * @param items - Array of objects with width and height
 * @param options - Layout options
 * @returns Layout result with positions and dimensions
 */
export function gridLayout(
  items: LayoutItem[],
  options?: GridLayoutOptions
): LayoutResult;

// ==========================================================================
// Camera3D
// ==========================================================================

/** Options for Camera3D */
export interface Camera3DOptions {
  /** Initial X rotation (tilt up/down) in radians */
  rotationX?: number;
  /** Initial Y rotation (spin left/right) in radians */
  rotationY?: number;
  /** Initial Z rotation (roll) in radians */
  rotationZ?: number;
  /** Initial X position in world space */
  x?: number;
  /** Initial Y position in world space */
  y?: number;
  /** Initial Z position in world space */
  z?: number;
  /** Perspective distance (higher = less distortion, default: 800) */
  perspective?: number;
  /** Mouse drag sensitivity (default: 0.005) */
  sensitivity?: number;
  /** Minimum X rotation limit (default: -1.5) */
  minRotationX?: number;
  /** Maximum X rotation limit (default: 1.5) */
  maxRotationX?: number;
  /** Whether to clamp X rotation (default: true) */
  clampX?: boolean;
  /** Enable auto-rotation (default: false) */
  autoRotate?: boolean;
  /** Auto-rotation speed in radians per second (default: 0.5) */
  autoRotateSpeed?: number;
  /** Auto-rotation axis: 'x', 'y', or 'z' */
  autoRotateAxis?: 'x' | 'y' | 'z';
  /** Enable inertia/momentum (default: false) */
  inertia?: boolean;
  /** Velocity decay per frame (default: 0.92) */
  friction?: number;
  /** Multiplier for initial throw velocity (default: 1.0) */
  velocityScale?: number;
}

/** Projected point result */
export interface ProjectedPoint {
  /** Screen X coordinate */
  x: number;
  /** Screen Y coordinate */
  y: number;
  /** Depth (for sorting) */
  z: number;
  /** Scale factor (for size adjustment) */
  scale: number;
}

/** Mouse control options */
export interface MouseControlOptions {
  /** Invert horizontal rotation */
  invertX?: boolean;
  /** Invert vertical rotation */
  invertY?: boolean;
}

/** Follow options */
export interface FollowOptions {
  /** X offset from target */
  offsetX?: number;
  /** Y offset from target */
  offsetY?: number;
  /** Z offset from target */
  offsetZ?: number;
  /** Auto-orient to look at lookAtTarget */
  lookAt?: boolean;
  /** Point to look at (default: origin) */
  lookAtTarget?: { x: number; y: number; z: number } | null;
  /** Interpolation speed (0-1, higher = snappier, default: 0.1) */
  lerp?: number;
}

/** MoveTo animation options */
export interface MoveToOptions {
  /** Target X rotation */
  rotationX?: number;
  /** Target Y rotation */
  rotationY?: number;
  /** Interpolation speed (0-1, default: 0.05) */
  lerp?: number;
}

/**
 * Camera3D - Pseudo-3D projection and mouse-controlled rotation.
 * Provides 3D to 2D projection with perspective, rotation controls,
 * and interactive mouse/touch rotation for 2D canvas applications.
 *
 * @example
 * const camera = new Camera3D({
 *   rotationX: 0.3,
 *   rotationY: -0.4,
 *   perspective: 800,
 *   inertia: true,
 *   friction: 0.92
 * });
 * camera.enableMouseControl(canvas);
 *
 * // In render loop
 * const { x, y, scale, z } = camera.project(x3d, y3d, z3d);
 */
export class Camera3D {
  /** X rotation in radians */
  rotationX: number;
  /** Y rotation in radians */
  rotationY: number;
  /** Z rotation in radians */
  rotationZ: number;
  /** X position in world space */
  x: number;
  /** Y position in world space */
  y: number;
  /** Z position in world space */
  z: number;
  /** Perspective distance */
  perspective: number;
  /** Mouse drag sensitivity */
  sensitivity: number;
  /** Minimum X rotation */
  minRotationX: number;
  /** Maximum X rotation */
  maxRotationX: number;
  /** Whether X rotation is clamped */
  clampX: boolean;
  /** Auto-rotation enabled */
  autoRotate: boolean;
  /** Auto-rotation speed */
  autoRotateSpeed: number;
  /** Auto-rotation axis */
  autoRotateAxis: 'x' | 'y' | 'z';
  /** Inertia enabled */
  inertia: boolean;
  /** Friction for inertia */
  friction: number;
  /** Velocity scale for throws */
  velocityScale: number;

  constructor(options?: Camera3DOptions);

  /**
   * Project a 3D point to 2D screen coordinates.
   * @param x - X coordinate in 3D space
   * @param y - Y coordinate in 3D space
   * @param z - Z coordinate in 3D space
   */
  project(x: number, y: number, z: number): ProjectedPoint;

  /**
   * Project multiple points at once.
   * @param points - Array of 3D points
   */
  projectAll(points: Array<{ x: number; y: number; z: number }>): ProjectedPoint[];

  /**
   * Update camera for auto-rotation, inertia, and follow mode.
   * @param dt - Delta time in seconds
   */
  update(dt: number): void;

  /**
   * Enable mouse/touch drag rotation on a canvas.
   * @param canvas - Canvas element to attach controls to
   * @param options - Control options
   */
  enableMouseControl(canvas: HTMLCanvasElement, options?: MouseControlOptions): Camera3D;

  /**
   * Disable mouse/touch controls.
   */
  disableMouseControl(): Camera3D;

  /**
   * Reset rotation and position to initial values.
   */
  reset(): Camera3D;

  /**
   * Stop any inertia motion immediately.
   */
  stopInertia(): Camera3D;

  /**
   * Set camera position in world space.
   * @param x - X position
   * @param y - Y position
   * @param z - Z position
   */
  setPosition(x: number, y: number, z: number): Camera3D;

  /**
   * Animate camera to a new position.
   * @param x - Target X position
   * @param y - Target Y position
   * @param z - Target Z position
   * @param options - Animation options
   */
  moveTo(x: number, y: number, z: number, options?: MoveToOptions): Camera3D;

  /**
   * Follow a target object.
   * @param target - Object with x, y, z properties
   * @param options - Follow options
   */
  follow(target: { x?: number; y?: number; z?: number }, options?: FollowOptions): Camera3D;

  /**
   * Stop following target.
   * @param resetPosition - Animate back to initial position
   */
  unfollow(resetPosition?: boolean): Camera3D;

  /**
   * Check if camera is following a target.
   */
  isFollowing(): boolean;

  /**
   * Set rotation angles.
   * @param x - X rotation in radians
   * @param y - Y rotation in radians
   * @param z - Z rotation in radians (optional)
   */
  setRotation(x: number, y: number, z?: number): Camera3D;

  /**
   * Add to current rotation.
   * @param dx - Delta X rotation
   * @param dy - Delta Y rotation
   * @param dz - Delta Z rotation (optional)
   */
  rotate(dx: number, dy: number, dz?: number): Camera3D;

  /**
   * Check if currently being dragged by user.
   */
  isDragging(): boolean;

  /**
   * Look at a specific point.
   * @param x - Target X in world space
   * @param y - Target Y in world space
   * @param z - Target Z in world space
   */
  lookAt(x: number, y: number, z: number): Camera3D;
}

// ==========================================================================
// IsometricCamera
// ==========================================================================

/** Options for IsometricCamera */
export interface IsometricCameraOptions {
  /** Tile width in pixels (default: 64) */
  tileWidth?: number;
  /** Tile height in pixels (default: 32) */
  tileHeight?: number;
  /** Camera X offset */
  offsetX?: number;
  /** Camera Y offset */
  offsetY?: number;
  /** Camera zoom level (default: 1) */
  zoom?: number;
  /** Rotation angle (0, 90, 180, 270 degrees) */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * Isometric camera for 2.5D grid-based projections.
 * Converts between grid coordinates and screen positions.
 *
 * @example
 * const camera = new IsometricCamera({
 *   tileWidth: 64,
 *   tileHeight: 32,
 *   offsetX: 400,
 *   offsetY: 100
 * });
 *
 * const screen = camera.gridToScreen(5, 3);
 * const grid = camera.screenToGrid(mouseX, mouseY);
 */
export class IsometricCamera {
  /** Tile width in pixels */
  tileWidth: number;
  /** Tile height in pixels */
  tileHeight: number;
  /** Camera X offset */
  offsetX: number;
  /** Camera Y offset */
  offsetY: number;
  /** Camera zoom level */
  zoom: number;
  /** Camera rotation (0, 90, 180, 270) */
  rotation: 0 | 90 | 180 | 270;

  constructor(options?: IsometricCameraOptions);

  /**
   * Convert grid coordinates to screen position.
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   * @param height - Optional height offset
   */
  gridToScreen(gridX: number, gridY: number, height?: number): { x: number; y: number };

  /**
   * Convert screen position to grid coordinates.
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number };

  /**
   * Rotate camera by 90 degrees.
   * @param clockwise - Rotate clockwise (default: true)
   */
  rotate90(clockwise?: boolean): void;

  /**
   * Set camera offset.
   * @param x - X offset
   * @param y - Y offset
   */
  setOffset(x: number, y: number): void;

  /**
   * Set zoom level.
   * @param zoom - Zoom multiplier
   */
  setZoom(zoom: number): void;

  /**
   * Pan camera by delta.
   * @param dx - X delta
   * @param dy - Y delta
   */
  pan(dx: number, dy: number): void;

  /**
   * Center camera on grid position.
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   * @param screenWidth - Screen width
   * @param screenHeight - Screen height
   */
  centerOn(gridX: number, gridY: number, screenWidth: number, screenHeight: number): void;
}

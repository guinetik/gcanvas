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

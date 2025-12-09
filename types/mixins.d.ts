/**
 * GCanvas Mixins Module
 * Behavior modules that can be applied to GameObjects.
 * @module mixins
 */

import { Bounds, Point } from './common';
import { GameObject } from './game';

// ==========================================================================
// Draggable Mixin
// ==========================================================================

/** Options for draggable behavior */
export interface DraggableOptions {
  /** Bounds to constrain dragging within */
  bounds?: Bounds;
  /** Called when drag starts */
  onDragStart?: () => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
}

/**
 * Apply draggable behavior to a GameObject.
 * Makes the object respond to drag gestures (mouse or touch).
 *
 * @param target - GameObject to make draggable
 * @param options - Draggable options
 * @returns Cleanup function to remove drag behavior
 *
 * @example
 * const cleanup = applyDraggable(myObject, {
 *   onDragStart: () => console.log('Started dragging'),
 *   onDragEnd: () => console.log('Stopped dragging')
 * });
 *
 * // Later, to remove drag behavior:
 * cleanup();
 */
export function applyDraggable(
  target: GameObject,
  options?: DraggableOptions
): () => void;

// ==========================================================================
// Anchor Mixin
// ==========================================================================

/** Options for anchor positioning */
export interface AnchorOptions {
  /** Anchor position (use Position constants like "top-left", "center") */
  anchor?: string;
  /** Margin from edge when anchoring (default: 10) */
  anchorMargin?: number;
  /** Additional X offset after anchoring (default: 0) */
  anchorOffsetX?: number;
  /** Additional Y offset after anchoring (default: 0) */
  anchorOffsetY?: number;
  /** Object to anchor relative to, or true to use parent */
  anchorRelative?: GameObject | boolean;
  /** Whether to set text alignment properties (default: true) */
  anchorSetTextAlign?: boolean;
}

/**
 * Apply anchor positioning to a GameObject.
 * Automatically positions the object relative to the canvas or another object.
 *
 * @param target - GameObject to apply anchoring to
 * @param options - Anchor options
 * @returns The original GameObject for chaining
 *
 * @example
 * import { Position } from 'gcanvas';
 *
 * // Anchor to bottom-right corner
 * applyAnchor(myButton, {
 *   anchor: Position.BOTTOM_RIGHT,
 *   anchorMargin: 20
 * });
 *
 * // Anchor relative to parent
 * applyAnchor(childObject, {
 *   anchor: Position.CENTER,
 *   anchorRelative: true
 * });
 */
export function applyAnchor(
  target: GameObject,
  options?: AnchorOptions
): GameObject;

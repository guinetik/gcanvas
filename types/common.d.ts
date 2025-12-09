/**
 * GCanvas Common Types
 * Shared interfaces and types used across all modules.
 * @module common
 */

// ==========================================================================
// Basic Geometric Types
// ==========================================================================

/** 2D point/position */
export interface Point {
  x: number;
  y: number;
}

/** Bounding box representing position and dimensions */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ==========================================================================
// Animation & Easing Types
// ==========================================================================

/** Easing function type - takes normalized time (0-1) and returns eased value */
export type EasingFunction = (t: number) => number;

/** Event callback type */
export type EventCallback<T = any> = (payload?: T) => void;

/** Callbacks for Motion animation methods */
export interface MotionCallbacks {
  /** Called when animation starts */
  onStart?: () => void;
  /** Called when animation completes (non-looping only) */
  onComplete?: () => void;
  /** Called when animation loops, receives loop count */
  onLoop?: (loopCount: number) => void;
  /** Called each frame with current progress */
  onUpdate?: (progress: number) => void;
}

/** Internal state tracking for Motion animations */
export interface MotionState {
  /** Whether onStart has been called */
  started: boolean;
  /** Current loop count */
  loopCount: number;
  /** Whether animation has completed */
  completed?: boolean;
  /** Animation-specific state data */
  [key: string]: any;
}

/** Result object returned by Motion animation methods */
export interface MotionResult {
  /** Normalized time (0-1) */
  t: number;
  /** Alias for normalized time */
  progress: number;
  /** Whether animation is looping */
  loop: boolean;
  /** Whether animation has completed (non-looping only) */
  completed: boolean;
  /** Internal state for the next call */
  state: MotionState | null;
  /** Animation-specific values (x, y, value, etc.) */
  [key: string]: any;
}

/** Result with position coordinates */
export interface MotionPositionResult extends MotionResult {
  x: number;
  y: number;
}

/** Result with a single value */
export interface MotionValueResult extends MotionResult {
  value: number;
}

/** Result from spring animation */
export interface SpringResult extends MotionResult {
  value: number;
  velocity: number;
}

/** Result from waypoint animation */
export interface WaypointResult extends MotionPositionResult {
  /** Whether currently moving between waypoints */
  moving: boolean;
  /** Current direction of movement */
  direction: string;
  /** Index of current waypoint */
  waypointIndex: number;
}

// ==========================================================================
// Layout Types
// ==========================================================================

/** Options for layout functions */
export interface LayoutOptions {
  /** Horizontal spacing between items */
  spacing?: number;
  /** Starting X position */
  x?: number;
  /** Starting Y position */
  y?: number;
  /** Number of columns (for tile/grid layouts) */
  columns?: number;
  /** Number of rows (for grid layout) */
  rows?: number;
  /** Cell width (for grid layout) */
  cellWidth?: number;
  /** Cell height (for grid layout) */
  cellHeight?: number;
}

/** Result returned by layout functions */
export interface LayoutResult {
  /** Calculated positions for each object */
  positions: Point[];
  /** Total width of the layout */
  width: number;
  /** Total height of the layout */
  height: number;
}

// ==========================================================================
// Penrose Tiling Types
// ==========================================================================

/** RGBA color as 4-element array [R, G, B, A] with values 0-255 */
export type RGBAColor = [number, number, number, number];

/** Options for Penrose tiling generation */
export interface PenroseTilingOptions {
  /** Number of subdivision iterations (default: 5) */
  divisions?: number;
  /** Zoom type: "in" or "out" (default: "in") */
  zoomType?: 'in' | 'out';
  /** Color for thin rhombi (default: red) */
  color1?: RGBAColor;
  /** Color for thick rhombi (default: blue) */
  color2?: RGBAColor;
  /** Color for outlines (default: black) */
  color3?: RGBAColor;
  /** Background color (default: white) */
  backgroundColor?: RGBAColor;
}

/**
 * GCanvas IO Module
 * Input handling and event system.
 * @module io
 */

import { EventCallback } from './common';
import type { Game } from './game';

// ==========================================================================
// Event Emitter
// ==========================================================================

/**
 * Core event management system.
 * Provides publish/subscribe pattern for custom events.
 *
 * @example
 * const emitter = new EventEmitter();
 * emitter.on('explosion', (data) => console.log('Boom!', data));
 * emitter.emit('explosion', { x: 100, y: 200 });
 */
export class EventEmitter {
  /** Map of event types to listener arrays */
  listeners: Record<string, EventCallback[]>;

  constructor();

  /**
   * Subscribe to an event.
   * @param type - Event type/name
   * @param callback - Handler function
   */
  on<T = any>(type: string, callback: EventCallback<T>): void;

  /**
   * Unsubscribe from an event.
   * @param type - Event type/name
   * @param callback - Handler function to remove
   */
  off<T = any>(type: string, callback: EventCallback<T>): void;

  /**
   * Emit an event to all subscribers.
   * @param type - Event type/name
   * @param payload - Data to pass to handlers
   */
  emit<T = any>(type: string, payload?: T): void;
}

// ==========================================================================
// Mouse Input
// ==========================================================================

/**
 * Mouse input tracking.
 * Static class that tracks mouse position and button state.
 *
 * @example
 * // After initialization
 * if (Mouse.isDown) {
 *   console.log(`Mouse clicked at ${Mouse.x}, ${Mouse.y}`);
 * }
 */
export class Mouse {
  /** Current mouse X position relative to canvas */
  static x: number;
  /** Current mouse Y position relative to canvas */
  static y: number;
  /** Whether primary mouse button is pressed */
  static isDown: boolean;

  /**
   * Initialize mouse tracking for a game instance.
   * @param game - Game instance to track mouse on
   */
  static init(game: Game): void;
}

// ==========================================================================
// Keyboard Input
// ==========================================================================

/**
 * Keyboard input with key mapping.
 * Static class that tracks key states with named constants.
 *
 * @example
 * if (Keys.isDown(Keys.SPACE)) {
 *   player.jump();
 * }
 * if (Keys.isDown('a') || Keys.isDown(Keys.LEFT)) {
 *   player.moveLeft();
 * }
 */
export class Keys {
  // Key constants
  /** Left arrow key */
  static readonly LEFT: string;
  /** Right arrow key */
  static readonly RIGHT: string;
  /** Up arrow key */
  static readonly UP: string;
  /** Down arrow key */
  static readonly DOWN: string;
  /** Spacebar */
  static readonly SPACE: string;
  /** Enter key */
  static readonly ENTER: string;
  /** Escape key */
  static readonly ESCAPE: string;
  /** Shift key */
  static readonly SHIFT: string;
  /** Control key */
  static readonly CTRL: string;
  /** Alt key */
  static readonly ALT: string;

  /**
   * Initialize keyboard tracking for a game instance.
   * @param game - Game instance
   */
  static init(game: Game): void;

  /**
   * Check if a key is currently pressed.
   * @param key - Key code or Key constant
   * @returns Whether the key is down
   */
  static isDown(key: string): boolean;
}

// ==========================================================================
// Touch Input
// ==========================================================================

/**
 * Touch input handling for mobile devices.
 * Static class that tracks touch position and state.
 *
 * @example
 * if (Touch.isDown) {
 *   console.log(`Touch at ${Touch.x}, ${Touch.y}`);
 * }
 */
export class Touch {
  /** Current touch X position relative to canvas */
  static x: number;
  /** Current touch Y position relative to canvas */
  static y: number;
  /** Whether screen is being touched */
  static isDown: boolean;

  /**
   * Initialize touch tracking for a game instance.
   * @param game - Game instance
   */
  static init(game: Game): void;
}

// ==========================================================================
// Unified Input
// ==========================================================================

/**
 * Unified input system (mouse + touch normalization).
 * Provides a single interface for both mouse and touch input.
 *
 * @example
 * // Works with both mouse and touch
 * if (Input.isDown) {
 *   console.log(`Pointer at ${Input.x}, ${Input.y}`);
 * }
 */
export class Input {
  /** Current pointer X position (mouse or touch) */
  static x: number;
  /** Current pointer Y position (mouse or touch) */
  static y: number;
  /** Whether pointer is active (mouse down or touching) */
  static isDown: boolean;

  /**
   * Initialize unified input for a game instance.
   * @param game - Game instance
   */
  static init(game: Game): void;
}

// ==========================================================================
// Screen Detection
// ==========================================================================

/**
 * Screen/device detection and responsive utilities.
 * Static class that tracks screen size, device type, and orientation.
 *
 * @example
 * // Get responsive values
 * const scaleFactor = Screen.responsive(1.5, 2, 3);
 *
 * // Check device type
 * if (Screen.isMobile) {
 *   // Mobile-specific logic
 * }
 *
 * // Listen for changes
 * game.events.on('devicechange', (e) => {
 *   console.log('Device type changed:', e.isMobile);
 * });
 */
export class Screen {
  /** Mobile breakpoint in pixels (default: 768) */
  static MOBILE_BREAKPOINT: number;
  /** Tablet breakpoint in pixels (default: 1024) */
  static TABLET_BREAKPOINT: number;

  /** Current screen/window width */
  static width: number;
  /** Current screen/window height */
  static height: number;
  /** Device pixel ratio for high-DPI displays */
  static pixelRatio: number;

  /** Whether device is mobile (width <= MOBILE_BREAKPOINT) */
  static isMobile: boolean;
  /** Whether device is tablet (MOBILE_BREAKPOINT < width <= TABLET_BREAKPOINT) */
  static isTablet: boolean;
  /** Whether device is desktop (width > TABLET_BREAKPOINT) */
  static isDesktop: boolean;
  /** Whether device has touch capability */
  static hasTouch: boolean;

  /** Current orientation: 'portrait' or 'landscape' */
  static orientation: 'portrait' | 'landscape';
  /** Whether screen is in portrait mode */
  static isPortrait: boolean;
  /** Whether screen is in landscape mode */
  static isLandscape: boolean;

  /** Whether wake lock is currently enabled (requested by user) */
  static wakeLockEnabled: boolean;
  /** Whether the Wake Lock API is supported in this browser */
  static wakeLockSupported: boolean;

  /**
   * Initialize screen detection for a game instance.
   * @param game - Game instance
   */
  static init(game: Game): void;

  /**
   * Get a responsive value based on device type.
   * @param mobile - Value for mobile devices
   * @param tablet - Value for tablet devices (defaults to mobile)
   * @param desktop - Value for desktop devices (defaults to tablet)
   * @returns The appropriate value for current device
   */
  static responsive<T>(mobile: T, tablet?: T, desktop?: T): T;

  /**
   * Get a value scaled by pixel ratio for high-DPI displays.
   * @param value - Base value to scale
   * @returns Value multiplied by device pixel ratio
   */
  static scaled(value: number): number;

  /**
   * Check if device is likely touch-primary (mobile/tablet with touch).
   * @returns True if device is touch-primary
   */
  static isTouchPrimary(): boolean;

  /**
   * Get the smaller dimension of the screen.
   * @returns The smaller of width or height
   */
  static minDimension(): number;

  /**
   * Get the larger dimension of the screen.
   * @returns The larger of width or height
   */
  static maxDimension(): number;

  /**
   * Get the aspect ratio (width / height).
   * @returns The aspect ratio
   */
  static aspectRatio(): number;

  /**
   * Check if screen matches a CSS media query.
   * @param query - CSS media query string
   * @returns True if query matches
   */
  static matches(query: string): boolean;

  /**
   * Check if user prefers reduced motion.
   * @returns True if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean;

  /**
   * Check if user prefers dark color scheme.
   * @returns True if user prefers dark mode
   */
  static prefersDarkMode(): boolean;

  // Wake Lock API

  /**
   * Request a wake lock to prevent the screen from sleeping.
   * Useful for games/simulations that should keep the display on.
   * The lock is automatically re-acquired when the page becomes visible.
   * @returns True if wake lock was successfully acquired
   */
  static requestWakeLock(): Promise<boolean>;

  /**
   * Release the wake lock, allowing the screen to sleep normally.
   * Call this when your game/simulation stops or pauses.
   */
  static releaseWakeLock(): Promise<void>;

  /**
   * Check if wake lock is currently active.
   * @returns True if wake lock is held
   */
  static isWakeLockActive(): boolean;
}

// ==========================================================================
// Gesture Recognition
// ==========================================================================

/**
 * Gesture options for configuring zoom, pan, and tap behavior.
 */
export interface GestureOptions {
  /** Callback for zoom: (delta, centerX, centerY) => void. delta > 0 = zoom in */
  onZoom?: (delta: number, centerX: number, centerY: number) => void;
  /** Callback for pan: (dx, dy) => void */
  onPan?: (dx: number, dy: number) => void;
  /** Callback for tap/click: (x, y) => void */
  onTap?: (x: number, y: number) => void;
  /** Callback when drag starts: (x, y) => void */
  onDragStart?: (x: number, y: number) => void;
  /** Callback when drag ends: () => void */
  onDragEnd?: () => void;
  /** Zoom sensitivity for mouse wheel (default: 0.1) */
  wheelZoomFactor?: number;
  /** Zoom sensitivity for pinch gesture (default: 1) */
  pinchZoomFactor?: number;
  /** Scale factor for pan deltas (default: 1) */
  panScale?: number;
  /** Max movement in pixels to still count as tap (default: 10) */
  tapThreshold?: number;
  /** Max duration in ms for tap (default: 300) */
  tapTimeout?: number;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
}

/**
 * High-level gesture recognition for zoom, pan, and tap.
 * Works seamlessly across mouse and touch input.
 *
 * @example
 * const gesture = new Gesture(canvas, {
 *   onZoom: (delta, cx, cy) => {
 *     this.zoom *= delta > 0 ? 1.1 : 0.9;
 *   },
 *   onPan: (dx, dy) => {
 *     this.offsetX += dx;
 *     this.offsetY += dy;
 *   },
 *   onTap: (x, y) => {
 *     this.handleClick(x, y);
 *   }
 * });
 *
 * // Cleanup
 * gesture.destroy();
 */
export class Gesture {
  /** The canvas element gestures are attached to */
  canvas: HTMLCanvasElement;
  /** Whether a drag is currently in progress */
  readonly isDragging: boolean;

  /**
   * Create a new Gesture handler.
   * @param canvas - Canvas element to attach gestures to
   * @param options - Configuration options
   */
  constructor(canvas: HTMLCanvasElement, options?: GestureOptions);

  /**
   * Remove all event listeners and clean up.
   * Call this when the gesture handler is no longer needed.
   */
  destroy(): void;
}

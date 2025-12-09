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

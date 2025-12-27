/**
 * GCanvas State Machine Types
 * State management utilities for game objects.
 * @module state
 */

// ==========================================================================
// State Machine Configuration
// ==========================================================================

/** State transition definition */
export interface StateTransition {
  /** Target state to transition to */
  target?: string;
  /** Guard function - transition only if returns true */
  guard?: (data?: any) => boolean;
  /** Action to run before transition */
  action?: (data?: any) => void;
}

/** Event handlers for a state */
export interface StateEvents {
  [triggerName: string]: string | StateTransition;
}

/** Individual state configuration */
export interface StateConfig {
  /** Duration in seconds before auto-transitioning (optional) */
  duration?: number;
  /** Next state to transition to after duration (for timed states) */
  next?: string;
  /** Called when entering this state */
  enter?: (data?: any) => void;
  /** Called each frame while in this state */
  update?: (dt: number) => void;
  /** Called when leaving this state */
  exit?: (data?: any) => void;
  /** Called when a timed state completes without a 'next' state */
  onComplete?: () => void;
  /** Event-based transitions */
  on?: StateEvents;
}

/** State definitions object */
export interface States {
  [stateName: string]: StateConfig;
}

/** StateMachine constructor options */
export interface StateMachineOptions {
  /** Initial state name */
  initial?: string;
  /** State definitions */
  states?: States;
  /** Context object passed to callbacks (usually `this`) */
  context?: any;
}

/** Phase definition for sequence-based state machines */
export interface PhaseConfig {
  /** Phase name */
  name: string;
  /** Phase duration in seconds */
  duration: number;
  /** Called when entering this phase */
  enter?: () => void;
  /** Called each frame during this phase */
  update?: (dt: number) => void;
  /** Called when leaving this phase */
  exit?: () => void;
}

/** Options for StateMachine.fromSequence() */
export interface SequenceOptions {
  /** Whether to loop back to first phase after last */
  loop?: boolean;
  /** Called when sequence completes (if not looping) */
  onComplete?: () => void;
  /** Context object passed to callbacks */
  context?: any;
}

// ==========================================================================
// StateMachine Class
// ==========================================================================

/**
 * Flexible state management for game objects.
 * Manages states with enter/update/exit lifecycle callbacks.
 * Supports timed transitions, sequential phases, and conditional triggers.
 *
 * @example
 * // Basic usage
 * const fsm = new StateMachine({
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       enter: () => console.log('Now idle'),
 *       update: (dt) => { // per-frame logic },
 *       exit: () => console.log('Leaving idle')
 *     },
 *     walking: {
 *       enter: () => player.startWalkAnimation(),
 *       update: (dt) => player.move(dt)
 *     }
 *   }
 * });
 *
 * @example
 * // Timed phase sequence
 * const laser = new StateMachine({
 *   initial: 'warning',
 *   states: {
 *     warning: { duration: 0.3, next: 'charging' },
 *     charging: { duration: 0.2, next: 'active' },
 *     active: {
 *       duration: 0.4,
 *       next: 'fade',
 *       enter: () => { laser.canDamage = true; }
 *     },
 *     fade: {
 *       duration: 0.2,
 *       exit: () => { laser.destroy(); }
 *     }
 *   }
 * });
 */
export class StateMachine {
  /** State definitions */
  states: States;

  /** Current state name */
  currentState: string | null;

  /** Previous state name */
  previousState: string | null;

  /** Time spent in current state */
  stateTime: number;

  /** Context passed to state callbacks */
  context: any;

  /** Whether the state machine is paused */
  paused: boolean;

  /** Global state change callback */
  onStateChange: ((newState: string, previousState: string | null, data?: any) => void) | null;

  constructor(config?: StateMachineOptions);

  /**
   * Get the current state name
   */
  get state(): string | null;

  /**
   * Get the current state configuration
   */
  get currentStateConfig(): StateConfig | null;

  /**
   * Check if currently in a specific state
   */
  is(stateName: string): boolean;

  /**
   * Check if currently in any of the given states
   */
  isAny(...stateNames: string[]): boolean;

  /**
   * Add or update a state definition
   * @returns this for chaining
   */
  addState(name: string, config: StateConfig): this;

  /**
   * Remove a state definition
   * @returns this for chaining
   */
  removeState(name: string): this;

  /**
   * Transition to a new state
   * @param newState - State to transition to
   * @param data - Optional data passed to enter callback
   * @returns True if transition occurred
   */
  setState(newState: string, data?: any): boolean;

  /**
   * Attempt to transition based on a trigger/event
   * @param trigger - Trigger name to check against state transitions
   * @param data - Optional data passed to callbacks
   * @returns True if a transition occurred
   */
  trigger(trigger: string, data?: any): boolean;

  /**
   * Update the state machine (call each frame)
   * @param dt - Delta time in seconds
   */
  update(dt: number): void;

  /**
   * Get normalized progress through current state (0-1)
   * Only meaningful for states with a duration
   */
  get progress(): number;

  /**
   * Get remaining time in current state
   * Only meaningful for states with a duration
   */
  get remaining(): number;

  /**
   * Check if current state is a timed state
   */
  get isTimed(): boolean;

  /**
   * Pause the state machine (stops update processing)
   */
  pause(): void;

  /**
   * Resume the state machine
   */
  resume(): void;

  /**
   * Reset to initial state or specific state
   * @param state - State to reset to (defaults to first defined state)
   */
  reset(state?: string): void;

  /**
   * Create a state machine from a simple phase sequence.
   * Convenience method for common "phase 1 → phase 2 → phase 3" patterns.
   *
   * @example
   * const lightning = StateMachine.fromSequence([
   *   { name: 'tracing', duration: 0.4, enter: () => startTrace() },
   *   { name: 'active', duration: 0.3, enter: () => enableDamage() },
   *   { name: 'fade', duration: 0.2, exit: () => destroy() }
   * ]);
   */
  static fromSequence(phases: PhaseConfig[], options?: SequenceOptions): StateMachine;
}

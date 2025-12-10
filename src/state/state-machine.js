/**
 * StateMachine - Flexible state management for game objects
 *
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
 *       update: (dt) => { /* per-frame logic *\/ },
 *       exit: () => console.log('Leaving idle')
 *     },
 *     walking: {
 *       enter: () => player.startWalkAnimation(),
 *       update: (dt) => player.move(dt)
 *     }
 *   }
 * });
 *
 * // Change state
 * fsm.setState('walking');
 *
 * // Update each frame
 * fsm.update(dt);
 *
 * @example
 * // Timed phase sequence (like laser charging)
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
  /**
   * Create a new state machine
   *
   * @param {Object} config - Configuration object
   * @param {string} config.initial - Initial state name
   * @param {Object} config.states - State definitions
   * @param {Object} [config.context] - Context object passed to callbacks (usually `this`)
   */
  constructor(config = {}) {
    /** @type {Object} State definitions */
    this.states = config.states || {};

    /** @type {string|null} Current state name */
    this.currentState = null;

    /** @type {string|null} Previous state name */
    this.previousState = null;

    /** @type {number} Time spent in current state */
    this.stateTime = 0;

    /** @type {Object} Context passed to state callbacks */
    this.context = config.context || null;

    /** @type {boolean} Whether the state machine is paused */
    this.paused = false;

    /** @type {Function|null} Global state change callback */
    this.onStateChange = null;

    // Enter initial state
    if (config.initial) {
      this.setState(config.initial);
    }
  }

  /**
   * Get the current state name
   * @returns {string|null}
   */
  get state() {
    return this.currentState;
  }

  /**
   * Get the current state definition
   * @returns {Object|null}
   */
  get currentStateConfig() {
    return this.currentState ? this.states[this.currentState] : null;
  }

  /**
   * Check if currently in a specific state
   *
   * @param {string} stateName - State to check
   * @returns {boolean}
   */
  is(stateName) {
    return this.currentState === stateName;
  }

  /**
   * Check if currently in any of the given states
   *
   * @param {...string} stateNames - States to check
   * @returns {boolean}
   */
  isAny(...stateNames) {
    return stateNames.includes(this.currentState);
  }

  /**
   * Add or update a state definition
   *
   * @param {string} name - State name
   * @param {Object} config - State configuration
   * @returns {StateMachine} this for chaining
   */
  addState(name, config) {
    this.states[name] = config;
    return this;
  }

  /**
   * Remove a state definition
   *
   * @param {string} name - State name to remove
   * @returns {StateMachine} this for chaining
   */
  removeState(name) {
    delete this.states[name];
    return this;
  }

  /**
   * Transition to a new state
   *
   * @param {string} newState - State to transition to
   * @param {Object} [data] - Optional data passed to enter callback
   * @returns {boolean} True if transition occurred
   */
  setState(newState, data) {
    if (!this.states[newState]) {
      console.warn(`StateMachine: Unknown state '${newState}'`);
      return false;
    }

    // Exit current state
    if (this.currentState) {
      const currentConfig = this.states[this.currentState];
      if (currentConfig?.exit) {
        this._call(currentConfig.exit, data);
      }
    }

    // Update state tracking
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;

    // Enter new state
    const newConfig = this.states[newState];
    if (newConfig?.enter) {
      this._call(newConfig.enter, data);
    }

    // Global callback
    if (this.onStateChange) {
      this.onStateChange(newState, this.previousState, data);
    }

    return true;
  }

  /**
   * Attempt to transition based on a trigger/event
   *
   * @param {string} trigger - Trigger name to check against state transitions
   * @param {Object} [data] - Optional data passed to callbacks
   * @returns {boolean} True if a transition occurred
   */
  trigger(trigger, data) {
    const config = this.currentStateConfig;
    if (!config?.on) return false;

    const transition = config.on[trigger];
    if (!transition) return false;

    // Transition can be a string (state name) or object { target, guard, action }
    if (typeof transition === "string") {
      return this.setState(transition, data);
    }

    // Check guard condition
    if (transition.guard && !this._call(transition.guard, data)) {
      return false;
    }

    // Run action before transition
    if (transition.action) {
      this._call(transition.action, data);
    }

    // Transition to target state
    if (transition.target) {
      return this.setState(transition.target, data);
    }

    return false;
  }

  /**
   * Update the state machine (call each frame)
   *
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.paused || !this.currentState) return;

    this.stateTime += dt;

    const config = this.states[this.currentState];
    if (!config) return;

    // Run update callback
    if (config.update) {
      this._call(config.update, dt);
    }

    // Check for timed auto-transition
    if (config.duration !== undefined && this.stateTime >= config.duration) {
      if (config.next) {
        this.setState(config.next);
      } else if (config.onComplete) {
        this._call(config.onComplete);
      }
    }
  }

  /**
   * Get normalized progress through current state (0-1)
   * Only meaningful for states with a duration
   *
   * @returns {number} Progress from 0 to 1
   */
  get progress() {
    const config = this.currentStateConfig;
    if (!config?.duration) return 0;
    return Math.min(1, this.stateTime / config.duration);
  }

  /**
   * Get remaining time in current state
   * Only meaningful for states with a duration
   *
   * @returns {number} Remaining time in seconds
   */
  get remaining() {
    const config = this.currentStateConfig;
    if (!config?.duration) return Infinity;
    return Math.max(0, config.duration - this.stateTime);
  }

  /**
   * Check if current state is a timed state
   *
   * @returns {boolean}
   */
  get isTimed() {
    return this.currentStateConfig?.duration !== undefined;
  }

  /**
   * Pause the state machine (stops update processing)
   */
  pause() {
    this.paused = true;
  }

  /**
   * Resume the state machine
   */
  resume() {
    this.paused = false;
  }

  /**
   * Reset to initial state or specific state
   *
   * @param {string} [state] - State to reset to (defaults to first defined state)
   */
  reset(state) {
    this.stateTime = 0;
    this.previousState = null;

    if (state) {
      this.setState(state);
    } else {
      // Find first state key
      const firstState = Object.keys(this.states)[0];
      if (firstState) {
        this.setState(firstState);
      }
    }
  }

  /**
   * Call a callback with context binding
   * @private
   */
  _call(fn, ...args) {
    if (typeof fn === "function") {
      return this.context ? fn.call(this.context, ...args) : fn(...args);
    }
    return undefined;
  }

  /**
   * Create a state machine from a simple phase sequence
   * Convenience method for common "phase 1 → phase 2 → phase 3" patterns
   *
   * @param {Array<Object>} phases - Array of { name, duration, enter?, update?, exit? }
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.loop=false] - Whether to loop back to first phase
   * @param {Function} [options.onComplete] - Called when sequence completes (if not looping)
   * @returns {StateMachine}
   *
   * @example
   * const lightning = StateMachine.fromSequence([
   *   { name: 'tracing', duration: 0.4, enter: () => startTrace() },
   *   { name: 'active', duration: 0.3, enter: () => enableDamage() },
   *   { name: 'fade', duration: 0.2, exit: () => destroy() }
   * ]);
   */
  static fromSequence(phases, options = {}) {
    const states = {};

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const isLast = i === phases.length - 1;
      const nextPhase = isLast
        ? (options.loop ? phases[0].name : null)
        : phases[i + 1].name;

      states[phase.name] = {
        duration: phase.duration,
        next: nextPhase,
        enter: phase.enter,
        update: phase.update,
        exit: phase.exit,
        onComplete: isLast && !options.loop ? options.onComplete : undefined,
      };
    }

    return new StateMachine({
      initial: phases[0]?.name,
      states,
      context: options.context,
    });
  }
}

import { bezierV1 } from "./bezier.js";
import { bounceV1 } from "./bounce.js";
import { floatV1 } from "./float.js";
import { followPath } from "./follow.js";
import { orbitV1 } from "./orbit.js";
import { oscillateV1 } from "./oscillate.js";
import { parabolicV1 } from "./parabolic.js";
import { patrolV1 } from "./patrol.js";
import { pendulumV1 } from "./pendulum.js";
import { pulseV1 } from "./pulse.js";
import { hopV1 } from "./hop.js";
import { shakeV1 } from "./shake.js";
import { spiralV1 } from "./spiral.js";
import { springV1 } from "./spring.js";
import { swingV1 } from "./swing.js";
import { waypointV1 } from "./waypoint.js";

/**
 * @class
 * A utility class that provides a collection of stateless animation primitive functions meant to have a simple but consistent API.
 * 
 * Each animation method accepts time parameters and returns interpolated values without storing
 * state between calls, making it suitable for any rendering loop or game engine.
 * 
 * This class does not mutate values on target objects; instead it returns a result with the value for the current frame.
 * 
 * The caller is responsible for updating their entities with the result.
 * 
 * The goal is to provide out-of-the box, configurable animation loops that can be adapted to diferent contexts.
 * 
 * If you want simple object property interpolation checkout {@link Tweenetik}.<br/><br/>
 * 
 * Unlike {@link Tweenetik}, which mutates target objects directly and manages time internally for UI transitions,
 * Motion is designed for real-time game loops or simulations where you control the update timing (`dt`) externally.
 * <br/>
 * Use Motion when you want precise, stateless, loop-driven animations tied to elapsed time.
 * <br/>
 * Use Tweenetik for one-off UI animations like button presses, transitions, or effects decoupled from game time.
 * <br/><br/>
 * Each animation method follows the same pattern:<br/>
 * - Takes elapsed time and duration parameters<br/>
 * - Returns a standardized result object with animation values and metadata<br/>
 * - Maintains a stateless design (input same time parameters, get same result)<br/>
 * - Supports looping, callbacks, and customizable parameters<br/>
 *<br/><br/>
 * Core animation concepts:<br/>
 * - Animations are driven by elapsed time, not frame counts<br/>
 * - Values are interpolated using normalized time (0-1)<br/>
 * - Optional easing functions can be applied to create custom motion curves<br/>
 * - All animations support loop and yoyo options for cyclic behavior<br/>
 *
 * @example
 * // Basic usage with a game loop
 * function update(dt) {
 *   // Update animation time
 *   character.animTime += dt;
 *
 *   // Get interpolated position using a spring animation
 *   const result = Motion.spring(
 *     0,                 // Initial position
 *     100,               // Target position
 *     character.animTime, // Current time
 *     1.5,               // Duration
 *     true,              // Loop
 *     true,              // Yoyo
 *     { stiffness: 0.7, damping: 0.5 }
 *   );
 *
 *   // Apply the result
 *   character.x = result.value;
 * }
 *
 * @example
 * // Animating along a path with waypoints
 * function updateGuard(dt) {
 *   guard.animTime += dt;
 *
 *   const result = Motion.waypoint(
 *     guard,           // Target object
 *     guard.animTime,  // Current time
 *     [                // Array of waypoints
 *       [0, 0],
 *       [100, 0],
 *       [100, 100],
 *       [0, 100]
 *     ],
 *     50,              // Speed (units per second)
 *     2,               // Wait time at each point
 *     true             // Loop
 *   );
 *
 *   // Apply position
 *   guard.x = result.x;
 *   guard.y = result.y;
 *
 *   // Update animation state
 *   if (result.moving) {
 *     guard.playAnimation('walk_' + result.direction);
 *   } else {
 *     guard.playAnimation('idle');
 *   }
 * }
 *
 * @example
 * // Creating a floating effect
 * function updateBoat(dt) {
 *   boat.animTime += dt;
 *
 *   const result = Motion.float(
 *     boat.originalX,
 *     boat.originalY,
 *     boat.animTime,
 *     5,               // Duration
 *     0.5,             // Speed
 *     0.7,             // Energy/randomness
 *     15,              // Float radius
 *     true             // Loop
 *   );
 *
 *   // Apply position
 *   boat.x = result.x;
 *   boat.y = result.y;
 * }
 */
export class Motion {
  
  /**
   * Base animation result constructor
   * Creates a standardized result object for all animations
   *
   * @param {Object} values - The calculated animation values
   * @param {number} t - Current normalized time (0-1)
   * @param {boolean} loop - Whether the animation is looping
   * @param {boolean} completed - Whether a non-looping animation has completed
   * @param {Object} state - Internal state object for continuity between calls
   * @returns {Object} Standardized animation result
   */
  static animationResult(values, t, loop, completed = false, state = null) {
    return {
      ...values, // Animation-specific values (x, y, value, etc.)
      t, // Normalized time (0-1)
      progress: t, // Alias for normalized time
      loop, // Whether animation is looping
      completed, // Whether animation has completed (non-looping only)
      state, // Internal state for the next call
    };
  }

  /**
   * Processes time and calculates normalized t value
   * Handles looping, duration, and triggers callbacks
   *
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one animation cycle in seconds
   * @param {boolean} loop - Whether animation should loop
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onStart] - Called when animation starts
   * @param {Function} [callbacks.onComplete] - Called when animation completes
   * @param {Function} [callbacks.onLoop] - Called when animation loops
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} { t, completed, state }
   */
  static _step(
    elapsedTime,
    duration,
    loop,
    callbacks = {},
    state = { started: false, loopCount: 0 }
  ) {
    // Calculate normalized time (0 to 1)
    let t = duration > 0 ? elapsedTime / duration : 1;
    let completed = false;
    // Handle callback state if not provided
    state = state || { started: false, loopCount: 0 };
    // Call onStart callback once
    if (!state.started && callbacks.onStart) {
      callbacks.onStart();
      state.started = true;
    }

    // Handle looping
    if (loop) {
      // Get only the fractional part for looping animations
      t = t % 1;
      // Track loop count for onLoop callback
      const newLoopCount = Math.floor(elapsedTime / duration);
      if (newLoopCount > state.loopCount && callbacks.onLoop) {
        callbacks.onLoop(newLoopCount);
        state.loopCount = newLoopCount;
      }
    } else {
      // Clamp to 1 for non-looping animations
      if (t >= 1) {
        t = 1;
        completed = true;
        // Call onComplete callback once
        if (!state.completed && callbacks.onComplete) {
          callbacks.onComplete();
          state.completed = true;
        }
      }
    }

    return { t, completed, state };
  }

  /**
   * Updates animation time and applies easing
   *
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} loop - Whether animation should loop
   * @param {Function} [easingFn=null] - Easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} { t, easedT, completed, state }
   */
  static _frame(
    elapsedTime,
    duration,
    loop,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    // Process time and handle callbacks
    const {
      t,
      completed,
      state: newState,
    } = this._step(elapsedTime, duration, loop, callbacks, state);
    // Apply easing if provided
    const easedT = easingFn ? easingFn(t) : t;
    return { t, easedT, completed, state: newState };
  }

  /**
   * Oscillate between min and max value using sine
   *
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full oscillation in seconds
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with value and metadata
   */
  static oscillate(
    min,
    max,
    elapsedTime,
    duration,
    loop = true,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return oscillateV1(
      min,
      max,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Parabolic arc interpolation
   *
   * @param {number} start - Start value
   * @param {number} peak - Peak value
   * @param {number} end - End value
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop (restart from beginning)
   * @param {boolean} [yoyo=false] - Whether animation should reverse direction at the end
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with value and metadata
   */
  static parabolic(
    start,
    peak,
    end,
    elapsedTime,
    duration,
    loop = false,
    yoyo = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return parabolicV1(
      start,
      peak,
      end,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Patrol animation - creates movement around an area with natural pausing
   * Perfect for characters patrolling or objects drifting within bounds
   *
   * @param {Object} target - Object with x,y properties defining the center point
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full float cycle in seconds
   * @param {number} speed - Movement speed multiplier (0.1-2.0 recommended)
   * @param {number} randomness - How random/unpredictable the float path is (0-1)
   * @param {number} radius - Radius of float area (object will move within -radius to +radius)
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks and initial position
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static float(
    target,
    elapsedTime,
    duration,
    speed,
    randomness,
    radius,
    loop = true,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return floatV1(
      target,
      elapsedTime,
      duration,
      speed,
      randomness,
      radius,
      loop,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Spring animation that uses elastic easing functions for a bouncy spring effect
   * Stateless implementation that doesn't require previous frame state
   *
   * @param {number} initial - Initial value (starting position)
   * @param {number} target - Target value (ending position)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one complete cycle in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {boolean} [yoyo=false] - Whether animation should return to initial value
   * @param {Object} [springParams] - Spring parameters
   * @param {number} [springParams.stiffness=0.3] - Spring stiffness (0-1)
   * @param {number} [springParams.damping=0.6] - Damping factor (0-1)
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onStart] - Called when animation starts
   * @param {Function} [callbacks.onComplete] - Called when animation completes
   * @param {Function} [callbacks.onLoop] - Called when animation loops
   * @param {Function} [callbacks.onYoyoTurn] - Called when yoyo animation changes direction
   * @returns {Object} Animation result with value, velocity and metadata
   */
  static spring(
    initial,
    target,
    elapsedTime,
    duration,
    loop = false,
    yoyo = false,
    springParams = {},
    callbacks = {}
  ) {
    return springV1(
      initial,
      target,
      elapsedTime,
      duration,
      loop,
      yoyo,
      springParams,
      callbacks
    );
  }

  static swing(
    centerX,
    centerY,
    maxAngle,
    elapsedTime,
    duration,
    loop = true,
    yoyo = true,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return swingV1(
      centerX,
      centerY,
      maxAngle,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }

  static pendulum(
    originAngle,
    amplitude,
    elapsedTime,
    duration,
    loop = true,
    damped = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return pendulumV1(
      originAngle,
      amplitude,
      elapsedTime,
      duration,
      loop,
      damped,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Pulse between min and max value and back
   *
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full pulse in seconds
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {boolean} [yoyo=false] - Whether to use separate easing for return journey
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @returns {Object} Animation result with value and metadata
   */
  static pulse(
    min,
    max,
    elapsedTime,
    duration,
    loop = true,
    yoyo = false,
    easingFn = null,
    callbacks = {}
  ) {
    return pulseV1(
      min,
      max,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      (callbacks = {})
    );
  }

  /**
   * Spiral motion animation
   *
   * @param {number} centerX - X coordinate of spiral center
   * @param {number} centerY - Y coordinate of spiral center
   * @param {number} startRadius - Starting radius of the spiral
   * @param {number} endRadius - Ending radius of the spiral
   * @param {number} startAngle - Starting angle in radians
   * @param {number} revolutions - Number of complete revolutions
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop (restart from beginning)
   * @param {boolean} [yoyo=false] - Whether animation should reverse direction at the end
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static spiral(
    centerX,
    centerY,
    startRadius,
    endRadius,
    startAngle,
    revolutions,
    elapsedTime,
    duration,
    loop = false,
    yoyo = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return spiralV1(
      centerX,
      centerY,
      startRadius,
      endRadius,
      startAngle,
      revolutions,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Orbit motion animation (circular or elliptical)
   *
   * @param {number} centerX - X coordinate of orbit center
   * @param {number} centerY - Y coordinate of orbit center
   * @param {number} radiusX - X radius of the orbit (horizontal)
   * @param {number} radiusY - Y radius of the orbit (vertical)
   * @param {number} startAngle - Starting angle in radians
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full orbit in seconds
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {boolean} [clockwise=true] - Direction of orbit
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static orbit(
    centerX,
    centerY,
    radiusX,
    radiusY,
    startAngle,
    elapsedTime,
    duration,
    loop = true,
    clockwise = true,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return orbitV1(
      centerX,
      centerY,
      radiusX,
      radiusY,
      startAngle,
      elapsedTime,
      duration,
      loop,
      clockwise,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Bezier curve motion animation with yoyo support
   *
   * @param {Array<number>} p0 - Start point [x, y]
   * @param {Array<number>} p1 - Control point 1 [x, y]
   * @param {Array<number>} p2 - Control point 2 [x, y]
   * @param {Array<number>} p3 - End point [x, y]
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {boolean} [yoyo=false] - Whether animation should return to start
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static bezier(
    p0,
    p1,
    p2,
    p3,
    elapsedTime,
    duration,
    loop = false,
    yoyo = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return bezierV1(
      p0,
      p1,
      p2,
      p3,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Bounce animation - object drops and bounces with diminishing height
   *
   * @param {number} maxHeight - Maximum height (negative y value)
   * @param {number} groundY - Ground position (positive y value)
   * @param {number} bounceCount - Number of bounces to perform
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with y position and metadata
   */
  static bounce(
    maxHeight,
    groundY,
    bounceCount,
    elapsedTime,
    duration,
    loop = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return bounceV1(
      maxHeight,
      groundY,
      bounceCount,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Shake animation with decreasing intensity
   *
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} maxOffsetX - Maximum X offset
   * @param {number} maxOffsetY - Maximum Y offset
   * @param {number} frequency - Frequency of shakes
   * @param {number} decay - How quickly the shake decreases (0-1)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static shake(
    centerX,
    centerY,
    maxOffsetX,
    maxOffsetY,
    frequency,
    decay,
    elapsedTime,
    duration,
    loop = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return shakeV1(
      centerX,
      centerY,
      maxOffsetX,
      maxOffsetY,
      frequency,
      decay,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }

  static follow(
    points,
    closed = false,
    elapsedTime,
    duration,
    loop = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return followPath(
      points,
      closed,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * Waypoint is a patrol animation that follows a path of waypoints with proper waiting periods
   * Moves characters along cardinal directions (horizontal and vertical movement)
   *
   * @param {Object} target - Object with x,y properties (not used for position calculation)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {Array<Array<number>>} waypoints - Array of waypoints [[x1,y1], [x2,y2], ...]
   * @param {number} speed - Movement speed in units per second
   * @param {number} waitTime - Time to wait at each waypoint in seconds
   * @param {boolean} [loop=true] - Whether patrol should loop back to start
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onWaypointReached] - Called when reaching a waypoint
   * @param {Function} [callbacks.onWaitStart] - Called when starting to wait at a waypoint
   * @param {Function} [callbacks.onWaitEnd] - Called when done waiting at a waypoint
   * @param {Function} [callbacks.onPatrolComplete] - Called when patrol is complete (non-looping only)
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result with position and patrol metadata
   */
  static waypoint(
    target,
    elapsedTime,
    waypoints,
    speed,
    waitTime,
    loop = true,
    callbacks = {},
    state = null
  ) {
    return waypointV1(
      target,
      elapsedTime,
      waypoints,
      speed,
      waitTime,
      loop,
      callbacks,
      state
    );
  }

  /**
   * Simple patrol animation that moves randomly within a radius
   * Character moves along cardinal directions with waiting periods
   *
   * @param {number} initialX - Initial X position (center point)
   * @param {number} initialY - Initial Y position (center point)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} moveTime - Time to spend moving between points
   * @param {number} waitTime - Time to wait at each point
   * @param {number} radius - Maximum distance from center point
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result with position and direction
   */
  static patrol(
    initialX,
    initialY,
    elapsedTime,
    moveTime,
    waitTime,
    radius,
    loop = true,
    state = null
  ) {
    return patrolV1(
      initialX,
      initialY,
      elapsedTime,
      moveTime,
      waitTime,
      radius,
      loop,
      state
    );
  }

  /**
   * Hop animation - makes the object jump up and down rhythmically
   *
   * @param {number} baseY - The ground/base Y position
   * @param {number} hopHeight - Maximum height (negative Y offset)
   * @param {number} elapsedTime - Elapsed time in seconds
   * @param {number} duration - Duration of one hop (up and down)
   * @param {boolean} [loop=true] - Whether the hop repeats
   * @param {Function} [easingFn=null] - Optional easing for jump arc
   * @param {Object} [callbacks={}] - Optional callback functions
   * @param {Object} [state=null] - Internal state
   * @returns {Object} Animation result with y position
   */
  static hop(
    baseY,
    hopHeight,
    elapsedTime,
    duration,
    loop = true,
    yoyo = true,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    return hopV1(
      baseY,
      hopHeight,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }

  /**
   * !!!!
   * ANIMATION GROUPING
   * VERY MUCH EXPERIMENTAL AT THIS POINT
   * !!!!
   */

  /**
   * Group multiple animations together
   *
   * @param {Array<Function>} animations - Array of animation function references
   * @param {Array<Array>} animationArgs - Array of argument arrays for each animation
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply to all animations
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks and animations
   * @returns {Object} Combined animation result with results from all animations
   */
  static group(
    animations,
    animationArgs,
    elapsedTime,
    duration,
    loop = false,
    easingFn = null,
    callbacks = {},
    state = null
  ) {
    // Initialize state with animation states array if not provided
    if (!state) {
      state = {
        started: false,
        loopCount: 0,
        animationStates: Array(animations.length).fill(null),
      };
    }

    // Update animation time and apply easing
    const {
      t,
      easedT,
      completed,
      state: newState,
    } = this._frame(elapsedTime, duration, loop, easingFn, callbacks, state);

    // Run all animations with same timing
    const results = {};

    for (let i = 0; i < animations.length; i++) {
      const animFn = animations[i];
      const args = [...animationArgs[i]];

      // Replace timing arguments with our timing
      // Find time/duration/loop arguments based on the function signature
      if (
        animFn === this.parabolic ||
        animFn === this.oscillate ||
        animFn === this.pulse
      ) {
        // Format: (params..., elapsedTime, duration, loop, ...)
        args[3] = elapsedTime;
        args[4] = duration;
        args[5] = loop;
        if (args[6] === undefined) args[6] = easingFn;
      } else if (animFn === this.spring) {
        // Format: (current, target, elapsedTime, duration, loop, ...)
        args[2] = elapsedTime;
        args[3] = duration;
        args[4] = loop;
      } else if (animFn === this.spiral || animFn === this.bezier) {
        // Format: (params..., elapsedTime, duration, loop, ...)
        args[6] = elapsedTime;
        args[7] = duration;
        args[8] = loop;
        if (args[9] === undefined) args[9] = easingFn;
      } else if (animFn === this.orbit) {
        // Format: (params..., elapsedTime, duration, loop, clockwise, ...)
        args[5] = elapsedTime;
        args[6] = duration;
        args[7] = loop;
        // Skip args[8] as it's clockwise
        if (args[9] === undefined) args[9] = easingFn;
      } else if (animFn === this.bounce || animFn === this.shake) {
        // Format: (params..., elapsedTime, duration, loop, ...)
        args[6] = elapsedTime;
        args[7] = duration;
        args[8] = loop;
        if (args[9] === undefined) args[9] = easingFn;
      } else if (animFn === this.followPath) {
        // Format: (points, closed, elapsedTime, duration, loop, ...)
        args[2] = elapsedTime;
        args[3] = duration;
        args[4] = loop;
        if (args[5] === undefined) args[5] = easingFn;
      }

      // Add state to arguments
      args.push(callbacks);
      args.push(newState.animationStates[i]);

      // Run animation
      const result = animFn.apply(this, args);

      // Store updated state
      newState.animationStates[i] = result.state;

      // Add result to results object with key based on index
      const key = `anim${i}`;
      results[key] = result;
    }

    // Return combined result
    return this.animationResult(results, t, loop, completed, newState);
  }

  /**
   * Sequence multiple animations one after another
   *
   * @param {Array<Function>} animations - Array of animation function references
   * @param {Array<Array>} animationArgs - Array of argument arrays for each animation
   * @param {Array<number>} durations - Array of durations for each animation
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {boolean} [loop=false] - Whether the entire sequence should loop
   * @param {Array<Function>} [easingFns=null] - Optional array of easing functions for each animation
   * @param {Object} [callbacks] - Optional callback functions for the entire sequence
   * @param {Object} [animCallbacks] - Optional array of callback objects for individual animations
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result from current active animation with sequence metadata
   */
  static sequence(
    animations,
    animationArgs,
    durations,
    elapsedTime,
    loop = false,
    easingFns = null,
    callbacks = {},
    animCallbacks = null,
    state = null
  ) {
    // Initialize state with animation states array if not provided
    if (!state) {
      state = {
        started: false,
        loopCount: 0,
        animationStates: Array(animations.length).fill(null),
        currentAnim: 0,
        animStartTimes: [0],
        totalDuration: 0,
      };

      // Calculate start times and total duration
      let timeAccumulator = 0;
      for (let i = 0; i < durations.length; i++) {
        timeAccumulator += durations[i];
        if (i < durations.length - 1) {
          state.animStartTimes.push(timeAccumulator);
        }
      }
      state.totalDuration = timeAccumulator;
    }

    // Handle loop logic for the entire sequence
    let localElapsedTime = elapsedTime;
    if (loop && state.totalDuration > 0) {
      localElapsedTime = elapsedTime % state.totalDuration;

      // Track loop count for callback
      const newLoopCount = Math.floor(elapsedTime / state.totalDuration);
      if (newLoopCount > state.loopCount && callbacks.onLoop) {
        callbacks.onLoop(newLoopCount);
        state.loopCount = newLoopCount;
      }
    }

    // Call onStart callback once
    if (!state.started && callbacks.onStart) {
      callbacks.onStart();
      state.started = true;
    }

    // Find current animation based on elapsed time
    let currentAnim = 0;
    for (let i = animations.length - 1; i >= 0; i--) {
      if (localElapsedTime >= state.animStartTimes[i]) {
        currentAnim = i;
        break;
      }
    }

    // Update current animation property
    state.currentAnim = currentAnim;

    // Calculate time within current animation
    const animStartTime = state.animStartTimes[currentAnim];
    const animElapsedTime = localElapsedTime - animStartTime;
    const animDuration = durations[currentAnim];

    // Get animation function and arguments
    const animFn = animations[currentAnim];
    const args = [...animationArgs[currentAnim]];

    // Apply proper timing to animation args based on function type
    // This follows the same pattern as in group()
    if (
      animFn === this.parabolic ||
      animFn === this.oscillate ||
      animFn === this.pulse
    ) {
      args[3] = animElapsedTime;
      args[4] = animDuration;
      args[5] = false; // Never loop individual animations
      if (easingFns && easingFns[currentAnim]) args[6] = easingFns[currentAnim];
    } else if (animFn === this.spring) {
      args[2] = animElapsedTime;
      args[3] = animDuration;
      args[4] = false;
    } else if (animFn === this.spiral || animFn === this.bezier) {
      args[6] = animElapsedTime;
      args[7] = animDuration;
      args[8] = false;
      if (easingFns && easingFns[currentAnim]) args[9] = easingFns[currentAnim];
    } else if (animFn === this.orbit) {
      args[5] = animElapsedTime;
      args[6] = animDuration;
      args[7] = false;
      // Skip args[8] as it's clockwise
      if (easingFns && easingFns[currentAnim]) args[9] = easingFns[currentAnim];
    } else if (animFn === this.bounce || animFn === this.shake) {
      args[6] = animElapsedTime;
      args[7] = animDuration;
      args[8] = false;
      if (easingFns && easingFns[currentAnim]) args[9] = easingFns[currentAnim];
    } else if (animFn === this.followPath) {
      args[2] = animElapsedTime;
      args[3] = animDuration;
      args[4] = false;
      if (easingFns && easingFns[currentAnim]) args[5] = easingFns[currentAnim];
    }

    // Add individual animation callbacks if provided
    const currentAnimCallbacks =
      animCallbacks && animCallbacks[currentAnim]
        ? animCallbacks[currentAnim]
        : {};

    // Run animation with its state
    const result = animFn.apply(this, [
      ...args,
      currentAnimCallbacks,
      state.animationStates[currentAnim],
    ]);

    // Store updated state
    state.animationStates[currentAnim] = result.state;

    // Check if the entire sequence is completed
    const completed = !loop && localElapsedTime >= state.totalDuration;

    // Call onComplete callback once when the entire sequence completes
    if (completed && !state.completed && callbacks.onComplete) {
      callbacks.onComplete();
      state.completed = true;
    }

    // Return enhanced result with sequence metadata
    return this.animationResult(
      {
        ...result,
        currentAnim,
        totalAnimations: animations.length,
        sequenceProgress: Math.min(localElapsedTime / state.totalDuration, 1),
      },
      localElapsedTime / state.totalDuration, // t normalized to entire sequence
      loop,
      completed,
      state
    );
  }
}

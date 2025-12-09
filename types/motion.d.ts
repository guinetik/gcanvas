/**
 * GCanvas Motion Module
 * Animation systems including easing functions, tweening, and stateless motion primitives.
 * @module motion
 */

import {
  EasingFunction,
  MotionCallbacks,
  MotionState,
  MotionResult,
  MotionPositionResult,
  MotionValueResult,
  SpringResult,
  WaypointResult,
  Point
} from './common';

// ==========================================================================
// Easing Functions
// ==========================================================================

/**
 * Collection of easing functions for smooth animations.
 * Each function takes a normalized time value (0-1) and returns an eased value.
 *
 * @example
 * const easedT = Easing.easeOutBounce(0.5);
 */
export class Easing {
  // Quadratic
  static easeInQuad(t: number): number;
  static easeOutQuad(t: number): number;
  static easeInOutQuad(t: number): number;

  // Cubic
  static easeInCubic(t: number): number;
  static easeOutCubic(t: number): number;
  static easeInOutCubic(t: number): number;

  // Quartic
  static easeInQuart(t: number): number;
  static easeOutQuart(t: number): number;
  static easeInOutQuart(t: number): number;

  // Quintic
  static easeInQuint(t: number): number;
  static easeOutQuint(t: number): number;
  static easeInOutQuint(t: number): number;

  // Sine
  static easeInSine(t: number): number;
  static easeOutSine(t: number): number;
  static easeInOutSine(t: number): number;

  // Exponential
  static easeInExpo(t: number): number;
  static easeOutExpo(t: number): number;
  static easeInOutExpo(t: number): number;

  // Circular
  static easeInCirc(t: number): number;
  static easeOutCirc(t: number): number;
  static easeInOutCirc(t: number): number;

  // Elastic
  static easeInElastic(t: number, amplitude?: number, period?: number): number;
  static easeOutElastic(t: number, amplitude?: number, period?: number): number;
  static easeInOutElastic(t: number, amplitude?: number, period?: number): number;

  // Back (overshoot)
  static easeInBack(t: number, overshoot?: number): number;
  static easeOutBack(t: number, overshoot?: number): number;
  static easeInOutBack(t: number, overshoot?: number): number;

  // Bounce
  static easeInBounce(t: number): number;
  static easeOutBounce(t: number): number;
  static easeInOutBounce(t: number): number;
}

// ==========================================================================
// Tween Utilities
// ==========================================================================

/**
 * Stateless interpolation utilities.
 */
export class Tween {
  /**
   * Linear interpolation between two values.
   * @param start - Start value
   * @param end - End value
   * @param t - Normalized time (0-1)
   */
  static lerp(start: number, end: number, t: number): number;

  /**
   * Interpolate between two angles (handles wraparound).
   * @param start - Start angle in radians
   * @param end - End angle in radians
   * @param t - Normalized time (0-1)
   */
  static lerpAngle(start: number, end: number, t: number): number;

  /**
   * Interpolate between two colors.
   * @param startColor - Start color (hex string)
   * @param endColor - End color (hex string)
   * @param t - Normalized time (0-1)
   * @returns Interpolated color as hex string
   */
  static lerpColor(startColor: string, endColor: string, t: number): string;
}

// ==========================================================================
// Tweenetik - Property Animation System
// ==========================================================================

/** Options for Tweenetik animations */
export interface TweenetikOptions {
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Called when animation starts */
  onStart?: () => void;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Called each frame after properties are updated */
  onUpdate?: () => void;
}

/**
 * Self-managed property animation system.
 * Mutates target object properties directly over time.
 *
 * @example
 * // Animate button scale with bounce
 * Tweenetik.to(button, { scaleX: 1.2, scaleY: 1.2 }, 0.5, Easing.easeOutBack);
 *
 * // Must call updateAll in your game loop
 * Tweenetik.updateAll(dt);
 */
export class Tweenetik {
  /** The object being animated */
  target: object;
  /** Animation duration in seconds */
  duration: number;

  /**
   * Create a new Tweenetik animation.
   * @param target - Object to animate
   * @param toProps - Target property values
   * @param duration - Duration in seconds
   * @param easingFn - Easing function (default: easeOutQuad)
   * @param options - Additional options
   */
  constructor(
    target: object,
    toProps: Record<string, number>,
    duration: number,
    easingFn?: EasingFunction,
    options?: TweenetikOptions
  );

  /**
   * Update this tween by delta time.
   * @param dt - Delta time in seconds
   */
  update(dt: number): void;

  /**
   * Create and register a new tween.
   * @param target - Object to animate
   * @param toProps - Target property values
   * @param duration - Duration in seconds
   * @param easingFn - Easing function
   * @param options - Additional options
   * @returns The created Tweenetik instance
   */
  static to(
    target: object,
    toProps: Record<string, number>,
    duration: number,
    easingFn?: EasingFunction,
    options?: TweenetikOptions
  ): Tweenetik;

  /**
   * Update all active tweens.
   * Call this in your game loop.
   * @param dt - Delta time in seconds
   */
  static updateAll(dt: number): void;
}

// ==========================================================================
// Motion - Stateless Animation Primitives
// ==========================================================================

/** Spring physics parameters */
export interface SpringParams {
  /** Spring stiffness (0-1, default: 0.3) */
  stiffness?: number;
  /** Damping factor (0-1, default: 0.6) */
  damping?: number;
}

/** Target object with position */
export interface PositionTarget {
  x: number;
  y: number;
}

/**
 * Stateless animation primitive functions.
 * Each method returns interpolated values without storing state.
 *
 * @example
 * function update(dt) {
 *   character.animTime += dt;
 *   const result = Motion.orbit(200, 200, 50, 50, 0, character.animTime, 2);
 *   character.x = result.x;
 *   character.y = result.y;
 * }
 */
export class Motion {
  /**
   * Oscillate between min and max values.
   * @param min - Minimum value
   * @param max - Maximum value
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration of one oscillation (seconds)
   * @param loop - Whether to loop (default: true)
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static oscillate(
    min: number,
    max: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionValueResult;

  /**
   * Parabolic arc interpolation.
   * @param start - Start value
   * @param peak - Peak value
   * @param end - End value
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param yoyo - Whether to reverse at end
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static parabolic(
    start: number,
    peak: number,
    end: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    yoyo?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionValueResult;

  /**
   * Floating/drifting movement within an area.
   * @param target - Object with x,y center point
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration of one cycle (seconds)
   * @param speed - Movement speed (0.1-2.0 recommended)
   * @param randomness - Path randomness (0-1)
   * @param radius - Float area radius
   * @param loop - Whether to loop
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static float(
    target: PositionTarget,
    elapsedTime: number,
    duration: number,
    speed: number,
    randomness: number,
    radius: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Spring animation with elastic bounce.
   * @param initial - Initial value
   * @param target - Target value
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param yoyo - Whether to return to initial
   * @param springParams - Spring physics parameters
   * @param callbacks - Optional callbacks
   */
  static spring(
    initial: number,
    target: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    yoyo?: boolean,
    springParams?: SpringParams,
    callbacks?: MotionCallbacks
  ): SpringResult;

  /**
   * Swinging motion around a center point.
   * @param centerX - Center X
   * @param centerY - Center Y
   * @param maxAngle - Maximum swing angle (radians)
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param yoyo - Whether to reverse
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static swing(
    centerX: number,
    centerY: number,
    maxAngle: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    yoyo?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Pendulum motion.
   * @param originAngle - Starting angle (radians)
   * @param amplitude - Swing amplitude
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param damped - Whether to apply damping
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static pendulum(
    originAngle: number,
    amplitude: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    damped?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionValueResult;

  /**
   * Pulse between min and max values.
   * @param min - Minimum value
   * @param max - Maximum value
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration of one pulse (seconds)
   * @param loop - Whether to loop
   * @param yoyo - Use separate easing for return
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   */
  static pulse(
    min: number,
    max: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    yoyo?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks
  ): MotionValueResult;

  /**
   * Spiral motion animation.
   * @param centerX - Spiral center X
   * @param centerY - Spiral center Y
   * @param startRadius - Starting radius
   * @param endRadius - Ending radius
   * @param startAngle - Starting angle (radians)
   * @param revolutions - Number of revolutions
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param yoyo - Whether to reverse
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static spiral(
    centerX: number,
    centerY: number,
    startRadius: number,
    endRadius: number,
    startAngle: number,
    revolutions: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    yoyo?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Orbital motion (circular or elliptical).
   * @param centerX - Orbit center X
   * @param centerY - Orbit center Y
   * @param radiusX - Horizontal radius
   * @param radiusY - Vertical radius
   * @param startAngle - Starting angle (radians)
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration of one orbit (seconds)
   * @param loop - Whether to loop (default: true)
   * @param clockwise - Direction (default: true)
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static orbit(
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    startAngle: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    clockwise?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Bezier curve motion.
   * @param p0 - Start point [x, y]
   * @param p1 - Control point 1 [x, y]
   * @param p2 - Control point 2 [x, y]
   * @param p3 - End point [x, y]
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param yoyo - Whether to reverse
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static bezier(
    p0: [number, number],
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    yoyo?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Bounce animation with diminishing height.
   * @param maxHeight - Maximum height (negative y)
   * @param groundY - Ground position
   * @param bounceCount - Number of bounces
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static bounce(
    maxHeight: number,
    groundY: number,
    bounceCount: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionValueResult;

  /**
   * Shake animation with decay.
   * @param centerX - Center X
   * @param centerY - Center Y
   * @param maxOffsetX - Maximum X offset
   * @param maxOffsetY - Maximum Y offset
   * @param frequency - Shake frequency
   * @param decay - Decay rate (0-1)
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static shake(
    centerX: number,
    centerY: number,
    maxOffsetX: number,
    maxOffsetY: number,
    frequency: number,
    decay: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Follow a path of points.
   * @param points - Array of points [[x,y], ...]
   * @param closed - Whether path is closed
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static follow(
    points: [number, number][],
    closed: boolean,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Waypoint patrol with waiting periods.
   * @param target - Object with x,y (for reference)
   * @param elapsedTime - Total elapsed time (seconds)
   * @param waypoints - Array of waypoints [[x,y], ...]
   * @param speed - Movement speed (units/second)
   * @param waitTime - Wait time at each waypoint (seconds)
   * @param loop - Whether to loop
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static waypoint(
    target: PositionTarget,
    elapsedTime: number,
    waypoints: [number, number][],
    speed: number,
    waitTime: number,
    loop?: boolean,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): WaypointResult;

  /**
   * Random patrol within a radius.
   * @param initialX - Center X
   * @param initialY - Center Y
   * @param elapsedTime - Total elapsed time (seconds)
   * @param moveTime - Time between points
   * @param waitTime - Wait time at each point
   * @param radius - Patrol radius
   * @param loop - Whether to loop
   * @param state - Internal state
   */
  static patrol(
    initialX: number,
    initialY: number,
    elapsedTime: number,
    moveTime: number,
    waitTime: number,
    radius: number,
    loop?: boolean,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Hop/jump animation.
   * @param startX - Start X
   * @param startY - Start Y
   * @param endX - End X
   * @param endY - End Y
   * @param height - Jump height
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param easingFn - Optional easing function
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static hop(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    height: number,
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionPositionResult;

  /**
   * Group multiple animations together (run in parallel).
   * @param animations - Array of Motion method references
   * @param animationArgs - Array of argument arrays for each animation
   * @param elapsedTime - Total elapsed time (seconds)
   * @param duration - Duration (seconds)
   * @param loop - Whether to loop
   * @param easingFn - Optional easing function for all
   * @param callbacks - Optional callbacks
   * @param state - Internal state
   */
  static group(
    animations: Function[],
    animationArgs: any[][],
    elapsedTime: number,
    duration: number,
    loop?: boolean,
    easingFn?: EasingFunction | null,
    callbacks?: MotionCallbacks,
    state?: MotionState | null
  ): MotionResult & { [key: string]: MotionResult };

  /**
   * Sequence multiple animations (run one after another).
   * @param animations - Array of Motion method references
   * @param animationArgs - Array of argument arrays for each animation
   * @param durations - Array of durations for each animation
   * @param elapsedTime - Total elapsed time (seconds)
   * @param loop - Whether to loop the sequence
   * @param easingFns - Optional array of easing functions
   * @param callbacks - Optional callbacks for entire sequence
   * @param animCallbacks - Optional callbacks for individual animations
   * @param state - Internal state
   */
  static sequence(
    animations: Function[],
    animationArgs: any[][],
    durations: number[],
    elapsedTime: number,
    loop?: boolean,
    easingFns?: (EasingFunction | null)[] | null,
    callbacks?: MotionCallbacks,
    animCallbacks?: MotionCallbacks[] | null,
    state?: MotionState | null
  ): MotionResult;
}

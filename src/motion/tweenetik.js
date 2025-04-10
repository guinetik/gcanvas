// Tweenetik.js
import { Easing } from "./easing.js";
import { Tween } from "./tween.js";
/**
 * Tweenetik module for declarative, time-managed UI animations.
 *
 * @class Tweenetik
 * @description
 * Tweenetik provides a lightweight, self-managed tweening system that animates object properties over time.
 * Unlike {@link Motion}, which returns stateless values for use in real-time game loops,
 * Tweenetik mutates the target object directly and manages its own internal time progression.
 * <br/>
 * It is ideal for UI transitions, hover effects, attention animations, or any element
 * that animates independently of the simulation/game loop logic.
 * <br/>
 * Tweenetik is declarative: you configure a tween once and let it run in the background.
 * You must call {@link Tweenetik.updateAll} on each frame to drive all active tweens.
 * <br/>
 * @example
 * Tweenetik.to(button, { scaleX: 1.2, scaleY: 1.2 }, 0.5, Easing.easeOutBack);
 *
 * @see {@link Tween} for interpolation utilities
 * @see {@link Motion} for stateless simulation-driven animations
 */

export class Tweenetik {
  /**
   * @param {Object} target - The object whose properties will be tweened.
   * @param {Object} toProps - An object containing the property values we want to end up at (e.g. { x: 100, y: 200 }).
   * @param {number} duration - How long (in seconds) the tween should take.
   * @param {Function} easingFn - One of the easing functions from the Tween class (e.g. Easing.easeOutBounce).
   * @param {Object} [options]
   * @param {number} [options.delay=0] - Delay in seconds before starting.
   * @param {Function} [options.onStart] - Callback invoked once when the tween actually begins.
   * @param {Function} [options.onComplete] - Callback invoked once when the tween finishes.
   * @param {Function} [options.onUpdate] - Callback invoked every frame (after the object’s properties are updated).
   */
  constructor(target, toProps, duration, easingFn, options = {}) {
    this.target = target;
    this.toProps = { ...toProps };
    this.duration = duration;
    this.easingFn = easingFn || Easing.easeOutQuad;

    // Options
    this.delay = options.delay || 0;
    this.onStart = options.onStart || null;
    this.onComplete = options.onComplete || null;
    this.onUpdate = options.onUpdate || null;

    // Internal
    this._elapsed = 0;
    this._started = false;
    this._finished = false;
    this._startProps = {};

    // Capture the starting values right now:
    for (const prop in this.toProps) {
      if (Object.prototype.hasOwnProperty.call(this.target, prop)) {
        this._startProps[prop] = this.target[prop];
      }
    }
  }

  /**
   * Creates and registers a new Tweenetik instance in the global list.
   * @param {Object} target
   * @param {Object} toProps
   * @param {number} duration
   * @param {Function} easingFn
   * @param {Object} [options]
   */
  static to(target, toProps, duration, easingFn, options) {
    const tween = new Tweenetik(target, toProps, duration, easingFn, options);
    Tweenetik._active.push(tween);
    return tween;
  }

  /**
   * Updates this tween by the given delta time (in seconds).
   * @param {number} dt
   */
  update(dt) {
    if (this._finished) return;

    this._elapsed += dt;

    // Wait until the delay has passed
    if (this._elapsed < this.delay) {
      return;
    }

    // Time in tween (after delay)
    const timeSinceDelay = this._elapsed - this.delay;
    const t = Math.min(timeSinceDelay / this.duration, 1);

    // onStart callback (once)
    if (!this._started && t > 0) {
      this._started = true;
      if (this.onStart) {
        this.onStart();
      }
    }

    // Calculate eased factor
    const eased = this.easingFn(t);

    // Apply interpolations for each property
    for (const prop in this._startProps) {
      const startVal = this._startProps[prop];
      const endVal = this.toProps[prop];
      // Use Tween.go(...) to interpolate
      this.target[prop] = Tween.lerp(startVal, endVal, eased);
    }

    // onUpdate callback (each frame)
    if (this.onUpdate) {
      this.onUpdate();
    }

    // Check if finished
    if (t >= 1) {
      this._finished = true;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  /**
   * Update all active tweens by dt. Call this once each frame in your main loop.
   * @param {number} dt
   */
  static updateAll(dt) {
    for (const tween of Tweenetik._active) {
      tween.update(dt);
    }
    // Remove finished tweens from the list
    Tweenetik._active = Tweenetik._active.filter((t) => !t._finished);
  }
}

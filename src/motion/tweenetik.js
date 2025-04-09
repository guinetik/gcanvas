// Tweenetik.js
import { Tween } from "./tween.js";

export class Tweenetik {
  /**
   * @param {Object} target - The object whose properties will be tweened.
   * @param {Object} toProps - An object containing the property values we want to end up at (e.g. { x: 100, y: 200 }).
   * @param {number} duration - How long (in seconds) the tween should take.
   * @param {Function} easingFn - One of the easing functions from the Tween class (e.g. Tween.easeOutBounce).
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
    this.easingFn = easingFn || Tween.easeOutQuad;

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
      this.target[prop] = Tween.go(startVal, endVal, eased);
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

/**
 * Holds all currently active Tweenetik instances.
 * Always call Tweenetik.updateAll(dt) in your game loop to drive them.
 */
Tweenetik._active = [];

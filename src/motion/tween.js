export class Tween {
  // =========================================================================
  // BASIC INTERPOLATION
  // =========================================================================
  /**
   * Linear interpolation between two values
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  static go(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Interpolate between two colors in RGB space
   * @param {Array<number>} color1 - Start color [r, g, b] (0-255)
   * @param {Array<number>} color2 - End color [r, g, b] (0-255)
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Array<number>} Interpolated color [r, g, b]
   */
  static tweenColor(color1, color2, t) {
    return color1.map((c, i) => Tween.go(c, color2[i], t));
  }

  /**
   * Interpolate between two HSL colors
   * @param {Array<number>} color1 - Start color [h, s, l]
   * @param {Array<number>} color2 - End color [h, s, l]
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Array<number>} Interpolated color [h, s, l]
   */
  static tweenGradient(color1, color2, t) {
    // Special handling for hue to handle the circular nature
    let h1 = color1[0];
    let h2 = color2[0];

    // Find the shortest path around the circle
    if (Math.abs(h2 - h1) > 180) {
      if (h1 < h2) h1 += 360;
      else h2 += 360;
    }

    const h = Tween.go(h1, h2, t) % 360;
    const s = Tween.go(color1[1], color2[1], t);
    const l = Tween.go(color1[2], color2[2], t);

    return [h, s, l];
  }

  // =========================================================================
  // EASING FUNCTIONS
  // =========================================================================

  /**
   * Quadratic ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInQuad(t) {
    return t * t;
  }

  /**
   * Quadratic ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutQuad(t) {
    return t * (2 - t);
  }

  /**
   * Quadratic ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * Cubic ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInCubic(t) {
    return t * t * t;
  }

  /**
   * Cubic ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutCubic(t) {
    return --t * t * t + 1;
  }

  /**
   * Cubic ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  /**
   * Quartic ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInQuart(t) {
    return t * t * t * t;
  }

  /**
   * Quartic ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutQuart(t) {
    return 1 - --t * t * t * t;
  }

  /**
   * Quartic ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
  }

  /**
   * Sine ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInSine(t) {
    return 1 - Math.cos((t * Math.PI) / 2);
  }

  /**
   * Sine ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutSine(t) {
    return Math.sin((t * Math.PI) / 2);
  }

  /**
   * Sine ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  /**
   * Exponential ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
  }

  /**
   * Exponential ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /**
   * Exponential ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutExpo(t) {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) {
      return 0.5 * Math.pow(2, 20 * t - 10);
    } else {
      return 0.5 * (2 - Math.pow(2, -20 * t + 10));
    }
  }

  /**
   * Circular ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInCirc(t) {
    return 1 - Math.sqrt(1 - t * t);
  }

  /**
   * Circular ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutCirc(t) {
    return Math.sqrt(1 - --t * t);
  }

  /**
   * Circular ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutCirc(t) {
    return t < 0.5
      ? 0.5 * (1 - Math.sqrt(1 - 4 * t * t))
      : 0.5 * (Math.sqrt(-(2 * t - 3) * (2 * t - 1)) + 1);
  }

  /**
   * Elastic ease-in
   * @param {number} t - Input (0-1)
   * @param {number} [amplitude=1] - Amplitude
   * @param {number} [period=0.3] - Period
   * @returns {number} Eased value
   */
  static easeInElastic(t, amplitude = 1, period = 0.3) {
    if (t === 0 || t === 1) return t;

    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return -(
      amplitude *
      Math.pow(2, 10 * (t - 1)) *
      Math.sin(((t - 1 - s) * (2 * Math.PI)) / period)
    );
  }

  /**
   * Elastic ease-out
   * @param {number} t - Input (0-1)
   * @param {number} [amplitude=1] - Amplitude
   * @param {number} [period=0.3] - Period
   * @returns {number} Eased value
   */
  static easeOutElastic(t, amplitude = 1, period = 0.3) {
    if (t === 0 || t === 1) return t;

    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return (
      amplitude *
        Math.pow(2, -10 * t) *
        Math.sin(((t - s) * (2 * Math.PI)) / period) +
      1
    );
  }

  /**
   * Elastic ease-in-out
   * @param {number} t - Input (0-1)
   * @param {number} [amplitude=1] - Amplitude
   * @param {number} [period=0.3] - Period
   * @returns {number} Eased value
   */
  static easeInOutElastic(t, amplitude = 1, period = 0.3) {
    if (t === 0 || t === 1) return t;

    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);

    if (t < 0.5) {
      return (
        -0.5 *
        (amplitude *
          Math.pow(2, 10 * (2 * t - 1)) *
          Math.sin(((2 * t - 1 - s) * (2 * Math.PI)) / period))
      );
    } else {
      return (
        amplitude *
          Math.pow(2, -10 * (2 * t - 1)) *
          Math.sin(((2 * t - 1 - s) * (2 * Math.PI)) / period) *
          0.5 +
        1
      );
    }
  }

  /**
   * Back ease-in
   * @param {number} t - Input (0-1)
   * @param {number} [overshoot=1.70158] - Overshoot amount
   * @returns {number} Eased value
   */
  static easeInBack(t, overshoot = 1.70158) {
    return t * t * ((overshoot + 1) * t - overshoot);
  }

  /**
   * Back ease-out
   * @param {number} t - Input (0-1)
   * @param {number} [overshoot=1.70158] - Overshoot amount
   * @returns {number} Eased value
   */
  static easeOutBack(t, overshoot = 1.70158) {
    return --t * t * ((overshoot + 1) * t + overshoot) + 1;
  }

  /**
   * Back ease-in-out
   * @param {number} t - Input (0-1)
   * @param {number} [overshoot=1.70158] - Overshoot amount
   * @returns {number} Eased value
   */
  static easeInOutBack(t, overshoot = 1.70158) {
    const s = overshoot * 1.525;

    if (t < 0.5) {
      return 0.5 * (2 * t) * (2 * t) * ((s + 1) * 2 * t - s);
    } else {
      return (
        0.5 * ((2 * t - 2) * (2 * t - 2) * ((s + 1) * (2 * t - 2) + s) + 2)
      );
    }
  }

  /**
   * Bounce ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutBounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }

  /**
   * Bounce ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInBounce(t) {
    return 1 - Tween.easeOutBounce(1 - t);
  }

  /**
   * Bounce ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutBounce(t) {
    return t < 0.5
      ? Tween.easeInBounce(t * 2) * 0.5
      : Tween.easeOutBounce(t * 2 - 1) * 0.5 + 0.5;
  }

  // =========================================================================
  // ANIMATION HELPERS
  // =========================================================================

  /**
   * Parabolic arc interpolation
   * @param {number} start - Start Y value
   * @param {number} peak - Peak Y value
   * @param {number} end - End Y value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated Y value
   */
  static parabolicArc(start, peak, end, t) {
    // Convert linear t (0-1) to parabolic t (-1 to 1)
    const parabolicT = 2 * t - 1;

    // Calculate quadratic y = a*t^2 + b*t + c
    // Where: y(0) = start, y(0.5) = peak, y(1) = end
    const a = (start + end - 2 * peak) / 2;
    const b = peak - start - a;
    const c = start;

    return a * t * t + b * t + c;
  }

  /**
   * Oscillate between min and max value using sine
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} time - Current time
   * @param {number} [period=1] - Oscillation period
   * @returns {number} Oscillated value
   */
  static oscillate(min, max, time, period = 1) {
    const amplitude = (max - min) / 2;
    const center = min + amplitude;
    return center + amplitude * Math.sin((time * Math.PI * 2) / period);
  }

  /**
   * Pulse between min and max value and back
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} t - Normalized time (0-1)
   * @returns {number} Pulsed value
   */
  static pulse(min, max, t) {
    // Convert to 0-1-0 pattern
    const adjusted = t < 0.5 ? t * 2 : 2 - t * 2;
    return min + (max - min) * adjusted;
  }

  /**
   * Spring animation helper
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {Object} params - Spring parameters
   * @param {number} [params.velocity=0] - Current velocity
   * @param {number} [params.stiffness=0.1] - Spring stiffness (0-1)
   * @param {number} [params.damping=0.8] - Damping factor (0-1)
   * @param {number} [params.precision=0.01] - Stop threshold
   * @returns {Object} New state { value, velocity, done }
   */
  static spring(
    current,
    target,
    { velocity = 0, stiffness = 0.1, damping = 0.8, precision = 0.01 } = {}
  ) {
    // Calculate spring force
    const delta = target - current;
    const spring = delta * stiffness;

    // Apply damping
    velocity = velocity * damping + spring;

    // Update current value
    const next = current + velocity;

    // Check if we're done
    const done = Math.abs(delta) < precision && Math.abs(velocity) < precision;

    return {
      value: done ? target : next,
      velocity,
      done,
    };
  }
}

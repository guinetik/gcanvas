export class Easing {
  // =========================================================================
  // EASING FUNCTIONS
  // =========================================================================

  static lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Linear - no easing, straight line
   * @param {number} t - Input (0-1)
   * @returns {number} Same value as input
   */
  static linear(t) {
    return t;
  }

  /**
   * Smoothstep - classic shader S-curve interpolation
   * Smooth start and end with zero first derivative at endpoints
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  /**
   * Smootherstep - Ken Perlin's improved smoothstep
   * Even smoother with zero first AND second derivatives at endpoints
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static smootherstep(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

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
    return 1 - Easing.easeOutBounce(1 - t);
  }

  /**
   * Bounce ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutBounce(t) {
    return t < 0.5
      ? Easing.easeInBounce(t * 2) * 0.5
      : Easing.easeOutBounce(t * 2 - 1) * 0.5 + 0.5;
  }
}

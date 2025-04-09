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
   * @param {number} start - Start value
   * @param {number} peak - Peak value
   * @param {number} end - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  static parabolicArc(start, peak, end, t) {
    // Calculate quadratic coefficients
    // For a parabola that passes through three points: (0,start), (0.5,peak), (1,end)
    const a = start + end - 2 * peak;
    const b = 2 * (peak - start);
    const c = start;

    // Apply the quadratic formula: a*t^2 + b*t + c
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

  /**
   * Spiral motion animation
   * @param {number} centerX - X coordinate of spiral center
   * @param {number} centerY - Y coordinate of spiral center
   * @param {number} startRadius - Starting radius of the spiral
   * @param {number} endRadius - Ending radius of the spiral
   * @param {number} startAngle - Starting angle in radians
   * @param {number} revolutions - Number of complete revolutions
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} {x, y} coordinates
   */
  static spiral(
    centerX,
    centerY,
    startRadius,
    endRadius,
    startAngle,
    revolutions,
    t
  ) {
    // Calculate current radius using linear interpolation
    const radius = Tween.go(startRadius, endRadius, t);

    // Calculate current angle (start angle + number of revolutions)
    const angle = startAngle + t * revolutions * Math.PI * 2;

    // Convert polar coordinates to Cartesian
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return { x, y };
  }

  /**
   * Orbit motion animation (circular or elliptical)
   * @param {number} centerX - X coordinate of orbit center
   * @param {number} centerY - Y coordinate of orbit center
   * @param {number} radiusX - X radius of the orbit (horizontal)
   * @param {number} radiusY - Y radius of the orbit (vertical)
   * @param {number} startAngle - Starting angle in radians
   * @param {number} t - Interpolation factor (0-1)
   * @param {boolean} [clockwise=true] - Direction of orbit
   * @returns {Object} {x, y} coordinates
   */
  static orbit(
    centerX,
    centerY,
    radiusX,
    radiusY,
    startAngle,
    t,
    clockwise = true
  ) {
    // Calculate current angle
    const direction = clockwise ? 1 : -1;
    const angle = startAngle + direction * t * Math.PI * 2;

    // Convert polar coordinates to Cartesian
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);

    return { x, y };
  }

  /**
   * Bezier curve motion animation
   * @param {Array<number>} p0 - Start point [x, y]
   * @param {Array<number>} p1 - Control point 1 [x, y]
   * @param {Array<number>} p2 - Control point 2 [x, y]
   * @param {Array<number>} p3 - End point [x, y]
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} {x, y} coordinates
   */
  static bezier(p0, p1, p2, p3, t) {
    // Cubic Bezier formula
    const cx = 3 * (p1[0] - p0[0]);
    const bx = 3 * (p2[0] - p1[0]) - cx;
    const ax = p3[0] - p0[0] - cx - bx;

    const cy = 3 * (p1[1] - p0[1]);
    const by = 3 * (p2[1] - p1[1]) - cy;
    const ay = p3[1] - p0[1] - cy - by;

    const x = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0[0];
    const y = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0[1];

    return { x, y };
  }

  /**
   * Bounce animation - object drops and bounces with diminishing height
   * @param {number} maxHeight - Maximum height (negative y value)
   * @param {number} groundY - Ground position (positive y value)
   * @param {number} bounceCount - Number of bounces to perform
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Current Y position
   */
  static bounce(maxHeight, groundY, bounceCount, t) {
    // A simpler approach with predictable results

    // Divide the animation into segments based on bounce count
    const segmentSize = 1 / (bounceCount + 1);
    const segment = Math.min(Math.floor(t / segmentSize), bounceCount);
    const segmentT = (t % segmentSize) / segmentSize;

    // Calculate bounce height for this segment
    const bounceHeight = maxHeight * Math.pow(0.6, segment);

    // Use a simple sine wave for each bounce
    // Sin goes from 0 to 1 to 0, we want -maxHeight to groundY to -maxHeight
    // Transform the sin function to get bounce effect
    const normalized = Math.sin(segmentT * Math.PI);
    const position = groundY - normalized * (groundY - bounceHeight);

    return position;
  }

  /**
   * Shake animation with decreasing intensity
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} maxOffsetX - Maximum X offset
   * @param {number} maxOffsetY - Maximum Y offset
   * @param {number} frequency - Frequency of shakes
   * @param {number} decay - How quickly the shake decreases (0-1)
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Object} {x, y} coordinates
   */
  static shake(centerX, centerY, maxOffsetX, maxOffsetY, frequency, decay, t) {
    // Apply decay to reduce shake over time
    const intensity = Math.pow(1 - t, decay);

    // Create randomized but deterministic shake using sine/cosine at different frequencies
    const angleX = t * Math.PI * 2 * frequency;
    const angleY = t * Math.PI * 2 * frequency * 1.3; // Different frequency for Y

    // Add multiple sine waves at different frequencies for more organic motion
    const xOffset =
      intensity *
      maxOffsetX *
      (Math.sin(angleX) * 0.6 +
        Math.sin(angleX * 2.5) * 0.3 +
        Math.sin(angleX * 5.6) * 0.1);

    const yOffset =
      intensity *
      maxOffsetY *
      (Math.cos(angleY) * 0.6 +
        Math.cos(angleY * 2.7) * 0.3 +
        Math.cos(angleY * 6.3) * 0.1);

    // Make sure we end at the center
    let finalX = centerX + xOffset;
    let finalY = centerY + yOffset;

    // Gradually return to center in the last 10% of the animation
    if (t > 0.9) {
      const returnT = (t - 0.9) / 0.1;
      finalX = centerX + xOffset * (1 - returnT);
      finalY = centerY + yOffset * (1 - returnT);
    }

    return { x: finalX, y: finalY };
  }
}

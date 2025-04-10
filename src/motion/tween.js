/**
 * Tween module providing core interpolation utilities for animations.
 *
 * @class Tween
 * @description
 * Tween is a stateless utility class for performing basic and advanced interpolation operations.
 * These methods are low-level math tools used across both simulation-driven animations (like {@link Motion})
 * and UI-driven transitions (like {@link Tweenetik}).
 *
 * The class includes:
 * - Scalar and angle interpolation
 * - Color blending in RGB and HSL spaces
 * - Angle-safe easing
 *
 * All functions are deterministic, pure, and suitable for use in render loops or transition systems.
 *
 * @example
 * const x = Tween.lerp(0, 100, 0.25); // 25
 * const angle = Tween.lerpAngle(Math.PI, -Math.PI, 0.5); // shortest-path rotation
 * const rgb = Tween.tweenColor([255, 0, 0], [0, 0, 255], 0.5); // purple
 *
 * @see {@link Motion} for game-loop-driven animation patterns
 * @see {@link Tweenetik} for time-based UI transitions
 */
export class Tween {
  /**
   * Linear interpolation between two scalar values.
   * Also known as Lerp.
   * @param {number} start
   * @param {number} end
   * @param {number} t - Normalized interpolation factor (0 to 1)
   * @returns {number} Interpolated scalar
   */
  static lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Smoothly interpolates between two angles (in radians),
   * always taking the shortest path around the circle.
   *
   * Prevents snapping when angles wrap across -π to π boundaries.
   *
   * @param {number} a - Starting angle in radians
   * @param {number} b - Target angle in radians
   * @param {number} t - Interpolation factor (0 to 1)
   * @returns {number} Interpolated angle in radians
   */
  static lerpAngle(a, b, t) {
    // Calculate raw difference
    let diff = b - a;
    // Wrap difference to range [-PI, PI] for shortest rotation
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    // Interpolate from a toward b using the wrapped difference
    return a + diff * t;
  }

  /**
   * Interpolate between two colors in RGB space
   * @param {Array<number>} color1 - Start color [r, g, b] (0-255)
   * @param {Array<number>} color2 - End color [r, g, b] (0-255)
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Array<number>} Interpolated color [r, g, b]
   */
  static tweenColor(color1, color2, t) {
    return color1.map((c, i) => Tween.lerp(c, color2[i], t));
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
    // tween each channel individually
    const h = Tween.lerp(h1, h2, t) % 360;
    const s = Tween.lerp(color1[1], color2[1], t);
    const l = Tween.lerp(color1[2], color2[2], t);
    return [h, s, l];
  }
}

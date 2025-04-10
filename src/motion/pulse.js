import { Easing } from "./easing";
import { Motion } from "./motion";
import { Tween } from "./tween";
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
export function pulseV1(
  min,
  max,
  elapsedTime,
  duration,
  loop = true,
  yoyo = false,
  easingFn = null,
  callbacks = {}
) {
  // Normalize time (0-1) within current cycle
  let t = elapsedTime / duration;
  let phase = "forward";
  // Handle looping vs. non-looping
  if (loop) {
    // Calculate loop count (for callbacks)
    const loopCount = Math.floor(t);
    // Use only the fractional part for looping (0-1 repeating)
    t = t % 1;
    // Call onLoop callback if provided and we crossed a loop boundary
    if (loopCount > 0 && callbacks.onLoop) {
      callbacks.onLoop(loopCount);
    }
  } else {
    // Clamp to 1 for non-looping animations
    if (t > 1) t = 1;
  }
  // Call onStart callback if needed
  if (t > 0 && elapsedTime <= duration && callbacks.onStart) {
    callbacks.onStart();
  }
  let value;
  if (yoyo) {
    // Yoyo approach - separate forward and return journeys
    if (t < 0.5) {
      // Forward journey (0 to 0.5 becomes 0 to 1)
      const adjustedT = t * 2;
      // Apply easing if provided
      const easedT = easingFn ? easingFn(adjustedT) : adjustedT;
      // Interpolate from min to max
      value = min + (max - min) * easedT;
      phase = "forward";
    } else {
      // Return journey (0.5 to 1 becomes 0 to 1)
      const adjustedT = (t - 0.5) * 2;
      // Apply easing if provided
      const easedT = easingFn ? easingFn(adjustedT) : adjustedT;
      // Interpolate from max to min
      value = max - (max - min) * easedT;
      phase = "return";
      // Call onYoyoTurn callback at the turning point
      if (t >= 0.5 && t < 0.51 && callbacks.onYoyoTurn) {
        callbacks.onYoyoTurn();
      }
    }
  } else {
    // Standard pulse approach (triangle wave)
    // Apply easing to normalized time if provided
    const easedT = easingFn ? easingFn(t) : t;
    // Convert to 0-1-0 pattern
    const adjusted = easedT < 0.5 ? easedT * 2 : 2 - easedT * 2;
    value = min + (max - min) * adjusted;
  }
  // Check if non-looping animation is complete
  const isDone = !loop && t >= 1;
  // Call onComplete if animation has completed
  if (isDone && callbacks.onComplete) {
    callbacks.onComplete();
  }
  // Return standardized result
  return Motion.animationResult({ value, phase }, t, loop, isDone);
}

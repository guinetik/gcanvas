import { Motion } from "./motion";

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
export function oscillateV1(
  min,
  max,
  elapsedTime,
  duration,
  loop = true,
  easingFn = null,
  callbacks = {},
  state = null
) {
  // Update animation time and apply easing
  const {
    t,
    easedT,
    completed,
    state: newState,
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  // Calculate oscillation using sine
  const amplitude = (max - min) / 2;
  const center = min + amplitude;
  const value = center + amplitude * Math.sin(easedT * Math.PI * 2);
  // Return standardized result
  return Motion.animationResult({ value }, t, loop, completed, newState);
}

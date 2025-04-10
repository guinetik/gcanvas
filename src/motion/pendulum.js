import { Motion } from "./motion";

/**
 * Pendulum animation - swings around a center angle with optional damping
 *
 * @param {number} originAngle - Resting angle in radians (typically 0)
 * @param {number} amplitude - Maximum swing from center (in radians)
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Time for one full swing (left-right-left)
 * @param {boolean} [loop=true] - Whether the animation loops
 * @param {boolean} [damped=false] - If true, swing slows down over time
 * @param {Function} [easingFn=null] - Optional easing function
 * @param {Object} [callbacks={}] - Optional callback functions
 * @param {Object} [state=null] - Internal state tracking
 * @returns {Object} Animation result with angle and metadata
 */
export function pendulumV1(
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
  const {
    t,
    easedT,
    completed,
    state: newState,
  } = Motion._frame(elapsedTime, duration, loop, null, callbacks, state); // <- remove easing here

  // Optional decay multiplier (energy loss)
  const decay = damped && !loop ? Math.exp(-4 * t) : 1;

  // Oscillate with cosine (max at start, zero at center)
  let angle = originAngle + amplitude * Math.cos(easedT * 2 * Math.PI) * decay;

  // Apply optional easing to the *angle*, not the time
  if (easingFn) {
    const normalized = (angle - originAngle) / (amplitude * decay);
    angle = originAngle + easingFn((normalized + 1) / 2) * amplitude * decay * 2 - amplitude * decay;
  }

  return Motion.animationResult({ angle }, t, loop, completed, newState);
}

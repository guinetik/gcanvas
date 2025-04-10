import { Motion } from "./motion";

/**
 * Swing animation - oscillates around a fixed center angle
 *
 * @param {number} centerX - X pivot (not used for angle, just for semantic)
 * @param {number} centerY - Y pivot (not used for angle, just for semantic)
 * @param {number} maxAngle - Maximum swing angle in radians (e.g. Math.PI / 6)
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of one full swing cycle
 * @param {boolean} [loop=true] - Whether the animation loops
 * @param {boolean} [yoyo=true] - Whether the swing reverses
 * @param {Function} [easingFn=null] - Optional easing function
 * @param {Object} [callbacks={}] - Optional callbacks (onStart, onComplete, etc)
 * @param {Object} [state=null] - Internal state tracking
 * @returns {Object} Animation result with angle and metadata
 */
export function swingV1(
  centerX,
  centerY,
  maxAngle,
  elapsedTime,
  duration,
  loop = true,
  yoyo = true,
  easingFn = null,
  callbacks = {},
  state = null
) {
  // Process time and easing
  const {
    t,
    easedT,
    completed,
    state: newState,
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);

  // Swing back and forth using sine curve
  const phase = yoyo
    ? Math.sin(easedT * Math.PI * 2)
    : Math.sin(easedT * Math.PI);

  // Calculate angle: center ± maxAngle
  const angle = phase * maxAngle;

  return Motion.animationResult({ angle }, t, loop, completed, newState);
}

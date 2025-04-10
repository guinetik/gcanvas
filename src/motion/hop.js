import { Motion } from "./motion";

/**
 * Hop animation - makes the object jump up and down rhythmically
 *
 * @param {number} baseY - The ground/base Y position
 * @param {number} hopHeight - Maximum height (negative Y offset)
 * @param {number} elapsedTime - Elapsed time in seconds
 * @param {number} duration - Duration of one hop (up and down)
 * @param {boolean} [loop=true] - Whether the hop repeats
 * @param {boolean} [yoyo=true] - Whether the hop repeats
 * @param {Function} [easingFn=null] - Optional easing for jump arc
 * @param {Object} [callbacks={}] - Optional callback functions
 * @param {Object} [state=null] - Internal state
 * @returns {Object} Animation result with y position
 */
export function hopV1(
  baseY,
  hopHeight,
  elapsedTime,
  duration,
  loop = true,
  yoyo = true,
  easingFn = null,
  callbacks = {},
  state = null
) {
  const {
    t,
    easedT,
    completed,
    state: newState,
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state, yoyo);

  let arc = 0;

  if (!loop && !yoyo) {
    // One-shot up only: freeze at peak when done
    arc = completed ? 1 : Math.sin(Math.min(t, 1) * Math.PI * 0.5); // sin(π/2 * t) = 0 → 1
  } else if (yoyo) {
    // Full up/down cycle using easedT (symmetric)
    arc = Math.sin(easedT * Math.PI); // 0 → 1 → 0
  } else {
    // Looping up-only arc (snap to origin after)
    arc = Math.sin(Math.min(t, 1) * Math.PI * 0.5); // sin(π/2 * t)
  }

  const y = baseY - hopHeight * arc;

  return Motion.animationResult({ y }, t, loop, completed, newState);
}


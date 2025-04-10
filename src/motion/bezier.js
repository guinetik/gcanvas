import { Motion } from "./motion";

/**
 * Bezier curve motion animation with yoyo support
 *
 * @param {Array<number>} p0 - Start point [x, y]
 * @param {Array<number>} p1 - Control point 1 [x, y]
 * @param {Array<number>} p2 - Control point 2 [x, y]
 * @param {Array<number>} p3 - End point [x, y]
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of animation in seconds
 * @param {boolean} [loop=false] - Whether animation should loop
 * @param {boolean} [yoyo=false] - Whether animation should return to start
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks
 * @returns {Object} Animation result with x, y coordinates and metadata
 */
export function bezierV1(
  p0,
  p1,
  p2,
  p3,
  elapsedTime,
  duration,
  loop = false,
  yoyo = false,
  easingFn = null,
  callbacks = {},
  state = null
) {
  // Early return for zero duration
  if (duration <= 0) {
    return Motion.animationResult(
      { x: p3[0], y: p3[1], phase: "complete" },
      1,
      false,
      true
    );
  }

  // Normalize time (0-1) within current cycle
  let t = elapsedTime / duration;
  let yoyoPhase = "forward";
  let loopCount = 0;

  // Handle looping vs. non-looping
  if (loop) {
    // Calculate loop count (for callbacks)
    loopCount = Math.floor(t);

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

  // Call onStart callback if needed (only when animation begins)
  if (t > 0 && elapsedTime <= duration && callbacks.onStart) {
    callbacks.onStart();
  }

  // Apply easing if provided
  const easedT = easingFn ? easingFn(t) : t;

  // Adjust time value for yoyo behavior
  let adjustedT = easedT;

  if (yoyo) {
    // If in the second half of the animation, we're going back
    if (t >= 0.5) {
      // Rescale t to 0-1 for the second half, but reversed
      adjustedT = 1 - (t - 0.5) * 2;
      yoyoPhase = "return";

      // Call onYoyoTurn callback at the turning point
      if (t >= 0.5 && t < 0.51 && callbacks.onYoyoTurn) {
        callbacks.onYoyoTurn();
      }
    } else {
      // First half of animation
      adjustedT = t * 2;
      yoyoPhase = "forward";
    }

    // Apply easing to the adjusted time if needed
    adjustedT = easingFn ? easingFn(adjustedT) : adjustedT;
  }

  // Cubic Bezier formula
  const cx = 3 * (p1[0] - p0[0]);
  const bx = 3 * (p2[0] - p1[0]) - cx;
  const ax = p3[0] - p0[0] - cx - bx;

  const cy = 3 * (p1[1] - p0[1]);
  const by = 3 * (p2[1] - p1[1]) - cy;
  const ay = p3[1] - p0[1] - cy - by;

  const x =
    ax * Math.pow(adjustedT, 3) +
    bx * Math.pow(adjustedT, 2) +
    cx * adjustedT +
    p0[0];
  const y =
    ay * Math.pow(adjustedT, 3) +
    by * Math.pow(adjustedT, 2) +
    cy * adjustedT +
    p0[1];

  // Check if non-looping animation is complete
  const isDone = !loop && t >= 1;

  // Call onComplete if animation has completed
  if (isDone && callbacks.onComplete) {
    callbacks.onComplete();
  }

  // Return standardized result with phase information
  return Motion.animationResult(
    { x, y, phase: yoyoPhase },
    t,
    loop,
    isDone,
    state
  );
}

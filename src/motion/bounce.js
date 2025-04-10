import { Motion } from "./motion";

/**
 * Bounce animation - object drops and bounces with diminishing height
 *
 * @param {number} maxHeight - Maximum height (negative y value)
 * @param {number} groundY - Ground position (positive y value)
 * @param {number} bounceCount - Number of bounces to perform
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of animation in seconds
 * @param {boolean} [loop=false] - Whether animation should loop
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks
 * @returns {Object} Animation result with y position and metadata
 */
export function bounceV1(
  maxHeight,
  groundY,
  bounceCount,
  elapsedTime,
  duration,
  loop = false,
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

  // Divide the animation into segments based on bounce count
  const segmentSize = 1 / (bounceCount + 1);
  const segment = Math.min(Math.floor(easedT / segmentSize), bounceCount);
  const segmentT = (easedT % segmentSize) / segmentSize;

  // Calculate bounce height for this segment
  const bounceHeight = maxHeight * Math.pow(0.6, segment);

  // Use a simple sine wave for each bounce
  // Sin goes from 0 to 1 to 0, we want -maxHeight to groundY to -maxHeight
  // Transform the sin function to get bounce effect
  const normalized = Math.sin(segmentT * Math.PI);
  const y = groundY - normalized * (groundY - bounceHeight);

  // Return standardized result
  return Motion.animationResult(
    { y, segment, bounceHeight },
    t,
    loop,
    completed,
    newState
  );
}

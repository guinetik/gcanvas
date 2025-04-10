import { Motion } from "./motion";

/**
 * Shake animation with decreasing intensity
 *
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} maxOffsetX - Maximum X offset
 * @param {number} maxOffsetY - Maximum Y offset
 * @param {number} frequency - Frequency of shakes
 * @param {number} decay - How quickly the shake decreases (0-1)
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of animation in seconds
 * @param {boolean} [loop=false] - Whether animation should loop
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks
 * @returns {Object} Animation result with x, y coordinates and metadata
 */
export function shakeV1(
  centerX,
  centerY,
  maxOffsetX,
  maxOffsetY,
  frequency,
  decay,
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

  // Apply decay to reduce shake over time
  const intensity = Math.pow(1 - easedT, decay);

  // Create randomized but deterministic shake using sine/cosine at different frequencies
  const angleX = easedT * Math.PI * 2 * frequency;
  const angleY = easedT * Math.PI * 2 * frequency * 1.3; // Different frequency for Y

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
  let x = centerX + xOffset;
  let y = centerY + yOffset;

  // Gradually return to center in the last 10% of the animation
  if (easedT > 0.9) {
    const returnT = (easedT - 0.9) / 0.1;
    x = centerX + xOffset * (1 - returnT);
    y = centerY + yOffset * (1 - returnT);
  }

  // Return standardized result
  return Motion.animationResult(
    { x, y, intensity },
    t,
    loop,
    completed,
    newState
  );
}

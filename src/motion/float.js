import { Motion } from "./motion";

/**
 * Patrol animation - creates movement around an area with natural pausing
 * Perfect for characters patrolling or objects drifting within bounds
 *
 * @param {Object} target - Object with x,y properties defining the center point
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of one full float cycle in seconds
 * @param {number} speed - Movement speed multiplier (0.1-2.0 recommended)
 * @param {number} randomness - How random/unpredictable the float path is (0-1)
 * @param {number} radius - Radius of float area (object will move within -radius to +radius)
 * @param {boolean} [loop=true] - Whether animation should loop
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks and initial position
 * @returns {Object} Animation result with x, y coordinates and metadata
 */
export function floatV1(
  target,
  elapsedTime,
  duration,
  speed,
  randomness,
  radius,
  loop = true,
  easingFn = null,
  callbacks = {},
  state = null
) {
  // Early return for zero duration
  if (duration <= 0) {
    return Motion.animationResult(
      { x: target.x, y: target.y, moving: false },
      1,
      false,
      true
    );
  }
  // Initialize state if not provided, capturing initial position
  if (!state) {
    state = {
      initialX: target.x,
      initialY: target.y,
      started: false,
      completed: false,
      loopCount: 0,
    };
  }
  // Use initialX and initialY from state as the center point
  const centerX = state.initialX;
  const centerY = state.initialY;
  // Update animation time and apply easing if needed
  const {
    t,
    easedT,
    completed,
    state: timeState,
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  // Update state with time tracking info
  state = {
    ...state,
    ...timeState,
  };
  // Scale time by speed (higher speed = faster oscillations)
  const scaledTime = elapsedTime * speed;
  // Clamp randomness to valid range (0-1)
  const clampedRandomness = Math.max(0, Math.min(1, randomness));
  // Multi-layered sinusoidal movements with different frequencies
  // to create patrol-like motion with natural pauses

  // Primary motion (large, slow)
  const baseFreqX = 0.7;
  const baseFreqY = 0.9; // Slightly different to avoid perfect circles
  // Secondary motion (direction changes)
  const secondFreqX = 2.3;
  const secondFreqY = 1.9;
  // Calculate combined motion patterns
  const dx =
    Math.sin(scaledTime * baseFreqX) +
    clampedRandomness * 0.4 * Math.sin(scaledTime * secondFreqX + 0.5);
  const dy =
    Math.cos(scaledTime * baseFreqY) +
    clampedRandomness * 0.4 * Math.cos(scaledTime * secondFreqY + 0.7);
  // Scale by radius - the multiplier is 0.5 because we want values to range from -radius to +radius
  // This properly centers the patrol area around the initial position
  const x = centerX + dx * radius;
  const y = centerY + dy * radius;
  //this.logger.log(x, y, centerX, centerY);
  // Calculate if currently moving or paused
  // Object "pauses" when velocity is low (near turning points of sine waves)
  const dxdt =
    baseFreqX * Math.cos(scaledTime * baseFreqX) +
    clampedRandomness *
      0.4 *
      secondFreqX *
      Math.cos(scaledTime * secondFreqX + 0.5);
  const dydt =
    -baseFreqY * Math.sin(scaledTime * baseFreqY) +
    clampedRandomness *
      0.4 *
      -secondFreqY *
      Math.sin(scaledTime * secondFreqY + 0.7);
  // Calculate velocity magnitude
  const velocity = Math.sqrt(dxdt * dxdt + dydt * dydt);
  // Determine if moving or paused (using a threshold)
  const isMoving = velocity > 0.8;
  // Calculate distance from center
  const distanceFromCenter = Math.sqrt(
    (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY)
  );
  // Return standardized result with patrol-specific metadata
  return Motion.animationResult(
    {
      x,
      y,
      centerX,
      centerY,
      offsetX: x - centerX,
      offsetY: y - centerY,
      distance: distanceFromCenter,
      moving: isMoving,
      velocity: velocity,
    },
    t,
    loop,
    completed,
    state
  );
}

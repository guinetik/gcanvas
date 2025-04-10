import { Easing } from "./easing";
import { Motion } from "./motion";
import { Tween } from "./tween";

/**
 * Spring animation that uses elastic easing functions for a bouncy spring effect
 * Stateless implementation that doesn't require previous frame state
 *
 * @param {number} initial - Initial value (starting position)
 * @param {number} target - Target value (ending position)
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of one complete cycle in seconds
 * @param {boolean} [loop=false] - Whether animation should loop
 * @param {boolean} [yoyo=false] - Whether animation should return to initial value
 * @param {Object} [springParams] - Spring parameters
 * @param {number} [springParams.stiffness=0.3] - Spring stiffness (0-1)
 * @param {number} [springParams.damping=0.6] - Damping factor (0-1)
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Function} [callbacks.onStart] - Called when animation starts
 * @param {Function} [callbacks.onComplete] - Called when animation completes
 * @param {Function} [callbacks.onLoop] - Called when animation loops
 * @param {Function} [callbacks.onYoyoTurn] - Called when yoyo animation changes direction
 * @returns {Object} Animation result with value, velocity and metadata
 */
export function springV1(
  initial,
  target,
  elapsedTime,
  duration,
  loop = false,
  yoyo = false,
  springParams = {},
  callbacks = {}
) {
  // Early return for zero duration
  if (duration <= 0) {
    return this.animationResult(
      { value: target, velocity: 0, done: true, phase: "complete" },
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
  // For yoyo, adjust the target value based on which half of the cycle we're in
  let currentTarget, currentInitial, adjustedT;
  if (yoyo) {
    // If in the second half of the animation, we're going back
    if (t >= 0.5) {
      // Swap target and initial
      currentTarget = initial;
      currentInitial = target;
      // Rescale t to 0-1 for the second half
      adjustedT = (t - 0.5) * 2;
      yoyoPhase = "return";
      // Call onYoyoTurn callback at the turning point
      if (t >= 0.5 && t < 0.51 && callbacks.onYoyoTurn) {
        callbacks.onYoyoTurn();
      }
    } else {
      // First half of animation
      currentTarget = target;
      currentInitial = initial;
      adjustedT = t * 2;
      yoyoPhase = "forward";
    }
  } else {
    currentTarget = target;
    currentInitial = initial;
    adjustedT = t;
  }
  // Get spring parameters with defaults
  const stiffness =
    springParams.stiffness !== undefined ? springParams.stiffness : 0.3;
  const damping =
    springParams.damping !== undefined ? springParams.damping : 0.6;
  // Convert stiffness and damping to elastic easing parameters
  const amplitude = Math.max(0.1, 1.0 / (damping * 1.5)); // Higher damping = lower amplitude
  const period = Math.max(0.1, 0.8 / (stiffness * 1.5 + 0.5)); // Higher stiffness = higher frequency
  // Use the elastic easing to generate spring-like motion
  // For springs, easeOutElastic works best (starts fast, then oscillates to rest)
  let easedT;
  if (adjustedT < 0.99) {
    // Use elastic easing for most of the animation
    easedT = Easing.easeOutElastic(adjustedT, amplitude, period);
  } else {
    // Smoothly settle to the exact target value at the end
    // This prevents small oscillations at t=1
    const blendFactor = (adjustedT - 0.99) / 0.01;
    const elasticT = Easing.easeOutElastic(0.99, amplitude, period);
    easedT = elasticT * (1 - blendFactor) + 1 * blendFactor;
  }
  // Interpolate between initial and target values using the eased time
  const position = Tween.lerp(currentInitial, currentTarget, easedT);
  // Calculate approximate velocity by comparing positions at t and t+dt
  const dt = 0.01;
  const nextT = Math.min(adjustedT + dt, 1);
  // Calculate next position for velocity estimation
  let nextEasedT;
  if (nextT < 0.99) {
    nextEasedT = Easing.easeOutElastic(nextT, amplitude, period);
  } else {
    const blendFactor = (nextT - 0.99) / 0.01;
    const elasticT = Easing.easeOutElastic(0.99, amplitude, period);
    nextEasedT = elasticT * (1 - blendFactor) + 1 * blendFactor;
  }
  const nextPosition = Tween.lerp(currentInitial, currentTarget, nextEasedT);
  // Calculate velocity (scaled by duration to account for time)
  const velocity = ((nextPosition - position) / dt) * duration;
  // Check if non-looping animation is complete
  const isDone = !loop && t >= 1;
  // Call onComplete if animation has completed
  if (isDone && callbacks.onComplete) {
    callbacks.onComplete();
  }
  // Return standardized result with additional spring metadata
  return Motion.animationResult(
    {
      value: position,
      velocity: velocity,
      delta: yoyoPhase === "forward" ? target - position : initial - position,
      done: isDone,
      phase: yoyoPhase,
    },
    t,
    loop,
    isDone
  );
}

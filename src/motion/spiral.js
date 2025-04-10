import { Motion } from "./motion";
import { Tween } from "./tween";
/**
 * Spiral motion animation
 *
 * @param {number} centerX - X coordinate of spiral center
 * @param {number} centerY - Y coordinate of spiral center
 * @param {number} startRadius - Starting radius of the spiral
 * @param {number} endRadius - Ending radius of the spiral
 * @param {number} startAngle - Starting angle in radians
 * @param {number} revolutions - Number of complete revolutions
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of animation in seconds
 * @param {boolean} [loop=false] - Whether animation should loop (restart from beginning)
 * @param {boolean} [yoyo=false] - Whether animation should reverse direction at the end
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks
 * @returns {Object} Animation result with x, y coordinates and metadata
 */
export function spiralV1(
  centerX,
  centerY,
  startRadius,
  endRadius,
  startAngle,
  revolutions,
  elapsedTime,
  duration,
  loop = false,
  yoyo = false,
  easingFn = null,
  callbacks = {},
  state = null
) {
  // Initialize state if needed
  if (!state) {
    state = {
      started: false,
      loopCount: 0,
      direction: 1, // 1 = forward, -1 = backward (for yoyo)
      lastDirection: 1,
    };
  }
  // Calculate normalized time (0-1)
  let t = duration > 0 ? elapsedTime / duration : 1;
  let completed = false;
  let activeCallbacks = { ...callbacks };
  // Handle yoyo and loop logic
  if (yoyo || loop) {
    // For yoyo + loop, or just loop: calculate cycle
    if (loop) {
      if (yoyo) {
        // For yoyo + loop: full cycle is 2x duration (forward + backward)
        const fullCycle = duration * 2;
        const cycleTime = elapsedTime % fullCycle;
        const cycleCount = Math.floor(elapsedTime / fullCycle);
        // Determine direction and adjusted t
        const newDirection = cycleTime < duration ? 1 : -1;
        t =
          newDirection === 1 ? cycleTime / duration : 2 - cycleTime / duration;
        // Check for direction change for callbacks
        if (newDirection !== state.direction) {
          state.direction = newDirection;
          if (state.direction === 1 && activeCallbacks.onLoop) {
            activeCallbacks.onLoop(cycleCount);
          }
        }
        // Track loop count
        if (cycleCount > state.loopCount) {
          state.loopCount = cycleCount;
        }
      } else {
        // Just loop, no yoyo: reset t at each cycle
        t = t % 1;
        // Track loop count for callbacks
        const newLoopCount = Math.floor(elapsedTime / duration);
        if (newLoopCount > state.loopCount && activeCallbacks.onLoop) {
          activeCallbacks.onLoop(newLoopCount);
          state.loopCount = newLoopCount;
        }
      }
    } else if (yoyo && !loop) {
      // Yoyo without loop: complete one cycle then stop
      if (t <= 1) {
        // Forward part of the cycle
        state.direction = 1;
      } else if (t <= 2) {
        // Backward part of the cycle
        t = 2 - t;
        state.direction = -1;
      } else {
        // Complete
        t = 0;
        completed = true;
        state.direction = 1;
      }
    }
  } else {
    // No loop or yoyo: standard behavior
    if (t >= 1) {
      t = 1;
      completed = true;
    }
  }
  // Call onStart callback once
  if (!state.started && activeCallbacks.onStart) {
    activeCallbacks.onStart();
    state.started = true;
  }
  // Call onComplete callback once when non-looping animation completes
  if (completed && !state.completed && activeCallbacks.onComplete) {
    activeCallbacks.onComplete();
    state.completed = true;
  }
  // Apply easing if provided
  const easedT = easingFn ? easingFn(t) : t;
  // Calculate current radius using linear interpolation
  const radius = Tween.lerp(startRadius, endRadius, easedT);
  // Calculate current angle (start angle + number of revolutions)
  const angle = startAngle + easedT * revolutions * Math.PI * 2;
  // Convert polar coordinates to Cartesian
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  // Update state for next frame
  const newState = {
    ...state,
    lastDirection: state.direction,
  };
  // Return standardized result
  return Motion.animationResult(
    {
      x,
      y,
      radius,
      angle,
      direction: state.direction, // Include current direction (1 = forward, -1 = backward)
    },
    t,
    loop || (yoyo && !completed),
    completed,
    newState
  );
}

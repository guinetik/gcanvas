import { Motion } from "./motion";

/**
 * Orbit motion animation (circular or elliptical)
 *
 * @param {number} centerX - X coordinate of orbit center
 * @param {number} centerY - Y coordinate of orbit center
 * @param {number} radiusX - X radius of the orbit (horizontal)
 * @param {number} radiusY - Y radius of the orbit (vertical)
 * @param {number} startAngle - Starting angle in radians
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of one full orbit in seconds
 * @param {boolean} [loop=true] - Whether animation should loop
 * @param {boolean} [clockwise=true] - Direction of orbit
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks
 * @returns {Object} Animation result with x, y coordinates and metadata
 */
export function orbitV1(
  centerX,
  centerY,
  radiusX,
  radiusY,
  startAngle,
  elapsedTime,
  duration,
  loop = true,
  clockwise = true,
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
  // Calculate current angle
  const direction = clockwise ? 1 : -1;
  const angle = startAngle + direction * easedT * Math.PI * 2;
  // Convert polar coordinates to Cartesian
  const x = centerX + radiusX * Math.cos(angle);
  const y = centerY + radiusY * Math.sin(angle);
  // Return standardized result
  return Motion.animationResult({ x, y, angle }, t, loop, completed, newState);
}

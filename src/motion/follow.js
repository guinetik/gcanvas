import { Motion } from "./motion";
import { Tween } from "./tween";

/**
 * Follow path animation along a series of points
 *
 * @param {Array<Array<number>>} points - Array of points as [x, y] coordinates
 * @param {boolean} [closed=false] - Whether path is closed (connects back to start)
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} duration - Duration of animation in seconds
 * @param {boolean} [loop=false] - Whether animation should loop
 * @param {Function} [easingFn=null] - Optional easing function to apply
 * @param {Object} [callbacks] - Optional callback functions
 * @param {Object} [state] - Internal state tracking for callbacks
 * @returns {Object} Animation result with x, y coordinates and metadata
 */
export function followPath(
  points,
  closed = false,
  elapsedTime,
  duration,
  loop = false,
  easingFn = null,
  callbacks = {},
  state = null
) {
  // Need at least 2 points
  if (!points || points.length < 2) {
    return this._createResult({ x: 0, y: 0 }, 0, loop, false);
  }
  // Update animation time and apply easing
  const {
    t,
    easedT,
    completed,
    state: newState,
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);

  // Calculate total path length and segment lengths
  if (!state || !state.pathData) {
    const pathData = {
      segmentLengths: [],
      totalLength: 0,
      points: [...points],
    };

    // Calculate length of each segment
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const length = Math.sqrt(dx * dx + dy * dy);

      pathData.segmentLengths.push(length);
      pathData.totalLength += length;
    }

    // If closed, add final segment back to start
    if (closed) {
      const p1 = points[points.length - 1];
      const p2 = points[0];
      const dx = p2[0] - p1[0];
      const dy = p2[1] - p1[1];
      const length = Math.sqrt(dx * dx + dy * dy);

      pathData.segmentLengths.push(length);
      pathData.totalLength += length;
    }

    newState.pathData = pathData;
  }

  // Get path data
  const { segmentLengths, totalLength, points: pathPoints } = newState.pathData;

  // Calculate distance along path
  const targetDistance = easedT * totalLength;

  // Find which segment we're on and the progress through it
  let distanceTraveled = 0;
  let segmentIndex = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (distanceTraveled + segmentLengths[i] >= targetDistance) {
      segmentIndex = i;
      break;
    }
    distanceTraveled += segmentLengths[i];
  }

  // Calculate progress through current segment
  const segmentProgress =
    (targetDistance - distanceTraveled) / segmentLengths[segmentIndex];

  // Get points for current segment
  const p1 = pathPoints[segmentIndex];
  const p2 =
    segmentIndex < pathPoints.length - 1
      ? pathPoints[segmentIndex + 1]
      : pathPoints[0]; // Wrap to start if closed

  // Interpolate between points
  const x = Tween.lerp(p1[0], p2[0], segmentProgress);
  const y = Tween.lerp(p1[1], p2[1], segmentProgress);

  // Calculate angle of current segment (for rotation if needed)
  const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);

  // Return standardized result
  return Motion.animationResult(
    {
      x,
      y,
      angle,
      segmentIndex,
      segmentProgress,
      pathProgress: easedT,
    },
    t,
    loop,
    completed,
    newState
  );
}

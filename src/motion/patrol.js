import { Motion } from "./motion";
/**
 * Simple patrol animation that moves randomly within a radius
 * Character moves along cardinal directions with waiting periods
 * @function patrolV1
 * @param {number} initialX - Initial X position (center point)
 * @param {number} initialY - Initial Y position (center point)
 * @param {number} elapsedTime - Total elapsed time in seconds
 * @param {number} moveTime - Time to spend moving between points
 * @param {number} waitTime - Time to wait at each point
 * @param {number} radius - Maximum distance from center point
 * @param {boolean} [loop=true] - Whether animation should loop
 * @param {Object} [state] - Internal state tracking
 * @returns {Object} Animation result with position and direction
 *
 * @section Metadata
 * @property {boolean} requiresState - Indicates this animation must be called with a persistent state object across frames.
 * This ensures consistent behavior (e.g. waypoint progress, direction, internal timers).
 * You should initialize and reuse a `state` object outside the update loop.
 */
export function patrolV1(
  initialX,
  initialY,
  elapsedTime,
  moveTime,
  waitTime,
  radius,
  loop = true,
  state = null
) {
  // Initialize state if not provided
  if (!state) {
    state = {
      currentX: initialX,
      currentY: initialY,
      targetX: initialX,
      targetY: initialY,
      isWaiting: true,
      waitStartTime: 0,
      moveStartTime: 0,
      moveCount: 0,
      direction: "idle",
    };
  }
  // Create a simple random function
  const rand = () => Math.random();
  // Calculate time and movement state
  let isWaiting = state.isWaiting;
  let x = state.currentX;
  let y = state.currentY;
  let direction = state.direction;
  // Check if we need to transition between waiting and moving
  if (isWaiting) {
    // Currently waiting
    if (elapsedTime - state.waitStartTime >= waitTime) {
      // Wait period is over, pick a new target point
      isWaiting = false;
      state.moveStartTime = elapsedTime;
      // Choose a new cardinal direction (up, down, left, right)
      const directions = ["up", "down", "left", "right"];
      direction = directions[Math.floor(rand() * 4)];
      // Calculate potential new target based on direction
      let newTargetX = state.currentX;
      let newTargetY = state.currentY;
      // Random move distance (20-80% of radius)
      const moveDistance = radius * (0.2 + rand() * 0.6);
      // handle direction by manipulating corresponding position
      switch (direction) {
        case "up":
          newTargetY = state.currentY - moveDistance;
          break;
        case "down":
          newTargetY = state.currentY + moveDistance;
          break;
        case "left":
          newTargetX = state.currentX - moveDistance;
          break;
        case "right":
          newTargetX = state.currentX + moveDistance;
          break;
      }
      // If new target would be outside radius, move toward center instead
      const newDistSq =
        Math.pow(newTargetX - initialX, 2) + Math.pow(newTargetY - initialY, 2);
      if (newDistSq > radius * radius) {
        // Move back toward center
        if (direction === "up" || direction === "down") {
          // Moving vertically, adjust Y
          newTargetY = initialY;
          direction = state.currentY > initialY ? "up" : "down";
        } else {
          // Moving horizontally, adjust X
          newTargetX = initialX;
          direction = state.currentX > initialX ? "left" : "right";
        }
      }
      // Update State
      state.targetX = newTargetX;
      state.targetY = newTargetY;
      state.direction = direction;
      state.moveCount++;
    }
  } else {
    // Currently moving
    const moveProgress = (elapsedTime - state.moveStartTime) / moveTime;
    if (moveProgress >= 1) {
      // Reached target, start waiting
      isWaiting = true;
      state.waitStartTime = elapsedTime;
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      direction = "idle";
    } else {
      // Interpolate position
      x = state.currentX + (state.targetX - state.currentX) * moveProgress;
      y = state.currentY + (state.targetY - state.currentY) * moveProgress;
    }
  }
  // Update state
  state.isWaiting = isWaiting;
  state.direction = direction;
  if (!isWaiting) {
    state.currentX = x;
    state.currentY = y;
  }
  // Calculate t value (0-1)
  const cycleTime = moveTime + waitTime;
  const t = (elapsedTime % cycleTime) / cycleTime;
  // Calculate distance from center
  const distanceFromCenter = Math.sqrt(
    Math.pow(x - initialX, 2) + Math.pow(y - initialY, 2)
  );
  // Return result
  return Motion.animationResult(
    {
      x,
      y,
      moving: !isWaiting,
      direction,
      distanceFromCenter,
    },
    t,
    loop,
    false,
    state
  );
}
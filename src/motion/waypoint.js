import { Motion } from "./motion";

/**
   * Waypoint is a patrol animation that follows a path of waypoints with proper waiting periods
   * Moves characters along cardinal directions (horizontal and vertical movement)
   *
   * @param {Object} target - Object with x,y properties (not used for position calculation)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {Array<Array<number>>} waypoints - Array of waypoints [[x1,y1], [x2,y2], ...]
   * @param {number} speed - Movement speed in units per second
   * @param {number} waitTime - Time to wait at each waypoint in seconds
   * @param {boolean} [loop=true] - Whether patrol should loop back to start
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onWaypointReached] - Called when reaching a waypoint
   * @param {Function} [callbacks.onWaitStart] - Called when starting to wait at a waypoint
   * @param {Function} [callbacks.onWaitEnd] - Called when done waiting at a waypoint
   * @param {Function} [callbacks.onPatrolComplete] - Called when patrol is complete (non-looping only)
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result with position and patrol metadata
   */
export function waypointV1(
  target,
  elapsedTime,
  waypoints,
  speed,
  waitTime,
  loop = true,
  callbacks = {},
  state = null
) {
  // Validate waypoints
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    console.warn("Patrol animation requires at least 2 waypoints");
    return Motion._createResult(
      { x: 0, y: 0, moving: false, direction: "idle", waypoint: 0 },
      0,
      false,
      true
    );
  }
  // Initialize state if not provided
  if (!state) {
    state = {
      currentWaypoint: 0,
      nextWaypoint: 1,
      isWaiting: true,
      waitStartTime: 0,
      lastWaypointTime: 0,
      lastWaypointReached: -1,
      completed: false,
    };
  }
  // Calculate total patrol path length
  let totalPathLength = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const nextIndex = (i + 1) % waypoints.length;
    if (!loop && i === waypoints.length - 1) break;

    const dx = waypoints[nextIndex][0] - waypoints[i][0];
    const dy = waypoints[nextIndex][1] - waypoints[i][1];
    totalPathLength += Math.abs(dx) + Math.abs(dy); // Manhattan distance for cardinal movement
  }
  // Calculate total cycle time
  const moveTime = totalPathLength / speed;
  const totalWaitTime = waitTime * waypoints.length;
  const cycleTime = moveTime + totalWaitTime;
  // Normalize time for looping
  let normalizedTime = elapsedTime;
  if (loop) {
    normalizedTime = elapsedTime % cycleTime;
  } else {
    normalizedTime = Math.min(elapsedTime, cycleTime);
  }
  // Calculate current t value (0-1)
  const t = normalizedTime / cycleTime;
  // Process patrol logic to find current position
  let timeRemaining = normalizedTime;
  let currentWaypoint = 0;
  let nextWaypoint = 1;
  let isWaiting = true;
  let waitProgress = 0;
  let segmentProgress = 0;
  let completed = false;
  // Start at the first waypoint and wait
  if (timeRemaining < waitTime) {
    // Still waiting at the first waypoint
    waitProgress = timeRemaining / waitTime;
    currentWaypoint = 0;
    nextWaypoint = 1;
    isWaiting = true;
  } else {
    // Move through the waypoints
    timeRemaining -= waitTime;
    for (let i = 0; i < waypoints.length; i++) {
      // Check if we've reached the last waypoint in non-looping mode
      if (!loop && i === waypoints.length - 1) {
        currentWaypoint = i;
        nextWaypoint = i;
        isWaiting = true;
        waitProgress = 1;
        completed = true;
        break;
      }
      //
      const nextIndex = (i + 1) % waypoints.length;
      // Calculate segment distance (using Manhattan distance for cardinal movement)
      const dx = waypoints[nextIndex][0] - waypoints[i][0];
      const dy = waypoints[nextIndex][1] - waypoints[i][1];
      const segmentLength = Math.abs(dx) + Math.abs(dy);
      // Time to move through this segment
      const segmentTime = segmentLength / speed;
      // Check if we're on this segment
      if (timeRemaining < segmentTime) {
        currentWaypoint = i;
        nextWaypoint = nextIndex;
        isWaiting = false;
        segmentProgress = timeRemaining / segmentTime;
        break;
      }
      // Move to next segment
      timeRemaining -= segmentTime;
      // Check if we're waiting at the next waypoint
      if (timeRemaining < waitTime) {
        currentWaypoint = nextIndex;
        nextWaypoint = (nextIndex + 1) % waypoints.length;
        isWaiting = true;
        waitProgress = timeRemaining / waitTime;
        // If this is a new waypoint reached, trigger callback
        if (state.lastWaypointReached !== currentWaypoint) {
          if (callbacks.onWaypointReached) {
            callbacks.onWaypointReached(currentWaypoint);
          }
          // callbacks
          if (callbacks.onWaitStart) {
            callbacks.onWaitStart(currentWaypoint);
          }
          state.lastWaypointReached = currentWaypoint;
        }
        break;
      }
      timeRemaining -= waitTime;
    }
  }

  // Calculate position and direction
  let x, y, direction;
  if (isWaiting || completed) {
    // Use the current waypoint position
    x = waypoints[currentWaypoint][0];
    y = waypoints[currentWaypoint][1];
    direction = "idle";
    // If we just finished waiting, trigger callback
    if (!state.isWaiting && isWaiting && callbacks.onWaitEnd) {
      callbacks.onWaitEnd(currentWaypoint);
    }
  } else {
    // We're moving between waypoints
    const current = waypoints[currentWaypoint];
    const next = waypoints[nextWaypoint];
    // Calculate movement along cardinal directions
    // First move horizontally, then vertically
    const dx = next[0] - current[0];
    const dy = next[1] - current[1];
    // Determine if we're moving horizontally or vertically first
    // Here we prioritize horizontal movement, but you could make this configurable
    const totalDistance = Math.abs(dx) + Math.abs(dy);
    const horizontalRatio = Math.abs(dx) / totalDistance;
    // Calculate position
    if (segmentProgress <= horizontalRatio && dx !== 0) {
      // Moving horizontally
      const horizontalProgress = segmentProgress / horizontalRatio;
      x = current[0] + dx * horizontalProgress;
      y = current[1];
      direction = dx > 0 ? "right" : "left";
    } else {
      // Moving vertically
      const verticalProgress =
        (segmentProgress - horizontalRatio) / (1 - horizontalRatio);
      x = next[0]; // Horizontal movement is complete
      y = current[1] + dy * verticalProgress;
      direction = dy > 0 ? "down" : "up";
    }
  }
  // Update state for next call
  state.currentWaypoint = currentWaypoint;
  state.nextWaypoint = nextWaypoint;
  state.isWaiting = isWaiting;
  // Call completion callback if needed
  if (!state.completed && completed && callbacks.onPatrolComplete) {
    callbacks.onPatrolComplete();
    state.completed = true;
  }
  // Return result with patrol-specific metadata
  return Motion.animationResult(
    {
      x,
      y,
      moving: !isWaiting,
      waiting: isWaiting,
      waitProgress: isWaiting ? waitProgress : 0,
      direction,
      waypoint: currentWaypoint,
      nextWaypoint,
    },
    t,
    loop,
    completed,
    state
  );
}
import { GameObject } from "../game/index.js";
import { Position } from "../util/position.js";

/**
 * Applies anchor positioning to a game object
 *
 * @param {GameObject} go - The game object to anchor
 * @param {Object} options - Anchor configuration options
 * @param {string} [options.anchor] - Anchor position (use Position constants)
 * @param {number} [options.anchorMargin=10] - Margin from the edge when anchoring
 * @param {number} [options.anchorOffsetX=0] - Additional X offset to apply after anchoring
 * @param {number} [options.anchorOffsetY=0] - Additional Y offset to apply after anchoring
 * @param {GameObject|boolean} [options.anchorRelative=false] - Object to anchor relative to, or true to use parent
 * @param {boolean} [options.anchorSetTextAlign=true] - Whether to set text alignment properties if available
 * @returns {GameObject} The original game object for chaining
 */
export function applyAnchor(go, options = {}) {
  // Ensure we're only applying anchor to GameObjects
  if (!go || !(go instanceof GameObject)) {
    console.warn("applyAnchor can only be applied to GameObject instances");
    return go;
  }

  // Store anchor properties in a separate namespace to avoid conflicts
  go._anchor = {
    position: options.anchor ?? null,
    margin: options.anchorMargin ?? 10,
    offsetX: options.anchorOffsetX ?? 0,
    offsetY: options.anchorOffsetY ?? 0,
    relative: options.anchorRelative ?? false,
    setTextAlign: options.anchorSetTextAlign !== false,
    lastUpdate: 0, // Track when we last updated positioning
  };

  // Keep a reference to the original update method
  const originalUpdate = go.update?.bind(go);

  // Override the update method
  go.update = function (dt) {
    //console.log("Anchor.update", go.name || go.constructor.name, go.boundsDirty);
    // Skip anchor updates if bounds aren't dirty
    const relativeObj =
      go._anchor.relative === true && go.parent
        ? go.parent
        : go._anchor.relative;

    // Only update positioning when bounds are dirty (geometry changed)
    // or when related objects have changed
    if (
      go._anchor.position &&
      (go.boundsDirty ||
        (relativeObj && relativeObj.boundsDirty) ||
        (go.parent && go.parent.boundsDirty))
    ) {
      // Calculate position
      let position;

      if (relativeObj) {
        // Position relative to another object
        const containerObj = {
          x: relativeObj.x,
          y: relativeObj.y,
          width: relativeObj.width,
          height: relativeObj.height,
        };

        position = Position.calculate(
          go._anchor.position,
          go,
          containerObj,
          go._anchor.margin,
          go._anchor.offsetX,
          go._anchor.offsetY
        );
      } else {
        // Position absolute to the game canvas
        position = Position.calculateAbsolute(
          go._anchor.position,
          go,
          go.game,
          go._anchor.margin,
          go._anchor.offsetX,
          go._anchor.offsetY
        );
      }
      // Apply the calculated position using Transform API
      let newX, newY;
      
      if (go.parent && !isPipelineRoot(go)) {
        // If object has a parent AND is not directly in the pipeline
        if (relativeObj === go.parent) {
          // If anchored relative to parent, use local coordinates
          // (parent position is already accounted for in rendering)
          newX = position.x - relativeObj.x;
          newY = position.y - relativeObj.y;
        } else {
          // If anchored to something else or absolutely, convert to local coordinates
          newX = position.x - go.parent.x;
          newY = position.y - go.parent.y;
        }
      } else {
        // No parent or directly in pipeline - use absolute coordinates
        newX = position.x;
        newY = position.y;
      }
      
      // Use Transform API if available, otherwise fall back to direct assignment
      if (go.transform && typeof go.transform.position === "function") {
        go.transform.position(newX, newY);
      } else {
        go.x = newX;
        go.y = newY;
      }

      // Set text alignment if applicable and enabled
      if (go._anchor.setTextAlign) {
        if ("align" in go) go.align = position.align;
        if ("baseline" in go) go.baseline = position.baseline;
      }

      // Remember the time we last updated
      go._anchor.lastUpdate = go.game ? go.game.lastTime : Date.now();
    }

    // Call the original update method
    if (originalUpdate) originalUpdate(dt);
  };

  // Helper function to determine if an object is directly in the pipeline
  function isPipelineRoot(gameObject) {
    return (
      gameObject.game &&
      gameObject.game.pipeline &&
      gameObject.game.pipeline.gameObjects &&
      gameObject.game.pipeline.gameObjects.includes(gameObject)
    );
  }

  // Return the object for chaining
  return go;
}

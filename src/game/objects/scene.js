/*************************************************************
 * Scene.js
 *
 * A container-like GameObject that manages a list of child
 * GameObjects. It acts as a local coordinate system, allowing
 * children to inherit the Scene's position for rendering and
 * update. Useful for grouping related objects (e.g., a level).
 *************************************************************/
import { GameObject } from "../go.js";

/**
 * Scene - A specialized GameObject that can contain child GameObjects,
 * updating and rendering them as a group. The Scene’s own position
 * (x, y) is temporarily added to each child for the duration of
 * update calls, effectively shifting children by the Scene’s offset.
 */
export class Scene extends GameObject {
  /**
   * @param {Game} game - The main game instance.
   * @param {object} [options] - Optional parameters for position, etc.
   * @param {number} [options.x=0] - The Scene’s x-position.
   * @param {number} [options.y=0] - The Scene’s y-position.
   */
  constructor(game, options = {}) {
    super(game, options);

    /**
     * A list of child GameObjects that this Scene manages.
     * @type {Array<GameObject>}
     */
    this.children = [];

    // Re-assign explicitly in case user omitted them in the parent constructor call.
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
  }

  /**
   * Add a GameObject to this Scene, allowing it to be updated and rendered.
   * @param {GameObject} go - The child GameObject to add.
   * @returns {GameObject} The same GameObject, for chaining or reference.
   */
  add(go) {
    go.parent = this; // Set the parent to this Scene
    this.children.push(go);
    return go;
  }

  /**
   * Remove a GameObject from the Scene.
   * @param {GameObject} go - The child GameObject to remove.
   */
  remove(go) {
    this.children = this.children.filter((child) => child !== go);
    go.parent = null; // Clear the parent reference
  }

  /**
   * Remove all child GameObjects.
   */
  clear() {
    this.children = [];
  }

  /**
   * Bring a specific child GameObject to the front (end of the list),
   * ensuring it’s rendered after others (on top).
   * @param {GameObject} go - The child to bring forward.
   */
  bringToFront(go) {
    this.remove(go);
    this.children.push(go);
  }

  /**
   * Send a specific child GameObject to the back (start of the list),
   * ensuring it’s rendered before others (behind them).
   * @param {GameObject} go - The child to push behind.
   */
  sendToBack(go) {
    this.remove(go);
    this.children.unshift(go);
  }

  /**
   * Called each frame to update this Scene and its children.
   * Temporarily offsets each child by the Scene’s own (x, y) before
   * updating, then reverts the child’s coordinates afterward.
   * @param {number} dt - Delta time in seconds since the last frame.
   */
  update(dt) {
    for (let child of this.children) {
      // Shift the child's coordinates by the Scene's position
      if (typeof child.x === "number") child.x += this.x;
      if (typeof child.y === "number") child.y += this.y;
      const opacity = child.opacity ?? 1;
      child.opacity = this.opacity * opacity;
      ///
      // TODO NOT WORKING
      // Set child's scale to the Scene's scale
      const scaleX = child.scaleX ?? 1;
      const scaleY = child.scaleY ?? 1;
      child.scaleX *= this.scaleX;
      child.scaleY *= this.scaleY;
      // Set the child's rotation to the Scene's rotation
      const rotation = child.rotation ?? 0;
      child.rotation += this.rotation;
      // Delegate the update to the child
      if (child.update) {
        child.update(dt);
      }
      // Restore the child's opacity
      child.opacity = opacity;
      child.rotation = rotation;
      // Restore the child's scale
      child.scaleX = scaleX;
      child.scaleY = scaleY;
      // Revert the child's position
      if (typeof child.x === "number") child.x -= this.x;
      if (typeof child.y === "number") child.y -= this.y;
    }
  }

  /**
   * Called each frame to render the Scene’s children in order.
   * Children are drawn at their normal coordinates but conceptually
   * offset by (x, y) if the user checks them inside child.render().
   */
  render() {
    // If Scene is invisible or fully transparent, bail out
    if (!this.visible || this.opacity <= 0) return;
    for (let child of this.children) {
      if (child.render) {
        child.render();
      }
    }
  }
}

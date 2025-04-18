/***************************************************************
 * Pipeline.js
 *
 * Manages and updates/renders a collection of GameObjects.
 * Handles input event dispatch to the topmost interactive object,
 * including special handling for Scenes (nested children).
 ***************************************************************/

import { Scene } from "./objects";
import { Tweenetik } from "../motion"
/**
 * Pipeline - Maintains a list of GameObjects, updating and rendering them
 * each frame. It also centralizes and dispatches pointer events (inputdown,
 * inputup, inputmove) to interactive objects, including nested Scene children.
 */
export class Pipeline {
  /**
   * Create a new Pipeline.
   * @param {Game} game - A reference to the main Game instance.
   */
  constructor(game) {
    /**
     * Reference to the owning Game.
     * @type {Game}
     */
    this.game = game;
    /**
     * The master list of top-level GameObjects to update and render.
     * @type {GameObject[]}
     */
    this.gameObjects = [];

    // Listen for pointer events from the Game's central event system.
    const types = ["inputdown", "inputup", "inputmove"];
    types.forEach((type) => {
      this.game.events.on(type, (e) => {
        this.dispatchInputEvent(type, e);
      });
    });
  }

  /**
   * Internal helper to check if a single GameObject is hovered, and emit
   * mouseover/mouseout as needed.
   * @param {GameObject} obj - The object to hover-test.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _hoverObject(obj, e) {
    // Only applies to interactive objects with a shape and a _hitTest method.
    if (!obj.interactive || !obj._hitTest) return;
    const hit = obj._hitTest(e.x, e.y);
    if (hit && !obj._hovered) {
      // Pointer entered this object
      obj._hovered = true;
      obj.events.emit("mouseover", e);
      //console.log("Mouseover", obj, e.x, e.y);
    } else if (!hit && obj._hovered) {
      // Pointer left this object
      obj._hovered = false;
      obj.events.emit("mouseout", e);
    }
  }

  /**
   * Recursively checks all children of a Scene for hover state.
   * @param {Scene} scene - The scene whose children will be hover-tested.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _hoverScene(scene, e) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child instanceof Scene) {
        this._hoverScene(child, e); // recurse into nested scenes
      } else {
        this._hoverObject(child, e); // hover actual objects
      }
    }
  }

  /**
   * Dispatch a pointer event (inputdown, inputup, inputmove) to the first
   * GameObject that is hit, or to Scenes that can recursively handle children.
   * Also triggers _dispatchHover if needed.
   * @param {string} type - Event type (e.g., "inputdown", "inputup", "inputmove").
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   */
  dispatchInputEvent(type, e) {
    let handled = false;
    // Check from topmost to bottommost object to find the first that was hit.
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      if (type === "inputdown") {
        //console.log("inputdown", obj);
      }
      if (obj instanceof Scene) {
        // If it's a Scene, see if any of its children were hit.
        if (this._dispatchToScene(obj, type, e)) {
          handled = true;
          break;
        }
      } else if (obj.interactive && obj._hitTest?.(e.x, e.y)) {
        // Found a regular interactive GameObject that was hit
        obj.events.emit(type, e);
        handled = true;
        break;
      }
    }

    // If this is a pointer move event, we also check for hover transitions.
    if (type === "inputmove") {
      this._dispatchHover(e);
    }
  }

  /**
   * After handling inputmove at the top level, this updates hover states
   * for all interactive objects, including children in Scenes.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _dispatchHover(e) {
    // Check from topmost to bottommost for hover changes.
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      //console.log("Hover test for", obj, e.x, e.y);
      if (obj instanceof Scene) {
        this._hoverScene(obj, e);
      } else {
        this._hoverObject(obj, e);
      }
    }
  }

  /**
   * Recursively dispatch an event to a Scene and possibly its nested child Scenes.
   * @param {Scene} scene - The scene to dispatch the event to.
   * @param {string} type - The type of pointer event ("inputdown", "inputup", etc).
   * @param {object} e - Event data with pointer coordinates.
   * @returns {boolean} True if the event was handled by a child, false otherwise.
   * @private
   */
  _dispatchToScene(scene, type, e) {
    //if(type === "inputdown") console.log("inputdown", scene);
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child instanceof Scene) {
        // Recurse deeper if child is also a Scene
        const hit = this._dispatchToScene(child, type, e);
        if (hit) {
          //if(type === "inputdown") console.log("HIT", child, type);
          return true;
        }
      } else if (child.interactive && child._hitTest?.(e.x, e.y)) {
        // Found a child that was hit
        //if(type === "inputdown") console.log("Dispatching to child", child, type);
        child.events.emit(type, e);
        return true;
      }
    }
    return false;
  }

  /**
   * Add a GameObject to the pipeline so it will be updated and rendered each frame.
   * @param {GameObject} gameObject - The game object to add.
   * @returns {GameObject} Returns the same object for convenience.
   */
  add(gameObject) {
    gameObject.parent = this;
    this.gameObjects = [...this.gameObjects, gameObject];
    return gameObject;
  }

  /**
   * Remove a GameObject from the pipeline.
   * @param {GameObject} gameObject - The object to remove.
   */
  remove(gameObject) {
    this.gameObjects = this.gameObjects.filter((obj) => obj !== gameObject);
  }

  /**
   * Update all active game objects. Called each frame by the Game.
   * Only active objects are updated.
   * @param {number} dt - Delta time in seconds since the last frame.
   */
  update(dt) {
    this.gameObjects
      .filter((obj) => obj.active)
      .forEach((obj) => obj.update(dt));
    Tweenetik.updateAll(dt);
  }

  /**
   * Render all active game objects. Called each frame by the Game.
   * Only visible objects are rendered.
   */
  render() {
    this.gameObjects
      .filter((obj) => obj.visible)
      .forEach((obj) => obj.render());
  }

  /**
   * Clear all game objects from the pipeline.
   * Typically used when restarting or resetting the game.
   */
  clear() {
    this.gameObjects = [];
  }
}

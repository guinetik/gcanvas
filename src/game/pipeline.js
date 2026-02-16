/***************************************************************
 * Pipeline.js
 *
 * Manages and updates/renders a collection of GameObjects.
 * Handles input event dispatch to the topmost interactive object,
 * including special handling for Scenes (nested children).
 ***************************************************************/

import { Scene } from "./objects";
import { Tweenetik } from "../motion"; 
import { Loggable } from "../logger/loggable";
import { ZOrderedCollection } from "../util";
/**
 * Pipeline - Maintains a list of GameObjects, updating and rendering them
 * each frame. It also centralizes and dispatches pointer events (inputdown,
 * inputup, inputmove) to interactive objects, including nested Scene children.
 */
export class Pipeline extends Loggable {
  /**
   * Create a new Pipeline.
   * @param {Game} game - A reference to the main Game instance.
   */
  constructor(game) {
    super();
    /**
     * Reference to the owning Game.
     * @type {Game}
     */
    this.game = game;
    /**
     * The master list of top-level GameObjects to update and render.
     * @type {GameObject[]}
     */
    // Create the z-ordered collection
    this._collection = new ZOrderedCollection();
    this._collection._owner = this; // Give collection a reference to its owner

    // Listen for pointer events from the Game's central event system.
    const types = ["inputdown", "inputup", "inputmove", "click"];
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
    } else if (!hit && obj._hovered) {
      // Pointer left this object
      obj._hovered = false;
      obj.events.emit("mouseout", e);
    }
  }

  /**
   * Recursively checks all children of a Scene for hover state.
   * Also checks if the Scene itself is interactive.
   * @param {Scene} scene - The scene whose children will be hover-tested.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _hoverScene(scene, e) {
    let consumed = false;
    // First check children (topmost first)
    if (scene.children && scene.children.length > 0) {
      for (let i = scene.children.length - 1; i >= 0; i--) {
        const child = scene.children[i];

        // Check if child is hittable (e.g., within viewport for scrollable layouts)
        if (scene.isChildHittable && !scene.isChildHittable(child)) {
          // Force mouseout if child was hovered but is now outside viewport
          if (child._hovered) {
            child._hovered = false;
            child.events.emit("mouseout", e);
          }
          continue;
        }

        if (consumed) {
          // A higher child already consumed the hover — force mouseout on anything below
          if (child._hovered) {
            child._hovered = false;
            child.events.emit("mouseout", e);
          }
          continue;
        }

        if (child instanceof Scene) {
          if (this._hoverScene(child, e)) {
            consumed = true;
          }
        } else {
          if (child.interactive && child._hitTest?.(e.x, e.y)) {
            if (!child._hovered) {
              child._hovered = true;
              child.events.emit("mouseover", e);
            }
            consumed = true;
          } else if (child._hovered) {
            child._hovered = false;
            child.events.emit("mouseout", e);
          }
        }
      }
    }
    // Also check the Scene itself for hover state
    if (!consumed) {
      this._hoverObject(scene, e);
    } else if (scene._hovered) {
      scene._hovered = false;
      scene.events.emit("mouseout", e);
    }
    return consumed;
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
    let consumed = false;
    // Check from topmost to bottommost for hover changes.
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      if (consumed) {
        // Force mouseout on anything below the consumed object
        if (obj instanceof Scene) {
          this._unhoverScene(obj, e);
        } else if (obj._hovered) {
          obj._hovered = false;
          obj.events.emit("mouseout", e);
        }
        continue;
      }
      if (obj instanceof Scene) {
        if (this._hoverScene(obj, e)) {
          consumed = true;
        }
      } else {
        if (obj.interactive && obj._hitTest?.(e.x, e.y)) {
          if (!obj._hovered) {
            obj._hovered = true;
            obj.events.emit("mouseover", e);
          }
          consumed = true;
        } else if (obj._hovered) {
          obj._hovered = false;
          obj.events.emit("mouseout", e);
        }
      }
    }
  }

  /**
   * Force mouseout on all children of a scene (used when hover is consumed by a higher object).
   * @param {Scene} scene
   * @param {object} e
   * @private
   */
  _unhoverScene(scene, e) {
    if (scene.children) {
      for (const child of scene.children) {
        if (child instanceof Scene) {
          this._unhoverScene(child, e);
        } else if (child._hovered) {
          child._hovered = false;
          child.events.emit("mouseout", e);
        }
      }
    }
    if (scene._hovered) {
      scene._hovered = false;
      scene.events.emit("mouseout", e);
    }
  }

  /**
   * Recursively dispatch an event to a Scene and possibly its nested child Scenes.
   * Also checks if the Scene itself is interactive and was hit.
   * @param {Scene} scene - The scene to dispatch the event to.
   * @param {string} type - The type of pointer event ("inputdown", "inputup", etc).
   * @param {object} e - Event data with pointer coordinates.
   * @returns {boolean} True if the event was handled by a child or the scene itself, false otherwise.
   * @private
   */
  _dispatchToScene(scene, type, e) {
    // First check children (they render on top, so should get priority)
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];

      // Check if child is hittable (e.g., within viewport for scrollable layouts)
      if (scene.isChildHittable && !scene.isChildHittable(child)) {
        continue;
      }

      if (child instanceof Scene) {
        // Recurse deeper if child is also a Scene
        const hit = this._dispatchToScene(child, type, e);
        if (hit) {
          return true;
        }
      } else if (child.interactive && child._hitTest?.(e.x, e.y)) {
        // Found a child that was hit
        child.events.emit(type, e);
        return true;
      }
    }
    // If no children handled the event, check if the Scene itself is interactive and hit
    if (scene.interactive && scene._hitTest?.(e.x, e.y)) {
      scene.events.emit(type, e);
      return true;
    }
    return false;
  }

  /**
   * Add a GameObject to the pipeline so it will be updated and rendered each frame.
   * @param {GameObject} gameObject - The game object to add.
   * @returns {GameObject} Returns the same object for convenience.
   */
  add(gameObject) {
    gameObject.parent = this.game;
    const go = this._collection.add(gameObject);
    // call the init() method on the go if it exists
    if (go.init) {
      go.init();
    }
    return go;
  }

  /**
   * Remove a GameObject from the pipeline.
   * @param {GameObject} gameObject - The object to remove.
   */
  remove(gameObject) {
    if(gameObject === undefined || gameObject === null) { 
      this.logger.warn("Cannot remove undefined or null object", gameObject);
      return;
    }
    this._collection.remove(gameObject);
  }

  bringToFront(gameObject) {
    return this._collection.bringToFront(gameObject);
  }
  
  sendToBack(gameObject) {
    return this._collection.sendToBack(gameObject);
  }
  
  bringForward(gameObject) {
    return this._collection.bringForward(gameObject);
  }
  
  sendBackward(gameObject) {
    return this._collection.sendBackward(gameObject);
  }
  
  clear() {
    return this._collection.clear();
  }
  
  // Getter to access children
  get gameObjects() {
    return this._collection.children;
  }
  
  update(dt) {
    this.logger.groupCollapsed("Pipeline.update");
    this._collection.children
      .filter((obj) => obj.active)
      .forEach((obj) => obj.update(dt));
    Tweenetik.updateAll(dt);
    this.logger.groupEnd();
  }
  
  render() {
    const renderObj = (obj) => obj.render();
    const filterVisible = (obj) => obj.visible;
    const filterActive = (obj) => obj.active;
    this.logger.groupCollapsed("Pipeline.render");
    this._collection.getSortedChildren()
      .filter(filterVisible)
      .filter(filterActive)
      .forEach(renderObj);
    this.logger.groupEnd();
  }
}

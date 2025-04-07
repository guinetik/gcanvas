import { Scene } from "./objects/scene";

/**
 * Pipeline - Manages and updates/render game objects each frame.
 * Utilizes functional patterns for clarity and conciseness.
 */
export class Pipeline {
  /**
   * @param {Game} game - Reference to the owning game instance
   */
  constructor(game) {
    this.game = game;
    this.gameObjects = [];
    // Centralized event dispatching
    const types = ["inputdown", "inputup", "inputmove"];
    // Register event listeners for input events
    types.forEach((type) => {
      this.game.events.on(type, (e) => {
        this.dispatchInputEvent(type, e);
      });
    });
  }

  _hoverObject(obj, e) {
    if (!obj.interactive || !obj.shape || !obj._hitTest) return;

    const hit = obj._hitTest(e.x, e.y);

    if (hit && !obj._hovered) {
      obj._hovered = true;
      obj.events.emit("mouseover", e);
    } else if (!hit && obj._hovered) {
      obj._hovered = false;
      obj.events.emit("mouseout", e);
    }
  }

  _hoverScene(scene, e) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      this._hoverObject(child, e);
    }
  }

  dispatchInputEvent(type, e) {
    let handled = false;

    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];

      if (obj instanceof Scene) {
        if (this._dispatchToScene(obj, type, e)) {
          handled = true;
          break;
        }
      } else if (obj.interactive && obj.shape && obj._hitTest?.(e.x, e.y)) {
        obj.events.emit(type, e);
        handled = true;
        break;
      }
    }

    if (type === "inputmove") {
      this._dispatchHover(e);
    }
  }

  _dispatchHover(e) {
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      if (obj instanceof Scene) {
        this._hoverScene(obj, e);
      } else {
        this._hoverObject(obj, e);
      }
    }
  }

  _dispatchToScene(scene, type, e) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child instanceof Scene) {
        const hit = this._dispatchToScene(child, type, e); // recurse
        if (hit) return true;
      } else if (
        child.interactive &&
        child.shape &&
        child._hitTest?.(e.x, e.y)
      ) {
        child.events.emit(type, e);
        return true;
      }
    }
    return false;
  }

  /**
   * Adds a GameObject to the pipeline.
   * @param {GameObject} gameObject
   * @returns {GameObject} The added game object
   */
  add(gameObject) {
    this.gameObjects = [...this.gameObjects, gameObject];
    return gameObject;
  }

  /**
   * Removes a GameObject from the pipeline.
   * @param {GameObject} gameObject
   */
  remove(gameObject) {
    this.gameObjects = this.gameObjects.filter((obj) => obj !== gameObject);
  }

  /**
   * Updates all active game objects.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.gameObjects
      .filter((obj) => obj.active)
      .forEach((obj) => obj.update(dt));
  }

  /**
   * Renders all active game objects.
   */
  render() {
    this.gameObjects.filter((obj) => obj.active).forEach((obj) => obj.render());
  }

  /**
   * Clears the pipeline.
   */
  clear() {
    this.gameObjects = [];
  }
}

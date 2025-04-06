import { GameObject } from "../go";

export class Scene extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.children = [];
    this.interactive = true;
  }

  /**
   * Add a GameObject to the Scene
   * @param {GameObject} go
   */
  add(go) {
    this.children.push(go);
    return go;
  }

  /**
   * Remove a GameObject
   */
  remove(go) {
    this.children = this.children.filter((child) => child !== go);
  }

  /**
   * Clear all GameObjects
   */
  clear() {
    this.children = [];
  }

  /**
   * Bring a GameObject to the front (top of render order)
   */
  bringToFront(go) {
    this.remove(go);
    this.children.push(go);
  }

  /**
   * Send a GameObject to the back (bottom of render order)
   */
  sendToBack(go) {
    this.remove(go);
    this.children.unshift(go);
  }

  /**
   * Delegate update to children
   */
  update(dt) {
    for (let child of this.children) {
      if (child.update) child.update(dt);
    }
  }

  /**
   * Delegate render to children
   */
  render() {
    for (let child of this.children) {
      if (child.render) child.render();
    }
  }
}

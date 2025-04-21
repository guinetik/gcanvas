import { Painter } from "../../painter/painter.js";
import { ZOrderedCollection } from "../../util/zindex.js";
import { GameObject } from "./go.js";

/**
 * Scene - A Hierarchical Container for Game Objects
 *
 * ### Conceptual Overview
 *
 * The Scene class represents a complex spatial management system that goes beyond
 * simple object containment. It serves as a specialized GameObject that:
 *
 * - Creates a local coordinate system
 * - Manages spatial relationships between game objects
 * - Provides dynamic bounds calculation
 * - Handles rendering and updating of child objects
 *
 * ### Rendering Pipeline Integration
 *
 * The Scene operates as a crucial middleware in the rendering pipeline:
 * 1. Inherits transformation capabilities from GameObject
 * 2. Applies collective transformations to child objects
 * 3. Calculates composite bounds dynamically
 *
 * @extends GameObject
 */
export class Scene extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    // Create the z-ordered collection
    this._collection = new ZOrderedCollection({
      sortByZIndex: options.sortByZIndex || true,
    });
    this._collection._owner = this;
    // Initialize dimensions and override properties
    this._width = options.width ?? 0;
    this._height = options.height ?? 0;
    this.forceWidth = null; // CRITICAL: Initialize with null
    this.forceHeight = null; // CRITICAL: Initialize with null
    // Cache for natural dimensions
    this._naturalWidth = null;
    this._naturalHeight = null;
    this.userDefinedDimensions = false;
    if (options.width != undefined && options.height != undefined) {
      this.userDefinedWidth = options.width;
      this.userDefinedHeight = options.height;
      this.userDefinedDimensions = true;
    }
  }

  // Update method - update children and recalculate natural dimensions
  update(dt) {
    this.logger.groupCollapsed(
      "Scene.update: " +
        (this.name == undefined ? this.constructor.name : this.name)
    );
    // Update all active children
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child.active && child.update) {
        child.update(dt);
      }
    }
    super.update(dt);
    this.logger.groupEnd();
  }

  // Add a GameObject to the scene and invalidate dimensions
  add(go) {
    if (go == null || go == undefined) {
      throw new Error("GameObject is null or undefined");
    }
    if (go.parent != null) {
      console.warn(
        "This GameObject already has a parent. Consider removing it first."
      );
    }
    go.parent = this;
    this._collection.add(go);
    this.markBoundsDirty();
    // if the game object has an init method, call it
    if (go.init) {
      go.init();
    }
    return go;
  }

  markBoundsDirty() {
    super.markBoundsDirty();
    // Dirty the children's bounds
    this.children.forEach((child) => {
      child.markBoundsDirty();
    });
  }

  /**
   * Removes a GameObject from the Scene
   *
   * ### Removal Strategy
   *
   * #### Why Use Filter?
   * - Creates a new array (immutable approach)
   * - Ensures no direct mutation of the children array
   *
   * #### Parent Reference Clearing
   * - Breaks the parent-child relationship
   * - Allows the object to be re-parented elsewhere
   *
   * @param {GameObject} go - Game object to remove
   */
  remove(go) {
    const result = this._collection.remove(go);
    if (result) {
      go.parent = null;
      this.markBoundsDirty();
    }
    return result;
  }

  draw() {
    super.draw();
    this.logger.log("Scene.draw chilren:");
    this._collection
      .getSortedChildren()
      .filter((obj) => obj.visible)
      .map(function (obj) {
        Painter.save();
        obj.render();
        Painter.restore();
        return obj;
      });
  }

  getDebugBounds() {
    // For Scenes, always return the full size centered around x,y
    return {
      width: this.width,
      height: this.height,
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
    };
  }

  bringToFront(go) {
    return this._collection.bringToFront(go);
  }

  sendToBack(go) {
    return this._collection.sendToBack(go);
  }

  bringForward(go) {
    return this._collection.bringForward(go);
  }

  sendBackward(go) {
    return this._collection.sendBackward(go);
  }

  clear() {
    this._collection.children.forEach((go) => this.remove(go));
    return this._collection.clear();
  }

  // Getter to access children
  get children() {
    return this._collection.children;
  }
}

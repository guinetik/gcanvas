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

  /**
   * Returns debug bounds in local space.
   * Used for debug drawing after transforms have been applied.
   *
   * With the origin-based coordinate system (v3.0):
   * - Debug bounds start at (0, 0) in local space
   * - This matches the shape drawing coordinate system
   *
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getDebugBounds() {
    // Return bounds offset based on origin (same as shapes use for drawing)
    // For center origin: bounds from (-w/2, -h/2) to (w/2, h/2)
    // For top-left origin: bounds from (0, 0) to (w, h)
    const offsetX = -this.width * this.originX;
    const offsetY = -this.height * this.originY;
    
    return {
      x: offsetX,
      y: offsetY,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Returns the scene's bounding box.
   * Required for hit testing when the scene is interactive.
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this._width || 0,
      height: this._height || 0,
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

  /**
   * Returns additional offset to apply during hit testing.
   * Override in subclasses (e.g., LayoutScene) to account for scroll offset.
   * @returns {{x: number, y: number}} Additional offset for hit test coordinate transform
   */
  getHitTestOffset() {
    return { x: 0, y: 0 };
  }

  /**
   * Checks if a child should be hittable (receive input events).
   * Override in subclasses (e.g., LayoutScene) to implement viewport culling.
   * @param {GameObject} child - The child to check
   * @returns {boolean} True if child should be hittable
   */
  isChildHittable(child) {
    return true;
  }
}

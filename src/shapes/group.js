import { Painter } from "../painter/painter";
import { Transformable } from "./transformable";
import { ZOrderedCollection } from "../util";
/**
 * Group - A powerful container for composing and manipulating multiple transformable objects
 * 
 * ### Core Capabilities
 * 
 * - Aggregate multiple transformable objects into a single unit
 * - Efficient bounding box calculation with memoization
 * - Performant object management 
 * - Property inheritance from group to children
 *
 * ### Rendering Behavior
 * 
 * - Applies group's transformations to all children 
 * - Renders children in order of addition
 * - Supports both Shape and GameObject hierarchies
 *
 * @extends Transformable
 */
export class Group extends Transformable {
  /**
   * Creates a new Group instance
   * 
   * @param {Object} [options={}] - Additional rendering options
   * @param {boolean} [options.inheritOpacity=true] - Whether opacity should cascade to children 
   * @param {boolean} [options.inheritVisible=true] - Whether visibility should cascade to children
   * @param {boolean} [options.inheritScale=false] - Whether scale should cascade to children
   */
  constructor(options = {}) {
    // Call parent constructor with all options
    super(options);

    // Create the z-ordered collection
    this._collection = new ZOrderedCollection({
      sortByZIndex: options.sortByZIndex || true
    });
    this._collection._owner = this; // Give collection a reference to its owner

    // Initialize state tracking
    this._childrenVersion = 0;
    this._cachedBounds = null;

    options.width = Math.max(0, options.width || 0);
    options.height = Math.max(0, options.height || 0);

    // Track if dimensions were explicitly set in constructor
    this.userDefinedWidth = options.width;
    this.userDefinedHeight = options.height;

    // Only consider dimensions as user-defined if they were explicitly provided in options
    this.userDefinedDimensions = options.width !== undefined && options.height !== undefined &&
      (options.width > 0 || options.height > 0);
  }


  /**
   * Add object to group with type checking
   * @param {Transformable} object - Object to add
   * @returns {Transformable} The added object
   */
  add(object) {
    if (object == null || object == undefined) {
      throw new Error("Object is null or undefined");
    }
    if (!(object instanceof Transformable)) {
      throw new TypeError("Group can only add Transformable instances");
    }
    object.parent = this;
    this._collection.add(object);
    this._childrenVersion++;
    this.markBoundsDirty();
    this.invalidateCache();
    return object;
  }

  /**
   * Remove object from group
   * @param {Transformable} object - Object to remove
   * @returns {boolean} Whether object was removed
   */
  remove(object) {
    const result = this._collection.remove(object);
    if (result) {
      object.parent = null;
      this._childrenVersion++;
      this.markBoundsDirty();
      this.invalidateCache();
    }
    return result;
  }

  /**
   * Clear all objects from group
   */
  clear() {
    this._collection.clear();
    this._childrenVersion++;
    this.markBoundsDirty();
    this.invalidateCache();
  }

  // Z-ordering methods
  bringToFront(object) {
    return this._collection.bringToFront(object);
  }

  sendToBack(object) {
    return this._collection.sendToBack(object);
  }

  bringForward(object) {
    return this._collection.bringForward(object);
  }

  sendBackward(object) {
    return this._collection.sendBackward(object);
  }

  /**
   * Render group and all children.
   * Transformations are already applied by super.draw().
   */
  draw() {
    super.draw();
    this.logger.log("Group.draw children:", this.children.length);
    this._renderChildren();
  }

  /**
   * Render children normally (non-cached path)
   * @private
   */
  _renderChildren() {
    const sortedChildren = this._collection.getSortedChildren();
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      if (child.visible) {
        Painter.save();
        child.render();
        Painter.restore();
      }
    }
  }

  /**
   * Get the content bounds for caching.
   * Returns the min/max coordinates of all children accounting for their origins.
   * @private
   * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
   */
  _getContentBounds() {
    if (!this.children?.length) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      // Calculate the child's bounding box edges based on its origin
      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Override _renderToCache to properly handle children with negative positions.
   * This translates content into positive cache canvas space and stores the offset.
   * @param {number} width - Cache canvas width
   * @param {number} height - Cache canvas height
   * @protected
   */
  _renderToCache(width, height) {
    const cacheCtx = this._cacheCanvas.getContext("2d");
    cacheCtx.clearRect(0, 0, width, height);

    // Get actual content bounds
    const bounds = this._getContentBounds();
    
    // Calculate offset to shift negative content into positive space
    // This ensures all content renders within the cache canvas
    const offsetX = -bounds.minX + this._cachePadding;
    const offsetY = -bounds.minY + this._cachePadding;
    
    // Store the offset for use when blitting
    // The offset positions the cache canvas so the Group's origin aligns correctly
    this._cacheOffsetX = bounds.minX;
    this._cacheOffsetY = bounds.minY;

    // Swap to cache context
    const mainCtx = Painter.ctx;
    Painter.ctx = cacheCtx;

    // Signal that we're caching (skip transforms in applyTransforms)
    this._isCaching = true;

    cacheCtx.save();
    // Translate so all content is in positive space
    cacheCtx.translate(offsetX, offsetY);

    // Render children directly (skip Group's own transforms since we're caching)
    this._renderChildren();

    cacheCtx.restore();

    this._isCaching = false;

    // Restore main context
    Painter.ctx = mainCtx;
  }

  /**
   * Update all children with active update methods
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.logger.groupCollapsed("Group.update");
    const sortedChildren = this._collection.getSortedChildren();

    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      if (child.active && typeof child.update === 'function') {
        child.update(dt);
      }
    }
    super.update(dt);
    this.logger.groupEnd();
  }

  /**
   * Get group's children array
   * @returns {Array} Children array
   */
  get children() {
    // Check if the collection exists and if it doesn't, return an empty array
    return this._collection?.children || [];
  }

  /**
   * Override width getter
   * @returns {number} Width
   */
  get width() {
    if (this.userDefinedDimensions) {
      return this._width;
    }
    return this.getBounds().width;
  }

  /**
   * Override width setter
   * @param {number} v - New width
   */
  set width(v) {
    const max = Math.max(0, v);
    this._width = max;
    this.userDefinedWidth = max;
    this.userDefinedDimensions = (this.userDefinedWidth > 0 || this.userDefinedHeight > 0) &&
      this.userDefinedWidth !== undefined && this.userDefinedHeight !== undefined;
    this.markBoundsDirty();
  }

  /**
   * Override height getter
   * @returns {number} Height
   */
  get height() {
    if (this.userDefinedDimensions) {
      return this._height;
    }
    return this.getBounds().height;
  }

  /**
   * Override height setter
   * @param {number} v - New height
   */
  set height(v) {
    const max = Math.max(0, v);
    this._height = max;
    this.userDefinedHeight = max;
    this.userDefinedDimensions = (this.userDefinedWidth > 0 || this.userDefinedHeight > 0) &&
      this.userDefinedWidth !== undefined && this.userDefinedHeight !== undefined;
    this.markBoundsDirty();
  }


  /**
   * Override calculateBounds to compute from children.
   * 
   * With the origin-based coordinate system (v3.0):
   * - Each child's position (x, y) represents its origin point
   * - The child's origin (originX, originY) determines where that point is on the child
   * - We calculate each child's bounding box accounting for its origin
   * 
   * @returns {Object} Bounds object
   */
  calculateBounds() {
    // If explicitly sized, use those dimensions
    if (this.userDefinedDimensions) {
      return {
        x: this.x,
        y: this.y,
        width: this._width,
        height: this._height
      };
    }

    // No children = empty bounds
    if (!this.children?.length) {
      return {
        x: this.x,
        y: this.y,
        width: 0,
        height: 0
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Calculate bounds from all children
    for (const child of this.children) {
      // Get the child's position and dimensions
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      
      // Get child's origin (default to top-left if not defined)
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      // Calculate the child's bounding box edges based on its origin
      // For origin (0, 0) = top-left: left = x, right = x + width
      // For origin (0.5, 0.5) = center: left = x - width/2, right = x + width/2
      // For origin (1, 1) = bottom-right: left = x - width, right = x
      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      // Update min/max coordinates
      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    // Calculate dimensions
    const width = maxX - minX;
    const height = maxY - minY;

    // Return bounds at group position
    return {
      x: this.x,
      y: this.y,
      width: width,
      height: height
    };
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
    // If explicitly sized, use origin-based offset
    if (this.userDefinedDimensions) {
      const offsetX = -this._width * this.originX || 0;
      const offsetY = -this._height * this.originY || 0;
      return {
        x: offsetX,
        y: offsetY,
        width: this._width,
        height: this._height,
      };
    }

    // Calculate actual bounds from children
    if (!this.children?.length) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    // Return bounds at actual content position (not origin-adjusted)
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  // ============================================================
  // Group-wide Transform Operations
  // ============================================================

  /**
   * Applies a transform callback to each child in the group.
   * Useful for batch operations on all children.
   *
   * @param {function(import('./transform.js').Transform, import('./transformable.js').Transformable, number): void} callback
   *   Callback receiving (transform, child, index)
   * @returns {Group} this for chaining
   *
   * @example
   * // Scale all children by 0.5
   * group.forEachTransform((t) => t.scale(0.5));
   *
   * // Rotate each child differently
   * group.forEachTransform((t, child, i) => t.rotation(i * 15));
   */
  forEachTransform(callback) {
    this.children.forEach((child, index) => {
      if (child.transform) {
        callback(child.transform, child, index);
      }
    });
    return this;
  }

  /**
   * Translates all children by the given offset.
   * This moves children relative to their current positions,
   * not the group itself.
   *
   * @param {number} dx - Delta X
   * @param {number} dy - Delta Y
   * @returns {Group} this for chaining
   */
  translateChildren(dx, dy) {
    return this.forEachTransform((t) => t.translateBy(dx, dy));
  }

  /**
   * Scales all children by the given factor.
   *
   * @param {number} factor - Scale factor (1 = no change)
   * @returns {Group} this for chaining
   */
  scaleChildren(factor) {
    return this.forEachTransform((t) => t.scaleBy(factor));
  }

  /**
   * Rotates all children by the given amount.
   *
   * @param {number} degrees - Rotation amount in degrees
   * @returns {Group} this for chaining
   */
  rotateChildren(degrees) {
    return this.forEachTransform((t) => t.rotateBy(degrees));
  }

  /**
   * Resets transforms on all children to default values.
   *
   * @returns {Group} this for chaining
   */
  resetChildTransforms() {
    return this.forEachTransform((t) => t.reset());
  }
}
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
   * Render group and all children with transformations
   */
  draw() {
    super.draw();
    this.logger.log("Group.draw chilren:", this.children.length);
    
    // Get sorted children
    const sortedChildren = this._collection.getSortedChildren();

    // For each child, completely isolate its rendering context
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
   * Override calculateBounds to compute from children
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
      const childWidth = child.width;
      const childHeight = child.height;
      
      // Calculate the child's bounding box edges
      const childLeft = childX - childWidth / 2;
      const childRight = childX + childWidth / 2;
      const childTop = childY - childHeight / 2;
      const childBottom = childY + childHeight / 2;
      
      // Update min/max coordinates
      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    // Calculate dimensions
    const width = maxX - minX;
    const height = maxY - minY;

    // Return bounds centered on group position
    return {
      x: this.x,
      y: this.y,
      width: width,
      height: height
    };
  }

  getDebugBounds() {
    const bounds = this.calculateBounds();
    
    // Calculate the actual left-top coordinates from the children
    let minX = Infinity;
    let minY = Infinity;
    
    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width;
      const childHeight = child.height;
      
      const childLeft = childX - childWidth / 2;
      const childTop = childY - childHeight / 2;
      
      minX = Math.min(minX, childLeft);
      minY = Math.min(minY, childTop);
    }
    
    // If no children, use the group's position
    if (!this.children?.length) {
      minX = this.x - bounds.width / 2;
      minY = this.y - bounds.height / 2;
    }
    
    return {
      width: bounds.width,
      height: bounds.height,
      x: minX,
      y: minY,
    };
  }
}
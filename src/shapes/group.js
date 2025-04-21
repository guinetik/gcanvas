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
 * - Performant object management with z-ordering
 * - Property inheritance from group to children
 *
 * ### Rendering Behavior
 *
 * - Applies group's transformations to all children
 * - Renders children in order of z-index
 * - Supports both Shape and GameObject hierarchies
 *
 * ### Performance Considerations
 *
 * - Lazy bounding box calculation
 * - Z-index based rendering
 * - Efficient child tracking
 *
 * @extends Transformable
 */
export class Group extends Transformable {
  /**
   * Creates a new Group instance
   *
   * @param {Object} [options={}] - Additional rendering options
   * @param {boolean} [options.sortByZIndex=true] - Whether to sort children by z-index
   * @param {number} [options.width] - Optional explicit width
   * @param {number} [options.height] - Optional explicit height
   */
  constructor(options = {}) {
    // Call parent constructor with all options
    super(options);

    // Create the z-ordered collection for children
    this._collection = new ZOrderedCollection({
      sortByZIndex: options.sortByZIndex !== false
    });
    this._collection._owner = this; // Give collection a reference to its owner

    // Store explicit dimensions if provided in constructor
    if (options.width !== undefined) {
      this._explicitWidth = options.width;
    }

    if (options.height !== undefined) {
      this._explicitHeight = options.height;
    }
  }

  /**
   * Adds an object to the group with type and duplicate checking
   *
   * @param {Transformable} object - Object to add
   * @throws {TypeError} If argument is not a Transformable
   * @throws {Error} If object is already in the group
   * @returns {Transformable} The added object for chaining
   */
  add(object) {
    if (object == null || object == undefined) {
      throw new Error("Object is null or undefined");
    }
    // Type checking
    if (!(object instanceof Transformable)) {
      throw new TypeError("Group can only add Transformable instances");
    }

    return this._collection.add(object);
  }

  /**
   * Removes an object from the group
   *
   * @param {Transformable} object - Object to remove
   * @returns {boolean} Whether the object was successfully removed
   */
  remove(object) {
    const result = this._collection.remove(object);
    if (result) {
      this.markBoundsDirty();
    }
    return result;
  }

  /**
   * Removes all objects from the group
   */
  clear() {
    this._collection.clear();
    this.markBoundsDirty();
  }

  /**
   * Brings an object to the front of the group
   * @param {Transformable} object - Object to bring to front
   */
  bringToFront(object) {
    this._collection.bringToFront(object);
  }

  /**
   * Sends an object to the back of the group
   * @param {Transformable} object - Object to send to back
   */
  sendToBack(object) {
    this._collection.sendToBack(object);
  }

  /**
   * Moves an object forward in the group's order
   * @param {Transformable} object - Object to move forward
   */
  bringForward(object) {
    this._collection.bringForward(object);
  }

  /**
   * Moves an object backward in the group's order
   * @param {Transformable} object - Object to move backward
   */
  sendBackward(object) {
    this._collection.sendBackward(object);
  }

  /**
   * Group.render() - Renders the group and its children
   * Ensures proper transformation hierarchy
   */
  draw() {
    super.draw();
    this.logger.log("Group.draw children:", this.children.length);
    
    // Get sorted children
    const sortedChildren = this._collection.getSortedChildren();
    
    // For each child, completely isolate its rendering context
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      if (child.visible) {
        // Save the entire canvas state
        Painter.save();
        // Render the child in isolation
        child.render();
        // Restore the entire canvas state
        Painter.restore();
      }
    }
  }

  /**
   * Updates all children with an update method
   *
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.logger.groupCollapsed("Group.update");
    
    // Get sorted children
    const sortedChildren = this._collection.getSortedChildren();
    
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      if (child.active && typeof child.update === "function") {
        child.update(dt);
      }
    }
    super.update(dt);
    this.logger.groupEnd();
  }

  /**
   * Getter for children that uses the z-ordered collection
   * @returns {Array} Children in the group
   */
  get children() {
    return this._collection?.children;
  }

  _calculateChildrenBounds() {
    // If no children, return default bounds
    if (this.children.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: this._explicitWidth || 0,
        height: this._explicitHeight || 0,
      };
    }
  
    // Initialize extremes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
  
    // Track all corners of all child bounding boxes
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
  
      // Calculate the absolute corner coordinates of the child
      const childHalfWidth = child.width / 2;
      const childHalfHeight = child.height / 2;
  
      // Calculate child corners in absolute coordinates
      const corners = [
        { x: child.x - childHalfWidth, y: child.y - childHalfHeight }, // Top-left
        { x: child.x + childHalfWidth, y: child.y - childHalfHeight }, // Top-right
        { x: child.x + childHalfWidth, y: child.y + childHalfHeight }, // Bottom-right
        { x: child.x - childHalfWidth, y: child.y + childHalfHeight }, // Bottom-left
      ];
  
      // Apply child rotation and scale if needed
      if (child.rotation !== 0 || child.scaleX !== 1 || child.scaleY !== 1) {
        const cos = Math.cos(child.rotation);
        const sin = Math.sin(child.rotation);
  
        for (let j = 0; j < corners.length; j++) {
          // Apply scale
          const cornerX = (corners[j].x - child.x) * child.scaleX + child.x;
          const cornerY = (corners[j].y - child.y) * child.scaleY + child.y;
  
          // Apply rotation around child center
          const dx = cornerX - child.x;
          const dy = cornerY - child.y;
  
          corners[j].x = child.x + dx * cos - dy * sin;
          corners[j].y = child.y + dx * sin + dy * cos;
        }
      }
  
      // Find min/max for this child
      for (const corner of corners) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      }
    }
  
    // Calculate width and height
    const width = maxX - minX;
    const height = maxY - minY;
  
    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
    };
  }
  
  calculateBounds() {
    // If no children, return default bounds
    if (this.children.length === 0) {
      return {
        x: this.x,
        y: this.y,
        width: 0,
        height: 0,
      };
    }
  
    // Get children bounds
    const childBounds = this._calculateChildrenBounds();
  
    // Use explicitly set dimensions if available, otherwise use calculated dimensions
    const width = this._explicitWidth !== undefined 
      ? this._explicitWidth 
      : childBounds.width;
    
    const height = this._explicitHeight !== undefined 
      ? this._explicitHeight 
      : childBounds.height;
  
    return {
      x: childBounds.minX + width / 2,
      y: childBounds.minY + height / 2,
      width,
      height,
    };
  }
  
  getDebugBounds() {
    // If no children, return default bounds
    if (this.children.length === 0) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }
  
    // Get children bounds
    const childBounds = this._calculateChildrenBounds();
  
    return {
      x: childBounds.minX,
      y: childBounds.minY,
      width: childBounds.width,
      height: childBounds.height,
    };
  }

  /**
   * Override getBounds() to respect manually set dimensions while still considering children
   * @override
   * @returns {Object} Bounds with x, y, width, and height
   */
  getBounds() {
    // Calculate bounds based on children
    const childBounds = this.calculateBounds();

    // Use explicitly set dimensions if available, otherwise use calculated dimensions
    const bounds = {
      x: this.x,
      y: this.y,
      width:
        this._explicitWidth !== undefined
          ? this._explicitWidth
          : childBounds.width,
      height:
        this._explicitHeight !== undefined
          ? this._explicitHeight
          : childBounds.height,
    };

    return bounds;
  }

  /**
   * Override width setter to store explicit width
   * @type {number}
   */
  get width() {
    // If we have an explicit width, return that
    if (this._explicitWidth !== undefined) {
      return this._explicitWidth;
    }

    // Otherwise, calculate from children
    if (this.children && this.children.length > 0) {
      const bounds = this.calculateBounds();
      return bounds.width;
    }

    // Default if no children and no explicit width
    return this._width;
  }

  set width(v) {
    this.validateProp(v, "width");
    this._explicitWidth = Math.max(0, v);
    this._width = this._explicitWidth; // Keep the base property in sync
    this.markBoundsDirty();
  }

  /**
   * Override height setter to store explicit height
   * @type {number}
   */
  get height() {
    // If we have an explicit height, return that
    if (this._explicitHeight !== undefined) {
      return this._explicitHeight;
    }

    // Otherwise, calculate from children
    if (this.children && this.children.length > 0) {
      const bounds = this.calculateBounds();
      return bounds.height;
    }

    // Default if no children and no explicit height
    return this._height;
  }

  set height(v) {
    this.validateProp(v, "height");
    this._explicitHeight = Math.max(0, v);
    this._height = this._explicitHeight; // Keep the base property in sync
    this.markBoundsDirty();
  }
}
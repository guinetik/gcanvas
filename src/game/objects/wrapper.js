import { applyAnchor } from "../../mixins";
import { GameObject } from "./go";

/**
 * ShapeGOFactory
 * --------------
 *
 * Utility factory for creating GameObjects from Shapes.
 */
export class ShapeGOFactory {
  /**
   * Creates a GameObject wrapper around a Shape
   * 
   * @param {Game} game - Game instance
   * @param {Shape} shape - Shape to wrap
   * @param {Object} opts - Additional options
   * @returns {GameObjectShapeWrapper} - The created wrapper
   */
  static create(game, shape, opts = {}) {
    // Create wrapper with combined options
    const combinedOpts = {
      // Default position & size from shape
      x: shape?.x ?? 0,
      y: shape?.y ?? 0,
      width: shape?.width ?? 0,
      height: shape?.height ?? 0,
      rotation: shape?.rotation ?? 0,
      scaleX: shape?.scaleX ?? 1,
      scaleY: shape?.scaleY ?? 1,
      opacity: shape?.opacity ?? 1,
      visible: shape?.visible ?? true,
      active: true,
      debug: shape?.debug ?? false,
      
      // Origin from shape
      originX: shape?.originX,
      originY: shape?.originY,
      
      // Shape-specific properties
      color: shape?.color ?? null,
      stroke: shape?.stroke ?? null,
      lineWidth: shape?.lineWidth ?? 1,
      lineJoin: shape?.lineJoin ?? "miter",
      lineCap: shape?.lineCap ?? "butt",
      miterLimit: shape?.miterLimit ?? 10,
      
      // Override with any user-provided options
      ...opts,
      
      // Default name from shape class
      name: opts.name ?? shape?.constructor.name ?? "ShapeWrapper",
    };

    return new GameObjectShapeWrapper(game, shape, combinedOpts);
  }
}

/**
 * GameObjectShapeWrapper
 * ----------------------
 *
 * A specialized GameObject that wraps a Shape.
 *
 * @extends GameObject
 */
export class GameObjectShapeWrapper extends GameObject {
  /**
   * Creates a GameObject wrapper around a Shape instance
   * 
   * @param {Game} game - The game instance
   * @param {Shape} shape - The shape to wrap
   * @param {Object} options - Configuration options
   */
  constructor(game, shape, options = {}) {
    // Extract anchor-related options for positioning (different from shape anchor)
    const { 
      anchor, 
      anchorMargin, 
      anchorOffsetX, 
      anchorOffsetY, 
      anchorRelative,
      ...goOptions 
    } = options;

    super(game, goOptions);

    // Validate shape
    if (!shape || shape == null || shape == undefined) {
      throw new Error("GameObjectShapeWrapper requires a shape");
    }

    // Store the shape
    this.shape = shape;
    
    // Apply anchor positioning if specified
    if (anchor) {
      applyAnchor(this, { 
        anchor, 
        anchorMargin, 
        anchorOffsetX, 
        anchorOffsetY, 
        anchorRelative 
      });
    }
    
    // Apply Shape-specific properties directly to the shape
    if (options.color !== undefined) shape.color = options.color;
    if (options.stroke !== undefined) shape.stroke = options.stroke;
    if (options.lineWidth !== undefined) shape.lineWidth = options.lineWidth;
    if (options.lineJoin !== undefined) shape.lineJoin = options.lineJoin;
    if (options.lineCap !== undefined) shape.lineCap = options.lineCap;
    if (options.miterLimit !== undefined) shape.miterLimit = options.miterLimit;
    
    // Apply standard properties
    this.syncPropertiesToShape();

    this.logger.log(`Created GameObject(${this.constructor.name}):`, {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.color,
      stroke: this.stroke
    });
  }

  /**
   * Synchronizes common properties from wrapper to shape
   */
  syncPropertiesToShape() {
    if (!this.shape) return;
  
    // Common transformable properties
    const propsToSync = [
      'width', 'height', 'rotation', 'scaleX', 'scaleY', 
      'visible', 'debug', 'debugColor'
    ];
    
    // Sync each property from this wrapper to the shape
    for (const prop of propsToSync) {
      if (prop in this && prop in this.shape) {
        if (this[prop] !== this.shape[prop]) {
          this.shape[prop] = this[prop];
        }
      }
    }
  }
  
  // Shape-specific property getters and setters
  
  /**
   * Fill color for the shape
   * @type {string|null}
   */
  get color() {
    return this.shape ? this.shape.color : null;
  }
  
  set color(value) {
    if (this.shape) {
      this.shape.color = value;
    }
  }
  
  /**
   * Stroke color for the shape
   * @type {string|null}
   */
  get stroke() {
    return this.shape ? this.shape.stroke : null;
  }
  
  set stroke(value) {
    if (this.shape) {
      this.shape.stroke = value;
    }
  }
  
  /**
   * Line width for the shape's stroke
   * @type {number}
   */
  get lineWidth() {
    return this.shape ? this.shape.lineWidth : 1;
  }
  
  set lineWidth(value) {
    if (this.shape) {
      this.shape.lineWidth = value;
    }
  }
  
  /**
   * Line join style ("miter", "round", "bevel")
   * @type {string}
   */
  get lineJoin() {
    return this.shape ? this.shape.lineJoin : "miter";
  }
  
  set lineJoin(value) {
    if (this.shape) {
      this.shape.lineJoin = value;
    }
  }
  
  /**
   * Line cap style ("butt", "round", "square")
   * @type {string}
   */
  get lineCap() {
    return this.shape ? this.shape.lineCap : "butt";
  }
  
  set lineCap(value) {
    if (this.shape) {
      this.shape.lineCap = value;
    }
  }
  
  /**
   * Miter limit for line joins
   * @type {number}
   */
  get miterLimit() {
    return this.shape ? this.shape.miterLimit : 10;
  }
  
  set miterLimit(value) {
    if (this.shape) {
      this.shape.miterLimit = value;
    }
  }
  
  /**
   * Update method called each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this.active) return;
    this.onUpdate?.(dt);
    // Check if bounds need to be recalculated
    if (this._boundsDirty || this.tweening) {
      this.syncPropertiesToShape();
      this._boundsDirty = false;
    }
    super.update(dt);
  }

  /**
   * Draw method to render the shape
   *
   * IMPORTANT: Call shape.draw() NOT shape.render()!
   * The wrapper's render() has already translated to (this.x, this.y).
   * Calling shape.render() would call Painter.translateTo(shape.x, shape.y)
   * which OVERWRITES (not adds to) the current translation.
   * By calling shape.draw() directly, we render at the wrapper's position.
   */
  draw() {
    super.draw();
    this.shape.draw();
  }
}

/********************
 * GameObject.js
 *
 * The base class for all objects that participate in the game's update/render loop.
 * It provides basic position, size, rotation, scale, and optional interactivity.
 * Extend this class to create your own game objects with custom behavior and rendering.
 ********************/
import { EventEmitter } from "../io";
import { applyAnchor } from "../mixins/anchor";
/**
 * Represents a basic game entity with position, size, rotation, scale, and optional interactivity.
 * Extend this to create custom objects with behavior and rendering logic.
 */
export class GameObject {
  /**
   * Create a GameObject.
   * @param {Game} game - A reference to the main Game instance.
   * @param {object} [options] - Optional configuration for position, size, rotation, etc.
   * @param {number} [options.x=0] - Initial x-position of the GameObject.
   * @param {number} [options.y=0] - Initial y-position of the GameObject.
   * @param {number} [options.width=0] - Width of the GameObject. Used for bounding box or anchor calculations.
   * @param {number} [options.height=0] - Height of the GameObject. Used for bounding box or anchor calculations.
   * @param {number} [options.rotation=0] - Rotation in radians.
   * @param {number} [options.scale=1] - Uniform scale factor.
   * @param {string} [options.anchor] - Optional anchor setting (e.g. "top-left", "bottom-right", etc.).
   * @param {number} [options.padding=10] - Optional padding for anchored objects.
   */
  constructor(game, options = {}) {
    /**
     * Reference to the main Game instance managing this object.
     * @type {Game}
     */
    this.game = game;

    /**
     * Reference to the 2D rendering context.
     * @type {CanvasRenderingContext2D}
     */
    this.ctx = game.ctx;

    /**
     * Determines whether this object is active in the pipeline.
     * When set to false, update() and render() calls are skipped.
     * @type {boolean}
     */
    this.active = true;

    /**
     * Internal event emitter for distributing events (e.g. mouseover, inputdown).
     * @type {EventEmitter}
     */
    this.events = new EventEmitter();

    /**
     * Indicates whether this object should handle pointer events (hit-testing, etc.).
     * @type {boolean}
     */
    this.interactive = false;

    /**
     * X-coordinate of the object’s center.
     * @type {number}
     */
    this.x = options.x ?? 0;

    /**
     * Y-coordinate of the object’s center.
     * @type {number}
     */
    this.y = options.y ?? 0;

    /**
     * Width of the object, used for bounding checks or positioning.
     * @type {number}
     */
    this.width = options.width ?? 0;

    /**
     * Height of the object, used for bounding checks or positioning.
     * @type {number}
     */
    this.height = options.height ?? 0;

    /**
     * Rotation in radians.
     * @type {number}
     */
    this.rotation = options.rotation ?? 0;

    /**
     * Uniform scale factor.
     * @type {number}
     */
    this.scale = options.scale ?? 1;

    // Applies an anchor if specified in options (e.g., top-left, bottom-right).
    applyAnchor(this, options);
  }

  /**
   * Enable interactivity for this GameObject, providing a shape for hit-testing.
   * @param {Shape} shape - The visual shape used for hit-testing pointer events.
   */
  enableInteractivity(shape) {
    this.interactive = true;

    /**
     * A shape instance used for pointer hit-testing.
     * @type {Shape}
     */
    this.shape = shape;

    /**
     * Tracks whether the pointer is currently hovering over this object.
     * @type {boolean}
     * @private
     */
    this._hovered = false;
  }

  /**
   * Checks whether the given (x, y) point hits this object's shape.
   * Used internally by the pipeline to dispatch pointer events.
   * @param {number} x - X-coordinate of the pointer.
   * @param {number} y - Y-coordinate of the pointer.
   * @returns {boolean} True if the shape is hit, false otherwise.
   * @private
   */
  _hitTest(x, y) {
    const bounds = this.shape?.getBounds?.() ?? this.getBounds?.();
    if (!bounds) return false;
  
    const { x: cx, y: cy, width, height } = bounds;
    const halfW = width / 2;
    const halfH = height / 2;
  
    return (
      x >= cx - halfW && x <= cx + halfW &&
      y >= cy - halfH && y <= cy + halfH
    );
  }
  

  /**
   * Listen for events on this object (e.g., "mouseover", "mouseout", "inputdown", "inputup").
   * @param {string} event - The event name.
   * @param {Function} callback - The callback to invoke when the event occurs.
   */
  on(event, callback) {
    this.events.on(event, callback);
  }

  /**
   * Stop listening for events on this object.
   * @param {string} event - The event name.
   * @param {Function} callback - The callback previously registered.
   */
  off(event, callback) {
    this.events.off(event, callback);
  }

  /**
   * Called every frame by the pipeline. Override in subclasses to implement custom behavior.
   * @param {number} dt - Delta time in seconds since the last frame.
   */
  update(dt) {
    // Intended to be overridden by subclass.
  }

  /**
   * Called every frame by the pipeline after update(). Override to handle custom drawing.
   */
  render() {
    // Intended to be overridden by subclass.
  }
}

/************************************************
 * ShapeGOFactory.js
 *
 * A utility factory that wraps a Shape instance 
 * in a minimal GameObject so it can be added to 
 * the game’s pipeline. This allows shapes to be 
 * managed, updated, and rendered like any other 
 * GameObject in the system.
 ************************************************/
/**
 * ShapeGOFactory - Produces a simple GameObject wrapper around a Shape.
 * This is useful if you want to add a Shape to the Game's pipeline but you
 * don’t need extensive custom behavior other than basic positioning and
 * drawing.
 */
export class ShapeGOFactory {
  /**
   * Create a new GameObject that manages a Shape’s position and rendering.
   * @param {Game} game - The main Game instance.
   * @param {Shape} shape - The shape to wrap as a GameObject.
   * @returns {GameObject} A new GameObject subclass instance containing the provided shape.
   */
  static create(game, shape) {
    // Extract relevant positional options from the Shape
    const options = {
      x: shape?.x ?? 0,
      y: shape?.y ?? 0,
      width: shape?.width ?? 0,
      height: shape?.height ?? 0,
    };

    // Return a dynamically created subclass of GameObject
    return new (class extends GameObject {
      constructor() {
        super(game, options);

        /**
         * The Shape being wrapped by this GameObject.
         * @type {Shape}
         */
        this.shape = shape;
      }

      /**
       * Keep the Shape’s position, width, and height in sync with the GameObject.
       * @param {number} dt - Delta time in seconds since the last frame.
       */
      update(dt) {
        //console.log("ShapeGOFactory.update", this);
        if (this.shape) {
          this.shape.x = this.x;
          this.shape.y = this.y;
          this.shape.width = this.width;
          this.shape.height = this.height;
        }
      }

      /**
       * Render the Shape if it exists.
       */
      render() {
        if (this.shape) {
          this.shape.draw();
        }
      }
    })();
  }
}

/********************
 * GameObject.js
 *
 * The base class for all objects that participate in the game's update/render loop.
 * It provides basic position, size, rotation, scale, and optional interactivity.
 * Extend this class to create your own game objects with custom behavior and rendering.
 ********************/
import { EventEmitter } from "../io";
import { applyAnchor } from "../mixins/anchor";
import { Transformable, Shape } from "../shapes";
import { Game } from "./game.js";
/**
 * Represents a basic game entity with position, size, rotation, scale, etc.
 * Extends Transformable so it has standardized props (x, y, width, height...).
 */
export class GameObject extends Transformable {
  /**
   * @param {Game} game - A reference to the main Game instance.
   * @param {TransformOptions & {
   *   anchor?: string,
   *   padding?: number
   * }} [options={}] - The usual transform props plus anchor/padding.
   */
  constructor(game, options = {}) {
    super(options); // from Transformable
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
     * If false, update() and render() calls are skipped.
     * @type {boolean}
     */
    this.active = true;
    /**
     * Internal event emitter for distributing events (e.g. mouseover, inputdown).
     * @type {EventEmitter}
     */
    this.events = new EventEmitter();
    /**
     * Whether this GameObject can handle pointer events (hit-testing).
     * @type {boolean}
     */
    this.interactive = false;
    /**
     * The parent GameObject, generally another GameObject that added this to the pipeline.
     */
    this.parent = null; // Parent GameObject, if any
    // If user set anchor in options, apply it
    applyAnchor(this, options);
  }

  /**
   * Enable interactivity for this GameObject, providing a shape for hit-testing.
   *
   * @param {Shape} shape - The visual shape used for pointer collisions.
   */
  enableInteractivity(shape) {
    this.interactive = true;
    this.shape = shape;
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
      x >= cx - halfW && x <= cx + halfW && y >= cy - halfH && y <= cy + halfH
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
   * Called each frame by the pipeline. Override in subclasses.
   * @param {number} dt - Delta time in seconds since last frame.
   */
  update(dt) {
    // ...
  }

  /**
   * Called each frame by the pipeline after update(). Override in subclasses.
   * Typically you'd respect this.visible / this.opacity here if you do custom rendering.
   */
  render() {
    // ...
  }

  /**
   * Default bounding box for hit-testing if you don't supply shape.getBounds().
   *
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
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
        if (this.shape && this.active) {
          this.shape.x = this.x;
          this.shape.y = this.y;
          this.shape.width = this.width;
          this.shape.height = this.height;
          this.shape.opacity = this.opacity;
          this.shape.visible = this.visible;
          this.shape.scaleX = this.scaleX;
          this.shape.scaleY = this.scaleY;
        }
      }

      /**
       * Render the Shape if it exists.
       */
      render() {
        if (this.shape && this.visible) {
          this.shape.draw();
        }
      }
    })();
  }
}

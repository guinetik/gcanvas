import { Transformable } from "../../shapes/transformable.js";
import { EventEmitter } from "../../io/index.js";
import { applyAnchor } from "../../mixins/anchor.js";
/**
 * GameObject
 * ----------
 *
 * A dynamic canvas entity with interactivity, state, and update/render lifecycle.
 * Builds upon `Transformable` and adds:
 * - Event handling via `EventEmitter`
 * - Bounding box-based hit detection
 * - Game instance linkage
 * - Parent reference for scene graph traversal
 *
 * ### Modernized Interactivity
 *
 * Previous versions used a `Shape` for hit testing. This version uses
 * the object's bounding box (`getBounds()`) for collision/interactivity.
 *
 * ### Event Model
 * Events are managed via the internal emitter. Use:
 * ```js
 * obj.on("click", cb)
 * obj.off("mouseover", cb)
 * ```
 *
 * ### Typical Usage
 * ```js
 * const box = new GameObject(game, { x: 100, y: 100, width: 200, height: 80 });
 * box.on("click", () => console.log("clicked"));
 * ```
 *
 * @abstract
 * @extends Transformable
 */
export class GameObject extends Transformable {
  /**
   * @param {Game} game - Game instance reference
   * @param {Object} [options={}] - Configuration and styling
   */
  constructor(game, options = {}) {
    super(options);
    this.game = game;
    this.parent = null;
    /** @type {EventEmitter} */
    this.events = new EventEmitter();
    this._interactive = options.interactive ?? false;
    this._hovered = false;
    if (options.anchor) {
      applyAnchor(this, options);
    }
  }

  update(dt) {
    this.logger.groupCollapsed(
      "GameObject.update: " +
        (this.name == undefined ? this.constructor.name : this.name)
    );
    super.update(dt);
    this.logger.groupEnd();
  }

  /**
   * Enable or disable hit-testing for this GameObject.
   * When enabled, _hitTest() will run during interaction checks.
   * @type {boolean}
   */
  get interactive() {
    return this._interactive;
  }

  set interactive(value) {
    const newValue = Boolean(value);

    // Only proceed if there's an actual change
    if (this._interactive !== newValue) {
      // Store the new state
      this._interactive = newValue;

      if (newValue === true) {
        // Object is becoming interactive
        this._enableEvents();
      } else {
        // Object is becoming non-interactive
        this._disableEvents();

        // Also reset hover state if it was previously hovered
        if (this._hovered) {
          this._hovered = false;
          this.events.emit("mouseout");
        }
      }
    }
  }

  /**
   * Enable event handling for this GameObject.
   * @private
   */
  _enableEvents() {
    // No need to create event handlers here
    // The Pipeline class already handles dispatching events to interactive objects
    // We just need to mark the object as interactive
    this.logger.log(`${this.constructor.name} is now interactive`);
  }

  /**
   * Disable event handling for this GameObject.
   * @private
   */
  _disableEvents() {
    // Clean up any specific event state
    this.logger.log(`${this.constructor.name} is no longer interactive`);
  }

  /**
   * True if the pointer is currently hovering over the object.
   * @type {boolean}
   * @readonly
   */
  get hovered() {
    return this._hovered;
  }

  set hovered(value) {
    this._hovered = Boolean(value);
  }

  /** Internal use by input system */
  _setHovered(state) {
    this._hovered = Boolean(state);
  }

  /**
   * Test whether a given point lies inside the object's bounds,
   * taking into account the full transformation hierarchy (position, rotation, scale).
   *
   * @param {number} x - X screen coordinate
   * @param {number} y - Y screen coordinate
   * @returns {boolean} True if the point is inside this object's bounds
   */
  _hitTest(x, y) {
    if (!this._interactive) return false;

    const bounds = this.getBounds?.();
    if (!bounds) return false;

    // Transform point from screen space to object's local space
    let localX = x;
    let localY = y;

    // Build transform chain (from root to this object)
    const transformChain = [];
    let current = this;
    while (current) {
      transformChain.unshift(current);
      current = current.parent;
    }

    // Apply inverse transforms in sequence (from root to object)
    for (const obj of transformChain) {
      // Translation: subtract object position
      localX -= obj.x || 0;
      localY -= obj.y || 0;

      // Rotation: apply inverse rotation if needed
      if (obj.rotation) {
        const cos = Math.cos(-obj.rotation);
        const sin = Math.sin(-obj.rotation);
        const tempX = localX;
        localX = tempX * cos - localY * sin;
        localY = tempX * sin + localY * cos;
      }

      // Scale: apply inverse scale if needed
      if (obj.scaleX !== undefined && obj.scaleX !== 0) {
        localX /= obj.scaleX;
      }
      if (obj.scaleY !== undefined && obj.scaleY !== 0) {
        localY /= obj.scaleY;
      }
    }

    // Now check if the point is inside our local bounds
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    return (
      localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH
    );
  }

  /**
   * Attach an event handler.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.events.on(event, callback);
  }

  /**
   * Remove an event handler.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.events.off(event, callback);
  }

  /**
   * Dispatch an event manually.
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   */
  emit(event, ...args) {
    this.events.emit(event, ...args);
  }
}

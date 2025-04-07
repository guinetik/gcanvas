import { EventEmitter } from "../io";
import { applyAnchor } from "../mixins/anchor";

/**
 * Base class for all interactive objects in the game loop.
 * Extend this to create custom objects with behavior and rendering.
 */
export class GameObject {
  /**
   * @param {Game} game - Reference to the game instance
   */
  constructor(game, options = {}) {
    this.game = game;
    this.ctx = game.ctx;
    this.active = true;
    this.events = new EventEmitter();
    this.interactive = false;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width ?? 0;
    this.height = options.height ?? 0;
    this.rotation = options.rotation ?? 0;
    this.scale = options.scale ?? 1;
    applyAnchor(this, options);
  }

  enableInteractivity(shape) {
    this.interactive = true;
    this.shape = shape;
    this._hovered = false;
  }

  _hitTest(x, y) {
    if (this.shape.getBounds() == null) return false;
    const { x: cx, y: cy, width, height } = this.shape.getBounds();

    const halfW = width / 2;
    const halfH = height / 2;

    return (
      x >= cx - halfW && x <= cx + halfW && y >= cy - halfH && y <= cy + halfH
    );
  }

  on(event, callback) {
    this.events.on(event, callback);
  }

  off(event, callback) {
    this.events.off(event, callback);
  }

  /**
   * Update the object every frame.
   * Override this in subclasses.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Intended to be overridden
  }

  /**
   * Render the object.
   * Override this in subclasses.
   */
  render() {
    // Intended to be overridden
  }
}
/**
 * Factory to wrap a Shape as a GameObject so it can be added to a Pipeline.
 */
export class ShapeGOFactory {
  static create(game, shape) {
    const options = {
      x: shape?.x ?? 0,
      y: shape?.y ?? 0,
      width: shape?.width ?? 0,
      height: shape?.height ?? 0,
    };

    return new (class extends GameObject {
      constructor() {
        super(game, options);
        this.shape = shape;
      }

      update(dt) {
        if (this.shape) {
          this.shape.x = this.x;
          this.shape.y = this.y;
          this.shape.width = this.width;
          this.shape.height = this.height;
        }
      }

      render() {
        if (this.shape) this.shape.draw();
      }
    })();
  }
}


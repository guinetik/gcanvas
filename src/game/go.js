import { EventEmitter } from "../io";

/**
 * Base class for all interactive objects in the game loop.
 * Extend this to create custom objects with behavior and rendering.
 */
export class GameObject {
  /**
   * @param {Game} game - Reference to the game instance
   */
  constructor(game) {
    this.game = game;
    this.ctx = game.ctx;
    this.active = true;
    this.events = new EventEmitter();
    this.interactive = false;
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
  /**
   * Creates a GameObject wrapper around a shape.
   * @param {Game} game - Game instance
   * @param {Shape} shape - Shape instance (e.g. Circle, Rectangle, etc.)
   * @returns {GameObject}
   */
  static create(game, shape) {
    return new (class extends GameObject {
      constructor() {
        super(game);
        this.shape = shape;
      }

      update(dt) {
        // No-op for now, can be extended
      }

      render() {
        this.shape.draw();
      }
    })();
  }
}

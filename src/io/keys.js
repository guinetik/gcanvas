/**
 * Keys.js
 *
 * Provides an abstraction layer over keyboard input. Instead of dealing with
 * raw "KeyA" / "Space" codes, you can subscribe to logical names like Keys.W,
 * Keys.SPACE, Keys.LEFT, etc.
 *
 * Example usage:
 *   // Initialization (usually in your Game constructor):
 *   Keys.init(this);
 *
 *   // Listen for a press:
 *   this.events.on(Keys.W, (evt) => {
 *     this.logger.log("W pressed!", evt);
 *   });
 *
 *   // Listen for release:
 *   this.events.on(Keys.W + "_up", (evt) => {
 *     this.logger.log("W released!");
 *   });
 *
 *   // Check if pressed in your update(dt):
 *   if (Keys.isDown(Keys.SPACE)) {
 *     // Spacebar is currently held
 *   }
 */
export class Keys {
  // Named constants for common game keys you might use:
  static W = "W";
  static A = "A";
  static S = "S";
  static D = "D";
  static Q = "Q";
  static E = "E";
  static UP = "UP";
  static DOWN = "DOWN";
  static LEFT = "LEFT";
  static RIGHT = "RIGHT";
  static SPACE = "SPACE";
  static SHIFT = "SHIFT";
  static ENTER = "ENTER";
  static ESC = "ESC";

  /**
   * Mapping from DOM event.code to one of the above Keys.* constants.
   * Customize this list as needed for your game.
   */
  static _codeMap = {
    // WASD + QE
    KeyW: Keys.W,
    KeyA: Keys.A,
    KeyS: Keys.S,
    KeyD: Keys.D,
    KeyQ: Keys.Q,
    KeyE: Keys.E,

    // Arrows
    ArrowUp: Keys.UP,
    ArrowDown: Keys.DOWN,
    ArrowLeft: Keys.LEFT,
    ArrowRight: Keys.RIGHT,

    // Space, Shift, Enter, Esc
    Space: Keys.SPACE,
    ShiftLeft: Keys.SHIFT,
    ShiftRight: Keys.SHIFT,
    Enter: Keys.ENTER,
    NumpadEnter: Keys.ENTER,
    Escape: Keys.ESC,
  };

  /**
   * A Set of logical key names (Keys.W, Keys.SPACE, etc.) that are currently held down.
   * @type {Set<string>}
   * @private
   */
  static _down = new Set();

  /**
   * A reference to the main game instance. We store it so we can emit events
   * via game.events whenever a key is pressed or released.
   * @type {Game}
   * @private
   */
  static game = null;

  /**
   * Initialize keyboard event handling. This attaches global listeners on the
   * window so that whenever a key is pressed or released, we can map it to
   * one of our Keys.* constants and emit the corresponding events on the game's
   * EventEmitter.
   *
   * @param {Game} game - Your main Game instance, which has a central event emitter.
   */
  static init(game) {
    Keys.game = game;

    // Attach global keydown/keyup listeners
    window.addEventListener("keydown", Keys._onKeyDown);
    window.addEventListener("keyup", Keys._onKeyUp);
  }

  /**
   * Returns true if the specified logical key (e.g. Keys.W) is currently held down.
   *
   * @param {string} logicalKey - One of the Keys.* constants.
   * @returns {boolean} - True if that key is in the "down" set, false otherwise.
   */
  static isDown(logicalKey) {
    return Keys._down.has(logicalKey);
  }

  /**
   * Internal method called whenever a key is pressed. We look up which
   * logical key constant it corresponds to, add it to our _down set,
   * and emit an event on the game (e.g. game.events.emit(Keys.W, e)).
   *
   * @param {KeyboardEvent} e - The raw DOM event.
   * @private
   */
  static _onKeyDown(e) {
    const mappedKey = Keys._codeMap[e.code];
    if (mappedKey) {
      if (!Keys._down.has(mappedKey)) {
        // Only emit this event the moment the key transitions from 'up' to 'down'
        Keys._down.add(mappedKey);
        Keys.game.events.emit(mappedKey, e);
      }
    }
    // Dispatch the raw event as well, in case anyone cares about that.
    Keys.game.events.emit(e.type, e);
  }

  /**
   * Internal method called whenever a key is released. If it was one of our
   * mapped keys, remove it from the _down set and emit an "_up" event.
   *
   * @param {KeyboardEvent} e - The raw DOM event.
   * @private
   */
  static _onKeyUp(e) {
    const mappedKey = Keys._codeMap[e.code];
    if (mappedKey) {
      if (Keys._down.has(mappedKey)) {
        Keys._down.delete(mappedKey);
        Keys.game.events.emit(mappedKey + "_up", e);
      }
    }
    // Dispatch the raw event as well, in case anyone cares about that.
    Keys.game.events.emit(e.type, e);
  }
}

import { GameObject } from "../objects/go.js";

/**
 * Cursor
 *
 * A GameObject that replaces the native mouse pointer with a custom shape.
 * - Provide a normal shape (e.g. small Circle or custom icon).
 * - Optionally provide a pressed shape to show while the mouse/touch is down.
 * 
 * Theme: Terminal × Vercel aesthetic
 * For best results, use shapes with terminal green (#0f0) outlines:
 * 
 * ```js
 * const normalCursor = new Circle(0, 0, 8, {
 *   stroke: "#0f0",
 *   lineWidth: 2
 * });
 * const pressedCursor = new Circle(0, 0, 6, {
 *   fill: "#0f0"
 * });
 * const cursor = new Cursor(game, normalCursor, pressedCursor);
 * ```
 *
 * Usage:
 *   const cursor = new Cursor(game, normalShape, pressedShape);
 *   myScene.add(cursor);
 */
export class Cursor extends GameObject {
  /**
   * @param {Game} game - The main game instance.
   * @param {Shape} normalShape - The shape to display when not pressed.
   * @param {Shape} [pressedShape] - Optional shape to display when pressed.
   */
  constructor(game, normalShape, pressedShape = null, options = {}) {
    super(game, options);
    /**
     * Shape shown when the mouse is not pressed.
     * @type {Shape}
     */
    this.normalShape = normalShape;
    /**
     * Shape shown when the mouse is pressed.
     * Fallback to normalShape if not provided.
     * @type {Shape}
     */
    this.pressedShape = pressedShape || normalShape;
    /**
     * If the cursor is active.
     */
    this.active = false;
    /**
     * How far the cursor is offset from the mouse position.
     */
    this.offsetX = 0.0;
    /**
     * How far the cursor is offset from the mouse position.
     */
    this.offsetY = 0.0;
    /**
     * Whether the mouse (or touch) is currently pressed.
     * @type {boolean}
     */
    this.isDown = false;
    // Listen for pointer movements on the entire game
    this.game.events.on("inputmove", (e) => {
      this.x = e.x;
      this.y = e.y;
    });
    this.game.events.on("inputdown", () => {
      this.isDown = true;
    });
    this.game.events.on("inputup", () => {
      this.isDown = false;
    });
    this.game.events.on("mouseover", () => {
      this.visible = false;
    });
    this.game.events.on("mouseout", () => {
      this.visible = true;
    });
  }

  activate() {
    this.active = true;
    // Hide the native cursor 
    this.game.canvas.style.cursor = "none";
  }

  deactivate() {
    this.active = false;
    // Show the native cursor
    this.game.canvas.style.cursor = "default";
  }
  /**
   * Renders whichever shape is appropriate based on mouse pressed state.
   */
  draw() {
    super.draw();
    //this.logger.log("render cursor", this.normalShape); 
    if (!this.active) return;
    // Decide which shape to draw
    const shape = this.isDown && this.pressedShape ? this.pressedShape : this.normalShape;
    if (!shape) return;
    // Draw it
    shape.render();
  }
}

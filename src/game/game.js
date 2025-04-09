/**************************************************************
 * Game.js
 *
 * The core class providing the main game loop (update & render),
 * pipeline management, and input initialization.
 * Intended to be subclassed for your specific game logic.
 ***************************************************************/

import { Pipeline } from "./pipeline.js";
import { Painter } from "../painter.js";
import { EventEmitter } from "../io";
import { Mouse } from "../io";
import { Input } from "../io";
import { Touch } from "../io";
import { Keys } from "../io";
import { Cursor } from "./ui/cursor.js";

/**
 * Core Game class. Provides lifecycle management, the update/render loop,
 * and a Pipeline to manage GameObjects.
 *
 * Usage:
 * 1. Subclass Game and override init(), update(dt), and render() if needed.
 * 2. Create a new instance, passing in a <canvas> element.
 * 3. Call .init() and then .start() to begin the game loop.
 */
export class Game {
  /**
   * Instantiate a new Game.
   * @param {HTMLCanvasElement} canvas - The canvas element to render onto.
   */
  constructor(canvas) {
    /**
     * The main canvas used for rendering.
     * @type {HTMLCanvasElement}
     */
    this.canvas = canvas;
    /**
     * The 2D rendering context.
     * @type {CanvasRenderingContext2D}
     */
    this.ctx = canvas.getContext("2d");
    /**
     * A centralized event emitter for the entire Game.
     * Handles mouse/keyboard/touch input as well as custom events.
     * @type {EventEmitter}
     */
    this.events = new EventEmitter();
    /**
     * The pipeline is a collection of GameObjects that are updated and rendered each frame.
     * @type {Cursor}
     */
    this._cursor = null;
    /**
     * Tracks the timestamp of the previous frame for calculating delta time.
     * @type {number}
     * @private
     */
    this.lastTime = 0;
    /**
     * Flag indicating if the game loop is currently running.
     * @type {boolean}
     */
    this.running = false;
    /**
     * The pipeline is a collection of GameObjects that are updated and rendered each frame.
     * @type {Pipeline}
     */
    this.pipeline = new Pipeline(this);
    //
    // Initialize Painter with this game's 2D context.
    Painter.init(this.ctx);
    //
    // Initialize pointer & input subsystems with reference to this game.
    this.initIO();
    console.log("[Game] Constructor");
  }

  /**
   * Hook to set up initial game state, add objects, etc.
   * Called in restart() and can be called manually if desired.
   * Override in subclasses to initialize custom logic or objects.
   */
  init() {
    console.log("[Game] Initialized");
  }

  /**
   * Initialize Mouse events.
   * This is called automatically in the constructor.
   * Override to add custom mouse event handlers, or disable them.
   */
  initMouse() {
    Mouse.init(this);
  }

  /**
   * Initialize Touch events.
   * This is called automatically in the constructor.
   * Override to add custom touch event handlers, or disable them.
   */
  initTouch() {
    Touch.init(this);
  }

  /**
   * Initialize Input Events.
   * An Input event is a combined event for mouse and touch that streamlines hover and click interactions.
   * This is called automatically in the constructor.
   * Override to add custom input event handlers, or disable them.
   */
  initInput() {
    Input.init(this);
  }

  /**
   * Initialize Keyboard events.
   * This is called automatically in the constructor.
   * Override to add custom keyboard event handlers, or disable them.
   */
  initKeyboard() {
    Keys.init(this);
  }

  /**
   * Initialize I/O Events.
   * This is a convenience method to set up all input systems at once.
   * This is called automatically in the constructor.
   * Override to add custom event handlers, or disable them.
   */
  initIO() {
    this.initMouse();
    this.initTouch();
    this.initInput();
    this.initKeyboard();
  }

  /**
   * Enables automatic resizing of the canvas to either the window or a given container.
   * @param {HTMLElement} [container=window] - Element to observe for resizing. Defaults to window.
   */
  enableFluidSize(container = window) {
    if (container === window) {
      const resizeCanvas = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      };
      resizeCanvas(); // set initial size
      window.addEventListener("resize", resizeCanvas);
      this._fluidResizeCleanup = () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    } else {
      // If ResizeObserver is available, use it to track container size changes
      if (!("ResizeObserver" in window)) {
        console.warn("ResizeObserver not supported in this browser.");
        return;
      }
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
      };
      const observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(container);
      resizeCanvas();

      this._fluidResizeCleanup = () => observer.disconnect();
    }
  }

  /**
   * Disables fluid resizing of the canvas.
   * If previously set, removes the event listener or observer.
   */
  disableFluidSize() {
    if (this._fluidResizeCleanup) {
      this._fluidResizeCleanup();
      this._fluidResizeCleanup = null;
    }
  }

  /**
   * Starts the main game loop using requestAnimationFrame.
   * The loop() method is bound so it can be used as a callback.
   */
  start() {
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    console.log("[Game] Started");
  }

  /**
   * Stops the main game loop.
   */
  stop() {
    this.running = false;
    console.log("[Game] Stopped");
  }

  /**
   * Clears the pipeline, calls init() again, and restarts the game loop.
   * Useful for resetting the game state.
   */
  restart() {
    this.pipeline.clear();
    this.init();
    this.start();
    console.log("[Game] Restarted");
  }

  /**
   * The main game loop. Called automatically by requestAnimationFrame.
   * @param {DOMHighResTimeStamp} timestamp - The current time at which requestAnimationFrame fired.
   *   Used to measure elapsed time between frames.
   * @private
   */
  loop(timestamp) {
    if (!this.running) return;
    // Compute delta time (dt) in seconds since last frame.
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    // Update and render the game state.
    this.update(dt);
    this.render();
    // Schedule the next frame.
    requestAnimationFrame(this.loop);
  }

  /**
   * Updates the game logic and propagates to the pipeline.
   * @param {number} dt - Delta time in seconds since the last frame.
   *   This is used to make movement or animations frame-rate independent.
   */
  update(dt) {
    this.pipeline.update(dt);
  }

  /**
   * Renders the game by first clearing the canvas, then asking
   * the pipeline to render all GameObjects.
   */
  render() {
    if (this.running) {
      this.clear();
    }
    this.pipeline.render();
  }

  /**
   * Clears the entire canvas. Called each frame before rendering.
   * Override to customize clear behavior (e.g. keep background images).
   */
  clear() {
    Painter.clear();
  }

  /**
   * Returns the current width of the canvas.
   * @type {number}
   */
  get width() {
    return this.canvas.width;
  }

  /**
   * Returns the current height of the canvas.
   * @type {number}
   */
  get height() {
    return this.canvas.height;
  }

  /**
   * Sets the canvas background color via CSS.
   * @param {string} color - Any valid CSS color string.
   */
  set backgroundColor(color) {
    this.canvas.style.backgroundColor = color;
  }

  /**
   * Sets the cursor for the game.
   * @param {Cursor} cursor - The cursor to set.
   */
  set cursor(cursor) {
    if (this._cursor) {
      this._cursor.destroy();
      this.pipeline.remove(this._cursor);
    }
    this._cursor = cursor;
    this._cursor.activate();
    // add the cursor to the pipeline
    this.pipeline.add(cursor);
  }

  /**
   * Returns the current cursor.
   * @returns {Cursor}
   */
  get cursor() {
    return this._cursor;
  }

  /**
   * Deactivates the current cursor and removes it from the pipeline.
   */
  resetCursor() {
    if (this._cursor) {
      this._cursor.destroy();
      this.pipeline.remove(this._cursor);
      this._cursor = null;
    }
  }
}

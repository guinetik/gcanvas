/**************************************************************
 * Game.js
 *
 * The core class providing the main game loop (update & render),
 * pipeline management, and input initialization.
 * Intended to be subclassed for your specific game logic.
 ***************************************************************/
import { Logger } from "../logger/logger.js";
import { DebugTab } from "../logger/debugtab.js";
import { Pipeline } from "./pipeline.js";
import { Painter } from "../painter/painter.js";
import { EventEmitter } from "../io";
import { Mouse } from "../io";
import { Input } from "../io";
import { Touch } from "../io";
import { Keys } from "../io";
import { Cursor } from "./ui/cursor.js";
import { Tweenetik } from "../motion/tweenetik.js";

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
     * Tracks the delta time of the last update.
     * @type {number}
     * @private
     */
    this.dt = 0;
    /**
     * Flag indicating if the game loop is currently running.
     * @type {boolean}
     */
    this.running = false;
    /**
     * Keep track of current frame (how many times loop has been called)
     * @type {number}
     */
    this._frame = 0;
    /**
     * The pipeline is a collection of GameObjects that are updated and rendered each frame.
     * @type {Pipeline}
     */
    this.pipeline = new Pipeline(this);
    // Initialize Painter with this game's 2D context.
    Painter.init(this.ctx);
    //
    this.targetFPS = 60; // default target FPS
    this._frameInterval = 1000 / this.targetFPS; // in milliseconds
    this._accumulator = 0; // tracks time overflow
    // Add visibility pause feature
    this._pauseOnBlur = false;
    this._isPaused = false;
    //
    this._init = false;
    //
    this.initLogging();
  }

  setFPS(fps) {
    this.targetFPS = fps;
    this._frameInterval = 1000 / fps;
  }

  #prevWidth = 0;
  #prevHeight = 0;

  /**
   * Hook to set up initial game state, add objects, etc.
   * Called in restart() and can be called manually if desired.
   * Override in subclasses to initialize custom logic or objects.
   */
  init() {
    //
    // Initialize pointer & input subsystems with reference to this game.
    this.initIO();
    this.initMotion();
    //this.setPauseOnBlur(true);
    this._init = true;
    this.logger.log("[Game] Initialized");
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

  initMotion() {
    Tweenetik._active = [];
  }

  initLogging() {
    this.logger = new Logger("Game");
    //Logger.setOutput(DebugTab.getInstance());
    Logger.setOutput(console);
    // Disable all logs initially
    Logger.disableAll();
    Logger.disable();
    // Enable logs for specific classes
    //Logger.enableFor("Renderable");
    //Logger.enableFor("GameObject");
    // Set the global log level
    Logger.setLevel(Logger.INFO);
    this.logger.groupCollapsed("Initializing Game...");
  }

  enableLogging() {
    Logger.enable();
  }

  disableLogging() {
    Logger.disableAll();
    Logger.disable();
  }

  markBoundsDirty() {
    this._boundsDirty = true;
  }

  get boundsDirty() {
    return this._boundsDirty;
  }

  set boundsDirty(dirty) {
    this._boundsDirty = dirty;
  }

  /**
   * Enables automatic resizing of the canvas to either the window or a given container.
   * @param {HTMLElement} [container=window] - Element to observe for resizing. Defaults to window.
   * @param {Object} [padding={}] - Optional padding to subtract from the canvas size.
   * @param {number} [padding.top=0] - Top padding.
   * @param {number} [padding.right=0] - Right padding.
   * @param {number} [padding.bottom=0] - Bottom padding.
   * @param {number} [padding.left=0] - Left padding.
   */
  enableFluidSize(container = window, padding = {}) {
    const { top = 0, right = 0, bottom = 0, left = 0 } = padding;
    if (container === window) {
      const resizeCanvas = () => {
        this.canvas.width = window.innerWidth - left - right;
        this.canvas.height = window.innerHeight - top - bottom;
        if (
          this.#prevWidth !== this.canvas.width ||
          this.#prevHeight !== this.canvas.height
        ) {
          this.markBoundsDirty();
          this.onResize?.();
        }
        this.#prevWidth = this.canvas.width;
        this.#prevHeight = this.canvas.height;
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
        this.canvas.width = rect.width - left - right;
        this.canvas.height = rect.height - top - bottom;
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
    this.logger.groupCollapsed("[Game] Starting...");
    this.init();
    if (!this._init) {
      throw new Error(
        "Game not initialized. Did you call init()? Remember to call super.init() in your subclass."
      );
    }
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.logger.log("[Game] Started");
    this.logger.groupEnd();
  }

  /**
   * Stops the main game loop.
   */
  stop() {
    this.running = false;
    this.logger.log("[Game] Stopped");
  }

  /**
   * Clears the pipeline, calls init() again, and restarts the game loop.
   * Useful for resetting the game state.
   */
  restart() {
    this.pipeline.clear();
    this.init();
    this.start();
    this.logger.log("[Game] Restarted");
  }

  /**
   * The main game loop. Called automatically by requestAnimationFrame.
   * @param {DOMHighResTimeStamp} timestamp - The current time at which requestAnimationFrame fired.
   *   Used to measure elapsed time between frames.
   * @private
   */
  loop(timestamp) {
    if (!this.running) return;

    const elapsed = timestamp - this.lastTime; // <--- Real elapsed time
    this.lastTime = timestamp;
    this._accumulator += elapsed;

    // 🧠 Real FPS from wall time
    this.actualFps = 1000 / elapsed;

    if (this._accumulator >= this._frameInterval) {
      const dt = this._frameInterval / 1000; // fixed timestep in seconds
      this.dt = dt;
      this._frame++;
      this.logger.groupCollapsed(`Frame #${this._frame}`);
      this.logger.time("render time");

      this.update(dt);
      this.render();

      this.logger.timeEnd("render time");
      this.logger.groupEnd();

      this._accumulator -= this._frameInterval;
    }
    if (this.boundsDirty) {
      this.boundsDirty = false;
    }
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
    // Ensure Painter uses this game's context (supports multiple canvases)
    Painter.setContext(this.ctx);
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

  /**
   * Enable/disable pausing the game when the tab loses focus
   * @param {boolean} enabled - Whether to pause on blur
   */
  enablePauseOnBlur(enabled) {
    this._pauseOnBlur = enabled;
    if (enabled) {
      window.addEventListener(
        "visibilitychange",
        this._handleVisibilityChange.bind(this),
        false
      );
    } else {
      window.removeEventListener(
        "visibilitychange",
        this._handleVisibilityChange.bind(this),
        false
      );
    }
  }

  _handleVisibilityChange() {
    this.logger.log("Visibility change detected");
    if (document.hidden) {
      if (this._pauseOnBlur && this.running) {
        this._isPaused = true;
        this.stop();
        this.logger.log("Paused due to tab visibility change");
      }
    } else {
      if (this._isPaused) {
        this._isPaused = false;
        this.start();
        this.logger.log("Resumed after tab visibility change");
      }
    }
  }
}

import { Pipeline } from "./pipeline.js";
import { Painter } from "../painter.js";
import { EventEmitter } from "../io";
import { Mouse } from "../io";
import { Input } from "../io";
import { Touch } from "../io";
/**
 * Core Game class. Provides lifecycle management, update/render loop,
 * and a game object pipeline.
 * Intended to be subclassed for specific games.
 */
export class Game {
  /**
   * @param {HTMLCanvasElement} canvas - Canvas DOM element
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    // Initialize I/O
    this.events = new EventEmitter();
    Mouse.init(this);
    Touch.init(this);
    Input.init(this);
    // Initialize game state
    this.lastTime = 0;
    this.running = false;
    // Initialize pipeline
    this.pipeline = new Pipeline(this);
    // Initialize Painter with canvas context
    Painter.init(this.ctx);
    //
    console.log("[Game] Constructor");
  }

  /**
   * Hook to set up game state and objects.
   * Should be overridden by subclasses.
   */
  init() {
    console.log("[Game] Initialized");
  }

  /**
   * Enables fluid resizing of the canvas.
   * @param {HTMLElement} container - The container element to observe for resizing.
   * If not provided, the window will be used.
   */
  enableFluidSize(container = window) {
    if (container === window) {
      const resizeCanvas = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      };

      resizeCanvas(); // initial resize
      window.addEventListener("resize", resizeCanvas);
      this._fluidResizeCleanup = () =>
        window.removeEventListener("resize", resizeCanvas);
    } else {
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
   * Disables fluid resizing.
   * If the canvas was resized using a container, it will stop observing it.
   * If it was resized using the window, it will remove the event listener.
   */
  disableFluidSize() {
    if (this._fluidResizeCleanup) {
      this._fluidResizeCleanup();
      this._fluidResizeCleanup = null;
    }
  }

  /**
   * Starts the game loop.
   */
  start() {
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    console.log("[Game] Started");
  }

  /**
   * Stops the game loop.
   */
  stop() {
    this.running = false;
    console.log("[Game] Stopped");
  }

  /**
   * Clears the pipeline and re-initializes the game.
   */
  restart() {
    this.pipeline.clear();
    this.init();
    this.start();
    console.log("[Game] Restarted");
  }

  /**
   * Main game loop.
   * @param {DOMHighResTimeStamp} timestamp
   */
  loop(timestamp) {
    if (!this.running) return;

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop);
  }

  /**
   * Game update logic — propagates to pipeline.
   * @param {number} dt - Delta time
   */
  update(dt) {
    this.pipeline.update(dt);
  }

  /**
   * Clears canvas and renders game objects via pipeline.
   */
  render() {
    if (this.running) this.clear();
    this.pipeline.render();
  }

  /**
   * Clears the canvas.
   * By default, the canvas is cleared before each render.
   * This method can be overridden to customize the clear behavior.
   */
  clear() {
    Painter.clear();
  }

  /**
   * Returns the canvas width.
   */
  get width() {
    return this.canvas.width;
  }

  /**
   * Returns the canvas height.
   */
  get height() {
    return this.canvas.height;
  }

  /**
   * Set the canvas background color.
   * @param {string} color
   */
  set backgroundColor(color) {
    this.canvas.style.backgroundColor = color;
  }
}

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
    this.lastTime = 0;
    this.pipeline = new Pipeline(this);
    this.running = false;
    // Initialize Painter with canvas context
    Painter.init(this.ctx);
    // Make canvas fullscreen
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Initialize I/O
    this.events = new EventEmitter();
    Mouse.init(this);
    Touch.init(this);
    Input.init(this);
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
    if (this.running)
      Painter.clear();
    this.pipeline.render();
  }
}

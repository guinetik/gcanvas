/**
 * @module FluentGame
 * @description Root builder class for the fluent API, wrapping the Game class
 *
 * This provides a declarative, chainable API for creating GCanvas games
 * with less boilerplate than the traditional class-based approach.
 *
 * @example
 * import { gcanvas } from 'gcanvas';
 *
 * gcanvas({ bg: 'black' })
 *   .scene('game')
 *     .go({ x: 400, y: 300, name: 'player' })
 *       .circle({ radius: 30, fill: 'lime' })
 *   .start();
 */

import { Game } from "../game/game.js";
import { Scene } from "../game/objects/scene.js";
import { FluentScene } from "./fluent-scene.js";
import { FluentGO } from "./fluent-go.js";

/**
 * Main entry point for the fluent API
 * @param {Object} options - Game configuration
 * @returns {FluentGame}
 */
export function gcanvas(options = {}) {
  return new FluentGame(options);
}

/**
 * FluentGame - Root builder class wrapping Game
 */
export class FluentGame {
  /** @type {Game} */
  #game;
  /** @type {Map<string, Scene>} */
  #scenes = new Map();
  /** @type {Scene|null} */
  #currentScene = null;
  /** @type {Object} */
  #refs = {};
  /** @type {Object} */
  #state = {};
  /** @type {Array} */
  #plugins = [];
  /** @type {HTMLCanvasElement|null} */
  #canvas = null;

  /**
   * @param {Object} options - Game configuration
   * @param {HTMLCanvasElement} [options.canvas] - Canvas element to use
   * @param {number} [options.width=800] - Canvas width (if auto-creating)
   * @param {number} [options.height=600] - Canvas height (if auto-creating)
   * @param {string} [options.bg] - Background color
   * @param {boolean} [options.fluid=true] - Enable fluid/responsive sizing
   * @param {HTMLElement} [options.container=document.body] - Container for auto-created canvas
   * @param {number} [options.fps=60] - Target FPS
   * @param {number} [options.pixelRatio=window.devicePixelRatio] - Pixel ratio for HiDPI
   */
  constructor(options = {}) {
    const {
      canvas,
      width = 800,
      height = 600,
      bg,
      fluid = true,
      container,
      fps = 60,
      pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1
    } = options;

    // Create or use provided canvas
    this.#canvas = canvas || this.#createCanvas(width, height, container);
    this.#game = new Game(this.#canvas);

    // Initialize the game
    this.#game.init();

    // Apply options
    if (bg) this.#game.backgroundColor = bg;
    if (fluid) this.#game.enableFluidSize();
    if (fps !== 60) this.#game.targetFPS = fps;

    // Store pixel ratio for shapes that need it
    this.#game._pixelRatio = pixelRatio;
  }

  /**
   * Create a canvas element
   * @private
   */
  #createCanvas(width, height, container) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'block';

    const target = container || document.body;
    target.appendChild(canvas);

    return canvas;
  }

  // ─────────────────────────────────────────────────────────
  // SCENE MANAGEMENT
  // ─────────────────────────────────────────────────────────

  /**
   * Create or switch to a scene
   * @param {string} name - Scene identifier
   * @param {Object} [options] - Scene options
   * @param {number} [options.zIndex=0] - Scene z-index
   * @param {boolean} [options.active=true] - Whether scene is visible
   * @param {Function} [options.onEnter] - Scene enter callback
   * @param {Function} [options.onExit] - Scene exit callback
   * @returns {FluentScene}
   */
  scene(name, options = {}) {
    const {
      zIndex = 0,
      active = true,
      onEnter,
      onExit
    } = options;

    let scene = this.#scenes.get(name);

    if (!scene) {
      scene = new Scene(this.#game);
      scene.name = name;
      scene.zIndex = zIndex;
      scene.visible = active;
      scene._onEnter = onEnter;
      scene._onExit = onExit;
      this.#scenes.set(name, scene);
      this.#game.pipeline.add(scene);
    }

    this.#currentScene = scene;
    return new FluentScene(this, scene, this.#refs, this.#state);
  }

  /**
   * Switch context to an existing scene (does not create)
   * @param {string} name - Scene name
   * @returns {FluentScene}
   */
  inScene(name) {
    const scene = this.#scenes.get(name);
    if (!scene) {
      throw new Error(`Scene '${name}' does not exist. Use .scene('${name}') to create it.`);
    }
    this.#currentScene = scene;
    return new FluentScene(this, scene, this.#refs, this.#state);
  }

  /**
   * Shortcut: create GO in current/default scene
   * @param {Object} options - GameObject options
   * @returns {FluentGO}
   */
  go(options) {
    if (!this.#currentScene) {
      this.scene('default');
    }
    return new FluentScene(this, this.#currentScene, this.#refs, this.#state).go(options);
  }

  // ─────────────────────────────────────────────────────────
  // SCENE VISIBILITY & TRANSITIONS
  // ─────────────────────────────────────────────────────────

  /**
   * Show a scene
   * @param {string} name - Scene name
   * @returns {FluentGame}
   */
  showScene(name) {
    const scene = this.#scenes.get(name);
    if (scene) {
      scene.visible = true;
      scene._onEnter?.(this.#createContext());
    }
    return this;
  }

  /**
   * Hide a scene
   * @param {string} name - Scene name
   * @returns {FluentGame}
   */
  hideScene(name) {
    const scene = this.#scenes.get(name);
    if (scene) {
      scene._onExit?.(this.#createContext());
      scene.visible = false;
    }
    return this;
  }

  /**
   * Transition between scenes
   * @param {string} from - Source scene name
   * @param {string} to - Target scene name
   * @param {Object} [options] - Transition options
   * @param {number} [options.fade=0] - Fade duration in seconds
   * @param {Function} [options.onComplete] - Completion callback
   * @returns {FluentGame}
   */
  transition(from, to, options = {}) {
    const { fade = 0, onComplete } = options;

    // TODO: Implement fade transition using Tweenetik
    this.hideScene(from);
    this.showScene(to);
    onComplete?.();

    return this;
  }

  // ─────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────

  /**
   * Set initial state
   * @param {Object} initialState
   * @returns {FluentGame}
   */
  state(initialState) {
    Object.assign(this.#state, initialState);
    return this;
  }

  /**
   * Get a state value
   * @param {string} key - State key
   * @returns {*}
   */
  getState(key) {
    return this.#state[key];
  }

  /**
   * Set a state value
   * @param {string} key - State key
   * @param {*} value - State value
   * @returns {FluentGame}
   */
  setState(key, value) {
    this.#state[key] = value;
    return this;
  }

  // ─────────────────────────────────────────────────────────
  // EVENTS & LIFECYCLE
  // ─────────────────────────────────────────────────────────

  /**
   * Register event handler
   * @param {string} event - Event name (update, keydown:escape, click, etc.)
   * @param {Function} handler - Handler function receiving context
   * @returns {FluentGame}
   */
  on(event, handler) {
    const ctx = this.#createContext();

    if (event === 'update') {
      // Hook into the game's update loop
      const originalUpdate = this.#game.update.bind(this.#game);
      this.#game.update = (dt) => {
        originalUpdate(dt);
        handler(dt, ctx);
      };
    } else if (event.startsWith('keydown:')) {
      const key = event.split(':')[1];
      this.#game.events.on('keydown', (e) => {
        if (e.key?.toLowerCase() === key.toLowerCase() ||
            e.code?.toLowerCase() === key.toLowerCase()) {
          handler(ctx, e);
        }
      });
    } else if (event.startsWith('keyup:')) {
      const key = event.split(':')[1];
      this.#game.events.on('keyup', (e) => {
        if (e.key?.toLowerCase() === key.toLowerCase()) {
          handler(ctx, e);
        }
      });
    } else {
      this.#game.events.on(event, (e) => handler(ctx, e));
    }

    return this;
  }

  // ─────────────────────────────────────────────────────────
  // PLUGINS & EXTENSIONS
  // ─────────────────────────────────────────────────────────

  /**
   * Use a plugin or scene builder function
   * @param {Function} plugin - Plugin function receiving FluentGame
   * @returns {FluentGame}
   */
  use(plugin) {
    plugin(this);
    this.#plugins.push(plugin);
    return this;
  }

  // ─────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────

  /**
   * Start the game loop
   * @returns {FluentGame}
   */
  start() {
    this.#game.start();
    return this;
  }

  /**
   * Stop the game loop
   * @returns {FluentGame}
   */
  stop() {
    this.#game.stop();
    return this;
  }

  /**
   * Restart the game
   * @returns {FluentGame}
   */
  restart() {
    this.#game.restart();
    return this;
  }

  // ─────────────────────────────────────────────────────────
  // ACCESSORS
  // ─────────────────────────────────────────────────────────

  /** @returns {Game} Underlying Game instance */
  get game() { return this.#game; }

  /** @returns {Object} Named object references */
  get refs() { return this.#refs; }

  /** @returns {Map<string, Scene>} All scenes */
  get scenes() { return this.#scenes; }

  /** @returns {HTMLCanvasElement} Canvas element */
  get canvas() { return this.#canvas; }

  /** @returns {number} Canvas width */
  get width() { return this.#canvas.width; }

  /** @returns {number} Canvas height */
  get height() { return this.#canvas.height; }

  // ─────────────────────────────────────────────────────────
  // INTERNAL
  // ─────────────────────────────────────────────────────────

  /**
   * Create a context object for handlers
   * @private
   */
  #createContext() {
    return {
      refs: this.#refs,
      state: this.#state,
      scenes: Object.fromEntries(this.#scenes),
      game: this.#game,
      width: this.#canvas.width,
      height: this.#canvas.height,
      showScene: (name) => this.showScene(name),
      hideScene: (name) => this.hideScene(name),
      transition: (from, to, opts) => this.transition(from, to, opts)
    };
  }
}

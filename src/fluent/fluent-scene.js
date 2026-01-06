/**
 * @module FluentScene
 * @description Builder class for Scene operations in the fluent API
 *
 * Provides chainable methods for creating and managing GameObjects within a scene.
 */

import { GameObject } from "../game/objects/go.js";
import { Group } from "../shapes/group.js";
import { FluentGO } from "./fluent-go.js";
import { FluentLayer } from "./fluent-layer.js";

/**
 * FluentScene - Builder class for Scene operations
 */
export class FluentScene {
  /** @type {import('./fluent-game.js').FluentGame} */
  #parent;
  /** @type {import('../game/objects/scene.js').Scene} */
  #scene;
  /** @type {Object} */
  #refs;
  /** @type {Object} */
  #state;
  /** @type {GameObject|null} */
  #lastGO = null;

  /**
   * @param {import('./fluent-game.js').FluentGame} parent - Parent FluentGame
   * @param {import('../game/objects/scene.js').Scene} scene - Wrapped Scene instance
   * @param {Object} refs - Shared refs object
   * @param {Object} state - Shared state object
   */
  constructor(parent, scene, refs, state) {
    this.#parent = parent;
    this.#scene = scene;
    this.#refs = refs;
    this.#state = state;
  }

  // ─────────────────────────────────────────────────────────
  // GAMEOBJECT CREATION
  // ─────────────────────────────────────────────────────────

  /**
   * Create a GameObject in this scene
   *
   * Supports multiple signatures:
   * - go() - Create plain GameObject at origin
   * - go(options) - Create plain GameObject with options
   * - go(CustomClass) - Create custom GameObject class
   * - go(CustomClass, options) - Custom class with options
   * - go(options, builderFn) - Plain GO with builder callback
   * - go(CustomClass, options, builderFn) - Custom class with builder
   *
   * @param {Object|Function} [optionsOrClass] - GameObject options or custom class
   * @param {Object|Function} [optionsOrBuilder] - Options or builder function
   * @param {Function} [builderFn] - Optional builder callback
   * @returns {FluentGO|FluentScene}
   */
  go(optionsOrClass, optionsOrBuilder, builderFn) {
    // Parse flexible arguments
    let GOClass, options, builder;

    if (typeof optionsOrClass === 'function' && optionsOrClass.prototype) {
      // go(CustomClass) or go(CustomClass, options) or go(CustomClass, options, builder)
      GOClass = optionsOrClass;
      if (typeof optionsOrBuilder === 'function') {
        options = {};
        builder = optionsOrBuilder;
      } else {
        options = optionsOrBuilder || {};
        builder = builderFn;
      }
    } else {
      // go() or go(options) or go(options, builder)
      GOClass = GameObject;
      options = optionsOrClass || {};
      builder = optionsOrBuilder;
    }

    const {
      name,
      x = 0,
      y = 0,
      visible = true,
      ...rest
    } = options;

    // Instantiate the GO class (custom or default)
    // GameObject constructor signature is (game, options)
    const go = new GOClass(this.#parent.game, { x, y, visible, ...rest });
    this.#scene.add(go);
    this.#lastGO = go;

    // Register in refs if named
    if (name) {
      go.name = name;
      this.#refs[name] = go;
    }

    const fluentGO = new FluentGO(this, go, this.#refs, this.#state);

    // If builder function provided, execute and return scene context
    if (builder) {
      builder(fluentGO);
      return this;
    }

    return fluentGO;
  }

  /**
   * Create multiple GOs with a builder
   * @param {string|Function} groupNameOrFn - Group name or builder function
   * @param {Function} [builderFn] - Builder function if name provided
   * @returns {FluentScene}
   */
  group(groupNameOrFn, builderFn) {
    const groupName = typeof groupNameOrFn === 'string' ? groupNameOrFn : null;
    const fn = typeof groupNameOrFn === 'function' ? groupNameOrFn : builderFn;

    const groupGOs = [];

    const groupApi = {
      go: (opts) => {
        const fluentGO = this.go(opts);
        groupGOs.push(fluentGO.goInstance);
        return fluentGO;
      }
    };

    fn(groupApi);

    if (groupName) {
      this.#refs[groupName] = groupGOs;
    }

    return this;
  }

  // ─────────────────────────────────────────────────────────
  // LAYER MANAGEMENT (sub-grouping within scene)
  // ─────────────────────────────────────────────────────────

  /**
   * Create a layer (z-indexed group) within the scene
   * @param {string} name - Layer name
   * @param {number} [zIndex=0] - Layer z-index (relative to scene)
   * @returns {FluentLayer}
   */
  layer(name, zIndex = 0) {
    // Layers are implemented as Groups with zIndex
    const layerGroup = new Group({ zIndex });
    layerGroup.name = name;

    // Create a wrapper GO to hold the group
    // GameObject constructor signature is (game, options)
    const layerGO = new GameObject(this.#parent.game, { x: 0, y: 0 });
    layerGO._fluentShape = layerGroup;
    layerGO.renderable = layerGroup;
    layerGO.zIndex = zIndex;

    // Hook into draw to render the group
    const originalDraw = layerGO.draw?.bind(layerGO) || (() => {});
    layerGO.draw = function() {
      originalDraw();
      if (this._fluentShape && this.visible) {
        this._fluentShape.render();
      }
    };

    this.#scene.add(layerGO);

    if (name) {
      this.#refs[`${this.#scene.name}_${name}`] = layerGO;
    }

    return new FluentLayer(this, layerGO, layerGroup, this.#refs, this.#state);
  }

  // ─────────────────────────────────────────────────────────
  // SCENE LIFECYCLE HOOKS
  // ─────────────────────────────────────────────────────────

  /**
   * Register scene enter callback
   * @param {Function} handler
   * @returns {FluentScene}
   */
  onEnter(handler) {
    this.#scene._onEnter = handler;
    return this;
  }

  /**
   * Register scene exit callback
   * @param {Function} handler
   * @returns {FluentScene}
   */
  onExit(handler) {
    this.#scene._onExit = handler;
    return this;
  }

  // ─────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────

  /**
   * Switch to another scene (creates if needed)
   * @param {string} name - Scene name
   * @param {Object} [options] - Scene options
   * @returns {FluentScene}
   */
  scene(name, options) {
    return this.#parent.scene(name, options);
  }

  /**
   * Return to game context
   * @returns {import('./fluent-game.js').FluentGame}
   */
  end() {
    return this.#parent;
  }

  // ─────────────────────────────────────────────────────────
  // SHORTCUTS (delegate to parent)
  // ─────────────────────────────────────────────────────────

  /**
   * Start the game
   * @returns {import('./fluent-game.js').FluentGame}
   */
  start() {
    return this.#parent.start();
  }

  /**
   * Stop the game
   * @returns {import('./fluent-game.js').FluentGame}
   */
  stop() {
    return this.#parent.stop();
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   * @returns {import('./fluent-game.js').FluentGame}
   */
  on(event, handler) {
    return this.#parent.on(event, handler);
  }

  /**
   * Use a plugin
   * @param {Function} plugin - Plugin function
   * @returns {import('./fluent-game.js').FluentGame}
   */
  use(plugin) {
    return this.#parent.use(plugin);
  }

  /**
   * Set state
   * @param {Object} stateObj - State object
   * @returns {import('./fluent-game.js').FluentGame}
   */
  state(stateObj) {
    return this.#parent.state(stateObj);
  }

  // ─────────────────────────────────────────────────────────
  // ACCESSORS
  // ─────────────────────────────────────────────────────────

  /** @returns {import('../game/objects/scene.js').Scene} Underlying Scene instance */
  get sceneInstance() { return this.#scene; }

  /** @returns {Object} Named object references */
  get refs() { return this.#refs; }

  /** @returns {Object} Shared state */
  get state() { return this.#state; }

  /** @returns {import('./fluent-game.js').FluentGame} Parent FluentGame */
  get parent() { return this.#parent; }
}

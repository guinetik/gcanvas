/**
 * @module FluentLayer
 * @description Builder class for layer (z-indexed group) operations within a scene
 *
 * Layers are implemented as GameObjects containing Groups, allowing for
 * z-indexed sub-grouping within a scene.
 */

import { GameObject } from "../game/objects/go.js";
import { FluentGO } from "./fluent-go.js";

/**
 * FluentLayer - Builder for layer (z-indexed group) within a scene
 */
export class FluentLayer {
  /** @type {import('./fluent-scene.js').FluentScene} */
  #parent;
  /** @type {GameObject} */
  #layerGO;
  /** @type {import('../shapes/group.js').Group} */
  #group;
  /** @type {Object} */
  #refs;
  /** @type {Object} */
  #state;

  /**
   * @param {import('./fluent-scene.js').FluentScene} parent - Parent FluentScene
   * @param {GameObject} layerGO - The GameObject holding the layer
   * @param {import('../shapes/group.js').Group} group - The Group for the layer
   * @param {Object} refs - Shared refs object
   * @param {Object} state - Shared state object
   */
  constructor(parent, layerGO, group, refs, state) {
    this.#parent = parent;
    this.#layerGO = layerGO;
    this.#group = group;
    this.#refs = refs;
    this.#state = state;
  }

  /**
   * Create a GameObject in this layer
   * @param {Object} [opts] - GameObject options
   * @param {Function} [builderFn] - Optional builder callback
   * @returns {FluentGO|FluentLayer}
   */
  go(opts = {}, builderFn) {
    const {
      name,
      x = 0,
      y = 0,
      visible = true,
      ...rest
    } = opts;

    const go = new GameObject({ x, y, visible, ...rest });

    // Set game reference from parent
    if (this.#parent.parent?.game) {
      go.game = this.#parent.parent.game;
    }

    // Add to the layer's group
    this.#group.add(go);

    // Register in refs if named
    if (name) {
      go.name = name;
      this.#refs[name] = go;
    }

    const fluentGO = new FluentGO(this, go, this.#refs, this.#state);

    if (builderFn) {
      builderFn(fluentGO);
      return this;
    }

    return fluentGO;
  }

  /**
   * Set layer visibility
   * @param {boolean} visible - Visibility state
   * @returns {FluentLayer}
   */
  visible(visible) {
    this.#layerGO.visible = visible;
    return this;
  }

  /**
   * Set layer opacity
   * @param {number} value - Opacity (0-1)
   * @returns {FluentLayer}
   */
  opacity(value) {
    this.#group.opacity = value;
    return this;
  }

  /**
   * End layer context and return to scene
   * @returns {import('./fluent-scene.js').FluentScene}
   */
  endLayer() {
    return this.#parent;
  }

  /**
   * Navigate back to parent (same as endLayer)
   * @returns {import('./fluent-scene.js').FluentScene}
   */
  end() {
    return this.#parent;
  }

  /**
   * Switch to another scene
   * @param {string} name - Scene name
   * @param {Object} [opts] - Scene options
   * @returns {import('./fluent-scene.js').FluentScene}
   */
  scene(name, opts) {
    return this.#parent.scene(name, opts);
  }

  /**
   * Start the game
   * @returns {import('./fluent-game.js').FluentGame}
   */
  start() {
    return this.#parent.start();
  }

  // ─────────────────────────────────────────────────────────
  // ACCESSORS
  // ─────────────────────────────────────────────────────────

  /** @returns {GameObject} The layer's wrapper GameObject */
  get layerGO() { return this.#layerGO; }

  /** @returns {import('../shapes/group.js').Group} The layer's Group */
  get group() { return this.#group; }

  /** @returns {Object} Named object references */
  get refs() { return this.#refs; }

  /** @returns {Object} Shared state */
  get state() { return this.#state; }
}

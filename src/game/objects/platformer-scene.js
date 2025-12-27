import { Scene } from "./scene.js";
import { Camera2D } from "../../util/camera2d.js";
import { Painter } from "../../painter/painter.js";
import { Keys } from "../../io/keys.js";

/**
 * PlatformerScene - A scene optimized for side-scrolling platformer games
 *
 * Provides:
 * - Parallax layer support with configurable scroll speeds
 * - Automatic gravity and input handling for the player
 * - Camera integration with smooth following
 * - Viewport clipping
 * - Override hooks for customization
 *
 * @example
 * // Basic usage
 * const level = new PlatformerScene(game, {
 *   player: playerGameObject,
 *   gravity: 1200,
 *   groundY: 500,
 * });
 *
 * // Add parallax layers
 * level.addLayer(background, { speed: 0.3 }); // slow parallax
 * level.addLayer(platforms, { speed: 1.0 });  // normal
 * level.addLayer(foreground, { speed: 1.5 }); // fast parallax
 *
 * // Add player (not as layer, moves with camera)
 * level.add(player);
 *
 * this.pipeline.add(level);
 *
 * @example
 * // Custom camera behavior (endless runner)
 * class EndlessRunnerScene extends PlatformerScene {
 *   updateCamera(dt) {
 *     // No camera following - fixed viewport
 *   }
 *
 *   getCameraOffset() {
 *     return { x: 0, y: 0 };
 *   }
 * }
 *
 * @extends Scene
 */
export class PlatformerScene extends Scene {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options - Configuration
   * @param {GameObject} [options.player=null] - Player GameObject with x, y; will add vx, vy, _grounded
   * @param {Camera2D} [options.camera] - Optional Camera2D (created automatically if player provided)
   * @param {number} [options.viewportWidth] - Viewport width (defaults to game width)
   * @param {number} [options.viewportHeight] - Viewport height (defaults to game height)
   * @param {number} [options.gravity=1200] - Gravity acceleration (pixels/second^2)
   * @param {number} [options.groundY=null] - Default ground Y level (null = no default ground)
   * @param {number} [options.moveSpeed=300] - Horizontal movement speed (pixels/second)
   * @param {number} [options.jumpVelocity=-500] - Initial jump velocity (negative = up)
   * @param {boolean} [options.autoInput=true] - Auto-apply WASD/Arrow input
   * @param {boolean} [options.autoGravity=true] - Auto-apply gravity to player
   */
  constructor(game, options = {}) {
    super(game, options);

    /** @type {GameObject|null} The player GameObject */
    this.player = options.player ?? null;

    /** @type {Array<{gameObject: GameObject, speed: number, offsetX: number, offsetY: number}>} */
    this._layers = [];

    // Physics configuration
    /** @type {number} Gravity acceleration in pixels/second^2 */
    this.gravity = options.gravity ?? 1200;

    /** @type {number|null} Default ground Y level (null = no ground) */
    this.groundY = options.groundY ?? null;

    /** @type {number} Horizontal movement speed in pixels/second */
    this.moveSpeed = options.moveSpeed ?? 300;

    /** @type {number} Initial jump velocity (negative = up) */
    this.jumpVelocity = options.jumpVelocity ?? -500;

    // Feature toggles
    /** @type {boolean} Whether to auto-apply WASD/Arrow input */
    this.autoInput = options.autoInput ?? true;

    /** @type {boolean} Whether to auto-apply gravity to player */
    this.autoGravity = options.autoGravity ?? true;

    // Viewport dimensions
    /** @type {number|null} Viewport width (null = use game width) */
    this._viewportWidth = options.viewportWidth ?? null;

    /** @type {number|null} Viewport height (null = use game height) */
    this._viewportHeight = options.viewportHeight ?? null;

    // Initialize player physics properties if not present
    if (this.player) {
      if (this.player.vx === undefined) this.player.vx = 0;
      if (this.player.vy === undefined) this.player.vy = 0;
      if (this.player._grounded === undefined) this.player._grounded = true;
    }

    // Camera - create default if player provided and no camera given
    if (options.camera) {
      this.camera = options.camera;
    } else if (this.player) {
      this.camera = new Camera2D({
        target: this.player,
        viewportWidth: this._viewportWidth ?? game.width,
        viewportHeight: this._viewportHeight ?? game.height,
        lerp: 0.1,
      });
    } else {
      this.camera = null;
    }
  }

  // ==================== Layer API ====================

  /**
   * Add a parallax layer to the scene
   * @param {GameObject} gameObject - The layer content
   * @param {Object} options - Layer options
   * @param {number} [options.speed=1] - Scroll speed multiplier (0=fixed, 0.5=slow, 1=normal, 1.5=fast)
   * @param {number} [options.offsetX=0] - Fixed X offset
   * @param {number} [options.offsetY=0] - Fixed Y offset
   * @returns {GameObject} The added game object
   */
  addLayer(gameObject, options = {}) {
    const layer = {
      gameObject,
      speed: options.speed ?? 1,
      offsetX: options.offsetX ?? 0,
      offsetY: options.offsetY ?? 0,
    };

    this._layers.push(layer);

    // Also add to scene's collection for update calls
    this.add(gameObject);

    return gameObject;
  }

  /**
   * Remove a layer from the scene
   * @param {GameObject} gameObject - The layer to remove
   * @returns {boolean} True if layer was found and removed
   */
  removeLayer(gameObject) {
    const index = this._layers.findIndex((l) => l.gameObject === gameObject);
    if (index !== -1) {
      this._layers.splice(index, 1);
      this.remove(gameObject);
      return true;
    }
    return false;
  }

  /**
   * Get all layers
   * @returns {Array<{gameObject: GameObject, speed: number, offsetX: number, offsetY: number}>}
   */
  getLayers() {
    return [...this._layers];
  }

  /**
   * Check if a game object is a layer
   * @param {GameObject} gameObject
   * @returns {boolean}
   */
  isLayer(gameObject) {
    return this._layers.some((l) => l.gameObject === gameObject);
  }

  // ==================== Override Hooks ====================

  /**
   * Apply gravity to the player
   * Override this method to customize gravity behavior
   * @param {GameObject} player - The player object
   * @param {number} dt - Delta time in seconds
   */
  applyGravity(player, dt) {
    player.vy = (player.vy || 0) + this.gravity * dt;
  }

  /**
   * Apply input to the player
   * Override this method to customize input handling
   * @param {GameObject} player - The player object
   * @param {number} dt - Delta time in seconds
   */
  applyInput(player, dt) {
    // Horizontal movement
    let moveX = 0;
    if (Keys.isDown(Keys.LEFT) || Keys.isDown(Keys.A)) {
      moveX = -1;
    } else if (Keys.isDown(Keys.RIGHT) || Keys.isDown(Keys.D)) {
      moveX = 1;
    }
    player.vx = moveX * this.moveSpeed;

    // Jump
    const jumpPressed =
      Keys.isDown(Keys.SPACE) || Keys.isDown(Keys.W) || Keys.isDown(Keys.UP);
    if (jumpPressed && this.isPlayerGrounded()) {
      player.vy = this.jumpVelocity;
      player._grounded = false;
    }
  }

  /**
   * Update the camera
   * Override this method to customize camera behavior
   * @param {number} dt - Delta time in seconds
   */
  updateCamera(dt) {
    if (this.camera) {
      this.camera.update(dt);
    }
  }

  /**
   * Get the current camera offset for rendering
   * Override this method to customize scroll behavior
   * @returns {{x: number, y: number}}
   */
  getCameraOffset() {
    if (this.camera) {
      return this.camera.getOffset();
    }
    return { x: 0, y: 0 };
  }

  /**
   * Check if player is on the ground
   * Override for custom ground detection (platforms, etc.)
   * @returns {boolean}
   */
  isPlayerGrounded() {
    return this.player?._grounded === true;
  }

  /**
   * Apply velocity to player position
   * Override for custom movement physics
   * @param {GameObject} player - The player object
   * @param {number} dt - Delta time in seconds
   */
  applyVelocity(player, dt) {
    player.x += (player.vx || 0) * dt;
    player.y += (player.vy || 0) * dt;
  }

  /**
   * Handle ground collision for player
   * Override for custom ground collision behavior
   * @param {GameObject} player - The player object
   */
  handleGroundCollision(player) {
    if (this.groundY !== null && player.y >= this.groundY) {
      player.y = this.groundY;
      player.vy = 0;
      player._grounded = true;
    }
  }

  // ==================== Update ====================

  /**
   * Update method - applies physics, input, and camera following
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (this.player) {
      // Apply gravity (if enabled)
      if (this.autoGravity) {
        this.applyGravity(this.player, dt);
      }

      // Apply input (if enabled)
      if (this.autoInput) {
        this.applyInput(this.player, dt);
      }

      // Apply velocity to position
      this.applyVelocity(this.player, dt);

      // Handle ground collision
      this.handleGroundCollision(this.player);
    }

    // Update camera
    this.updateCamera(dt);

    // Update all children (layers and non-layer children)
    super.update(dt);
  }

  // ==================== Rendering ====================

  /**
   * Draw with viewport clipping and parallax
   */
  draw() {
    // Apply scene transforms (rotation, scale, etc.)
    this.applyTransforms();

    // Draw debug bounds if enabled
    this.drawDebug();

    // Get viewport dimensions
    const viewportW = this._viewportWidth ?? this.game.width;
    const viewportH = this._viewportHeight ?? this.game.height;

    // Get camera offset
    const offset = this.getCameraOffset();

    Painter.save();

    // Clip to viewport
    // Account for scene position - clip in world coordinates
    Painter.ctx.beginPath();
    Painter.ctx.rect(-this.x, -this.y, viewportW, viewportH);
    Painter.ctx.clip();
    Painter.ctx.beginPath();

    // Translate to world origin so children render at their world positions
    Painter.ctx.translate(-this.x, -this.y);

    // Render layers with parallax
    for (const layer of this._layers) {
      if (!layer.gameObject.visible) continue;

      Painter.save();

      // Apply parallax offset based on layer speed
      const parallaxX = offset.x * layer.speed + (layer.offsetX || 0);
      const parallaxY = offset.y * layer.speed + (layer.offsetY || 0);

      Painter.ctx.translate(-parallaxX, -parallaxY);

      // Render the layer
      layer.gameObject.render();

      Painter.restore();
    }

    // Render non-layer children (like player, enemies) with full camera offset
    for (const child of this._collection.getSortedChildren()) {
      if (!child.visible) continue;
      // Skip if this child is a layer (already rendered above)
      if (this._layers.some((l) => l.gameObject === child)) continue;

      Painter.save();
      // Apply full camera offset
      Painter.ctx.translate(-offset.x, -offset.y);
      child.render();
      Painter.restore();
    }

    Painter.restore();
  }

  // ==================== Utilities ====================

  /**
   * Shake the camera
   * @param {number} intensity - Shake amount in pixels
   * @param {number} duration - Shake duration in seconds
   * @returns {PlatformerScene} this for chaining
   */
  shakeCamera(intensity, duration) {
    if (this.camera) {
      this.camera.shake(intensity, duration);
    }
    return this;
  }

  /**
   * Set viewport dimensions
   * @param {number} width - Viewport width
   * @param {number} height - Viewport height
   * @returns {PlatformerScene} this for chaining
   */
  setViewport(width, height) {
    this._viewportWidth = width;
    this._viewportHeight = height;
    if (this.camera) {
      this.camera.viewportWidth = width;
      this.camera.viewportHeight = height;
    }
    return this;
  }

  /**
   * Get viewport dimensions
   * @returns {{width: number, height: number}}
   */
  getViewport() {
    return {
      width: this._viewportWidth ?? this.game.width,
      height: this._viewportHeight ?? this.game.height,
    };
  }
}

/**
 * Camera2D - 2D camera with smooth following, deadzone, zoom, and bounds
 *
 * Provides viewport management for platformer-style games with smooth
 * target following, configurable deadzone, zoom support, and screen shake.
 *
 * @example
 * // Basic usage with target following
 * const camera = new Camera2D({
 *   target: player,
 *   viewportWidth: 800,
 *   viewportHeight: 600,
 *   lerp: 0.1,
 * });
 *
 * // With deadzone (player can move freely inside without camera moving)
 * const camera = new Camera2D({
 *   target: player,
 *   deadzone: { width: 100, height: 50 },
 *   bounds: { minX: 0, maxX: 2000, minY: 0, maxY: 600 },
 * });
 *
 * // In update loop
 * camera.update(dt);
 * const offset = camera.getOffset();
 * // Use offset.x, offset.y for rendering
 */
export class Camera2D {
  /**
   * Create a new Camera2D instance
   * @param {Object} options - Configuration options
   * @param {Object} [options.target=null] - Target object with x, y to follow
   * @param {Object} [options.deadzone=null] - Deadzone { width, height } where target can move freely
   * @param {number} [options.lerp=0.1] - Smooth follow speed (0-1, higher = snappier)
   * @param {number} [options.zoom=1] - Zoom scale factor
   * @param {Object} [options.bounds=null] - Scroll bounds { minX, maxX, minY, maxY }
   * @param {number} [options.viewportWidth=800] - Viewport width in pixels
   * @param {number} [options.viewportHeight=600] - Viewport height in pixels
   * @param {number} [options.offsetX=0] - Fixed X offset from target
   * @param {number} [options.offsetY=0] - Fixed Y offset from target
   */
  constructor(options = {}) {
    /** @type {number} Current camera X position (top-left of viewport in world space) */
    this.x = 0;

    /** @type {number} Current camera Y position (top-left of viewport in world space) */
    this.y = 0;

    /** @type {Object|null} Target object with x, y properties to follow */
    this.target = options.target ?? null;

    /** @type {Object|null} Deadzone dimensions { width, height } */
    this.deadzone = options.deadzone ?? null;

    /** @type {number} Smooth follow interpolation speed (0-1) */
    this.lerp = options.lerp ?? 0.1;

    /** @type {number} Zoom scale factor */
    this.zoom = options.zoom ?? 1;

    /** @type {Object|null} Scroll bounds { minX, maxX, minY, maxY } */
    this.bounds = options.bounds ?? null;

    /** @type {number} Viewport width in pixels */
    this.viewportWidth = options.viewportWidth ?? 800;

    /** @type {number} Viewport height in pixels */
    this.viewportHeight = options.viewportHeight ?? 600;

    /** @type {number} Fixed X offset from target */
    this.offsetX = options.offsetX ?? 0;

    /** @type {number} Fixed Y offset from target */
    this.offsetY = options.offsetY ?? 0;

    // Shake state
    /** @private */
    this._shakeIntensity = 0;
    /** @private */
    this._shakeDuration = 0;
    /** @private */
    this._shakeTime = 0;
    /** @private */
    this._shakeOffsetX = 0;
    /** @private */
    this._shakeOffsetY = 0;

    // Store initial values for reset
    this._initialX = this.x;
    this._initialY = this.y;
  }

  /**
   * Update camera position to follow target
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this.target) return;

    // Target center position in world space
    const targetX = this.target.x + this.offsetX;
    const targetY = this.target.y + this.offsetY;

    // Current camera center position
    const cameraCenterX = this.x + this.viewportWidth / 2;
    const cameraCenterY = this.y + this.viewportHeight / 2;

    // Calculate desired camera position
    let desiredX = this.x;
    let desiredY = this.y;

    if (this.deadzone) {
      // Only move camera if target leaves deadzone
      const halfDeadW = this.deadzone.width / 2;
      const halfDeadH = this.deadzone.height / 2;

      // Check horizontal deadzone
      if (targetX < cameraCenterX - halfDeadW) {
        desiredX = targetX + halfDeadW - this.viewportWidth / 2;
      } else if (targetX > cameraCenterX + halfDeadW) {
        desiredX = targetX - halfDeadW - this.viewportWidth / 2;
      }

      // Check vertical deadzone
      if (targetY < cameraCenterY - halfDeadH) {
        desiredY = targetY + halfDeadH - this.viewportHeight / 2;
      } else if (targetY > cameraCenterY + halfDeadH) {
        desiredY = targetY - halfDeadH - this.viewportHeight / 2;
      }
    } else {
      // Center on target
      desiredX = targetX - this.viewportWidth / 2;
      desiredY = targetY - this.viewportHeight / 2;
    }

    // Smooth lerp toward desired position
    this.x += (desiredX - this.x) * this.lerp;
    this.y += (desiredY - this.y) * this.lerp;

    // Apply bounds constraints
    if (this.bounds) {
      const maxScrollX = this.bounds.maxX - this.viewportWidth;
      const maxScrollY = this.bounds.maxY - this.viewportHeight;

      this.x = Math.max(this.bounds.minX, Math.min(this.x, maxScrollX));
      this.y = Math.max(this.bounds.minY, Math.min(this.y, maxScrollY));
    }

    // Update shake effect
    this._updateShake(dt);
  }

  /**
   * Update shake effect
   * @private
   * @param {number} dt - Delta time in seconds
   */
  _updateShake(dt) {
    if (this._shakeDuration > 0 && this._shakeTime < this._shakeDuration) {
      this._shakeTime += dt;
      const progress = this._shakeTime / this._shakeDuration;
      const decay = 1 - progress; // Linear decay

      this._shakeOffsetX = (Math.random() - 0.5) * 2 * this._shakeIntensity * decay;
      this._shakeOffsetY = (Math.random() - 0.5) * 2 * this._shakeIntensity * decay;

      if (this._shakeTime >= this._shakeDuration) {
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
        this._shakeDuration = 0;
        this._shakeTime = 0;
      }
    }
  }

  /**
   * Get the camera offset for rendering (includes shake)
   * Override this in subclasses for custom scroll behavior
   * @returns {{x: number, y: number}} Camera offset
   */
  getOffset() {
    return {
      x: this.x + this._shakeOffsetX,
      y: this.y + this._shakeOffsetY,
    };
  }

  /**
   * Set camera position directly (bypasses follow)
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Camera2D} this for chaining
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Set new target to follow
   * @param {Object} target - Object with x, y properties
   * @returns {Camera2D} this for chaining
   */
  setTarget(target) {
    this.target = target;
    return this;
  }

  /**
   * Apply camera shake effect
   * @param {number} intensity - Shake amount in pixels
   * @param {number} duration - Shake duration in seconds
   * @returns {Camera2D} this for chaining
   */
  shake(intensity, duration) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeTime = 0;
    return this;
  }

  /**
   * Stop any active shake immediately
   * @returns {Camera2D} this for chaining
   */
  stopShake() {
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeTime = 0;
    this._shakeOffsetX = 0;
    this._shakeOffsetY = 0;
    return this;
  }

  /**
   * Check if a point/bounds is visible in the viewport
   * @param {Object} bounds - Object with x, y, width, height (world coordinates)
   * @returns {boolean} True if any part of bounds is visible
   */
  isVisible(bounds) {
    if (!bounds) return false;

    const cameraRight = this.x + this.viewportWidth;
    const cameraBottom = this.y + this.viewportHeight;
    const boundsRight = bounds.x + (bounds.width || 0);
    const boundsBottom = bounds.y + (bounds.height || 0);

    // AABB intersection test
    return !(
      bounds.x > cameraRight ||
      boundsRight < this.x ||
      bounds.y > cameraBottom ||
      boundsBottom < this.y
    );
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X position
   * @param {number} screenY - Screen Y position
   * @returns {{x: number, y: number}} World coordinates
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX / this.zoom + this.x,
      y: screenY / this.zoom + this.y,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - World X position
   * @param {number} worldY - World Y position
   * @returns {{x: number, y: number}} Screen coordinates
   */
  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom,
      y: (worldY - this.y) * this.zoom,
    };
  }

  /**
   * Get the camera's world bounds (what's currently visible)
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getWorldBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.viewportWidth / this.zoom,
      height: this.viewportHeight / this.zoom,
    };
  }

  /**
   * Reset camera to initial position and clear shake
   * @returns {Camera2D} this for chaining
   */
  reset() {
    this.x = this._initialX;
    this.y = this._initialY;
    this.stopShake();
    return this;
  }

  /**
   * Check if camera is currently shaking
   * @returns {boolean}
   */
  isShaking() {
    return this._shakeDuration > 0 && this._shakeTime < this._shakeDuration;
  }
}

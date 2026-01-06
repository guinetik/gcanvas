/**
 * IsometricCamera - Camera for isometric views with step-based rotation
 * 
 * Unlike Camera3D which provides free 3D rotation, IsometricCamera is designed
 * for isometric games where the view rotates in fixed increments (45° or 90°).
 * 
 * Features:
 * - Rotate view in fixed steps (default 45°)
 * - Smooth animated transitions between angles
 * - Maintains isometric perspective (no distortion)
 * - Easy integration with IsometricScene
 * 
 * @example
 * // Create camera with 45° rotation steps
 * const camera = new IsometricCamera({
 *   rotationStep: Math.PI / 4,  // 45 degrees
 *   animationDuration: 0.5      // 500ms transition
 * });
 * 
 * // Rotate the view
 * camera.rotateRight(); // Animate to next 45° position
 * camera.rotateLeft();  // Animate to previous 45° position
 * 
 * // In update loop
 * camera.update(dt);
 * 
 * // Use angle in projection
 * const projected = scene.toIsometric(x, y, z, camera.angle);
 */
export class IsometricCamera {
  /**
   * Create an IsometricCamera instance
   * @param {object} options - Configuration options
   * @param {number} [options.angle=0] - Initial viewing angle in radians
   * @param {number} [options.rotationStep=Math.PI/2] - Rotation step size (default 90°)
   * @param {number} [options.animationDuration=0.4] - Transition duration in seconds
   * @param {string} [options.easing='easeInOutCubic'] - Easing function name
   */
  constructor(options = {}) {
    /** Current viewing angle in radians */
    this.angle = options.angle ?? 0;
    
    /** Target angle for animation */
    this._targetAngle = this.angle;
    
    /** Rotation step size in radians (default 90°) */
    this.rotationStep = options.rotationStep ?? Math.PI / 2;
    
    /** Animation duration in seconds */
    this.animationDuration = options.animationDuration ?? 0.4;
    
    /** Easing function type */
    this.easingType = options.easing ?? 'easeInOutCubic';
    
    /** Animation state */
    this._animating = false;
    this._animationProgress = 0;
    this._startAngle = 0;
    
    /** Callbacks */
    this._onRotationStart = null;
    this._onRotationEnd = null;
  }

  /**
   * Rotate view to the right (clockwise) by one step
   * @returns {IsometricCamera} this for chaining
   */
  rotateRight() {
    if (this._animating) return this;
    this._startRotation(this._targetAngle + this.rotationStep);
    return this;
  }

  /**
   * Rotate view to the left (counter-clockwise) by one step
   * @returns {IsometricCamera} this for chaining
   */
  rotateLeft() {
    if (this._animating) return this;
    this._startRotation(this._targetAngle - this.rotationStep);
    return this;
  }

  /**
   * Rotate to a specific angle (animated)
   * @param {number} angle - Target angle in radians
   * @returns {IsometricCamera} this for chaining
   */
  rotateTo(angle) {
    if (this._animating) return this;
    this._startRotation(angle);
    return this;
  }

  /**
   * Rotate to a specific angle immediately (no animation)
   * @param {number} angle - Target angle in radians
   * @returns {IsometricCamera} this for chaining
   */
  setAngle(angle) {
    this.angle = angle;
    this._targetAngle = angle;
    this._animating = false;
    return this;
  }

  /**
   * Start rotation animation
   * @param {number} targetAngle - Target angle
   * @private
   */
  _startRotation(targetAngle) {
    this._startAngle = this.angle;
    this._targetAngle = targetAngle;
    this._animationProgress = 0;
    this._animating = true;
    
    if (this._onRotationStart) {
      this._onRotationStart(this._startAngle, this._targetAngle);
    }
  }

  /**
   * Update camera animation (call each frame)
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this._animating) return;

    // Advance animation progress
    this._animationProgress += dt / this.animationDuration;

    if (this._animationProgress >= 1) {
      // Animation complete
      this._animationProgress = 1;
      this.angle = this._targetAngle;
      this._animating = false;

      if (this._onRotationEnd) {
        this._onRotationEnd(this.angle);
      }
    } else {
      // Interpolate angle using easing
      const t = this._ease(this._animationProgress);
      this.angle = this._startAngle + (this._targetAngle - this._startAngle) * t;
    }
  }

  /**
   * Apply easing function to progress value
   * @param {number} t - Progress 0-1
   * @returns {number} Eased value 0-1
   * @private
   */
  _ease(t) {
    switch (this.easingType) {
      case 'linear':
        return t;
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeInCubic':
        return t * t * t;
      case 'easeOutCubic':
        return (--t) * t * t + 1;
      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      case 'easeOutBack':
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      default:
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
  }

  /**
   * Check if camera is currently animating
   * @returns {boolean} True if animating
   */
  isAnimating() {
    return this._animating;
  }

  /**
   * Get the current angle in degrees
   * @returns {number} Angle in degrees
   */
  getAngleDegrees() {
    return (this.angle * 180 / Math.PI) % 360;
  }

  /**
   * Get normalized angle (0 to 2π)
   * @returns {number} Normalized angle in radians
   */
  getNormalizedAngle() {
    let normalized = this.angle % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    return normalized;
  }

  /**
   * Set callback for rotation start
   * @param {Function} callback - Called when rotation starts (startAngle, targetAngle)
   * @returns {IsometricCamera} this for chaining
   */
  onRotationStart(callback) {
    this._onRotationStart = callback;
    return this;
  }

  /**
   * Set callback for rotation end
   * @param {Function} callback - Called when rotation completes (finalAngle)
   * @returns {IsometricCamera} this for chaining
   */
  onRotationEnd(callback) {
    this._onRotationEnd = callback;
    return this;
  }

  /**
   * Reset camera to initial angle
   * @returns {IsometricCamera} this for chaining
   */
  reset() {
    this.setAngle(0);
    return this;
  }
}

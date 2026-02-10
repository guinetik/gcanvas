/**
 * Camera3D - Pseudo-3D projection and mouse-controlled rotation
 *
 * Provides 3D to 2D projection with perspective, rotation controls,
 * and interactive mouse/touch rotation for 2D canvas applications.
 *
 * Supports inertia for smooth, physics-based camera movement.
 *
 * @example
 * // Create camera with initial settings
 * const camera = new Camera3D({
 *   rotationX: 0.3,
 *   rotationY: -0.4,
 *   perspective: 800,
 *   inertia: true,        // Enable inertia
 *   friction: 0.92        // Velocity decay (0.9 = fast stop, 0.98 = slow drift)
 * });
 *
 * // Enable mouse drag rotation
 * camera.enableMouseControl(canvas);
 *
 * // In render loop - project 3D points to 2D
 * const { x, y, scale, z } = camera.project(x3d, y3d, z3d);
 *
 * // Draw at projected position (centered on screen)
 * ctx.fillRect(centerX + x, centerY + y, 10 * scale, 10 * scale);
 */
export class Camera3D {
  /**
   * Create a new Camera3D instance
   * @param {object} options - Configuration options
   * @param {number} [options.rotationX=0] - Initial X rotation (tilt up/down) in radians
   * @param {number} [options.rotationY=0] - Initial Y rotation (spin left/right) in radians
   * @param {number} [options.rotationZ=0] - Initial Z rotation (roll) in radians
   * @param {number} [options.x=0] - Initial X position in world space
   * @param {number} [options.y=0] - Initial Y position in world space
   * @param {number} [options.z=0] - Initial Z position in world space
   * @param {number} [options.perspective=800] - Perspective distance (higher = less distortion)
   * @param {number} [options.sensitivity=0.005] - Mouse drag sensitivity
   * @param {number} [options.minRotationX=-1.5] - Minimum X rotation limit
   * @param {number} [options.maxRotationX=1.5] - Maximum X rotation limit
   * @param {boolean} [options.clampX=true] - Whether to clamp X rotation
   * @param {boolean} [options.autoRotate=false] - Enable auto-rotation
   * @param {number} [options.autoRotateSpeed=0.5] - Auto-rotation speed (radians per second)
   * @param {boolean} [options.inertia=false] - Enable inertia (momentum after release)
   * @param {number} [options.friction=0.92] - Velocity decay per frame (0.9 = fast stop, 0.98 = slow drift)
   * @param {number} [options.velocityScale=1.0] - Multiplier for initial throw velocity
   */
  constructor(options = {}) {
    // Rotation state
    this.rotationX = options.rotationX ?? 0;
    this.rotationY = options.rotationY ?? 0;
    this.rotationZ = options.rotationZ ?? 0;
    this.screenRotation = options.screenRotation ?? 0; // post-camera screen-plane spin

    // Position state (camera location in world space)
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.z = options.z ?? 0;

    // Store initial values for reset
    this._initialRotationX = this.rotationX;
    this._initialRotationY = this.rotationY;
    this._initialRotationZ = this.rotationZ;
    this._initialScreenRotation = this.screenRotation;
    this._initialX = this.x;
    this._initialY = this.y;
    this._initialZ = this.z;

    // Perspective
    this.perspective = options.perspective ?? 800;

    // Mouse control settings
    this.sensitivity = options.sensitivity ?? 0.005;
    this.minRotationX = options.minRotationX ?? -1.5;
    this.maxRotationX = options.maxRotationX ?? 1.5;
    this.clampX = options.clampX ?? true;

    // Auto-rotate
    this.autoRotate = options.autoRotate ?? false;
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.5;
    this.autoRotateAxis = options.autoRotateAxis ?? 'y'; // 'x', 'y', or 'z'

    // Inertia settings
    this.inertia = options.inertia ?? false;
    this.friction = options.friction ?? 0.92;
    this.velocityScale = options.velocityScale ?? 1.0;

    // Velocity state for inertia
    this._velocityX = 0;
    this._velocityY = 0;
    this._lastDeltaX = 0;
    this._lastDeltaY = 0;
    this._lastMoveTime = 0;

    // Mouse-to-rotation axis mapping (configurable via enableMouseControl)
    this._hAxis = 'rotationY';  // horizontal drag controls this property
    this._vAxis = 'rotationX';  // vertical drag controls this property

    // Internal state for mouse control
    this._isDragging = false;
    this._lastMouseX = 0;
    this._lastMouseY = 0;
    this._canvas = null;
    this._boundHandlers = null;

    // Follow target state
    this._followTarget = null;
    this._followOffset = { x: 0, y: 0, z: 0 };
    this._followLookAt = true;  // Auto-orient to look at target's forward direction
    this._followLerp = 0.1;     // Interpolation speed (0-1, higher = snappier)

    // Position animation state
    this._targetX = null;
    this._targetY = null;
    this._targetZ = null;
    this._targetRotationX = null;
    this._targetRotationY = null;
    this._positionLerp = 0.05;  // Default smooth movement speed
  }

  /**
   * Project a 3D point to 2D screen coordinates
   * @param {number} x - X coordinate in 3D space
   * @param {number} y - Y coordinate in 3D space
   * @param {number} z - Z coordinate in 3D space
   * @returns {{x: number, y: number, z: number, scale: number}} Projected 2D coordinates and depth info
   */
  project(x, y, z) {
    // Translate world relative to camera position
    // (Moving camera right = moving world left)
    x -= this.x;
    y -= this.y;
    z -= this.z;

    // Rotate around Z axis (roll)
    if (this.rotationZ !== 0) {
      const cosZ = Math.cos(this.rotationZ);
      const sinZ = Math.sin(this.rotationZ);
      const x0 = x;
      const y0 = y;
      x = x0 * cosZ - y0 * sinZ;
      y = x0 * sinZ + y0 * cosZ;
    }

    // Rotate around Y axis (horizontal spin)
    const cosY = Math.cos(this.rotationY);
    const sinY = Math.sin(this.rotationY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Rotate around X axis (vertical tilt)
    const cosX = Math.cos(this.rotationX);
    const sinX = Math.sin(this.rotationX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // Screen-plane rotation (clock-like spin, applied after all camera rotations)
    let finalX = x1, finalY = y1;
    if (this.screenRotation !== 0) {
      const cosS = Math.cos(this.screenRotation);
      const sinS = Math.sin(this.screenRotation);
      finalX = x1 * cosS - y1 * sinS;
      finalY = x1 * sinS + y1 * cosS;
    }

    // Perspective projection
    const scale = this.perspective / (this.perspective + z2);
    const screenX = finalX * scale;
    const screenY = finalY * scale;

    return {
      x: screenX,
      y: screenY,
      z: z2,      // Depth (for sorting)
      scale: scale // Scale factor (for size adjustment)
    };
  }

  /**
   * Project multiple points at once
   * @param {Array<{x: number, y: number, z: number}>} points - Array of 3D points
   * @returns {Array<{x: number, y: number, z: number, scale: number}>} Array of projected points
   */
  projectAll(points) {
    return points.map(p => this.project(p.x, p.y, p.z));
  }

  /**
   * Update camera for auto-rotation, inertia, and follow mode (call in update loop)
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Follow target mode - position camera relative to target
    if (this._followTarget) {
      const target = this._followTarget;
      const targetX = (target.x ?? 0) + this._followOffset.x;
      const targetY = (target.y ?? 0) + this._followOffset.y;
      const targetZ = (target.z ?? 0) + this._followOffset.z;

      // Smooth interpolation to target position
      this.x += (targetX - this.x) * this._followLerp;
      this.y += (targetY - this.y) * this._followLerp;
      this.z += (targetZ - this.z) * this._followLerp;

      // Auto-orient to look toward origin (or specified look target)
      if (this._followLookAt) {
        const lookX = this._followLookAtTarget?.x ?? 0;
        const lookY = this._followLookAtTarget?.y ?? 0;
        const lookZ = this._followLookAtTarget?.z ?? 0;

        // Calculate direction from camera to look target
        const dx = lookX - this.x;
        const dy = lookY - this.y;
        const dz = lookZ - this.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);

        // Target rotation to face the look target
        const targetRotY = Math.atan2(dx, dz);
        const targetRotX = Math.atan2(-dy, distXZ);

        // Smooth rotation interpolation
        this.rotationY += this._angleDiff(this.rotationY, targetRotY) * this._followLerp;
        this.rotationX += (targetRotX - this.rotationX) * this._followLerp;
      }
    }
    // Animated position movement (moveTo)
    else if (this._targetX !== null) {
      const lerp = this._positionLerp;

      // Interpolate position
      this.x += (this._targetX - this.x) * lerp;
      this.y += (this._targetY - this.y) * lerp;
      this.z += (this._targetZ - this.z) * lerp;

      // Interpolate rotation if targets set
      if (this._targetRotationX !== null) {
        this.rotationX += (this._targetRotationX - this.rotationX) * lerp;
      }
      if (this._targetRotationY !== null) {
        this.rotationY += this._angleDiff(this.rotationY, this._targetRotationY) * lerp;
      }

      // Check if we've arrived (close enough)
      const posDist = Math.abs(this._targetX - this.x) +
                      Math.abs(this._targetY - this.y) +
                      Math.abs(this._targetZ - this.z);
      if (posDist < 0.1) {
        this.x = this._targetX;
        this.y = this._targetY;
        this.z = this._targetZ;
        this._targetX = null;
        this._targetY = null;
        this._targetZ = null;
        this._targetRotationX = null;
        this._targetRotationY = null;
      }
    }

    // Apply inertia when not dragging and not following
    if (this.inertia && !this._isDragging && !this._followTarget) {
      // Apply velocity to rotation
      if (Math.abs(this._velocityX) > 0.0001 || Math.abs(this._velocityY) > 0.0001) {
        this[this._hAxis] += this._velocityY;
        this[this._vAxis] += this._velocityX;

        // Clamp X rotation
        if (this.clampX) {
          this.rotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.rotationX));
        }

        // Apply friction (exponential decay)
        this._velocityX *= this.friction;
        this._velocityY *= this.friction;

        // Stop if velocity is negligible
        if (Math.abs(this._velocityX) < 0.0001) this._velocityX = 0;
        if (Math.abs(this._velocityY) < 0.0001) this._velocityY = 0;
      }
    }

    // Auto-rotate when not dragging, not following, and no significant velocity
    if (this.autoRotate && !this._isDragging && !this._followTarget) {
      const hasVelocity = Math.abs(this._velocityX) > 0.001 || Math.abs(this._velocityY) > 0.001;
      if (!hasVelocity) {
        const delta = this.autoRotateSpeed * dt;
        switch (this.autoRotateAxis) {
          case 'x':
            this.rotationX += delta;
            break;
          case 'y':
            this.rotationY += delta;
            break;
          case 'z':
            this.rotationZ += delta;
            break;
        }
      }
    }
  }

  /**
   * Calculate shortest angle difference (handles wraparound)
   * @private
   */
  _angleDiff(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  /**
   * Enable mouse/touch drag rotation on a canvas
   * @param {HTMLCanvasElement} canvas - The canvas element to attach controls to
   * @param {object} [options] - Control options
   * @param {boolean} [options.invertX=false] - Invert horizontal rotation
   * @param {boolean} [options.invertY=false] - Invert vertical rotation
   * @param {string} [options.horizontalAxis='rotationY'] - Rotation property controlled by horizontal drag
   * @param {string} [options.verticalAxis='rotationX'] - Rotation property controlled by vertical drag
   * @returns {Camera3D} Returns this for chaining
   */
  enableMouseControl(canvas, options = {}) {
    if (this._canvas) {
      this.disableMouseControl();
    }

    this._canvas = canvas;
    const invertX = options.invertX ? -1 : 1;
    const invertY = options.invertY ? -1 : 1;
    this._hAxis = options.horizontalAxis || 'rotationY';
    this._vAxis = options.verticalAxis || 'rotationX';

    // Create bound handlers so we can remove them later
    this._boundHandlers = {
      mousedown: (e) => {
        this._isDragging = true;
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
        this._lastMoveTime = performance.now();
        // Stop any existing inertia
        this._velocityX = 0;
        this._velocityY = 0;
      },

      mousemove: (e) => {
        if (!this._isDragging) return;

        const deltaX = e.clientX - this._lastMouseX;
        const deltaY = e.clientY - this._lastMouseY;

        const scaledDeltaX = deltaX * this.sensitivity * invertX;
        const scaledDeltaY = deltaY * this.sensitivity * invertY;

        this[this._hAxis] += scaledDeltaX;
        this[this._vAxis] += scaledDeltaY;

        if (this.clampX) {
          this.rotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.rotationX));
        }

        // Track velocity for inertia (store last delta)
        if (this.inertia) {
          this._lastDeltaX = scaledDeltaY;
          this._lastDeltaY = scaledDeltaX;
          this._lastMoveTime = performance.now();
        }

        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
      },

      mouseup: () => {
        // Transfer last delta to velocity for inertia throw
        if (this.inertia && this._isDragging) {
          const timeSinceMove = performance.now() - this._lastMoveTime;
          // Only apply inertia if the release was quick (within 50ms of last move)
          if (timeSinceMove < 50) {
            this._velocityX = this._lastDeltaX * this.velocityScale;
            this._velocityY = this._lastDeltaY * this.velocityScale;
          }
        }
        this._isDragging = false;
      },

      mouseleave: () => {
        // Apply inertia on mouseleave too
        if (this.inertia && this._isDragging) {
          const timeSinceMove = performance.now() - this._lastMoveTime;
          if (timeSinceMove < 50) {
            this._velocityX = this._lastDeltaX * this.velocityScale;
            this._velocityY = this._lastDeltaY * this.velocityScale;
          }
        }
        this._isDragging = false;
      },

      touchstart: (e) => {
        if (e.touches.length === 1) {
          this._isDragging = true;
          this._lastMouseX = e.touches[0].clientX;
          this._lastMouseY = e.touches[0].clientY;
          this._lastMoveTime = performance.now();
          // Stop any existing inertia
          this._velocityX = 0;
          this._velocityY = 0;
        }
      },

      touchmove: (e) => {
        if (!this._isDragging || e.touches.length !== 1) return;
        e.preventDefault();

        const deltaX = e.touches[0].clientX - this._lastMouseX;
        const deltaY = e.touches[0].clientY - this._lastMouseY;

        const scaledDeltaX = deltaX * this.sensitivity * invertX;
        const scaledDeltaY = deltaY * this.sensitivity * invertY;

        this[this._hAxis] += scaledDeltaX;
        this[this._vAxis] += scaledDeltaY;

        if (this.clampX) {
          this.rotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.rotationX));
        }

        // Track velocity for inertia
        if (this.inertia) {
          this._lastDeltaX = scaledDeltaY;
          this._lastDeltaY = scaledDeltaX;
          this._lastMoveTime = performance.now();
        }

        this._lastMouseX = e.touches[0].clientX;
        this._lastMouseY = e.touches[0].clientY;
      },

      touchend: () => {
        // Transfer last delta to velocity for inertia throw
        if (this.inertia && this._isDragging) {
          const timeSinceMove = performance.now() - this._lastMoveTime;
          if (timeSinceMove < 50) {
            this._velocityX = this._lastDeltaX * this.velocityScale;
            this._velocityY = this._lastDeltaY * this.velocityScale;
          }
        }
        this._isDragging = false;
      },

      dblclick: () => {
        this.reset();
      }
    };

    // Attach all event listeners
    canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
    canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
    canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
    canvas.addEventListener('touchstart', this._boundHandlers.touchstart);
    canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    canvas.addEventListener('touchend', this._boundHandlers.touchend);
    canvas.addEventListener('dblclick', this._boundHandlers.dblclick);

    return this;
  }

  /**
   * Disable mouse/touch controls
   * @returns {Camera3D} Returns this for chaining
   */
  disableMouseControl() {
    if (this._canvas && this._boundHandlers) {
      this._canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
      this._canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
      this._canvas.removeEventListener('mouseup', this._boundHandlers.mouseup);
      this._canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
      this._canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
      this._canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
      this._canvas.removeEventListener('touchend', this._boundHandlers.touchend);
      this._canvas.removeEventListener('dblclick', this._boundHandlers.dblclick);
    }

    this._canvas = null;
    this._boundHandlers = null;
    return this;
  }

  /**
   * Reset rotation and position to initial values, stop inertia and following
   * @returns {Camera3D} Returns this for chaining
   */
  reset() {
    this.rotationX = this._initialRotationX;
    this.rotationY = this._initialRotationY;
    this.rotationZ = this._initialRotationZ;
    this.screenRotation = this._initialScreenRotation;
    this.x = this._initialX;
    this.y = this._initialY;
    this.z = this._initialZ;
    this._velocityX = 0;
    this._velocityY = 0;
    this._followTarget = null;
    this._targetX = null;
    this._targetY = null;
    this._targetZ = null;
    return this;
  }

  /**
   * Stop any inertia motion immediately
   * @returns {Camera3D} Returns this for chaining
   */
  stopInertia() {
    this._velocityX = 0;
    this._velocityY = 0;
    return this;
  }

  /**
   * Set camera position in world space
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} z - Z position
   * @returns {Camera3D} Returns this for chaining
   */
  setPosition(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Animate camera to a new position (and optionally rotation)
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   * @param {number} z - Target Z position
   * @param {object} [options] - Animation options
   * @param {number} [options.rotationX] - Target X rotation
   * @param {number} [options.rotationY] - Target Y rotation
   * @param {number} [options.lerp=0.05] - Interpolation speed (0-1)
   * @returns {Camera3D} Returns this for chaining
   */
  moveTo(x, y, z, options = {}) {
    this._targetX = x;
    this._targetY = y;
    this._targetZ = z;
    this._targetRotationX = options.rotationX ?? null;
    this._targetRotationY = options.rotationY ?? null;
    this._positionLerp = options.lerp ?? 0.05;
    return this;
  }

  /**
   * Follow a target object (position camera relative to target)
   * @param {object} target - Object with x, y, z properties to follow
   * @param {object} [options] - Follow options
   * @param {number} [options.offsetX=0] - X offset from target
   * @param {number} [options.offsetY=0] - Y offset from target
   * @param {number} [options.offsetZ=0] - Z offset from target
   * @param {boolean} [options.lookAt=true] - Auto-orient to look at lookAtTarget
   * @param {object} [options.lookAtTarget=null] - Point to look at (default: origin)
   * @param {number} [options.lerp=0.1] - Interpolation speed (0-1, higher = snappier)
   * @returns {Camera3D} Returns this for chaining
   */
  follow(target, options = {}) {
    this._followTarget = target;
    this._followOffset = {
      x: options.offsetX ?? 0,
      y: options.offsetY ?? 0,
      z: options.offsetZ ?? 0,
    };
    this._followLookAt = options.lookAt ?? true;
    this._followLookAtTarget = options.lookAtTarget ?? null;
    this._followLerp = options.lerp ?? 0.1;
    return this;
  }

  /**
   * Stop following target and optionally reset to initial position
   * @param {boolean} [resetPosition=false] - Whether to animate back to initial position
   * @returns {Camera3D} Returns this for chaining
   */
  unfollow(resetPosition = false) {
    this._followTarget = null;
    if (resetPosition) {
      this.moveTo(this._initialX, this._initialY, this._initialZ, {
        rotationX: this._initialRotationX,
        rotationY: this._initialRotationY,
        lerp: 0.05,
      });
    }
    return this;
  }

  /**
   * Check if camera is currently following a target
   * @returns {boolean} True if following a target
   */
  isFollowing() {
    return this._followTarget !== null;
  }

  /**
   * Set rotation angles
   * @param {number} x - X rotation in radians
   * @param {number} y - Y rotation in radians
   * @param {number} [z=0] - Z rotation in radians
   * @returns {Camera3D} Returns this for chaining
   */
  setRotation(x, y, z = 0) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this;
  }

  /**
   * Add to current rotation
   * @param {number} dx - Delta X rotation in radians
   * @param {number} dy - Delta Y rotation in radians
   * @param {number} [dz=0] - Delta Z rotation in radians
   * @returns {Camera3D} Returns this for chaining
   */
  rotate(dx, dy, dz = 0) {
    this.rotationX += dx;
    this.rotationY += dy;
    this.rotationZ += dz;

    if (this.clampX) {
      this.rotationX = Math.max(this.minRotationX, Math.min(this.maxRotationX, this.rotationX));
    }

    return this;
  }

  /**
   * Check if currently being dragged by user
   * @returns {boolean} True if user is dragging
   */
  isDragging() {
    return this._isDragging;
  }

  /**
   * Look at a specific point (sets rotation to face that direction from current position)
   * @param {number} x - Target X in world space
   * @param {number} y - Target Y in world space
   * @param {number} z - Target Z in world space
   * @returns {Camera3D} Returns this for chaining
   */
  lookAt(x, y, z) {
    // Calculate direction from camera position to target
    const dx = x - this.x;
    const dy = y - this.y;
    const dz = z - this.z;
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    this.rotationY = Math.atan2(dx, dz);
    this.rotationX = Math.atan2(-dy, distXZ);
    return this;
  }
}

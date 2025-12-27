import { GameObject } from './go.js';
import { Painter } from '../../painter/painter.js';

/**
 * Sprite - A MovieClip-style GameObject with timeline animation
 *
 * A Sprite manages a collection of Shapes as frames in a timeline.
 * Each frame displays a different Shape, creating frame-by-frame animation
 * similar to Adobe Flash MovieClip.
 *
 * Supports named animations for complex sprite sheets:
 *
 * @example
 * const sprite = new Sprite(game, {
 *   frameRate: 12,
 *   loop: true
 * });
 *
 * // Add shapes as frames
 * sprite.addFrame(new Circle({ radius: 20, color: 'red' }));
 * sprite.addFrame(new Circle({ radius: 25, color: 'orange' }));
 * sprite.addFrame(new Circle({ radius: 20, color: 'red' }));
 *
 * // Control playback
 * sprite.play();
 * sprite.gotoAndStop(0);
 * sprite.gotoAndPlay(1);
 *
 * @example
 * // Named animations
 * sprite.addAnimation('idle', [idleShape]);
 * sprite.addAnimation('walk', [walkFrame1, walkFrame2, walkFrame3]);
 * sprite.addAnimation('jump', [jumpShape]);
 *
 * sprite.playAnimation('walk');  // Plays walk animation
 * sprite.playAnimation('idle');  // Switch to idle
 */
export class Sprite extends GameObject {
  /**
   * Creates a new Sprite
   * @param {Game} game - The game instance
   * @param {Object} options - Configuration options
   * @param {number} [options.frameRate=12] - Frames per second for playback
   * @param {boolean} [options.loop=true] - Whether to loop the animation
   * @param {boolean} [options.autoPlay=false] - Whether to start playing automatically
   * @param {Array<Shape>} [options.frames=[]] - Initial frames to add
   */
  constructor(game, options = {}) {
    super(game, options);

    // Timeline properties
    this._frames = [];
    this._currentFrame = 0;
    this._frameAccumulator = 0;
    this._isPlaying = options.autoPlay || false;
    this._loop = options.loop !== undefined ? options.loop : true;
    this._frameRate = options.frameRate || 12; // frames per second
    this._frameDuration = 1 / this._frameRate; // seconds per frame

    // Named animations support
    this._animations = new Map(); // name -> { frames: Shape[], loop: boolean, frameRate: number }
    this._currentAnimation = null; // current animation name

    // Add initial frames if provided
    if (options.frames && Array.isArray(options.frames)) {
      options.frames.forEach(frame => this.addFrame(frame));
    }
  }

  // ==================== Named Animations ====================

  /**
   * Adds a named animation
   * @param {string} name - Animation name (e.g., 'walk', 'idle', 'jump')
   * @param {Array<Shape>} frames - Array of shapes for this animation
   * @param {Object} [options] - Animation options
   * @param {boolean} [options.loop=true] - Whether this animation loops
   * @param {number} [options.frameRate] - Frame rate for this animation (uses sprite's default if not set)
   * @returns {Sprite} This sprite for chaining
   */
  addAnimation(name, frames, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Sprite.addAnimation: name is required');
    }
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error('Sprite.addAnimation: frames array is required');
    }

    // Set parent reference for all frames
    frames.forEach(frame => {
      frame.parent = this;
    });

    this._animations.set(name, {
      frames,
      loop: options.loop !== undefined ? options.loop : true,
      frameRate: options.frameRate || null, // null means use sprite's default
    });

    return this;
  }

  /**
   * Removes a named animation
   * @param {string} name - Animation name to remove
   * @returns {boolean} True if animation was found and removed
   */
  removeAnimation(name) {
    const anim = this._animations.get(name);
    if (anim) {
      anim.frames.forEach(frame => {
        frame.parent = null;
      });
      this._animations.delete(name);

      // If this was the current animation, clear it
      if (this._currentAnimation === name) {
        this._currentAnimation = null;
        this._frames = [];
      }
      return true;
    }
    return false;
  }

  /**
   * Plays a named animation
   * @param {string} name - Animation name to play
   * @param {boolean} [restart=false] - If true, restarts animation even if already playing
   * @returns {Sprite} This sprite for chaining
   */
  playAnimation(name, restart = false) {
    const anim = this._animations.get(name);
    if (!anim) {
      console.warn(`Sprite.playAnimation: animation '${name}' not found`);
      return this;
    }

    // If already playing this animation and not forcing restart, do nothing
    if (this._currentAnimation === name && this._isPlaying && !restart) {
      return this;
    }

    // Switch to this animation's frames
    this._currentAnimation = name;
    this._frames = anim.frames;
    this._loop = anim.loop;

    // Use animation-specific frame rate if set
    if (anim.frameRate !== null) {
      this._frameRate = anim.frameRate;
      this._frameDuration = 1 / this._frameRate;
    }

    // Reset and play
    this._currentFrame = 0;
    this._frameAccumulator = 0;
    this._isPlaying = true;

    return this;
  }

  /**
   * Stops and switches to a named animation at frame 0
   * @param {string} name - Animation name
   * @returns {Sprite} This sprite for chaining
   */
  stopAnimation(name) {
    const anim = this._animations.get(name);
    if (!anim) {
      console.warn(`Sprite.stopAnimation: animation '${name}' not found`);
      return this;
    }

    this._currentAnimation = name;
    this._frames = anim.frames;
    this._loop = anim.loop;
    this._currentFrame = 0;
    this._frameAccumulator = 0;
    this._isPlaying = false;

    return this;
  }

  /**
   * Gets the current animation name
   * @returns {string|null}
   */
  get currentAnimationName() {
    return this._currentAnimation;
  }

  /**
   * Gets all animation names
   * @returns {string[]}
   */
  get animationNames() {
    return Array.from(this._animations.keys());
  }

  /**
   * Checks if an animation exists
   * @param {string} name - Animation name
   * @returns {boolean}
   */
  hasAnimation(name) {
    return this._animations.has(name);
  }

  /**
   * Adds a Shape as a new frame to the timeline
   * @param {Shape} shape - The Shape to add as a frame
   * @returns {number} The frame index
   */
  addFrame(shape) {
    if (!shape) {
      throw new Error('Sprite.addFrame: shape is required');
    }

    // Set parent reference for transform hierarchy
    shape.parent = this;

    // Add to frames collection
    this._frames.push(shape);

    // Mark bounds as dirty since we added a new shape
    this.markBoundsDirty();

    return this._frames.length - 1;
  }

  /**
   * Removes a frame at the specified index
   * @param {number} index - The frame index to remove
   * @returns {Shape|null} The removed shape, or null if index is invalid
   */
  removeFrame(index) {
    if (index < 0 || index >= this._frames.length) {
      return null;
    }

    const removed = this._frames.splice(index, 1)[0];
    if (removed) {
      removed.parent = null;
      this.markBoundsDirty();

      // Adjust current frame if necessary
      if (this._currentFrame >= this._frames.length && this._frames.length > 0) {
        this._currentFrame = this._frames.length - 1;
      }
    }

    return removed;
  }

  /**
   * Removes all frames from the timeline
   */
  clearFrames() {
    this._frames.forEach(frame => {
      frame.parent = null;
    });
    this._frames = [];
    this._currentFrame = 0;
    this.markBoundsDirty();
  }

  /**
   * Gets the total number of frames
   * @returns {number}
   */
  get totalFrames() {
    return this._frames.length;
  }

  /**
   * Gets the current frame index
   * @returns {number}
   */
  get currentFrame() {
    return this._currentFrame;
  }

  /**
   * Gets the current frame Shape
   * @returns {Shape|null}
   */
  get currentShape() {
    return this._frames[this._currentFrame] || null;
  }

  /**
   * Gets all frames
   * @returns {Array<Shape>}
   */
  get frames() {
    return this._frames;
  }

  /**
   * Gets whether the sprite is currently playing
   * @returns {boolean}
   */
  get isPlaying() {
    return this._isPlaying;
  }

  /**
   * Gets whether the sprite will loop
   * @returns {boolean}
   */
  get loop() {
    return this._loop;
  }

  /**
   * Sets whether the sprite will loop
   * @param {boolean} value
   */
  set loop(value) {
    this._loop = value;
  }

  /**
   * Gets the frame rate (frames per second)
   * @returns {number}
   */
  get frameRate() {
    return this._frameRate;
  }

  /**
   * Sets the frame rate (frames per second)
   * @param {number} value
   */
  set frameRate(value) {
    if (value <= 0) {
      throw new Error('Sprite.frameRate must be greater than 0');
    }
    this._frameRate = value;
    this._frameDuration = 1 / value;
  }

  /**
   * Starts playing the timeline
   * @returns {Sprite} This sprite for chaining
   */
  play() {
    this._isPlaying = true;
    return this;
  }

  /**
   * Pauses the timeline at the current frame
   * @returns {Sprite} This sprite for chaining
   */
  pause() {
    this._isPlaying = false;
    return this;
  }

  /**
   * Stops the timeline and resets to frame 0
   * @returns {Sprite} This sprite for chaining
   */
  stop() {
    this._isPlaying = false;
    this._currentFrame = 0;
    this._frameAccumulator = 0;
    return this;
  }

  /**
   * Rewinds to the first frame without stopping playback
   * @returns {Sprite} This sprite for chaining
   */
  rewind() {
    this._currentFrame = 0;
    this._frameAccumulator = 0;
    return this;
  }

  /**
   * Jumps to a specific frame without affecting playback state
   * @param {number} frame - The frame index to jump to
   * @returns {Sprite} This sprite for chaining
   */
  goto(frame) {
    if (this._frames.length === 0) {
      return this;
    }

    // Clamp frame to valid range
    this._currentFrame = Math.max(0, Math.min(frame, this._frames.length - 1));
    this._frameAccumulator = 0;
    return this;
  }

  /**
   * Jumps to a specific frame and stops playback
   * @param {number} frame - The frame index to jump to
   * @returns {Sprite} This sprite for chaining
   */
  gotoAndStop(frame) {
    this.goto(frame);
    this.pause();
    return this;
  }

  /**
   * Jumps to a specific frame and starts playback
   * @param {number} frame - The frame index to jump to
   * @returns {Sprite} This sprite for chaining
   */
  gotoAndPlay(frame) {
    this.goto(frame);
    this.play();
    return this;
  }

  /**
   * Updates the sprite timeline
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);

    if (!this._isPlaying || this._frames.length === 0) {
      return;
    }

    // Accumulate time
    this._frameAccumulator += dt;

    // Advance frames if enough time has passed
    while (this._frameAccumulator >= this._frameDuration) {
      this._frameAccumulator -= this._frameDuration;
      this._advanceFrame();
    }

    // Update current frame if it has an update method
    const currentShape = this.currentShape;
    if (currentShape && typeof currentShape.update === 'function') {
      currentShape.update(dt);
    }
  }

  /**
   * Advances to the next frame
   * @private
   */
  _advanceFrame() {
    this._currentFrame++;

    // Handle end of timeline
    if (this._currentFrame >= this._frames.length) {
      if (this._loop) {
        this._currentFrame = 0;
      } else {
        this._currentFrame = this._frames.length - 1;
        this._isPlaying = false;
      }
    }
  }

  /**
   * Renders the current frame
   */
  draw() {
    super.draw();

    const currentShape = this.currentShape;
    if (!currentShape) {
      return;
    }

    // Only render if the shape is visible
    if (currentShape.visible === false) {
      return;
    }

    // Render the current frame's shape
    Painter.save();

    // Apply shape's transform if needed (shapes handle their own transforms in render())
    currentShape.render();

    Painter.restore();
  }

  /**
   * Calculates bounds based on all frames
   * @returns {Object} Bounding box {x, y, width, height}
   */
  calculateBounds() {
    if (this._frames.length === 0) {
      return { x: this.x, y: this.y, width: 0, height: 0 };
    }

    // Calculate union of all frame bounds
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this._frames.forEach(frame => {
      const bounds = frame.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    });

    return {
      x: minX + this.x,
      y: minY + this.y,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Creates a string representation of the Sprite
   * @returns {string}
   */
  toString() {
    return `[Sprite frames=${this.totalFrames} current=${this.currentFrame} playing=${this.isPlaying}]`;
  }
}

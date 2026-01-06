import { Sprite } from './sprite.js';
import { ImageShape } from '../../shapes/image.js';

/**
 * SpriteSheet - A Sprite that loads frames from a spritesheet image
 *
 * Extends Sprite to support loading animation frames from a single
 * spritesheet image arranged in a grid layout.
 *
 * @example
 * // Create from a spritesheet with known dimensions
 * const runner = new SpriteSheet(game, {
 *   src: './runner.png',
 *   frameWidth: 64,
 *   frameHeight: 64,
 *   columns: 8,
 *   rows: 4,
 *   frameCount: 30,  // Optional: if less than columns * rows
 *   frameRate: 12,
 *   loop: true,
 *   autoPlay: true,
 * });
 *
 * // Wait for load before using
 * await runner.load();
 *
 * @example
 * // Or use the static factory method
 * const runner = await SpriteSheet.create(game, {
 *   src: './runner.png',
 *   frameWidth: 64,
 *   frameHeight: 64,
 *   columns: 8,
 *   rows: 4,
 * });
 */
export class SpriteSheet extends Sprite {
  /**
   * Creates a new SpriteSheet
   * @param {Game} game - The game instance
   * @param {Object} options - Configuration options
   * @param {string} options.src - URL/path to the spritesheet image
   * @param {number} options.frameWidth - Width of each frame in pixels
   * @param {number} options.frameHeight - Height of each frame in pixels
   * @param {number} options.columns - Number of columns in the spritesheet
   * @param {number} options.rows - Number of rows in the spritesheet
   * @param {number} [options.frameCount] - Total frames (defaults to columns * rows)
   * @param {number} [options.startFrame=0] - First frame index to use
   * @param {number} [options.frameRate=12] - Frames per second
   * @param {boolean} [options.loop=true] - Whether to loop the animation
   * @param {boolean} [options.autoPlay=false] - Whether to start playing automatically
   * @param {boolean} [options.smoothing=false] - Image smoothing (false for pixel art)
   */
  constructor(game, options = {}) {
    super(game, {
      frameRate: options.frameRate || 12,
      loop: options.loop !== undefined ? options.loop : true,
      autoPlay: false, // Don't autoplay until loaded
      ...options,
    });

    // Spritesheet config
    this._src = options.src;
    this._frameWidth = options.frameWidth;
    this._frameHeight = options.frameHeight;
    this._columns = options.columns;
    this._rows = options.rows;
    this._frameCount = options.frameCount || (options.columns * options.rows);
    this._startFrame = options.startFrame || 0;
    this._smoothing = options.smoothing !== undefined ? options.smoothing : false;
    this._autoPlayAfterLoad = options.autoPlay || false;

    // Loading state
    this._loaded = false;
    this._loading = false;
    this._image = null;
    this._frameCanvases = []; // Pre-rendered frame canvases

    // Set dimensions
    this.width = this._frameWidth;
    this.height = this._frameHeight;
  }

  /**
   * Static factory method that creates and loads a SpriteSheet
   * @param {Game} game - The game instance
   * @param {Object} options - Configuration options (same as constructor)
   * @returns {Promise<SpriteSheet>} Loaded SpriteSheet instance
   */
  static async create(game, options) {
    const sheet = new SpriteSheet(game, options);
    await sheet.load();
    return sheet;
  }

  /**
   * Loads the spritesheet image and creates frame shapes
   * @returns {Promise<SpriteSheet>} This instance for chaining
   */
  async load() {
    if (this._loaded || this._loading) {
      return this;
    }

    this._loading = true;

    try {
      // Load the image
      this._image = await this._loadImage(this._src);

      // Slice into frames
      await this._sliceFrames();

      this._loaded = true;
      this._loading = false;

      // Start playing if autoPlay was requested
      if (this._autoPlayAfterLoad) {
        this.play();
      }

      return this;
    } catch (error) {
      this._loading = false;
      console.error('SpriteSheet.load failed:', error);
      throw error;
    }
  }

  /**
   * Loads an image from a URL
   * @private
   * @param {string} src - Image URL
   * @returns {Promise<HTMLImageElement>}
   */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Slices the spritesheet into individual frame canvases
   * @private
   */
  async _sliceFrames() {
    const { _image: img, _frameWidth: fw, _frameHeight: fh, _columns: cols } = this;

    // Clear existing frames
    this.clearFrames();
    this._frameCanvases = [];

    // Create a canvas for each frame
    for (let i = this._startFrame; i < this._startFrame + this._frameCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const sx = col * fw;
      const sy = row * fh;

      // Create offscreen canvas for this frame
      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = fw;
      frameCanvas.height = fh;
      const ctx = frameCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = this._smoothing;

      // Draw the frame portion
      ctx.drawImage(img, sx, sy, fw, fh, 0, 0, fw, fh);

      // Store the canvas
      this._frameCanvases.push(frameCanvas);

      // Create ImageShape from the canvas and add as frame
      const frameShape = new ImageShape(frameCanvas, {
        width: fw,
        height: fh,
        anchor: 'center',
        smoothing: this._smoothing,
      });

      this.addFrame(frameShape);
    }
  }

  /**
   * Gets whether the spritesheet is loaded
   * @returns {boolean}
   */
  get loaded() {
    return this._loaded;
  }

  /**
   * Gets whether the spritesheet is currently loading
   * @returns {boolean}
   */
  get loading() {
    return this._loading;
  }

  /**
   * Gets the frame width
   * @returns {number}
   */
  get frameWidth() {
    return this._frameWidth;
  }

  /**
   * Gets the frame height
   * @returns {number}
   */
  get frameHeight() {
    return this._frameHeight;
  }

  /**
   * Gets the number of columns in the spritesheet
   * @returns {number}
   */
  get columns() {
    return this._columns;
  }

  /**
   * Gets the number of rows in the spritesheet
   * @returns {number}
   */
  get rows() {
    return this._rows;
  }

  /**
   * Override update to skip if not loaded
   * @param {number} dt - Delta time
   */
  update(dt) {
    if (!this._loaded) return;
    super.update(dt);
  }

  /**
   * Override draw to skip if not loaded
   */
  draw() {
    if (!this._loaded) return;
    super.draw();
  }

  /**
   * Creates a string representation
   * @returns {string}
   */
  toString() {
    return `[SpriteSheet src="${this._src}" frames=${this._frameCount} loaded=${this._loaded}]`;
  }
}

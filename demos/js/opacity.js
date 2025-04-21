import {
  Game,
  Rectangle,
  Scene,
  ShapeGOFactory,
  GameObject,
  FPSCounter,
  Tween,
  Motion,
  Easing,
  Square,
} from "../../src/index";

/**
 * BouncingSquare - A GameObject that contains a square shape that bounces around within boundaries
 *
 * @extends GameObject
 */
class BouncingSquare extends GameObject {
  /**
   * Create a new BouncingSquare
   *
   * @param {Game} game - Reference to the game instance
   * @param {Object} options - Configuration options
   */
  constructor(game, options = {}) {
    super(game, options);

    // Square size (side length)
    this.size = options.size || 50;

    // Create the square shape
    this.square = new Square(this.size, {
      color: options.color || "#0f0",
      debug: options.debug || false,
      debugColor: options.debugColor || "#fff",
    });

    // Set initial position
    this.x = options.x || 0;
    this.y = options.y || 0;

    // Set velocity
    this.vx = options.vx !== undefined ? options.vx : Math.random() * 300 - 150;
    this.vy = options.vy !== undefined ? options.vy : Math.random() * 300 - 150;

    // Ensure velocity is never zero to prevent squares from stopping
    if (Math.abs(this.vx) < 20) this.vx = this.vx < 0 ? -20 : 20;
    if (Math.abs(this.vy) < 20) this.vy = this.vy < 0 ? -20 : 20;

    // Set opacity if specified
    if (options.opacity !== undefined) {
      this.opacity = options.opacity;
    }

    // Store references to the scene for bounds checking
    this.scene = options.scene;
  }

  /**
   * Update the square's position and handle bouncing off boundaries
   *
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Move the square
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (!this.scene) return super.update(dt);

    // Get the scene boundaries
    const halfSceneWidth = this.scene.width / 2;
    const halfSceneHeight = this.scene.height / 2;

    // Calculate half size for collision detection
    const halfSize = this.size / 2;

    // Check left/right boundaries
    if (this.x - halfSize < -halfSceneWidth) {
      this.x = -halfSceneWidth + halfSize;
      this.vx = Math.abs(this.vx); // ensure positive velocity
    } else if (this.x + halfSize > halfSceneWidth) {
      this.x = halfSceneWidth - halfSize;
      this.vx = -Math.abs(this.vx); // ensure negative velocity
    }

    // Check top/bottom boundaries
    if (this.y - halfSize < -halfSceneHeight) {
      this.y = -halfSceneHeight + halfSize;
      this.vy = Math.abs(this.vy); // ensure positive velocity
    } else if (this.y + halfSize > halfSceneHeight) {
      this.y = halfSceneHeight - halfSize;
      this.vy = -Math.abs(this.vy); // ensure negative velocity
    }

    // Ensure velocities never drop too low
    if (Math.abs(this.vx) < 20) this.vx = this.vx < 0 ? -20 : 20;
    if (Math.abs(this.vy) < 20) this.vy = this.vy < 0 ? -20 : 20;

    // Call the parent update to handle standard GameObject behavior
    super.update(dt);
  }

  /**
   * Draw the square
   */
  draw() {
    super.draw();
    this.square.render();
  }
}

/**
 * OpacityDemo - Demo showcasing multiple squares with varying opacity levels
 * bouncing around the screen with a fading effect applied to the entire scene.
 */
export class OpacityDemo extends Scene {
  /**
   * Create a new OpacityDemo
   *
   * @param {Game} game - Reference to the game instance
   * @param {Object} options - Configuration options
   */
  constructor(game, options = {}) {
    super(game, options);
    // Define the margin to keep squares within
    this.MARGIN = 50;
    // Store all squares
    this.squares = [];
    // Initialize opacity animation timer
    this.elapsed = 0;
    // Create multiple squares
    const count = options.count || 20; // Reasonable default

    for (let i = 0; i < count; i++) {
      // Create square with random properties
      const square = this.createRandomSquare(game, i);
      // Add it to the scene
      this.add(square);
      // Store a reference
      this.squares.push(square);
    }
  }

  /**
   * Create a square with random properties
   *
   * @param {Game} game - Reference to the game instance
   * @param {number} index - Index for naming
   * @returns {BouncingSquare} The created square
   */
  createRandomSquare(game, index) {
    // Random size between 30 and 70
    const size = 30 + Math.random() * 40;

    // Initialize scene dimensions for initial positioning
    const sceneWidth = game.width - this.MARGIN * 2;
    const sceneHeight = game.height - this.MARGIN * 2;

    // Random position within scene bounds (80% of max to avoid edge cases)
    const x = (Math.random() * sceneWidth - sceneWidth / 2) * 0.8;
    const y = (Math.random() * sceneHeight - sceneHeight / 2) * 0.8;

    // Random velocity (ensure it's not too slow)
    const vx = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 150);
    const vy = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 150);

    // Random color
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 80%, 50%)`;

    // Random opacity between 0.3 and 1
    const opacity = 0.3 + Math.random() * 0.6;

    // Create the square with these properties
    return new BouncingSquare(game, {
      size,
      x,
      y,
      vx,
      vy,
      color,
      opacity,
      name: `square_${index}`,
      debug: true,
      debugColor: "white",
      scene: this,
    });
  }

  #prevWidth = 0;
  #prevHeight = 0;

  /**
   * Update the scene and all squares
   *
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Update scene dimensions based on margin
    if(this.width !== this.game.width - this.MARGIN * 2) {  
      this.width = this.game.width - this.MARGIN * 2;
      this.x = this.game.width / 2;
    }
    if(this.height !== this.game.height - this.MARGIN * 2) {
      this.height = this.game.height - this.MARGIN * 2;
      this.y = this.game.height / 2;
    }

    // Animate the scene's opacity
    this.elapsed += dt;

    // Use Motion.pulse to animate opacity between 0 and 1
    const result = Motion.pulse(
      0,
      1, // max
      this.elapsed, // elapsed time
      10, // duration in seconds
      true, // loop
      true, // yoyo
      Easing.easeInOutSine // easing function
    );

    // Apply the result to the scene's opacity
    this.opacity = result.value;
    //console.log(this.opacity);

    // Call parent update which will update all children
    super.update(dt);
    if (this.#prevWidth !== this.width || this.#prevHeight !== this.height) {
      this.markBoundsDirty();
    }
    this.#prevWidth = this.width;
    this.#prevHeight = this.height;
  }

  render() {
    this.logger.log("Scene opacity", this.opacity);
    super.render();
  }
}

/**
 * MyGame - Main game class for the opacity demo
 */
export class MyGame extends Game {
  /**
   * Create a new game instance
   *
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   */
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
  }

  /**
   * Initialize the game
   */
  init() {
    super.init();

    // Create the opacity demo with 20 squares
    this.pipeline.add(new OpacityDemo(this, { count: 100, debug: true }));
    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      //debug: true,
      anchor: "bottom-right",
    });
    // Add FPS counter
    this.pipeline.add(this.fpsCounter);
  }
}

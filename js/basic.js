import {
  Game,
  GameObject,
  Rectangle,
  TextShape,
  Motion,
  Easing,
  Scene,
  Circle,
  Group,
  FPSCounter,
} from "/gcanvas.es.min.js";
/**
 * HelloWorldBox - A simple GameObject that displays a box with text.
 * The text pulses in and out with a simple animation.
 */
class HelloWorldBox extends GameObject {
  /**
   * Create a new HelloWorldBox
   * @param {Game} game - Reference to the main game
   * @param {Object} options - Configuration options
   */
  constructor(game, options = {}) {
    // Initialize GameObject with game and options
    super(game, options);

    // Create a group to hold our shapes
    this.group = new Group({});

    // Create the rectangle background
    this.box = new Rectangle({
      width: 200,
      height: 80,
      color: "#333",
      debug: true,
      debugColor: "#00FF00",
    });

    // Create the text label
    this.label = new TextShape("Hello World!", {
      x: 0,
      y: 0,
      font: "18px monospace",
      color: "#0f0",
      align: "center",
      baseline: "middle",
      debug: false,
    });

    // Add shapes to our group
    this.group.add(this.box);
    this.group.add(this.label);

    // Initialize animation state
    this.animTime = 0;
  }

  update(dt) {
    this.animate(dt);
    // Call parent update
    super.update(dt);
  }

  /**
   * Update logic - called each frame
   * @param {number} dt - Delta time in seconds
   */
  animate(dt) {
    // Track animation time
    if (this.animTime == null) this.animTime = 0;
    this.animTime += dt;
    // Create a pulsing effect on the label opacity
    const result = Motion.pulse(
      0, // Min opacity
      1, // Max opacity
      this.animTime,
      2, // Duration (2 seconds)
      true, // Loop
      false, // No yoyo
      Easing.easeInOutSine
    );
    // Apply the pulse animation
    this.label.opacity = result.value;
    // Add a floating motion to the entire group
    const float = Motion.float(
      {x: 0, y: 0}, // Center point
      this.animTime,
      5, // 5-second cycle
      0.5, // Medium speed
      0.5, // Medium randomness
      50, // Radius of movement
      true,
      Easing.easeInOutSine
    );
    //console.log("float", float);
    // Apply a slight random motion to the group
    this.group.x = float.x;
    this.group.y = float.y;
  }

  /**
   * Render our box - called each frame after update
   */
  draw() {
    super.draw();
    // Draw the group which contains our shapes
    this.group.render();
  }
}

/**
 * DemoGame - Main game class that sets up the demo
 */
export class DemoGame extends Game {
  /**
   * Create a new DemoGame
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   */
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";

    // Log that the game was created
    //console.log("DemoGame created!");
  }

  /**
   * Initialize the game
   * Create scenes, game objects, and set up the game world
   */
  init() {
    // Call parent init to set up core systems
    super.init();
    // Create main game scene
    this.gameScene = new Scene(this, { width: 400, height: 200 });
    this.gameScene.name = "Game Scene";
    // Create a HelloWorldBox and add it to the game scene
    const box = new HelloWorldBox(this);
    this.gameScene.add(box);
    // Add scenes to the pipeline (order matters - last is on top)
    this.pipeline.add(this.gameScene);
    // Add a floating circle for visual interest
    this.addFloatingCircle();
    //
    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      debug: false,
      anchor: "bottom-right",
    });
    // Add FPS counter
    this.pipeline.add(this.fpsCounter);
    //console.log("Game initialized with scenes and objects");
  }

  update(dt) {
    super.update(dt);
    this.logger.groupCollapsed("DemoGame.update");
    this.gameScene.x = this.width / 2;
    this.gameScene.y = this.height / 2;
    this.floatingCircle.animTime += dt;
    // Calculate orbit position
    const orbit = Motion.orbit(
      this.gameScene.x,
      this.gameScene.y, // Center Y
      200, // X radius
      200, // Y radius
      0, // Start angle
      this.floatingCircle.animTime, // Current time
      8, // Duration (8 seconds)
      true, // Loop
      true // Clockwise
    );
    //console.log("orbit", orbit);
    // Apply the orbital motion
    this.floatingCircle.x = orbit.x;
    this.floatingCircle.y = orbit.y;
    this.logger.groupEnd();
  }

  /**
   * Add a floating circle to the game.
   * This method demonstrates how the shape and game object can be used interchangeably.
   * Since a Shape is a Transformable, it can be added to the pipeline and will be rendered.
   */
  addFloatingCircle() {
    // Determine the center position for the orbit
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Create a circle that will float around - set initial position on the orbit path
    this.floatingCircle = new Circle(30, {
      name: "Floating Circle",
      x: centerX + 100, // Start at right side of orbit (centerX + radiusX)
      y: centerY, // Start at center Y
      color: "#00FF00",
      debug: false
    });

    // Initialize animation time
    this.floatingCircle.animTime = 0;
    this.pipeline.add(this.floatingCircle);
  }
}

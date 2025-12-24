import {
  Circle,
  FPSCounter,
  Game,
  Rectangle,
  Scene,
  Sprite,
  Square,
  Star,
  TextShape,
  Triangle,
  Heart,
  Polygon,
} from "../../src/index.js";

/**
 * Helper to create a sprite with various shapes showing a pulsing animation
 */
function createPulsingSprite(game) {
  const sprite = new Sprite(game, {
    x: 150,
    y: 150,
    frameRate: 8,
    loop: true,
    autoPlay: true,
  });

  // Create frames with different sizes to simulate pulsing
  const sizes = [20, 25, 30, 35, 30, 25];
  const colors = ["#ff6b6b", "#ee5a6f", "#f06595", "#cc5de8", "#845ef7", "#5c7cfa"];

  sizes.forEach((size, i) => {
    const circle = new Circle(size, {
      color: colors[i],
      stroke: "white",
      lineWidth: 2,
    });
    sprite.addFrame(circle);
  });

  return sprite;
}

/**
 * Helper to create a sprite showing a rotating shape animation
 */
function createShapeShifter(game) {
  const sprite = new Sprite(game, {
    x: 400,
    y: 150,
    frameRate: 6,
    loop: true,
    autoPlay: true,
  });

  // Create different shapes for each frame
  const shapes = [
    new Circle(25, { color: "#51cf66", stroke: "white", lineWidth: 2 }),
    new Square(45, { color: "#51cf66", stroke: "white", lineWidth: 2 }),
    new Triangle(50, { color: "#51cf66", stroke: "white", lineWidth: 2 }),
    new Star({ outerRadius: 30, innerRadius: 15, points: 5, color: "#51cf66", stroke: "white", lineWidth: 2 }),
    new Heart({ width: 50, height: 50, color: "#51cf66", stroke: "white", lineWidth: 2 }),
  ];

  shapes.forEach(shape => sprite.addFrame(shape));

  return sprite;
}

/**
 * Helper to create a sprite showing a walking animation
 */
function createWalkingAnimation(game) {
  const sprite = new Sprite(game, {
    x: 650,
    y: 150,
    frameRate: 10,
    loop: true,
    autoPlay: true,
  });

  // Create simple stick figure-like frames for walking
  const colors = ["#ffd43b", "#ffd43b"];

  // Frame 1: Left leg forward
  const frame1 = new Polygon({
    points: [
      [0, -20], [5, -10], [0, 0], [-5, 10], [0, 20],  // body
      [-10, 0], // left arm
      [10, 5],  // right arm
    ],
    color: colors[0],
    stroke: "white",
    lineWidth: 3,
  });

  // Frame 2: Both legs centered
  const frame2 = new Polygon({
    points: [
      [0, -20], [5, -10], [0, 0], [0, 10], [0, 20],
    ],
    color: colors[1],
    stroke: "white",
    lineWidth: 3,
  });

  // Add more frames for smooth walking
  sprite.addFrame(frame1);
  sprite.addFrame(frame2);
  sprite.addFrame(new Polygon({
    points: [
      [0, -20], [5, -10], [0, 0], [5, 10], [0, 20],
      [10, 0],
      [-10, 5],
    ],
    color: colors[0],
    stroke: "white",
    lineWidth: 3,
  }));
  sprite.addFrame(frame2);

  return sprite;
}

/**
 * Helper to create a color-changing sprite
 */
function createColorCycle(game) {
  const sprite = new Sprite(game, {
    x: 150,
    y: 350,
    frameRate: 4,
    loop: true,
    autoPlay: true,
  });

  const colors = ["#ff6b6b", "#ffd43b", "#51cf66", "#339af0", "#cc5de8", "#f783ac"];

  colors.forEach(color => {
    const square = new Square(50, {
      color: color,
      stroke: "white",
      lineWidth: 2,
    });
    sprite.addFrame(square);
  });

  return sprite;
}

/**
 * Interactive sprite with controls
 */
function createControlledSprite(game) {
  const sprite = new Sprite(game, {
    x: 400,
    y: 350,
    frameRate: 8,
    loop: true,
    autoPlay: false,
  });

  // Create a sequence of expanding/contracting rectangles
  const widths = [20, 30, 40, 50, 60, 50, 40, 30];
  const heights = [60, 50, 40, 30, 20, 30, 40, 50];

  widths.forEach((width, i) => {
    const rect = new Rectangle({
      width: width,
      height: heights[i],
      color: "#ff922b",
      stroke: "white",
      lineWidth: 2,
    });
    sprite.addFrame(rect);
  });

  return sprite;
}

/**
 * Helper to create a bouncing ball sprite
 */
function createBouncingBall(game) {
  const sprite = new Sprite(game, {
    x: 650,
    y: 350,
    frameRate: 12,
    loop: true,
    autoPlay: true,
  });

  // Create frames simulating a bouncing ball (squash and stretch)
  const frames = [
    { radius: 25, scaleY: 1.0 },    // top of bounce
    { radius: 25, scaleY: 1.1 },    // falling
    { radius: 25, scaleY: 1.2 },    // approaching ground
    { radius: 25, scaleY: 0.7 },    // squashed on ground
    { radius: 25, scaleY: 0.8 },    // leaving ground
    { radius: 25, scaleY: 1.0 },    // rising
  ];

  frames.forEach((frame, i) => {
    const circle = new Circle(frame.radius, {
      color: "#ff6347",
      stroke: "white",
      lineWidth: 2,
    });
    circle.scaleY = frame.scaleY;
    sprite.addFrame(circle);
  });

  return sprite;
}

/**
 * Create labeled section
 */
function createLabel(game, text, x, y) {
  return new TextShape(text, {
    x: x,
    y: y,
    font: "14px monospace",
    color: "white",
  });
}

/**
 * Main demo scene
 */
class SpriteDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
  }

  init() {
    // Create various sprite examples
    this.pulsingSprite = createPulsingSprite(this.game);
    this.shapeShifter = createShapeShifter(this.game);
    this.walkingSprite = createWalkingAnimation(this.game);
    this.colorCycle = createColorCycle(this.game);
    this.controlledSprite = createControlledSprite(this.game);
    this.bouncingBall = createBouncingBall(this.game);

    // Add labels
    const labels = [
      createLabel(this.game, "Pulsing (auto-play)", 150, 220),
      createLabel(this.game, "Shape Shifter", 400, 220),
      createLabel(this.game, "Walking", 650, 220),
      createLabel(this.game, "Color Cycle", 150, 420),
      createLabel(this.game, "Controlled (click)", 400, 420),
      createLabel(this.game, "Bouncing Ball", 650, 420),
    ];

    // Add all sprites to scene
    this.add(this.pulsingSprite);
    this.add(this.shapeShifter);
    this.add(this.walkingSprite);
    this.add(this.colorCycle);
    this.add(this.controlledSprite);
    this.add(this.bouncingBall);

    labels.forEach(label => {
      const wrapper = this.game.pipeline.createGameObject(label);
      this.add(wrapper);
    });

    // Add interactive controls for the controlled sprite
    this.setupControls();
  }

  setupControls() {
    // Make the controlled sprite interactive
    this.controlledSprite.interactive = true;

    // Click to toggle play/pause
    this.controlledSprite.on("click", () => {
      if (this.controlledSprite.isPlaying) {
        this.controlledSprite.pause();
      } else {
        this.controlledSprite.play();
      }
    });

    // Add status text
    this.statusText = new TextShape("", {
      x: 400,
      y: 470,
      font: "12px monospace",
      color: "#aaa",
    });
    const statusWrapper = this.game.pipeline.createGameObject(this.statusText);
    this.add(statusWrapper);

    // Keyboard controls for the controlled sprite
    this.game.on("keydown", (e) => {
      switch(e.key) {
        case " ": // Space to play/pause
          if (this.controlledSprite.isPlaying) {
            this.controlledSprite.pause();
          } else {
            this.controlledSprite.play();
          }
          break;
        case "r": // R to rewind
          this.controlledSprite.rewind();
          break;
        case "s": // S to stop
          this.controlledSprite.stop();
          break;
        case "ArrowLeft": // Left arrow to go to previous frame
          this.controlledSprite.gotoAndStop(
            Math.max(0, this.controlledSprite.currentFrame - 1)
          );
          break;
        case "ArrowRight": // Right arrow to go to next frame
          this.controlledSprite.gotoAndStop(
            Math.min(this.controlledSprite.totalFrames - 1, this.controlledSprite.currentFrame + 1)
          );
          break;
      }
    });
  }

  update(dt) {
    super.update(dt);

    // Update status text for controlled sprite
    if (this.statusText) {
      const cs = this.controlledSprite;
      this.statusText.text = `Frame: ${cs.currentFrame + 1}/${cs.totalFrames} | ${cs.isPlaying ? "Playing" : "Paused"} | Space:Play/Pause R:Rewind S:Stop ←→:Frame`;
    }
  }
}

/**
 * Main game class
 */
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#1a1a2e";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Create and add the demo scene
    this.spriteDemo = new SpriteDemo(this, {
      x: 0,
      y: 0,
    });
    this.pipeline.add(this.spriteDemo);

    // Add FPS counter
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );

    // Add title
    const title = new TextShape("Sprite Timeline Demo - MovieClip-style Frame Animation", {
      x: this.width / 2,
      y: 30,
      font: "20px monospace",
      color: "white",
    });
    const titleWrapper = this.pipeline.createGameObject(title);
    this.pipeline.add(titleWrapper);

    // Add instructions
    const instructions = new TextShape("Click the controlled sprite or use keyboard controls (Space, R, S, Arrow keys)", {
      x: this.width / 2,
      y: 60,
      font: "14px monospace",
      color: "#aaa",
    });
    const instructionsWrapper = this.pipeline.createGameObject(instructions);
    this.pipeline.add(instructionsWrapper);
  }
}

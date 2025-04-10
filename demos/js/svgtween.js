import {
  Circle,
  Easing,
  FPSCounter,
  Game,
  GameObject,
  Motion,
  Painter,
  Scene,
  SVGShape,
  Tween,
} from "../../src/index";
class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  init() {
    // Set up scenes
    this.scene = new Scene(this);
    this.ui = new Scene(this);
    this.pipeline.add(this.scene); // game layer
    this.pipeline.add(this.ui); // UI layer
    // Add SVG path animation
    const svg = new SVGPathAnimation(this, {
      path: "M 0 30.276 L 0 9.358 L 0 0.845 L 17.139 0.845 L 17.139 -5.247 L 5.189 -5.247 L 5.189 -19.273 L 0 -19.273 L 0 -4.975 L 0 0.845 L -8.618 0.845 L -25.071 0.845 L -25.071 9.757 L -7.593 9.757 L -7.593 30.276 L 0 30.276 Z",
      anchor: "center",
      offsetX: -50,
      offsetY: -100,
    });
    this.scene.add(svg);
    setTimeout(() => {
      this.scene.add(
        new SVGPathAnimation(this, {
          path: "M -0.003 20.33 L -0.003 6.031 L -0.003 0.211 L 25.068 0.211 L 25.068 -8.702 L 7.59 -8.702 L 7.59 -29.22 L -0.003 -29.22 L -0.003 -8.303 L -0.003 0.211 L -17.141 0.211 L -17.141 6.304 L -5.194 6.304 L -5.194 20.33 L -0.003 20.33 Z",
          anchor: "center",
          offsetX: 90,
          offsetY: -30,
        })
      );
    }, 1000);
    // Add FPS counter in the UI scene
    this.ui.add(new FPSCounter(this, { anchor: "bottom-right" }));
  }

  render() {
    super.render();
    // Instructions text
    Painter.setFont("18px monospace");
    Painter.setTextAlign("center");
    Painter.setTextBaseline("bottom");
    Painter.fillText(
      "Click anywhere to restart the SVG path animation",
      this.width / 2,
      this.height - 100,
      "#0f0"
    );
  }
}

// SVG Path Animation - An animated SVG path drawing
class SVGPathAnimation extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    // My Logo as an SVG
    //
    //
    this.animTime = 0;
    const path =
      options.path ??
      "M 50,10 L 50,40 L 20,40 L 20,60 L 50,60 L 50,90 L 70,90 L 70,60 L 100,60 L 100,40 L 70,40 L 70,10 Z";
    // Initialize state
    this.progress = 0;
    this.speed = 0.6; // Speed of animation
    this.complete = false;
    // Create SVG shape with initial 0 progress
    this.svgShape = new SVGShape(0, 0, path, {
      strokeColor: "#0f0", // Green color
      lineWidth: 3,
      fillColor: "rgba(0, 255, 0, 0.1)",
      scale: 5,
      animationProgress: 1,
    });
    // Create a circle to represent the drawing point
    this.drawingPoint = new Circle(game.width / 2, game.height / 2, 6, {
      fillColor: "#fff",
      shadowColor: "rgba(0, 255, 0, 0.8)",
      shadowBlur: 15,
    });
    // Canvas click handler to restart animation
    game.canvas.addEventListener("click", () => this.restart());
  }

  // Restart the animation
  restart() {
    this.progress = 0;
    this.complete = false;
  }

  update(dt) {
    const time = performance.now() / 1000;
    // Update progress if animation not complete
    if (!this.complete) {
      this.progress += dt * this.speed;
      if (this.progress >= 1) {
        this.progress = 1;
        this.complete = true;
      }
      // Apply easing for more natural movement
      const easedProgress = Easing.easeInOutQuad(this.progress);
      // Update SVG shape animation progress
      this.svgShape.setAnimationProgress(easedProgress);
    }
    let x = 0;
    let y = 0;
    // Add gentle bouncing motion when complete
    if (this.complete) {
      if (!this.floatState) this.floatState = null;
      this.animTime = (this.animTime ?? 0) + dt;
      const floatResult = Motion.float(
        { x: 0, y: 0 }, // target center
        this.animTime, // elapsed time
        8, // duration (seconds per full loop)
        1.0, // speed multiplier
        0.3, // randomness (0 = smooth, 1 = jittery)
        50, // radius
        true, // loop
        Easing.easeInOutSine, // optional easing
        {},
        this.floatState // persistent state
      );

      this.floatState = floatResult.state;

      x = floatResult.x;
      y = floatResult.y;
      this.drawingPoint.opacity = 0;
    } else {
      // Update the SVG shape position
      //this.svgShape.x = this.game.width / 2;
      //this.svgShape.y = this.game.height / 2;
      // Show the drawing point during animation
      this.drawingPoint.opacity = 1;
      // Update drawing point position to follow the current path position
      const currentPoint = this.svgShape.getCurrentPoint();
      this.drawingPoint.x = currentPoint.x;
      this.drawingPoint.y = currentPoint.y;
    }
    this.svgShape.x = x + this.x + this.offsetX;
    this.svgShape.y = y + this.y + this.offsetY;
    super.update(dt);
  }

  render() {
    // Draw SVG path
    this.svgShape.draw();
    // Draw drawing point
    this.drawingPoint.draw();
  }
}

export { MyGame };

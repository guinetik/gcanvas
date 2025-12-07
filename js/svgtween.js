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
} from "/gcanvas.es.min.js";
class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  init() {
    super.init();
    // Set up scenes
    console.groupCollapsed("init");
    this.scene = new Scene(this, { debug: true, debugColor: "#0f0", anchor: "center" });
    this.ui = new Scene(this, { debug: true, debugColor: "#0f0", anchor: "center" });
    this.pipeline.add(this.scene); // game layer
    this.pipeline.add(this.ui); // UI layer
    console.groupEnd();
    // Add SVG path animation
    console.groupCollapsed("add SVGPathAnimation");
    const svg = new SVGPathAnimation(this, {
      width: 210,
      height: 250,
      offsetX: -70,
      offsetY: -35,
      path: "M 0 30.276 L 0 9.358 L 0 0.845 L 17.139 0.845 L 17.139 -5.247 L 5.189 -5.247 L 5.189 -19.273 L 0 -19.273 L 0 -4.975 L 0 0.845 L -8.618 0.845 L -25.071 0.845 L -25.071 9.757 L -7.593 9.757 L -7.593 30.276 L 0 30.276 Z",
    });
    this.scene.add(svg);
    console.groupEnd();
    setTimeout(() => {
      console.groupCollapsed("add SVGPathAnimation");
      this.scene.add(
        new SVGPathAnimation(this, {
          width: 210,
          height: 250,
          offsetX: 70,
          offsetY: 35,
          path: "M -0.003 20.33 L -0.003 6.031 L -0.003 0.211 L 25.068 0.211 L 25.068 -8.702 L 7.59 -8.702 L 7.59 -29.22 L -0.003 -29.22 L -0.003 -8.303 L -0.003 0.211 L -17.141 0.211 L -17.141 6.304 L -5.194 6.304 L -5.194 20.33 L -0.003 20.33 Z",
        })
      );
      console.groupEnd();
    }, 200);
    // Add FPS counter in the UI scene
    console.groupCollapsed("add FPSCounter");
    this.ui.add(new FPSCounter(this, { anchor: "bottom-right" }));
    console.groupEnd();
    this.glow = Painter.effects.createGlow('rgba(0, 255, 0, 1)', 100, {
      pulseSpeed: 1,
      pulseMin: 0,
      pulseMax: 50,
      colorShift: 0.5
    });
  }

  update(dt) {
    this.scene.width = this.width - 20;
    this.scene.height = this.height - 20;
    this.glow.update({ pulseSpeed: 1 });
    super.update(dt);
  }

  render() {
    super.render();
    // Instructions text
    Painter.text.setFont("18px monospace");
    Painter.text.setTextAlign("center");
    Painter.text.setTextBaseline("bottom");
    Painter.text.fillText(
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
    this.offsetX = options.offsetX ?? 0;
    this.offsetY = options.offsetY ?? 0;
    this.animTime = 0;
    const path =
      options.path ??
      "M 50,10 L 50,40 L 20,40 L 20,60 L 50,60 L 50,90 L 70,90 L 70,60 L 100,60 L 100,40 L 70,40 L 70,10 Z";
    // Initialize state
    this.progress = 0;
    this.speed = 0.6; // Speed of animation
    this.complete = false;
    // Create SVG shape with initial 0 progress
    this.svgShape = new SVGShape(path, {
      stroke: "#0f0", // Green color
      lineWidth: 3,
      color: "rgba(0, 255, 0, 0.1)",
      scale: 5,
      animationProgress: 1,
//      debug:true,
      //debugColor:"yellow",
      x: options.offsetX ?? 0,
      y: options.offsetY ?? 0,
      width: 210,
      height: 250,

    });
    // Create a circle to represent the drawing point
    this.drawingPoint = new Circle(6, {
      x: 0,
      y: 0,
      color: "#fff",
      shadowColor: "rgba(0, 255, 0, 1)",
      shadowBlur: 15,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    });
    // Canvas click handler to restart animation
    game.canvas.addEventListener("click", () => this.restart());
    console.log("SVGPathAnimation", this.x, this.y);
    this.jittery = Math.random() * 0.2 + 0.2;
  }

  // Restart the animation
  restart() {
    this.progress = 0;
    this.complete = false;
    this.x = 0;
    this.y = 0;
    this.animTime = 0;
    this.jittery = Math.random() * 0.2 + 0.2;
  }

  update(dt) {
    //console.log(this.x, this.y);
    // Update progress if animation not complete
    if (!this.complete) {
      this.progress += dt * this.speed;
      if (this.progress >= 1) {
        this.progress = 1;
        this.complete = true;
        this.floatState = null;
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
      this.animTime = this.complete ? (this.animTime ?? 0) + (dt) : 0;
      const floatResult = Motion.float(
        {x:-5,y:-55},
        this.animTime, // elapsed time
        1, // duration (seconds per full loop)
        1, // speed multiplier
        this.jittery,
        50, // radius
        true, // loop
        Easing.easeInOutSine, // optional easing
        {},
        this.floatState // persistent state
      );

      this.floatState = floatResult.state;
      x = floatResult.x;
      y = floatResult.y;
      this.drawingPoint.visible = false;
    } else {
      // Show the drawing point during animation
      this.drawingPoint.visible = true;
      // Update drawing point position to follow the current path position
      const currentPoint = this.svgShape.getCurrentPoint();
      this.drawingPoint.x = currentPoint.x + this.offsetX;
      this.drawingPoint.y = currentPoint.y + this.offsetY;
    }
    this.x = x;
    this.y = y;
    super.update(dt);
  }

  draw() {
    super.draw();
    // Draw SVG path
    this.svgShape.render();
    // Draw drawing point
    this.drawingPoint.render();
  }
}

export { MyGame };

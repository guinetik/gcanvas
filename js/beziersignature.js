import {
  BezierShape,
  Circle,
  FPSCounter,
  Game,
  GameObject,
  Tween,
  Painter,
  Scene,
  Easing,
} from "/gcanvas/gcanvas.es.min.js";
// Signature Animation Demo
class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#222";
  }

  init() {
    // Set up scenes
    this.scene = new Scene(this);
    this.ui = new Scene(this);
    this.pipeline.add(this.scene); // game layer
    this.pipeline.add(this.ui); // UI layer

    // Add signature animation
    this.scene.add(new SignatureAnimation(this));

    // Add FPS counter in the UI scene
    this.ui.add(new FPSCounter(this, { anchor: "bottom-right" }));
  }
}

// Signature Animation - A progressive bezier curve animation
class SignatureAnimation extends GameObject {
  constructor(game) {
    super(game);

    // The signature path - represents a cursive signature
    this.signaturePath = [
      // First part - the cursive letter (stylized name)
      ["M", -200, 20],
      ["C", -180, -40, -160, 40, -140, 10],
      ["C", -120, -30, -100, 40, -80, 0],
      ["C", -60, -40, -40, 40, -20, 10],
      ["C", 0, -20, 20, -30, 40, 10],
      ["C", 60, 40, 80, 40, 100, 20],
      ["C", 120, 0, 140, -10, 160, 10],
      ["C", 180, 30, 200, 30, 220, 10],

      // The underline swoop
      ["M", -180, 40],
      ["C", -100, 60, 100, 80, 250, 30],
    ];

    // Initialize state
    this.progress = 0;
    this.speed = 0.4; // Speed of animation
    this.complete = false;

    // Create visible bezier shape for the signature
    this.signature = new BezierShape(
      game.width / 2,
      game.height / 2,
      [], // Start with empty path
      {
        strokeColor: "#fff",
        lineWidth: 3,
        fillColor: null,
      }
    );

    // Create a circle to represent the pen tip
    this.penTip = new Circle(game.width / 2, game.height / 2, 8, {
      fillColor: "#4f8",
      shadowColor: "rgba(64, 255, 128, 0.8)",
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

  // Calculate the current point along a particular bezier curve segment
  getBezierPoint(segment, t) {
    if (segment[0] === "M") {
      // For move commands, just return the point
      return { x: segment[1], y: segment[2] };
    } else if (segment[0] === "C") {
      // For Cubic Bezier curves, calculate the point at t
      const startX = this.prevX || 0;
      const startY = this.prevY || 0;
      const cp1x = segment[1];
      const cp1y = segment[2];
      const cp2x = segment[3];
      const cp2y = segment[4];
      const endX = segment[5];
      const endY = segment[6];

      // Cubic Bezier formula
      const x =
        Math.pow(1 - t, 3) * startX +
        3 * Math.pow(1 - t, 2) * t * cp1x +
        3 * (1 - t) * Math.pow(t, 2) * cp2x +
        Math.pow(t, 3) * endX;

      const y =
        Math.pow(1 - t, 3) * startY +
        3 * Math.pow(1 - t, 2) * t * cp1y +
        3 * (1 - t) * Math.pow(t, 2) * cp2y +
        Math.pow(t, 3) * endY;

      return { x, y };
    }

    return { x: 0, y: 0 };
  }

  // Get a subset of the path up to the current progress
  getPartialPath() {
    const result = [];
    let totalSegments = this.signaturePath.length;
    let segmentIndex = Math.floor(this.progress * totalSegments);
    let segmentProgress = (this.progress * totalSegments) % 1;

    // Add all completed segments
    for (let i = 0; i < segmentIndex; i++) {
      result.push([...this.signaturePath[i]]);

      // Keep track of the last point for calculating bezier curves
      if (this.signaturePath[i][0] === "M") {
        this.prevX = this.signaturePath[i][1];
        this.prevY = this.signaturePath[i][2];
      } else if (this.signaturePath[i][0] === "C") {
        this.prevX = this.signaturePath[i][5];
        this.prevY = this.signaturePath[i][6];
      }
    }

    // Add the current segment with partial progress
    if (segmentIndex < totalSegments) {
      const currentSegment = this.signaturePath[segmentIndex];

      if (currentSegment[0] === "M") {
        // For move commands, add the full command
        result.push([...currentSegment]);
        this.prevX = currentSegment[1];
        this.prevY = currentSegment[2];

        // Position pen tip at the move point
        this.penTipPos = {
          x: currentSegment[1],
          y: currentSegment[2],
        };
      } else if (currentSegment[0] === "C") {
        // For bezier curves, calculate the partial command
        const point = this.getBezierPoint(currentSegment, segmentProgress);

        // Add a partial curve to the result
        result.push([
          "C",
          currentSegment[1],
          currentSegment[2],
          currentSegment[3],
          currentSegment[4],
          point.x,
          point.y,
        ]);

        // Position pen tip at the end of the partial curve
        this.penTipPos = point;
      }
    }

    return result;
  }

  update(dt) {
    // Update progress if animation not complete
    if (!this.complete) {
      this.progress += dt * this.speed;

      if (this.progress >= 1) {
        this.progress = 1;
        this.complete = true;
      }

      // Apply easing for more natural movement
      const easedProgress = Easing.easeInOutQuad(this.progress);

      // Calculate partial path based on current progress
      this.currentPath = this.getPartialPath();

      // Update signature path
      this.signature.path = this.currentPath;
    }

    // Add gentle bouncing motion when complete
    if (this.complete) {
      const time = performance.now() / 1000;
      this.signature.y = this.game.height / 2 + Math.sin(time * 2) * 5;
    }

    // Update pen tip position
    if (this.penTipPos) {
      this.penTip.x = this.game.width / 2 + this.penTipPos.x;
      this.penTip.y = this.game.height / 2 + this.penTipPos.y;
    }
  }

  render() {
    // Instructions text
    Painter.text.setFont("18px monospace");
    Painter.text.setTextAlign("center");
    Painter.text.setTextBaseline("bottom");
    Painter.text.fillText(
      "Click anywhere to restart the signature animation",
      this.game.width / 2,
      this.game.height - 40,
      "#4f8"
    );

    // Draw signature
    this.signature.draw();

    // Draw pen tip if animation is not complete
    if (!this.complete) {
      this.penTip.draw();
    }
  }
}

export { MyGame };

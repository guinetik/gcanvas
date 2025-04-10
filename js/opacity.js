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
} from "/gcanvas/gcanvas.es.min.js";
/**
 * OpacityMotionDemo
 *
 * Spawns multiple squares with random:
 *  - color (HSL),
 *  - opacity,
 *  - initial position,
 *  - velocity.
 * They move around the canvas, bouncing off edges, overlapping each other
 * to demonstrate alpha blending in motion.
 */
export class OpacityDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.squares = []; // Will hold references to each square’s GameObject
    this.velocities = []; // Parallel array of {vx, vy} for each square
    const count = 100; // number of squares
    ///
    for (let i = 0; i < count; i++) {
      const size = 50;
      // Random initial position somewhere within canvas, minus margin to keep squares fully on screen
      const x = Math.random() * (game.width - size) + size / 2;
      const y = Math.random() * (game.height - size) + size / 2;

      // Random velocity in range
      const vx = Math.random() * 300 - 80;
      const vy = Math.random() * 300 - 80;

      // Random color and opacity
      const hue = Math.floor(Math.random() * 360);
      const fillColor = `hsl(${hue}, 80%, 50%)`;
      const opacity = 0.3 + 0.7 * Math.random(); // range ~0.3..1

      // Create a rectangle shape
      const rectShape = new Rectangle(0, 0, size, size, {
        fillColor,
        strokeColor: "#fff",
        lineWidth: 1,
        opacity: 1,
      });

      // Wrap it in a GameObject via the factory
      const squareGO = ShapeGOFactory.create(game, rectShape);
      // Position the shape's center
      squareGO.x = x;
      squareGO.y = y;

      // Add it to the scene
      this.add(squareGO);

      // Store references
      this.squares.push(squareGO);
      this.velocities.push({ vx, vy });
    }
  }

  /**
   * update(dt) - Animate each square by moving it, bouncing off edges,
   * and letting the Scene handle rendering them with partial opacity.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Update each square’s position based on its velocity
    for (let i = 0; i < this.squares.length; i++) {
      const square = this.squares[i];
      const vel = this.velocities[i];
      // Move
      square.x += vel.vx * dt;
      square.y += vel.vy * dt;
      // Check left/right boundaries
      const halfW = square.width / 2;
      if (square.x - halfW < 0) {
        square.x = halfW;
        vel.vx *= -1; // bounce horizontally
      } else if (square.x + halfW > this.game.width) {
        square.x = this.game.width - halfW;
        vel.vx *= -1;
      }
      // Check top/bottom boundaries
      const halfH = square.height / 2;
      if (square.y - halfH < 0) {
        square.y = halfH;
        vel.vy *= -1;
      } else if (square.y + halfH > this.game.height) {
        square.y = this.game.height - halfH;
        vel.vy *= -1;
      }
    }
    //
    // The scene's opacity should be applied to all children.
    // The Demo will pulse the opacity of the entire scene using Tween.
    // Initialize scene timer
    this.elapsed = (this.elapsed ?? 0) + dt;
    // Use Motion.pulse to animate opacity between 0 and 1
    const result = Motion.pulse(
      0, // min
      1, // max
      this.elapsed, // elapsed time
      10, // duration (2s up, 2s down for 0-1-0 over 4s)
      true, // loop
      true, // yoyo
      Easing.easeInOutSine // optional
    );
    // Apply to scene
    this.opacity = result.value;
    super.update(dt);
  }
}
//
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.pipeline.add(new OpacityDemo(this));
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

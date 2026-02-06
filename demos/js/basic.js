import {
  Game,
  GameObject,
  Rectangle,
  TextShape,
  Motion,
  Easing,
  Circle,
  Group,
  FPSCounter,
} from "../../src/index";

/**
 * HelloWorldBox - A simple GameObject that displays a box with text.
 * The text pulses in and out with a simple animation.
 */
class HelloWorldBox extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    // Create a group to hold our shapes - centered at (0, 0)
    this.group = new Group({ origin: "center" });

    // Create the rectangle background - centered on the group
    this.box = new Rectangle({
      width: 200,
      height: 80,
      color: "#333",
      debug: true,
      debugColor: "#00FF00",
      origin: "center",
    });

    // Create the text label - centered on the group
    this.label = new TextShape("Hello World!", {
      font: "18px monospace",
      color: "#0f0",
      align: "center",
      baseline: "middle",
      origin: "center",
    });

    this.group.add(this.box);
    this.group.add(this.label);
    this.animTime = 0;
  }

  update(dt) {
    if (this.animTime == null) this.animTime = 0;
    this.animTime += dt;
    
    // Pulsing text opacity
    const result = Motion.pulse(0, 1, this.animTime, 2, true, false, Easing.easeInOutSine);
    this.label.opacity = result.value;
    
    // Floating motion for the group (small movement around center)
    const float = Motion.float(
      { x: 0, y: 0 },
      this.animTime,
      5,    // 5-second cycle
      0.5,  // Medium speed
      0.5,  // Medium randomness
      30,   // Radius of movement (smaller than before)
      true,
      Easing.easeInOutSine
    );
    this.group.x = float.x;
    this.group.y = float.y;
    
    super.update(dt);
  }

  draw() {
    super.draw();
    this.group.render();
  }
}

/**
 * DemoGame - Main game class that sets up the demo
 */
export class DemoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  init() {
    super.init();
    
    // Create HelloWorldBox - will be positioned at screen center in update()
    // Using center origin so (x, y) places its center
    this.helloBox = new HelloWorldBox(this, {
      origin: "center",
    });
    this.pipeline.add(this.helloBox);
    
    // Create orbiting circle with center origin
    this.floatingCircle = new Circle(30, {
      name: "Floating Circle",
      color: "#00FF00",
      origin: "center",
    });
    this.floatingCircle.animTime = 0;
    this.pipeline.add(this.floatingCircle);
    
    // FPS counter
    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);
  }

  update(dt) {
    super.update(dt);
    
    // Center the hello box on screen
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    this.helloBox.x = centerX;
    this.helloBox.y = centerY;
    
    // Update orbit animation
    this.floatingCircle.animTime += dt;
    
    // Orbit around screen center with radius larger than the box
    // Box is 200x80, so orbit radius needs to clear it with margin
    const orbit = Motion.orbit(
      centerX,
      centerY,
      180,  // X radius - clears the 200-wide box with margin
      150,  // Y radius - clears the 80-tall box with more margin
      0,
      this.floatingCircle.animTime,
      8,    // 8 seconds per revolution
      true,
      true
    );
    
    this.floatingCircle.x = orbit.x;
    this.floatingCircle.y = orbit.y;
  }
}

import {
  Game,
  Rectangle,
  Circle,
  Star,
  Ring,
  Group,
  Scene,
  TextShape,
  FPSCounter,
  Tween,
  HorizontalLayout,
  Arc,
  Heart,
  TileLayout,
  Triangle,
  Square,
  StickFigure,
  Painter,
} from "../../src/index";
// ShapeBox: A GameObject that wraps an inner shape within a background
class ShapeBox extends Scene {
  constructor(game, innerShape, type, options = {}) {
    options.width = options.width ?? 100;
    options.height = options.height ?? 120;
    super(game, options);
    this.type = type;
    // Create a group that will hold the background and the inner shape.
    this.group = new Group(0, 0);
    // Create a background rectangle of 100x100 centered at (0,0).
    const bg = new Rectangle(0, 0, 100, 100, {
      fillColor: Painter.randomColorHSL(),
      strokeColor: "white",
      lineWidth: 2,
    });
    // Add the background and the provided inner shape to the group.
    this.group.add(bg);
    this.group.add(innerShape);
    this.group.add(
      new TextShape(0, 55, this.type, {
        font: "16px monospace",
        color: "white",
      })
    );
    // Store a reference to the inner shape so you can update its animation separately.
    this.innerShape = innerShape;
    //
    this.springVelocity = 0;
    this.springGoingDown = true; // Flag to track the direction of the spring animation
    this.springValues = [40, -40];
  }

  update(dt) {
    this.group.x = this.x;
    this.group.y = this.y;
    super.update(dt);
  }

  render() {
    this.group.draw();
    super.render();
  }

  width() {
    return 100;
  }

  height() {
    return 100;
  }

  spiral(box) {
    const centerX = 0;
    const centerY = 0;
    const startRadius = 0; // Start from center
    const maxRadius = 40; // Maximum radius
    const startAngle = 0;
    const revolutions = 2; // Two full revolutions
    const cycleDuration = 3; // 3 seconds per cycle

    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Get spiral coordinates (loops back to origin)
    const pos = Tween.spiral(
      centerX,
      centerY,
      startRadius,
      maxRadius,
      startAngle,
      revolutions,
      t
    );

    box.innerShape.x = pos.x;
    box.innerShape.y = pos.y;
  }

  bounce(box) {
    const maxHeight = -40; // Top position (negative y value)
    const groundY = 40; // Bottom position (ground)
    const bounceCount = 3; // Number of bounces
    const cycleDuration = 3; // 3 seconds per cycle

    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Calculate the Y position with bounce physics
    const y = Tween.bounce(maxHeight, groundY, bounceCount, t);

    // Keep X position the same
    box.innerShape.x = 0;
    box.innerShape.y = y;
  }

  spiral(box) {
    const centerX = 0;
    const centerY = 0;
    const startRadius = 0; // Start from center
    const maxRadius = 40; // Maximum radius
    const startAngle = 0;
    const revolutions = 2; // Two full revolutions
    const cycleDuration = 3; // 3 seconds per cycle

    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Calculate radius that grows and then shrinks to create loop to origin
    const adjustedT =
      t <= 0.5
        ? t * 2 // 0->0.5 maps to 0->1 (spiral out)
        : 1 - (t - 0.5) * 2; // 0.5->1 maps to 1->0 (spiral in)

    const radius = startRadius + (maxRadius - startRadius) * adjustedT;
    const angle = startAngle + t * revolutions * Math.PI * 2;

    // Convert to x,y coordinates
    box.innerShape.x = centerX + radius * Math.cos(angle);
    box.innerShape.y = centerY + radius * Math.sin(angle);
  }

  orbit(box) {
    const radiusX = -40;
    const radiusY = 30;
    const startAngle = Math.PI / 2; // Start from top (to begin at origin)
    const cycleDuration = 3;

    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Calculate angle for a full revolution
    const angle = startAngle + t * Math.PI * 2;

    // Calculate center offset to make the orbit pass through origin
    const centerX = 0;
    const centerY = -radiusY;

    // Calculate position on elliptical path
    box.innerShape.x = centerX + radiusX * Math.cos(angle);
    box.innerShape.y = centerY + 25 + radiusY * Math.sin(angle);
  }

  bezier(box) {
    // For a loop that returns to origin, make p0 and p3 the same point
    const p0 = [0, 0]; // Start at origin
    const p1 = [-75, 10]; // Control point 1
    const p2 = [100, 40]; // Control point 2
    const p3 = [0, 0]; // End at origin for perfect loop
    const cycleDuration = 3;

    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Get bezier curve coordinates using the Tween.bezier function
    const pos = Tween.bezier(p0, p1, p2, p3, t);

    // Apply to the shape
    box.innerShape.x = pos.x;
    box.innerShape.y = pos.y;
  }

  parabolic(box) {
    const startPos = { x: -40, y: 40 };
    const endPos = { x: 40, y: -40 };
    const xPeak = -50; // Center position for x peak
    const yPeak = -50; // Peak position for y (can adjust for different arc heights)
    const cycleDuration = 2; // Duration in seconds

    // Calculate normalized time (0-1) within cycle
    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Apply parabolic interpolation to both x and y coordinates
    box.innerShape.x = Tween.parabolicArc(startPos.x, xPeak, endPos.x, t);
    box.innerShape.y = Tween.parabolicArc(startPos.y, yPeak, endPos.y, t);
  }

  pulse(box) {
    // Animate the inner shape’s scale using pulse.
    // The shape will pulse between scale factors 0.5 and 1.5 over a 1.5-second cycle.
    const t = (box.animTime % 1.5) / 1.5;
    const newScale = Tween.pulse(0.5, 1.5, t);
    box.innerShape.scaleX = box.innerShape.scaleY = newScale;
    box.innerShape.y = box.innerShape.scaleX * -25;
  }

  oscillate(box) {
    // Animate the inner shape’s x position using oscillation.
    // The shape will move between -20 and 20 along the x axis with a 2-second period.
    box.innerShape.rotation = Tween.oscillate(-20, 20, box.animTime, 10);
  }

  spring(box) {
    const values = this.springValues[this.springGoingDown ? 0 : 1];
    // Animate the inner shape’s y position using spring.
    const spring = Tween.spring(box.innerShape.y, values, {
      velocity: this.sprinvgVelocity,
      stiffness: 0.1, // Stiffness of the spring. Larger Value = More rigid less jiggly bounce
      damping: 0.9, // Damping of the spring. Larger Value = More Bounces
    });
    box.innerShape.y = spring.value;
    this.sprinvgVelocity = spring.velocity;
    if (spring.done) {
      console.log("Spring reached max value");
      this.springGoingDown = !this.springGoingDown;
      this.sprinvgVelocity = 0;
      box.innerShape.y = 0;
    }
  }

  shake(box) {
    const centerX = 0;
    const centerY = 0;
    const maxOffsetX = 20; // Maximum X shake amount
    const maxOffsetY = 15; // Maximum Y shake amount
    const frequency = 3; // Speed of shakes
    const decay = 2; // How quickly shake reduces (higher = faster decay)
    const cycleDuration = 3; // 3 seconds per cycle

    const t = (box.animTime % cycleDuration) / cycleDuration;

    // Get shake coordinates
    const pos = Tween.shake(
      centerX,
      centerY,
      maxOffsetX,
      maxOffsetY,
      frequency,
      decay,
      t
    );

    // Apply to the shape
    box.innerShape.x = pos.x;
    box.innerShape.y = pos.y;
  }
}

// AnimationsDemo: A demo Scene that uses a HorizontalLayout to arrange three ShapeBoxes
// Each ShapeBox receives a different inner shape and its inner shape is animated separately.
class AnimationsDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    // Create a HorizontalLayout with some spacing and padding,
    // and set its anchor property to "center" so it appears centered on the screen.
    this.layout = new TileLayout(game, {
      spacing: 30,
      columns: 3,
      padding: 30,
      align: "center",
      anchor: "center",
      debug: true,
    });
    const boxDefinitiosn = [
      {
        type: "parabolic",
        innerShape: new Circle(40, -40, 5, {
          fillColor: "white",
        }),
      },
      {
        type: "spiral",
        innerShape: new Circle(0, 0, 5, {
          fillColor: "white",
        }),
      },
      {
        type: "orbit",
        innerShape: new Circle(0, 0, 5, {
          fillColor: "white",
        }),
      },
      {
        type: "spring",
        innerShape: new Square(0, 0, 20, {
          fillColor: "white",
        }),
      },
      {
        type: "bounce",
        innerShape: new Square(0, 0, 20, {
          fillColor: "white",
        }),
      },
      {
        type: "pulse",
        innerShape: new Heart(0, 0, 50, 50, {
          fillColor: "white",
          lineWidth: 3,
        }),
      },
      {
        type: "bezier",
        innerShape: new StickFigure(0, 0, 0.3, {
          strokeColor: "white",
        }),
      },
      {
        type: "shake",
        innerShape: new Star(0,0, 30, 5, 0.5, {
          fillColor: "white",
        }),
      },
      {
        type: "oscillate",
        innerShape: new Arc(0, 0, 20, 0, Math.PI * 1.5, {
          strokeColor: "white",
          lineWidth: 10,
        }),
      },
    ];
    // Create three ShapeBoxes with different inner shapes and types.
    this.boxes = boxDefinitiosn.map((boxDef) => {
      const innerShape = boxDef.innerShape;
      const type = boxDef.type;
      const shapeBox = new ShapeBox(game, innerShape, type, {
        width: 100,
        height: 120,
        x: 0,
        y: 0,
      });
      shapeBox.animTime = 0; // Initialize the animation time for each box
      // Add the ShapeBox to the layout.
      this.layout.add(shapeBox);
      return shapeBox;
    });
    // Finally, add the layout to the scene.
    this.add(this.layout);
  }

  update(dt) {
    //console.log(this.layout.x, this.layout.y, this.layout.width, this.layout.height);
    // For each ShapeBox, update its internal animation (i.e. update the inner shape only)
    this.boxes.forEach((box) => {
      box.animTime += dt;
      //console.log(box.type);
      box[box.type](box);
    });
    // Call the parent update (which also updates the layout positions).
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
    this.pipeline.add(new AnimationsDemo(this));
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

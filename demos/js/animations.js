import {
  Arc,
  Circle,
  Easing,
  FPSCounter,
  Game,
  Group,
  Heart,
  Painter,
  PieSlice,
  Rectangle,
  Scene,
  Square,
  Star,
  StickFigure,
  TextShape,
  TileLayout,
  Triangle,
  Tween,
} from "../../src/index";
import { Motion } from "../../src/motion/motion";
// Tile shapes
const boxDefinitiosn = [
  {
    type: "hop",
    innerShape: new Square(0, 0, 30, {
      fillColor: "white",
    }),
  },
  {
    type: "spring",
    innerShape: new Square(0, 0, 30, {
      fillColor: "white",
    }),
  },
  {
    type: "bounce",
    innerShape: new Square(0, 0, 30, {
      fillColor: "white",
    }),
  },
  {
    type: "shake",
    innerShape: new Star(0, 0, 30, 5, 0.5, {
      fillColor: "white",
    }),
  },

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
    type: "float",
    innerShape: new Circle(0, 0, 5, {
      fillColor: "white",
    }),
  },
  {
    type: "bezier",
    innerShape: new StickFigure(0, 0, 0.3, {
      strokeColor: "white",
    }),
  },
  {
    type: "patrol",
    innerShape: new StickFigure(0, 0, 0.3, {
      strokeColor: "white",
    }),
  },
  {
    type: "follow",
    innerShape: new StickFigure(0, 0, 0.3, {
      strokeColor: "white",
    }),
  },
  {
    type: "waypoint",
    innerShape: new StickFigure(0, 0, 0.3, {
      strokeColor: "white",
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
    type: "oscillate",
    innerShape: new Arc(0, 0, 20, 0, Math.PI * 1.5, {
      strokeColor: "white",
      lineWidth: 10,
    }),
  },
  {
    type: "swing",
    innerShape: new PieSlice(0, 0, 30, 0, Math.PI * 0.3, {
      fillColor: "white",
    }),
  },
  {
    type: "pendulum",
    innerShape: new PieSlice(0, 0, 30, 0, Math.PI * 0.3, {
      fillColor: "white",
    }),
  },
];

// AnimationsDemo: A demo Scene that uses a TileLayout to arrange three ShapeBoxes
// Each ShapeBox receives a different inner shape and its inner shape is animated separately.
class AnimationsDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    // Create a HorizontalLayout with some spacing and padding,
    // and set its anchor property to "center" so it appears centered on the screen.
    this.layout = new TileLayout(game, {
      spacing: 30,
      columns: 4,
      padding: 30,
      align: "center",
      anchor: "center",
      debug: true,
    });
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
      box[box.type](box, dt);
    });
    // Call the parent update (which also updates the layout positions).
    super.update(dt);
  }
}

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

  swing(box, dt) {
    // Setup animation time
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    // Setup state
    if (!box.swingState) box.swingState = null;
    const result = Motion.swing(
      0,
      0, // Center (just semantic here)
      Math.PI / 2, // Max swing angle (30 degrees)
      box.animTime, // Elapsed time
      3.0, // 6 seconds for full cycle
      true, // Loop
      true, // Yoyo
      null, // Easing (skipped easing here to highlight the difference between pendulum and swing interpolating the same angules on the same time)
      {}, // Callbacks (optional)
      box.swingState // State tracking
    );
    box.swingState = result.state;
    box.innerShape.rotation = 45 + result.angle;
  }

  pendulum(box, dt) {
    // Track animation time
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    // Keep state
    if (!box.pendulumState) box.pendulumState = null;

    const result = Motion.pendulum(
      Math.PI / 3, // origin angle (radians)
      Math.PI / 3, // max amplitude (45 degrees)
      box.animTime, // elapsed time
      3.0, // 3 seconds per cycle
      true, // loop
      true, // damped
      null, // easing: these radian animations do support them but the default motion is already very pendulum-like
      {}, // callbacks
      box.pendulumState // state
    );

    box.pendulumState = result.state;
    box.innerShape.rotation = result.angle;
  }

  hop(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    if (!box.hopState) box.hopState = null;

    const result = Motion.hop(
      35, // baseY (ground)
      30, // hop height
      box.animTime,
      1.2, // duration
      true, // loop
      true, //yoyo
      Easing.easeInOutQuart,
      {
        onLoop: () => {
          //console.log("hop loop")
        },
      },
      box.hopState
    );

    box.hopState = result.state;
    box.innerShape.y = result.y;
  }

  parabolic(box) {
    const startPos = { x: -45, y: 30 };
    const endPos = { x: 30, y: -40 };
    const cycleDuration = 2; // Duration in seconds
    // Calculate normalized time (0-1) within cycle
    const frameX = Motion.parabolic(
      startPos.x,
      -50,
      endPos.x,
      box.animTime,
      cycleDuration,
      true,
      true,
      Easing.easeInOutBack
    );
    const frameY = Motion.parabolic(
      startPos.y,
      -50,
      endPos.y,
      box.animTime,
      cycleDuration,
      true,
      true,
      Easing.easeInOutBack
    );
    // Apply parabolic interpolation to both x and y coordinates
    box.innerShape.x = frameX.value;
    box.innerShape.y = frameY.value;
  }

  spiral(box) {
    if (!box.easingFun) box.easingFun = Easing.easeInOutSine;
    const centerX = 0;
    const centerY = 0;
    const startRadius = 0; // Start from center
    const endRadius = 40; // Maximum radius
    const startAngle = 0;
    const revolutions = 2; // Two full revolutions
    const duration = 3; // 3 seconds per cycle

    // Pass the accumulated time to the function directly
    const result = Motion.spiral(
      centerX,
      centerY,
      startRadius,
      endRadius, // Use the max radius as the end radius
      startAngle,
      revolutions,
      box.animTime, // Pass accumulated time directly
      duration,
      true, // Loop = true
      true, // yo-yo
      box.easingFun
    );
    // Use the x and y properties from the result
    box.innerShape.x = result.x;
    box.innerShape.y = result.y;
  }

  orbit(box) {
    const radiusX = -40;
    const radiusY = 30;
    const startAngle = Math.PI / 2; // Start from top (to begin at origin)
    const cycleDuration = 3;
    // Calculate center offset to make the orbit pass through origin
    const centerX = 0;
    const centerY = 0;
    const result = Motion.orbit(
      centerX,
      centerY,
      radiusX,
      radiusY,
      startAngle,
      box.animTime,
      cycleDuration,
      true,
      true,
      Easing.easeInOutSine
    );
    // Calculate position on elliptical path
    box.innerShape.x = result.x;
    box.innerShape.y = result.y;
  }

  float(box, dt) {
    // Initialize animTime if needed
    if (box.animTime === undefined) box.animTime = 0;
    // Add delta time
    box.animTime += dt;
    // Get the patrol position and state
    const result = Motion.float(
      box, // Target object with x,y properties
      box.animTime, // Elapsed time
      10, // 10-second patrol cycle
      0.8, // Medium speed
      0.7, // Medium randomness
      30, // 60px radius patrol area
      true // Loop
    );
    // Apply the new position
    box.innerShape.x = result.x;
    box.innerShape.y = result.y;
    // Change animation based on movement state
    if (result.moving) {
      //box.playAnimation('walk');
      // Set facing direction based on movement
      if (result.offsetX > 0) {
        //box.faceRight();
      } else {
        //box.faceLeft();
      }
    } else {
      //box.playAnimation('idle');
    }
  }

  waypoint(guard, dt) {
    // Initialize animTime if needed
    if (guard.animTime === undefined) guard.animTime = 0;
    // Add delta time
    guard.animTime += dt;
    // Define waypoints for patrol route
    const waypoints = [
      [0, 0], // Start position
      [40, 0], // Move right
      [40, -30], // Move down
      [-40, -30], // Move left
      [-40, 30], // Move right
      [40, 30], // Return to start
    ];
    // Get patrol position and state
    const result = Motion.waypoint(
      guard, // Target object (not used for position)
      guard.animTime, // Elapsed time
      waypoints, // Patrol waypoints
      50, // Speed (50 units per second)
      1.5, // Wait time (1.5 seconds at each point)
      true, // Loop
      {
        // Optional callbacks
        onWaypointReached: (index) => {
          //console.log(`Reached waypoint ${index}`);
        },
      }
    );
    // Apply position
    guard.innerShape.x = result.x;
    guard.innerShape.y = result.y;
    // Update animation based on movement state and direction
    if (result.moving) {
      // Play walking animation in the correct direction
      //guard.playAnimation(`walk_${result.direction}`);
    } else {
      // Play idle animation at waypoints
      //guard.playAnimation("idle");
    }
  }

  patrol(guard, dt) {
    // Initialize animTime if needed
    if (guard.animTime === undefined) guard.animTime = 0;
    guard.animTime += dt;
    // Initialize or reuse patrol state
    if (!guard.patrolState) guard.patrolState = null;
    // Get patrol position
    const result = Motion.patrol(
      0,
      0, // Initial center of patrol area
      guard.animTime, // Elapsed time
      1.5, // Move time
      2.0, // Wait time
      40, // Radius
      true, // Loop
      guard.patrolState // Persistent state
    );
    guard.patrolState = result.state; // <-- persist updated state
    guard.innerShape.x = result.x;
    guard.innerShape.y = result.y;
    //console.log(result);
    if (result.moving) {
      // guard.playAnimation("walk_" + result.direction);
    } else {
      // guard.playAnimation("idle");
    }
  }

  spring(box, dt) {
    // Make sure animTime is initialized
    if (box.animTime === undefined) box.animTime = 0;
    // Add delta time
    box.animTime += dt;
    // Run spring with your parameters
    const result = Motion.spring(
      30, // Initial position
      -30, // Target position
      box.animTime,
      3, // Duration
      true, // Loop
      true,
      {
        stiffness: 0.7,
        damping: 0.5,
      }
    );
    // Apply result
    box.innerShape.y = result.value;
  }

  bounce(box) {
    const maxHeight = -35; // Top position (negative y value)
    const groundY = 35; // Bottom position (ground)
    const bounceCount = 3; // Number of bounces
    const cycleDuration = 3; // 3 seconds per cycle
    const frame = Motion.bounce(
      maxHeight,
      groundY,
      bounceCount,
      box.animTime,
      cycleDuration,
      true
    );
    // Update positions
    box.innerShape.x = 0;
    box.innerShape.y = frame.y;
  }

  bezier(box, dt) {
    // Make sure animTime is initialized
    if (box.animTime === undefined) box.animTime = 0;
    // Add delta time
    box.animTime += dt;
    // For a loop that returns to origin, make p0 and p3 the same point
    const p0 = [-30, 30]; // Start at origin
    const p1 = [-75, 10]; // Control point 1
    const p2 = [100, 40]; // Control point 2
    const p3 = [-40, -40]; // End at origin for perfect loop
    const cycleDuration = 10;
    // Get bezier curve coordinates using the Tween.bezier function
    const pos = Motion.bezier(
      p0,
      p1,
      p2,
      p3,
      box.animTime,
      cycleDuration,
      true,
      true,
      Easing.easeInOutExpo
    );
    // Apply to the shape
    box.innerShape.x = pos.x;
    box.innerShape.y = pos.y;
  }

  pulse(box, dt) {
    // Initialize animTime if it doesn't exist
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    // Get the pulse value
    const result = Motion.pulse(0.5, 1.5, box.animTime, 2, true);
    // Apply the scale
    box.innerShape.scaleX = box.innerShape.scaleY = result.value;
    // Update position based on scale
    box.innerShape.y = box.innerShape.scaleX * -25;
    // Debug output to console for tests
    //console.log(`Time: ${box.animTime.toFixed(2)}, Scale: ${result.value.toFixed(2)}`);
  }

  shake(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    //
    const centerX = 0;
    const centerY = 0;
    const maxOffsetX = 20; // Maximum X shake amount
    const maxOffsetY = 15; // Maximum Y shake amount
    const frequency = 5; // Speed of shakes
    const decay = 1; // How quickly shake reduces (higher = faster decay)
    const cycleDuration = 5; // 3 seconds per cycle
    // Get shake coordinates
    const pos = Motion.shake(
      centerX,
      centerY,
      maxOffsetX,
      maxOffsetY,
      frequency,
      decay,
      box.animTime,
      cycleDuration,
      true,
      Easing.easeInOutQuad
    );

    // Apply to the shape
    box.innerShape.x = pos.x;
    box.innerShape.y = pos.y;
  }

  oscillate(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    // Animate the inner shape’s x position using oscillation.
    // The shape will move between -20 and 20 along the x axis with a 2-second period.
    box.innerShape.rotation = Motion.oscillate(
      Math.PI * 1.5 * -1,
      Math.PI * 1.5,
      box.animTime,
      5,
      true
    ).value;
  }

  follow(box, dt) {
    // Initialize time and state on first call
    if (box.animTime === undefined) box.animTime = 0;
    if (!box.followState) box.followState = null;
    // Update time
    box.animTime += dt;
    // Define the path (can be any number of points)
    const pathPoints = [
      [-30, 30],
      [30, 30],
      [30, -30],
      [-30, -30],
    ];

    // Call the followPath animation
    const result = Motion.follow(
      pathPoints,
      true, // closed path (returns to start)
      box.animTime, // elapsed time
      6, // duration to complete full loop
      true, // loop
      Easing.easeInOutSine, // easing function
      {}, // no callbacks
      box.followState // persistent state
    );
    // Save the new state
    box.followState = result.state;
    // Apply new position
    box.innerShape.x = result.x;
    box.innerShape.y = result.y;
    // Optional: Rotate box to face direction of motion
    //box.innerShape.rotation = result.angle;
    box.innerShape.rotation = Tween.lerpAngle(
      box.innerShape.rotation,
      result.angle,
      dt * 10
    );
    // Log debug info
    // console.log(result);
  }
}

// Boilerplate game to run our scene
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

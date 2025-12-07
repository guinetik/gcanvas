import {
  Arc,
  Circle,
  Easing,
  FPSCounter,
  Game,
  GameObjectShapeWrapper,
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
  Motion,
  Tween,
  GameObject,
} from "/gcanvas.es.min.js";
// ShapeBox: A GameObject that wraps an inner shape within a background
class ShapeBox extends GameObject {
  constructor(game, innerShape, type, options = {}) {
    super(game, options);
    const whites = ["bezier", "patrol", "follow", "waypoint"];
    const group = new Group();
    group.width = options.width;
    group.height = options.height;
    const bg = new Rectangle({
      width: 100,
      height: 100,
      //color: Painter.colors.randomColorHSL(),
      //color: "#FF0000",
      color: whites.includes(type) ? "white" : "transparent",
      stroke: "white",
      lineWidth: 2,
    });
    group.add(bg);
    /* group.add(new Rectangle({
      width: 100 - 10,
      height: 100 -10
    })) */
    group.add(innerShape);
    this.type = type;
    this.group = group;
    this.group.add(
      new TextShape(this.type, {
        x: 0,
        y: 40,
        font: "16px monospace",
        color: whites.includes(type) ? "black" : "white",
      })
    );
    // Store a reference to the inner shape so you can update its animation separately.
    this.innerShape = innerShape;
  }

  draw() {
    super.draw();
    this.group.render();
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
      90, // Max swing angle (30 degrees)
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
      60, // origin angle (radians)
      120, // max amplitude (45 degrees)
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
      -20, // baseY (ground)
      -40, // hop height
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
      {x:0,y:0}, // Target object with x,y properties
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
      -15, // Initial position
      18, // Target position
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
    const maxHeight = -20; // Top position (negative y value)
    const groundY = 25; // Bottom position (ground)
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
    box.innerShape.color = "white";
  }

  oscillate(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    // Animate the inner shape’s x position using oscillation.
    // The shape will move between -20 and 20 along the x axis with a 2-second period.
    box.innerShape.rotation = Motion.oscillate(
      -270,
      270,
      box.animTime,
      3,
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

// AnimationsDemo: A demo Scene that uses a TileLayout to arrange three ShapeBoxes
// Each ShapeBox receives a different inner shape and its inner shape is animated separately.
class AnimationsDemo extends TileLayout {
  constructor(game, options = {}) {
    super(game, options);
    this.boxDefinitions = [
      {
        type: "hop",
        innerShape: new Square(30, {
          color: "white",
        }),
      },
      {
        type: "spring",
        innerShape: new Square(30, {
          color: "white",
        }),
      },
      {
        type: "bounce",
        innerShape: new Square(30, {
          color: "white",
        })
      },
      {
        type: "shake",
        innerShape: new Square(30, {
          color: "white",
        })
      },
      {
        type: "parabolic",
        innerShape: new Circle(5, {
          x: -40,
          y: -40,
          color: "white",
        }),
      },
      {
        type: "spiral",
        innerShape: new Circle(5, {
          color: "white",
        }),
      },
      {
        type: "orbit",
        innerShape: new Circle(5, {
          color: "white",
        }),
      },
      {
        type: "float",
        innerShape: new Circle(5, {
          color: "white",
        }),
      },
      {
        type: "bezier",
        innerShape: new StickFigure(0.3, {
          stroke: "black",
        }),
      },
      {
        type: "patrol",
        innerShape: new StickFigure(0.3, {
          stroke: "black",
        }),
      },
      {
        type: "follow",
        innerShape: new StickFigure(0.3, {
          stroke: "black",
        }),
      },
      {
        type: "waypoint",
        innerShape: new StickFigure(0.3, {
          stroke: "black",
        }),
      },
      {
        type: "pulse",
        innerShape: new Heart({
          width: 50,
          height: 50,
          color: "white",
          lineWidth: 3,
        }),
      },
      {
        type: "oscillate",
        innerShape: new Arc(20, 0, Math.PI * 1.5, {
          stroke: "white",
          lineWidth: 10,
        }),
      },
      {
        type: "swing",
        innerShape: new PieSlice(30, 0, Math.PI * 0.3, {
          color: "white",
        }),
      },
      {
        type: "pendulum",
        innerShape: new PieSlice(30, 0, Math.PI * 0.3, {
          color: "white",
        }),
      },
    ];
  }

  init() {
    // Create three ShapeBoxes with different inner shapes and types.
    this.boxes = this.boxDefinitions.map((boxDef) => {
      const innerShape = boxDef.innerShape;
      const type = boxDef.type;
      const shapeBox = new ShapeBox(game, innerShape, type, {
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      });
      shapeBox.width = 100;
      shapeBox.height = 100;
      shapeBox.animTime = 0; // Initialize the animation time for each box
      // Add the ShapeBox to the layout.
      this.add(shapeBox);
      return shapeBox;
    });
  }

  update(dt) {
    //console.log(this.layout.x, this.layout.y, this.layout.width, this.layout.height);
    // For each ShapeBox, update its internal animation (i.e. update the inner shape only)
    if (this.boxes && this.boxes.length > 0) {
      this.boxes.forEach((box) => {
        box.animTime += dt;
        //console.log(box.type);
        box[box.type](box, dt);
      });
    }
    // Call the parent update (which also updates the layout positions).
    super.update(dt);
  }
}

// Boilerplate game to run our scene
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
  }

  /**Override clear function to give pseudo trailling effect */
  clear() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.21)";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  init() {
    super.init();
    this.animationsDemo = new AnimationsDemo(this, {
      debug: true,
      anchor: "center",
      spacing: 30,
      columns: 4,
      padding: 30,
      align: "center",
    });
    this.pipeline.add(this.animationsDemo);
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

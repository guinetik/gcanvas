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
} from "../../src/index";

/**
 * ShapeBox: A GameObject that wraps an inner shape within a background
 *
 * Demonstrates the Transform API for animations:
 * - Uses transform.position() for x/y updates
 * - Uses transform.rotation() for rotation updates
 * - Uses transform.scale() for scale updates
 */
class ShapeBox extends GameObject {
  constructor(game, innerShape, type, options = {}) {
    super(game, options);
    const whites = ["bezier", "patrol", "follow", "waypoint"];
    const group = new Group();
    // Use Transform API to set group dimensions
    group.transform.size(options.width, options.height);

    const bg = new Rectangle({
      width: 100,
      height: 100,
      color: whites.includes(type) ? "white" : "transparent",
      stroke: "white",
      lineWidth: 2,
    });
    group.add(bg);
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
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    if (!box.swingState) box.swingState = null;
    const result = Motion.swing(
      0, 0,
      90,
      box.animTime,
      3.0,
      true, true, null, {},
      box.swingState
    );
    box.swingState = result.state;
    // Use Transform API for rotation
    box.innerShape.transform.rotation(45 + result.angle);
  }

  pendulum(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    if (!box.pendulumState) box.pendulumState = null;

    const result = Motion.pendulum(
      60, 120,
      box.animTime,
      3.0,
      true, true, null, {},
      box.pendulumState
    );

    box.pendulumState = result.state;
    // Use Transform API for rotation
    box.innerShape.transform.rotation(result.angle);
  }

  hop(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;
    if (!box.hopState) box.hopState = null;

    const result = Motion.hop(
      -20, -40,
      box.animTime,
      1.2,
      true, true,
      Easing.easeInOutQuart,
      { onLoop: () => {} },
      box.hopState
    );

    box.hopState = result.state;
    // Use Transform API for y position
    box.innerShape.transform.y(result.y);
  }

  parabolic(box) {
    const startPos = { x: -45, y: 30 };
    const endPos = { x: 30, y: -40 };
    const cycleDuration = 2;

    const frameX = Motion.parabolic(
      startPos.x, -50, endPos.x,
      box.animTime, cycleDuration,
      true, true,
      Easing.easeInOutBack
    );
    const frameY = Motion.parabolic(
      startPos.y, -50, endPos.y,
      box.animTime, cycleDuration,
      true, true,
      Easing.easeInOutBack
    );
    // Use Transform API for position
    box.innerShape.transform.position(frameX.value, frameY.value);
  }

  spiral(box) {
    if (!box.easingFun) box.easingFun = Easing.easeInOutSine;
    const result = Motion.spiral(
      0, 0,     // center
      0, 40,    // start/end radius
      0, 2,     // start angle, revolutions
      box.animTime, 3,
      true, true,
      box.easingFun
    );
    // Use Transform API for position
    box.innerShape.transform.position(result.x, result.y);
  }

  orbit(box) {
    const result = Motion.orbit(
      0, 0,           // center
      -40, 30,        // radius X/Y
      Math.PI / 2,    // start angle
      box.animTime, 3,
      true, true,
      Easing.easeInOutSine
    );
    // Use Transform API for position
    box.innerShape.transform.position(result.x, result.y);
  }

  float(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    const result = Motion.float(
      { x: 0, y: 0 },
      box.animTime,
      10, 0.8, 0.7, 30, true
    );
    // Use Transform API for position
    box.innerShape.transform.position(result.x, result.y);
  }

  waypoint(guard, dt) {
    if (guard.animTime === undefined) guard.animTime = 0;
    guard.animTime += dt;

    const waypoints = [
      [0, 0], [40, 0], [40, -30],
      [-40, -30], [-40, 30], [40, 30],
    ];

    const result = Motion.waypoint(
      guard, guard.animTime, waypoints,
      50, 1.5, true,
      { onWaypointReached: (index) => {} }
    );
    // Use Transform API for position
    guard.innerShape.transform.position(result.x, result.y);
  }

  patrol(guard, dt) {
    if (guard.animTime === undefined) guard.animTime = 0;
    guard.animTime += dt;
    if (!guard.patrolState) guard.patrolState = null;

    const result = Motion.patrol(
      0, 0,
      guard.animTime,
      1.5, 2.0, 40, true,
      guard.patrolState
    );
    guard.patrolState = result.state;
    // Use Transform API for position
    guard.innerShape.transform.position(result.x, result.y);
  }

  spring(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    const result = Motion.spring(
      -15, 18,
      box.animTime, 3,
      true, true,
      { stiffness: 0.7, damping: 0.5 }
    );
    // Use Transform API for y position
    box.innerShape.transform.y(result.value);
  }

  bounce(box) {
    const frame = Motion.bounce(
      -20, 25, 3,
      box.animTime, 3, true
    );
    // Use Transform API for position
    box.innerShape.transform.position(0, frame.y);
  }

  bezier(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    const p0 = [-30, 30];
    const p1 = [-75, 10];
    const p2 = [100, 40];
    const p3 = [-40, -40];

    const pos = Motion.bezier(
      p0, p1, p2, p3,
      box.animTime, 10,
      true, true,
      Easing.easeInOutExpo
    );
    // Use Transform API for position
    box.innerShape.transform.position(pos.x, pos.y);
  }

  pulse(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    const result = Motion.pulse(0.5, 1.5, box.animTime, 2, true);
    // Use Transform API for scale and position
    box.innerShape.transform
      .scale(result.value)
      .y(result.value * -25);
  }

  shake(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    const pos = Motion.shake(
      0, 0,       // center
      20, 15,     // max offset X/Y
      5, 1,       // frequency, decay
      box.animTime, 5,
      true,
      Easing.easeInOutQuad
    );
    // Use Transform API for position
    box.innerShape.transform.position(pos.x, pos.y);
    box.innerShape.color = "white";
  }

  oscillate(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    box.animTime += dt;

    const result = Motion.oscillate(-270, 270, box.animTime, 3, true);
    // Use Transform API for rotation
    box.innerShape.transform.rotation(result.value);
  }

  follow(box, dt) {
    if (box.animTime === undefined) box.animTime = 0;
    if (!box.followState) box.followState = null;
    box.animTime += dt;

    const pathPoints = [
      [-30, 30], [30, 30], [30, -30], [-30, -30],
    ];

    const result = Motion.follow(
      pathPoints,
      true, box.animTime, 6, true,
      Easing.easeInOutSine,
      {},
      box.followState
    );
    box.followState = result.state;

    // Use Transform API for position and rotation
    box.innerShape.transform.position(result.x, result.y);

    // Lerp the rotation for smooth turning
    const currentRotation = box.innerShape.rotation * 180 / Math.PI; // Convert from radians to degrees
    const targetRotation = result.angle;
    const newRotation = Tween.lerpAngle(currentRotation, targetRotation, dt * 10);
    box.innerShape.transform.rotation(newRotation);
  }
}

/**
 * AnimationsDemo: A demo Scene that uses a TileLayout to arrange ShapeBoxes
 * Each ShapeBox receives a different inner shape and animates using Transform API
 */
class AnimationsDemo extends TileLayout {
  constructor(game, options = {}) {
    super(game, options);
    this.boxDefinitions = [
      { type: "hop", innerShape: new Square(30, { color: "white" }) },
      { type: "spring", innerShape: new Square(30, { color: "white" }) },
      { type: "bounce", innerShape: new Square(30, { color: "white" }) },
      { type: "shake", innerShape: new Square(30, { color: "white" }) },
      { type: "parabolic", innerShape: new Circle(5, { x: -40, y: -40, color: "white" }) },
      { type: "spiral", innerShape: new Circle(5, { color: "white" }) },
      { type: "orbit", innerShape: new Circle(5, { color: "white" }) },
      { type: "float", innerShape: new Circle(5, { color: "white" }) },
      { type: "bezier", innerShape: new StickFigure(0.3, { stroke: "black" }) },
      { type: "patrol", innerShape: new StickFigure(0.3, { stroke: "black" }) },
      { type: "follow", innerShape: new StickFigure(0.3, { stroke: "black" }) },
      { type: "waypoint", innerShape: new StickFigure(0.3, { stroke: "black" }) },
      { type: "pulse", innerShape: new Heart({ width: 50, height: 50, color: "white", lineWidth: 3 }) },
      { type: "oscillate", innerShape: new Arc(20, 0, Math.PI * 1.5, { stroke: "white", lineWidth: 10 }) },
      { type: "swing", innerShape: new PieSlice(30, 0, Math.PI * 0.3, { color: "white" }) },
      { type: "pendulum", innerShape: new PieSlice(30, 0, Math.PI * 0.3, { color: "white" }) },
    ];
  }

  init() {
    this.boxes = this.boxDefinitions.map((boxDef) => {
      const innerShape = boxDef.innerShape;
      const type = boxDef.type;
      const shapeBox = new ShapeBox(game, innerShape, type, {
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      });
      // Use Transform API to set dimensions
      shapeBox.transform.size(100, 100);
      shapeBox.animTime = 0;
      this.add(shapeBox);
      return shapeBox;
    });
  }

  update(dt) {
    if (this.boxes && this.boxes.length > 0) {
      this.boxes.forEach((box) => {
        box.animTime += dt;
        box[box.type](box, dt);
      });
    }
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

  /** Override clear function to give pseudo trailing effect */
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

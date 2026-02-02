import {
  Game,
  GameObject,
  Group,
  Rectangle,
  Circle,
  TextShape,
  FPSCounter,
} from "../../src/index";

export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  update(dt) {
    super.update(dt);
    // Use transform API for positioning
    this.groupDemo.transform.position(this.width / 2, this.height / 2);
    this.pipeline.update(dt);
  }

  init() {
    super.init();
    this.groupDemo = new GroupDemo(this);
    this.pipeline.add(this.groupDemo);
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

/**
 * GroupDemo
 *
 * Demonstrates the Transform API with groups:
 *  - Group-wide rotation & scaling using transform.rotation() and transform.scale()
 *  - Child positioning using transform.position()
 *  - Batch operations using forEachTransform()
 *  - Circles arranged radially, color-shifting via HSL
 */
export class GroupDemo extends GameObject {
  constructor(game) {
    super(game);
    // Create a Group and set dimensions using Transform API
    this.group = new Group({ debug: true, origin: "center" });
    this.group.transform.size(450, 450);

    // 1) A central rectangle - positioned at center of group
    const centerRect = new Rectangle({
      width: 200,
      height: 40,
      color: "#222",
      debug: true,
      origin: "center",
    });
    centerRect.transform.position(0, 0);
    this.group.add(centerRect);

    // 2) Some text in the middle - positioned at center of group
    const centerText = new TextShape("Transform API Demo!", {
      font: "16px sans-serif",
      color: "#FFF",
      align: "center",
      baseline: "middle",
      opacity: 0.5,
      origin: "center",
    });
    centerText.transform.position(0, 0);
    this.group.add(centerText);

    // 3) Create a radial pattern of circles around the origin
    this.circles = [];
    this.circleCount = 20;
    const circleRadius = 200;

    for (let i = 0; i < this.circleCount; i++) {
      const angle = (Math.PI * 2 * i) / this.circleCount;
      const x = Math.cos(angle) * circleRadius;
      const y = Math.sin(angle) * circleRadius;

      const circle = new Circle(20, {
        color: "#ff0",
        stroke: "#FFF",
        lineWidth: 2,
        visible: true,
        origin: "center",
      });

      // Use Transform API to position the circle
      circle.transform.position(x, y);

      this.circles.push(circle);
      this.group.add(circle);
    }

    // Initialize group transforms using the Transform API
    this.group.transform
      .rotation(0)
      .scale(1);

    this.elapsed = 0;
  }

  /**
   * update(dt) - Animate using the Transform API:
   *  1) Group rotation & scale using transform.rotation() and transform.scale()
   *  2) Each circle's color via forEachTransform pattern
   *  3) Circle visibility cycling
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    super.update(dt);
    this.elapsed += dt;

    // 1) Animate group using Transform API (fluent chaining)
    const pulse = 0.5 * Math.sin(this.elapsed * 2);
    this.group.transform
      .rotation(this.elapsed * 24)
      .scale(1 + pulse);

    // 2) Animate each circle's color & visibility
    const cycleSpeed = 0.1;
    const flashIndex = Math.floor(this.elapsed / cycleSpeed) % this.circleCount;

    this.circles.forEach((circle, i) => {
      // Animate color
      const hue = (this.elapsed * 50 + i * 40) % 360;
      circle.color = `hsl(${hue}, 90%, 60%)`;
      // One circle is invisible; all others remain visible
      circle.visible = i !== flashIndex;
    });

    this.group.update(dt);
  }

  draw() {
    this.logger.log("GroupDemo: render");
    this.group.render();
  }
}

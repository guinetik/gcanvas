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
    this.groupDemo.x = this.width / 2;
    this.groupDemo.y = this.height / 2;
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
 * Demonstrates:
 *  - Grouped shapes rotating & scaling (pulsing).
 *  - Circles arranged radially, color-shifting via HSL.
 *  - Only one circle is *invisible* at a time, cycling through them.
 */
export class GroupDemo extends GameObject {
  constructor(game) {
    super(game);
    // Create a Group at the center of the canvas:
    this.group = new Group({debug:true});
    this.group.width = 450;
    this.group.height = 450;
    // 1) A central rectangle
    const centerRect = new Rectangle({
      width: 145,
      height: 60,
      color: "#222",
      debug:true,
    });
    this.group.add(centerRect);
    // 2) Some text in the middle
    const centerText = new TextShape("Grouped Demo!", {
      font: "18px sans-serif",
      color: "#FFF",
      align: "center",
      baseline: "middle",
      opacity:0.5,
    });
    this.group.add(centerText);
    // 3) Create a radial pattern of circles around the origin
    this.circles = [];
    this.circleCount = 20; // how many circles in the loop
    const circleRadius = 200; // distance from center
    for (let i = 0; i < this.circleCount; i++) {
      const angle = (Math.PI * 2 * i) / this.circleCount; // distribute evenly
      const x = Math.cos(angle) * circleRadius;
      const y = Math.sin(angle) * circleRadius;
      const circle = new Circle(20, {
        x: x,
        y: y,
        color: "#ff0",
        stroke: "#FFF",
        lineWidth: 2,
        visible: true, // Start them all visible
      });
      this.circles.push(circle);
      this.group.add(circle);
    }
    // Group’s transform
    this.group.rotation = 0;
    this.group.scaleX = 1;
    this.group.scaleY = 1;
    this.elapsed = 0; // track time for animations
  }

  /**
   * update(dt) - Animate:
   *  1) The group's rotation & scale,
   *  2) Each circle's color,
   *  3) Circle visibility so that only one circle is hidden at a time.
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    super.update(dt);
    this.elapsed += dt;
    // 1) Rotate the entire group (one full revolution in ~6 seconds)
    this.group.rotation = (this.elapsed * 24);
    // 2) Pulse the group scale from 0.8..1.2
    const pulse = 0.5 * Math.sin(this.elapsed * 2); // range -0.5..0.5
    this.group.scaleX = 1 + pulse;
    this.group.scaleY = 1 + pulse;
    // 3) Animate each circle’s color & visibility
    //    We'll determine which circle is "hidden" for ~0.1s each
    const cycleSpeed = 0.1;
    // flashIndex picks which circle is invisible
    const flashIndex = Math.floor(this.elapsed / cycleSpeed) % this.circleCount;
    this.circles.forEach((circle, i) => {
      // Animate color
      const hue = (this.elapsed * 50 + i * 40) % 360;
      circle.color = `hsl(${hue}, 90%, 60%)`;
      // one circle is invisible; all others remain visible
      circle.visible = i !== flashIndex;
    });
    this.group.update(dt);
  }

  draw() {
    this.logger.log("GroupDemo: render");
    this.group.render();
  }
}

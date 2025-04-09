import {
  Game,
  Rectangle,
  Group,
  Scene,
  ShapeGOFactory,
  TextShape,
  FPSCounter,
  Tween,
  Tweenetik,
} from "../../src/index";
export class TweenDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    const bg = new Rectangle(0, 0, 100, 100, { fillColor: "#0f0" });
    const frame = new Rectangle(0, 0, 80, 80, { fillColor: "#000" });
    this.label = new TextShape(0, 0, "1%", {
      font: "18px monospace",
      color: "#F0F",
      align: "center",
      baseline: "middle",
    });
    const group = new Group();
    group.add(bg);
    group.add(frame);
    group.add(this.label);
    group.scaleX = group.scaleY = 2; // add individual scale to this group to test if the outer group scales it too
    //
    const wrapper = new Group();
    wrapper.add(group);
    //
    this.box = ShapeGOFactory.create(game, wrapper);
    this.box.anchor = "center";
    this.add(this.box);
    this.growing = false;
    this.tween();
  }

  tween() {
    this.growing = !this.growing;
    const scale = this.growing ? 2 : 1;
    const easing = this.growing ? Tween.easeOutElastic : Tween.easeInElastic;
    // Tweenetik is a simple tweening library that works with any object
    Tweenetik.to(
      this.box,                         // an object or sprite
      { scaleX: scale, scaleY: scale }, // the properties & end-values
      2.0,                              // duration in seconds
      Tween.easeOutElastic,             // easing function
      {
        delay: 0.5,                     // optional 0.5s delay
        onComplete: () => this.tween(), // restart the tween
        onUpdate: () => this.updateText(),
      }
    );
  }

  updateText() {
    this.label.text = `${Math.round(this.box.scaleX * 100)}%`;
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
    this.pipeline.add(new TweenDemo(this));
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

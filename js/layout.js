import {
  Game,
  Scene,
  FPSCounter,
  GameObject,
  HorizontalLayout,
  VerticalLayout,
  Button,
  ShapeGOFactory,
} from "/gcanvas/src/game/index.js";
import { Rectangle, Group } from "/gcanvas/src/shapes";

export class LayoutDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
  }

  init() {
    // Create UI
    this.ui = new Scene(this);
    this.pipeline.add(this.ui);
    this.ui.add(
      new FPSCounter(this, { color: "black", anchor: "bottom-right" })
    );
    // Config Options
    this.items = [];
    this.mode = "vertical";
    // Create Right Side navigation buttons
    this.rightSide = new Scene(this, {
      x: this.width - 120,
      y: this.height / 2 - 40,
    });
    this.rightSide.add(
      new Button(this, {
        y: 0,
        text: "Vertical",
        onClick: () => this.setLayout("vertical"),
      })
    );
    this.rightSide.add(
      new Button(this, {
        y: 50,
        text: "Horizontal",
        onClick: () => this.setLayout("horizontal"),
      })
    );
    this.ui.add(this.rightSide);
    // Create bottom navigation buttons
    this.bottomNav = new Scene(this);
    this.bottomNav.add(
      new Button(this, {
        text: "ADD",
        onClick: this.addItem.bind(this),
      })
    );
    this.bottomNav.add(
      new Button(this, {
        x: 150,
        text: "REMOVE",
        onClick: () => this.removeItem(),
      })
    );
    this.ui.add(this.bottomNav);
    // Create initial layout
    this.createLayout();
    // Add a few items
    for (let i = 0; i < 5; i++) {
      this.addItem();
    }
  }

  createLayout() {
    if (this.layout) {
      this.layout.clear();
      this.pipeline.remove(this.layout);
    }
    const opts = {
      x: (this.width - 120) / 2,
      y: (this.height - 60) / 2,
      spacing: 8,
      padding: 8,
      debug: true,
    };
    this.layout =
      this.mode === "vertical"
        ? new VerticalLayout(this, opts)
        : new HorizontalLayout(this, opts);
    this.layout.autoSize = true;
    this.items.forEach((item) => {
      const w = this.mode === "horizontal" ? 40 + Math.random() * 60 : 200;
      const h = this.mode === "vertical" ? 40 + Math.random() * 60 : 100;
      item.width = w;
      item.height = h;
      this.layout.add(item);
    });
    this.pipeline.add(this.layout);
  }

  setLayout(mode) {
    //console.log("setLayout", mode);
    if (mode !== this.mode) {
      this.mode = mode;
      this.createLayout();
    }
  }

  addItem() {
    //console.log("addItem");
    const w = this.mode === "horizontal" ? 40 + Math.random() * 60 : 200;
    const h = this.mode === "vertical" ? 40 + Math.random() * 60 : 100;
    const rect = new Rectangle(0, 0, w, h, {
      fillColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
    });
    const go = ShapeGOFactory.create(this, rect);
    go.width = w;
    go.height = h;
    this.items.push(go);
    this.layout.add(go);
  }

  removeItem() {
    //console.log("removeItem");
    if (this.items.length > 0) {
      const go = this.items.pop();
      this.layout.remove(go);
    }
  }

  update(dt) {
    this.rightSide.x = this.width - 120;
    this.rightSide.y = this.height / 2 - 40;
    this.bottomNav.x = this.width / 2 - 80;
    this.bottomNav.y = this.height - 60;
    this.layout.x = (this.width - this.layout.width) / 2;
    this.layout.y = (this.height - this.layout.height) / 2;
    super.update(dt);
  }
}

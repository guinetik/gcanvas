import {
  Game,
  Scene,
  FPSCounter,
  GameObject,
  HorizontalLayout,
  VerticalLayout,
  Button,
  ShapeGOFactory,
  Rectangle,
  Position,
  Painter,
  TileLayout,
  GridLayout,
} from "../../src/index";

export class LayoutDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "white";
  }

  // Define layout modes configuration
  layoutModes = {
    horizontal: {
      layoutClass: HorizontalLayout,
      itemDimensions: () => ({
        width: 40 + Math.random() * 60,
        height: 100,
      }),
    },
    vertical: {
      layoutClass: VerticalLayout,
      itemDimensions: () => ({
        width: 200,
        height: 40 + Math.random() * 60,
      }),
    },
    tile: {
      layoutClass: TileLayout,
      itemDimensions: () => ({
        width: 100,
        height: 100,
      }),
      layoutOptions: (baseOpts) => ({
        ...baseOpts,
        columns: 4,
      }),
    },
    grid: {
      layoutClass: GridLayout,
      itemDimensions: () => {
        // Randomly choose between portrait or landscape
        const isPortrait = Math.random() > 0.5;
        if (isPortrait) {
          // Portrait: taller than wide
          if (Math.random() > 0.3) {
            return {
              width: 100,
              height: 200,
            };
          } else {
            return {
              width: 100,
              height: 100,
            };
          }
        } else {
          if (Math.random() > 0.3) {
            // Landscape: wider than tall
            return {
              width: 100,
              height: 50,
            };
          } else {
            return {
              width: 100,
              height: 100,
            };
          }
        }
      },
      layoutOptions: (baseOpts) => ({
        ...baseOpts,
        columns: 4,
        spacing: 10,
        padding: 10,
        centerItems: true,
      }),
    },
  };

  init() {
    super.init();
    // Config Options
    this.items = [];
    this.mode = "horizontal";
    // Create UI
    this.ui = new Scene(this, {
      debug: true,
      debugColor: "pink",
      anchor: Position.CENTER,
      padding: 10,
    });
    this.pipeline.add(this.ui);
    // Add FPS Counter
    this.pipeline.add(
      new FPSCounter(this, { color: "black", anchor: "bottom-right" })
    );
    // Create Right Side navigation buttons
    this.rightSide = new VerticalLayout(this, {
      debug: true,
      debugColor: "purple",
      anchor: Position.CENTER_RIGHT,
      anchorRelative: this.ui,
      padding: 10,
    });
    // Add right side to UI
    this.ui.add(this.rightSide);
    // Add right side buttons
    Object.keys(this.layoutModes).forEach((mode) => {
      this.rightSide.add(
        new Button(this, {
          text: mode.charAt(0).toUpperCase() + mode.slice(1),
          onClick: () => this.setLayout(mode),
        })
      );
    });
    // Create bottom navigation buttons
    this.bottomNav = new HorizontalLayout(this, {
      anchor: Position.BOTTOM_CENTER,
      debug: true,
      debugColor: "cyan",
      anchorRelative: this.ui,
      padding: 10,
    });
    this.bottomNav.add(
      new Button(this, {
        text: "ADD",
        onClick: this.addItem.bind(this),
      })
    );
    this.bottomNav.add(
      new Button(this, {
        text: "REMOVE",
        onClick: () => this.removeItem(),
      })
    );
    this.ui.add(this.bottomNav);
    // Create initial layout
    this.createLayout();
    // Add a few items
    for (let i = 0; i < 8; i++) {
      this.addItem(i);
    }
  }

  createLayout() {
    if (this.layout) {
      // Properly clear the layout
      const itemsToKeep = [...this.items]; // Save references before clearing
      this.layout.clear();
      this.pipeline.remove(this.layout);
      this.layout = null;
    }

    const baseOpts = {
      anchor: Position.CENTER,
      spacing: 10,
      padding: 10,
      debug: true,
      autoSize: true,
      debugColor: Painter.colors.randomColorHSL(),
    };

    const modeConfig = this.layoutModes[this.mode];
    const layoutOpts = modeConfig.layoutOptions
      ? modeConfig.layoutOptions(baseOpts)
      : baseOpts;

    this.layout = new modeConfig.layoutClass(this, layoutOpts);
    // Add layout to pipeline
    this.pipeline.add(this.layout);
    // Add items to layout
    if (this.items.length > 0) {
      // Reset each item properly
      setTimeout(() => {
        this.items.forEach((item) => {
          const dimensions = modeConfig.itemDimensions();
          item.width = dimensions.width;
          item.height = dimensions.height;
          // Add to the container
          this.layout.add(item);
        });
      }, 10);
      // Mark the layout as needing recalculation
      this.layout.markBoundsDirty();
    }
  }

  update(dt) {
    super.update(dt);
    // stuff that has to do with bound checking should be done after super.update.
    if (this.boundsDirty) {
      console.log("update", this.boundsDirty);
      this.ui.width = this.width - 20;
      this.ui.height = this.height - 20;
      this.ui.markBoundsDirty();
      this.layout.markBoundsDirty();
      this.boundsDirty = false;
    }
  }

  setLayout(mode) {
    if (mode !== this.mode) {
      this.mode = mode;
      this.createLayout();
    }
  }

  addItem(i) {
    const modeConfig = this.layoutModes[this.mode];
    const dimensions = modeConfig.itemDimensions();
    const rect = new Rectangle({
      width: dimensions.width,
      height: dimensions.height,
      color: Painter.colors.randomColorHSL(),
    });
    const go = ShapeGOFactory.create(this, rect);
    go.name = "item " + i;
    this.items.push(go);
    this.layout.add(go);
  }

  removeItem() {
    if (this.items.length > 0) {
      const go = this.items.pop();
      this.layout.remove(go);
    }
  }
}

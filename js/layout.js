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
} from "/gcanvas.es.min.js";

export class LayoutDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
    this.cellSize = 110;
    this.maxColumns = 6;
  }

  getResponsiveColumns() {
    const margin = 100; // space for UI
    const availableWidth = this.width - margin;
    return Math.min(
      this.maxColumns,
      Math.max(1, Math.floor(availableWidth / this.cellSize))
    );
  }

  isMobile() {
    return this.width < 600;
  }

  getLayoutYOffset() {
    // On mobile (no info bar), move layout up; on desktop keep lower to avoid info bar
    return this.isMobile() ? -80 : 0;
  }

  /**
   * Get viewport dimensions based on current layout mode.
   * - Horizontal: fixed height (item height + padding), width = screen - margins
   * - Vertical: fixed width (item width + padding), height = screen - nav - margins
   * - Tile/Grid: square-ish viewport with margins on sides, scrolls vertically
   */
  getViewportDimensions() {
    const navHeight = 320; // bottom nav (two rows at -30 and -100 offset + button heights)
    const margin = 50;

    const layoutModes = this.getLayoutModes();
    const modeConfig = layoutModes[this.mode];

    switch (this.mode) {
      case "horizontal":
        // Horizontal: fixed height based on item height, scroll horizontally
        return {
          width: Math.max(200, this.width - margin * 2),
          height: 100 + 20, // item height (100) + padding
        };

      case "vertical":
        // Vertical: fixed width based on item width, scroll vertically
        return {
          width: 200 + 20, // item width (200) + padding
          height: Math.max(200, this.height - navHeight - margin),
        };

      case "tile":
      case "grid":
      default:
        // Tile/Grid: responsive square-ish viewport, scroll vertically
        return {
          width: Math.max(200, this.width - margin * 2),
          height: Math.max(200, this.height - navHeight - margin),
        };
    }
  }

  // Define layout modes configuration (uses arrow functions to access `this`)
  getLayoutModes() {
    const columns = this.getResponsiveColumns();
    return {
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
          columns: columns,
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
          columns: columns,
          spacing: 10,
          padding: 10,
          centerItems: true,
        }),
      },
    };
  }

  init() {
    super.init();
    // Config Options
    this.items = [];
    this.mode = "horizontal";
    this.currentColumns = this.getResponsiveColumns();

    // Create UI
    this.ui = new Scene(this, {
      debug: true,
      debugColor: "pink",
      anchor: Position.CENTER,
    });
    this.pipeline.add(this.ui);

    // Add FPS Counter
    this.pipeline.add(
      new FPSCounter(this, { color: "#00FF00", anchor: "bottom-right" })
    );

    // Create bottom navigation - layout type selection (at very bottom)
    this.layoutNav = new HorizontalLayout(this, {
      debug: true,
      debugColor: "purple",
      anchor: Position.BOTTOM_CENTER,
      anchorOffsetY: -30,
      padding: 10,
      spacing: 10,
    });
    this.ui.add(this.layoutNav);

    // Add layout type buttons
    const layoutModes = this.getLayoutModes();
    Object.keys(layoutModes).forEach((mode) => {
      this.layoutNav.add(
        new Button(this, {
          text: mode.charAt(0).toUpperCase() + mode.slice(1),
          onClick: () => this.setLayout(mode),
        })
      );
    });

    // Create action buttons (add/remove) - positioned above layout nav
    this.actionNav = new HorizontalLayout(this, {
      anchor: Position.BOTTOM_CENTER,
      debug: true,
      debugColor: "cyan",
      anchorOffsetY: -100, // Space above the layout nav
      padding: 10,
      spacing: 10,
    });
    this.actionNav.add(
      new Button(this, {
        text: "ADD",
        onClick: this.addItem.bind(this),
      })
    );
    this.actionNav.add(
      new Button(this, {
        text: "REMOVE",
        onClick: () => this.removeItem(),
      })
    );
    this.ui.add(this.actionNav);

    // Create initial layout
    this.createLayout();

    // Add enough items to enable scrolling
    for (let i = 0; i < 5; i++) {
      this.addItem(i);
    }
  }

  createLayout() {
    if (this.layout) {
      // Properly clear the layout
      this.layout.clear();
      this.pipeline.remove(this.layout);
      this.layout = null;
    }

    const viewport = this.getViewportDimensions();

    const baseOpts = {
      anchor: Position.CENTER,
      anchorOffsetY: this.getLayoutYOffset(),
      spacing: 10,
      padding: 10,
      debug: true,
      autoSize: true,
      debugColor: Painter.colors.randomColorHSL(),
      // Enable scrolling with responsive viewport
      scrollable: true,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    };

    const layoutModes = this.getLayoutModes();
    const modeConfig = layoutModes[this.mode];
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
      this.ui.width = this.width;
      this.ui.height = this.height;
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
    const layoutModes = this.getLayoutModes();
    const modeConfig = layoutModes[this.mode];
    const dimensions = modeConfig.itemDimensions();
    const rect = new Rectangle({
      width: dimensions.width,
      height: dimensions.height,
      color: Painter.colors.randomColorHSL(),
      stroke: "white",
      lineWidth: 2,
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

  onResize() {
    if (!this.layout) return;

    const newColumns = this.getResponsiveColumns();

    // Recreate layout if columns changed (for tile/grid modes)
    if (this.currentColumns !== newColumns) {
      this.currentColumns = newColumns;
      if (this.mode === "tile" || this.mode === "grid") {
        this.createLayout();
        return; // createLayout already sets up viewport
      }
    }

    // Update viewport dimensions for scrolling (mode-specific)
    const viewport = this.getViewportDimensions();
    this.layout._viewportWidth = viewport.width;
    this.layout._viewportHeight = viewport.height;

    // Update layout Y offset based on mobile/desktop
    this.layout.anchorOffsetY = this.getLayoutYOffset();

    // Update UI dimensions
    this.ui.width = this.width - 20;
    this.ui.height = this.height - 20;
    this.ui.markBoundsDirty();
    this.layoutNav.markBoundsDirty();
    this.actionNav.markBoundsDirty();
    this.layout.markBoundsDirty();
  }
}

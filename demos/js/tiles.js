import {
  Game,
  Scene,
  TileLayout,
  HorizontalLayout,
  Rectangle,
  ShapeGOFactory,
  Button,
  FPSCounter,
  Painter,
  Tween,
  Easing,
  Position,
} from "../../src/index";

// Configuration
const CONFIG = {
  tileSize: 50,
  tileSpacing: 12,
  tilePadding: 20,
  initialTiles: 50,
  maxColumns: 10,
  uiHeight: 100, // Space reserved for UI at bottom
};

export class TileDemo extends Scene {
  constructor(game, options = {}) {
    super(game, { ...options, origin: "center", debug: true, debugColor: "magenta" });
    this.elapsedTime = this.lastChangeTime = 0;
  }

  isMobile() {
    return this.game.width < 600;
  }

  getResponsiveColumns() {
    const availableWidth = this.game.width - CONFIG.tilePadding * 2;
    const tileWithSpacing = CONFIG.tileSize + CONFIG.tileSpacing;
    const columns = Math.floor(availableWidth / tileWithSpacing);
    return Math.max(2, Math.min(CONFIG.maxColumns, columns));
  }

  getViewportDimensions() {
    const margin = this.isMobile() ? 20 : 40;
    return {
      width: this.game.width - margin * 2,
      height: this.game.height - CONFIG.uiHeight - margin,
    };
  }

  init() {
    const game = this.game;
    const viewport = this.getViewportDimensions();
    const columns = this.getResponsiveColumns();

    // 1) Create a scrollable tile grid anchored at center
    this.grid = new TileLayout(game, {
      anchor: Position.CENTER,
      anchorOffsetY: -CONFIG.uiHeight / 2 + 20,
      columns: columns,
      spacing: CONFIG.tileSpacing,
      padding: CONFIG.tilePadding,
      autoSize: true,
      debug: true,
      debugColor: "yellow",
      origin: "center",
      // Enable scrolling
      scrollable: true,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });

    // Add initial tiles
    for (let i = 0; i < CONFIG.initialTiles; i++) {
      this.addTile();
    }
    this.add(this.grid);

    // 2) Create a HorizontalLayout at bottom-center for UI buttons
    this.createUI();
  }

  createUI() {
    const game = this.game;
    const isMobile = this.isMobile();
    const buttonWidth = isMobile ? 70 : 90;

    this.bottomUI = new HorizontalLayout(game, {
      anchor: Position.BOTTOM_CENTER,
      anchorOffsetY: -15,
      spacing: isMobile ? 5 : 10,
      padding: 10,
      debug: true,
      debugColor: "magenta",
      origin: "center",
      align: "center",
    });
    this.add(this.bottomUI);

    // "Add Tile" button
    this.bottomUI.add(new Button(game, {
      text: isMobile ? "+" : "Add",
      width: isMobile ? 40 : buttonWidth,
      origin: "center",
      onClick: () => this.addTile(),
    }));

    // "Remove Tile" button
    this.bottomUI.add(new Button(game, {
      text: isMobile ? "-" : "Remove",
      width: isMobile ? 40 : buttonWidth,
      origin: "center",
      onClick: () => this.removeTile(),
    }));

    // "Add Column" button
    this.bottomUI.add(new Button(game, {
      text: isMobile ? "+Col" : "+ Column",
      width: isMobile ? 50 : buttonWidth,
      origin: "center",
      onClick: () => {
        const maxColumns = this.getResponsiveColumns();
        if (this.grid.columns < maxColumns) {
          this.grid.columns++;
          this.grid.markBoundsDirty();
        }
      },
    }));

    // "Remove Column" button
    this.bottomUI.add(new Button(game, {
      text: isMobile ? "-Col" : "- Column",
      width: isMobile ? 50 : buttonWidth,
      origin: "center",
      onClick: () => {
        this.grid.columns = Math.max(1, this.grid.columns - 1);
        this.grid.markBoundsDirty();
      },
    }));

    // Add 10 tiles button (for quickly testing scroll)
    this.bottomUI.add(new Button(game, {
      text: isMobile ? "+10" : "Add 10",
      width: isMobile ? 45 : buttonWidth,
      origin: "center",
      onClick: () => {
        for (let i = 0; i < 10; i++) this.addTile();
      },
    }));
  }

  addTile() {
    const rect = new Rectangle({
      width: CONFIG.tileSize,
      height: CONFIG.tileSize,
      color: Painter.colors.randomColorHSL(),
      strokeColor: "white",
      origin: "center",
    });
    const tileGO = ShapeGOFactory.create(this.game, rect);
    this.grid.add(tileGO);
  }

  removeTile() {
    if (this.grid.children.length > 0) {
      const last = this.grid.children[this.grid.children.length - 1];
      this.grid.remove(last);
    }
  }

  onResize() {
    if (!this.grid) return;

    // Update columns based on new width
    const newColumns = this.getResponsiveColumns();
    if (this.grid.columns !== newColumns) {
      this.grid.columns = newColumns;
    }

    // Update viewport for scrolling
    const viewport = this.getViewportDimensions();
    this.grid._viewportWidth = viewport.width;
    this.grid._viewportHeight = viewport.height;

    this.grid.markBoundsDirty();
    if (this.bottomUI) {
      this.bottomUI.markBoundsDirty();
    }
  }

  update(dt) {
    super.update(dt);
    this.elapsedTime += dt;

    // Only process tiles every N seconds to reduce frequency
    if (this.elapsedTime - this.lastChangeTime > 0.1) {
      this.lastChangeTime = this.elapsedTime;

      // Random number of tiles to change (between 1 and 10% of total tiles)
      const tilesToChange = Math.max(
        1,
        Math.floor(this.grid.children.length * (0.1 + Math.random() * 0.1))
      );

      // Filter out tiles that are already tweening
      const availableTiles = this.grid.children.filter(
        (tile) => !tile.isTweening
      );

      // Shuffle and pick random tiles
      const shuffled = [...availableTiles].sort(() => 0.5 - Math.random());
      const selectedTiles = shuffled.slice(
        0,
        Math.min(tilesToChange, availableTiles.length)
      );

      // Start tweening on selected tiles
      for (const tile of selectedTiles) {
        tile.isTweening = true;
        
        // Store RGB values directly instead of CSS string to avoid parsing issues
        const rgb = tile.shape.color ? 
          Painter.colors.parseColorString(tile.shape.color) : 
          [255, 255, 255]; // Default to white if color is undefined
        
        tile.startRGB = rgb;
        
        // Generate vibrant random color in RGB directly
        const hue = Math.floor(Math.random() * 360);
        const saturation = 80 + Math.floor(Math.random() * 20); // 80-100%
        const lightness = 50 + Math.floor(Math.random() * 30); // 50-80%
        const targetRGB = Painter.colors.hslToRgb(hue, saturation, lightness);
        
        tile.targetRGB = targetRGB;
        tile.tweenElapsed = 0;
        tile.tweenDuration = 0.5 + Math.random() * 0.5; // Random duration between 0.5-1.0 seconds
      }
    }

    // Update all tweening tiles
    for (const tile of this.grid.children) {
      if (tile.isTweening) {
        try {
          // Update elapsed time
          tile.tweenElapsed += dt;
          
          // Calculate progress with proper easing
          const progress = Math.min(tile.tweenElapsed / tile.tweenDuration, 1.0);
          const easedProgress = Easing.easeInOutQuad(progress);
          
          // Use the stored RGB values directly
          if (tile.startRGB && tile.targetRGB) {
            const newRGB = Tween.tweenColor(
              tile.startRGB,
              tile.targetRGB,
              easedProgress
            );
            
            // Convert interpolated RGB values to CSS color string
            tile.shape.color = Painter.colors.rgbArrayToCSS(newRGB);
            
            // Check if tween is complete
            if (progress >= 1) {
              tile.isTweening = false;
              tile.shape.color = Painter.colors.rgbArrayToCSS(tile.targetRGB);
            }
          } else {
            // Color missing, reset the tweening state
            console.warn("Missing color values for tweening");
            tile.isTweening = false;
            
            // Set a fallback color
            const fallbackRGB = [
              Math.floor(Math.random() * 255),
              Math.floor(Math.random() * 255),
              Math.floor(Math.random() * 255)
            ];
            tile.shape.color = Painter.colors.rgbArrayToCSS(fallbackRGB);
          }
        } catch (error) {
          // Handle any errors in the color transition
          console.warn("Error during color tweening:", error);
          tile.isTweening = false;
          
          // Set a fallback color
          const fallbackRGB = [
            Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255),
            Math.floor(Math.random() * 255)
          ];
          tile.shape.color = Painter.colors.rgbArrayToCSS(fallbackRGB);
        }
      }
    }
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
    this.tileDemo = new TileDemo(this);
    this.pipeline.add(this.tileDemo);
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }

  onResize() {
    if (this.tileDemo) {
      this.tileDemo.onResize();
    }
  }
}

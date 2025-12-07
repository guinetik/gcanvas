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
} from "/gcanvas.es.min.js";

export class TileDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.elapsedTime = this.lastChangeTime = 0;
  }

  init() {
    const game = this.game;
    // 1) Create a tile grid anchored at center
    this.grid = new TileLayout(game, {
      anchor: "center",
      columns: 10,
      spacing: 12,
      padding: 20,
      autoSize: true,
      debug: true,
    });
    // Add 50 squares, each 50x50
    for (let i = 0; i < 50; i++) {
      const rect = new Rectangle({
        width: 50,
        height: 50,
        color: Painter.colors.randomColorHSL(),
        strokeColor: "white",
      });
      const go = ShapeGOFactory.create(game, rect);
      this.grid.add(go);
    }
    this.add(this.grid);

    // 2) Create a HorizontalLayout at bottom-center for UI buttons
    const bottomUI = new HorizontalLayout(game, {
      anchor: "bottom-center",
      anchorMargin: 10,
      spacing: 10,
      padding: 15,
      debug: false,
      align: "center",
    });
    bottomUI.height = 40;
    bottomUI.width = 40 + 40 + 40 + 40 + 15;
    this.add(bottomUI);

    // 3) "Add Tile" button
    const addTileBtn = new Button(game, {
      text: "Add Tile",
      onClick: () => {
        const rect = new Rectangle({
          width: 50,
          height: 50,
          color: Painter.colors.randomColorHSL(),
        });
        const tileGO = ShapeGOFactory.create(game, rect);
        this.grid.add(tileGO);
      },
    });
    bottomUI.add(addTileBtn);

    // 4) "Remove Tile" button
    const removeTileBtn = new Button(game, {
      text: "Remove Tile",
      onClick: () => {
        // Only remove if the grid has children
        if (this.grid.children.length > 0) {
          const last = this.grid.children[this.grid.children.length - 1];
          this.grid.remove(last);
        }
      },
    });
    bottomUI.add(removeTileBtn);
    //
    // 5) "Add Column" button
    const addColumn = new Button(game, {
      text: "+ Column",
      width: 100,
      onClick: () => {
        this.grid.columns++;
        this.grid.markBoundsDirty();
      },
    });
    bottomUI.add(addColumn);
    // 6) "Remove Column" button
    const removeColumn = new Button(game, {
      text: "- Column",
      width: 100,
      onClick: () => {
        this.grid.columns = Math.max(1, this.grid.columns - 1);
        this.grid.markBoundsDirty();
      },
    });
    bottomUI.add(removeColumn);
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
    this.pipeline.add(new TileDemo(this));
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

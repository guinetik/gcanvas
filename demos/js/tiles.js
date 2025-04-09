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
} from "../../src/index";

export class TileDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.elapsedTime = this.lastChangeTime = 0;
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
      const rect = new Rectangle(0, 0, 50, 50, {
        fillColor: Painter.randomColorHSL(),
        strokeColor: "white",
      });
      const go = ShapeGOFactory.create(game, rect);
      this.grid.add(go);
    }
    this.add(this.grid);

    // 2) Create a HorizontalLayout at bottom-center for UI buttons
    const bottomUI = new HorizontalLayout(game, {
      anchor: "bottom-center",
      spacing: 10,
      padding: 15,
      debug: false,
      align: "center",
    });
    this.add(bottomUI);

    // 3) “Add Tile” button
    const addTileBtn = new Button(game, {
      text: "Add Tile",
      onClick: () => {
        const rect = new Rectangle(0, 0, 50, 50, {
          fillColor: Painter.randomColorHSL(),
        });
        const tileGO = ShapeGOFactory.create(game, rect);
        this.grid.add(tileGO);
      },
    });
    bottomUI.add(addTileBtn);

    // 4) “Remove Tile” button
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
    // 5) “Add Column” button
    const addColumn = new Button(game, {
      text: "+ Column",
      width: 100,
      onClick: () => {
        this.grid.columns++;
      },
    });
    bottomUI.add(addColumn);
    // 6) “Remove Column” button
    const removeColumn = new Button(game, {
      text: "- Column",
      width: 100,
      onClick: () => {
        this.grid.columns = Math.max(1, this.grid.columns - 1);
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
        tile.startColor = tile.shape.fillColor; // Store current color
        tile.targetColor = Painter.randomColorHSL();
        tile.tweenProgress = 0;
        tile.tweenSpeed = 0.5 + Math.random(); // Random speed
      }
    }

    // Update all tweening tiles
    for (const tile of this.grid.children) {
      if (tile.isTweening) {
        const currentRGB = Painter.parseColorString(tile.startColor);
        const targetRGB = Painter.parseColorString(tile.targetColor);

        tile.tweenProgress += tile.tweenSpeed * dt;
        const newRGB = Tween.tweenColor(
          currentRGB,
          targetRGB,
          Math.min(tile.tweenProgress, 1)
        );

        tile.shape.fillColor = Painter.rgbArrayToCSS(newRGB);

        // Check if tween is complete
        if (tile.tweenProgress >= 1) {
          tile.isTweening = false;
          tile.startColor = tile.targetColor; // Update start color for next tween
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

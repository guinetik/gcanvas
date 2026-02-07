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
  PatternRectangle,
  Patterns,
  Group,
  TextShape,
  Text,
  applyAnchor,
  Position,
} from "/gcanvas.es.min.js";

export class PatternDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.elapsedTime = this.lastChangeTime = 0;
    this.cellSize = 120;
    this.maxColumns = 6;
  }

  init() {
    const game = this.game;
    // 1) Create a tile grid
    const margin = 40;
    const initialColumns = Math.min(
      this.maxColumns,
      Math.max(1, Math.floor((game.width - margin) / this.cellSize))
    );

    this.grid = new TileLayout(game, {
      columns: initialColumns,
      spacing: 12,
      padding: 20,
      autoSize: true,
      debug: true,
      origin: "center",
    });

    // Add Title & Subtitle
    this.add(
      applyAnchor(
        new Text(game, "GCanvas Pattern Gallery", {
          font: "bold 24px monospace",
          color: "white",
        }),
        { anchor: Position.TOP_CENTER, anchorOffsetY: 30 }
      )
    );

    this.add(
      applyAnchor(
        new Text(game, "Procedural pixel patterns and noise algorithms", {
          font: "16px monospace",
          color: "#999",
        }),
        { anchor: Position.TOP_CENTER, anchorOffsetY: 60 }
      )
    );

    const size = 10;
    // Define pattern types
    const patternSources = [
      {
        name: "dots",
        size: size * 2,
        raw: Patterns.dotPattern(size * 2, size * 2, {
          dotSize: 1,
          spacing: size,
          dotColor: Painter.colors.randomColorRGBA(),
          background: [0, 0, 0, 0]
        }),
      },
      {
        name: "cross",
        size: size * 6,
        raw: Patterns.cross(size * 6, size * 6, {
          size: 10,
          thickness: 1,
          spacing: 20,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "stripes",
        size: size * 4,
        raw: Patterns.stripes(size * 4, size * 4, {
          spacing: 10,
          thickness: 4,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA(),
        }),
      },
      {
        name: "grid",
        size,
        raw: Patterns.solidGrid(size, size, {
          spacing: 9,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorHSL_RGBA(),
        }),
      },
      {
        name: "mesh",
        size: size * 2,
        raw: Patterns.mesh(size * 2, size * 2, {
          spacing: size * 2,         // Keep the same spacing (20)
          lineWidth: 1,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "isometric",
        size: size * 4,
        raw: Patterns.isometric(size * 4, size * 4, {
          cellSize: size * 4,
          lineWidth: 2,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "checkerboard",
        size: size * 2,
        raw: Patterns.checkerboard(size * 2, size * 2, {
          cellSize: 9,
          color1: [0, 0, 0, 255],
          color2: Painter.colors.randomColorRGBA(),
        }),
      },
      {
        name: "harlequin",
        size: size * 2,
        raw: Patterns.harlequin(size * 2, size * 2, {
          size: size,
          lineWidth: size / 2,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "diamonds",
        size: size * 3,
        raw: Patterns.diamonds(size * 3, size * 3, {
          size: size * 3,
          spacing: 3,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "cubes",
        size: size * 2,
        raw: Patterns.cubes(size * 2, size * 2, {
          size: size,
          spacing: 1,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "penrose",
        size: size * 4,
        raw: Patterns.penrose(size * 4, size * 4, {
          divisions: 3,
          color1: Painter.colors.randomColorRGBA(),
          color2: Painter.colors.randomColorRGBA(),
          color3: Painter.colors.randomColorRGBA(),
          lineWidth: 1,
        }),
      },
      {
        name: "TBA",
        size: size * 2,
        raw: Patterns.void(size * 2, size * 2, {
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "honeycomb",
        size: size * 4,
        raw: Patterns.honeycomb(size * 4, size * 4, {
          radius: size * 2,
          lineWidth: 1,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "honeycomb (fill)",
        size: size * 4,
        raw: Patterns.honeycomb(size * 4, size * 4, {
          radius: size * 2,
          lineWidth: 5,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "circles",
        size: size * 4,
        raw: Patterns.circles(size * 4, size * 4, {
          radius: size * 2,
          lineWidth: 1,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "circles (fill)",
        size: size * 4,
        raw: Patterns.circles(size * 4, size * 4, {
          radius: size * 2,
          lineWidth: 7,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "voronoi",
        size: size * 10,
        raw: Patterns.voronoi(size * 10, size * 10, {
          cellCount: size,
          edgeColor: [0, 0, 0, 255],
          edgeThickness: 1.5,
          jitter: 0.5,
          seed: Math.random() * 2000
        }),
      },
      {
        name: "voronoi-themed",
        size: size * 10,
        raw: Patterns.voronoi(size * 10, size * 10, {
          cellCount: size,
          baseColor: [10, 255, 10, 255],
          colorVariation: 0.5,
          edgeColor: [0, 0, 0, 255],
          edgeThickness: 1.5,
          jitter: 0.5,
          seed: Math.random() * 2000
        }),
      },
      {
        name: "TBA",
        size: size * 2,
        raw: Patterns.void(size * 2, size * 2, {
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "TBA",
        size: size * 2,
        raw: Patterns.void(size * 2, size * 2, {
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA()
        }),
      },
      {
        name: "gradient",
        size: size * 4,
        raw: Patterns.circularGradient(size * 4, size * 4, {
          innerColor: Painter.colors.randomColorRGBA(),
          outerColor: [0, 0, 0, 0],
          fadeExponent: 2.0
        }),
      },

      {
        name: "perlin-noise",
        size: size * 2,
        raw: Patterns.perlinNoise(size * 2, size * 2, {
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorHSL_RGBA(),
          scale: 0.05,          // Fine detail
          octaves: 6,           // More octaves for complexity
          persistence: 0.7,     // Higher persistence for stronger details
          seed: 12345           // Fixed seed for reproducibility
        }),
      },
      {
        name: "perlin-noise-2",
        size: size * 2,
        raw: Patterns.perlinNoise(size * 2, size * 2, {
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorHSL_RGBA(),
          scale: 0.2,           // Medium detail
          octaves: 2,           // Fewer octaves for smoother pattern
          persistence: 0.4,     // Medium persistence
          lacunarity: 3.0,      // Higher lacunarity for more varied frequencies
          seed: 54321           // Different seed
        }),
      },
      {
        name: "perlin-noise-3",
        size: size * 2,
        raw: Patterns.perlinNoise(size * 2, size * 2, {
          background: [0, 0, 0, 0],   // Dark background instead of transparent
          foreground: Painter.colors.randomColorHSL_RGBA(), // White foreground for high contrast
          scale: 0.01,          // Very fine detail
          octaves: 1,           // Single octave for pure noise
          persistence: 0.5,     // Standard persistence
          lacunarity: 2.0,      // Standard lacunarity
          seed: 98765           // Another seed
        }),
      },
    ];

    // Add grid of rectangles based on the patternSources
    for (let i = 0; i < patternSources.length; i++) {
      const pattern = patternSources[i % patternSources.length];

      const group = new Group({ width: 100, height: 130, origin: "center" });
      const rect = new PatternRectangle(null, "repeat", {
        width: 100,
        height: 100,
        color: Painter.colors.randomColorHSL(),
        debug: true,
        debugColor: "gray",
        origin: "center",
      });
      const label = new TextShape(pattern.name, {
        font: "12px monospace",
        color: "white",
        origin: "center",
      });
      label.y = 60;
      group.add(rect);
      group.add(label);

      Painter.img
        .createImageBitmapFromPixels(pattern.raw, pattern.size, pattern.size)
        .then((bitmap) => rect.setImage(bitmap));

      const go = ShapeGOFactory.create(game, group);
      this.grid.add(go);
    }

    this.add(this.grid);
    this.onResize();
  }

  onResize() {
    if (this.grid) {
      const margin = 40;
      const availableWidth = this.game.width - margin;
      const columns = Math.min(
        this.maxColumns,
        Math.max(1, Math.floor(availableWidth / this.cellSize))
      );

      if (this.grid.columns !== columns) {
        this.grid.columns = columns;
        this.grid.markBoundsDirty();
      }

      // Center the grid
      this.grid.transform.position(
        Math.round(this.game.width / 2),
        Math.round(this.game.height / 2)
      );
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
    this.demo = new PatternDemo(this);
    this.pipeline.add(this.demo);
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }

  onResize() {
    if (this.demo) {
      this.demo.onResize();
    }
  }
}

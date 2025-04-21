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
} from "../../src/index";

export class PatternDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.elapsedTime = this.lastChangeTime = 0;
  }

  init() {
    const game = this.game;
    // 1) Create a tile grid anchored at center
    this.grid = new TileLayout(game, {
      anchor: "center",
      columns: 6,
      spacing: 12,
      padding: 20,
      autoSize: true,
      debug: true,
    });

    const size = 10;
    // Define pattern types
    const patternSources = [
      {
        label: "solidGrid",
        size,
        raw: Patterns.solidGrid(size, size, {
          spacing: 9,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorHSL_RGBA(),
        }),
      },
      {
        label: "noiseDisplacement",
        size: size * 4,
        raw: Patterns.noiseDisplacement(size * 4, size * 4, {
          gridSpacing: 8,
          gridColor: Painter.colors.randomColorRGBA(),
          background: [0, 0, 0, 0],
          displacementScale: 4,
          noiseScale: 0.05,
          seed: 54321
        }),
      },
      {
        label: "checkerboard",
        size: size * 2,
        raw: Patterns.checkerboard(size * 2, size * 2, {
          cellSize: 9,
          color1: [0, 0, 0, 255],
          color2: Painter.colors.randomColorRGBA(),
        }),
      },
      {
        label: "diagonalStripes",
        size: size * 4,
        raw: Patterns.diagonalStripes(size * 4, size * 4, {
          spacing: 10,
          thickness: 4,
          background: [0, 0, 0, 0],
          foreground: Painter.colors.randomColorRGBA(),
        }),
      },
      
      {
        label: "dotPattern",
        size: size * 4,
        raw: Patterns.dotPattern(size * 4, size * 4, {
          dotSize: 2,
          spacing: 8,
          dotColor: Painter.colors.randomColorRGBA(),
          background: [0, 0, 0, 0]
        }),
      },
      {
        label: "dotPattern-Noise",
        size: size * 4,
        raw: Patterns.dotPattern(size * 4, size * 4, {
          dotSize: 1,
          dotColor: Painter.colors.randomColorRGBA(),
          background: [0, 0, 0, 0],
          useNoise: true,
          noiseScale: 0.1,
          noiseDensity: 0.6,
          seed: 98765
        }),
      },
      {
        label: "voronoi",
        size: size*10,
        raw: Patterns.voronoi(size*10, size*10, {
          cellCount: size,
          edgeColor: [0, 0, 0, 255],
          edgeThickness: 1.5,
          jitter: 0.5,
          seed: Math.random() * 2000
        }),
      },
      {
        label: "voronoi-themed",
        size: size*10,
        raw: Patterns.voronoi(size*10, size*10, {
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
        label: "circularGradient",
        size: size * 4,
        raw: Patterns.circularGradient(size * 4, size * 4, {
          innerColor: Painter.colors.randomColorRGBA(),
          outerColor: [0, 0, 0, 0],
          fadeExponent: 2.0
        }),
      },
      
      {
        label: "perlinNoise",
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
        label: "perlinNoise",
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
        label: "perlinNoise",
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

      const rect = new PatternRectangle(null, "repeat", {
        width: 100,
        height: 100,
        color: Painter.colors.randomColorHSL(),
        strokeColor: "white",
        debug: true,
      });

      Painter.img
        .createImageBitmapFromPixels(pattern.raw, pattern.size, pattern.size)
        .then((bitmap) => rect.setImage(bitmap));

      const go = ShapeGOFactory.create(game, rect);
      this.grid.add(go);
    }

    this.add(this.grid);
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
    this.pipeline.add(new PatternDemo(this));
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}

import {
  Circle,
  FPSCounter,
  Game,
  Group,
  Heart,
  Keys,
  Position,
  Rectangle,
  Scene,
  ShapeGOFactory,
  Sprite,
  Square,
  Star,
  Text,
  TileLayout,
  Triangle,
} from "../../src/index.js";

const CONFIG = {
  headerHeight: 80,
  margin: 40,
  bottomMargin: 70,
  cellSize: 140,
  maxColumns: 4,
};

/**
 * Sprite Demo - Shows various Sprite animation examples using TileLayout
 */
class SpriteDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000000";
    this.enableFluidSize();
  }

  getViewportDimensions() {
    const availableHeight = this.canvas.height - CONFIG.headerHeight - CONFIG.bottomMargin - CONFIG.margin;
    const availableWidth = this.canvas.width - CONFIG.margin * 2;
    return {
      width: Math.max(200, availableWidth),
      height: Math.max(200, availableHeight),
    };
  }

  init() {
    super.init();

    // Define sprite examples
    this.spriteEntries = [
      {
        name: "Pulsing",
        create: () => this.createPulsingSprite(),
      },
      {
        name: "Shape Shifter",
        create: () => this.createShapeShifter(),
      },
      {
        name: "Color Cycle",
        create: () => this.createColorCycle(),
      },
      {
        name: "Bouncing Ball",
        create: () => this.createBouncingBall(),
      },
      {
        name: "Controlled",
        create: () => this.createControlledSprite(),
      },
      {
        name: "Star Spin",
        create: () => this.createStarSpin(),
      },
      {
        name: "Pixel Walker",
        create: () => this.createPixelWalker(),
      },
      {
        name: "Heartbeat",
        create: () => this.createHeartbeat(),
      },
    ];

    // Create gallery using TileLayout
    this.createGallery();

    // Title - positioned above the grid
    this.pipeline.add(new Text(this, "Sprite Timeline Demo", {
      font: "bold 24px monospace",
      color: "#00ff00",
      anchor: Position.CENTER,
      anchorOffsetY: -220,
    }));

    // Subtitle
    this.pipeline.add(new Text(this, "Space: Play/Pause | R: Rewind | S: Stop | Arrows: Step Frame", {
      font: "14px monospace",
      color: "#666666",
      anchor: Position.CENTER,
      anchorOffsetY: -190,
    }));

    // Status text
    this.statusText = new Text(this, "", {
      font: "14px monospace",
      color: "#00cc00",
      anchor: Position.BOTTOM_CENTER,
      anchorOffsetY: -30,
    });
    this.pipeline.add(this.statusText);

    // FPS counter
    this.pipeline.add(new FPSCounter(this, {
      color: "#666666",
      anchor: Position.BOTTOM_RIGHT,
      anchorOffsetX: -10,
      anchorOffsetY: -10,
    }));

    // Setup keyboard controls
    this.setupControls();
  }

  createGallery() {
    const cellSize = CONFIG.cellSize;
    const initialColumns = Math.min(
      CONFIG.maxColumns,
      Math.max(1, Math.floor((this.canvas.width - CONFIG.margin) / cellSize))
    );
    const viewport = this.getViewportDimensions();

    this.gallery = new TileLayout(this, {
      debug: false,
      columns: initialColumns,
      spacing: 15,
      scrollable: true,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      anchor: Position.CENTER,
      anchorOffsetY: CONFIG.headerHeight / 2,
      autoSize: true,
    });

    this.spriteEntries.forEach((entry) => {
      // Use Scene (GameObject container) - NOT Group (Shape container)
      // This ensures Sprite.update() is called automatically via pipeline
      const cell = new Scene(this, {
        width: cellSize,
        height: cellSize,
      });

      // Background - wrap Shape as GameObject for Scene
      const bg = ShapeGOFactory.create(this, new Rectangle({
        width: cellSize - 10,
        height: cellSize - 10,
        color: "#0a0a0a",
        stroke: "#00ff00",
        lineWidth: 1,
      }));
      cell.add(bg);

      // Create sprite - already a GameObject, add directly to Scene
      const sprite = entry.create();
      entry.sprite = sprite;
      cell.add(sprite);

      // Label - use Text (GameObject) instead of TextShape (Shape)
      const label = new Text(this, entry.name, {
        y: (cellSize - 10) / 2 - 12,
        font: "12px monospace",
        color: "#00ff00",
        align: "center",
        baseline: "bottom",
      });
      cell.add(label);

      cell.entry = entry;
      this.gallery.add(cell);
    });

    this.pipeline.add(this.gallery);
  }

  createPulsingSprite() {
    const sprite = new Sprite(this, {
      frameRate: 8,
      loop: true,
      autoPlay: true,
    });

    const sizes = [20, 25, 30, 35, 30, 25];
    const colors = ["#ff6b6b", "#ee5a6f", "#f06595", "#cc5de8", "#845ef7", "#5c7cfa"];

    sizes.forEach((size, i) => {
      sprite.addFrame(new Circle(size, { color: colors[i], stroke: "white", lineWidth: 2 }));
    });

    return sprite;
  }

  createShapeShifter() {
    const sprite = new Sprite(this, {
      frameRate: 4,
      loop: true,
      autoPlay: true,
    });

    sprite.addFrame(new Circle(25, { color: "#51cf66", stroke: "white", lineWidth: 2 }));
    sprite.addFrame(new Square(45, { color: "#51cf66", stroke: "white", lineWidth: 2 }));
    sprite.addFrame(new Triangle(50, { color: "#51cf66", stroke: "white", lineWidth: 2 }));
    sprite.addFrame(new Star({ outerRadius: 30, innerRadius: 15, points: 5, color: "#51cf66", stroke: "white", lineWidth: 2 }));

    return sprite;
  }

  createColorCycle() {
    const sprite = new Sprite(this, {
      frameRate: 4,
      loop: true,
      autoPlay: true,
    });

    const colors = ["#ff6b6b", "#ffd43b", "#51cf66", "#339af0", "#cc5de8", "#f783ac"];
    colors.forEach(color => {
      sprite.addFrame(new Square(50, { color, stroke: "white", lineWidth: 2 }));
    });

    return sprite;
  }

  createBouncingBall() {
    const sprite = new Sprite(this, {
      frameRate: 12,
      loop: true,
      autoPlay: true,
    });

    const frames = [
      { scaleX: 1.0, scaleY: 1.0 },
      { scaleX: 0.95, scaleY: 1.1 },
      { scaleX: 0.9, scaleY: 1.2 },
      { scaleX: 1.3, scaleY: 0.7 },
      { scaleX: 1.1, scaleY: 0.85 },
      { scaleX: 1.0, scaleY: 1.0 },
    ];

    frames.forEach(frame => {
      const circle = new Circle(25, { color: "#ff6347", stroke: "white", lineWidth: 2 });
      circle.scaleX = frame.scaleX;
      circle.scaleY = frame.scaleY;
      sprite.addFrame(circle);
    });

    return sprite;
  }

  createControlledSprite() {
    const sprite = new Sprite(this, {
      frameRate: 8,
      loop: true,
      autoPlay: false,
    });

    const widths = [20, 30, 40, 50, 60, 50, 40, 30];
    const heights = [60, 50, 40, 30, 20, 30, 40, 50];

    widths.forEach((width, i) => {
      sprite.addFrame(new Rectangle({
        width,
        height: heights[i],
        color: "#ff922b",
        stroke: "white",
        lineWidth: 2,
      }));
    });

    // Store reference for keyboard controls
    this.controlledSprite = sprite;

    return sprite;
  }

  createStarSpin() {
    const sprite = new Sprite(this, {
      frameRate: 10,
      loop: true,
      autoPlay: true,
    });

    // Create star frames with different point counts for morphing effect
    const configs = [
      { points: 5, outer: 28, ratio: 0.4 },
      { points: 6, outer: 26, ratio: 0.5 },
      { points: 7, outer: 24, ratio: 0.55 },
      { points: 8, outer: 26, ratio: 0.5 },
      { points: 6, outer: 28, ratio: 0.45 },
      { points: 5, outer: 30, ratio: 0.35 },
    ];

    configs.forEach(cfg => {
      sprite.addFrame(new Star(cfg.outer, cfg.points, cfg.ratio, {
        color: "#00ff00",
        stroke: "#00cc00",
        lineWidth: 2,
      }));
    });

    return sprite;
  }

  createPixelWalker() {
    const sprite = new Sprite(this, {
      frameRate: 8,
      loop: true,
      autoPlay: true,
    });

    const px = 4;
    const color = "#00ff00";

    // Frame 1: Standing / left leg forward
    const frame1 = new Group();
    // Head
    frame1.add(new Rectangle({ x: 0, y: -20, width: px * 3, height: px * 3, color }));
    // Body
    frame1.add(new Rectangle({ x: 0, y: -8, width: px * 2, height: px * 4, color }));
    // Left leg forward
    frame1.add(new Rectangle({ x: -px, y: 4, width: px, height: px * 3, color }));
    // Right leg back
    frame1.add(new Rectangle({ x: px, y: 2, width: px, height: px * 2, color }));
    // Arms
    frame1.add(new Rectangle({ x: -px * 2, y: -6, width: px, height: px * 2, color }));
    frame1.add(new Rectangle({ x: px * 2, y: -10, width: px, height: px * 2, color }));

    // Frame 2: Standing straight
    const frame2 = new Group();
    frame2.add(new Rectangle({ x: 0, y: -20, width: px * 3, height: px * 3, color }));
    frame2.add(new Rectangle({ x: 0, y: -8, width: px * 2, height: px * 4, color }));
    frame2.add(new Rectangle({ x: -px, y: 4, width: px, height: px * 3, color }));
    frame2.add(new Rectangle({ x: px, y: 4, width: px, height: px * 3, color }));
    frame2.add(new Rectangle({ x: -px * 2, y: -8, width: px, height: px * 2, color }));
    frame2.add(new Rectangle({ x: px * 2, y: -8, width: px, height: px * 2, color }));

    // Frame 3: Right leg forward
    const frame3 = new Group();
    frame3.add(new Rectangle({ x: 0, y: -20, width: px * 3, height: px * 3, color }));
    frame3.add(new Rectangle({ x: 0, y: -8, width: px * 2, height: px * 4, color }));
    frame3.add(new Rectangle({ x: -px, y: 2, width: px, height: px * 2, color }));
    frame3.add(new Rectangle({ x: px, y: 4, width: px, height: px * 3, color }));
    frame3.add(new Rectangle({ x: -px * 2, y: -10, width: px, height: px * 2, color }));
    frame3.add(new Rectangle({ x: px * 2, y: -6, width: px, height: px * 2, color }));

    sprite.addFrame(frame1);
    sprite.addFrame(frame2);
    sprite.addFrame(frame3);
    sprite.addFrame(frame2);

    return sprite;
  }

  createHeartbeat() {
    const sprite = new Sprite(this, {
      frameRate: 6,
      loop: true,
      autoPlay: true,
    });

    // Heartbeat animation - scale and color pulse
    const sizes = [
      { w: 35, h: 35, color: "#ff0040" },
      { w: 40, h: 40, color: "#ff0050" },
      { w: 50, h: 50, color: "#ff0066" },
      { w: 45, h: 45, color: "#ff0055" },
      { w: 38, h: 38, color: "#ff0045" },
      { w: 35, h: 35, color: "#ff0040" },
      { w: 35, h: 35, color: "#cc0030" },
      { w: 35, h: 35, color: "#aa0025" },
    ];

    sizes.forEach(cfg => {
      sprite.addFrame(new Heart({
        y: -25,
        width: cfg.w,
        height: cfg.h,
        color: cfg.color,
        stroke: "#00ff00",
        lineWidth: 1,
      }));
    });

    return sprite;
  }

  setupControls() {
    this.events.on(Keys.SPACE, () => {
      if (this.controlledSprite) {
        if (this.controlledSprite.isPlaying) {
          this.controlledSprite.pause();
        } else {
          this.controlledSprite.play();
        }
      }
    });

    this.events.on(Keys.LEFT, () => {
      if (this.controlledSprite) {
        this.controlledSprite.gotoAndStop(
          Math.max(0, this.controlledSprite.currentFrame - 1)
        );
      }
    });

    this.events.on(Keys.RIGHT, () => {
      if (this.controlledSprite) {
        this.controlledSprite.gotoAndStop(
          Math.min(this.controlledSprite.totalFrames - 1, this.controlledSprite.currentFrame + 1)
        );
      }
    });

    // R and S aren't in Keys mapping, use raw keydown
    this.events.on("keydown", (e) => {
      if (!this.controlledSprite) return;
      if (e.code === "KeyR") {
        this.controlledSprite.rewind();
      } else if (e.code === "KeyS") {
        this.controlledSprite.stop();
      }
    });
  }

  onResize() {
    if (this.gallery) {
      const availableWidth = this.canvas.width - CONFIG.margin;
      const columns = Math.min(
        CONFIG.maxColumns,
        Math.max(1, Math.floor(availableWidth / CONFIG.cellSize))
      );

      if (this.gallery.columns !== columns) {
        this.gallery.columns = columns;
        this.gallery.markBoundsDirty();
      }

      const viewport = this.getViewportDimensions();
      this.gallery._viewportWidth = viewport.width;
      this.gallery._viewportHeight = viewport.height;
      this.gallery.anchorOffsetY = CONFIG.headerHeight / 2;
      this.gallery.markBoundsDirty();
    }
  }

  update(dt) {
    super.update(dt);

    // No manual sprite updates needed - Scene automatically propagates
    // update() to all child GameObjects including Sprites

    if (this.statusText && this.controlledSprite) {
      const cs = this.controlledSprite;
      this.statusText.text = `Controlled: Frame ${cs.currentFrame + 1}/${cs.totalFrames} | ${cs.isPlaying ? "Playing" : "Paused"}`;
    }
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new SpriteDemo(canvas);
  game.start();
});

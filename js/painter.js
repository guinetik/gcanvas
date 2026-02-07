import {
  Game,
  Scene,
  FPSCounter,
  Button,
  HorizontalLayout,
  Painter,
  ToggleButton,
  Cursor,
  TextShape,
  Circle,
  GameObject,
  Position,
} from "/gcanvas.es.min.js";

/**
 * The PaintScene:
 * - Holds an array of "strokes" (either lines or freehand paths).
 * - Each stroke is a plain JS object with fields: type, points, color, etc.
 */
class PaintScene extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.MARGIN = 0;
    this.currentTool = "pencil"; // 'line', 'pencil', or 'eraser'
    this.lineStart = null; // used for line tool
    this.activeStroke = null; // stroke being drawn right now
    this.strokes = []; // all finalized strokes
    this.pencilCursor = new TextShape("✏️", {
      font: "30px monospace",
      color: "green",
    });
    this.eraserCursor = new TextShape(" 🦯", { font: "30px monospace" });
    this.lineCursor = new TextShape("✒️", { font: "30px monospace" });
    this.lineCursorP = new Circle(5, { color: "red" });
    this.cursor = new Cursor(game, this.pencilCursor, this.pencilCursor, {
      x: 0,
      y: 0,
    });
    this.cursor.offsetX = -10;
    this.cursor.offsetY = -25;
    //
    this.totalPoints = 0; // Track total points across all strokes
    this.MAX_POINTS = 10000; // Maximum number of points to keep
  }

  /**
   * Set the current tool to use.
   */
  setTool(tool) {
    this.currentTool = tool;
    this.lineStart = null;
    this.activeStroke = null;
    if (tool === "eraser") {
      this.cursor.normalShape = this.cursor.pressedShape = this.eraserCursor;
      //      this.cursor.offsetX = 10;
      this.cursor.offsetY = -25;
    } else if (tool === "line") {
      this.cursor.normalShape = this.cursor.pressedShape = this.lineCursor;
      this.cursor.offsetX = 12;
      this.cursor.offsetY = -25;
    } else {
      this.cursor.normalShape = this.cursor.pressedShape = this.pencilCursor;
      this.cursor.offsetX = -10;
      this.cursor.offsetY = -25;
    }
  }

  #prevWidth = 0;
  #prevHeight = 0;

  update(dt) {
    // Update scene dimensions based on margin
    this.width = this.game.width - this.MARGIN * 2;
    this.height = this.game.height - this.MARGIN * 2;
    // Center the scene in the game
    this.x = this.game.width / 2;
    this.y = this.game.height / 2;
    super.update(dt);
    if (this.#prevWidth !== this.width || this.#prevHeight !== this.height) {
      this.markBoundsDirty();
    }
    this.#prevWidth = this.width;
    this.#prevHeight = this.height;
  }

  /**
   * This is called every frame after update() to draw everything.
   */
  draw() {
    super.draw();
    this.logger.log("PaintScene.draw", Painter.ctx.fillStyle);
    // Draw each finalized stroke
    for (let s of this.strokes) {
      this.drawStroke(s, false); // false = not active
    }

    // Draw the active stroke differently
    if (this.activeStroke) {
      this.drawStroke(this.activeStroke, true); // true = active
    }

    // Draw line preview if needed
    if (this.lineStart && this.currentTool === "line") {
      this.drawLinePreview(this.lineStart, this.currentMousePos);
    }
  }

  static gco = [
    "source-over",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
  ];

  drawStroke(stroke, isActive = false) {
    // Common setup
    Painter.ctx.save();
    Painter.ctx.globalAlpha = 1;

    // Set line properties explicitly
    Painter.ctx.lineWidth = stroke.lineWidth || 2;
    Painter.ctx.strokeStyle = stroke.color || "#fff";

    // IMPORTANT: Different handling for active strokes
    if (isActive) {
      // For active strokes, ensure we're using regular luminosity compositing
      Painter.ctx.globalCompositeOperation =
        stroke.compositeOp || "source-over";
    } else {
      // For completed strokes, use the specified composite operation
      Painter.ctx.globalCompositeOperation =
        stroke.compositeOp || "source-over";
    }

    // Begin the path
    Painter.ctx.beginPath();

    const pts = stroke.points;
    if (!pts || pts.length < 2) {
      Painter.ctx.restore();
      return;
    }
    // Start at the first point
    Painter.ctx.moveTo(pts[0].x, pts[0].y);
    //Apply effects
    if (stroke.type === "eraser") {
      Painter.ctx.globalAlpha = 1;
      Painter.ctx.fillStyle = "black";
      Painter.ctx.fill();
    } else {
      Painter.ctx.fillStyle = "transparent";
      Painter.ctx.globalAlpha = Math.random();
      Painter.ctx.globalCompositeOperation =
        PaintScene.gco[Math.floor(Math.random() * PaintScene.gco.length)];
    }
    // Draw lines to each point
    for (let i = 1; i < pts.length; i++) {
      Painter.ctx.lineTo(pts[i].x, pts[i].y);
    }
    Painter.ctx.stroke();
    // Restore the context
    Painter.ctx.restore();
    Painter.ctx.globalAlpha = 1;
  }

  /**
   * Draw a preview line from start point to current mouse position
   */
  drawLinePreview(start, end) {
    Painter.ctx.save();

    // Use a different style for the preview
    Painter.ctx.lineWidth = 2;
    Painter.ctx.strokeStyle = "#FFFFFF"; // Lighter color for preview
    Painter.ctx.setLineDash([5, 3]); // Dashed line for preview

    Painter.ctx.beginPath();
    Painter.ctx.moveTo(start.x, start.y);
    Painter.ctx.lineTo(end.x, end.y);
    Painter.ctx.stroke();

    // Draw small circles at the start and end points
    Painter.ctx.fillStyle = "#fff";
    Painter.ctx.beginPath();
    Painter.ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
    Painter.ctx.fill();

    Painter.ctx.beginPath();
    Painter.ctx.arc(end.x, end.y, 4, 0, Math.PI * 2);
    Painter.ctx.fill();

    Painter.ctx.restore();
  }

  /**
   * The scene can handle pointer events directly.
   * We'll do "line" logic vs "pencil"/"eraser" logic.
   */
  pointerDown(x, y) {
    this.activeStroke = null;
    this.game.uiScene.visible = false;
    this.game.uiScene.active = false;
    // If user has chosen "line":
    if (this.currentTool === "line") {
      if (this.lineStart == null) {
        // first click: store start
        this.lineStart = { x, y };
        this.currentMousePos = { x, y }; // Initialize current mouse position
      } else {
        // second click: finalize line stroke
        const stroke = {
          type: "line",
          lineWidth: 4,
          color: Painter.colors.randomColorHSL(),
          compositeOp: "luminosity",
          points: [
            { x: this.lineStart.x, y: this.lineStart.y },
            { x, y },
          ],
        };
        this.strokes.push(stroke);
        this.lineStart = null; // Reset line start for next line
      }
      return;
    }

    // If "pencil" or "eraser", start a new active stroke
    const erasing = this.currentTool === "eraser";
    this.activeStroke = {
      type: erasing ? "eraser" : "pencil",
      lineWidth: erasing ? 50 : 8, // eraser is wider
      color: erasing ? "#000" : Painter.colors.randomColorHSL(), // color doesn't matter for eraser, but we'll use #000
      compositeOp: erasing ? "destination-out" : "source-over",
      points: [{ x, y }],
    };
  }

  pointerMove(x, y) {
    // Always update current mouse position for preview
    this.currentMousePos = { x, y };

    // If we're currently drawing a stroke (pencil/eraser),
    // add the new point.
    if (this.activeStroke) {
      this.activeStroke.points.push({ x, y });
    }
  }

  pointerUp(x, y) {
    this.game.uiScene.visible = true;
    this.game.uiScene.active = true;
    // If we have an active stroke, finalize it
    if (this.activeStroke) {
      // Make sure it has at least 2 points
      if (this.activeStroke.points.length < 2) {
        // Add the current point if needed
        this.activeStroke.points.push({ x, y });
      }

      // Make a fresh copy to avoid reference issues
      const finalStroke = {
        type: this.activeStroke.type,
        lineWidth: this.activeStroke.lineWidth,
        color: this.activeStroke.color,
        compositeOp: this.activeStroke.compositeOp,
        points: this.activeStroke.points.map((p) => ({ ...p })), // Deep copy points
      };

      this.strokes.push(finalStroke);
      this.activeStroke = null;
    }
    this.enforceStrokeLimit();
  }

  enforceStrokeLimit() {
    // First check total point count
    this.totalPoints = this.strokes.reduce(
      (sum, stroke) => sum + stroke.points.length,
      0,
    );

    // If too many points, start removing oldest strokes
    while (this.totalPoints > this.MAX_POINTS && this.strokes.length > 0) {
      const removedStroke = this.strokes.shift(); // Remove oldest
      this.totalPoints -= removedStroke.points.length;
    }

    // Also enforce max stroke count
    if (this.strokes.length > this.MAX_STROKES) {
      // Get points in strokes to be removed
      const pointsToRemove = this.strokes
        .slice(0, this.REMOVE_BATCH)
        .reduce((sum, stroke) => sum + stroke.points.length, 0);

      // Remove the oldest REMOVE_BATCH strokes
      this.strokes = this.strokes.slice(this.REMOVE_BATCH);
      this.totalPoints -= pointsToRemove;

      console.log(
        `Removed ${this.REMOVE_BATCH} oldest strokes. ${this.strokes.length} strokes remaining.`,
      );
    }
  }
}

/**
 * A small UI scene that has 3 buttons in a horizontal layout:
 * "Line", "Pencil", "Eraser."
 * When clicked, they call paintScene.setTool(...).
 */
class UIScene extends Scene {
  constructor(game, paintScene, options = {}) {
    super(game, options);
    // Don't override debug from options
    this.debugColor = options.debugColor || "yellow";
    this.paintScene = paintScene;
    this.layout = new HorizontalLayout(game, {
      x: 0,
      y: 0,
      spacing: 8,
      padding: 0,
      origin: "center",
      debug: true,
      debugColor: "magenta",
    });
    this.toolPencil = this.layout.add(
      new ToggleButton(game, {
        text: "✏️Pencil",
        width: 80,
        height: 32,
        colorHoverBg: "transparent",
        colorDefaultBg: "transparent",
        colorPressedBg: "transparent",
        colorDefaultText: "white",
        startToggled: true,
        onToggle: (active) => {
          if (currentTool) {
            currentTool.toggle(false);
          }
          if (active) {
            paintScene.setTool("pencil");
            currentTool = this.toolPencil;
          }
        },
      }),
    );
    this.toolEraser = this.layout.add(
      new ToggleButton(game, {
        text: "🦯Eraser",
        width: 80,
        height: 32,
        colorHoverBg: "transparent",
        colorDefaultBg: "transparent",
        colorPressedBg: "transparent",
        colorDefaultText: "white",
        onToggle: (active) => {
          if (currentTool) {
            currentTool.toggle(false);
          }
          if (active) {
            paintScene.setTool("eraser");
            currentTool = this.toolEraser;
          }
        },
      }),
    );
    this.toolLine = this.layout.add(
      new ToggleButton(game, {
        text: "✒️Line",
        width: 80,
        height: 32,
        colorHoverBg: "transparent",
        colorDefaultBg: "transparent",
        colorPressedBg: "transparent",
        colorDefaultText: "white",
        onToggle: (active) => {
          if (currentTool) {
            currentTool.toggle(false);
          }
          if (active) {
            currentTool = this.toolLine;
            paintScene.setTool("line");
          }
        },
      }),
    );
    this.layout.add(
      new Button(game, {
        text: "🧼Clear",
        height: 32,
        width: 80,
        colorHoverBg: "transparent",
        colorDefaultBg: "transparent",
        colorPressedBg: "transparent",
        colorDefaultText: "white",
        onClick: () => {
          this.paintScene.strokes = [];
          this.paintScene.activeStroke = null;
          this.paintScene.lineStart = null;
        },
      }),
    );
    let currentTool = this.toolPencil;
    this.add(this.layout);
  }
}

/**
 * Our main Game class.
 * We create two Scenes: one for painting, one for UI.
 * We forward pointer events to the paint scene.
 */
class DemoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  addFPSCounter() {
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
        width: 20,
        height: 20,
      }),
    );
  }

  createUI() {
    // Create the UI scene
    this.uiScene = new UIScene(this, this.paintScene, {
      debug: true,
      debugColor: "yellow",
      origin: "center",
      anchor: Position.BOTTOM_CENTER,
      anchorMargin: 30,
      width: 80 + 80 + 80 + 80 + 32,
      height: 40,
    });
    this.pipeline.add(this.uiScene);
  }

  init() {
    super.init();
    // Create the paint scene
    this.paintScene = new PaintScene(this, { debug: true, origin: "center" });
    this.pipeline.add(this.paintScene);
    // Add them to the pipeline
    this.createUI();
    this.addFPSCounter();
    this.cursor = this.paintScene.cursor;
    // Listen for pointer events global ly and hand them to paintScene
    this.events.on("inputdown", (e) => {
      // translate canvas point to scene point (center is 0,0)
      const x = e.x - this.width / 2;
      const y = e.y - this.height / 2;
      this.paintScene.pointerDown(x, y);
    });
    this.events.on("inputmove", (e) => {
      // translate canvas point to scene point (center is 0,0)
      const x = e.x - this.width / 2;
      const y = e.y - this.height / 2;
      this.paintScene.pointerMove(x, y);
    });
    this.events.on("inputup", (e) => {
      // translate canvas point to scene point (center is 0,0)
      const x = e.x - this.width / 2;
      const y = e.y - this.height / 2;
      this.paintScene.pointerUp(x, y);
    });
  }
}

export { DemoGame };

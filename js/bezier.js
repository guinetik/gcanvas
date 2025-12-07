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
  Rectangle,
  BezierShape,
  ShapeGOFactory,
} from "/gcanvas/gcanvas.es.min.js";

/**
 * Main Game class for the Bezier Demo
 */
class BezierDemoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  init() {
    // Create the scenes
    this.bezierScene = new BezierScene(this);
    this.uiScene = new BezierUIScene(this, this.bezierScene);
    // Add them to the pipeline
    this.pipeline.add(this.bezierScene);
    this.pipeline.add(this.uiScene);
    // Setup custom cursor
    this.addCursor = new TextShape(0, 0, "➕", {
      font: "24px monospace",
      color: "white",
    });
    this.editCursor = new TextShape(0, 0, "✋", {
      font: "24px monospace",
      color: "white",
    });
    this.cursor = new Cursor(this, this.addCursor, this.addCursor, {
      x: 0,
      y: 0,
    });
  }
}

/**
 * The BezierScene:
 * - Allows users to place control points by clicking
 * - Visualizes the Bezier curve as it's being created
 * - Provides UI to finish/clear the curve
 */
class BezierScene extends Scene {
  constructor(game) {
    super(game);
    // Control points the user has placed
    this.points = [];
    // Current bezier path that will be visualized
    this.bezierPath = [];
    // The bezier shape that will be rendered
    this.bezierShape = null;
    // Point being dragged (if any)
    this.draggedPointIndex = -1;
    // Visual elements for control points
    this.controlPointShapes = [];
    // User interface state
    this.mode = "add"; // "add" or "edit"
    // Create a background for the scene
    this.bg = ShapeGOFactory.create(
      this.game,
      new Rectangle(0, 0, 1000, 1000, { fillColor: "rgba(255, 1, 1, 0.0)" })
    );
    this.add(this.bg);
    this.bg.enableInteractivity(this.bg.shape);
    // Forward input events to the bezier scene
    this.bg.on("inputdown", (e) => {
      this.pointerDown(e.x, e.y);
    });
    // Forward input move event to the bezier scene
    this.bg.on("inputmove", (e) => {
      this.pointerMove(e.x, e.y);
    });
    // Forward input up event to the bezier scene
    this.bg.on("inputup", (e) => {
      this.pointerUp();
    });
  }

  /**
   * Set the current mode (add points or edit existing points)
   */
  setMode(mode) {
    this.mode = mode;

    if (mode === "add") {
      this.game.cursor.normalShape = this.game.cursor.pressedShape =
        this.game.addCursor;
      this.game.cursor.offsetX = 1;
      this.game.cursor.offsetY = -6;
    } else {
      this.game.cursor.normalShape = this.game.cursor.pressedShape =
        this.game.editCursor;
      this.game.cursor.offsetX = 3;
      this.game.cursor.offsetY = -3;
    }
  }

  /**
   * Add a control point at the specified position
   */
  addPoint(x, y) {
    this.points.push({ x, y });
    // Create a visual representation of the control point
    const pointShape = new Circle(x, y, 6, {
      fillColor: "#00FF00",
      strokeColor: "#e2FFe2",
      lineWidth: 2,
    });
    const go = ShapeGOFactory.create(this.game, pointShape);
    this.controlPointShapes.push(go);
    this.add(go);
    // Update the bezier path
    this.updateBezierPath();
  }

  /**
   * Updates the Bezier path based on current points
   * This is where we convert our points array into path commands
   */
  /**
   * Updates the Bezier path based on current points
   * This is where we convert our points array into path commands
   */
  updateBezierPath() {
    if (this.points.length < 2) {
      // Need at least 2 points to create a path
      this.bezierPath = [];
      if (this.bezierShape) {
        this.remove(this.bezierShape);
        this.bezierShape = null;
      }
      return;
    }
    // Start with a move command to the first point
    const path = [["M", this.points[0].x, this.points[0].y]];
    // Create appropriate curve segments based on the number of points
    if (this.points.length === 2) {
      // With just 2 points, create a line
      path.push(["L", this.points[1].x, this.points[1].y]);
    } else if (this.points.length === 3) {
      // With 3 points, create a quadratic curve (one control point)
      path.push([
        "Q",
        this.points[1].x,
        this.points[1].y,
        this.points[2].x,
        this.points[2].y,
      ]);
    } else {
      // For 4+ points, create cubic Bezier segments
      for (let i = 1; i < this.points.length; i += 3) {
        if (i + 2 < this.points.length) {
          // We have enough points for a cubic curve
          path.push([
            "C",
            this.points[i].x,
            this.points[i].y,
            this.points[i + 1].x,
            this.points[i + 1].y,
            this.points[i + 2].x,
            this.points[i + 2].y,
          ]);
        } else if (i + 1 < this.points.length) {
          // Just enough for a quadratic curve
          path.push([
            "Q",
            this.points[i].x,
            this.points[i].y,
            this.points[i + 1].x,
            this.points[i + 1].y,
          ]);
        } else {
          // Just add a line to the last point
          path.push(["L", this.points[i].x, this.points[i].y]);
        }
      }
    }

    this.bezierPath = path;

    // If we already have a shape, update its path
    if (this.bezierShape) {
      this.bezierShape.shape.path = path;
      this.bezierShape.render();
    } else {
      const centerX = 0;
      const centerY = 0;
      // Create the bezier shape
      const bezierShapeObj = new BezierShape(centerX, centerY, path, {
        fillColor: "rgba(0, 255, 0, 0.2)",
        strokeColor: "rgba(255, 255, 255, 0.8)",
        lineWidth: 3,
      });

      // Create a GameObject using the factory
      this.bezierShape = ShapeGOFactory.create(this.game, bezierShapeObj);

      // Add the GameObject to the scene
      this.add(this.bezierShape);
    }
  }

  /**
   * Clear all points and reset the demo
   */
  clear() {
    // Remove visual elements
    for (const shape of this.controlPointShapes) {
      this.remove(shape);
    }
    if (this.bezierShape) {
      this.remove(this.bezierShape);
      this.bezierShape = null;
    }

    // Reset data
    this.points = [];
    this.bezierPath = [];
    this.controlPointShapes = [];
    this.draggedPointIndex = -1;
  }

  /**
   * Return the bezier path as a string for display/export
   */
  getPathString() {
    if (!this.bezierPath.length) return "No path defined";

    return JSON.stringify(this.bezierPath);
  }

  /**
   * Find the index of a control point near the given coordinates
   */
  findNearbyPoint(x, y, radius = 20) {
    for (let i = 0; i < this.points.length; i++) {
      const point = this.points[i];
      const dx = point.x - x;
      const dy = point.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= radius) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Pointer down handler
   */
  pointerDown(x, y) {
    if (this.mode === "add") {
      // In add mode, place a new control point
      this.addPoint(x, y);
    } else {
      // In edit mode, check if we're clicking on an existing point
      const pointIndex = this.findNearbyPoint(x, y);
      if (pointIndex >= 0) {
        this.draggedPointIndex = pointIndex;
      }
    }
  }

  /**
   * Pointer move handler
   */
  pointerMove(x, y) {
    if (this.draggedPointIndex >= 0) {
      // Update the dragged point position
      this.points[this.draggedPointIndex].x = x;
      this.points[this.draggedPointIndex].y = y;

      // Update the visual control point
      const pointShape = this.controlPointShapes[this.draggedPointIndex];
      pointShape.x = x;
      pointShape.y = y;

      // Update the Bezier curve
      this.updateBezierPath();
    }
  }

  /**
   * Pointer up handler
   */
  pointerUp() {
    this.draggedPointIndex = -1;
  }

  /**
   * Render additional visual helpers
   */
  render() {
    // First render all the normal scene elements
    super.render();
    // Draw the background
    this.bg.render();
    // If we have at least 2 points, draw guide lines between control points
    if (this.points.length >= 2) {
      Painter.save();
      // Draw dashed lines connecting control points
      Painter.colors.setStrokeColor("rgba(0, 255, 0, 0.8)");
      Painter.lines.setLineWidth(1);
      // Set up a dashed line style
      Painter.ctx.setLineDash([5, 5]);
      Painter.lines.beginPath();
      Painter.lines.moveTo(this.points[0].x, this.points[0].y);

      for (let i = 1; i < this.points.length; i++) {
        Painter.lines.lineTo(this.points[i].x, this.points[i].y);
      }

      Painter.colors.Painter.colors.stroke();
      Painter.ctx.setLineDash([]); // Reset dash
      Painter.restore();
    }
  }

  update(dt) {
    this.bg.x = this.game.width / 2;
    this.bg.y = this.game.height / 2;
    this.bg.width = this.game.width;
    this.bg.height = this.game.height;
    super.update(dt);
  }
}

/**
 * UI for the Bezier Demo with controls for adding/editing points,
 * clearing the canvas, and switching between modes.
 */
class BezierUIScene extends Scene {
  constructor(game, bezierScene) {
    super(game);
    this.bezierScene = bezierScene;
    this.layout = new HorizontalLayout(game, {
      x: 10,
      y: 10,
      spacing: 8,
      padding: 0,
    });
    let currentMode = null;
    this.addModeButton = this.layout.add(
      new ToggleButton(game, {
        text: "➕Add Points",
        width: 125,
        height: 32,
        startToggled: true,
        onToggle: (active) => {
          if (currentMode) {
            currentMode.toggle(false);
          }
          if (active) {
            bezierScene.setMode("add");
            currentMode = this.addModeButton;
          }
        },
      })
    );
    this.editModeButton = this.layout.add(
      new ToggleButton(game, {
        text: "✋Edit Points",
        width: 125,
        height: 32,
        onToggle: (active) => {
          if (currentMode) {
            currentMode.toggle(false);
          }
          if (active) {
            bezierScene.setMode("edit");
            currentMode = this.editModeButton;
          }
        },
      })
    );
    this.layout.add(
      new Button(game, {
        text: "🧼 Clear",
        width: 100,
        height: 32,
        onClick: () => {
          this.bezierScene.clear();
        },
      })
    );
    currentMode = this.addModeButton;
    this.add(this.layout);
    // Show FPS counter
    this.add(new FPSCounter(game, { anchor: "bottom-right" }));
  }

  update(dt) {
    // Position the UI at the bottom of the screen
    this.layout.x = 10;
    this.layout.y = this.game.canvas.height - this.layout.height - 10;
    super.update(dt);
  }
}
/// Main game class
window.BezierDemoGame = BezierDemoGame;

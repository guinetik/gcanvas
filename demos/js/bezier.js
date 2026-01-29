import {
  Game,
  Scene,
  FPSCounter,
  Button,
  HorizontalLayout,
  VerticalLayout,
  Painter,
  ToggleButton,
  Cursor,
  TextShape,
  Circle,
  Rectangle,
  BezierShape,
  ShapeGOFactory,
  Position,
} from "../../src/index";

/**
 * Main Game class for the Bezier Demo
 */
class BezierDemoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  /**
   * Check if we're on a touch device
   */
  isTouchDevice() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Check if screen is narrow (mobile width)
   */
  isMobile() {
    return this.width < 600;
  }

  /**
   * Get responsive configuration based on screen size
   */
  getResponsiveConfig() {
    const isMobile = this.isMobile();
    return {
      // Use shorter labels on mobile
      addLabel: isMobile ? "➕ Add" : "➕ Add Points",
      editLabel: isMobile ? "✋ Edit" : "✋ Edit Points",
      cutLabel: isMobile ? "✂️ Cut" : "✂️ Cut Shape",
      clearLabel: isMobile ? "🧼" : "🧼 Clear",
      // Narrower buttons on mobile
      buttonWidth: isMobile ? 70 : 125,
      clearWidth: isMobile ? 40 : 100,
      // UI layout dimensions
      layoutWidth: isMobile ? 280 : 500,
      layoutHeight: 50,
    };
  }

  init() {
    super.init();
    // Create the scenes
    this.bezierScene = new BezierScene(this, {
      debug: true,
      debugColor: "yellow",
    });

    const config = this.getResponsiveConfig();

    this.uiScene = new BezierUIScene(this, this.bezierScene, {
      debug: false,
      debugColor: "magenta",
      width: config.layoutWidth,
      height: config.layoutHeight,
      padding: 10,
      anchor: Position.BOTTOM_CENTER,
      anchorOffsetY: -20,
    });

    // Add them to the pipeline
    this.pipeline.add(this.bezierScene);
    this.pipeline.add(this.uiScene);
    this.uiScene.init();

    // Show FPS counter
    this.pipeline.add(new FPSCounter(this, { anchor: "bottom-right" }));

    // Only setup custom cursor on non-touch devices
    if (!this.isTouchDevice()) {
      this.addCursor = new TextShape("➕", {
        font: "24px monospace",
        color: "white",
      });
      this.editCursor = new TextShape("✋", {
        font: "24px monospace",
        color: "white",
      });
      this.cursor = new Cursor(this, this.addCursor, this.addCursor, {
        x: 0,
        y: 0,
      });
    }
  }

  onResize() {
    if (this.uiScene) {
      this.uiScene.onResize();
    }
  }
}

/**
 * The BezierScene:
 * - Allows users to place control points by clicking
 * - Visualizes the Bezier curve as it's being created
 * - Provides UI to finish/clear the curve
 */
class BezierScene extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.MARGIN = 0;
    this.interactive = true;
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
    // Forward input events to the bezier scene
    this.game.events.on("inputdown", (e) => {
      //console.log("inputdown", e);
      const x = e.x - this.width / 2;
      const y = e.y - this.height / 2;
      this.pointerDown(x, y);
    });
    // Forward input move event to the bezier scene
    this.game.events.on("inputmove", (e) => {
      const x = e.x - this.width / 2;
      const y = e.y - this.height / 2;
      this.pointerMove(x, y);
    });
    // Forward input up event to the bezier scene
    this.game.events.on("inputup", (e) => {
      this.pointerUp();
    });
    //
    this.userBeziers = [];
  }

  /**
   * Set the current mode (add points or edit existing points)
   */
  setMode(mode) {
    this.mode = mode;

    // Only update cursor on non-touch devices
    if (this.game.cursor) {
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
  }

  /**
   * Add a control point at the specified position
   */
  addPoint(x, y) {
    x = x - 50;
    y = y - 50;
    this.points.push({ x, y });
    // Create a visual representation of the control point
    const pointShape = new Circle(6, {
      color: "#00FF00",
      stroke: "#e2FFe2",
      lineWidth: 2,
    });
    const go = ShapeGOFactory.create(this.game, pointShape, { x: x, y: y });
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
      const bezierShapeObj = new BezierShape(path, {
        color: Painter.colors.randomColorHSL(),
        stroke: "rgba(255, 255, 255, 0.8)",
        lineWidth: 3,
      });

      // Create a GameObject using the factory
      this.bezierShape = ShapeGOFactory.create(this.game, bezierShapeObj, {
        x: centerX,
        y: centerY,
      });

      // Add the GameObject to the scene
      this.add(this.bezierShape);
    }
  }

  /**
   * Cut the current bezier shape and store it with jitter animation
   */
  cutShape() {
    // Only proceed if we have a valid bezier curve
    if (this.points.length >= 2 && this.bezierShape) {
      // Create a deep copy of the current bezier data
      const cutBezier = {
        points: [...this.points.map((p) => ({ ...p }))],
        path: [...this.bezierPath.map((cmd) => [...cmd])],
        shape: this.bezierShape,
        originalPath: [...this.bezierPath.map((cmd) => [...cmd])], // Store original path for animation
        jitterAmount: 5, // Base jitter amount
        jitterSpeed: 1.5 + Math.random() * 0.5, // Random speed variation
        jitterPhase: Math.random() * Math.PI * 2, // Random starting phase
      };

      cutBezier.jitterAmount = 5 * cutBezier.points.length;

      // Add to our collection of user beziers
      this.userBeziers.push(cutBezier);

      // Remove the current bezier shape from control but keep it in the scene
      this.bezierShape = null;

      // Clear current editing points but keep the shape visible
      this.points = [];
      this.bezierPath = [];

      // Remove visual control points
      for (const pointShape of this.controlPointShapes) {
        this.remove(pointShape);
      }
      this.controlPointShapes = [];
      this.draggedPointIndex = -1;

      //console.log(`Cut bezier shape - ${this.userBeziers.length} total shapes`);
    } else {
      //console.log("Need at least 2 points to cut a shape");
    }
  }

  /**
   * Clear all points and reset the demo
   * Updated to also clear all cut bezier shapes
   */
  clear() {
    // Remove visual elements
    for (const shape of this.controlPointShapes) {
      this.remove(shape);
    }

    // Remove the current bezier shape if exists
    if (this.bezierShape) {
      this.remove(this.bezierShape);
      this.bezierShape = null;
    }

    // Additionally remove all cut bezier shapes
    for (const bezier of this.userBeziers) {
      this.remove(bezier.shape);
    }

    // Reset all data
    this.points = [];
    this.bezierPath = [];
    this.controlPointShapes = [];
    this.draggedPointIndex = -1;
    this.userBeziers = [];
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
   * Check if a point is within the UI area
   */
  isInUIArea(x, y) {
    // Get screen coordinates (input coords are already screen coords)
    const screenY = y + this.height / 2;
    // UI is at bottom, check if click is in bottom 80px
    return screenY > this.game.height - 80;
  }

  /**
   * Pointer down handler
   */
  pointerDown(x, y) {
    // Skip if clicking on UI area (buttons)
    if (this.game.canvas.style.cursor === "pointer" || this.isInUIArea(x, y)) {
      return;
    }
    if (this.mode === "add") {
      // In add mode, place a new control point
      this.addPoint(x, y);
    } else {
      // In edit mode, check if we're clicking on an existing point
      const pointIndex = this.findNearbyPoint(x - 50, y - 50);
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
      this.points[this.draggedPointIndex].x = x - 50;
      this.points[this.draggedPointIndex].y = y - 50;

      // Update the visual control point
      const pointShape = this.controlPointShapes[this.draggedPointIndex];
      pointShape.x = x - 50;
      pointShape.y = y - 50;

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
  draw() {
    super.draw();
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

      Painter.colors.stroke();
      Painter.ctx.setLineDash([]); // Reset dash
      Painter.restore();
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

  #prevWidth = 0;
  #prevHeight = 0;

  /**
   * Update method that adds the jitter animation to cut bezier shapes
   */
  update(dt) {
    // Update scene dimensions based on margin
    this.width = this.game.width - this.MARGIN * 2;
    this.height = this.game.height - this.MARGIN * 2;

    // Center the scene in the game
    this.x = this.game.width / 2;
    this.y = this.game.height / 2;
    const filter = Painter.ctx.globalCompositeOperation;
    Painter.ctx.globalCompositeOperation = "screen";
    // Update jitter animation for all cut beziers
    for (const bezier of this.userBeziers) {
      // Update the jitter phase
      bezier.jitterPhase += dt * bezier.jitterSpeed * 5;

      // Create a new jittered path based on the original
      const jitteredPath = [];
      for (
        let cmdIndex = 0;
        cmdIndex < bezier.originalPath.length;
        cmdIndex++
      ) {
        const originalCmd = bezier.originalPath[cmdIndex];
        const newCmd = [...originalCmd]; // Make a copy

        // Only modify coordinate values (not the command type at index 0)
        for (let i = 1; i < newCmd.length; i++) {
          if (typeof newCmd[i] === "number") {
            // Apply a sine wave jitter with unique offset for each point
            const offset =
              Math.sin(bezier.jitterPhase + i * 0.3 + cmdIndex * 0.7) *
              bezier.jitterAmount;
            newCmd[i] = originalCmd[i] + offset;
          }
        }
        jitteredPath.push(newCmd);
      }

      // Apply the jittered path to the shape
      bezier.shape.shape.path = jitteredPath;
    }
    //Painter.effects.setBlendMode(filter);
    super.update(dt);

    if (this.#prevWidth !== this.width || this.#prevHeight !== this.height) {
      this.markBoundsDirty();
    }
    this.#prevWidth = this.width;
    this.#prevHeight = this.height;
  }
}

/**
 * UI for the Bezier Demo with controls for adding/editing points,
 * clearing the canvas, and switching between modes.
 */
class BezierUIScene extends Scene {
  constructor(game, bezierScene, options = {}) {
    super(game, options);
    this.bezierScene = bezierScene;
    this.onMenu = false;
    this.currentMode = null;
    this._lastMobileState = null;
  }

  /**
   * Get button style configuration (transparent background)
   */
  getButtonStyle() {
    return {
      colorHoverBg: "transparent",
      colorDefaultBg: "transparent",
      colorPressedBg: "transparent",
      colorDefaultText: "white",
    };
  }

  init() {
    this.createButtons();
  }

  /**
   * Create buttons with current responsive config
   */
  createButtons() {
    // Clear existing layout
    if (this.layout) {
      this.remove(this.layout);
      this.layout = null;
    }

    const config = this.game.getResponsiveConfig();
    const buttonStyle = this.getButtonStyle();

    this.layout = new HorizontalLayout(this.game, {
      width: config.layoutWidth,
      height: config.layoutHeight,
      spacing: 5,
    });

    this.addModeButton = this.layout.add(
      new ToggleButton(this.game, {
        text: config.addLabel,
        width: config.buttonWidth,
        height: 32,
        ...buttonStyle,
        startToggled: true,
        onToggle: (active) => {
          if (this.currentMode && this.currentMode !== this.addModeButton) {
            this.currentMode.toggle(false);
          }
          if (active) {
            this.bezierScene.setMode("add");
            this.currentMode = this.addModeButton;
          }
        },
      }),
    );

    this.editModeButton = this.layout.add(
      new ToggleButton(this.game, {
        text: config.editLabel,
        width: config.buttonWidth,
        height: 32,
        ...buttonStyle,
        onToggle: (active) => {
          if (this.currentMode && this.currentMode !== this.editModeButton) {
            this.currentMode.toggle(false);
          }
          if (active) {
            this.bezierScene.setMode("edit");
            this.currentMode = this.editModeButton;
          }
        },
      }),
    );

    this.cutModeButton = this.layout.add(
      new Button(this.game, {
        text: config.cutLabel,
        width: config.buttonWidth,
        height: 32,
        ...buttonStyle,
        onClick: () => {
          if (this.editModeButton) this.editModeButton.toggle(false);
          if (this.addModeButton) this.addModeButton.toggle(false);
          this.currentMode = null;
          this.bezierScene.cutShape();
        },
      }),
    );

    this.clearButton = this.layout.add(
      new Button(this.game, {
        text: config.clearLabel,
        width: config.clearWidth,
        height: 32,
        ...buttonStyle,
        onClick: () => {
          this.bezierScene.clear();
        },
      }),
    );

    this.add(this.layout);
    this.currentMode = this.addModeButton;

    // Update scene dimensions
    this.width = config.layoutWidth;
    this.height = config.layoutHeight;
    this.markBoundsDirty();
  }

  /**
   * Handle resize - recreate buttons if mobile state changed
   */
  onResize() {
    const isMobile = this.game.isMobile();

    // Only recreate if mobile state changed
    if (this._lastMobileState !== isMobile) {
      this._lastMobileState = isMobile;
      this.createButtons();
    }

    // Update scene dimensions
    const config = this.game.getResponsiveConfig();
    this.width = config.layoutWidth;
    this.height = config.layoutHeight;
    this.markBoundsDirty();
  }
}
/// Main game class
window.BezierDemoGame = BezierDemoGame;

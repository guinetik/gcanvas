import {
    Game, Scene, FPSCounter,
    Button, HorizontalLayout,
    Painter, ToggleButton, Cursor, TextShape, Circle
} from "../../src/index";

/**
 * The PaintScene: 
 * - Holds an array of "strokes" (either lines or freehand paths).
 * - Each stroke is a plain JS object with fields: type, points, color, etc.
 */
class PaintScene extends Scene {
    constructor(game) {
        super(game);
        this.currentTool = "pencil";  // 'line', 'pencil', or 'eraser'
        this.lineStart = null;        // used for line tool
        this.activeStroke = null;     // stroke being drawn right now
        this.strokes = [];            // all finalized strokes
        this.pencilCursor = new TextShape(0, 0, "✏️", { font: "30px monospace", color: "white" });
        this.eraserCursor = new TextShape(0, 0, "🦯", { font: "30px monospace" })
        this.lineCursor = new TextShape(0, 0, "✒️", { font: "30px monospace" })
        this.lineCursorP = new Circle(0, 0, 5, { fillColor: "red" });
        this.cursor = new Cursor(game, this.pencilCursor, this.pencilCursor, { x: 0, y: 0 });
        this.cursor.offsetX = 10;
        this.cursor.offsetY = -25
        this.game.cursor = this.cursor;
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
            this.cursor.offsetX = 10;
            this.cursor.offsetY = -25
        } else if (tool === "line") {
            this.cursor.normalShape = this.cursor.pressedShape = this.lineCursor;
            this.cursor.offsetX = 12;
            this.cursor.offsetY = -25;
        } else {
            this.cursor.normalShape = this.cursor.pressedShape = this.pencilCursor;
            this.cursor.offsetX = 10;
            this.cursor.offsetY = -25
        }
    }

    /**
     * This is called every frame after update() to draw everything.
     */
    render() {
        // Draw each stroke in this.strokes
        for (let s of this.strokes) {
            this.drawStroke(s);
        }
        // If we have an activeStroke (pencil or eraser in progress),
        // draw that as well
        if (this.activeStroke) {
            this.drawStroke(this.activeStroke);
        }
        super.render();
    }

    /**
     * Draw a single stroke. 
     * This is called for each finalized stroke in this.strokes.
     */
    drawStroke(stroke) {
        // Common setup
        Painter.save();
        Painter.strokeOptions(
            {
                lineCap: "round",
                lineJoin: "round",
                lineWidth: stroke.lineWidth,
                strokeStyle: stroke.color
            }
        );
        // For eraser, we set composite to 'destination-out'
        Painter.setBlendMode(stroke.compositeOp);
        Painter.beginPath();
        const pts = stroke.points;
        if (!pts.length) {
            Painter.restore();
            return;
        }
        Painter.moveTo(pts[0].x, pts[0].y);
        // If stroke.type === 'line', typically you’ll have 2 points in pts
        // If stroke.type === 'pencil' or 'eraser', you’ll have a bunch of points
        for (let i = 1; i < pts.length; i++) {
            Painter.lineTo(pts[i].x, pts[i].y);
        }
        Painter.stroke();
        Painter.restore();
    }

    /**
     * The scene can handle pointer events directly.
     * We'll do “line” logic vs “pencil”/“eraser” logic.
     */
    pointerDown(x, y) {
        // If user has chosen "line":
        if (this.currentTool === "line") {
            if (this.lineStart == null) {
                // first click: store start
                this.lineStart = { x, y };
            } else {
                // second click: finalize line stroke
                const stroke = {
                    type: "line",
                    lineWidth: 4,
                    color: "#fff",
                    compositeOp: "source-over",
                    points: [this.lineStart, { x, y }]
                };
                this.strokes.push(stroke);
                this.lineStart = null;
            }
            return;
        }
        // If “pencil” or “eraser”, start a new active stroke
        const erasing = (this.currentTool === "eraser");
        this.activeStroke = {
            type: erasing ? "eraser" : "pencil",
            lineWidth: erasing ? 20 : 8, // eraser is wider
            color: erasing ? "#000" : "#fff",     // color doesn’t matter for eraser, but we’ll use #000
            compositeOp: erasing ? "destination-out" : "source-over",
            points: [{ x, y }]
        };
    }

    pointerMove(x, y) {
        // If we're currently drawing a stroke (pencil/eraser),
        // add the new point.
        if (this.activeStroke) {
            this.activeStroke.points.push({ x, y });
        }
    }

    pointerUp() {
        // If we have an active stroke, finalize it and push into strokes
        if (this.activeStroke) {
            this.strokes.push(this.activeStroke);
            this.activeStroke = null;
        }
    }
}

/**
 * A small UI scene that has 3 buttons in a horizontal layout:
 * "Line", "Pencil", "Eraser."
 * When clicked, they call paintScene.setTool(...).
 */
class UIScene extends Scene {
    constructor(game, paintScene) {
        super(game);
        this.paintScene = paintScene;
        this.layout = new HorizontalLayout(game, {
            x: 10,
            y: 10,
            spacing: 8,
            padding: 0
        });
        this.toolPencil = this.layout.add(
            new ToggleButton(game, {
                text: "✏️Pencil",
                width: 80,
                height: 32,
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
            })
        );
        this.toolEraser = this.layout.add(
            new ToggleButton(game, {
                text: "🦯Eraser",
                width: 80,
                height: 32,
                onToggle: (active) => {
                    if (currentTool) {
                        currentTool.toggle(false);
                    }
                    if (active) {
                        paintScene.setTool("eraser");
                        currentTool = this.toolEraser;
                    }
                },
            })
        );
        this.toolLine = this.layout.add(
            new ToggleButton(game, {
                text: "✒️Line",
                width: 80,
                height: 32,
                onToggle: (active) => {
                    if (currentTool) {
                        currentTool.toggle(false);
                    }
                    if (active) {
                        currentTool = this.toolLine;
                        paintScene.setTool("line");
                    }
                },
            })
        );
        this.layout.add(
            new Button(game, {
                text: "🧼Clear",
                height: 32,
                width: 80,
                onClick: () => {
                    this.paintScene.strokes = [];
                    this.paintScene.activeStroke = null;
                    this.paintScene.lineStart = null;
                    this.paintScene.render();
                },
            })
        );
        let currentTool = this.toolPencil;
        this.add(this.layout);
        // Show FPS in bottom-right corner, optional
        this.add(new FPSCounter(game, { anchor: "bottom-right" }));
    }

    update(dt) {
        this.layout.x = 10;
        this.layout.y = (this.game.canvas.height - this.layout.height) - 10;
        super.update(dt);
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

    init() {
        // Create the paint scene
        this.paintScene = new PaintScene(this);
        // Create the UI scene
        this.uiScene = new UIScene(this, this.paintScene);
        // Add them to the pipeline
        this.pipeline.add(this.paintScene); // behind
        this.pipeline.add(this.uiScene);    // on top
        // Listen for pointer events globally and hand them to paintScene
        this.events.on("inputdown", (e) => {
            this.paintScene.pointerDown(e.x, e.y);
        });
        this.events.on("inputmove", (e) => {
            this.paintScene.pointerMove(e.x, e.y);
        });
        this.events.on("inputup", (e) => {
            this.paintScene.pointerUp();
        });
    }
}

export {DemoGame};
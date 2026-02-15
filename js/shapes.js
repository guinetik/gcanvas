import {
  Game,
  GameObject,
  FPSCounter,
  Text,
  Tween,
  Painter,
  Scene,
  ShapeGOFactory,
  TileLayout,
  Motion,
  Tweenetik,
  Easing,
  Line,
  Rectangle,
  Square,
  RoundedRectangle,
  Diamond,
  Triangle,
  Hexagon,
  Polygon,
  Star,
  PieSlice,
  Circle,
  Arc,
  BezierShape,
  Ring,
  Cube,
  Prism,
  Cylinder,
  Cone,
  Sphere,
  Arrow,
  Pin,
  Cross,
  StickFigure,
  Heart,
  Group,
  TextShape,
  applyAnchor,
  Position,
} from "/gcanvas.es.min.js";

const CONFIG = {
  headerHeight: 80, // Space reserved for title + subtitle (30px title offset + 60px subtitle offset + spacing)
  margin: 40, // Horizontal/vertical margins for viewport calculation
  bottomMargin: 70, // Space reserved for FPS counter at bottom (with margin above it)
};

class ShapeGalleryGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
    this.cellSize = 120;
    this.maxColumns = 5;
  }

  /**
   * Get viewport dimensions for scrolling based on available space.
   * Accounts for header (title + subtitle), bottom margin (FPS counter), and margins.
   * @returns {{width: number, height: number}} Viewport dimensions
   */
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
    this.shapeEntries = [
      {
        name: "Cube",
        class: Cube,
        args: [50],
        options: {
          y: -10,
          opacity: 0.8,
          scaleX: 0.7,
          scaleY: 0.7,
          faceTopColor: Painter.colors.randomColorHSL(),
          faceLeftColor: Painter.colors.randomColorHSL(),
          faceRightColor: Painter.colors.randomColorHSL(),
          faceFrontColor: Painter.colors.randomColorHSL(),
          faceBackColor: Painter.colors.randomColorHSL(),
          faceBottomColor: Painter.colors.randomColorHSL(),
          strokeColor: "rgba(255,255,255,0.5)",
          lineWidth: 1,
        },
      },
      {
        name: "Sphere",
        class: Sphere,
        args: [25],
        options: {
          y: -10,
          width: 50,
          height: 50,
          color: Painter.colors.randomColorHSL(),
          highlightColor: "white",
          hSegments: 16, // Fewer segments for wireframe
          vSegments: 16,
          wireframe: true, // Wireframe rendering
          stroke: "#CCC",
          lineWidth: 1,
          rotationX: Math.PI / 8,
          rotationY: 0,
          rotationZ: 0,
        },
      },
      {
        name: "Cone",
        class: Cone,
        args: [20, 40],
        options: {
          x: -2,
          y: -10,
          bottomColor: "#FF00FF",
          sideColor: "#00FF00",
          segments: 16, // Higher for smoother appearance
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 1,
        },
      },
      {
        name: "Cylinder",
        class: Cylinder,
        args: [10],
        options: {
          y: -10,
          width: 40,
          height: 60,
          topColor: Painter.colors.randomColorHSL(),
          bottomColor: Painter.colors.randomColorHSL(),
          sideColor: Painter.colors.randomColorHSL(),
          rotationX: -45,
          segments: 16, // Higher number for smoother curve
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 1,
        },
      },
      {
        name: "Prism",
        class: Prism,
        args: [50],
        options: {
          y: -20,
          width: 50,
          height: 50,
          scaleX: 0.7,
          scaleY: 0.7,
          faceFrontColor: "#6495ED",
          faceBackColor: "#4169E1",
          faceBottomColor: "#1E90FF",
          faceLeftColor: "#00BFFF",
          faceRightColor: "#87CEFA",
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 1,
        },
      },
      {
        name: "Line",
        class: Line,
        args: [40],
        options: { stroke: "white", lineWidth: 3 },
      },
      {
        name: "Bezier",
        class: BezierShape,
        args: [
          [
            ["M", -40, 0],
            ["C", -30, -30, -10, -30, 0, 0],
            ["C", 10, 30, 30, 30, 40, 0],
          ],
        ],
        options: {
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: Painter.colors.randomColorHSL(),
          lineWidth: 3,
        },
      },
      {
        name: "Bezier (Filled)",
        class: BezierShape,
        args: [
          [
            ["M", -60, 0],
            ["C", -60, -20, -20, -20, 0, 0],
            ["C", 20, 20, 60, 20, 60, 0],
            ["C", 60, -20, 20, -20, 0, 0],
            ["C", -20, 20, -60, 20, -60, 0],
            ["Z"],
          ],
        ],
        options: {
          scaleX: 0.7,
          scaleY: 0.7,
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: Painter.colors.randomColorHSL(),
          lineWidth: 3,
        },
      },
      {
        name: "Pin",
        class: Pin,
        args: [16],
        options: {
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          scaleX: 0.9,
          scaleY: 0.9,
          y: -20,
        },
      },
      {
        name: "Heart",
        class: Heart,
        args: [],
        options: {
          width: 50,
          height: 50,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          y: -10,
        },
      },
      {
        name: "Rounded Rect",
        class: RoundedRectangle,
        args: [10],
        options: {
          width: 50,
          height: 50,
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          crisp: true,
        },
      },
      {
        name: "Rectangle",
        class: Rectangle,
        args: [],
        options: {
          width: 70,
          height: 50,
          y: -5,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          crisp: true,
        },
      },
      {
        name: "Square",
        class: Square,
        args: [50],
        options: {
          y: -5,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          crisp: true,
        },
      },
      {
        name: "Diamond",
        class: Diamond,
        args: [],
        options: {
          y: -10,
          width: 60,
          height: 60,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
        },
      },

      {
        name: "Triangle",
        class: Triangle,
        args: [50],
        options: {
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
        },
      },
      {
        name: "Hexagon",
        class: Hexagon,
        args: [30],
        options: {
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
        },
      },
      {
        name: "Polygon",
        class: Polygon,
        args: [9, 30],
        options: {
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
        },
      },
      {
        name: "Star",
        class: Star,
        args: [30, 5, 0.5],
        options: {
          y: -10,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
        },
      },
      {
        name: "Circle",
        class: Circle,
        args: [30],
        options: {
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          y: -10,
        },
      },
      {
        name: "PieSlice",
        class: PieSlice,
        args: [30, 0, Math.PI * 1.5],
        options: {
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          y: -10,
        },
      },
      {
        name: "Arc",
        class: Arc,
        args: [28, 0, Math.PI * 1.5],
        options: {
          y: -10,
          stroke: Painter.colors.randomColorHSL(),
          lineWidth: 10,
        },
      },
      {
        name: "Ring",
        class: Ring,
        args: [30, 20],
        options: {
          color: Painter.colors.randomColorHSL(),
          y: -10,
        },
      },
      {
        name: "Arrow",
        class: Arrow,
        args: [60],
        options: {
          width: 20,
          height: 25,
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          x: -5,
          y: -10,
        },
      },
      {
        name: "Cross",
        class: Cross,
        args: [50, 10],
        options: {
          color: Painter.colors.randomColorHSL(),
          stroke: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          y: -10,
        },
      },
      {
        name: "StickFigure",
        class: StickFigure,
        args: [0.5],
        options: {
          y: -10,
          strokeColor: "rgba(255,255,255,0.7)",
          headColor: Painter.colors.randomColorHSL(),
          jointColor: "rgba(255,255,255,0.5)",
          lineWidth: 2,
          showJoints: false,
        },
      },
    ];
    // FPS Counter
    this.pipeline.add(
      new FPSCounter(this, { anchor: "bottom-right" })
    );
    this.events.on("click", (e) => {
      this.gallery.children.forEach((go) => {
        go.entry.shape.color = Painter.colors.randomColorHSL();
        if (
          go.entry.class.name === "BezierShape" ||
          go.entry.class.name == "Arc" ||
          go.entry.class.name == "StickFigure"
        ) {
          go.entry.shape.headColor = Painter.colors.randomColorHSL();
          go.entry.shape.stroke = Painter.colors.randomColorHSL();
        }
        if (
          go.entry.name === "Sphere" ||
          go.entry.name == "Cube" ||
          go.entry.name === "Prism" ||
          go.entry.name === "Cylinder" ||
          go.entry.name === "Cone"
        ) {
          go.entry.shape.faceTopColor = Painter.colors.randomColorHSL();
          go.entry.shape.faceBottomColor = Painter.colors.randomColorHSL();
          go.entry.shape.faceLeftColor = Painter.colors.randomColorHSL();
          go.entry.shape.faceRightColor = Painter.colors.randomColorHSL();
          go.entry.shape.faceFrontColor = Painter.colors.randomColorHSL();
          go.entry.shape.faceBackColor = Painter.colors.randomColorHSL();
          go.entry.shape.topColor = Painter.colors.randomColorHSL();
          go.entry.shape.bottomColor = Painter.colors.randomColorHSL();
          go.entry.shape.sideColor = Painter.colors.randomColorHSL();
        }
      });
    });
    this.createGallery();
    this.onResize();
  }

  onResize() {
    if (this.gallery) {
      // Calculate responsive columns based on available width
      const availableWidth = this.canvas.width - CONFIG.margin;
      const columns = Math.min(this.maxColumns, Math.max(1, Math.floor(availableWidth / this.cellSize)));

      if (this.gallery.columns !== columns) {
        this.gallery.columns = columns;
        // Trigger layout update
        this.gallery.markBoundsDirty();
      }

      // Update viewport dimensions for scrolling
      const viewport = this.getViewportDimensions();
      this.gallery._viewportWidth = viewport.width;
      this.gallery._viewportHeight = viewport.height;

      // Update anchor offset to position gallery below header
      this.gallery.anchorOffsetY = CONFIG.headerHeight / 2 + 20; // Position below header with spacing

      // Mark bounds dirty to trigger layout recalculation
      this.gallery.markBoundsDirty();
    }
  }

  createGallery() {
    const cellSize = this.cellSize;
    const initialColumns = Math.min(this.maxColumns, Math.max(1, Math.floor((this.canvas.width - CONFIG.margin) / cellSize)));
    const viewport = this.getViewportDimensions();

    const gallery = new TileLayout(this, {
      debug: true,
      debugColor: "grey",
      columns: initialColumns,
      spacing: 10,
      // Enable scrolling with responsive viewport
      scrollable: true,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      // Use anchor positioning instead of manual transform.position()
      anchor: Position.CENTER,
      anchorOffsetY: CONFIG.headerHeight / 2 + 20, // Position below header with spacing
      autoSize: true,
      origin: "center",
    });

    this.shapeEntries.forEach((entry, index) => {
      //const col = index % cols;
      //const row = Math.floor(index / cols);
      //const x = originX + col * (cellSize + spacing) + cellSize / 2;
      //const y = originY + row * (cellSize + spacing) + cellSize / 2;
      //
      const group = new Group({ origin: "center" });
      // Use Transform API to set group dimensions
      group.transform.size(cellSize, cellSize);
      const bg = new Rectangle({
        width: cellSize - 10,
        height: cellSize - 10,
        stroke: "rgba(255,255,255,0.2)",
        lineWidth: 1,
        origin: "center",
      });
      // Create shape with origin: "center" so shapes are centered in their cells
      // 3D shapes handle their own coordinate system, so don't override their options
      const is3DShape = ["Cube", "Sphere", "Cone", "Cylinder", "Prism"].includes(entry.name);
      const shapeOpts = is3DShape ? entry.options : { ...entry.options, origin: "center" };
      const shape = new entry.class(...entry.args, shapeOpts);
      entry.shape = shape;
      const label = new TextShape(entry.name, {
        x: 0,
        y: (cellSize - 10) / 2 - 12,
        font: "12px monospace",
        color: "white",
        align: "center",
        baseline: "bottom",
        origin: "center",
      });
      group.add(bg);
      group.add(shape);
      group.add(label);
      //
      //
      const go = ShapeGOFactory.create(this, group, {
        interactive: true,
        name: entry.name,
        width: cellSize,
        height: cellSize,
        scaleX: 1,
        scaleY: 1,
        origin: "center",  // Center origin so layout positions correctly
      });
      go.entry = entry;
      // Use Transform API for initial state
      go.transform
        .rotation(0)
        .size(cellSize, cellSize);
      go.rotationVelocity = 0;
      go.startTime = 0;
      go.tweening = false;
      const game = this;
      go.on("mouseover", () => {
        // Use Transform API to reset scale
        go.transform.scale(1);
        game.canvas.style.cursor = "pointer";
        Tweenetik.to(
          group,
          { scaleX: 1.3, scaleY: 1.3 },
          1, // duration
          Easing.easeOutElastic,
          { onComplete: () => (go.tweening = false) }
        );
        go.tweening = true;
      });
      go.on("mouseout", () => {
        game.canvas.style.cursor = "default";
        Tweenetik.to(
          group, // the shape to scale
          { scaleX: 1, scaleY: 1 },
          1, // duration
          Easing.easeOutElastic
        );
      });
      function update(dt) {
        if (go.entry.name === "Hexagon") {
          //console.log(go.scaleX, go.scaleY);
        }
        if (
          go.entry.name === "Sphere" ||
          go.entry.name == "Cube" ||
          go.entry.name === "Prism" ||
          go.entry.name === "Cylinder" ||
          go.entry.name === "Cone"
        ) {
          const entry = go.entry;
          const game = go.game;
          //console.log(e);
          function animate() {
            if (!go.startTime) go.startTime = game.lastTime;
            const elapsed = game.lastTime - go.startTime;
            // Calculate rotation angles
            // Calculate rotation angles (convert to radians)
            const rotationSpeed = 0.001;
            const xRotation = (Math.sin(elapsed * 0.0005) * Math.PI) / 4;
            const yRotation =
              (elapsed * rotationSpeed * 0.0005) % (Math.PI * 2);
            const zRotation = (Math.cos(elapsed * 0.0003) * Math.PI) / 6;

            // Apply rotations
            entry.shape.setRotation(xRotation, yRotation, zRotation);
          }
          animate();
        }
      }
      gallery.add(go);
      go.onUpdate = update;
    });
    this.gallery = gallery;
    this.pipeline.add(this.gallery);
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new ShapeGalleryGame(canvas);
  game.setFPS(60);
  game.enablePauseOnBlur(true);
  //game.enableLogging();
  game.start();
  //setTimeout(game.stop.bind(game), 10000);
});

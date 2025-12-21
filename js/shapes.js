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

class ShapeGalleryGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#fff";
    this.enableFluidSize();
    this.cellSize = 120;
    this.maxColumns = 5;
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
          strokeColor: "black",
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
          stroke: "#333",
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
          stroke: "black",
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
          stroke: "#000",
          lineWidth: 1,
        },
      },
      {
        name: "Line",
        class: Line,
        args: [40],
        options: { stroke: "black", lineWidth: 3 },
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
          stroke: "black",
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
          stroke: "black",
          lineWidth: 2,
          y: -35,
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
          lineWidth: 2,
        },
      },
      {
        name: "Circle",
        class: Circle,
        args: [30],
        options: {
          color: Painter.colors.randomColorHSL(),
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          stroke: "black",
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
          strokeColor: "#111",
          headColor: Painter.colors.randomColorHSL(),
          jointColor: "#111",
          lineWidth: 2,
          showJoints: false,
        },
      },
    ];
    // FPS Counter
    this.pipeline.add(
      new FPSCounter(this, { color: "black", anchor: "bottom-right" })
    );
    // Title
    this.pipeline.add(
      applyAnchor(new Text(this, "GCanvas Shape Gallery", {
        font: "bold 24px monospace",
        color: "#222",
      }), { anchor: Position.TOP_CENTER, anchorOffsetY: 30 })
    );

    // Subtitle
    this.pipeline.add(
      applyAnchor(new Text(this, "Mouse over any shape to rotate or animate it", {
        font: "16px monospace",
        color: "#666",
      }), { anchor: Position.TOP_CENTER, anchorOffsetY: 60 })
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
      const margin = 40; // Horizontal margin
      const availableWidth = this.canvas.width - margin;
      const columns = Math.min(this.maxColumns, Math.max(1, Math.floor(availableWidth / this.cellSize)));

      if (this.gallery.columns !== columns) {
        this.gallery.columns = columns;
        // Trigger layout update
        this.gallery.markBoundsDirty();
      }

      // Use Transform API for positioning (centered)
      this.gallery.transform.position(
        Math.round(this.canvas.width / 2),
        Math.round(this.canvas.height / 2)
      );
    }
  }

  createGallery() {
    const cellSize = this.cellSize;
    const margin = 40;
    const initialColumns = Math.min(this.maxColumns, Math.max(1, Math.floor((this.canvas.width - margin) / cellSize)));

    const gallery = new TileLayout(this, {
      debug: true,
      debugColor: "grey",
      columns: initialColumns,
      spacing: 10,
    });

    this.shapeEntries.forEach((entry, index) => {
      //const col = index % cols;
      //const row = Math.floor(index / cols);
      //const x = originX + col * (cellSize + spacing) + cellSize / 2;
      //const y = originY + row * (cellSize + spacing) + cellSize / 2;
      //
      const group = new Group();
      // Use Transform API to set group dimensions
      group.transform.size(cellSize, cellSize);
      const bg = new Rectangle({
        width: cellSize - 10,
        height: cellSize - 10,
        stroke: "rgba(0,0,0,0.1)",
        lineWidth: 1,
      });
      const shape = new entry.class(...entry.args, entry.options);
      entry.shape = shape;
      const label = new TextShape(entry.name, {
        x: 0,
        y: (cellSize - 10) / 2 - 12,
        font: "12px monospace",
        color: "#333",
        align: "center",
        baseline: "bottom",
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

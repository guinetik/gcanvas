import {
  Game,
  GameObject,
  FPSCounter,
  Text,
  Tween,
  Shapes,
  Painter,
  Scene,
  ShapeGOFactory,
  TileLayout,
} from "/gcanvas/gcanvas.es.min.js";

class ShapeGalleryGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#fff";
    this.enableFluidSize();
    this.shapeEntries = [
      {
        name: "Line",
        class: Shapes.Line,
        args: [0, 0, 40],
        options: { strokeColor: "black", lineWidth: 3, "anchor":"center" },
      },
      {
        name: "Rectangle",
        class: Shapes.Rectangle,
        args: [0, 0, 60, 40],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Square",
        class: Shapes.Square,
        args: [0, 0, 50],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Rounded Rect",
        class: Shapes.RoundedRectangle,
        args: [0, 0, 50, 50, 10],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Diamond",
        class: Shapes.Diamond,
        args: [0, 0, 60, 60],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Triangle",
        class: Shapes.Triangle,
        args: [0, 0, 50],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Hexagon",
        class: Shapes.Hexagon,
        args: [0, 0, 30],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Polygon",
        class: Shapes.Polygon,
        args: [0, 0, 9, 30],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Star",
        class: Shapes.Star,
        args: [0, 0, 30, 5, 0.5],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "PieSlice",
        class: Shapes.PieSlice,
        args: [0, 0, 30, 0, Math.PI * 1.5],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Circle",
        class: Shapes.Circle,
        args: [0, 0, 25],
        options: { fillColor: Painter.randomColorHSL() },
      },
      {
        name: "Arc",
        class: Shapes.Arc,
        args: [0, 0, 25, 0, Math.PI * 1.5],
        options: {
          strokeColor: Painter.randomColorHSL(),
          lineWidth: 5,
        },
      },
      {
        name: "Bezier",
        class: Shapes.BezierShape,
        args: [
          0,
          0,
          [
            ["M", -40, 0],
            ["C", -30, -30, -10, -30, 0, 0],
            ["C", 10, 30, 30, 30, 40, 0],
          ],
        ],
        options: {
          fillColor: null,
          strokeColor: Painter.randomColorHSL(),
          lineWidth: 3,
        },
      },
      {
        name: "Bezier (Filled)",
        class: Shapes.BezierShape,
        args: [
          0,
          0,
          [
            ["M", 0, -40],
            ["C", 30, -40, 40, -10, 0, 30],
            ["C", -40, -10, -30, -40, 0, -40],
            ["Z"],
          ],
        ],
        options: {
          scaleX: 0.75,
          scaleY: 0.75,
          fillColor: Painter.randomColorHSL(),
          strokeColor: "#000",
          lineWidth: 2,
        },
      },
      {
        name: "Ring",
        class: Shapes.Ring,
        args: [0, 0, 30, 15],
        options: { fillColor: "lightblue" },
      },

      {
        name: "Cube",
        class: Shapes.Cube,
        args: [0, -10, 40],
        options: {
          scaleX: 0.7,
          scaleY: 0.7,
          faceTopColor: "#f00",
          faceLeftColor: "#0f0",
          faceRightColor: "#00f",
          faceFrontColor: "#ff0",
          faceBackColor: "#0ff",
          faceBottomColor: "#f0f",
          strokeColor: "black",
          lineWidth: 1,
        },
      },
      {
        name: "Prism",
        class: Shapes.Prism,
        args: [0, -10, 40, 40, 40],
        options: {
          scaleX: 0.7,
          scaleY: 0.7,
          faceFrontColor: "#6495ED",
          faceBackColor: "#4169E1",
          faceBottomColor: "#1E90FF",
          faceLeftColor: "#00BFFF",
          faceRightColor: "#87CEFA",
          strokeColor: "#000",
          lineWidth: 1,
        },
      },
      {
        name: "Cylinder",
        class: Shapes.Cylinder,
        args: [0, 0, 10, 50, 10],
        options: {
          topColor: "#FF00FF",
          bottomColor: "#FF00FF",
          sideColor: "#FFFF00",
          segments: 36, // Higher number for smoother curve
          strokeColor: "#333",
          lineWidth: 1,
        },
      },
      {
        name: "Cone",
        class: Shapes.Cone,
        args: [-2, -5, 25, 40],
        options: {
          bottomColor: "#FF00FF",
          sideColor: "#00FF00",
          segments: 32, // Higher for smoother appearance
          strokeColor: "#333",
          lineWidth: 1,
        },
      },
      {
        name: "Sphere",
        class: Shapes.Sphere,
        args: [0, -10, 25, 40],
        options: {
          scaleX: 0.7,
          scaleY: 0.7,
          color: "#FF6347", // Tomato base color
          hSegments: 16, // Fewer segments for wireframe
          vSegments: 12,
          wireframe: true, // Wireframe rendering
          strokeColor: "#333333",
          lineWidth: 1,
          rotationX: Math.PI / 8,
          rotationY: 0,
          rotationZ: 0,
        },
      },
      {
        name: "Arrow",
        class: Shapes.Arrow,
        args: [-5, 0, 60, 15],
        options: { fillColor: "brown" },
      },
      {
        name: "Pin",
        class: Shapes.Pin,
        args: [0, -10, 10],
        options: { fillColor: "crimson", strokeColor: "black" },
      },
      {
        name: "Cross",
        class: Shapes.Cross,
        args: [0, 0, 50, 10],
        options: { fillColor: "gray" },
      },
      {
        name: "StickFigure",
        class: Shapes.StickFigure,
        args: [0, 0, 0.5],
        options: {
          strokeColor: "#111",
          headColor: "#fc0",
          jointColor: "#111",
          lineWidth: 2,
          showJoints: true,
        },
      },
      {
        name: "Heart",
        class: Shapes.Heart,
        args: [0, -30, 50, 50],
        options: { fillColor: "crimson" },
      },
    ];
  }

  init() {
    super.init();
    this.pipeline.add(new FPSCounter(this, { color: "black" }));
    // Title
    this.pipeline.add(
      new Text(this, "GCanvas Shape Gallery", {
        x: this.canvas.width / 2,
        y: 30,
        font: "bold 24px monospace",
        color: "#222",
        align: "center",
        baseline: "top",
      })
    );

    // Subtitle
    this.pipeline.add(
      new Text(this, "Mouse over any shape to rotate or animate it", {
        x: this.canvas.width / 2,
        y: 60,
        font: "16px monospace",
        color: "#666",
        align: "center",
        baseline: "top",
      })
    );

    this.createGallery();
  }

  createGallery() {
    const cellSize = 120;
    // Migrating to TileLayout those variables become irrelevant, but its good to have for a quick tile setup on another thing
    //const padding = 20;
    //const spacing = 16; // space between grid items
    //const cols = Math.ceil(Math.sqrt(this.shapeEntries.length));
    //const rows = Math.ceil(this.shapeEntries.length / cols);
    //const gridWidth = cols * cellSize + (cols - 1) * spacing;
    //const gridHeight = rows * cellSize + (rows - 1) * spacing;
    //const originX = 0;
    //const originY = 0;

    const gallery = new TileLayout(this, {debug:true, anchor:"center", columns:5, debug:false});

    this.shapeEntries.forEach((entry, index) => {
      //const col = index % cols;
      //const row = Math.floor(index / cols);
      //const x = originX + col * (cellSize + spacing) + cellSize / 2;
      //const y = originY + row * (cellSize + spacing) + cellSize / 2;
      //
      const group = new Shapes.Group(0,0);
      group.width = group.height = cellSize;
      const bg = new Shapes.Rectangle(0, 0, cellSize - 10, cellSize - 10, {
        strokeColor: "rgba(0,0,0,0.1)",
        lineWidth: 1,
      });
      const shape = new entry.class(...entry.args, entry.options);
      entry.shape = shape;
      const label = new Shapes.TextShape(
        0,
        (cellSize - 10) / 2 - 12,
        entry.name,
        {
          font: "12px monospace",
          color: "#333",
          align: "center",
          baseline: "bottom",
        }
      );
      group.add(bg);
      group.add(shape);
      group.add(label);
      //
      //
      const go = ShapeGOFactory.create(this, group);
      go.entry = entry;
      go.enableInteractivity(group);
      go.hovered = false;
      go.rotation = 0;
      go.rotationVelocity = 0;
      go.startTime = 0;
      go.width = go.height = cellSize;
      go.on("mouseover", () => (go.hovered = true));
      go.on("mouseout", () => (go.hovered = false));
      function update(dt) {
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
            const yRotation = (elapsed * rotationSpeed) % (Math.PI * 2);
            const zRotation = (Math.cos(elapsed * 0.0003) * Math.PI) / 6;

            // Apply rotations
            entry.shape.setRotation(xRotation, yRotation, zRotation);
          }
          animate();
        }
        const target = go.hovered ? 0.8 : 0;
        const spring = Tween.spring(go.rotation, target, {
          velocity: go.rotationVelocity,
          stiffness: 0.15,
          damping: 0.7,
        });
        go.rotation = spring.value;
        go.rotationVelocity = spring.velocity;
        group.rotation = go.rotation;
      }
      function render() {
        group.draw();
      }
      const originalUpdate = go.update;
      go.update = (dt) => {
        originalUpdate(dt);
        update(dt);
      }
      go.render = render;
      gallery.add(go);
    });
    this.pipeline.add(gallery);
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new ShapeGalleryGame(canvas);
  game.init();
  game.start();
});

import {
  Button,
  Game,
  GridLayout,
  HorizontalLayout,
  Rectangle,
  Scene,
  ToggleButton,
  VerticalLayout,
  TextShape,
  Position,
  ShapeGOFactory,
  Easing,
  Tweenetik,
} from "/gcanvas.es.min.js";

/**
 * MondrianDemo - Interactive grid-based composition
 * Inspired by the works of Piet Mondrian
 */
export class MondrianDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Setup
    this.backgroundColor = "#ffffff";
    this.gridScene = new Scene(this, { debugColor: "black", origin: "center" });

    // Configure grid scene - center it on the canvas
    const margin = 20;
    this.gridScene.width = this.width - margin * 2;
    this.gridScene.height = this.height - margin * 2;
    this.gridScene.x = this.width / 2;
    this.gridScene.y = this.height / 2;

    // Generate initial composition
    this.generateMondrianRectangles(
      this.gridScene.width,
      this.gridScene.height
    );

    // Add to pipeline
    this.pipeline.add(this.gridScene);

    // Handle click events
    this.events.on("click", () => this.animateExplosion());
  }

  animateExplosion() {
    // Center is now at (0, 0) in scene coordinates
    const maxDimension = Math.max(this.width, this.height);
    const children = this.gridScene._collection.getSortedChildren();

    children.forEach((rect) => {
      // Calculate angle and distance from center (center is 0,0 in scene coords)
      const angle = Math.atan2(rect.y, rect.x);
      const distanceFromCenter = Math.sqrt(
        Math.pow(rect.x, 2) + Math.pow(rect.y, 2)
      );
      const normalizedDistance = Math.min(
        1,
        distanceFromCenter / (Math.min(this.width, this.height) / 2)
      );

      // Calculate animation parameters (in scene-relative coords where center is 0,0)
      const flyDistance = maxDimension * 1.5;
      const destX = Math.cos(angle) * flyDistance;
      const destY = Math.sin(angle) * flyDistance;
      const delay = (1 - normalizedDistance) * 0.5;
      const rotation = (Math.random() * 2 - 1) * Math.PI * 4;

      // Animate rectangle flying away
      Tweenetik.to(
        rect,
        {
          opacity: 0,
          x: destX,
          y: destY,
          scaleX: 0.2,
          scaleY: 0.2,
          rotation: rotation,
        },
        0.5 + normalizedDistance * 0.5,
        Easing.easeInSine,
        {
          delay: delay,
          onComplete: () => {
            this.generateMondrianRectangles(
              this.gridScene.width,
              this.gridScene.height
            );
          },
        }
      );
    });
  }

  generateMondrianRectangles(totalWidth, totalHeight, options = {}) {
    // Clear existing rectangles
    this.gridScene.clear();

    // Default options
    const {
      lineWidth = 8,
      step = totalHeight / 6,
      splitProbability = 0.5,
    } = options;

    // Colors
    const white = "#F2F5F1";
    const colors = ["#D40920", "#1356A2", "#F7D842", "#999999"];

    // Start with one rectangle covering the entire area
    let squares = [
      {
        x: 0,
        y: 0,
        width: totalWidth,
        height: totalHeight,
      },
    ];

    // Generate split points based on grid
    const splitPoints = Array.from(
      { length: Math.ceil(Math.max(totalWidth, totalHeight) / step) },
      (_, i) => i * step
    );

    // Split function
    const splitSquaresAt = (coord) => {
      const { x, y } = coord;

      for (let i = squares.length - 1; i >= 0; i--) {
        const square = squares[i];

        // Split on x-coordinate
        if (
          x &&
          x > square.x &&
          x < square.x + square.width &&
          Math.random() < splitProbability
        ) {
          squares.splice(i, 1);

          squares.push(
            {
              x: square.x,
              y: square.y,
              width: x - square.x,
              height: square.height,
            },
            {
              x: x,
              y: square.y,
              width: square.width - (x - square.x),
              height: square.height,
            }
          );
        }

        // Split on y-coordinate
        if (
          y &&
          y > square.y &&
          y < square.y + square.height &&
          Math.random() < splitProbability
        ) {
          squares.splice(i, 1);

          squares.push(
            {
              x: square.x,
              y: square.y,
              width: square.width,
              height: y - square.y,
            },
            {
              x: square.x,
              y: y,
              width: square.width,
              height: square.height - (y - square.y),
            }
          );
        }
      }
    };

    // Apply splits
    splitPoints.forEach((point) => {
      splitSquaresAt({ y: point });
      splitSquaresAt({ x: point });
    });

    // Assign colors to some squares
    for (let i = 0; i < colors.length * 3; i++) {
      const randomIndex = Math.floor(Math.random() * squares.length);
      squares[randomIndex].color =
        Math.random() < 0.8 ? colors[i % colors.length] : "black";
    }

    // Calculate center for animations
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxDimension = Math.max(this.width, this.height);

    // Create and animate rectangles
    squares.forEach((square, i, allSquares) => {
      // Create rectangle
      const rect = new Rectangle({
        width: square.width - lineWidth,
        height: square.height - lineWidth,
        color: square.color || white,
        stroke: "#000000",
        lineWidth: lineWidth,
        crisp: false,
        origin: "center",
      });

      // Calculate positions relative to scene center (origin is center)
      const halfWidth = totalWidth / 2;
      const halfHeight = totalHeight / 2;
      const finalX = square.x + square.width / 2 - halfWidth;
      const finalY = square.y + square.height / 2 - halfHeight;
      // Animation from scene center (0,0) outward
      const angle = Math.atan2(finalY, finalX);
      const flyDistance = maxDimension * 1.5;
      const startX = Math.cos(angle) * flyDistance;
      const startY = Math.sin(angle) * flyDistance;

      // Create game object
      const go = ShapeGOFactory.create(this, rect, {
        x: startX,
        y: startY,
        scaleX: 0.0,
        scaleY: 0.0,
        crisp: false,
        rotation: (Math.random() * 2 - 1) * Math.PI,
      });

      this.gridScene.add(go);

      // Calculate animation timing (distance from center, which is 0,0)
      const distance = Math.sqrt(
        Math.pow(finalX, 2) + Math.pow(finalY, 2)
      );
      const normalizedDistance = Math.min(
        1,
        distance / (Math.min(this.width, this.height) / 2)
      );

      const middle = allSquares.length / 2;
      const distanceFromMiddle = Math.abs(i - middle);
      const delay = (distanceFromMiddle / middle) * 0.1;

      // Animate rectangle flying in
      Tweenetik.to(
        go,
        {
          x: finalX,
          y: finalY,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        0.5 + normalizedDistance * 0.5,
        Easing.easeOutCirc,
        { delay: delay }
      );
    });
  }

  /**
   * Update function - called each frame
   */
  update(dt) {
    if (this.boundsDirty) {
      this.gridScene.width = this.width - 40;
      this.gridScene.height = this.height - 40;
      this.gridScene.x = this.width / 2;
      this.gridScene.y = this.height / 2;
    }

    super.update(dt);
  }
}

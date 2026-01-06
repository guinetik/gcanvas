/**
 * Gameobjects.html - Live demos for Shapes vs GameObjects documentation
 */
import {
  Circle,
  Game,
  Group,
  Painter,
  Rectangle,
  Scene,
  ShapeGOFactory,
  Sprite,
} from "../../src/index.js";

// ==================== Demo 1: Shapes Only ====================
// Even "shapes only" needs Painter initialized, so we use a minimal Game
class ShapesDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#050505";
  }

  init() {
    super.init();
    // Shapes are created and rendered in render() below
  }

  render() {
    super.render(); // Clears canvas

    const centerY = this.canvas.height / 2;

    // Create shapes - spread across canvas
    const circle = new Circle(35, { x: this.canvas.width * 0.2, y: centerY, color: "#0f0" });
    const rect = new Rectangle({ x: this.canvas.width * 0.5, y: centerY, width: 80, height: 50, color: "#0ff" });

    // Group with rotation
    const group = new Group({ x: this.canvas.width * 0.8, y: centerY, rotation: Math.PI / 4 });
    group.add(new Circle(20, { color: "#f0f" }));
    group.add(new Rectangle({ y: 30, width: 40, height: 20, color: "#ff0" }));

    // Render directly - calling render() on shapes, not using pipeline
    circle.render();
    rect.render();
    group.render();
  }
}

function initShapesDemo() {
  const canvas = document.getElementById("shapes-canvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const demo = new ShapesDemo(canvas);
  demo.start();
}

// ==================== Demo 2: GameObjects with Pipeline ====================
class GameObjectsDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#050505";
  }

  init() {
    super.init();

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Create a scene (GameObject container)
    this.scene = new Scene(this, { x: centerX, y: centerY });

    // Create a sprite with animation (GameObject)
    this.player = new Sprite(this, { frameRate: 8, loop: true, autoPlay: true });

    // Add frames - pulsing circle animation
    const colors = ["#0f0", "#0ff", "#0f0", "#ff0", "#0f0"];
    const sizes = [20, 25, 30, 25, 20];
    colors.forEach((color, i) => {
      this.player.addFrame(new Circle(sizes[i], { color, stroke: "#fff", lineWidth: 2 }));
    });

    // Add to scene
    this.scene.add(this.player);

    // Add scene to pipeline - now it's managed
    this.pipeline.add(this.scene);
  }
}

function initGameObjectsDemo() {
  const canvas = document.getElementById("gameobjects-canvas");
  if (!canvas) return;

  // Set actual canvas size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const demo = new GameObjectsDemo(canvas);
  demo.start();
}

// ==================== Demo 3: Bridging Shape to GameObject ====================
class BridgingDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#050505";
  }

  init() {
    super.init();

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Create a Group of shapes (like a simple avatar)
    const avatar = new Group();
    avatar.add(new Circle(25, { y: -30, color: "#0f0", stroke: "#0a0", lineWidth: 2 })); // head
    avatar.add(new Rectangle({ y: 20, width: 40, height: 50, color: "#0f0", stroke: "#0a0", lineWidth: 2 })); // body

    // Wrap it as a GameObject so it can join the pipeline
    const avatarGO = ShapeGOFactory.create(this, avatar, {
      x: centerX,
      y: centerY,
    });

    // Now it's a proper GameObject - add to pipeline
    this.pipeline.add(avatarGO);

    // Add a second avatar to show multiple instances
    const avatar2 = new Group();
    avatar2.add(new Circle(20, { y: -25, color: "#0ff", stroke: "#0aa", lineWidth: 2 }));
    avatar2.add(new Rectangle({ y: 15, width: 30, height: 40, color: "#0ff", stroke: "#0aa", lineWidth: 2 }));

    const avatar2GO = ShapeGOFactory.create(this, avatar2, {
      x: centerX + 100,
      y: centerY,
    });
    this.pipeline.add(avatar2GO);

    // Third one with rotation
    const avatar3 = new Group({ rotation: 0.2 });
    avatar3.add(new Circle(18, { y: -22, color: "#f0f", stroke: "#a0a", lineWidth: 2 }));
    avatar3.add(new Rectangle({ y: 12, width: 25, height: 35, color: "#f0f", stroke: "#a0a", lineWidth: 2 }));

    const avatar3GO = ShapeGOFactory.create(this, avatar3, {
      x: centerX - 100,
      y: centerY,
    });
    this.pipeline.add(avatar3GO);
  }
}

function initBridgingDemo() {
  const canvas = document.getElementById("bridging-canvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const demo = new BridgingDemo(canvas);
  demo.start();
}

// ==================== Initialize ====================
window.addEventListener("load", () => {
  initShapesDemo();
  initGameObjectsDemo();
  initBridgingDemo();
});

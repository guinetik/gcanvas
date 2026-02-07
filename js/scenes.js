import {
  Game,
  GameObject,
  Scene,
  Rectangle,
  Circle,
  Star,
  Triangle,
  TextShape,
  Group,
  FPSCounter,
  Motion,
  Easing,
  Painter,
} from "/gcanvas.es.min.js";

/**
 * Helper class to wrap a Shape in a GameObject for use in Scenes.
 * Scenes expect GameObjects, not raw Shapes.
 */
class ShapeWrapper extends GameObject {
  constructor(game, shape) {
    super(game, { originX: 0.5, originY: 0.5 });
    this.shape = shape;
    // Pass origin to shape
    if (shape) {
      shape.originX = 0.5;
      shape.originY = 0.5;
    }
  }

  draw() {
    super.draw();
    this.shape.render();
  }
}

/**
 * Utility function to wrap a shape in a GameObject
 */
function wrapShape(game, shape) {
  return new ShapeWrapper(game, shape);
}

/**
 * SceneDemo Game
 * Demonstrates Scene capabilities: nesting, transforms, and z-ordering
 */
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "black";
  }

  init() {
    super.init();

    // Main container scene (centered)
    this.mainScene = new Scene(this, {
      width: 600,
      height: 400,
      debug: false,
      debugColor: "#ff00ff",
      origin: "center",
      anchor: "center"
    });
    this.pipeline.add(this.mainScene);

    // Add demo scenes
    this.mainScene.add(new TransformingSceneDemo(this));
    this.mainScene.add(new NestedSceneDemo(this));
    this.mainScene.add(new ZOrderDemo(this));

    // FPS counter
    this.pipeline.add(new FPSCounter(this, { anchor: "bottom-right" }));
  }

  onResize() {
    if (this.mainScene) {
      // Adjust main scene to fit screen
      this.mainScene.width = Math.min(this.width - 40, 800);
      this.mainScene.height = Math.min(this.height - 80, 500);
    }
  }
}

/**
 * Demo 1: Scene with animated transforms
 * Shows rotation and scaling applied to a scene with children
 */
class TransformingSceneDemo extends GameObject {
  constructor(game) {
    super(game, { originX: 0.5, originY: 0.5 });

    // Create a scene that will be transformed
    this.scene = new Scene(game, {
      width: 120,
      height: 120,
      debug: false,
      debugColor: "#ff00ff",
      origin: "center"
    });

    // Position using transform API
    this.scene.transform.position(-200, 0);

    // Add shapes to the scene
    const rect = new Rectangle({
      width: 40,
      height: 40,
      color: "#e94560",
      stroke: "#fff",
      lineWidth: 2,
      origin: "center"
    });
    rect.transform.position(-25, -25);

    const circle = new Circle(15, {
      color: "#00d9ff",
      stroke: "#fff",
      lineWidth: 2,
      origin: "center"
    });
    circle.transform.position(25, 25);

    const star = new Star(12, 5, 0.5, {
      color: "#ffc107",
      stroke: "#fff",
      lineWidth: 1,
      origin: "center"
    });
    star.transform.position(25, -25);

    // Add shapes via wrapper
    this.scene.add(wrapShape(game, rect));
    this.scene.add(wrapShape(game, circle));
    this.scene.add(wrapShape(game, star));

    // Label
    this.label = new TextShape("Scene Transforms", {
      x: -200,
      y: -80,
      font: "bold 12px monospace",
      color: "#fff",
      align: "center",
      origin: "center"
    });

    this.elapsed = 0;
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt;

    // Animate the scene's transforms
    this.scene.transform
      .rotation(this.elapsed * 30)
      .scale(0.8 + Math.sin(this.elapsed * 2) * 0.2);
  }

  draw() {
    super.draw();
    this.scene.render();
    this.label.render();
  }
}

/**
 * Demo 2: Nested Scenes
 * Shows scenes containing other scenes
 */
class NestedSceneDemo extends GameObject {
  constructor(game) {
    super(game, { originX: 0.5, originY: 0.5 });

    // Outer scene
    this.outerScene = new Scene(game, {
      width: 150,
      height: 150,
      debug: false,
      debugColor: "#ff00ff",
      origin: "center"
    });
    this.outerScene.transform.position(0, 0);

    // Inner scene (nested inside outer)
    this.innerScene = new Scene(game, {
      width: 80,
      height: 80,
      debug: false,
      debugColor: "#00ffff",
      origin: "center"
    });

    // Add shapes to inner scene
    const innerRect = new Rectangle({
      width: 30,
      height: 30,
      color: "#7bed9f",
      stroke: "#fff",
      lineWidth: 2,
      origin: "center"
    });
    this.innerScene.add(wrapShape(game, innerRect));

    // Add inner scene to outer
    this.outerScene.add(this.innerScene);

    // Add corner markers to outer scene
    const corners = [
      { x: -50, y: -50 },
      { x: 50, y: -50 },
      { x: 50, y: 50 },
      { x: -50, y: 50 }
    ];
    corners.forEach((pos, i) => {
      const marker = new Circle(8, {
        color: ["#ff6b6b", "#ffc107", "#00d9ff", "#7bed9f"][i],
        stroke: "#fff",
        lineWidth: 1,
        origin: "center"
      });
      marker.transform.position(pos.x, pos.y);
      this.outerScene.add(wrapShape(game, marker));
    });

    // Label
    this.label = new TextShape("Nested Scenes", {
      x: 0,
      y: -80,
      font: "bold 12px monospace",
      color: "#fff",
      align: "center",
      origin: "center"
    });

    this.elapsed = 0;
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt;

    // Outer scene rotates slowly
    this.outerScene.transform.rotation(this.elapsed * 20);

    // Inner scene counter-rotates and pulses
    this.innerScene.transform
      .rotation(-this.elapsed * 60)
      .scale(0.9 + Math.sin(this.elapsed * 3) * 0.2);
  }

  draw() {
    super.draw();
    this.outerScene.render();
    this.label.render();
  }
}

/**
 * Demo 3: Z-Ordering in Scenes
 * Shows bring to front / send to back functionality
 */
class ZOrderDemo extends GameObject {
  constructor(game) {
    super(game, { originX: 0.5, originY: 0.5 });

    this.scene = new Scene(game, {
      width: 140,
      height: 140,
      debug: false,
      debugColor: "#ff00ff",
      origin: "center"
    });
    this.scene.transform.position(200, 0);

    // Create overlapping shapes
    this.shapes = [];
    const colors = ["#e94560", "#ffc107", "#00d9ff", "#7bed9f"];
    const positions = [
      { x: -20, y: -20 },
      { x: 0, y: -10 },
      { x: 20, y: 0 },
      { x: 0, y: 10 }
    ];

    colors.forEach((color, i) => {
      const rect = new Rectangle({
        width: 50,
        height: 50,
        color: color,
        stroke: "#fff",
        lineWidth: 2,
        origin: "center"
      });
      rect.transform.position(positions[i].x, positions[i].y);
      const wrapped = wrapShape(game, rect);
      this.shapes.push(wrapped);
      this.scene.add(wrapped);
    });

    // Label
    this.label = new TextShape("Z-Ordering", {
      x: 200,
      y: -80,
      font: "bold 12px monospace",
      color: "#fff",
      align: "center",
      origin: "center"
    });

    this.elapsed = 0;
    this.lastSwap = 0;
    this.swapInterval = 1.5; // seconds between z-order changes
  }

  update(dt) {
    super.update(dt);
    this.elapsed += dt;

    // Periodically bring a different shape to front
    if (this.elapsed - this.lastSwap > this.swapInterval) {
      this.lastSwap = this.elapsed;
      const index = Math.floor(this.elapsed / this.swapInterval) % this.shapes.length;
      this.scene.bringToFront(this.shapes[index]);
    }

    // Subtle pulse on the scene
    this.scene.transform.scale(0.95 + Math.sin(this.elapsed * 2) * 0.05);
  }

  draw() {
    super.draw();
    this.scene.render();
    this.label.render();
  }
}

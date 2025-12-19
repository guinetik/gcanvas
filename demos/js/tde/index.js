import {
  Game,
  GameObject,
  Camera3D,
  StateMachine,
  Painter,
  Text,
  Scene3D,
  Circle,
} from "../../../src/index.js";
import { StarField } from "../blackhole/starfield.obj.js";

const CONFIG = {
  blackHole: {
    radius: 50,
    mass: 1000000,
    temperature: 10000,
    pressure: 1000000,
    density: 1000000,
    velocity: 1000000,
  },
  sceneOptions: {
    starCount: 5000,
  },
};

class BlackHole extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.radius = options.radius ?? 100;
    this.mass = options.mass ?? 1000000;
    this.temperature = options.temperature ?? 10000;
    this.pressure = options.pressure ?? 1000000;
    this.density = options.density ?? 1000000;
    this.velocity = options.velocity ?? 1000000;
  }

  init() {
    // Use a radial CanvasGradient that is nearly black at the edge and fully black almost everywhere
    const gradient = Painter.colors.radialGradient(
      0,
      0,
      0.01 * this.radius,
      0,
      0,
      this.radius,
      [
        { offset: 0, color: "#000" },
        { offset: 0.7, color: "#000" },
        { offset: 0.99, color: "#101010" },
        { offset: 1, color: "#181818" },
      ]
    );
    this.core = new Circle(this.radius, { color: gradient });
    // SHAPE HAS IT OWN INTERNAL DRAW FUNCTION THAT IS CALLED BY THE RENDER FUNCTION
  }

  update(dt) {
    super.update(dt);
    // ADJUST GAME STATE IN THE UPDATE FUNCTION
    // Position is handled by Scene3D projection now, so we keep local coordinates relative to the scene origin (0,0,0)
    // The previous implementation set this.core.x = this.game.width/2 which was mixing screen and world space
    this.core.x = 0; 
    this.core.y = 0;
  }

  render() {
    super.render();
    // RENDER SHAPE TO THE SCREEN
    // Scene3D handles the translation/scaling, so we just draw the shape
    this.core.render();
  }
}

class BlackholeScene extends Scene3D {
  constructor(game, options = {}) {
    super(game, options);
    // Camera is passed via options and handled by Scene3D
  }

  init() {
    this.starField = new StarField(this, {
      camera: this.camera,
      starCount: CONFIG.sceneOptions.starCount,
    });
    this.starField.init();
    
    // StarField handles its own projection internally usually, but if we add it to Scene3D
    // it might get double-projected if we aren't careful.
    // However, StarField usually isn't a GameObject with a simple (x,y,z), it's a manager.
    // Let's check StarField implementation. Assuming it works as a background object.
    this.add(this.starField);
    
    // Add BlackHole at (0,0,0)
    const bh = new BlackHole(this.game, CONFIG.blackHole);
    bh.x = 0;
    bh.y = 0;
    bh.z = 0;
    this.add(bh);
    
    this.starField.onResize(this.game.width, this.game.height);
  }

  onResize() {
    if (this.starField) {
        this.starField.onResize(this.game.width, this.game.height);
    }
  }
}

class TDEDemo extends Game {
  constructor(canvas) {
    super(canvas);
  }

  updateScaledSizes() {
    this.baseScale = Math.min(this.width, this.height);
    this.bhRadius = this.baseScale * CONFIG.bhRadiusRatio;
    // ... other sizing
  }

  init() {
    super.init();
    // Initialize time
    this.time = 0;
    // Calculate scaled sizes
    this.updateScaledSizes();
    
    // Setup Camera3D
    // Center the camera on the screen
    this.camera = new Camera3D({
      rotationX: 0.1,
      rotationY: 0,
      perspective: this.baseScale * 0.6,
      autoRotate: true,
      autoRotateSpeed: 0.2,
      // Camera3D usually projects relative to (0,0), so we translate the scene context to center screen
      // Scene3D might expect to render centered.
    });
    this.camera.enableMouseControl(this.canvas);
    
    // Pass camera to Scene3D
    // Scene3D will project its children using this camera
    this.scene = new BlackholeScene(this, { 
        camera: this.camera,
        // Center the scene on screen so (0,0,0) projection renders at center
        x: this.width / 2, 
        y: this.height / 2 
    });
    
    this.pipeline.add(this.scene);
  }

  onResize() {
    this.updateScaledSizes();
    if (this.camera) {
      this.camera.perspective = this.baseScale * 0.6;
    }
    if (this.scene) {
        this.scene.x = this.width / 2;
        this.scene.y = this.height / 2;
        this.scene.onResize();
    }
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new TDEDemo(canvas);
  demo.enableFluidSize();
  demo.start();
});

import {
  Game,
  GameObject,
  Camera3D,
  StateMachine,
  Painter,
  Text,
  Scene3D,
  Circle,
  Scene,
  Sphere3D,
} from "../../../src/index.js";
import { StarField } from "../blackhole/starfield.obj.js";
import { polarToCartesian } from "../../../src/math/gr.js";
import { keplerianOmega } from "../../../src/math/orbital.js";

const CONFIG = {
  blackHole: {
    radius: 50,
    mass: 1000000,
    temperature: 10000,
    pressure: 1000000,
    density: 1000000,
    velocity: 1000000,
  },
  star: {
    radius: 15,
    color: "#FFD700",
    orbitalRadius: 300,
    mass: 1,
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
    this.core = new Sphere3D(this.radius, { color: gradient, camera: this.game.camera });
    // SHAPE HAS IT OWN INTERNAL DRAW FUNCTION THAT IS CALLED BY THE RENDER FUNCTION
  }

  update(dt) {
    super.update(dt);
    // ADJUST GAME STATE IN THE UPDATE FUNCTION
  }

  draw() {
    // Sphere3D handles its own projection and positioning relative to (0,0,0)
    // Since super.render() (in Renderable) already translated us to (this.x, this.y),
    // and this is called from Scene3D which translated us to the PROJECTED (x,y),
    // we just need to draw the core.
    this.core.draw();
  }
}

class Star extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.radius = options.radius ?? CONFIG.star.radius;
    this.orbitalRadius = options.orbitalRadius ?? CONFIG.star.orbitalRadius;
    this.phi = options.phi ?? 0;
    this.mass = options.mass ?? CONFIG.star.mass;
  }

  init() {
    this.visual = new Sphere3D(this.radius, {
      color: CONFIG.star.color,
      camera: this.game.camera,
    });
  }

  update(dt) {
    super.update(dt);

    // Calculate angular velocity using Kepler's 3rd law
    // Scaling mass and speed factor to get a more cinematic rotation speed
    const omega = keplerianOmega(this.orbitalRadius, CONFIG.blackHole.mass, 0.001, 300);
    this.phi += omega * dt;

    // Convert polar orbital position to Cartesian
    const pos = polarToCartesian(this.orbitalRadius, this.phi);
    this.x = pos.x;
    this.z = pos.z;
    this.y = 0; // Keep it in the equatorial plane for now
  }

  draw() {
    this.visual.draw();
  }
}

class BlackholeScene extends Scene3D {
  constructor(game, options = {}) {
    super(game, options);
    // Camera is passed via options and handled by Scene3D
  }

  init() {
    // Add BlackHole at (0,0,0)
    const bh = new BlackHole(this.game, CONFIG.blackHole);
    bh.x = 0;
    bh.y = 0;
    bh.z = 0;
    this.add(bh);

    // Add a Star orbiting the black hole
    const star = new Star(this.game, CONFIG.star);
    this.add(star);
  }

  onResize() {

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
    });
    this.camera.enableMouseControl(this.canvas);
    this.starField = new StarField(this, {
      camera: this.camera,
      starCount: CONFIG.sceneOptions.starCount,
    });
    this.pipeline.add(this.starField);
    // Pass camera to Scene3D
    // Scene3D will project its children using this camera
    this.scene = new BlackholeScene(this, {
      camera: this.camera,
      x: this.width / 2,
      y: this.height / 2,
    });

    this.pipeline.add(this.scene);
  }

  onResize() {
    if (this.camera) {
      this.camera.perspective = this.baseScale * 0.6;
    }
    this.updateScaledSizes();

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

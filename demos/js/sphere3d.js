import {
  Game,
  Sphere3D,
  FPSCounter,
} from "../../src/index.js";
import { Camera3D } from "../../src/util/camera3d.js";

/**
 * Configuration for the Sphere3D showcase demo
 * Sizes are calculated dynamically based on screen size
 */
const CONFIG = {
  // Base sizes (will be scaled)
  baseRadius: 0.08,      // fraction of min(width, height)
  baseSpacing: 0.22,     // fraction of width

  camera: {
    perspective: 800,
    rotationX: 0.2,
    rotationY: -0.3,
    inertia: true,
    friction: 0.95,
  },

  selfRotation: {
    speed: 1.5, // radians per second
  },

  solidSphere: {
    color: "#FF6B35",
    segments: 24,
  },

  gasGiant: {
    baseColor: [0.9, 0.7, 0.5],
    seed: 42.0,
    stormIntensity: 0.6,
    rotationSpeed: 0.8,
  },

  star: {
    color: [1.0, 0.9, 0.5],
    temperature: 5778,
    activityLevel: 0.5,
    rotationSpeed: 1.2,
  },
};

/**
 * SphereData - Holds sphere and its world position
 */
class SphereData {
  constructor(sphere, worldX, worldY, worldZ, label) {
    this.sphere = sphere;
    this.worldX = worldX;
    this.worldY = worldY;
    this.worldZ = worldZ;
    this.label = label;
  }
}

/**
 * Sphere3DDemo - Showcases different Sphere3D rendering modes
 */
class Sphere3DDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Create camera with mouse controls
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
    });
    this.camera.enableMouseControl(this.canvas);

    // Calculate initial sizes based on screen
    this._updateSizes();

    // Sphere 1: Solid Color (Canvas 2D rendering)
    const solidSphere = new Sphere3D(this.sphereRadius, {
      color: CONFIG.solidSphere.color,
      camera: this.camera,
      segments: CONFIG.solidSphere.segments,
    });
    this.solidData = new SphereData(solidSphere, -this.spacing, 0, 0, "Solid Color");

    // Sphere 2: Gas Giant (WebGL shader)
    const gasGiantSphere = new Sphere3D(this.sphereRadius, {
      camera: this.camera,
      useShader: true,
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: CONFIG.gasGiant.baseColor,
        uSeed: CONFIG.gasGiant.seed,
        uStormIntensity: CONFIG.gasGiant.stormIntensity,
        uRotationSpeed: CONFIG.gasGiant.rotationSpeed,
      },
    });
    this.gasGiantData = new SphereData(gasGiantSphere, 0, 0, 0, "Gas Giant");

    // Sphere 3: Star (WebGL shader with glow)
    const starSphere = new Sphere3D(this.sphereRadius, {
      camera: this.camera,
      useShader: true,
      shaderType: "star",
      shaderUniforms: {
        uStarColor: CONFIG.star.color,
        uTemperature: CONFIG.star.temperature,
        uActivityLevel: CONFIG.star.activityLevel,
        uRotationSpeed: CONFIG.star.rotationSpeed,
      },
    });
    this.starData = new SphereData(starSphere, this.spacing, 0, 0, "Star");

    // Store all sphere data for rendering
    this.sphereDataList = [this.solidData, this.gasGiantData, this.starData];

    // Add FPS counter
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }

  /**
   * Calculate sizes based on current screen dimensions
   */
  _updateSizes() {
    const minDim = Math.min(this.width, this.height);
    this.sphereRadius = minDim * CONFIG.baseRadius;
    this.spacing = this.width * CONFIG.baseSpacing;
  }

  /**
   * Handle window resize
   */
  onResize() {
    this._updateSizes();

    // Update sphere radii
    if (this.sphereDataList) {
      for (const data of this.sphereDataList) {
        data.sphere.radius = this.sphereRadius;
        data.sphere._generateGeometry();
      }

      // Update world positions
      this.solidData.worldX = -this.spacing;
      this.gasGiantData.worldX = 0;
      this.starData.worldX = this.spacing;
    }
  }

  update(dt) {
    super.update(dt);

    // Update camera (for inertia)
    this.camera.update(dt);

    // Update self-rotation for Canvas 2D sphere
    this.solidData.sphere.selfRotationY += CONFIG.selfRotation.speed * dt;
  }

  render() {
    super.render();

    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Project and sort by depth (back to front)
    const projected = this.sphereDataList.map(data => {
      const proj = this.camera.project(data.worldX, data.worldY, data.worldZ);
      return { data, proj };
    });
    projected.sort((a, b) => b.proj.z - a.proj.z);

    // Render each sphere at its projected position
    for (const { data, proj } of projected) {
      ctx.save();
      // Translate to screen center + projected position
      ctx.translate(centerX + proj.x, centerY + proj.y);
      // Scale by perspective
      ctx.scale(proj.scale, proj.scale);
      // Render sphere at origin (it will draw centered)
      data.sphere.draw();
      ctx.restore();
    }

    // Render labels (always on top)
    this.renderLabels(projected, centerX, centerY);
  }

  /**
   * Render sphere labels at projected positions
   */
  renderLabels(projected, centerX, centerY) {
    const ctx = this.ctx;

    for (const { data, proj } of projected) {
      // Calculate label position below the sphere
      const screenX = centerX + proj.x;
      const screenY = centerY + proj.y + this.sphereRadius * proj.scale + 20;

      ctx.font = "14px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(data.label, screenX, screenY);
    }
  }
}

// Start the demo
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new Sphere3DDemo(canvas);
  demo.start();
});

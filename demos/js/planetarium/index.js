/**
 * Planetarium — Main demo.
 *
 * Solar system visualization with Sphere3D shaders and Keplerian orbits.
 *
 * @module planetarium/index
 */

import {
  Game,
  Camera3D,
  Gesture,
  Screen,
  FPSCounter,
  Keys,
} from "../../../src/index.js";
import { CONFIG } from "./planetarium.config.js";
import { SUN, PLANETS } from "./planetarium.data.js";
import { CelestialBody } from "./planetarium.bodies.js";
import {
  generateStarfield,
  drawStarfield,
  drawSunGlow,
  drawLabels,
  drawHUD,
} from "./planetarium.ui.js";

export class PlanetariumDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();
    Screen.init(this);

    // Simulation time (days)
    this.simTime = 0;
    this.timeScale = CONFIG.time.scale;
    this.paused = false;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      minRotationX: CONFIG.camera.minRotationX,
      maxRotationX: CONFIG.camera.maxRotationX,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      autoRotate: CONFIG.camera.autoRotate,
      autoRotateSpeed: CONFIG.camera.autoRotateSpeed,
      autoRotateAxis: CONFIG.camera.autoRotateAxis,
      velocityScale: CONFIG.camera.velocityScale,
    });
    this.camera.enableMouseControl(this.canvas);

    // Zoom
    const initialZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // Pan
    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;

    // Gesture (zoom + pan)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this.targetZoom));
      },
      onPan: (dx, dy) => {
        this.targetPanX += dx * CONFIG.pan.speed;
        this.targetPanY += dy * CONFIG.pan.speed;
      },
    });

    // Double-click reset
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.targetPanX = 0;
      this.targetPanY = 0;
      this.camera.reset();
    });

    // Spacebar pause
    this.keys = new Keys();
    this.keys.on("Space", () => {
      this.paused = !this.paused;
    });

    // Create celestial bodies
    const minDim = Math.min(this.width, this.height);
    this.sun = new CelestialBody(SUN, this.camera, minDim);
    this.planets = [];
    this.moons = [];

    for (const planetData of PLANETS) {
      const planet = new CelestialBody(planetData, this.camera, minDim);
      this.planets.push(planet);

      if (planetData.moons) {
        for (const moonData of planetData.moons) {
          const moon = new CelestialBody(moonData, this.camera, minDim, planet);
          this.moons.push(moon);
        }
      }
    }

    // All bodies flat list for rendering
    this.allBodies = [this.sun, ...this.planets, ...this.moons];

    // Starfield
    this.stars = generateStarfield(this.width, this.height);

    // FPS counter
    this.pipeline.add(new FPSCounter(this, { anchor: "bottom-right" }));
  }

  onResize() {
    const minDim = Math.min(this.width, this.height);
    for (const body of this.allBodies) {
      body.resize(minDim);
    }
    this.stars = generateStarfield(this.width, this.height);

    const newDefaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.defaultZoom = newDefaultZoom;
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);

    // Ease zoom and pan
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;
    this.panX += (this.targetPanX - this.panX) * CONFIG.pan.easing;
    this.panY += (this.targetPanY - this.panY) * CONFIG.pan.easing;

    // Advance simulation
    if (!this.paused) {
      this.simTime += dt * this.timeScale;
    }

    // Update orbital positions (planets first, then moons)
    for (const planet of this.planets) {
      planet.update(this.simTime);
    }
    for (const moon of this.moons) {
      moon.update(this.simTime);
    }
  }

  render() {
    super.render(); // clears canvas + pipeline (FPS counter)

    const ctx = this.ctx;
    const centerX = this.width / 2 + this.panX;
    const centerY = this.height / 2 + this.panY;

    // 1. Starfield
    drawStarfield(ctx, this.stars);

    // 2. Orbit paths (planets, then moons)
    for (const planet of this.planets) {
      planet.drawOrbitPath(ctx, centerX, centerY, this.zoom);
    }
    for (const moon of this.moons) {
      moon.drawOrbitPath(ctx, centerX, centerY, this.zoom);
    }

    // 3. Project all bodies
    for (const body of this.allBodies) {
      body.project(centerX, centerY, this.zoom);
    }

    // 4. Depth sort (back to front)
    const sorted = [...this.allBodies].sort((a, b) => b.depth - a.depth);

    // 5. Render bodies
    for (const body of sorted) {
      if (body === this.sun) {
        drawSunGlow(ctx, body.screenX, body.screenY, body.displayRadius, body.scale);
      }
      body.draw(ctx);
    }

    // 6. Labels (always on top)
    drawLabels(ctx, this.allBodies);

    // 7. HUD
    drawHUD(ctx, this.simTime, this.timeScale, this.paused);
  }
}

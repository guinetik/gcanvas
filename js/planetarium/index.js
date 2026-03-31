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
} from "/gcanvas.es.min.js";
import { CONFIG } from "./planetarium.config.js";
import { SUN, PLANETS } from "./planetarium.data.js";
import { CelestialBody } from "./planetarium.bodies.js";
import {
  generateStarfield,
  drawStarfield,
  drawSunGlow,
  drawLabels,
  drawHUD,
  buildControlPanel,
  positionPanel,
} from "./planetarium.ui.js";
import { SpacetimeGrid } from "./planetarium.spacetime.js";

export class PlanetariumDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();
    Screen.init(this);

    // Simulation state
    this.simTime = 0;
    this.timeScale = CONFIG.time.scale;
    this.paused = false;
    this.grEnabled = false;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      clampX: CONFIG.camera.clampX,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      autoRotate: CONFIG.camera.autoRotate,
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

    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this.targetZoom));
      },
      onPan: null,
    });

    // Double-click reset
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.camera.reset();
    });

    // Spacebar pause
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.paused = !this.paused;
        if (this._controls && this._controls.pause) {
          this._controls.pause.toggle(this.paused);
        }
      }
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

    this.allBodies = [this.sun, ...this.planets, ...this.moons];

    // Spacetime curvature grid (toggled via panel)
    this.spacetimeGrid = new SpacetimeGrid();

    // Starfield
    this.stars = generateStarfield(this.width, this.height);

    // Control panel
    const { panel, controls } = buildControlPanel(this, {
      onTimeScale: (v) => { this.timeScale = v; },
      onPause: (toggled) => { this.paused = toggled; },
      onGR: (toggled) => { this.grEnabled = toggled; },
      onReset: () => {
        this.targetZoom = this.defaultZoom;
        this.camera.reset();
      },
    });
    this._panel = panel;
    this._controls = controls;
    this.pipeline.add(panel);
    positionPanel(panel, this.width);

    // FPS counter
    this.pipeline.add(new FPSCounter(this, { anchor: "bottom-right" }));
  }

  onResize() {
    if (!this.allBodies) return;
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

    if (this._panel) {
      positionPanel(this._panel, this.width);
    }
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);

    // Ease zoom
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;

    // Advance simulation
    if (!this.paused) {
      this.simTime += dt * this.timeScale;
    }

    // Update orbital positions
    for (const planet of this.planets) {
      planet.update(this.simTime);
    }
    for (const moon of this.moons) {
      moon.update(this.simTime);
    }

    // Update spacetime grid with Sun + planet gravity wells
    if (this.grEnabled) {
      this.spacetimeGrid.update(this.simTime / 365.25, this.planets);
    }
  }

  render() {
    super.render();

    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // 1. Starfield
    drawStarfield(ctx, this.stars);

    // 1.5. Spacetime curvature grid (when GR enabled)
    if (this.grEnabled) {
      this.spacetimeGrid.draw(ctx, this.camera, centerX, centerY, this.zoom);
    }

    // 2. Orbit paths
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

    // 6. Labels
    drawLabels(ctx, this.allBodies);

    // 7. HUD
    drawHUD(ctx, this.simTime, this.timeScale, this.paused);
  }
}

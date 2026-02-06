/**
 * Clifford Attractor 2D Visualization
 *
 * A 2D iterative attractor that creates intricate fractal patterns
 * using simple trigonometric functions. Unlike continuous attractors,
 * this is a discrete map revealed by accumulating many iterations.
 *
 * Engine-aligned procedural WebGL approach:
 * - Seed buffer stays on the GPU
 * - Vertex shader iterates the Clifford map
 * - Output is composited onto the main 2D canvas for trail accumulation
 */

import { Game, Gesture, Screen, Attractors, Painter, WebGLCliffordRenderer, Keys, Tweenetik, Easing } from "../../src/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Attractor settings (GPU iterations per point)
  attractor: {
    iterations: 120,
    params: {
      // Default Clifford parameters
      a: -1.4,
      b: 1.6,
      c: 1.0,
      d: 0.7,
    },
  },

  // Procedural point settings
  points: {
    seedCount: 1 << 18, // 262144
    pointSize: 1.0,
    pointScale: 0.5,
    shape: "glow", // 'circle' | 'glow' | 'square' | 'softSquare'
    blendMode: "additive", // WebGL blending
    compositeBlendMode: "lighter", // Canvas 2D blend for compositing
    color: { r: 1, g: 1, b: 1, a: 0.12 }, // used when colorMode=0
  },

  // Visual settings
  visual: {
    // Lorenz-style speed→hue coloring
    minHue: 180, // fast
    maxHue: 320, // slow
    maxSpeed: 0.9,
    saturation: 80,
    lightness: 60,
    alpha: 0.14,
    hueShiftSpeed: 6,
    fadeSpeed: 0.02,
  },

  // Zoom settings
  zoom: {
    min: 0.3,
    max: 3.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
    initialMultiplier: 0.75,
  },

  // Rotation settings (drag to rotate)
  rotation: {
    speed: 0.01, // radians per pixel
    easing: 0.15,
    autoSpeed: 0.18, // radians/sec
  },

  // Restart settings
  restart: {
    delay: 3,          // Delay before new simulation starts (seconds)
    fadeDuration: 1.5, // Alpha fade-in duration (seconds)
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DEMO CLASS
// ─────────────────────────────────────────────────────────────────────────────

class CliffordDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    this.attractor = Attractors.clifford;
    console.log(`Attractor: ${this.attractor.name}`);
    console.log(`Equations:`, this.attractor.equations);

    const { min, max, baseScreenSize } = CONFIG.zoom;
    const initialZoomRaw = Screen.minDimension() / baseScreenSize;
    const initialZoom = Math.min(
      max,
      Math.max(min, initialZoomRaw * CONFIG.zoom.initialMultiplier)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // Continuous auto-rotation + user-controlled offset (drag)
    this.baseRotation = 0;
    this.userRotation = 0;
    this.targetUserRotation = 0;

    // Gesture handler for zoom + rotation
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
      },
      onPan: (dx) => {
        this.targetUserRotation += dx * CONFIG.rotation.speed;
      },
    });

    // Double-click to reset zoom/rotation
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.baseRotation = 0;
      this.targetUserRotation = 0;
      this._didFirstClear = false;
      this.renderer?.regenerateSeeds();
    });

    // Keyboard input - press R to restart
    Keys.init(this);
    this.events.on(Keys.R, () => this.restart());

    this.time = 0;
    this._didFirstClear = false;
    this.fadeAlpha = 1; // For fade-in effect on restart

    // Procedural renderer (GPU iteration)
    this.renderer = new WebGLCliffordRenderer(CONFIG.points.seedCount, {
      width: this.width,
      height: this.height,
      shape: CONFIG.points.shape,
      blendMode: CONFIG.points.blendMode,
      pointSize: CONFIG.points.pointSize,
      pointScale: CONFIG.points.pointScale,
      iterations: CONFIG.attractor.iterations,
      color: CONFIG.points.color,
      colorMode: 1,
      hueRange: { minHue: CONFIG.visual.minHue, maxHue: CONFIG.visual.maxHue },
      maxSpeed: CONFIG.visual.maxSpeed,
      saturation: CONFIG.visual.saturation / 100,
      lightness: CONFIG.visual.lightness / 100,
      alpha: CONFIG.visual.alpha,
      hueShiftSpeed: CONFIG.visual.hueShiftSpeed,
      params: CONFIG.attractor.params,
    });

    if (!this.renderer.isAvailable()) {
      console.warn("WebGL not available for Clifford demo");
    }
  }

  onResize() {
    const { min, max, baseScreenSize } = CONFIG.zoom;
    const initialZoomRaw = Screen.minDimension() / baseScreenSize;
    this.defaultZoom = Math.min(
      max,
      Math.max(min, initialZoomRaw * CONFIG.zoom.initialMultiplier)
    );
    this._didFirstClear = false;
    this.renderer?.resize(this.width, this.height);
  }

  update(dt) {
    super.update(dt);
    Tweenetik.updateAll(dt);
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;
    this.time += dt;

    const TAU = Math.PI * 2;
    this.baseRotation = (this.baseRotation + CONFIG.rotation.autoSpeed * dt) % TAU;
    this.userRotation += (this.targetUserRotation - this.userRotation) * CONFIG.rotation.easing;
  }

  clear() {
    // Fade the canvas to create persistent trails.
    if (!this._didFirstClear) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, this.width, this.height);
      });
      this._didFirstClear = true;
      return;
    }

    const fade = CONFIG.visual.fadeSpeed;
    if (fade <= 0) return;

    Painter.useCtx((ctx) => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, this.width, this.height);
    });
  }

  render() {
    Painter.setContext(this.ctx);
    if (this.running) this.clear();

    if (this.renderer?.isAvailable()) {
      this.renderer.setParams(CONFIG.attractor.params);
      this.renderer.setIterations(CONFIG.attractor.iterations);
      this.renderer.setZoom(this.zoom);
      this.renderer.setTransform(
        WebGLCliffordRenderer.rotationMat3(this.baseRotation + this.userRotation)
      );

      this.renderer.clear(0, 0, 0, 0);
      this.renderer.render(this.time);

      Painter.useCtx((ctx) => {
        const prevComp = ctx.globalCompositeOperation;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = CONFIG.points.compositeBlendMode;
        ctx.globalAlpha = this.fadeAlpha;
        this.renderer.compositeOnto(ctx, 0, 0);
        ctx.globalCompositeOperation = prevComp;
        ctx.globalAlpha = prevAlpha;
      });
    }
  }

  /**
   * Restart the simulation with fresh seeds and fade-in effect
   */
  restart() {
    // Kill any existing fade tweens
    Tweenetik.killTarget(this);

    // Immediately go black
    this.fadeAlpha = 0;
    this._didFirstClear = false;

    // After delay, reset and fade in
    setTimeout(() => {
      // Reset rotation
      this.baseRotation = 0;
      this.userRotation = 0;
      this.targetUserRotation = 0;

      // Reset zoom
      this.zoom = this.defaultZoom;
      this.targetZoom = this.defaultZoom;

      // Reset time and clear state
      this.time = 0;
      this._didFirstClear = false;

      // Regenerate GPU seeds
      this.renderer?.regenerateSeeds();

      // Start fade-in
      Tweenetik.to(
        this,
        { fadeAlpha: 1 },
        CONFIG.restart.fadeDuration,
        Easing.easeOutCubic
      );

      console.log("Clifford attractor restarted");
    }, CONFIG.restart.delay * 1000);
  }

  destroy() {
    this.gesture?.destroy();
    this.renderer?.destroy();
    super.destroy?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new CliffordDemo(canvas);
  demo.start();
});

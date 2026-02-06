/**
 * De Jong Attractor 2D Visualization
 *
 * A 2D iterative attractor by Peter de Jong, similar to Clifford but
 * creating different swirling patterns with its sin/cos structure.
 *
 * Engine-aligned procedural WebGL approach:
 * - Seed buffer stays on the GPU
 * - Vertex shader iterates the De Jong map (like the reference project)
 * - Output is composited onto the main 2D canvas for easy trail accumulation
 */

import { Game, Gesture, Screen, Attractors, Painter, WebGLDeJongRenderer, Keys, Tweenetik, Easing } from "../../src/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Attractor settings
  attractor: {
    // GPU shader iterations per point
    iterations: 100,

    // Parameter animation (mirrors the reference project where 'a' drifts over time)
    params: {
      aBase: -2.0,
      aWobble: 0.6,
      aPeriodSeconds: 8.0, // seconds for one full wobble cycle
      b: -2.0,
      c: -1.2,
      d: 2.0,
    },
  },

  // Procedural point settings
  points: {
    seedCount: 1 << 18, // 262144 (matches reference performance profile)
    pointSize: 1.0,
    pointScale: 0.5, // maps attractor space to clip space (reference uses 0.5)
    shape: "glow", // 'circle' | 'glow' | 'square' | 'softSquare'
    blendMode: "additive", // 'alpha' | 'additive' (WebGL)
    compositeBlendMode: "lighter", // Canvas 2D blend for compositing
    color: { r: 1, g: 1, b: 1, a: 0.12 }, // RGBA 0..1
  },

  // Visual settings - warm palette for De Jong
  visual: {
    // Lorenz-style: map speed → hue (slow=cyan, fast=orange) + hue shifting
    minHue: 30, // fast
    maxHue: 200, // slow
    maxSpeed: 0.8, // speed normalization threshold (tune per-attractor)
    saturation: 85,
    lightness: 55,
    alpha: 0.14,
    hueShiftSpeed: 15, // degrees per second
    fadeSpeed: 0.02, // 0 = no fade (infinite trails), higher = faster fade
  },

  // Zoom settings
  zoom: {
    min: 0.3,
    max: 3.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
    initialMultiplier: 0.75, // lower = zoom out more initially
  },

  // Rotation settings (drag to rotate)
  rotation: {
    speed: 0.01, // radians per pixel
    easing: 0.15,
    autoSpeed: 0.18, // radians/sec (continuous rotation)
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

class DeJongDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    this.attractor = Attractors.deJong;
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

    // Fade-clear state (first frame fills solid black)
    this._didFirstClear = false;
    this.fadeAlpha = 1; // For fade-in effect on restart

    this.renderer = new WebGLDeJongRenderer(CONFIG.points.seedCount, {
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
      params: {
        a: CONFIG.attractor.params.aBase,
        b: CONFIG.attractor.params.b,
        c: CONFIG.attractor.params.c,
        d: CONFIG.attractor.params.d,
      },
    });

    if (!this.renderer.isAvailable()) {
      console.warn("WebGL not available for DeJong demo");
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
    Tweenetik.updateAll(dt);
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;
    this.time += dt;

    // Continuous rotation (never reverses unless user drags against it)
    const TAU = Math.PI * 2;
    this.baseRotation = (this.baseRotation + CONFIG.rotation.autoSpeed * dt) % TAU;

    // Smooth user rotation offset
    this.userRotation +=
      (this.targetUserRotation - this.userRotation) * CONFIG.rotation.easing;
    super.update(dt);
  }

  clear() {
    // Fade the canvas to create persistent trails.
    // Use a solid first clear to avoid a "transparent start" look.
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
    // Custom render: fade-clear (via clear()), then composite WebGL output.
    Painter.setContext(this.ctx);
    if (this.running) this.clear();

    if (this.renderer?.isAvailable()) {
      // Animate params like the reference (a wobbles over time)
      const p = CONFIG.attractor.params;
      const omega = (2 * Math.PI) / Math.max(0.001, p.aPeriodSeconds);
      const a = p.aBase + Math.sin(this.time * omega) * p.aWobble;

      this.renderer.setParams({ a, b: p.b, c: p.c, d: p.d });
      this.renderer.setIterations(CONFIG.attractor.iterations);
      this.renderer.setZoom(this.zoom);
      this.renderer.setTransform(
        WebGLDeJongRenderer.rotationMat3(this.baseRotation + this.userRotation)
      );

      // Draw points to the offscreen WebGL canvas, then composite
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

      console.log("De Jong attractor restarted");
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
  const demo = new DeJongDemo(canvas);
  demo.start();
});

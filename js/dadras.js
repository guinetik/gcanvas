/**
 * Dadras Attractor 3D Visualization
 *
 * A 3D chaotic attractor visualization where particles follow the Dadras
 * dynamical system equations. Trails are colored by velocity (blue=slow,
 * red=fast) with additive blending for a glowing effect.
 *
 * Uses WebGL for high-performance line rendering.
 *
 * Dadras equations:
 *   dx/dt = y - ax + byz
 *   dy/dt = cy - xz + z
 *   dz/dt = dxy - ez
 *
 * Default parameters: a=3, b=2.7, c=1.7, d=2, e=9
 */

import { Game, Gesture, Screen } from "/gcanvas.es.min.js";
import { Camera3D } from "/gcanvas.es.min.js";
import { WebGLLineRenderer } from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Dadras attractor parameters
  attractor: {
    a: 3,
    b: 2.7,
    c: 1.7,
    d: 2,
    e: 9,
    dt: 0.005, // Integration time step
    scale: 50, // Scale factor for display
  },

  // Particle settings
  particles: {
    count: 500, // Increased for WebGL
    trailLength: 150, // Longer trails
    spawnRange: 5, // Initial position range around origin
  },

  // Camera settings
  camera: {
    perspective: 800,
    rotationX: 0.3,
    rotationY: 0,
    inertia: true,
    friction: 0.95,
  },

  // Visual settings
  visual: {
    minHue: 60, // Red (fast)
    maxHue: 240, // Blue (slow)
    maxSpeed: 30, // Speed normalization threshold
    saturation: 80,
    lightness: 50,
    maxAlpha: 0.9,
    hueShiftSpeed: 20, // Degrees per second (0 to disable)
  },

  // Zoom settings
  zoom: {
    min: 0.3,
    max: 3.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DADRAS PARTICLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A particle following the Dadras attractor dynamics
 */
class DadrasParticle {
  constructor() {
    const range = CONFIG.particles.spawnRange;
    // Random initial position near origin
    this.x = (Math.random() - 0.5) * range;
    this.y = (Math.random() - 0.5) * range;
    this.z = (Math.random() - 0.5) * range;
    this.trail = []; // Array of {x, y, z, speed}
    this.speed = 0;
  }

  /**
   * Update particle position using Dadras equations
   * @param {number} dt - Time step
   * @param {object} config - Attractor configuration
   */
  update(dt, config) {
    const { a, b, c, d, e, scale } = config;

    // Dadras attractor equations
    const dx = this.y - a * this.x + b * this.y * this.z;
    const dy = c * this.y - this.x * this.z + this.z;
    const dz = d * this.x * this.y - e * this.z;

    // Euler integration
    this.x += dx * dt;
    this.y += dy * dt;
    this.z += dz * dt;

    // Calculate speed for color mapping
    this.speed = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Add current position to trail (scaled for display)
    this.trail.unshift({
      x: this.x * scale,
      y: this.y * scale,
      z: this.z * scale,
      speed: this.speed,
    });

    // Trim trail to max length
    if (this.trail.length > CONFIG.particles.trailLength) {
      this.trail.pop();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dadras Attractor Demo
 * Visualizes the Dadras chaotic attractor with velocity-colored trails
 * Uses WebGL for high-performance rendering
 */
class DadrasDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Calculate initial zoom based on screen size
    const { min, max, baseScreenSize } = CONFIG.zoom;
    const initialZoom = Math.min(max, Math.max(min, Screen.minDimension() / baseScreenSize));
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // Camera with mouse control
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
    });
    this.camera.enableMouseControl(this.canvas);

    // Gesture handler for zoom (wheel + pinch)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this.targetZoom));
      },
      onPan: null, // Camera3D handles rotation
    });

    // Double-click to reset zoom
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
    });

    // Initialize particles
    this.particles = [];
    for (let i = 0; i < CONFIG.particles.count; i++) {
      this.particles.push(new DadrasParticle());
    }

    // Calculate max segments for WebGL buffer
    const maxSegments = CONFIG.particles.count * CONFIG.particles.trailLength;

    // Create WebGL line renderer
    this.lineRenderer = new WebGLLineRenderer(maxSegments, {
      width: this.width,
      height: this.height,
      blendMode: "additive",
    });

    // Pre-allocate segments array
    this.segments = [];

    // Check WebGL availability
    if (!this.lineRenderer.isAvailable()) {
      console.warn("WebGL not available, falling back to Canvas 2D");
      this.useWebGL = false;
    } else {
      this.useWebGL = true;
      console.log(`Dadras: WebGL enabled, ${maxSegments} max segments`);
    }

    // Time tracking for color animation
    this.time = 0;
  }

  /**
   * Handle window resize
   */
  onResize() {
    if (this.lineRenderer && this.lineRenderer.isAvailable()) {
      this.lineRenderer.resize(this.width, this.height);
    }

    // Recalculate default zoom for new screen size
    const { min, max, baseScreenSize } = CONFIG.zoom;
    this.defaultZoom = Math.min(max, Math.max(min, Screen.minDimension() / baseScreenSize));
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);

    // Ease zoom toward target
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;

    // Track time for color animation
    this.time += dt;

    // Update all particles
    for (const particle of this.particles) {
      particle.update(CONFIG.attractor.dt, CONFIG.attractor);
    }
  }

  /**
   * Collect all line segments for WebGL rendering
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @returns {number} Number of segments
   */
  collectSegments(cx, cy) {
    const { minHue, maxHue, maxSpeed, saturation, lightness, maxAlpha, hueShiftSpeed } =
      CONFIG.visual;

    // Time-based hue offset (cycles through 360 degrees)
    const hueOffset = (this.time * hueShiftSpeed) % 360;

    // Clear segments array (reuse to avoid allocation)
    this.segments.length = 0;

    for (const particle of this.particles) {
      if (particle.trail.length < 2) continue;

      for (let i = 1; i < particle.trail.length; i++) {
        const curr = particle.trail[i];
        const prev = particle.trail[i - 1];

        // Project 3D positions to 2D
        const p1 = this.camera.project(prev.x, prev.y, prev.z);
        const p2 = this.camera.project(curr.x, curr.y, curr.z);

        // Skip if behind camera
        if (p1.scale <= 0 || p2.scale <= 0) continue;

        // Age factor (0 = newest, 1 = oldest)
        const age = i / particle.trail.length;

        // Color by speed: blue (slow) to red (fast), with time-based shift
        const speedNorm = Math.min(curr.speed / maxSpeed, 1);
        const baseHue = maxHue - speedNorm * (maxHue - minHue);
        const hue = (baseHue + hueOffset) % 360;
        const rgb = hslToRgb(hue, saturation, lightness);

        // Alpha fades with age
        const alpha = (1 - age) * maxAlpha;

        this.segments.push({
          x1: cx + p1.x * this.zoom,
          y1: cy + p1.y * this.zoom,
          x2: cx + p2.x * this.zoom,
          y2: cy + p2.y * this.zoom,
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          a: alpha,
        });
      }
    }

    return this.segments.length;
  }

  /**
   * Canvas 2D fallback rendering
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   */
  renderCanvas2D(cx, cy) {
    const { minHue, maxHue, maxSpeed, saturation, lightness, maxAlpha, hueShiftSpeed } =
      CONFIG.visual;

    // Time-based hue offset
    const hueOffset = (this.time * hueShiftSpeed) % 360;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (const particle of this.particles) {
      if (particle.trail.length < 2) continue;

      for (let i = 1; i < particle.trail.length; i++) {
        const curr = particle.trail[i];
        const prev = particle.trail[i - 1];

        const p1 = this.camera.project(prev.x, prev.y, prev.z);
        const p2 = this.camera.project(curr.x, curr.y, curr.z);

        if (p1.scale <= 0 || p2.scale <= 0) continue;

        const age = i / particle.trail.length;
        const speedNorm = Math.min(curr.speed / maxSpeed, 1);
        const baseHue = maxHue - speedNorm * (maxHue - minHue);
        const hue = (baseHue + hueOffset) % 360;
        const alpha = (1 - age) * maxAlpha;

        ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(cx + p1.x * this.zoom, cy + p1.y * this.zoom);
        ctx.lineTo(cx + p2.x * this.zoom, cy + p2.y * this.zoom);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  render() {
    // Clear canvas and render pipeline
    super.render();

    // Guard against render before init
    if (!this.particles) return;

    // Compute center
    const cx = this.width / 2;
    const cy = this.height / 2;

    if (this.useWebGL && this.lineRenderer.isAvailable()) {
      // WebGL path: collect segments and batch render
      const segmentCount = this.collectSegments(cx, cy);

      if (segmentCount > 0) {
        this.lineRenderer.clear();
        this.lineRenderer.updateLines(this.segments);
        this.lineRenderer.render(segmentCount);
        this.lineRenderer.compositeOnto(this.ctx, 0, 0);
      }
    } else {
      // Canvas 2D fallback
      this.renderCanvas2D(cx, cy);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.gesture) {
      this.gesture.destroy();
    }
    if (this.lineRenderer) {
      this.lineRenderer.destroy();
    }
    super.destroy?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new DadrasDemo(canvas);
  demo.start();
});

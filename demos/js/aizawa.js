/**
 * Aizawa Attractor 3D Visualization
 *
 * A 3D chaotic system with intricate folding structure, named after
 * Japanese mathematician Tomohiko Aizawa. Features complex orbits
 * with a distinctive torus-like shape.
 *
 * Uses the Attractors module for pure math functions and WebGL for
 * high-performance line rendering.
 */

import { Game, Gesture, Screen, Attractors } from "../../src/index.js";
import { Camera3D } from "../../src/util/camera3d.js";
import { WebGLLineRenderer } from "../../src/webgl/webgl-line-renderer.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Attractor settings (uses Attractors.aizawa for equations)
  attractor: {
    dt: 0.008, // Integration time step
    scale: 120, // Scale factor for display (Aizawa is small)
  },

  // Particle settings
  particles: {
    count: 350,
    trailLength: 220,
    spawnRange: 0.5, // Initial position range around origin
  },

  // Center offset - adjust to match attractor's visual barycenter
  center: {
    x: 0,
    y: 0,
    z: 0.5, // Aizawa orbits around z ≈ 0.5
  },

  // Camera settings
  camera: {
    perspective: 800,
    rotationX: 0.4,
    rotationY: 0,
    inertia: true,
    friction: 0.95,
    clampX: false,
  },

  // Visual settings
  visual: {
    minHue: 280, // Magenta (fast)
    maxHue: 180, // Cyan (slow)
    maxSpeed: 8, // Speed normalization threshold
    saturation: 90,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 12, // Degrees per second
  },

  // Glitch/blink effect
  blink: {
    chance: 0.018,
    minDuration: 0.04,
    maxDuration: 0.2,
    intensityBoost: 1.5,
    saturationBoost: 1.2,
    alphaBoost: 1.3,
  },

  // Zoom settings
  zoom: {
    min: 0.3,
    max: 2.5,
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
// ATTRACTOR PARTICLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A particle following attractor dynamics
 */
class AttractorParticle {
  constructor(stepFn, spawnRange) {
    this.stepFn = stepFn;
    this.position = {
      x: (Math.random() - 0.5) * spawnRange,
      y: (Math.random() - 0.5) * spawnRange,
      z: (Math.random() - 0.5) * spawnRange,
    };
    this.trail = [];
    this.speed = 0;

    // Blink/glitch state
    this.blinkTime = 0;
    this.blinkIntensity = 0;
  }

  updateBlink(dt) {
    const { chance, minDuration, maxDuration } = CONFIG.blink;

    if (this.blinkTime > 0) {
      this.blinkTime -= dt;
      this.blinkIntensity = Math.max(
        0,
        this.blinkTime > 0
          ? Math.sin((this.blinkTime / ((minDuration + maxDuration) * 0.5)) * Math.PI)
          : 0
      );
    } else {
      if (Math.random() < chance) {
        this.blinkTime = minDuration + Math.random() * (maxDuration - minDuration);
        this.blinkIntensity = 1;
      } else {
        this.blinkIntensity = 0;
      }
    }
  }

  update(dt, scale) {
    const result = this.stepFn(this.position, dt);

    this.position = result.position;
    this.speed = result.speed;

    // Add to trail (reoriented and scaled for display)
    // Swap Y and Z so the attractor's vertical axis aligns with screen vertical
    this.trail.unshift({
      x: this.position.x * scale,
      y: this.position.z * scale,  // Z becomes screen Y (vertical)
      z: this.position.y * scale,  // Y becomes depth
      speed: this.speed,
    });

    if (this.trail.length > CONFIG.particles.trailLength) {
      this.trail.pop();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aizawa Attractor Demo
 */
class AizawaDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Get attractor info
    this.attractor = Attractors.aizawa;
    console.log(`Attractor: ${this.attractor.name}`);
    console.log(`Equations:`, this.attractor.equations);

    // Create stepper function
    this.stepFn = this.attractor.createStepper();

    // Calculate initial zoom
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
      clampX: CONFIG.camera.clampX,
    });
    this.camera.enableMouseControl(this.canvas, {
      invertX: true,   // flip left/right
      invertY: true,   // flip up/down
    });

    // Gesture handler for zoom
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
      },
      onPan: null,
    });

    // Double-click to reset
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
    });

    // Log camera params on mouse release (for finding good starting angle)
    this.canvas.addEventListener("mouseup", () => {
      console.log(`Camera: rotationX: ${this.camera.rotationX.toFixed(3)}, rotationY: ${this.camera.rotationY.toFixed(3)}`);

      // Calculate and log barycenter to help find the right center offset
      let sumX = 0, sumY = 0, sumZ = 0, count = 0;
      for (const p of this.particles) {
        sumX += p.position.x;
        sumY += p.position.y;
        sumZ += p.position.z;
        count++;
      }
      console.log(`Barycenter: x: ${(sumX/count).toFixed(3)}, y: ${(sumY/count).toFixed(3)}, z: ${(sumZ/count).toFixed(3)}`);
    });

    // Initialize particles
    this.particles = [];
    for (let i = 0; i < CONFIG.particles.count; i++) {
      this.particles.push(
        new AttractorParticle(this.stepFn, CONFIG.particles.spawnRange)
      );
    }

    // WebGL line renderer
    const maxSegments = CONFIG.particles.count * CONFIG.particles.trailLength;
    this.lineRenderer = new WebGLLineRenderer(maxSegments, {
      width: this.width,
      height: this.height,
      blendMode: "additive",
    });

    this.segments = [];

    if (!this.lineRenderer.isAvailable()) {
      console.warn("WebGL not available, falling back to Canvas 2D");
      this.useWebGL = false;
    } else {
      this.useWebGL = true;
      console.log(`WebGL enabled, ${maxSegments} max segments`);
    }

    this.time = 0;
  }

  onResize() {
    if (this.lineRenderer?.isAvailable()) {
      this.lineRenderer.resize(this.width, this.height);
    }
    const { min, max, baseScreenSize } = CONFIG.zoom;
    this.defaultZoom = Math.min(max, Math.max(min, Screen.minDimension() / baseScreenSize));
  }

  update(dt) {
    super.update(dt);
    this.camera.update(dt);

    // Normalize rotation to prevent unbounded values
    const TAU = Math.PI * 2;
    this.camera.rotationY = ((this.camera.rotationY % TAU) + TAU) % TAU;

    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;
    this.time += dt;

    for (const particle of this.particles) {
      particle.update(CONFIG.attractor.dt, CONFIG.attractor.scale);
      particle.updateBlink(dt);
    }
  }

  collectSegments(cx, cy) {
    const { minHue, maxHue, maxSpeed, saturation, lightness, maxAlpha, hueShiftSpeed } =
      CONFIG.visual;
    const { intensityBoost, saturationBoost, alphaBoost } = CONFIG.blink;
    const hueOffset = (this.time * hueShiftSpeed) % 360;

    this.segments.length = 0;

    for (const particle of this.particles) {
      if (particle.trail.length < 2) continue;

      const blink = particle.blinkIntensity;

      for (let i = 1; i < particle.trail.length; i++) {
        const curr = particle.trail[i];
        const prev = particle.trail[i - 1];

        const p1 = this.camera.project(prev.x, prev.y, prev.z);
        const p2 = this.camera.project(curr.x, curr.y, curr.z);

        if (p1.scale <= 0 || p2.scale <= 0) continue;

        const age = i / particle.trail.length;
        const speedNorm = Math.min(curr.speed / maxSpeed, 1);
        const baseHue = maxHue + speedNorm * (minHue - maxHue);
        const hue = (baseHue + hueOffset + 360) % 360;

        const sat = Math.min(100, saturation * (1 + blink * (saturationBoost - 1)));
        const lit = Math.min(100, lightness * (1 + blink * (intensityBoost - 1)));
        const rgb = hslToRgb(hue, sat, lit);
        const alpha = Math.min(1, (1 - age) * maxAlpha * (1 + blink * (alphaBoost - 1)));

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

  renderCanvas2D(cx, cy) {
    const { minHue, maxHue, maxSpeed, saturation, lightness, maxAlpha, hueShiftSpeed } =
      CONFIG.visual;
    const { intensityBoost, saturationBoost, alphaBoost } = CONFIG.blink;
    const hueOffset = (this.time * hueShiftSpeed) % 360;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    for (const particle of this.particles) {
      if (particle.trail.length < 2) continue;

      const blink = particle.blinkIntensity;

      for (let i = 1; i < particle.trail.length; i++) {
        const curr = particle.trail[i];
        const prev = particle.trail[i - 1];

        const p1 = this.camera.project(prev.x, prev.y, prev.z);
        const p2 = this.camera.project(curr.x, curr.y, curr.z);

        if (p1.scale <= 0 || p2.scale <= 0) continue;

        const age = i / particle.trail.length;
        const speedNorm = Math.min(curr.speed / maxSpeed, 1);
        const baseHue = maxHue + speedNorm * (minHue - maxHue);
        const hue = (baseHue + hueOffset + 360) % 360;

        const sat = Math.min(100, saturation * (1 + blink * (saturationBoost - 1)));
        const lit = Math.min(100, lightness * (1 + blink * (intensityBoost - 1)));
        const alpha = Math.min(1, (1 - age) * maxAlpha * (1 + blink * (alphaBoost - 1)));

        ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${alpha})`;
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
    super.render();
    if (!this.particles) return;

    const cx = this.width / 2;
    const cy = this.height / 2;

    if (this.useWebGL && this.lineRenderer.isAvailable()) {
      const segmentCount = this.collectSegments(cx, cy);
      if (segmentCount > 0) {
        this.lineRenderer.clear();
        this.lineRenderer.updateLines(this.segments);
        this.lineRenderer.render(segmentCount);
        this.lineRenderer.compositeOnto(this.ctx, 0, 0);
      }
    } else {
      this.renderCanvas2D(cx, cy);
    }
  }

  destroy() {
    this.gesture?.destroy();
    this.lineRenderer?.destroy();
    super.destroy?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new AizawaDemo(canvas);
  demo.start();
});

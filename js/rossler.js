/**
 * Rössler Attractor 3D Visualization
 *
 * Discovered by Otto Rössler (1976). One of the simplest chaotic attractors,
 * featuring a single spiral that folds back on itself - simpler than Lorenz
 * but equally chaotic.
 *
 * Uses the Attractors module for pure math functions and WebGL for
 * high-performance line rendering.
 */

import { Game, Gesture, Screen, Attractors } from "/gcanvas.es.min.js";
import { Camera3D } from "/gcanvas.es.min.js";
import { WebGLLineRenderer } from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Attractor settings (uses Attractors.rossler for equations)
  attractor: {
    dt: 0.05, // Integration time step
    scale: 15, // Scale factor for display
  },

  // Particle settings
  particles: {
    count: 400,
    trailLength: 250,
    spawnRange: 4, // Moderate range near origin
  },

  // Center offset - Rossler spirals in x-y, spikes in z
  // No axis swap: x→horizontal, y→vertical, z→depth
  center: {
    x: 0,
    y: 5,
    z: 5, // Center the z-spike in depth
  },

  // Camera settings
  camera: {
    perspective: 500,
    rotationX: 0.3,   // Slight tilt
    rotationY: 0,
    inertia: true,
    friction: 0.95,
    clampX: false,
  },

  // Visual settings - warm orange/yellow palette
  visual: {
    minHue: 40, // Yellow-orange (fast)
    maxHue: 280, // Purple (slow)
    maxSpeed: 20,
    saturation: 85,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 10,
  },

  // Glitch/blink effect
  blink: {
    chance: 0.015,
    minDuration: 0.05,
    maxDuration: 0.2,
    intensityBoost: 1.4,
    saturationBoost: 1.15,
    alphaBoost: 1.25,
  },

  // Zoom settings
  zoom: {
    min: 0.2,
    max: 2.5,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

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

class AttractorParticle {
  constructor(attractor, spawnRange, warmupSteps = 0) {
    // Each particle gets slightly different parameters to prevent sync
    const variation = 0.02; // 2% variation
    this.stepFn = attractor.createStepper({
      a: 0.2 * (1 + (Math.random() - 0.5) * variation),
      b: 0.2 * (1 + (Math.random() - 0.5) * variation),
      c: 5.7 * (1 + (Math.random() - 0.5) * variation),
    });

    this.position = {
      x: (Math.random() - 0.5) * spawnRange,
      y: (Math.random() - 0.5) * spawnRange,
      z: (Math.random() - 0.5) * spawnRange,
    };
    this.trail = [];
    this.speed = 0;
    this.blinkTime = 0;
    this.blinkIntensity = 0;

    // Warmup: run particle for random steps to spread them across the attractor cycle
    const steps = Math.floor(Math.random() * warmupSteps);
    for (let i = 0; i < steps; i++) {
      const result = this.stepFn(this.position, CONFIG.attractor.dt);
      this.position = result.position;
    }
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

  update(dt, scale, axisConfig, spawnRange) {
    const result = this.stepFn(this.position, dt);
    this.position = result.position;
    this.speed = result.speed;

    // Small chance to respawn at random position (keeps transient "thickness")
    if (Math.random() < 0.003) {
      this.position = {
        x: (Math.random() - 0.5) * spawnRange,
        y: (Math.random() - 0.5) * spawnRange,
        z: (Math.random() - 0.5) * spawnRange,
      };
      this.trail = [];
    }

    const px = this.position.x - CONFIG.center.x;
    const py = this.position.y - CONFIG.center.y;
    const pz = this.position.z - CONFIG.center.z;

    // Use configurable axis mapping
    const coords = { x: px, y: py, z: pz };
    this.trail.unshift({
      x: coords[axisConfig.x] * scale * axisConfig.sx,
      y: coords[axisConfig.y] * scale * axisConfig.sy,
      z: coords[axisConfig.z] * scale * axisConfig.sz,
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

class RosslerDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    this.attractor = Attractors.rossler;
    console.log(`Attractor: ${this.attractor.name}`);
    console.log(`Equations:`, this.attractor.equations);

    this.stepFn = this.attractor.createStepper();

    const { min, max, baseScreenSize } = CONFIG.zoom;
    const initialZoom = Math.min(max, Math.max(min, Screen.minDimension() / baseScreenSize));
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      clampX: CONFIG.camera.clampX,
    });
    this.camera.enableMouseControl(this.canvas);

    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
      },
      onPan: null,
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
    });

    // Log camera params and barycenter on mouse release
    this.canvas.addEventListener("mouseup", () => {
      console.log(`Camera: rotationX: ${this.camera.rotationX.toFixed(3)}, rotationY: ${this.camera.rotationY.toFixed(3)}`);
      let sumX = 0, sumY = 0, sumZ = 0, count = 0;
      for (const p of this.particles) {
        sumX += p.position.x;
        sumY += p.position.y;
        sumZ += p.position.z;
        count++;
      }
      console.log(`Barycenter: x: ${(sumX/count).toFixed(3)}, y: ${(sumY/count).toFixed(3)}, z: ${(sumZ/count).toFixed(3)}`);
    });

    this.particles = [];
    const warmupSteps = 2000; // Spread particles across attractor cycle
    for (let i = 0; i < CONFIG.particles.count; i++) {
      this.particles.push(
        new AttractorParticle(this.attractor, CONFIG.particles.spawnRange, warmupSteps)
      );
    }

    // All axis configurations to try (with sign variations)
    this.axisConfigs = [
      { x: 'x', y: 'y', z: 'z', sx: 1, sy: 1, sz: 1, name: 'XYZ +++' },
      { x: 'x', y: 'y', z: 'z', sx: 1, sy: -1, sz: 1, name: 'XYZ +-+' },
      { x: 'x', y: 'z', z: 'y', sx: 1, sy: 1, sz: 1, name: 'XZY +++' },
      { x: 'x', y: 'z', z: 'y', sx: 1, sy: -1, sz: 1, name: 'XZY +-+' },
      { x: 'y', y: 'x', z: 'z', sx: 1, sy: 1, sz: 1, name: 'YXZ +++' },
      { x: 'y', y: 'x', z: 'z', sx: 1, sy: -1, sz: 1, name: 'YXZ +-+' },
      { x: 'y', y: 'z', z: 'x', sx: 1, sy: 1, sz: 1, name: 'YZX +++' },
      { x: 'y', y: 'z', z: 'x', sx: 1, sy: -1, sz: 1, name: 'YZX +-+' },
      { x: 'z', y: 'x', z: 'y', sx: 1, sy: 1, sz: 1, name: 'ZXY +++' },
      { x: 'z', y: 'x', z: 'y', sx: 1, sy: -1, sz: 1, name: 'ZXY +-+' },
      { x: 'z', y: 'y', z: 'x', sx: 1, sy: 1, sz: 1, name: 'ZYX +++' },
      { x: 'z', y: 'y', z: 'x', sx: 1, sy: -1, sz: 1, name: 'ZYX +-+' },
    ];
    this.axisIndex = 3; // XZY +-+ (config 3)
    this.axisConfig = this.axisConfigs[this.axisIndex];

    // Click to cycle through axis configurations (disabled - uncomment to test)
    /*
    this.canvas.addEventListener("click", () => {
      this.axisIndex = (this.axisIndex + 1) % this.axisConfigs.length;
      this.axisConfig = this.axisConfigs[this.axisIndex];
      // Clear trails when switching
      for (const p of this.particles) {
        p.trail = [];
      }
      console.log(`=== Config ${this.axisIndex + 1}/${this.axisConfigs.length}: ${this.axisConfig.name} ===`);
      console.log(`  trailX = pos.${this.axisConfig.x} * ${this.axisConfig.sx}`);
      console.log(`  trailY = pos.${this.axisConfig.y} * ${this.axisConfig.sy}`);
      console.log(`  trailZ = pos.${this.axisConfig.z} * ${this.axisConfig.sz}`);
      console.log(`  Camera: rotX=${this.camera.rotationX.toFixed(3)}, rotY=${this.camera.rotationY.toFixed(3)}`);
    });
    */

    console.log(`Axis config: ${this.axisConfig.name}`);

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
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;
    this.time += dt;

    for (const particle of this.particles) {
      particle.update(CONFIG.attractor.dt, CONFIG.attractor.scale, this.axisConfig, CONFIG.particles.spawnRange);
      particle.updateBlink(dt);
    }

    // Debug: log position ranges every 2 seconds
    this.debugTimer = (this.debugTimer || 0) + dt;
    if (this.debugTimer > 2) {
      this.debugTimer = 0;
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (const p of this.particles) {
        minX = Math.min(minX, p.position.x);
        maxX = Math.max(maxX, p.position.x);
        minY = Math.min(minY, p.position.y);
        maxY = Math.max(maxY, p.position.y);
        minZ = Math.min(minZ, p.position.z);
        maxZ = Math.max(maxZ, p.position.z);
      }
      console.log(`Position ranges - X: [${minX.toFixed(1)}, ${maxX.toFixed(1)}], Y: [${minY.toFixed(1)}, ${maxY.toFixed(1)}], Z: [${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`);
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
        const baseHue = maxHue - speedNorm * (maxHue - minHue);
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
        const baseHue = maxHue - speedNorm * (maxHue - minHue);
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
  const demo = new RosslerDemo(canvas);
  demo.start();
});

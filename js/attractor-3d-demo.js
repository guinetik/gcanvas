/**
 * Attractor3DDemo — Shared base class for 3D strange attractor visualizations.
 *
 * Encapsulates all common infrastructure: Camera3D, zoom/gesture handling,
 * WebGL line rendering with Canvas 2D fallback, particle trail management,
 * blink effects, restart with fade-in, and keyboard controls.
 *
 * Individual attractor demos only need to provide a CONFIG object with
 * attractor-specific parameters (dt, scale, camera angles, palette, etc.).
 *
 * @example
 * // lorenz.js — a complete attractor demo in ~30 lines
 * import { Attractor3DDemo } from "./attractor-3d-demo.js";
 *
 * Attractor3DDemo.run("lorenz", {
 *   attractor: { dt: 0.005, scale: 12 },
 *   particles: { count: 400, trailLength: 250, spawnRange: 2 },
 *   center:    { x: 5, y: 0, z: 27 },
 *   camera:    { rotationX: -2, rotationY: -3 },
 *   visual:    { minHue: 30, maxHue: 200, maxSpeed: 50 },
 *   restart:   { delay: 1 },
 *   spawnOffset: { z: 27 },
 *   normalizeRotation: true,
 * });
 *
 * @module Attractor3DDemo
 */

import {
  Game,
  Gesture,
  Screen,
  Attractors,
  Keys,
  Tweenetik,
  Easing,
} from "/gcanvas.es.min.js";
import { Camera3D } from "/gcanvas.es.min.js";
import { WebGLAttractorPipeline } from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sensible defaults for all config sections. Per-attractor configs are
 * deep-merged on top of these so demos only need to specify what differs.
 * @type {Object}
 */
const DEFAULTS = {
  attractor: {
    dt: 0.01,
    scale: 50,
  },

  particles: {
    count: 400,
    trailLength: 250,
    spawnRange: 2,
  },

  center: { x: 0, y: 0, z: 0 },

  camera: {
    perspective: 800,
    rotationX: 0.3,
    rotationY: 0,
    inertia: true,
    friction: 0.95,
    clampX: false,
  },

  visual: {
    minHue: 30,
    maxHue: 200,
    maxSpeed: 30,
    saturation: 85,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 15,
  },

  blink: {
    chance: 0.05,
    minDuration: 0.05,
    maxDuration: 0.25,
    intensityBoost: 1.8,
    saturationBoost: 1.5,
    alphaBoost: 1.5,
  },

  energyFlow: {
    intensity: 0.4,
    speed: 1.0,
    sparkThreshold: 0.98,
  },

  background: {
    fogDensity: 0.15,
    noiseScale: 3.0,
    animSpeed: 0.08,
    baseColor: null, // auto-derived from visual hue if null
  },

  bloom: {
    enabled: true,
    threshold: 0.25,
    strength: 0.35,
    radius: 0.6,
    passes: 1,
  },

  glow: {
    enabled: true,
    radius: 50,
    intensity: 0.5,
  },

  depthFog: {
    enabled: true,
    density: 0.5,
    energyFalloff: 0.7,
  },

  iridescence: {
    enabled: true,
    intensity: 0.3,
    speed: 0.5,
    scale: 2.0,
  },

  chromaticAberration: {
    enabled: false,
    strength: 0.002,
    falloff: 2.0,
  },

  colorGrading: {
    enabled: false,
    exposure: 1.4,
    vignetteStrength: 0.15,
    vignetteRadius: 0.85,
    grainIntensity: 0.02,
    warmth: 0.15,
  },

  zoom: {
    min: 0.3,
    max: 2.5,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },

  restart: {
    delay: 3,
    fadeDuration: 1.5,
  },

  // ── Orientation & behavior options ──────────────────────────────────────

  /**
   * Axis mapping for the trail coordinate system.
   *   null        — standard XYZ
   *   'yz-swap'   — swap Y and Z (Aizawa, Halvorsen)
   *   { x, y, z, sx, sy, sz } — fully custom mapping (Rössler)
   */
  axisMapping: null,

  /** Mouse control inversion, e.g. { invertX: true, invertY: true } */
  mouseControl: null,

  /** Position offset added to spawn positions, e.g. { z: 27 } for Lorenz */
  spawnOffset: null,

  /** Per-frame chance for a particle to respawn at a random position (0 = off) */
  respawnChance: 0.005,

  /** Number of random warmup integration steps per particle at spawn (0 = off) */
  warmupSteps: 0,

  /**
   * Per-particle parameter variation (creates unique steppers).
   * e.g. { params: { a: 0.2, b: 0.2, c: 5.7 }, range: 0.02 }
   */
  paramVariation: null,

  /** Max distance from center before a particle is culled and respawned (0 = no limit) */
  maxDistance: 0,

  /** Screen-space offset as fraction of canvas size, e.g. { x: 0, y: 0.1 } shifts down 10% */
  screenOffset: { x: 0, y: 0 },

  /** Normalize camera rotationY to [0, 2π) each frame */
  normalizeRotation: false,

  /**
   * Auto-rotation: continuously rotate the camera around the attractor.
   * { enabled: false, speed: 0.1, axis: 'y' }
   *   enabled - whether auto-rotation is active
   *   speed   - radians per second
   *   axis    - 'x' (pitch) or 'y' (yaw/orbit)
   */
  autoRotation: {
    enabled: false,
    speed: 0.1,
    axis: "y",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert HSL colour values to an RGB object.
 * @param {number} h - Hue in degrees [0, 360)
 * @param {number} s - Saturation in percent [0, 100]
 * @param {number} l - Lightness in percent [0, 100]
 * @returns {{ r: number, g: number, b: number }}
 */
function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(255 * f(0)),
    g: Math.round(255 * f(8)),
    b: Math.round(255 * f(4)),
  };
}

/**
 * Deep-merge two plain objects. Source values override target values;
 * nested objects are merged recursively. Arrays are replaced, not merged.
 * @param {Object} target
 * @param {Object} source
 * @returns {Object} A new merged object (neither input is mutated).
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];
    if (
      srcVal &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      result[key] = srcVal;
    }
  }
  return result;
}

/**
 * Resolve an axis-mapping shorthand into a full mapping object.
 * @param {null|string|Object} mapping
 * @returns {{ x: string, y: string, z: string, sx: number, sy: number, sz: number }}
 */
function resolveAxisMapping(mapping) {
  if (!mapping) return { x: "x", y: "y", z: "z", sx: 1, sy: 1, sz: 1 };
  if (mapping === "yz-swap")
    return { x: "x", y: "z", z: "y", sx: 1, sy: 1, sz: 1 };
  return mapping; // full object
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRACTOR PARTICLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A particle that follows attractor dynamics and maintains a coloured trail.
 *
 * All per-attractor variation (axis mapping, centre offset, spawn offset,
 * respawn, warmup) is handled via the options object passed at construction.
 */
class AttractorParticle {
  /**
   * @param {Object}   opts
   * @param {Function} opts.stepFn       - Attractor step function (position, dt) → { position, speed }
   * @param {number}   opts.spawnRange   - Random range for initial position
   * @param {Object}   [opts.spawnOffset]  - { x, y, z } added to initial spawn position
   * @param {Object}   opts.center       - { x, y, z } centre offset subtracted before trail mapping
   * @param {Object}   opts.axisMapping  - Resolved axis mapping object
   * @param {number}   opts.trailLength  - Maximum trail length
   * @param {Object}   opts.blink        - Blink config (chance, durations, boosts)
   * @param {number}   opts.respawnChance - Per-frame probability of random respawn
   * @param {number}   opts.warmupSteps  - Max random warmup integration steps
   * @param {number}   opts.dt           - Integration timestep (used for warmup)
   * @param {number}   opts.maxDistance  - Max distance from center before respawn (0 = no limit)
   */
  constructor({
    stepFn,
    spawnRange,
    spawnOffset,
    center,
    axisMapping,
    trailLength,
    blink,
    respawnChance,
    warmupSteps,
    maxDistance,
    dt,
  }) {
    this.stepFn = stepFn;
    this.spawnRange = spawnRange;
    this.spawnOffset = spawnOffset;
    this.center = center;
    this.maxDistance = maxDistance;
    this.axisMapping = axisMapping;
    this.trailLength = trailLength;
    this.blink = blink;
    this.respawnChance = respawnChance;
    this.warmupSteps = warmupSteps;
    this.dt = dt;

    this.trail = [];
    this.speed = 0;

    // Blink / glitch state
    this.blinkTime = 0;
    this.blinkIntensity = 0;

    // Place particle and run warmup
    this.respawn();
  }

  /**
   * Reset particle to a random position near the spawn origin,
   * then run warmup steps so it settles onto the attractor
   * (distributing across different wells/lobes).
   */
  respawn() {
    this.position = {
      x: (Math.random() - 0.5) * this.spawnRange + (this.spawnOffset?.x || 0),
      y: (Math.random() - 0.5) * this.spawnRange + (this.spawnOffset?.y || 0),
      z: (Math.random() - 0.5) * this.spawnRange + (this.spawnOffset?.z || 0),
    };
    this.trail = [];

    if (this.warmupSteps > 0) {
      const steps = Math.floor(Math.random() * this.warmupSteps);
      for (let i = 0; i < steps; i++) {
        const result = this.stepFn(this.position, this.dt);
        this.position = result.position;
      }
    }
  }

  /**
   * Advance the blink / glitch timer.
   * @param {number} dt - Frame delta time in seconds
   */
  updateBlink(dt) {
    const { chance, minDuration, maxDuration } = this.blink;

    if (this.blinkTime > 0) {
      this.blinkTime -= dt;
      this.blinkIntensity = Math.max(
        0,
        this.blinkTime > 0
          ? Math.sin(
              (this.blinkTime / ((minDuration + maxDuration) * 0.5)) * Math.PI
            )
          : 0
      );
    } else {
      if (Math.random() < chance) {
        this.blinkTime =
          minDuration + Math.random() * (maxDuration - minDuration);
        this.blinkIntensity = 1;
      } else {
        this.blinkIntensity = 0;
      }
    }
  }

  /**
   * Integrate one attractor step and append to the trail.
   * @param {number} dt    - Integration timestep
   * @param {number} scale - Display scale factor
   */
  update(dt, scale) {
    const result = this.stepFn(this.position, dt);
    this.position = result.position;
    this.speed = result.speed;

    // Cull particles that escape too far from center
    if (this.maxDistance > 0) {
      const dx = this.position.x - this.center.x;
      const dy = this.position.y - this.center.y;
      const dz = this.position.z - this.center.z;
      if (dx * dx + dy * dy + dz * dz > this.maxDistance * this.maxDistance) {
        this.respawn();
        return;
      }
    }

    // Optional random respawn to maintain transient visual thickness
    if (this.respawnChance > 0 && Math.random() < this.respawnChance) {
      this.respawn();
    }

    // Centre-subtract, then apply axis mapping
    const cx = this.position.x - this.center.x;
    const cy = this.position.y - this.center.y;
    const cz = this.position.z - this.center.z;

    const coords = { x: cx, y: cy, z: cz };
    const am = this.axisMapping;
    this.trail.unshift({
      x: coords[am.x] * scale * am.sx,
      y: coords[am.y] * scale * am.sy,
      z: coords[am.z] * scale * am.sz,
      speed: this.speed,
    });

    if (this.trail.length > this.trailLength) {
      this.trail.pop();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRACTOR 3D DEMO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base Game subclass for 3D strange attractor visualizations.
 *
 * Handles Camera3D, zoom gestures, WebGL / Canvas 2D rendering,
 * particle management, blink effects, and restart with fade-in.
 * Subclasses (or the static `run` helper) only provide a config object.
 */
class Attractor3DDemo extends Game {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string}           attractorName - Key in the Attractors module (e.g. "lorenz")
   * @param {Object}           [userConfig={}] - Per-attractor config overrides
   */
  constructor(canvas, attractorName, userConfig = {}) {
    super(canvas);
    this.attractorName = attractorName;
    this.config = deepMerge(DEFAULTS, userConfig);
    this.backgroundColor = "#000";
    this.enableFluidSize(); // triggers onResize — config must be set first
  }

  /** @override */
  init() {
    super.init();
    const cfg = this.config;

    // ── Attractor ────────────────────────────────────────────────────────
    this.attractor = Attractors[this.attractorName];
    if (!this.attractor) {
      throw new Error(
        `Unknown attractor "${this.attractorName}". ` +
          `Available: ${Object.keys(Attractors).join(", ")}`
      );
    }
    console.log(`Attractor: ${this.attractor.name}`);
    console.log("Equations:", this.attractor.equations);

    // Shared stepper (used when paramVariation is off)
    this.stepFn = this.attractor.createStepper();
    this.resolvedAxisMapping = resolveAxisMapping(cfg.axisMapping);

    // ── Zoom ─────────────────────────────────────────────────────────────
    const { min, max, baseScreenSize } = cfg.zoom;
    const initialZoom = Math.min(
      max,
      Math.max(min, Screen.minDimension() / baseScreenSize)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // ── Camera ───────────────────────────────────────────────────────────
    this.camera = new Camera3D({
      perspective: cfg.camera.perspective,
      rotationX: cfg.camera.rotationX,
      rotationY: cfg.camera.rotationY,
      inertia: cfg.camera.inertia,
      friction: cfg.camera.friction,
      clampX: cfg.camera.clampX,
    });
    this.camera.enableMouseControl(this.canvas, cfg.mouseControl || undefined);

    // ── Gestures ─────────────────────────────────────────────────────────
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * cfg.zoom.speed;
      },
      onPan: null,
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
    });

    // ── Keyboard ─────────────────────────────────────────────────────────
    Keys.init(this);
    this.events.on(Keys.R, () => this.restart());

    // ── Dev helpers (camera / barycenter logging) ────────────────────────
    this.canvas.addEventListener("mouseup", () => {
      console.log(
        `Camera: rotationX: ${this.camera.rotationX.toFixed(3)}, ` +
          `rotationY: ${this.camera.rotationY.toFixed(3)}`
      );
      let sumX = 0,
        sumY = 0,
        sumZ = 0,
        count = 0;
      for (const p of this.particles) {
        sumX += p.position.x;
        sumY += p.position.y;
        sumZ += p.position.z;
        count++;
      }
      if (count > 0) {
        console.log(
          `Barycenter: x: ${(sumX / count).toFixed(3)}, ` +
            `y: ${(sumY / count).toFixed(3)}, ` +
            `z: ${(sumZ / count).toFixed(3)}`
        );
      }
    });

    // ── Particles ────────────────────────────────────────────────────────
    this.particles = [];
    for (let i = 0; i < cfg.particles.count; i++) {
      this.particles.push(this.createParticle());
    }

    // ── WebGL attractor pipeline ─────────────────────────────────────────
    const maxSegments = cfg.maxSegments || cfg.particles.count * cfg.particles.trailLength;
    this.attractorPipeline = new WebGLAttractorPipeline(
      this.width,
      this.height,
      maxSegments,
      {
        bloom: cfg.bloom,
        background: {
          ...cfg.background,
          baseColor: cfg.background.baseColor || this._computeBackgroundColor(),
        },
        visual: cfg.visual,
        blink: cfg.blink,
        energyFlow: cfg.energyFlow,
        depthFog: cfg.depthFog,
        iridescence: cfg.iridescence,
        chromaticAberration: cfg.chromaticAberration,
        colorGrading: cfg.colorGrading,
        glow: cfg.glow,
      }
    );

    this.segments = [];
    this.fadeAlpha = 1;

    const pipelineOk = this.attractorPipeline.init();
    if (!pipelineOk) {
      console.warn("WebGL not available, falling back to Canvas 2D");
      this.useWebGL = false;
    } else {
      this.useWebGL = true;
      console.log(`WebGL attractor pipeline enabled, ${maxSegments} max segments`);
    }

    this.time = 0;
  }

  /**
   * Create a single attractor particle. Handles per-particle parameter
   * variation (e.g. Rössler) when `paramVariation` is configured.
   * @returns {AttractorParticle}
   */
  createParticle() {
    const cfg = this.config;
    let stepFn = this.stepFn;

    // Per-particle parameter variation creates a unique stepper
    if (cfg.paramVariation) {
      const { params, range } = cfg.paramVariation;
      const variedParams = {};
      for (const [key, val] of Object.entries(params)) {
        variedParams[key] = val * (1 + (Math.random() - 0.5) * range);
      }
      stepFn = this.attractor.createStepper(variedParams);
    }

    return new AttractorParticle({
      stepFn,
      spawnRange: cfg.particles.spawnRange,
      spawnOffset: cfg.spawnOffset,
      center: cfg.center,
      axisMapping: this.resolvedAxisMapping,
      trailLength: cfg.particles.trailLength,
      blink: cfg.blink,
      respawnChance: cfg.respawnChance,
      warmupSteps: cfg.warmupSteps,
      maxDistance: cfg.maxDistance,
      dt: cfg.attractor.dt,
    });
  }

  /** @override */
  onResize() {
    if (!this.config) return; // guard: enableFluidSize fires before init
    if (this.attractorPipeline?.isAvailable()) {
      this.attractorPipeline.resize(this.width, this.height);
    }
    const { min, max, baseScreenSize } = this.config.zoom;
    this.defaultZoom = Math.min(
      max,
      Math.max(min, Screen.minDimension() / baseScreenSize)
    );
  }

  /** @override */
  update(dt) {
    super.update(dt);
    const cfg = this.config;

    Tweenetik.updateAll(dt);
    this.camera.update(dt);

    // Auto-rotation: continuously orbit around the attractor
    if (cfg.autoRotation.enabled) {
      const { speed, axis } = cfg.autoRotation;
      if (axis === "y") {
        this.camera.rotationY += speed * dt;
      } else if (axis === "x") {
        this.camera.rotationX += speed * dt;
      } else if (axis === "z") {
        this.camera.rotationZ += speed * dt;
      } else if (axis === "screen") {
        this.camera.screenRotation += speed * dt;
      }
    }

    // Optional rotation normalization to prevent unbounded values
    if (cfg.normalizeRotation) {
      const TAU = Math.PI * 2;
      this.camera.rotationX =
        ((this.camera.rotationX % TAU) + TAU) % TAU;
      this.camera.rotationY =
        ((this.camera.rotationY % TAU) + TAU) % TAU;
      this.camera.rotationZ =
        ((this.camera.rotationZ % TAU) + TAU) % TAU;
      this.camera.screenRotation =
        ((this.camera.screenRotation % TAU) + TAU) % TAU;
    }

    this.zoom += (this.targetZoom - this.zoom) * cfg.zoom.easing;
    this.time += dt;

    for (const particle of this.particles) {
      particle.update(cfg.attractor.dt, cfg.attractor.scale);
      particle.updateBlink(dt);
    }
  }

  /**
   * Project all particle trail segments into screen space for WebGL rendering.
   * Color math is handled on the GPU — we only pass normalized metadata.
   * @param {number} cx - Screen centre X
   * @param {number} cy - Screen centre Y
   * @returns {number} Number of segments collected
   */
  collectSegments(cx, cy) {
    const { maxSpeed } = this.config.visual;
    const perspective = this.config.camera.perspective;

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

        // Normalize depth to [0,1] using perspective distance
        const depth1 = Math.max(0, Math.min(1, p1.z / perspective));
        const depth2 = Math.max(0, Math.min(1, p2.z / perspective));

        this.segments.push({
          x1: cx + p1.x * this.zoom,
          y1: cy + p1.y * this.zoom,
          x2: cx + p2.x * this.zoom,
          y2: cy + p2.y * this.zoom,
          speedNorm: Math.min(curr.speed / maxSpeed, 1),
          age: i / particle.trail.length,
          blink,
          segIdx: i / particle.trail.length,
          depth1,
          depth2,
        });
      }
    }

    return this.segments.length;
  }

  /**
   * Canvas 2D fallback renderer when WebGL is unavailable.
   * @param {number} cx - Screen centre X
   * @param {number} cy - Screen centre Y
   */
  renderCanvas2D(cx, cy) {
    const {
      minHue,
      maxHue,
      maxSpeed,
      saturation,
      lightness,
      maxAlpha,
      hueShiftSpeed,
    } = this.config.visual;
    const { intensityBoost, saturationBoost, alphaBoost } = this.config.blink;
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
        const hue = ((baseHue + hueOffset) % 360 + 360) % 360;

        const sat = Math.min(
          100,
          saturation * (1 + blink * (saturationBoost - 1))
        );
        const lit = Math.min(
          100,
          lightness * (1 + blink * (intensityBoost - 1))
        );
        const alpha = Math.min(
          1,
          (1 - age) * maxAlpha * (1 + blink * (alphaBoost - 1))
        );

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

  /** @override */
  render() {
    super.render();
    this._renderAttractor();
  }

  /**
   * Render the attractor trails (WebGL or Canvas 2D fallback).
   * Extracted so subclasses can control z-order (e.g. render UI on top).
   * @protected
   */
  _renderAttractor() {
    if (!this.particles) return;

    const { screenOffset } = this.config;
    const cx = this.width / 2 + screenOffset.x * this.width;
    const cy = this.height / 2 + screenOffset.y * this.height;

    // Fade alpha for restart transition
    const prevAlpha = this.ctx.globalAlpha;
    this.ctx.globalAlpha = this.fadeAlpha;

    if (this.useWebGL && this.attractorPipeline.isAvailable()) {
      const segmentCount = this.collectSegments(cx, cy);
      if (segmentCount > 0) {
        const hueOffset = (this.time * this.config.visual.hueShiftSpeed) % 360;
        this.attractorPipeline.beginFrame(this.time);
        this.attractorPipeline.updateLines(this.segments);
        this.attractorPipeline.renderLines(segmentCount, this.time, hueOffset);
        this.attractorPipeline.endFrame();
        this.attractorPipeline.compositeOnto(this.ctx, 0, 0);
      }
    } else {
      this.renderCanvas2D(cx, cy);
    }

    this.ctx.globalAlpha = prevAlpha;
  }

  // ── Runtime update API (used by CaosPlayground, safe to ignore) ──────

  /**
   * Update attractor equation parameters at runtime.
   * Recreates the stepper function and pushes to all particles.
   * Handles paramVariation if configured.
   * @param {Object} params - New attractor parameters (e.g. { sigma: 10, rho: 28 })
   */
  updateAttractorParams(params) {
    this.stepFn = this.attractor.createStepper(params);
    if (this.config.paramVariation) {
      const { range } = this.config.paramVariation;
      for (const p of this.particles) {
        const varied = {};
        for (const [k, v] of Object.entries(params)) {
          varied[k] = v * (1 + (Math.random() - 0.5) * range);
        }
        p.stepFn = this.attractor.createStepper(varied);
      }
    } else {
      for (const p of this.particles) p.stepFn = this.stepFn;
    }
  }

  /**
   * Update trail length at runtime. Trims excess trail points.
   * @param {number} length - New trail length
   */
  updateTrailLength(length) {
    this.config.particles.trailLength = length;
    for (const p of this.particles) {
      p.trailLength = length;
      if (p.trail.length > length) {
        p.trail.length = length;
      }
    }
  }

  /**
   * Update particle count at runtime. Adds or removes particles.
   * @param {number} count - New particle count
   */
  updateParticleCount(count) {
    const current = this.particles.length;
    this.config.particles.count = count;
    if (count > current) {
      for (let i = current; i < count; i++) {
        this.particles.push(this.createParticle());
      }
    } else if (count < current) {
      this.particles.length = count;
    }
  }

  /**
   * Switch to a different attractor with a full config swap.
   * Rebuilds particles, resets camera, and pushes all pipeline configs.
   * @param {string} name - Attractor key (e.g. "lorenz")
   * @param {Object} newConfig - Full config to merge with DEFAULTS
   */
  switchAttractor(name, newConfig) {
    this.config = deepMerge(DEFAULTS, newConfig);
    this.attractorName = name;
    this.attractor = Attractors[name];
    if (!this.attractor) {
      throw new Error(`Unknown attractor "${name}"`);
    }

    // Recreate stepper and axis mapping
    this.stepFn = this.attractor.createStepper();
    this.resolvedAxisMapping = resolveAxisMapping(this.config.axisMapping);

    // Push all pipeline configs
    if (this.attractorPipeline?.isAvailable()) {
      const cfg = this.config;
      this.attractorPipeline.setVisualConfig(cfg.visual);
      this.attractorPipeline.setBloomConfig(cfg.bloom);
      this.attractorPipeline.setGlowConfig(cfg.glow);
      this.attractorPipeline.setBackgroundConfig({
        ...cfg.background,
        baseColor: cfg.background.baseColor || this._computeBackgroundColor(),
      });
      this.attractorPipeline.setEnergyConfig(cfg.energyFlow);
      this.attractorPipeline.setDepthFogConfig(cfg.depthFog);
      this.attractorPipeline.setIridescenceConfig(cfg.iridescence);
      this.attractorPipeline.setChromaticAberrationConfig(cfg.chromaticAberration);
      this.attractorPipeline.setColorGradingConfig(cfg.colorGrading);
    }

    // Rebuild particles
    this.particles = [];
    for (let i = 0; i < this.config.particles.count; i++) {
      this.particles.push(this.createParticle());
    }

    // Reset camera
    this.camera.rotationX = this.config.camera.rotationX;
    this.camera.rotationY = this.config.camera.rotationY;
    this.camera.velocityX = 0;
    this.camera.velocityY = 0;

    // Reset zoom and time
    const { min, max, baseScreenSize } = this.config.zoom;
    this.defaultZoom = Math.min(max, Math.max(min, Screen.minDimension() / baseScreenSize));
    this.zoom = this.defaultZoom;
    this.targetZoom = this.defaultZoom;
    this.time = 0;

    // Instant show (no fade delay)
    Tweenetik.killTarget(this);
    this.fadeAlpha = 1;
  }

  /**
   * Restart the simulation: fade to black, wait, then respawn particles
   * and fade back in. Resets camera, zoom, and time.
   */
  restart() {
    const cfg = this.config;

    // Kill any existing fade tweens
    Tweenetik.killTarget(this);

    // Immediately go black and clear particles
    this.fadeAlpha = 0;
    this.particles = [];

    // After delay, create new particles and fade in
    setTimeout(() => {
      for (let i = 0; i < cfg.particles.count; i++) {
        this.particles.push(this.createParticle());
      }

      // Reset camera to initial angles
      this.camera.rotationX = cfg.camera.rotationX;
      this.camera.rotationY = cfg.camera.rotationY;
      this.camera.velocityX = 0;
      this.camera.velocityY = 0;

      // Reset zoom and time
      this.zoom = this.defaultZoom;
      this.targetZoom = this.defaultZoom;
      this.time = 0;

      // Fade-in
      Tweenetik.to(
        this,
        { fadeAlpha: 1 },
        cfg.restart.fadeDuration,
        Easing.easeOutCubic
      );

      console.log(`${this.attractor.name} attractor restarted`);
    }, cfg.restart.delay * 1000);
  }

  /** @override */
  destroy() {
    this.gesture?.destroy();
    this.attractorPipeline?.destroy();
    super.destroy?.();
  }

  /**
   * Derive a dark background base colour from the attractor's hue range.
   * @private
   * @returns {number[]} RGB triplet in [0,1] range
   */
  _computeBackgroundColor() {
    const { minHue, maxHue } = this.config.visual;
    const midHue = (minHue + maxHue) / 2;
    const rgb = hslToRgb(midHue, 30, 8);
    return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  }

  // ── Static launcher ──────────────────────────────────────────────────────

  /**
   * Convenience launcher: creates the demo on window load and starts it.
   *
   * @param {string} attractorName - Key in the Attractors module
   * @param {Object} [config={}]   - Per-attractor config overrides
   *
   * @example
   * Attractor3DDemo.run("lorenz", { attractor: { dt: 0.005, scale: 12 } });
   */
  static run(attractorName, config = {}) {
    window.addEventListener("load", () => {
      const canvas = document.getElementById("game");
      const demo = new Attractor3DDemo(canvas, attractorName, config);
      demo.start();
    });
  }
}

export { Attractor3DDemo, AttractorParticle, DEFAULTS, hslToRgb, deepMerge, resolveAxisMapping, Screen };
export default Attractor3DDemo;

/**
 * Caos Playground — Interactive attractor explorer with live control panel.
 *
 * Extends Attractor3DDemo to inherit camera, zoom, gestures, particles,
 * WebGL pipeline, and restart. Adds a right-aligned accordion UI panel
 * with sliders/dropdowns that control the live simulation.
 *
 * Architecture:
 *  - CaosPlayground extends Attractor3DDemo (which extends Game)
 *  - Overrides render() for z-order: clear -> attractor -> pipeline (UI on top)
 *  - Overrides init() to build UI panel after simulation setup
 *  - Slider callbacks call runtime update methods on the base class
 */

import {
  FPSCounter,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  Stepper,
  AccordionGroup,
  Painter,
} from "/gcanvas.es.min.js";
import { Attractor3DDemo, DEFAULTS, deepMerge } from "./attractor-3d-demo.js";

// ─────────────────────────────────────────────────────────────────────────────
// Full nested Attractor3DDemo configs per attractor
// (data sourced from individual demo files, Screen.responsive replaced with
//  desktop-tier values since the playground has sliders for count/trail)
// ─────────────────────────────────────────────────────────────────────────────

const ATTRACTOR_PRESETS = {
  lorenz: {
    label: "Lorenz",
    attractor: { dt: 0.005, scale: 12 },
    particles: { count: 400, trailLength: 250, spawnRange: 5 },
    center: { x: 0, y: 0, z: 27 },
    camera: { perspective: 800, rotationX: -1.8, rotationY: -3 },
    visual: { minHue: 30, maxHue: 200, maxSpeed: 50, saturation: 85, lightness: 55, maxAlpha: 0.85, hueShiftSpeed: 15 },
    glow: { enabled: true, radius: 25, intensity: 0.25 },
    blink: { chance: 0.015, intensityBoost: 1.4 },
    mouseControl: { horizontalAxis: "rotationZ" },
    zoom: { min: 0.2, max: 2.5 },
    restart: { delay: 1 },
    spawnOffset: { z: 27 },
    normalizeRotation: true,
    respawnChance: 0.001,
    autoRotation: { enabled: true, speed: 0.15, axis: "z" },
  },
  rossler: {
    label: "Rossler",
    attractor: { dt: 0.075, scale: 15 },
    particles: { count: 300, trailLength: 200, spawnRange: 4 },
    center: { x: 0.5, y: -2.5, z: 2.5 },
    camera: { perspective: 500, rotationX: 0.3, rotationY: 0 },
    visual: { minHue: 40, maxHue: 280, maxSpeed: 20, saturation: 85, lightness: 55, maxAlpha: 0.85, hueShiftSpeed: 10 },
    blink: { chance: 0.015, intensityBoost: 1.4, saturationBoost: 1.15, alphaBoost: 1.25 },
    zoom: { min: 0.2, max: 2.5 },
    axisMapping: { x: "x", y: "z", z: "y", sx: 1, sy: -1, sz: 1 },
    warmupSteps: 0,
    paramVariation: { params: { a: 0.2, b: 0.2, c: 5.7 }, range: 0.02 },
    respawnChance: 0.01,
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
  chen: {
    label: "Chen",
    attractor: { dt: 0.008, scale: 12 },
    particles: { count: 400, trailLength: 250, spawnRange: 10 },
    center: { x: 0, y: 0, z: 12 },
    camera: { perspective: 800, rotationX: -1.3, rotationY: 0 },
    visual: { minHue: 200, maxHue: 280, maxSpeed: 50, saturation: 95, lightness: 45, maxAlpha: 0.55, hueShiftSpeed: 12 },
    glow: { enabled: true, radius: 75, intensity: 0.75 },
    blink: { chance: 0.015, intensityBoost: 1.4, saturationBoost: 1.15, alphaBoost: 1.25 },
    warmupSteps: 0,
    zoom: { min: 0.2, max: 2.5 },
    mouseControl: { horizontalAxis: "rotationZ" },
    normalizeRotation: true,
    spawnOffset: { z: 8.7 },
    paramVariation: { params: { alpha: 5, beta: -10, delta: -0.38 }, range: 0.03 },
    maxDistance: 50,
    respawnChance: 0.001,
    autoRotation: { enabled: true, speed: 0.15, axis: "z" },
  },
  chua: {
    label: "Chua's Circuit",
    attractor: { dt: 0.01, scale: 60 },
    particles: { count: 400, trailLength: 250, spawnRange: 1 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 800, rotationX: 0.5, rotationY: -0.6 },
    visual: { minHue: 90, maxHue: 180, maxSpeed: 20, saturation: 90, lightness: 48, maxAlpha: 0.6, hueShiftSpeed: 10 },
    blink: { chance: 0.02, intensityBoost: 1.5, saturationBoost: 1.2, alphaBoost: 1.3 },
    bloom: { enabled: true, threshold: 0.3, strength: 0.3, radius: 0.5 },
    zoom: { min: 0.3, max: 3.0 },
    warmupSteps: 0,
    maxDistance: 12,
    respawnChance: 0.003,
    spawnOffset: { x: 0.1, y: 0.1, z: 0.1 },
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
  threeScroll: {
    label: "Three-Scroll",
    attractor: { dt: 0.003, scale: 1.4 },
    particles: { count: 350, trailLength: 250, spawnRange: 5 },
    center: { x: 0, y: 0, z: 124 },
    camera: { perspective: 800, rotationX: -1.5, rotationY: 0 },
    visual: { minHue: 260, maxHue: 50, maxSpeed: 8000, saturation: 95, lightness: 42, maxAlpha: 0.35, hueShiftSpeed: 8 },
    bloom: { enabled: true, threshold: 0.35, strength: 0.25, radius: 0.5 },
    blink: { chance: 0.015, intensityBoost: 1.6, saturationBoost: 1.3, alphaBoost: 1.4 },
    zoom: { min: 0.2, max: 3.0 },
    warmupSteps: 0,
    maxDistance: 250,
    respawnChance: 0.002,
    spawnOffset: { x: -0.29, y: -0.25, z: -0.59 },
    autoRotation: { enabled: true, speed: 0.12, axis: "y" },
  },
  rabinovichFabrikant: {
    label: "Rabinovich-Fabrikant",
    attractor: { dt: 0.02, scale: 85 },
    particles: { count: 300, trailLength: 300, spawnRange: 3 },
    center: { x: 0, y: 0, z: 0.8 },
    spawnOffset: { x: 0, y: 0, z: 0.5 },
    camera: { perspective: 600, rotationX: 0.4, rotationY: 0 },
    visual: { minHue: 330, maxHue: 200, maxSpeed: 8, saturation: 90, lightness: 60, maxAlpha: 0.85, hueShiftSpeed: 12 },
    blink: { chance: 0.02, minDuration: 0.03, maxDuration: 0.15, intensityBoost: 1.6, saturationBoost: 1.2, alphaBoost: 1.3 },
    zoom: { min: 0.5, max: 3.0 },
    warmupSteps: 1000,
    maxDistance: 4,
    respawnChance: 0.002,
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
  aizawa: {
    label: "Aizawa",
    attractor: { dt: 0.008, scale: 120 },
    particles: { count: 375, trailLength: 175, spawnRange: 0.5 },
    center: { x: 0, y: 0, z: 0.65 },
    camera: { perspective: 800, rotationX: 0.4, rotationY: 0 },
    visual: { minHue: 280, maxHue: 180, maxSpeed: 8, saturation: 90, lightness: 55, maxAlpha: 0.85, hueShiftSpeed: 12 },
    blink: { chance: 0.018, minDuration: 0.04, maxDuration: 0.2, intensityBoost: 1.5, saturationBoost: 1.2, alphaBoost: 1.3 },
    zoom: { min: 0.3, max: 2.5 },
    axisMapping: "yz-swap",
    mouseControl: { invertX: true, invertY: true },
    normalizeRotation: true,
    respawnChance: 0.001,
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
  thomas: {
    label: "Thomas",
    attractor: { dt: 0.08, scale: 60 },
    particles: { count: 375, trailLength: 400, spawnRange: 2 },
    center: { x: -0.2, y: -0.2, z: 0 },
    camera: { perspective: 800, rotationX: 0.3, rotationY: 0.2 },
    visual: { minHue: 120, maxHue: 200, maxSpeed: 2.5, saturation: 85, lightness: 50, maxAlpha: 0.8, hueShiftSpeed: 8 },
    blink: { chance: 0.012, minDuration: 0.06, intensityBoost: 1.4, saturationBoost: 1.15, alphaBoost: 1.2 },
    zoom: { min: 0.3, max: 3.0 },
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
  halvorsen: {
    label: "Halvorsen",
    attractor: { dt: 0.004, scale: 25 },
    particles: { count: 500, trailLength: 125, spawnRange: 1 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 300, rotationX: 0.615, rotationY: 0.495 },
    visual: { minHue: 320, maxHue: 220, maxSpeed: 40, saturation: 80, lightness: 55, maxAlpha: 0.85, hueShiftSpeed: 15 },
    blink: { chance: 0.08, minDuration: 0.04, maxDuration: 0.18, intensityBoost: 1.5, saturationBoost: 1.2, alphaBoost: 1.3 },
    zoom: { min: 0.25, max: 2.5 },
    axisMapping: "yz-swap",
    mouseControl: { horizontalAxis: "screenRotation" },
    normalizeRotation: true,
    maxDistance: 20,
    respawnChance: 0.002,
    autoRotation: { enabled: true, speed: 0.15, axis: "screen" },
  },
  dadras: {
    label: "Dadras",
    attractor: { dt: 0.01, scale: 50 },
    particles: { count: 375, trailLength: 150, spawnRange: 5 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 800, rotationX: 0.3, rotationY: 0 },
    visual: { minHue: 60, maxHue: 240, maxSpeed: 30, saturation: 80, lightness: 50, maxAlpha: 0.9, hueShiftSpeed: 20 },
    blink: { chance: 0.02, intensityBoost: 1.5, saturationBoost: 1.2, alphaBoost: 1.3 },
    zoom: { min: 0.3, max: 3.0, baseScreenSize: 900 },
    screenOffset: { x: 0, y: 0.01 },
    respawnChance: 0,
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-attractor equation parameter definitions
// key  = matches Attractors.*.defaultParams keys in src/math/attractors.js
// label = display name (Unicode Greek where appropriate)
// ─────────────────────────────────────────────────────────────────────────────

const ATTRACTOR_PARAMS = {
  lorenz: [
    { key: "sigma", label: "\u03C3 (sigma)",  default: 10,       min: 0,   max: 30,  step: 0.1  },
    { key: "rho",   label: "\u03C1 (rho)",    default: 28,       min: 0,   max: 60,  step: 0.1  },
    { key: "beta",  label: "\u03B2 (beta)",   default: 8 / 3,    min: 0,   max: 10,  step: 0.01 },
  ],
  rossler: [
    { key: "a", label: "a", default: 0.2,  min: 0, max: 1,  step: 0.01 },
    { key: "b", label: "b", default: 0.2,  min: 0, max: 1,  step: 0.01 },
    { key: "c", label: "c", default: 5.7,  min: 0, max: 20, step: 0.1  },
  ],
  chen: [
    { key: "alpha", label: "\u03B1 (alpha)", default: 5,     min: -10, max: 20,  step: 0.1  },
    { key: "beta",  label: "\u03B2 (beta)",  default: -10,   min: -30, max: 10,  step: 0.1  },
    { key: "delta", label: "\u03B4 (delta)", default: -0.38, min: -2,  max: 2,   step: 0.01 },
  ],
  chua: [
    { key: "alpha", label: "\u03B1 (alpha)", default: 15.6,  min: 5,  max: 30,  step: 0.1 },
    { key: "gamma", label: "\u03B3 (gamma)", default: 25.58, min: 10, max: 50,  step: 0.1 },
    { key: "m0",    label: "m\u2080",        default: -2,    min: -5, max: 0,   step: 0.1 },
    { key: "m1",    label: "m\u2081",        default: 0,     min: -3, max: 3,   step: 0.1 },
  ],
  threeScroll: [
    { key: "a", label: "a", default: 32.48, min: 20,  max: 50,  step: 0.01 },
    { key: "b", label: "b", default: 45.84, min: 30,  max: 60,  step: 0.01 },
    { key: "c", label: "c", default: 1.18,  min: 0,   max: 5,   step: 0.01 },
    { key: "d", label: "d", default: 0.13,  min: 0,   max: 1,   step: 0.01 },
    { key: "e", label: "e", default: 0.57,  min: 0,   max: 2,   step: 0.01 },
    { key: "f", label: "f", default: 14.7,  min: 5,   max: 25,  step: 0.1  },
  ],
  rabinovichFabrikant: [
    { key: "alpha", label: "\u03B1 (alpha)", default: 0.14, min: 0, max: 1.5, step: 0.01 },
    { key: "gamma", label: "\u03B3 (gamma)", default: 0.10, min: 0, max: 1.5, step: 0.01 },
  ],
  aizawa: [
    { key: "a", label: "a", default: 0.95, min: 0,   max: 2,  step: 0.01 },
    { key: "b", label: "b", default: 0.7,  min: 0,   max: 2,  step: 0.01 },
    { key: "c", label: "c", default: 0.6,  min: 0,   max: 2,  step: 0.01 },
    { key: "d", label: "d", default: 3.5,  min: 0,   max: 8,  step: 0.1  },
    { key: "e", label: "e", default: 0.25, min: 0,   max: 1,  step: 0.01 },
    { key: "f", label: "f", default: 0.1,  min: 0,   max: 1,  step: 0.01 },
  ],
  thomas: [
    { key: "b", label: "b", default: 0.208186, min: 0, max: 1, step: 0.001 },
  ],
  halvorsen: [
    { key: "a", label: "a", default: 1.89, min: 0, max: 5, step: 0.01 },
  ],
  dadras: [
    { key: "a", label: "a", default: 3,   min: 0, max: 10, step: 0.1 },
    { key: "b", label: "b", default: 2.7, min: 0, max: 10, step: 0.1 },
    { key: "c", label: "c", default: 1.7, min: 0, max: 10, step: 0.1 },
    { key: "d", label: "d", default: 2,   min: 0, max: 10, step: 0.1 },
    { key: "e", label: "e", default: 9,   min: 0, max: 20, step: 0.1 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// UI CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  panel: {
    width: 300,
    padding: 14,
    marginRight: 16,
    marginTop: 16,
    debugColor: "rgba(0, 255, 0, 0.18)",
    spacing: 10,
  },
  accordion: {
    headerHeight: 28,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CAOS PLAYGROUND
// ─────────────────────────────────────────────────────────────────────────────

export class CaosPlayground extends Attractor3DDemo {
  constructor(canvas) {
    // Bootstrap with Lorenz preset + over-allocated buffer for slider headroom
    const initialConfig = {
      ...ATTRACTOR_PRESETS.lorenz,
      maxSegments: 250000,
    };
    super(canvas, "lorenz", initialConfig);
  }

  /** @override */
  init() {
    super.init(); // Camera, particles, WebGL pipeline all set up

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    this._activePreset = "lorenz";
    this._uiParams = {}; // Accumulator for equation param slider values
    this._updatingSliders = false; // Guard against cascading onChange

    this._buildPanel();
  }

  // ─── Render override: attractor behind, UI on top ───────────────────

  /** @override */
  render() {
    Painter.setContext(this.ctx);
    if (this.running) this.clear();
    this._renderAttractor();   // Attractor behind
    this.pipeline.render();    // UI panel on top
  }

  // ─── Panel Construction ─────────────────────────────────────────────

  _buildPanel() {
    const { width, padding, debugColor, spacing } = CONFIG.panel;
    const cfg = this.config;

    // AccordionGroup handles layout, debug outline, and section management
    this.panel = new AccordionGroup(this, {
      width,
      padding,
      spacing,
      headerHeight: CONFIG.accordion.headerHeight,
      debug: true,
      debugColor,
    });
    this.panel.x = this.width - width - CONFIG.panel.marginRight;
    this.panel.y = CONFIG.panel.marginTop;
    this.pipeline.add(this.panel);

    const sw = width - padding * 2; // usable item width
    this._controls = {};

    // ── Attractor Dropdown (always visible, not in a section) ─────
    const attractorOptions = Object.entries(ATTRACTOR_PRESETS).map(
      ([key, preset]) => ({ label: preset.label, value: key })
    );

    this._controls.attractor = new Dropdown(this, {
      label: "ATTRACTOR",
      width: sw,
      options: attractorOptions,
      value: this._activePreset,
      onChange: (v) => this._onAttractorChange(v),
    });
    this.panel.addItem(this._controls.attractor);

    // ── Parameters (dynamic, rebuilt per attractor) ─────────────────
    this._paramsSection = this.panel.addSection("Parameters", { expanded: true });
    this._paramSliders = [];
    this._buildParamSliders(this._activePreset);

    // ── Physics ──────────────────────────────────────────────────────
    const physics = this.panel.addSection("Physics", { expanded: true });

    this._controls.dt = new Slider(this, {
      label: "TIME STEP", width: sw,
      min: 0.001, max: 0.1, value: cfg.attractor.dt, step: 0.001,
      formatValue: (v) => v.toFixed(3),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.attractor.dt = v;
      },
    });
    physics.addItem(this._controls.dt);

    this._controls.scale = new Slider(this, {
      label: "SCALE", width: sw,
      min: 1, max: 150, value: cfg.attractor.scale, step: 1,
      formatValue: (v) => v.toFixed(0),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.attractor.scale = v;
      },
    });
    physics.addItem(this._controls.scale);

    // ── Particles ────────────────────────────────────────────────────
    const particles = this.panel.addSection("Particles", { expanded: false });

    this._controls.particles = new Stepper(this, {
      label: "COUNT",
      value: cfg.particles.count, min: 50, max: 1000, step: 50,
      buttonSize: 32, valueWidth: 60,
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.updateParticleCount(v);
      },
    });
    particles.addItem(this._controls.particles);

    this._controls.trailLength = new Slider(this, {
      label: "TRAIL LENGTH", width: sw,
      min: 10, max: 500, value: cfg.particles.trailLength, step: 10,
      formatValue: (v) => v.toFixed(0),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.updateTrailLength(v);
      },
    });
    particles.addItem(this._controls.trailLength);

    // ── Color ────────────────────────────────────────────────────────
    const color = this.panel.addSection("Color", { expanded: false });

    this._controls.minHue = new Slider(this, {
      label: "HUE MIN", width: sw,
      min: 0, max: 360, value: cfg.visual.minHue, step: 1,
      formatValue: (v) => v.toFixed(0) + "\u00B0",
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.visual.minHue = v;
        this.attractorPipeline?.setVisualConfig({ minHue: v });
      },
    });
    color.addItem(this._controls.minHue);

    this._controls.maxHue = new Slider(this, {
      label: "HUE MAX", width: sw,
      min: 0, max: 360, value: cfg.visual.maxHue, step: 1,
      formatValue: (v) => v.toFixed(0) + "\u00B0",
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.visual.maxHue = v;
        this.attractorPipeline?.setVisualConfig({ maxHue: v });
      },
    });
    color.addItem(this._controls.maxHue);

    this._controls.saturation = new Slider(this, {
      label: "SATURATION", width: sw,
      min: 0, max: 100, value: cfg.visual.saturation, step: 1,
      formatValue: (v) => v.toFixed(0) + "%",
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.visual.saturation = v;
        this.attractorPipeline?.setVisualConfig({ saturation: v });
      },
    });
    color.addItem(this._controls.saturation);

    this._controls.lightness = new Slider(this, {
      label: "LIGHTNESS", width: sw,
      min: 0, max: 100, value: cfg.visual.lightness, step: 1,
      formatValue: (v) => v.toFixed(0) + "%",
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.visual.lightness = v;
        this.attractorPipeline?.setVisualConfig({ lightness: v });
      },
    });
    color.addItem(this._controls.lightness);

    // ── Effects ──────────────────────────────────────────────────────
    const effects = this.panel.addSection("Effects", { expanded: false });

    this._controls.bloom = new ToggleButton(this, {
      text: "Bloom", width: 80, height: 30,
      startToggled: cfg.bloom.enabled,
      onToggle: (on) => {
        this.config.bloom.enabled = on;
        this.attractorPipeline?.setBloomConfig({ enabled: on });
      },
    });
    effects.addItem(this._controls.bloom);

    this._controls.bloomStrength = new Slider(this, {
      label: "BLOOM STRENGTH", width: sw,
      min: 0, max: 1, value: cfg.bloom.strength, step: 0.05,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.bloom.strength = v;
        this.attractorPipeline?.setBloomConfig({ strength: v });
      },
    });
    effects.addItem(this._controls.bloomStrength);

    this._controls.glow = new ToggleButton(this, {
      text: "Glow", width: 80, height: 30,
      startToggled: cfg.glow.enabled,
      onToggle: (on) => {
        this.config.glow.enabled = on;
        this.attractorPipeline?.setGlowConfig({ enabled: on });
      },
    });
    effects.addItem(this._controls.glow);

    this._controls.glowRadius = new Slider(this, {
      label: "GLOW RADIUS", width: sw,
      min: 0, max: 100, value: cfg.glow.radius, step: 5,
      formatValue: (v) => v.toFixed(0),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.glow.radius = v;
        this.attractorPipeline?.setGlowConfig({ radius: v });
      },
    });
    effects.addItem(this._controls.glowRadius);

    this._controls.autoRotation = new ToggleButton(this, {
      text: "Auto-Rotate", width: 110, height: 30,
      startToggled: cfg.autoRotation.enabled,
      onToggle: (on) => {
        this.config.autoRotation.enabled = on;
      },
    });
    effects.addItem(this._controls.autoRotation);

    this._controls.rotationSpeed = new Slider(this, {
      label: "ROTATION SPEED", width: sw,
      min: 0.01, max: 0.5, value: cfg.autoRotation.speed, step: 0.01,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.config.autoRotation.speed = v;
      },
    });
    effects.addItem(this._controls.rotationSpeed);

    // ── Restart button (always visible, not in a section) ───────────
    this._controls.restart = new Button(this, {
      text: "Restart", width: sw, height: 32,
      onClick: () => this._onAttractorChange(this._activePreset),
    });
    this.panel.addItem(this._controls.restart);

    // Commit all section items to the Scene and perform layout
    this.panel.layoutAll();
  }

  // ─── Dynamic Parameter Sliders ─────────────────────────────────────

  _buildParamSliders(attractorKey) {
    const sw = CONFIG.panel.width - CONFIG.panel.padding * 2;

    // Remove old sliders if any
    if (this._paramSliders.length > 0) {
      this.panel.clearSection(this._paramsSection);
      this._paramSliders = [];
    }

    const paramDefs = ATTRACTOR_PARAMS[attractorKey];
    if (!paramDefs) return;

    // Reset equation params accumulator with defaults
    this._uiParams = {};
    for (const def of paramDefs) {
      this._uiParams[def.key] = def.default;
    }

    for (const def of paramDefs) {
      // Auto-format: derive decimal places from step precision
      const decimals = def.step >= 1 ? 0
        : def.step >= 0.1 ? 1
        : def.step >= 0.01 ? 2
        : 3;

      const slider = new Slider(this, {
        label: def.label.toUpperCase(),
        width: sw,
        min: def.min,
        max: def.max,
        value: def.default,
        step: def.step,
        formatValue: (v) => v.toFixed(decimals),
        onChange: (v) => {
          if (this._updatingSliders) return;
          this._uiParams[def.key] = v;
          this.updateAttractorParams(this._uiParams);
        },
      });

      this._paramsSection.addItem(slider);
      this._paramSliders.push(slider);
    }

    this.panel.commitSection(this._paramsSection);
    this.panel.layout();
  }

  // ─── Attractor Change ───────────────────────────────────────────────

  _onAttractorChange(key) {
    const preset = ATTRACTOR_PRESETS[key];
    if (!preset) return;

    // Close dropdown before relayout so getBounds() returns closed height
    this._controls.attractor.close();

    this._activePreset = key;

    // Full attractor swap via base class
    this.switchAttractor(key, { ...preset, maxSegments: 250000 });

    // Update all UI controls from the new config (guard against cascading onChange)
    this._updatingSliders = true;
    const cfg = this.config;

    this._controls.dt.value = cfg.attractor.dt;
    this._controls.scale.value = cfg.attractor.scale;
    this._controls.particles.value = cfg.particles.count;
    this._controls.trailLength.value = cfg.particles.trailLength;
    this._controls.minHue.value = cfg.visual.minHue;
    this._controls.maxHue.value = cfg.visual.maxHue;
    this._controls.saturation.value = cfg.visual.saturation;
    this._controls.lightness.value = cfg.visual.lightness;
    this._controls.bloomStrength.value = cfg.bloom.strength;
    this._controls.glowRadius.value = cfg.glow.radius;
    this._controls.rotationSpeed.value = cfg.autoRotation.speed;

    this._controls.bloom.toggle(cfg.bloom.enabled);
    this._controls.glow.toggle(cfg.glow.enabled);
    this._controls.autoRotation.toggle(cfg.autoRotation.enabled);

    this._updatingSliders = false;

    // Rebuild per-attractor parameter sliders
    this._buildParamSliders(key);

    console.log(`Switched to ${preset.label}`);
  }

  // ─── Resize ─────────────────────────────────────────────────────────

  /** @override */
  onResize() {
    super.onResize(); // Attractor3DDemo resize (pipeline + zoom)
    if (!this.panel) return;
    this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
    this.panel.y = CONFIG.panel.marginTop;
  }
}

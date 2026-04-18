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
  Screen,
  Text,
  Scene,
  VerticalLayout,
  Tooltip,
  Tweenetik,
  Easing,
} from "/gcanvas.es.min.js";
import { StateMachine } from "/gcanvas.es.min.js";
import { Attractor3DDemo } from "./attractor-3d-demo.js";
import { WebGPUAttractorPipeline } from "/gcanvas.es.min.js";
import { WebGLAttractorPipeline } from "/gcanvas.es.min.js";

// ─────────────────────────────────────────────────────────────────────────────
// Full nested Attractor3DDemo configs per attractor
// (data sourced from individual demo files, Screen.responsive replaced with
//  desktop-tier values since the playground has sliders for count/trail)
// ─────────────────────────────────────────────────────────────────────────────

const ATTRACTOR_PRESETS = {
  lorenz: {
    label: "Lorenz",
    attractor: { dt: 0.009, scale: 12 },
    particles: { count: 350, trailLength: 200, spawnRange: 1.5},
    center: { x: 0, y: 0, z: 27 },
    camera: { perspective: 800, rotationX: 4.5, rotationY: 3.2 },
    visual: { minHue: 75, maxHue: 125, maxSpeed: 70, saturation: 55, lightness: 45, maxAlpha: 0.15, hueShiftSpeed: 10 },
    glow: { enabled: true, radius: 200, intensity: 5 },
    blink: { chance: 0.01, intensityBoost: 1.5, saturationBoost: 0.256, alphaBoost: 1.75 },
    mouseControl: { horizontalAxis: "rotationZ" },
    zoom: { min: 0.3, max: 2.5 },
    restart: { delay: 1 },
    spawnOffset: { z: 27 },
    colorGrading: { bleach: 0.75 },
    normalizeRotation: true,
    respawnChance: 0.009,
    autoRotation: { enabled: false, speed: 0.15, axis: "z" },
  },
  rossler: {
    label: "Rossler",
    attractor: { dt: 0.075, scale: 20 },
    particles: { count: 300, trailLength: 275, spawnRange: .5 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 800, rotationX: 0.5, rotationY: 0 },
    visual: { minHue: 10, maxHue: 255, maxSpeed: 25, saturation: 60, lightness: 25, maxAlpha: 0.15, hueShiftSpeed: 20, hueJitter: 10 },
    glow: { enabled: true, radius: 250, intensity: 1.1 },
    blink: { chance: 0.123, intensityBoost: 0.1, saturationBoost: 0.1, alphaBoost: 0.5},
    energyFlow: { intensity: 0.25, speed: 1.2, sparkThreshold: 0.75 },
    colorGrading: { bleach: 1 },
    zoom: { min: 0.2, max: 2.5 },
    axisMapping: { x: "x", y: "z", z: "y", sx: 1, sy: -0.72, sz: 1 },
    screenOffset: { x: 0, y: 0.2 },
    warmupSteps: 150,
    paramVariation: { params: { a: 0.2, b: 0.2, c: 5.7 }, range: 0.02 },
    respawnChance: 0.0009,
    mouseControl: { horizontalAxis: "rotationZ" },
    autoRotation: { enabled: false, speed: 0.5, axis: "z" },
  },
  dadras: {
    label: "Dadras",
    attractor: { dt: 0.01, scale: 70 },
    particles: { count: 300, trailLength: 200, spawnRange: 5 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 800, rotationX: -0.895, rotationY: 0.000, rotationZ: -0.595 },
    visual: { minHue: 150, maxHue: 275, maxSpeed: 70, saturation: 70, lightness: 50, maxAlpha: 0.15, hueShiftSpeed: 20 },
    glow: { enabled: true, radius: 100, intensity: 2.0 },
    blink: { chance: 0.01, intensityBoost: 1.1, alphaBoost: 0.1 },
    zoom: { min: 0.3, max: 3.0, baseScreenSize: 900 },
    screenOffset: { x: 0, y: 0.01 },
    respawnChance: 0,
    autoRotation: { enabled: false, speed: 0.15, axis: "y" },
  },
  thomas: {
    label: "Thomas",
    attractor: { dt: 0.09, scale: 80 },
    particles: { count: 400, trailLength: 200, spawnRange: 5 },
    center: { x: -0.2, y: -0.2, z: 0 },
    camera: { perspective: 800, rotationX: 0.3, rotationY: 0.2 },
    visual: { minHue: 170, maxHue: 210, maxSpeed: 70, saturation: 70, lightness: 40, maxAlpha: 0.15, hueShiftSpeed: 6 },
    glow: { enabled: true, radius: 50, intensity: 5.1 },
    blink: { chance: 0.01, alphaBoost: 0.1 },
    zoom: { min: 0.3, max: 3.0 },
    respawnChance: 0.001,
    autoRotation: { enabled: true, speed: 0.15, axis: "y" },
  },
  halvorsen: {
    label: "Halvorsen",
    attractor: { dt: 0.008, scale: 25 },
    particles: { count: 300, trailLength: 300, spawnRange: 1 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 300, rotationX: 0.615, rotationY: 0.495 },
    visual: { minHue: 270, maxHue: 320, maxSpeed: 70, saturation: 70, lightness: 35, maxAlpha: 0.15, hueShiftSpeed: 18 },
    glow: { enabled: true, radius: 150, intensity: 0.75 },
    blink: { chance: 0.01, intensityBoost: 1.5 },
    zoom: { min: 0.25, max: 2.5 },
    axisMapping: "yz-swap",
    mouseControl: { horizontalAxis: "screenRotation" },
    normalizeRotation: true,
    maxDistance: 20,
    respawnChance: 0.001,
    autoRotation: { enabled: false, speed: 0.15, axis: "screen" },
  },
  aizawa: {
    label: "Aizawa",
    attractor: { dt: 0.05, scale: 175 },
    particles: { count: 350, trailLength: 200, spawnRange: 0.25 },
    center: { x: 0, y: 0, z: 0.65 },
    camera: { perspective: 800, rotationX: 0.4, rotationY: 0 },
    visual: { minHue: 150, maxHue: 200, maxSpeed: 70, saturation: 55, lightness: 20, maxAlpha: 0.1, hueShiftSpeed: 40 },
    glow: { enabled: true, radius: 300, intensity: 1.75 },
    blink: { chance: 0.2, intensityBoost: 1.1, saturationBoost: 1.1, alphaBoost: 1.5 },
    zoom: { min: 0.3, max: 2.5 },
    axisMapping: "yz-swap",
    mouseControl: { invertX: false, invertY: false },
    normalizeRotation: true,
    respawnChance: 0.009,
    autoRotation: { enabled: false, speed: 0.15, axis: "y" },
  },
  chen: {
    label: "Chen",
    attractor: { dt: 0.01, scale: 20 },
    particles: { count: 300, trailLength: 270, spawnRange: 3 },
    center: { x: 0, y: 0, z: 15 },
    camera: { perspective: 800, rotationX: -1.3, rotationY: 0 },
    visual: { minHue: 200, maxHue: 260, maxSpeed: 70, saturation: 70, lightness: 40, maxAlpha: 0.1, hueShiftSpeed: 14 },
    glow: { enabled: true, radius: 100, intensity: 3.75 },
    blink: { chance: 0.1, intensityBoost: 2.5 },
    warmupSteps: 1,
    zoom: { min: 0.2, max: 2.5 },
    mouseControl: { horizontalAxis: "rotationZ" },
    normalizeRotation: true,
    spawnOffset: { z: 8 },
    paramVariation: { params: { alpha: 5, beta: -20, delta: -0.38 }, range: 0.05 },
    maxDistance: 50,
    respawnChance: 0.001,
    autoRotation: { enabled: false, speed: 0.15, axis: "z" },
  },
  chua: {
    label: "Chua's Circuit",
    attractor: { dt: 0.01, scale: 60 },
    particles: { count: 350, trailLength: 250, spawnRange: 1 },
    center: { x: 0, y: 0, z: 0 },
    camera: { perspective: 800, rotationX: -4.515, rotationY: -0.600, rotationZ: -3.270 },
    visual: { minHue: 120, maxHue: 170, maxSpeed: 70, saturation: 70, lightness: 50, maxAlpha: 0.15, hueShiftSpeed: 25 },
    glow: { enabled: true, radius: 150, intensity: 0.75 },
    blink: { chance: 0.124, intensityBoost: 1.4 },
    bloom: { enabled: true, threshold: 0.3, strength: 0.18, radius: 0.5 },
    zoom: { min: 0.3, max: 3.0 },
    warmupSteps: 0,
    maxDistance: 12,
    respawnChance: 0.009,
    spawnOffset: { x: 0.1, y: 0.1, z: 0.1 },
    autoRotation: { enabled: false, speed: 0.15, axis: "y" },
  },
  threeScroll: {
    label: "Three-Scroll",
    attractor: { dt: 0.005, scale: 1.8 },
    particles: { count: 300, trailLength: 150, spawnRange: 5},
    center: { x: 0, y: 0, z: 124 },
    camera: { perspective: 800, rotationX: 0, rotationY: 0, rotationZ: 3 },
    visual: { minHue: 150, maxHue: 50, maxSpeed: 70, saturation: 70, lightness: 30, maxAlpha: 0.12, hueShiftSpeed: 10 },
    glow: { enabled: true, radius: 100, intensity: 1.8 },
    blink: { chance: 0.001, intensityBoost: .3, saturationBoost: .1, alphaBoost: .5 },
    colorGrading: { bleach: 0.5 },
    zoom: { min: 0.2, max: 3.0 },
    warmupSteps: 1,
    respawnChance: 0.005,
    maxDistance: 300,
    spawnOffset: { x: -0.29, y: -0.25, z: -0.59 },
    autoRotation: { enabled: true, speed: 0.12, axis: "x" },
  },
  rabinovichFabrikant: {
    label: "Rabinovich-Fabrikant",
    attractor: { dt: 0.1, scale: 85 },
    particles: { count: 300, trailLength: 150, spawnRange: 2 },
    center: { x: 0, y: 0, z: 0.8 },
    spawnOffset: { x: 0, y: 0, z: 0.5 },
    camera: { perspective: 800, rotationX: 2.046, rotationY: 0.000, rotationZ: 0.004 },
    visual: { minHue: 380, maxHue: 300, maxSpeed: 70, saturation: 70, lightness: 35, maxAlpha: 0.15, hueShiftSpeed: 35 },
    glow: { enabled: true, radius: 150, intensity: 0.75 },
    blink: { chance: 0.35, intensityBoost: 1.7 },
    zoom: { min: 0.5, max: 3.0 },
    warmupSteps: 1000,
    maxDistance: 4,
    respawnChance: 0.001,
    autoRotation: { enabled: true, speed: 0.15, axis: "z" },
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-attractor equation parameter definitions
// key  = matches Attractors.*.defaultParams keys in src/math/attractors.js
// label = display name (Unicode Greek where appropriate)
// ─────────────────────────────────────────────────────────────────────────────

const ATTRACTOR_PARAMS = {
  lorenz: [
    { key: "sigma", label: "\u03C3 (sigma)",  default: 10,       min: 0,   max: 30,  step: 0.1,
      tip: "Prandtl number — controls how fast heat diffuses vs. fluid viscosity. Higher values widen the butterfly wings." },
    { key: "rho",   label: "\u03C1 (rho)",    default: 28,       min: 0,   max: 60,  step: 0.1,
      tip: "Rayleigh number — drives convection intensity. Below ~24.7 the system stabilizes; above it, chaos emerges." },
    { key: "beta",  label: "\u03B2 (beta)",   default: 8 / 3,    min: 0,   max: 10,  step: 0.01,
      tip: "Geometric factor of the convection cell. Affects how quickly trajectories spiral inward on each lobe." },
  ],
  rossler: [
    { key: "a", label: "a", default: 0.2,  min: 0, max: 1,  step: 0.01,
      tip: "Controls the speed of rotation in the x-y plane. Increasing it stretches the spiral outward." },
    { key: "b", label: "b", default: 0.2,  min: 0, max: 1,  step: 0.01,
      tip: "Couples x into the z dynamics. Small changes subtly affect the folding mechanism." },
    { key: "c", label: "c", default: 5.7,  min: 0, max: 20, step: 0.1,
      tip: "Controls the height of the z-axis spike. Higher values create a taller, sharper fold where reinjection occurs." },
  ],
  chen: [
    { key: "alpha", label: "\u03B1 (alpha)", default: 5,     min: -10, max: 20,  step: 0.1,
      tip: "Linear coupling strength. Controls how strongly x and y influence each other's rate of change." },
    { key: "beta",  label: "\u03B2 (beta)",  default: -20,   min: -30, max: 10,  step: 0.1,
      tip: "Damping/amplification of z. Negative values sustain the double-scroll structure." },
    { key: "delta", label: "\u03B4 (delta)", default: -0.38, min: -2,  max: 2,   step: 0.01,
      tip: "Fine-tunes the attractor shape. Small shifts can collapse or expand the two lobes." },
  ],
  chua: [
    { key: "alpha", label: "\u03B1 (alpha)", default: 15.6,  min: 5,  max: 30,  step: 0.1,
      tip: "Ratio of capacitances C2/C1. Controls how energy transfers between the two capacitor stages." },
    { key: "gamma", label: "\u03B3 (gamma)", default: 25.58, min: 10, max: 50,  step: 0.1,
      tip: "Ratio of C2 to the inductor. Higher values speed up oscillation in the LC resonant loop." },
    { key: "m0",    label: "m\u2080",        default: -2,    min: -5, max: 0,   step: 0.1,
      tip: "Inner slope of Chua's diode. Controls the negative resistance in the central voltage region." },
    { key: "m1",    label: "m\u2081",        default: 0,     min: -3, max: 3,   step: 0.1,
      tip: "Outer slope of Chua's diode. Determines behavior at high voltages — affects scroll size." },
  ],
  threeScroll: [
    { key: "a", label: "a", default: 32.48, min: 20,  max: 50,  step: 0.01,
      tip: "Primary coupling coefficient. Drives the x-y interaction that forms the three scroll wings." },
    { key: "b", label: "b", default: 45.84, min: 30,  max: 60,  step: 0.01,
      tip: "Secondary coupling. Balances against 'a' to maintain the three-fold symmetry." },
    { key: "c", label: "c", default: 1.18,  min: 0,   max: 5,   step: 0.01,
      tip: "Damping on z-axis. Controls how tightly trajectories are pulled back to the x-y plane." },
    { key: "d", label: "d", default: 0.13,  min: 0,   max: 1,   step: 0.01,
      tip: "Nonlinear coupling strength (xz term). Affects the twisting between scrolls." },
    { key: "e", label: "e", default: 0.57,  min: 0,   max: 2,   step: 0.01,
      tip: "Quadratic damping (x\u00B2 term). Prevents trajectories from escaping to infinity." },
    { key: "f", label: "f", default: 14.7,  min: 5,   max: 25,  step: 0.1,
      tip: "Linear feedback on y. Shifts the balance between the three scroll centers." },
  ],
  rabinovichFabrikant: [
    { key: "alpha", label: "\u03B1 (alpha)", default: 0.14, min: 0, max: 1.5, step: 0.01,
      tip: "Dissipation rate. Low values allow long chaotic transients; too high and the system decays to a fixed point." },
    { key: "gamma", label: "\u03B3 (gamma)", default: 0.10, min: 0, max: 1.5, step: 0.01,
      tip: "Cross-coupling strength. Controls the energy exchange between oscillation modes in the plasma model." },
  ],
  aizawa: [
    { key: "a", label: "a", default: 0.95, min: 0,   max: 2,  step: 0.01,
      tip: "Controls the torus structure. Near 0.95 the attractor sits at the edge of order and chaos." },
    { key: "b", label: "b", default: 0.7,  min: 0,   max: 2,  step: 0.01,
      tip: "Rotational damping. Affects how tightly trajectories wind around the torus core." },
    { key: "c", label: "c", default: 0.6,  min: 0,   max: 2,  step: 0.01,
      tip: "Vertical drift rate. Shifts the attractor up or down and affects the mushroom cap shape." },
    { key: "d", label: "d", default: 3.5,  min: 0,   max: 8,  step: 0.1,
      tip: "Nonlinear coupling strength. Higher values expand the chaotic region of the torus." },
    { key: "e", label: "e", default: 0.85, min: 0,   max: 1,  step: 0.01,
      tip: "z-dependent modulation. Fine-tunes the symmetry breaking that makes Aizawa unique." },
    { key: "f", label: "f", default: 0.1,  min: 0,   max: 1,  step: 0.01,
      tip: "Cubic x-z coupling. A subtle term that affects the attractor's vertical extent." },
  ],
  thomas: [
    { key: "b", label: "b", default: 0.208186, min: 0, max: 1, step: 0.001,
      tip: "Friction coefficient. At b=0 the system is conservative; as b increases, chaos gives way to stable limit cycles." },
  ],
  halvorsen: [
    { key: "a", label: "a", default: 1.89, min: 0, max: 5, step: 0.01,
      tip: "Dissipation parameter. At 1.89 the three-fold symmetric attractor is fully chaotic; lower values simplify it." },
  ],
  dadras: [
    { key: "a", label: "a", default: 3,   min: 0, max: 10, step: 0.1,
      tip: "Controls the y-x coupling. Affects the width of the three butterfly wings." },
    { key: "b", label: "b", default: 2.7, min: 0, max: 10, step: 0.1,
      tip: "Nonlinear coupling (yz term). Drives the folding that creates the multi-wing structure." },
    { key: "c", label: "c", default: 1.7, min: 0, max: 10, step: 0.1,
      tip: "Damping on y. Balances against 'a' to determine the attractor's overall scale." },
    { key: "d", label: "d", default: 2,   min: 0, max: 10, step: 0.1,
      tip: "x-y product coupling into z. Controls how trajectories transfer between wings." },
    { key: "e", label: "e", default: 9,   min: 0, max: 20, step: 0.1,
      tip: "Damping on z. Higher values compress the attractor vertically; lower values let it expand." },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-attractor display info (title card overlay)
// ─────────────────────────────────────────────────────────────────────────────

const ATTRACTOR_INFO = {
  lorenz: {
    title: "LORENZ ATTRACTOR",
    tagline: "The butterfly effect — atmospheric convection, 1963",
    equations: "dx/dt = σ(y−x)   dy/dt = x(ρ−z)−y   dz/dt = xy−βz",
  },
  rossler: {
    title: "RÖSSLER ATTRACTOR",
    tagline: "Simplest chaotic flow — chemical kinetics, 1976",
    equations: "dx/dt = −y−z   dy/dt = x+ay   dz/dt = b+z(x−c)",
  },
  chen: {
    title: "CHEN ATTRACTOR",
    tagline: "Dual of Lorenz — not topologically equivalent, 1999",
    equations: "dx/dt = α(y−x)   dy/dt = (c−α)x−xz+cy   dz/dt = xy−βz",
  },
  chua: {
    title: "CHUA'S CIRCUIT",
    tagline: "First physical chaotic circuit — piecewise-linear, 1983",
    equations: "dx/dt = α(y−x−f(x))   dy/dt = x−y+z   dz/dt = −γy",
  },
  threeScroll: {
    title: "THREE-SCROLL ATTRACTOR",
    tagline: "Unified chaotic system — three intertwined scrolls",
    equations: "dx/dt = a(y−x)+dxz   dy/dt = bx−xz+fy   dz/dt = cz+xy−ex²",
  },
  rabinovichFabrikant: {
    title: "RABINOVICH-FABRIKANT",
    tagline: "Plasma instabilities — nonlinear oscillation, 1979",
    equations: "dx/dt = y(z−1+x²)+γx   dy/dt = x(3z+1−x²)+γy   dz/dt = −2z(α+xy)",
  },
  aizawa: {
    title: "AIZAWA ATTRACTOR",
    tagline: "Torus-to-chaos transition — delicate symmetry breaking",
    equations: "dx/dt = (z−b)x−dy   dy/dt = dx+(z−b)y   dz/dt = c+az−z³/3−(x²+y²)(1+ez)+fzx³",
  },
  thomas: {
    title: "THOMAS ATTRACTOR",
    tagline: "Cyclically symmetric — bounded chaos with friction, 1999",
    equations: "dx/dt = sin(y)−bx   dy/dt = sin(z)−by   dz/dt = sin(x)−bz",
  },
  halvorsen: {
    title: "HALVORSEN ATTRACTOR",
    tagline: "Cyclic symmetry — three-fold rotational structure",
    equations: "dx/dt = −ax−4y−4z−y²   dy/dt = −ay−4z−4x−z²   dz/dt = −az−4x−4y−x²",
  },
  dadras: {
    title: "DADRAS ATTRACTOR",
    tagline: "Three-wing butterfly — asymmetric strange attractor, 2010",
    equations: "dx/dt = y−ax+byz   dy/dt = cy−xz+z   dz/dt = dxy−ez",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UI CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  panel: {
    width: 300,
    padding: 18,
    marginRight: 16,
    marginTop: 16,
    debugColor: "rgba(0, 255, 0, 0.18)",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    spacing: 10,
    mobileMaxHeight: 0.85,
    mobilePadding: 16,
  },
  accordion: {
    headerHeight: 28,
  },
  toggle: {
    margin: 12,
    width: 44,
    height: 44,
  },
  maxSegments: 250000,
};

// ─────────────────────────────────────────────────────────────────────────────
// CAOS PLAYGROUND
// ─────────────────────────────────────────────────────────────────────────────

export class CaosPlayground extends Attractor3DDemo {
  constructor(canvas) {
    // Bootstrap with Lorenz preset + over-allocated buffer for slider headroom
    const initialConfig = {
      ...ATTRACTOR_PRESETS.lorenz,
      maxSegments: CONFIG.maxSegments,
    };
    super(canvas, "lorenz", initialConfig);
  }

  /** @override */
  init() {
    super.init(); // Camera, particles, WebGL pipeline all set up

    // Pause the sim when the tab is hidden so backgrounded rAF throttling
    // can't queue up a wall-clock backlog.
    this.enablePauseOnBlur(true);

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    this._activePreset = "lorenz";
    this._uiParams = {}; // Accumulator for equation param slider values
    this._updatingSliders = false; // Guard against cascading onChange

    // ─── Mobile: Screen detection ─────────────────────────────────────
    Screen.init(this);

    this._tooltip = new Tooltip(this, {
      textColor: "#fff",
      font: `${Screen.responsive(12, 14, 18)}px monospace`,
      maxWidth: Screen.responsive(220, 280, 380),
      padding: Screen.responsive(6, 8, 12),
    });
    this.pipeline.add(this._tooltip);

    this._buildPanel();
    this._buildToggleButton();
    this._initPanelStateMachine();
    this._buildInfoOverlay();
    this._initRightClickPan();
  }

  // ─── Render override: attractor behind, UI on top ───────────────────

  /** @override */
  render() {
    if (this.running) this.clear();
    this._renderAttractor();   // Attractor behind
    this.pipeline.render();    // UI panel on top
  }

  // ─── Panel Construction ─────────────────────────────────────────────

  _buildPanel() {
    const isMobile = Screen.isMobile;
    const panelWidth = Screen.responsive(this.width - 20, this.width - 20, CONFIG.panel.width);
    const padding = isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
    const { debugColor, spacing } = CONFIG.panel;
    const cfg = this.config;

    // AccordionGroup handles layout, debug outline, and section management
    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing,
      headerHeight: CONFIG.accordion.headerHeight,
      debug: true,
      debugColor,
    });

    // Draw a semi-transparent black background behind the panel contents
    const originalDraw = this.panel.draw.bind(this.panel);
    this.panel.draw = () => {
      Painter.shapes.rect(0, 0, this.panel._width, this.panel._height, CONFIG.panel.backgroundColor);
      originalDraw();
    };

    // Position set after layoutAll() via _layoutPanel() when panel height is known
    this.pipeline.add(this.panel);

    const sw = panelWidth - padding * 2; // usable item width
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

    // ── Renderer Dropdown (top-level, not in a section) ──────────
    const hasWebGPU = !!navigator.gpu;
    const rendererOptions = [{ label: "WebGL", value: "webgl" }];
    if (hasWebGPU) {
      rendererOptions.push({ label: "WebGPU", value: "webgpu" });
    }
    const defaultRenderer = hasWebGPU ? "webgpu" : "webgl";

    this._activeRenderer = "webgl";
    this._switchingRenderer = false;

    this._controls.renderer = new Dropdown(this, {
      label: "RENDERER",
      width: sw,
      options: rendererOptions,
      value: defaultRenderer,
      onChange: (v) => this._onRendererChange(v),
    });
    this.panel.addItem(this._controls.renderer);

    // Auto-switch to WebGPU if available
    if (hasWebGPU) {
      this._onRendererChange("webgpu");
    }

    // ── Parameters (dynamic, rebuilt per attractor) ─────────────────
    this._paramsSection = this.panel.addSection("Parameters", { expanded: !isMobile });
    this._paramSliders = [];
    this._buildParamSliders(this._activePreset);

    // ── Physics ──────────────────────────────────────────────────────
    const physics = this.panel.addSection("Physics", { expanded: !isMobile });

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
      min: 0, max: 200, value: cfg.glow.radius, step: 5,
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

    // ── Reset + Restart buttons (always visible, not in a section) ────
    this._controls.reset = new Button(this, {
      text: "Reset Defaults", width: sw, height: 32,
      onClick: () => this._resetToDefaults(),
    });
    this.panel.addItem(this._controls.reset);

    this._controls.restart = new Button(this, {
      text: "Restart", width: sw, height: 32,
      onClick: () => {
        // Restart simulation with current slider values (don't reset to preset)
        this.switchAttractor(this._activePreset, {
          ...this.config,
          maxSegments: CONFIG.maxSegments,
        });
      },
    });
    this.panel.addItem(this._controls.restart);

    // Commit all section items to the Scene and perform layout
    this.panel.layoutAll();

    // After every relayout, reposition panel so bottom edge stays anchored
    const originalLayout = this.panel.layout.bind(this.panel);
    this.panel.layout = () => {
      originalLayout();
      this._layoutPanel();
    };

    // On mobile, only allow one section expanded at a time
    if (isMobile) {
      this._sections = [this._paramsSection, physics, particles, color, effects];
      this._setupExclusiveSections();
    }

    // Position panel now that height is known
    this._layoutPanel();
  }

  // ─── Mobile Toggle Button ──────────────────────────────────────────

  _buildToggleButton() {
    this._toggleBtn = new Button(this, {
      text: "\u2699",
      width: CONFIG.toggle.width,
      height: CONFIG.toggle.height,
      onClick: () => this._togglePanel(),
    });
    this._toggleBtn.x = CONFIG.toggle.margin + CONFIG.toggle.width / 2;
    this._toggleBtn.y = CONFIG.toggle.margin + CONFIG.toggle.height / 2;
    this.pipeline.add(this._toggleBtn);

    // Only show on mobile
    this._toggleBtn.visible = Screen.isMobile;
    this._toggleBtn.interactive = Screen.isMobile;
  }

  _initPanelStateMachine() {
    this._panelFSM = new StateMachine({
      initial: Screen.isMobile ? "panel-hidden" : "panel-visible",
      context: this,
      states: {
        "panel-hidden": {
          enter() {
            this.panel.visible = false;
            this.panel.interactive = false;
            if (this._toggleBtn) {
              this._toggleBtn.text = "\u2699";
            }
          },
        },
        "panel-visible": {
          enter() {
            this.panel.visible = true;
            this.panel.interactive = true;
            if (Screen.isMobile && this._toggleBtn) {
              this._toggleBtn.text = "\u2716";
            }
          },
        },
      },
    });
  }

  /**
   * On mobile, wrap each section's toggle so only one can be expanded at a time.
   */
  _setupExclusiveSections() {
    // Store each section's original toggle before wrapping
    const origToggles = new Map();
    for (const section of this._sections) {
      origToggles.set(section, section.toggle.bind(section));
    }

    for (const section of this._sections) {
      section.toggle = (force) => {
        const willExpand = force !== undefined ? force : !section.expanded;
        if (willExpand) {
          // Collapse all other expanded sections
          for (const other of this._sections) {
            if (other !== section && other.expanded) {
              origToggles.get(other)(false);
            }
          }
        }
        origToggles.get(section)(force);
      };
    }
  }

  _togglePanel() {
    if (this._panelFSM.is("panel-hidden")) {
      this._panelFSM.setState("panel-visible");
    } else {
      this._panelFSM.setState("panel-hidden");
    }
  }

  _layoutPanel() {
    if (Screen.isMobile) {
      // Bottom sheet: full width, anchored to bottom (AccordionGroup uses top-left origin)
      const panelWidth = this.width - 20;
      const maxH = this.height * CONFIG.panel.mobileMaxHeight;
      const panelH = Math.min(this.panel._height || 400, maxH);
      this.panel.x = 10; // 10px left margin
      this.panel.y = this.height - panelH - 10; // 10px bottom margin
    } else {
      // Desktop: right sidebar (top-left origin)
      this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
      this.panel.y = CONFIG.panel.marginTop;
    }
  }

  // ─── Right-Click Pan ────────────────────────────────────────────────

  _initRightClickPan() {
    this._panning = false;
    this._panLastX = 0;
    this._panLastY = 0;

    // Disable context menu on the canvas so right-click works for panning
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    this.canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 2) return; // Right-click only
      this._panning = true;
      this._panLastX = e.clientX;
      this._panLastY = e.clientY;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (!this._panning) return;
      const dx = e.clientX - this._panLastX;
      const dy = e.clientY - this._panLastY;
      this._panLastX = e.clientX;
      this._panLastY = e.clientY;

      // Convert pixel delta to screenOffset fraction
      this.config.screenOffset.x += dx / this.width;
      this.config.screenOffset.y += dy / this.height;
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (e.button === 2) this._panning = false;
    });
  }

  // ─── Info Overlay (attractor title card) ───────────────────────────

  _buildInfoOverlay() {
    console.log("buildInfoOverlay");
    const isMobile = Screen.isMobile;

    this._infoScene = new VerticalLayout(this, {
      x: 0,
      y: 0,
      debug:false,
      spacing: Screen.responsive(8, 8, 10),
      align: isMobile ? "center" : "start",
    });
    this._infoScene._alpha = 1; // Custom alpha for fade animation
    // Anchor layout content at scene top-left instead of the default
    // vertical-centering offset, so scene.x/y is the block's top-left corner.
    this._infoScene.getLayoutOffset = () => ({ offsetX: 0, offsetY: 0 });

    const titleSize = Screen.responsive(22, 28, 36);
    const taglineSize = Screen.responsive(15, 17, 22);
    const equationSize = Screen.responsive(13, 15, 18);
    const align = isMobile ? "center" : "left";

    this._infoTitle = new Text(this, "", {
      font: `bold ${titleSize}px monospace`,
      color: "rgba(255,255,255,0.6)",
      align,
      debug: false,
      debugColor: "blue",
    });

    this._infoTagline = new Text(this, "", {
      font: `${taglineSize}px monospace`,
      color: "rgba(255,255,255,0.4)",
      align,
      debug: false,
      debugColor: "magenta",
    });

    this._infoEquations = new Text(this, "", {
      font: `${equationSize}px monospace`,
      color: "rgba(255,255,255,0.3)",
      align,
      debug: false,
      debugColor: "yellow",
    });

    this._infoScene.add(this._infoTitle);
    this._infoScene.add(this._infoTagline);
    this._infoScene.add(this._infoEquations);
    this.pipeline.add(this._infoScene);

    // Set initial content and position
    this._updateInfoContent(this._activePreset);
    this._layoutInfoOverlay();
  }

  _updateInfoContent(attractorKey) {
    const info = ATTRACTOR_INFO[attractorKey];
    if (!info) return;

    this._infoTitle.text = info.title;
    this._infoTagline.text = info.tagline;
    this._infoEquations.text = info.equations;

    this._infoScene._layoutDirty = true;
    this._layoutInfoOverlay();
  }

  _layoutInfoOverlay() {
    if (!this._infoScene) return;

    if (Screen.isMobile) {
      // Top center
      this._infoScene.x = this.width / 2;
      this._infoScene.y = 60;
    } else {
      // Bottom-left with responsive margin
      const margin = Screen.responsive(20, 28, 40);
      const blockHeight = Screen.responsive(70, 80, 100);
      this._infoScene.x = margin;
      this._infoScene.y = this.height - blockHeight - margin;
    }
  }

  _fadeInfoOverlay(attractorKey) {
    if (!this._infoScene) return;

    // Kill any in-progress fade
    Tweenetik.killTarget(this._infoScene);

    // Fade out, then swap content, then fade in
    Tweenetik.to(
      this._infoScene,
      { _alpha: 0 },
      0.3,
      Easing.easeOutCubic,
      {
        onComplete: () => {
          this._updateInfoContent(attractorKey);
          Tweenetik.to(
            this._infoScene,
            { _alpha: 1 },
            0.3,
            Easing.easeInCubic
          );
        },
      }
    );
  }

  // ─── Dynamic Parameter Sliders ─────────────────────────────────────

  _buildParamSliders(attractorKey) {
    const panelWidth = Screen.isMobile ? this.width - 20 : CONFIG.panel.width;
    const padding = Screen.isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
    const sw = panelWidth - padding * 2;

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

      // Wire tooltip on hover
      if (def.tip) {
        slider.on("mouseover", (e) => {
          this._tooltip.show(def.tip, e.x, e.y);
        });
        slider.on("mouseout", () => {
          this._tooltip.hide();
        });
      }

      this._paramsSection.addItem(slider);
      this._paramSliders.push(slider);
    }

    this.panel.commitSection(this._paramsSection);
    this.panel.layout();

    // Push the slider defaults into the simulation so preset-tuned values
    // (e.g. Aizawa e=0.8) take effect immediately instead of requiring the
    // user to nudge the slider to trigger onChange.
    this.updateAttractorParams(this._uiParams);
  }

  // ─── Attractor Change ───────────────────────────────────────────────

  _onAttractorChange(key) {
    const preset = ATTRACTOR_PRESETS[key];
    if (!preset) return;

    // Close dropdown before relayout so getBounds() returns closed height
    this._controls.attractor.close();

    this._activePreset = key;

    // Full attractor swap via base class
    this.switchAttractor(key, { ...preset, maxSegments: CONFIG.maxSegments });

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

    // Fade the info overlay to the new attractor
    this._fadeInfoOverlay(key);

    console.log(`Switched to ${preset.label}`);
  }

  // ─── Renderer Swap ──────────────────────────────────────────────────

  async _onRendererChange(rendererType) {
    if (rendererType === this._activeRenderer) return;
    if (this._switchingRenderer) return;

    this._switchingRenderer = true;
    this._controls.renderer.close();

    // Destroy old pipeline
    this.attractorPipeline?.destroy();

    const cfg = this.config;
    const maxSegments = cfg.maxSegments || cfg.particles.count * cfg.particles.trailLength;
    const pipelineOptions = {
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
    };

    if (rendererType === "webgpu") {
      const pipeline = new WebGPUAttractorPipeline(
        this.width, this.height, maxSegments, pipelineOptions
      );
      const ok = await pipeline.init();
      if (ok) {
        this.attractorPipeline = pipeline;
        this.useWebGL = true; // Flag used by base class to choose WebGL path vs Canvas2D
        this._activeRenderer = "webgpu";
        console.log("Switched to WebGPU renderer");
      } else {
        console.warn("WebGPU init failed, reverting to WebGL");
        this._revertToWebGL(maxSegments, pipelineOptions);
      }
    } else {
      this._revertToWebGL(maxSegments, pipelineOptions);
    }

    this._switchingRenderer = false;
  }

  /** @private Rebuild WebGL pipeline */
  _revertToWebGL(maxSegments, pipelineOptions) {
    const pipeline = new WebGLAttractorPipeline(
      this.width, this.height, maxSegments, pipelineOptions
    );
    const ok = pipeline.init();
    this.attractorPipeline = pipeline;
    this.useWebGL = ok;
    this._activeRenderer = "webgl";
    if (ok) {
      console.log("Switched to WebGL renderer");
    } else {
      console.warn("WebGL init also failed, using Canvas 2D fallback");
    }
  }

  /** @override — skip attractor rendering while switching renderer */
  _renderAttractor() {
    if (this._switchingRenderer) return;
    super._renderAttractor();
  }

  // ─── Reset to Preset Defaults ─────────────────────────────────────

  _resetToDefaults() {
    const preset = ATTRACTOR_PRESETS[this._activePreset];
    if (!preset) return;

    // Re-apply the full preset (reloads from ATTRACTOR_PRESETS, resets all sliders)
    this._onAttractorChange(this._activePreset);

    console.log(`Reset ${preset.label} to defaults`);
  }

  // ─── Resize ─────────────────────────────────────────────────────────

  /** @override */
  onResize() {
    super.onResize(); // Attractor3DDemo resize (pipeline + zoom)
    if (!this.panel) return;

    this._layoutPanel();

    // Update toggle button visibility based on new screen size
    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }

    // On desktop, ensure panel is always visible; on mobile, hide by default
    if (!Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-visible");
    } else if (Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-hidden");
    }

    this._layoutInfoOverlay();
  }
}

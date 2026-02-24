/**
 * Quantum Manifold Playground — Configuration constants.
 *
 * Centralizes all presets, parameter definitions, and configurable values
 * for the quantum manifold demo.
 *
 * @module quantum/quantuman.config
 */

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────────────────────────────────────

/** Wave function presets with default parameters. */
export const MANIFOLD_PRESETS = {
  superposition: {
    label: "Superposition",
    sigma: 1.2,
    k: 5.0,
    omega: 3.0,
    speed: 0.3,
    vx: 0.3,
    vz: 0.2,
    numPackets: 3,
  },
  gaussian: {
    label: "Gaussian Packet",
    sigma: 1.0,
    k: 4.0,
    omega: 2.0,
    vx: 0.5,
    vz: 0.3,
    numPackets: 1,
  },
  doubleSlit: {
    label: "Double Slit",
    sigma: 0.8,
    k: 6.0,
    omega: 3.0,
    slitSeparation: 2.5,
    numPackets: 1,
  },
  standingWave: {
    label: "Standing Wave",
    nx: 3,
    ny: 2,
    omega: 2.0,
    numPackets: 1,
  },
  tunneling: {
    label: "Quantum Tunneling",
    sigma: 0.9,
    k: 5.0,
    omega: 2.5,
    vx: 0.6,
    vz: 0.0,
    barrierHeight: 0.6,
    barrierWidth: 0.8,
    numPackets: 1,
  },
  harmonic: {
    label: "Harmonic Oscillator",
    nx: 2,
    ny: 3,
    sigma: 1.5,
    omega: 2.0,
    numPackets: 1,
  },
};

/** Per-preset parameter definitions for dynamic sliders. */
export const PRESET_PARAMS = {
  superposition: [
    { key: "sigma", label: "SIGMA", default: 1.2, min: 0.3, max: 3.0, step: 0.1 },
    { key: "k", label: "K", default: 5.0, min: 1.0, max: 12.0, step: 0.5 },
    { key: "omega", label: "OMEGA", default: 3.0, min: 0.5, max: 8.0, step: 0.5 },
    { key: "speed", label: "SPEED", default: 0.3, min: 0.1, max: 2.0, step: 0.05 },
    { key: "vx", label: "VELOCITY X", default: 0.3, min: -1.0, max: 1.0, step: 0.05 },
    { key: "vz", label: "VELOCITY Z", default: 0.2, min: -1.0, max: 1.0, step: 0.05 },
  ],
  gaussian: [
    { key: "sigma", label: "SIGMA", default: 1.0, min: 0.3, max: 3.0, step: 0.1 },
    { key: "k", label: "K", default: 4.0, min: 1.0, max: 12.0, step: 0.5 },
    { key: "omega", label: "OMEGA", default: 2.0, min: 0.5, max: 8.0, step: 0.5 },
    { key: "vx", label: "VELOCITY X", default: 0.5, min: -1.0, max: 1.0, step: 0.05 },
    { key: "vz", label: "VELOCITY Z", default: 0.3, min: -1.0, max: 1.0, step: 0.05 },
  ],
  doubleSlit: [
    { key: "sigma", label: "SIGMA", default: 0.8, min: 0.3, max: 3.0, step: 0.1 },
    { key: "k", label: "K", default: 6.0, min: 1.0, max: 12.0, step: 0.5 },
    { key: "omega", label: "OMEGA", default: 3.0, min: 0.5, max: 8.0, step: 0.5 },
    { key: "slitSeparation", label: "SLIT SEP", default: 2.5, min: 0.5, max: 5.0, step: 0.1 },
  ],
  standingWave: [
    { key: "omega", label: "OMEGA", default: 2.0, min: 0.5, max: 8.0, step: 0.5 },
  ],
  tunneling: [
    { key: "sigma", label: "SIGMA", default: 0.9, min: 0.3, max: 3.0, step: 0.1 },
    { key: "k", label: "K", default: 5.0, min: 1.0, max: 12.0, step: 0.5 },
    { key: "omega", label: "OMEGA", default: 2.5, min: 0.5, max: 8.0, step: 0.5 },
    { key: "vx", label: "VELOCITY X", default: 0.6, min: -1.0, max: 1.0, step: 0.05 },
    { key: "barrierHeight", label: "BARRIER H", default: 0.6, min: 0.1, max: 1.5, step: 0.05 },
    { key: "barrierWidth", label: "BARRIER W", default: 0.8, min: 0.2, max: 3.0, step: 0.1 },
  ],
  harmonic: [
    { key: "sigma", label: "SIGMA", default: 1.5, min: 0.5, max: 3.0, step: 0.1 },
    { key: "omega", label: "OMEGA", default: 2.0, min: 0.5, max: 8.0, step: 0.5 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** Main configuration object for the Quantum Manifold demo. */
export const CONFIG = {
  grid: {
    size: 10,        // world units (-size to +size)
    resolution: 50,  // vertices per axis
  },
  surface: {
    amplitude: 4.0,
    wireframe: true,
    wireframeAlpha: 0.35,
    surfaceAlpha: 0.9,
  },
  camera: {
    perspective: 900,
    rotationX: 0.65,
    rotationY: -0.4,
    autoRotate: true,
    autoRotateSpeed: 0.15,
    inertia: true,
    friction: 0.92,
  },
  colors: {
    // Green/cyan palette: deep navy → teal → cyan → neon green
    gradient: [
      { stop: 0.0, color: [0, 8, 20] },       // deep navy
      { stop: 0.2, color: [0, 30, 60] },       // dark teal
      { stop: 0.4, color: [0, 80, 100] },      // teal
      { stop: 0.6, color: [0, 180, 180] },     // cyan
      { stop: 0.8, color: [0, 255, 200] },     // bright cyan-green
      { stop: 1.0, color: [80, 255, 120] },    // neon green
    ],
    wireColor: "rgba(0, 255, 200, 0.25)",
    background: "#000810",
    // Gravity well rendering
    wellGlow: "rgba(255, 60, 40, 0.6)",
    wellRing: "rgba(255, 100, 60, 0.8)",
  },
  crossSection: {
    enabled: true,
    height: 80,
    marginBottom: 30,
    waveColor: "#00ffcc",
    envelopeColor: "rgba(0, 200, 180, 0.3)",
  },
  collapse: {
    holdTime: 300,
    dragThreshold: 8,
    duration: 800,
  },
  zoom: {
    min: 0.1,
    max: 6.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },
  panel: {
    width: 280,
    padding: 14,
    marginRight: 16,
    marginTop: 16,
    spacing: 10,
    mobilePadding: 12,
    mobileMaxHeight: 0.85,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  toggle: {
    margin: 12,
    width: 44,
    height: 44,
  },
  // Quantum gravity wells
  gravity: {
    enabled: true,
    wellDepth: 6.0,       // max depth of well (world units of Y displacement)
    wellWidth: 2.5,       // sigma of Gaussian well
    pulseSpeed: 1.5,      // breathing animation speed
    pulseAmount: 0.08,    // how much the well breathes (0-1)
    maxWells: 5,
  },
  timeScale: 1.0,
  hueShift: 0,
};

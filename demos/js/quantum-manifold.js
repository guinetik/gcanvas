/**
 * Quantum Manifold Playground
 *
 * 3D mesh surface deformed by quantum wave functions with interactive
 * controls. NxN vertex grid, height = |Psi(x,z,t)|^2, rendered as
 * depth-sorted filled quads with height-mapped colors and wireframe overlay.
 *
 * Quantum gravity wells can be added that pull the mesh downward,
 * creating dramatic interference between quantum probability and
 * curved spacetime geometry.
 *
 * Uses Camera3D for 3D projection, AccordionGroup for UI panel,
 * and CPU-computed 2D quantum wave functions.
 */

import {
  Game,
  Painter,
  Camera3D,
  Text,
  applyAnchor,
  Position,
  Scene,
  verticalLayout,
  applyLayout,
  Screen,
  Gesture,
  FPSCounter,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  Stepper,
  AccordionGroup,
} from "../../src/index.js";
import { Complex } from "../../src/math/complex.js";
import { StateMachine } from "../../src/state/state-machine.js";

// ─────────────────────────────────────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────────────────────────────────────

const MANIFOLD_PRESETS = {
  superposition: {
    label: "Superposition",
    sigma: 1.2,
    k: 5.0,
    omega: 3.0,
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

// Per-preset parameter definitions for dynamic sliders
const PRESET_PARAMS = {
  superposition: [
    { key: "sigma", label: "SIGMA", default: 1.2, min: 0.3, max: 3.0, step: 0.1 },
    { key: "k", label: "K", default: 5.0, min: 1.0, max: 12.0, step: 0.5 },
    { key: "omega", label: "OMEGA", default: 3.0, min: 0.5, max: 8.0, step: 0.5 },
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

const CONFIG = {
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

// ─────────────────────────────────────────────────────────────────────────────
// QUANTUM MANIFOLD PLAYGROUND
// ─────────────────────────────────────────────────────────────────────────────

export class QuantumManifoldPlayground extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.background;
    this.enableFluidSize();
  }

  // ─── Init ────────────────────────────────────────────────────────────

  init() {
    super.init();
    this.time = 0;
    this._activePreset = "superposition";
    this._waveParams = { ...MANIFOLD_PRESETS.superposition };
    this._updatingSliders = false;

    // Gravity wells array: { x, z, mass }
    this._gravityWells = [];

    Screen.init(this);
    this._initZoom();
    this._initCamera();
    this._initGrid();
    this._initCollapse();
    this._initGestures();
    this._crossSectionVisible = true;
    this._buildInfoPanel();
    this._buildUI();
    this._buildToggleButton();
    this._initPanelStateMachine();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    // Pre-generate superposition packet directions
    this._superPackets = this._generateSuperPackets(
      this._waveParams.numPackets || 3
    );
    // Pre-generate standing wave quantum numbers
    this._standingNx = this._waveParams.nx || 3;
    this._standingNy = this._waveParams.ny || 2;
    // Hermite quantum numbers
    this._hermiteNx = this._waveParams.nx || 2;
    this._hermiteNy = this._waveParams.ny || 3;
  }

  _initZoom() {
    const initialZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;
  }

  _initCamera() {
    this.camera = new Camera3D({
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      perspective: CONFIG.camera.perspective,
      clampX: false,
      autoRotate: CONFIG.camera.autoRotate,
      autoRotateSpeed: CONFIG.camera.autoRotateSpeed,
      autoRotateAxis: "y",
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      velocityScale: 1.2,
    });
    this.camera.enableMouseControl(this.canvas);
  }

  _initGrid() {
    const { size, resolution } = CONFIG.grid;
    const n = resolution + 1;
    this.gridVertices = new Array(n);
    for (let i = 0; i < n; i++) {
      this.gridVertices[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        const x = (i / resolution - 0.5) * 2 * size;
        const z = (j / resolution - 0.5) * 2 * size;
        this.gridVertices[i][j] = { x, y: 0, z, height: 0, gravityDip: 0 };
      }
    }
  }

  _initCollapse() {
    this.isCollapsed = false;
    this.collapseAmount = 0;
    this.collapseX = 0;
    this.collapseZ = 0;
    this.collapseTimer = null;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
  }

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(
          CONFIG.zoom.min,
          Math.min(CONFIG.zoom.max, this.targetZoom)
        );
      },
      onPan: null,
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.camera.reset();
    });

    // Collapse interaction (hold without dragging)
    const startCollapse = (x, y) => {
      this.pointerStartX = x;
      this.pointerStartY = y;
      this.collapseTimer = setTimeout(() => {
        if (!this.isCollapsed) this._collapse();
      }, CONFIG.collapse.holdTime);
    };

    const checkDrag = (x, y) => {
      const dx = Math.abs(x - this.pointerStartX);
      const dy = Math.abs(y - this.pointerStartY);
      if (dx > CONFIG.collapse.dragThreshold || dy > CONFIG.collapse.dragThreshold) {
        this._cancelCollapse();
      }
    };

    const endCollapse = () => {
      this._cancelCollapse();
      this.isCollapsed = false;
    };

    this.canvas.addEventListener("mousedown", (e) => startCollapse(e.clientX, e.clientY));
    this.canvas.addEventListener("mousemove", (e) => checkDrag(e.clientX, e.clientY));
    this.canvas.addEventListener("mouseup", endCollapse);
    this.canvas.addEventListener("mouseleave", endCollapse);
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1)
        startCollapse(e.touches[0].clientX, e.touches[0].clientY);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1)
        checkDrag(e.touches[0].clientX, e.touches[0].clientY);
      else this._cancelCollapse();
    });
    this.canvas.addEventListener("touchend", endCollapse);
    this.canvas.addEventListener("touchcancel", endCollapse);
  }

  _collapse() {
    this.isCollapsed = true;
    const s = CONFIG.grid.size * 0.6;
    this.collapseX = (Math.random() - 0.5) * 2 * s;
    this.collapseZ = (Math.random() - 0.5) * 2 * s;
  }

  _cancelCollapse() {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }

  // ─── Gravity Wells ───────────────────────────────────────────────────

  _addRandomWell() {
    if (this._gravityWells.length >= CONFIG.gravity.maxWells) return;
    const s = CONFIG.grid.size * 0.6;
    this._gravityWells.push({
      x: (Math.random() - 0.5) * 2 * s,
      z: (Math.random() - 0.5) * 2 * s,
      mass: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  _clearWells() {
    this._gravityWells = [];
  }

  /**
   * Compute total gravity well depth at (x, z) using Gaussian profile.
   * Positive return = depth of downward pull.
   */
  _computeGravityAt(x, z) {
    if (!CONFIG.gravity.enabled || this._gravityWells.length === 0) return 0;

    const sigma = CONFIG.gravity.wellWidth;
    const baseDepth = CONFIG.gravity.wellDepth;
    let total = 0;

    for (const well of this._gravityWells) {
      const dx = x - well.x;
      const dz = z - well.z;
      const r2 = dx * dx + dz * dz;
      const pulse = 1 + CONFIG.gravity.pulseAmount *
        Math.sin(this.time * CONFIG.gravity.pulseSpeed + well.phase);
      const depth = baseDepth * Math.sqrt(well.mass) * pulse;
      const s = sigma * Math.sqrt(well.mass);
      total += depth * Math.exp(-r2 / (2 * s * s));
    }
    return total;
  }

  // ─── Info Panel ──────────────────────────────────────────────────────

  _buildInfoPanel() {
    this.infoPanel = new Scene(this, { x: 0, y: 0, origin: "center" });
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_CENTER,
      anchorOffsetY: Screen.isMobile ? 70 : 150,
    });
    this.pipeline.add(this.infoPanel);

    this.titleText = new Text(this, "Quantum Manifold", {
      font: "bold 16px monospace",
      color: "#0ff",
      align: "center",
      baseline: "middle",
      origin: "center",
    });

    this.equationText = new Text(
      this,
      "\u03A8(x,z,t) = A\u00B7e^(-r\u00B2/4\u03C3\u00B2)\u00B7e^(i(k\u00B7r-\u03C9t))  +  \u03A6(r) = -GM/r",
      {
        font: "12px monospace",
        color: "#888",
        align: "center",
        baseline: "middle",
        origin: "center",
      }
    );

    this.statsText = new Text(this, "Superposition | 3 packets | 0 wells", {
      font: "12px monospace",
      color: "#6d8",
      align: "center",
      baseline: "middle",
      origin: "center",
    });

    const textItems = [this.titleText, this.equationText, this.statsText];
    const layout = verticalLayout(textItems, { spacing: 18, align: "center" });
    applyLayout(textItems, layout.positions);
    textItems.forEach((item) => this.infoPanel.add(item));
  }

  // ─── UI Panel ────────────────────────────────────────────────────────

  _buildUI() {
    const isMobile = Screen.isMobile;
    const panelWidth = isMobile
      ? this.width - 20
      : CONFIG.panel.width;
    const padding = isMobile
      ? CONFIG.panel.mobilePadding
      : CONFIG.panel.padding;
    const { spacing } = CONFIG.panel;

    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing,
      headerHeight: 28,
      debug: true,
      debugColor: "rgba(0, 255, 0, 0.18)",
    });
    this.pipeline.add(this.panel);

    // Semi-transparent background
    const originalDraw = this.panel.draw.bind(this.panel);
    this.panel.draw = () => {
      Painter.shapes.rect(
        0, 0,
        this.panel._width, this.panel._height,
        CONFIG.panel.backgroundColor
      );
      originalDraw();
    };

    // Reposition panel when sections expand/collapse (bottom-anchor on mobile)
    const originalLayout = this.panel.layout.bind(this.panel);
    this.panel.layout = () => {
      originalLayout();
      this._layoutPanel();
    };

    this._layoutPanel();

    const sw = panelWidth - padding * 2;
    this._controls = {};

    // Preset dropdown (top-level, not in a section)
    const presetOptions = Object.entries(MANIFOLD_PRESETS).map(
      ([key, preset]) => ({ label: preset.label, value: key })
    );
    this._controls.preset = new Dropdown(this, {
      label: "WAVE FUNCTION",
      width: sw,
      options: presetOptions,
      value: this._activePreset,
      onChange: (v) => this._onPresetChange(v),
    });
    this.panel.addItem(this._controls.preset);

    // Parameters section (dynamic, rebuilt per preset)
    this._paramsSection = this.panel.addSection("Parameters", { expanded: !Screen.isMobile });
    this._paramSliders = [];
    this._buildParamSliders(this._activePreset);

    // Surface section
    const surface = this.panel.addSection("Surface", { expanded: false });

    this._controls.amplitude = new Slider(this, {
      label: "AMPLITUDE",
      width: sw,
      min: 0.5,
      max: 10.0,
      value: CONFIG.surface.amplitude,
      step: 0.5,
      formatValue: (v) => v.toFixed(1),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.surface.amplitude = v;
      },
    });
    surface.addItem(this._controls.amplitude);

    this._controls.gridRes = new Stepper(this, {
      label: "GRID RES",
      value: CONFIG.grid.resolution,
      min: 20,
      max: 80,
      step: 10,
      buttonSize: 32,
      valueWidth: 60,
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.grid.resolution = v;
        this._initGrid();
      },
    });
    surface.addItem(this._controls.gridRes);

    this._controls.wireframe = new ToggleButton(this, {
      text: "Wireframe",
      width: 100,
      height: 30,
      startToggled: CONFIG.surface.wireframe,
      onToggle: (on) => {
        CONFIG.surface.wireframe = on;
      },
    });
    surface.addItem(this._controls.wireframe);

    // Gravity section
    const gravity = this.panel.addSection("Quantum Gravity", { expanded: !Screen.isMobile });

    this._controls.gravityToggle = new ToggleButton(this, {
      text: "Gravity",
      width: 80,
      height: 30,
      startToggled: CONFIG.gravity.enabled,
      onToggle: (on) => {
        CONFIG.gravity.enabled = on;
      },
    });
    gravity.addItem(this._controls.gravityToggle);

    this._controls.wellDepth = new Slider(this, {
      label: "WELL DEPTH",
      width: sw,
      min: 1.0,
      max: 15.0,
      value: CONFIG.gravity.wellDepth,
      step: 0.5,
      formatValue: (v) => v.toFixed(1),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.gravity.wellDepth = v;
      },
    });
    gravity.addItem(this._controls.wellDepth);

    this._controls.wellWidth = new Slider(this, {
      label: "WELL WIDTH",
      width: sw,
      min: 0.5,
      max: 6.0,
      value: CONFIG.gravity.wellWidth,
      step: 0.1,
      formatValue: (v) => v.toFixed(1),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.gravity.wellWidth = v;
      },
    });
    gravity.addItem(this._controls.wellWidth);

    this._controls.addWell = new Button(this, {
      text: "Add Gravity Well",
      width: sw,
      height: 32,
      onClick: () => this._addRandomWell(),
    });
    gravity.addItem(this._controls.addWell);

    this._controls.clearWells = new Button(this, {
      text: "Clear Wells",
      width: sw,
      height: 32,
      onClick: () => this._clearWells(),
    });
    gravity.addItem(this._controls.clearWells);

    // View section
    const view = this.panel.addSection("View", { expanded: false });

    this._controls.autoRotate = new ToggleButton(this, {
      text: "Auto-Rotate",
      width: 110,
      height: 30,
      startToggled: CONFIG.camera.autoRotate,
      onToggle: (on) => {
        this.camera.autoRotate = on;
      },
    });
    view.addItem(this._controls.autoRotate);

    this._controls.rotSpeed = new Slider(this, {
      label: "ROTATION SPEED",
      width: sw,
      min: 0.01,
      max: 0.5,
      value: CONFIG.camera.autoRotateSpeed,
      step: 0.01,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.camera.autoRotateSpeed = v;
      },
    });
    view.addItem(this._controls.rotSpeed);

    this._controls.timeScale = new Slider(this, {
      label: "TIME SCALE",
      width: sw,
      min: 0.0,
      max: 3.0,
      value: CONFIG.timeScale,
      step: 0.1,
      formatValue: (v) => v.toFixed(1),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.timeScale = v;
      },
    });
    view.addItem(this._controls.timeScale);

    this._controls.crossSection = new ToggleButton(this, {
      text: "Cross-Section",
      width: 120,
      height: 30,
      startToggled: CONFIG.crossSection.enabled,
      onToggle: (on) => {
        CONFIG.crossSection.enabled = on;
      },
    });
    view.addItem(this._controls.crossSection);

    // Collapse + restart buttons (top-level)
    this._controls.collapseBtn = new Button(this, {
      text: "Collapse Wave",
      width: sw,
      height: 32,
      onClick: () => {
        if (!this.isCollapsed) {
          this._collapse();
          setTimeout(() => {
            this.isCollapsed = false;
          }, CONFIG.collapse.duration);
        }
      },
    });
    this.panel.addItem(this._controls.collapseBtn);

    this._controls.reset = new Button(this, {
      text: "Reset Defaults",
      width: sw,
      height: 32,
      onClick: () => this._resetToDefaults(),
    });
    this.panel.addItem(this._controls.reset);

    this._controls.restart = new Button(this, {
      text: "Restart",
      width: sw,
      height: 32,
      onClick: () => {
        // Restart simulation with current params (don't reset sliders)
        this.time = 0;
        this.isCollapsed = false;
        this.collapseAmount = 0;
        this._clearWells();
        if (this._activePreset === "superposition") {
          this._superPackets = this._generateSuperPackets(
            this._waveParams.numPackets || 3
          );
        }
      },
    });
    this.panel.addItem(this._controls.restart);

    // Store section refs for exclusive mobile behavior
    this._sections = [this._paramsSection, surface, gravity, view];
    if (Screen.isMobile) {
      this._setupExclusiveSections();
    }

    this.panel.layoutAll();
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
            // On mobile, show cross-section when panel is hidden
            if (Screen.isMobile) {
              this._crossSectionVisible = true;
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
            // On mobile, hide cross-section when panel is visible
            if (Screen.isMobile) {
              this._crossSectionVisible = false;
            }
          },
        },
      },
    });
  }

  _togglePanel() {
    if (this._panelFSM.is("panel-hidden")) {
      this._panelFSM.setState("panel-visible");
    } else {
      this._panelFSM.setState("panel-hidden");
    }
  }

  _setupExclusiveSections() {
    const origToggles = new Map();
    for (const section of this._sections) {
      origToggles.set(section, section.toggle.bind(section));
    }
    for (const section of this._sections) {
      section.toggle = (force) => {
        const willExpand = force !== undefined ? force : !section.expanded;
        if (willExpand) {
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

  _layoutPanel() {
    if (!this.panel) return;
    if (Screen.isMobile) {
      // Bottom sheet: full width - 20px, anchored to bottom
      const panelH = this.panel._height || 300;
      const maxH = this.height * CONFIG.panel.mobileMaxHeight;
      const clampedH = Math.min(panelH, maxH);
      this.panel.x = 10;
      this.panel.y = this.height - clampedH - 10;
    } else {
      // Desktop: right sidebar
      this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
      this.panel.y = CONFIG.panel.marginTop;
    }
  }

  _buildParamSliders(presetKey) {
    const panelWidth = Screen.isMobile
      ? this.width - 20
      : CONFIG.panel.width;
    const padding = Screen.isMobile
      ? CONFIG.panel.mobilePadding
      : CONFIG.panel.padding;
    const sw = panelWidth - padding * 2;

    if (this._paramSliders.length > 0) {
      this.panel.clearSection(this._paramsSection);
      this._paramSliders = [];
    }

    const paramDefs = PRESET_PARAMS[presetKey];
    if (!paramDefs) return;

    // Stepper for numPackets (superposition only)
    if (presetKey === "superposition") {
      const stepper = new Stepper(this, {
        label: "PACKETS",
        value: this._waveParams.numPackets || 3,
        min: 2,
        max: 8,
        step: 1,
        buttonSize: 32,
        valueWidth: 60,
        onChange: (v) => {
          if (this._updatingSliders) return;
          this._waveParams.numPackets = v;
          this._superPackets = this._generateSuperPackets(v);
        },
      });
      this._paramsSection.addItem(stepper);
      this._paramSliders.push(stepper);
    }

    // Steppers for standing wave / harmonic quantum numbers
    if (presetKey === "standingWave" || presetKey === "harmonic") {
      const nxStepper = new Stepper(this, {
        label: "N (x)",
        value: this._waveParams.nx || (presetKey === "harmonic" ? 2 : 3),
        min: 1,
        max: 6,
        step: 1,
        buttonSize: 32,
        valueWidth: 60,
        onChange: (v) => {
          if (this._updatingSliders) return;
          this._waveParams.nx = v;
          if (presetKey === "standingWave") this._standingNx = v;
          else this._hermiteNx = v;
        },
      });
      this._paramsSection.addItem(nxStepper);
      this._paramSliders.push(nxStepper);

      const nyStepper = new Stepper(this, {
        label: "M (z)",
        value: this._waveParams.ny || (presetKey === "harmonic" ? 3 : 2),
        min: 1,
        max: 6,
        step: 1,
        buttonSize: 32,
        valueWidth: 60,
        onChange: (v) => {
          if (this._updatingSliders) return;
          this._waveParams.ny = v;
          if (presetKey === "standingWave") this._standingNy = v;
          else this._hermiteNy = v;
        },
      });
      this._paramsSection.addItem(nyStepper);
      this._paramSliders.push(nyStepper);
    }

    for (const def of paramDefs) {
      const decimals = def.step >= 1 ? 0 : def.step >= 0.1 ? 1 : 2;
      const slider = new Slider(this, {
        label: def.label,
        width: sw,
        min: def.min,
        max: def.max,
        value: def.default,
        step: def.step,
        formatValue: (v) => v.toFixed(decimals),
        onChange: (v) => {
          if (this._updatingSliders) return;
          this._waveParams[def.key] = v;
        },
      });
      this._paramsSection.addItem(slider);
      this._paramSliders.push(slider);
    }

    this.panel.commitSection(this._paramsSection);
    this.panel.layout();
  }

  _onPresetChange(key) {
    const preset = MANIFOLD_PRESETS[key];
    if (!preset) return;

    this._controls.preset.close();
    this._activePreset = key;
    this._waveParams = { ...preset };
    this.time = 0;
    this.isCollapsed = false;
    this.collapseAmount = 0;

    if (key === "superposition") {
      this._superPackets = this._generateSuperPackets(preset.numPackets || 3);
    }
    if (key === "standingWave") {
      this._standingNx = preset.nx || 3;
      this._standingNy = preset.ny || 2;
    }
    if (key === "harmonic") {
      this._hermiteNx = preset.nx || 2;
      this._hermiteNy = preset.ny || 3;
    }

    this._updateStatsText();
    this._buildParamSliders(key);
  }

  _resetToDefaults() {
    this._onPresetChange(this._activePreset);
  }

  _updateStatsText() {
    if (!this.statsText) return;
    const preset = MANIFOLD_PRESETS[this._activePreset];
    const wellCount = this._gravityWells.length;
    const wellStr = wellCount > 0 ? ` | ${wellCount} well${wellCount > 1 ? "s" : ""}` : "";
    if (this._activePreset === "superposition") {
      this.statsText.text = `${preset.label} | ${this._waveParams.numPackets || 3} packets${wellStr}`;
    } else {
      this.statsText.text = `${preset.label} | t=${this.time.toFixed(1)}s${wellStr}`;
    }
  }

  // ─── Wave Functions ──────────────────────────────────────────────────

  /**
   * Wrap a displacement into [-size, +size] for periodic boundary conditions.
   * Packets that leave one side of the grid re-enter from the other.
   */
  _wrapDelta(d) {
    const size = CONFIG.grid.size;
    const range = 2 * size;
    // Modular wrap to [-size, size]
    return ((((d + size) % range) + range) % range) - size;
  }

  _gaussianPacket2D(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 1.0;
    const k = p.k || 4.0;
    const omega = p.omega || 2.0;
    const vx = p.vx || 0;
    const vz = p.vz || 0;

    const dx = this._wrapDelta(x - vx * t);
    const dz = this._wrapDelta(z - vz * t);
    const r2 = dx * dx + dz * dz;
    const envelope = Math.exp(-r2 / (4 * sigma * sigma));
    const phase = k * x + k * 0.5 * z - omega * t;
    return Complex.fromPolar(envelope, phase);
  }

  _doubleSlit(x, z, t) {
    const p = this._waveParams;
    const d = (p.slitSeparation || 2.5) / 2;
    const sigma = p.sigma || 0.8;
    const k = p.k || 6.0;
    const omega = p.omega || 3.0;

    const r1sq = (x - d) * (x - d) + z * z;
    const r2sq = (x + d) * (x + d) + z * z;
    const r1 = Math.sqrt(r1sq);
    const r2 = Math.sqrt(r2sq);

    const env1 = Math.exp(-r1sq / (4 * sigma * sigma));
    const env2 = Math.exp(-r2sq / (4 * sigma * sigma));

    const psi1 = Complex.fromPolar(env1, k * r1 - omega * t);
    const psi2 = Complex.fromPolar(env2, k * r2 - omega * t);
    return psi1.add(psi2);
  }

  _standingWave(x, z, t) {
    const p = this._waveParams;
    const nx = this._standingNx;
    const ny = this._standingNy;
    const omega = p.omega || 2.0;
    const L = CONFIG.grid.size;

    const valX = Math.sin((nx * Math.PI * (x + L)) / (2 * L));
    const valZ = Math.sin((ny * Math.PI * (z + L)) / (2 * L));
    const amplitude = valX * valZ;
    const phase = -omega * t;
    return Complex.fromPolar(amplitude, phase);
  }

  _generateSuperPackets(n) {
    const packets = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + 0.3;
      packets.push({
        kx: Math.cos(angle) * (3 + i * 1.5),
        kz: Math.sin(angle) * (3 + i * 1.5),
        vx: Math.cos(angle) * 0.3,
        vz: Math.sin(angle) * 0.3,
        phase: i * 1.2,
      });
    }
    return packets;
  }

  _superposition(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 1.2;
    const omega = p.omega || 3.0;
    const packets = this._superPackets;

    let result = new Complex(0, 0);
    for (const pkt of packets) {
      const dx = this._wrapDelta(x - pkt.vx * t);
      const dz = this._wrapDelta(z - pkt.vz * t);
      const r2 = dx * dx + dz * dz;
      const envelope = Math.exp(-r2 / (4 * sigma * sigma));
      const phase = pkt.kx * x + pkt.kz * z - omega * t + pkt.phase;
      result = result.add(Complex.fromPolar(envelope, phase));
    }
    return result.scale(1 / packets.length);
  }

  _tunneling(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 0.9;
    const k = p.k || 5.0;
    const omega = p.omega || 2.5;
    const vx = p.vx || 0.6;
    const bH = p.barrierHeight || 0.6;
    const bW = p.barrierWidth || 0.8;

    const dx = this._wrapDelta(x - vx * t);
    const r2 = dx * dx + z * z;
    const envelope = Math.exp(-r2 / (4 * sigma * sigma));

    let transmission = 1.0;
    if (Math.abs(x) < bW) {
      const kappa = Math.sqrt(Math.max(0, 2 * bH - k * k * 0.01));
      transmission = Math.exp(-2 * kappa * bW) * 0.5 + 0.5;
    }

    let reflectionPhase = 0;
    if (x < -bW && vx * t > 0) {
      reflectionPhase = Math.PI;
    }

    const phase = k * x - omega * t + reflectionPhase;
    return Complex.fromPolar(envelope * transmission, phase);
  }

  _hermitePolynomial(n, x) {
    switch (n) {
      case 1: return 1;
      case 2: return 2 * x;
      case 3: return 4 * x * x - 2;
      case 4: return 8 * x * x * x - 12 * x;
      case 5: return 16 * x * x * x * x - 48 * x * x + 12;
      case 6: return 32 * x * x * x * x * x - 160 * x * x * x + 120 * x;
      default: return 1;
    }
  }

  _harmonicOscillator(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 1.5;
    const omega = p.omega || 2.0;
    const nx = this._hermiteNx;
    const ny = this._hermiteNy;

    const xn = x / sigma;
    const zn = z / sigma;
    const hx = this._hermitePolynomial(nx, xn);
    const hz = this._hermitePolynomial(ny, zn);
    const gauss = Math.exp(-(xn * xn + zn * zn) / 2);
    const amplitude = hx * hz * gauss;
    const phase = -omega * t * (nx + ny);
    return Complex.fromPolar(amplitude, phase);
  }

  _computeWave(x, z, t) {
    switch (this._activePreset) {
      case "gaussian":
        return this._gaussianPacket2D(x, z, t);
      case "doubleSlit":
        return this._doubleSlit(x, z, t);
      case "standingWave":
        return this._standingWave(x, z, t);
      case "superposition":
        return this._superposition(x, z, t);
      case "tunneling":
        return this._tunneling(x, z, t);
      case "harmonic":
        return this._harmonicOscillator(x, z, t);
      default:
        return this._gaussianPacket2D(x, z, t);
    }
  }

  // ─── Color Helpers ───────────────────────────────────────────────────

  _heightColor(t) {
    const grad = CONFIG.colors.gradient;

    let i = 0;
    while (i < grad.length - 1 && grad[i + 1].stop < t) i++;
    if (i >= grad.length - 1) i = grad.length - 2;

    const lo = grad[i];
    const hi = grad[i + 1];
    const range = hi.stop - lo.stop;
    const f = range > 0 ? (t - lo.stop) / range : 0;

    const r = Math.floor(lo.color[0] + (hi.color[0] - lo.color[0]) * f);
    const g = Math.floor(lo.color[1] + (hi.color[1] - lo.color[1]) * f);
    const b = Math.floor(lo.color[2] + (hi.color[2] - lo.color[2]) * f);

    return [r, g, b];
  }

  /**
   * Color for gravity-pulled areas: blends toward warm red/orange
   * based on how deep the gravity well pulls.
   */
  _gravityColor(normalizedDip) {
    const t = Math.min(1, normalizedDip);
    const r = Math.floor(20 + 235 * t);
    const g = Math.floor(60 * (1 - t * 0.5));
    const b = Math.floor(40 * (1 - t));
    return [r, g, b];
  }

  // ─── Projection ──────────────────────────────────────────────────────

  _project3D(x, y, z) {
    const proj = this.camera.project(x, y, z);
    return {
      x: proj.x * this.zoom,
      y: proj.y * this.zoom,
      z: proj.z,
      scale: proj.scale * this.zoom,
    };
  }

  // ─── Update ──────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);
    this.time += dt * CONFIG.timeScale;
    this.camera.update(dt);

    // Ease zoom
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;

    // Animate collapse
    const targetCollapse = this.isCollapsed ? 1 : 0;
    this.collapseAmount += (targetCollapse - this.collapseAmount) * 0.12;

    // Compute wave function + gravity for all vertices
    this._evolveWaveFunction();

    this._updateStatsText();
  }

  _evolveWaveFunction() {
    const { resolution } = CONFIG.grid;
    const n = resolution + 1;
    const amplitude = CONFIG.surface.amplitude;
    const collapse = this.collapseAmount;
    const t = this.time;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = this.gridVertices[i][j];
        const psi = this._computeWave(v.x, v.z, t);
        let probDensity = psi.real * psi.real + psi.imag * psi.imag;

        // Collapse: spike at collapse point
        if (collapse > 0.01) {
          const cdx = v.x - this.collapseX;
          const cdz = v.z - this.collapseZ;
          const cr2 = cdx * cdx + cdz * cdz;
          const collapsedProb = Math.exp(-cr2 / 0.3);
          probDensity = probDensity * (1 - collapse) + collapsedProb * collapse;
        }

        // Gravity well deformation (pulls mesh downward)
        const gravityDip = this._computeGravityAt(v.x, v.z);
        v.gravityDip = gravityDip;

        v.height = probDensity;
        // Net Y: quantum probability pushes UP, gravity pulls DOWN
        v.y = probDensity * amplitude - gravityDip;
      }
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2 + 30;

    // Manual render order: clear -> surface -> pipeline (UI on top)
    Painter.setContext(this.ctx);
    if (this.running) this.clear();

    this._renderBackground(w, h);
    this._renderSurface(cx, cy);
    this._renderGravityWellMarkers(cx, cy);
    if (CONFIG.crossSection.enabled && this._crossSectionVisible) {
      this._renderCrossSection(w, h);
    }
    this._renderControls(w, h);

    // Pipeline renders UI (accordion panel, info text, FPS) on top
    this.pipeline.render();
  }

  _renderBackground(w, h) {
    Painter.useCtx((ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#000810");
      grad.addColorStop(0.5, "#001018");
      grad.addColorStop(1, "#000408");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  _renderSurface(cx, cy) {
    const { resolution } = CONFIG.grid;
    const n = resolution + 1;
    const gridScale = 15;

    // Project all vertices
    const projected = new Array(n);
    for (let i = 0; i < n; i++) {
      projected[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        const v = this.gridVertices[i][j];
        const p = this._project3D(
          v.x * gridScale,
          -v.y * gridScale * 0.5,
          v.z * gridScale
        );
        projected[i][j] = {
          x: cx + p.x,
          y: cy + p.y,
          z: p.z,
          height: v.height,
          gravityDip: v.gravityDip,
        };
      }
    }

    // Build quads and sort back-to-front
    const quads = [];
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const p00 = projected[i][j];
        const p10 = projected[i + 1][j];
        const p11 = projected[i + 1][j + 1];
        const p01 = projected[i][j + 1];
        const avgZ = (p00.z + p10.z + p11.z + p01.z) * 0.25;
        const avgH = (p00.height + p10.height + p11.height + p01.height) * 0.25;
        const avgDip = (p00.gravityDip + p10.gravityDip + p11.gravityDip + p01.gravityDip) * 0.25;
        quads.push({ p00, p10, p11, p01, avgZ, avgH, avgDip });
      }
    }

    quads.sort((a, b) => a.avgZ - b.avgZ);

    // Find max height for normalization
    let maxH = 0;
    let maxDip = 0;
    for (const q of quads) {
      if (q.avgH > maxH) maxH = q.avgH;
      if (q.avgDip > maxDip) maxDip = q.avgDip;
    }
    if (maxH < 0.001) maxH = 1;
    if (maxDip < 0.001) maxDip = 1;

    // Render filled quads
    Painter.useCtx((ctx) => {
      for (const q of quads) {
        const t = Math.min(1, q.avgH / maxH);
        const dipT = Math.min(1, q.avgDip / maxDip);

        // Blend between quantum color (green/cyan) and gravity color (red/orange)
        const [qr, qg, qb] = this._heightColor(t);
        if (dipT > 0.05) {
          const [gr, gg, gb] = this._gravityColor(dipT);
          const blend = dipT * 0.7; // how much gravity takes over
          const r = Math.floor(qr * (1 - blend) + gr * blend);
          const g = Math.floor(qg * (1 - blend) + gg * blend);
          const b = Math.floor(qb * (1 - blend) + gb * blend);
          ctx.fillStyle = `rgba(${r},${g},${b},${CONFIG.surface.surfaceAlpha})`;
        } else {
          ctx.fillStyle = `rgba(${qr},${qg},${qb},${CONFIG.surface.surfaceAlpha})`;
        }

        ctx.beginPath();
        ctx.moveTo(q.p00.x, q.p00.y);
        ctx.lineTo(q.p10.x, q.p10.y);
        ctx.lineTo(q.p11.x, q.p11.y);
        ctx.lineTo(q.p01.x, q.p01.y);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Render wireframe
    if (CONFIG.surface.wireframe) {
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = CONFIG.colors.wireColor;
        ctx.lineWidth = 0.5;

        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          for (let j = 0; j < n; j++) {
            const p = projected[i][j];
            if (j === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }

        for (let j = 0; j < n; j++) {
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const p = projected[i][j];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      });
    }
  }

  /**
   * Render glowing markers at gravity well positions.
   */
  _renderGravityWellMarkers(cx, cy) {
    if (!CONFIG.gravity.enabled || this._gravityWells.length === 0) return;

    const gridScale = 15;

    for (const well of this._gravityWells) {
      // Get the well's depth at its own center for vertical placement
      const dip = this._computeGravityAt(well.x, well.z);
      const quantumH = (() => {
        const psi = this._computeWave(well.x, well.z, this.time);
        return (psi.real * psi.real + psi.imag * psi.imag) * CONFIG.surface.amplitude;
      })();
      const netY = quantumH - dip;

      const p = this._project3D(
        well.x * gridScale,
        -netY * gridScale * 0.5,
        well.z * gridScale
      );

      const sx = cx + p.x;
      const sy = cy + p.y;
      const size = (4 + well.mass * 4) * p.scale;
      const pulse = 0.8 + 0.2 * Math.sin(this.time * 2 + well.phase);

      // Glow
      Painter.useCtx((ctx) => {
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3 * pulse);
        gradient.addColorStop(0, CONFIG.colors.wellGlow);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // Core
      Painter.useCtx((ctx) => {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = CONFIG.colors.wellRing;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  _renderCrossSection(w, h) {
    const cs = CONFIG.crossSection;
    const plotY = h - cs.marginBottom - cs.height;
    const plotH = cs.height;
    const plotW = w * 0.6;
    const plotX = (w - plotW) / 2;
    const { size } = CONFIG.grid;
    const numSamples = 200;

    // Sample wave function along z=0, including gravity
    const samples = [];
    let maxProb = 0;
    for (let i = 0; i < numSamples; i++) {
      const x = (i / (numSamples - 1) - 0.5) * 2 * size;
      const psi = this._computeWave(x, 0, this.time);
      const prob = psi.real * psi.real + psi.imag * psi.imag;
      const re = psi.real;
      const grav = this._computeGravityAt(x, 0);
      samples.push({ x, prob, re, grav });
      if (prob > maxProb) maxProb = prob;
    }
    if (maxProb < 0.001) maxProb = 1;

    // Find max gravity for normalization
    let maxGrav = 0;
    for (const s of samples) {
      if (s.grav > maxGrav) maxGrav = s.grav;
    }

    // Background
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "rgba(0, 8, 16, 0.7)";
      ctx.fillRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);
      ctx.strokeStyle = "rgba(0, 200, 180, 0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);
    });

    // Draw gravity well dip (inverted, shown as red area below baseline)
    if (maxGrav > 0.01) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = "rgba(255, 60, 40, 0.2)";
        ctx.beginPath();
        ctx.moveTo(plotX, plotY + plotH / 2);
        for (let i = 0; i < numSamples; i++) {
          const sx = plotX + (i / (numSamples - 1)) * plotW;
          const sy = plotY + plotH / 2 + (samples[i].grav / (maxGrav + 0.1)) * plotH * 0.4;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(plotX + plotW, plotY + plotH / 2);
        ctx.closePath();
        ctx.fill();
      });
    }

    // |Psi|^2 filled envelope
    Painter.useCtx((ctx) => {
      ctx.fillStyle = cs.envelopeColor;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY + plotH);
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const sy = plotY + plotH - (samples[i].prob / maxProb) * plotH * 0.9;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(plotX + plotW, plotY + plotH);
      ctx.closePath();
      ctx.fill();
    });

    // Re(Psi) wave line
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = cs.waveColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const normRe = samples[i].re / Math.sqrt(maxProb);
        const sy = plotY + plotH / 2 - normRe * plotH * 0.4;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    });

    // Labels
    Painter.useCtx((ctx) => {
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#888";
      ctx.fillText("Cross-section (z=0)", plotX, plotY - 10);
      ctx.fillStyle = cs.waveColor;
      ctx.fillText("Re(\u03A8)", plotX + plotW - 50, plotY - 10);
      ctx.fillStyle = "rgba(0, 200, 180, 0.6)";
      ctx.fillText("|\u03A8|\u00B2", plotX + plotW - 100, plotY - 10);
      if (maxGrav > 0.01) {
        ctx.fillStyle = "rgba(255, 60, 40, 0.6)";
        ctx.fillText("\u03A6(r)", plotX + plotW - 150, plotY - 10);
      }
    });
  }

  _renderControls(w, h) {
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#555";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        "drag to rotate  |  scroll to zoom  |  hold to collapse  |  double-click to reset",
        w - 20,
        h - 10
      );
      ctx.textAlign = "left";
    });
  }

  // ─── Resize ──────────────────────────────────────────────────────────

  onResize() {
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );

    if (this.panel) {
      this._layoutPanel();
    }

    // Update toggle button visibility based on new screen size
    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }

    // On desktop, ensure panel is always visible; on mobile, hide
    if (!Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-visible");
    } else if (Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-hidden");
    }
  }
}

import {
  Game,
  Painter,
  Camera3D,
  Screen,
  Gesture,
  FPSCounter,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  Stepper,
  AccordionGroup,
} from "/gcanvas.es.min.js";
import { StateMachine } from "/gcanvas.es.min.js";
import { WebGLParticleRenderer } from "/gcanvas.es.min.js";
import { Tweenetik } from "/gcanvas.es.min.js";
import { Easing } from "/gcanvas.es.min.js";
import {
  sampleOrbitalPositions,
  validateQuantumNumbers,
  orbitalLabel,
} from "/gcanvas.es.min.js";

const CONFIG = {
  quantum: { n: 1, l: 0, m: 0 },
  particles: { count: 20000, pointSize: 3 },
  camera: {
    perspective: 800,
    rotationX: -0.5,
    rotationY: 0.3,
    inertia: true,
    friction: 0.95,
    autoRotate: true,
    rotateSpeed: 0.2,
  },
  visual: {
    colormap: "inferno",
    colormapFloor: 0.2,
    alpha: 0.85,
  },
  zoom: {
    min: 0.3,
    max: 4.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },
  panel: {
    width: 280,
    padding: 18,
    marginRight: 16,
    marginTop: 16,
    mobilePadding: 16,
    mobileMaxHeight: 0.85,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    spacing: 10,
  },
  transition: {
    duration: 0.8,
    stagger: 0.4,       // fraction of duration over which particles are spread
  },
  toggle: {
    margin: 12,
    width: 44,
    height: 44,
  },
};

const COLORMAPS = {
  inferno: [
    [0, 0, 4],
    [40, 11, 84],
    [101, 21, 110],
    [159, 42, 99],
    [212, 72, 66],
    [245, 125, 21],
    [250, 193, 39],
    [252, 255, 164],
  ],
  fire: [
    [0, 0, 0],
    [128, 0, 0],
    [200, 0, 0],
    [255, 128, 0],
    [255, 255, 0],
    [255, 255, 255],
  ],
  ocean: [
    [0, 0, 20],
    [0, 20, 80],
    [0, 80, 160],
    [0, 180, 220],
    [100, 240, 255],
    [255, 255, 255],
  ],
  rainbow: [
    [255, 0, 0],
    [255, 127, 0],
    [255, 255, 0],
    [0, 255, 0],
    [0, 0, 255],
    [75, 0, 130],
    [148, 0, 211],
  ],
};

const ORBITAL_SHAPES = [
  "Spherical cloud",          // l=0 (s)
  "Dumbbell lobes",           // l=1 (p)
  "Cloverleaf pattern",       // l=2 (d)
  "Multi-lobed flower",       // l=3 (f)
  "Complex nodal surface",    // l=4 (g)
];

const SHELL_NAMES = [
  "", "K", "L", "M", "N", "O", "P", "Q",
];

const SUBSHELL_ELEMENTS = {
  "1s": "H, He",
  "2s": "Li, Be",
  "2p": "B \u2192 Ne",
  "3s": "Na, Mg",
  "3p": "Al \u2192 Ar",
  "3d": "Sc \u2192 Zn (transition metals)",
  "4s": "K, Ca",
  "4p": "Ga \u2192 Kr",
  "4d": "Y \u2192 Cd (transition metals)",
  "4f": "Ce \u2192 Lu (rare earths)",
  "5s": "Rb, Sr",
  "5p": "In \u2192 Xe",
  "5d": "Hf \u2192 Hg (heavy transition metals)",
  "5f": "Th \u2192 Lr (actinides)",
  "6s": "Cs, Ba",
  "6p": "Tl \u2192 Rn",
  "7s": "Fr, Ra",
};

const ORIENTATION_LABELS = {
  0: "aligned along z-axis",
  1: "tilted toward xy-plane",
  "-1": "tilted toward xy-plane",
  2: "rotated 45\u00B0 in xy-plane",
  "-2": "rotated 45\u00B0 in xy-plane",
};

function orbitalDescription(n, l, m) {
  const letters = ["s", "p", "d", "f", "g", "h", "i"];
  const letter = letters[l] || l;
  const shape = ORBITAL_SHAPES[l] || "Higher-order orbital";
  const shell = SHELL_NAMES[n] || "";
  const subshell = `${n}${letter}`;
  const nodes = n - l - 1;

  const lines = [];

  // Line 1: Shape + shell
  let desc = shape;
  if (shell) desc += ` \u00B7 ${shell}-shell`;
  if (nodes > 0) desc += ` \u00B7 ${nodes} radial node${nodes > 1 ? "s" : ""}`;
  lines.push(desc);

  // Line 2: Orientation (for l > 0)
  if (l > 0 && m !== undefined) {
    const orient = ORIENTATION_LABELS[m] || `m=${m} orientation`;
    lines.push(orient);
  }

  // Line 3: Elements
  const elements = SUBSHELL_ELEMENTS[subshell];
  if (elements) {
    lines.push(`Filled by: ${elements}`);
  }

  return lines;
}

const PRESETS = {
  "1s":  { n: 1, l: 0, m: 0 },
  "2s":  { n: 2, l: 0, m: 0 },
  "2p":  { n: 2, l: 1, m: 0 },
  "3s":  { n: 3, l: 0, m: 0 },
  "3p":  { n: 3, l: 1, m: 0 },
  "3d":  { n: 3, l: 2, m: 0 },
  "4s":  { n: 4, l: 0, m: 0 },
  "4p":  { n: 4, l: 1, m: 0 },
  "4d":  { n: 4, l: 2, m: 0 },
  "4f":  { n: 4, l: 3, m: 0 },
};

class HydrogenOrbitalDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000810";
    this.enableFluidSize();
  }

  init() {
    super.init();

    this.n = CONFIG.quantum.n;
    this.l = CONFIG.quantum.l;
    this.m = CONFIG.quantum.m;
    this.particleCount = CONFIG.particles.count;
    this.time = 0;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
    });
    this.camera.autoRotate = CONFIG.camera.autoRotate;
    this.camera.autoRotateSpeed = CONFIG.camera.rotateSpeed;
    this.camera.enableMouseControl(this.canvas);

    // Zoom
    this.targetZoom = 1;
    this.currentZoom = 1;
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.targetZoom = this.defaultZoom;
    this.currentZoom = this.defaultZoom;
    this._initZoomControls();

    // WebGL particle renderer
    this.glRenderer = new WebGLParticleRenderer(CONFIG.particles.count, {
      width: this.width,
      height: this.height,
      shape: "glow",
      blendMode: "additive",
    });

    // Particle data
    this._particles = [];
    this._orbitalData = null;

    // Intro transition (0 = origin, 1 = final positions)
    this._transition = { progress: 0 };

    // Generate initial orbital
    this._regenerateOrbital();

    // Screen detection (must be before _buildPanel)
    Screen.init(this);

    // FPS counter
    this.fps = new FPSCounter(this, {
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fps);

    // Info panel (Task 7)
    this._buildInfoPanel();

    // UI panel (Task 8)
    this._updatingSliders = false;
    this._controls = {};
    this._buildPanel();

    // Mobile: toggle button + panel state machine
    this._buildToggleButton();
    this._buildMathButton();
    this._buildBohrButton();
    this._initPanelStateMachine();
  }

  _initZoomControls() {
    const gesture = new Gesture(this.canvas);
    gesture.onPinch = (scale) => {
      this.targetZoom = Math.max(
        CONFIG.zoom.min,
        Math.min(CONFIG.zoom.max, this.targetZoom * scale)
      );
    };
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -CONFIG.zoom.speed : CONFIG.zoom.speed;
      this.targetZoom = Math.max(
        CONFIG.zoom.min,
        Math.min(CONFIG.zoom.max, this.targetZoom + delta * 0.1)
      );
    }, { passive: false });
  }

  _regenerateOrbital() {
    const v = validateQuantumNumbers(this.n, this.l, this.m);
    this.n = v.n;
    this.l = v.l;
    this.m = v.m;
    this._orbitalData = sampleOrbitalPositions(this.n, this.l, this.m, this.particleCount);
    this._buildParticles();
    this._updateInfoPanel();

    // Animate particles from origin to final positions
    Tweenetik.killTarget(this._transition);
    this._transition.progress = 0;
    Tweenetik.to(this._transition, { progress: 1 }, CONFIG.transition.duration, Easing.linear);
  }

  _buildParticles() {
    const data = this._orbitalData;
    if (!data) return;

    const count = data.length / 4;
    const colormap = COLORMAPS[CONFIG.visual.colormap] || COLORMAPS.inferno;
    const scale = this.n * 4;

    // Build index array sorted by probability (low → high)
    const indices = new Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;
    indices.sort((a, b) => data[a * 4 + 3] - data[b * 4 + 3]);

    // Rank-based color mapping so every colormap stop gets equal use
    const rank = new Float32Array(count);
    for (let r = 0; r < count; r++) {
      rank[indices[r]] = r / (count - 1);
    }

    // Find min/max log-prob for size/alpha normalization
    let minLog = Infinity;
    let maxLog = -Infinity;
    for (let i = 0; i < count; i++) {
      const lp = Math.log10(data[i * 4 + 3] + 1e-15);
      if (lp < minLog) minLog = lp;
      if (lp > maxLog) maxLog = lp;
    }
    const logRange = maxLog - minLog || 1;

    // Pre-compute max distance for stagger normalization
    let maxDist = 0;
    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      const x = data[idx] / scale;
      const y = data[idx + 1] / scale;
      const z = data[idx + 2] / scale;
      const d = x * x + y * y + z * z;
      if (d > maxDist) maxDist = d;
    }
    maxDist = Math.sqrt(maxDist) || 1;

    this._particles.length = 0;
    const stagger = CONFIG.transition.stagger;

    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      const x = data[idx] / scale;
      const y = data[idx + 1] / scale;
      const z = data[idx + 2] / scale;
      const prob = data[idx + 3];

      // Rank for color — full colormap range, skip the black end
      const floor = CONFIG.visual.colormapFloor;
      const tColor = floor + rank[i] * (1 - floor);
      // Actual probability for size/alpha — preserves physical structure
      const tProb = Math.max(0, Math.min(1,
        (Math.log10(prob + 1e-15) - minLog) / logRange
      ));

      const color = sampleColormap(colormap, tColor);

      // Stagger: outer particles spawn first (low spawnT), inner spawn later
      const dist = Math.sqrt(x * x + y * y + z * z) / maxDist;
      const spawnT = (1 - dist) * stagger;

      this._particles.push({
        x: x * 100,
        y: y * 100,
        z: z * 100,
        size: CONFIG.particles.pointSize * (0.5 + tProb * 0.5),
        color: { r: color[0], g: color[1], b: color[2], a: CONFIG.visual.alpha * tProb },
        spawnT,
      });
    }
  }

  // --- Task 7: Info Panel ---

  _buildInfoPanel() {
    this._orbitalLabel = orbitalLabel(this.n, this.l, this.m);
    this._equationLabel = "\u03C8(r,\u03B8,\u03C6) = R\u2099,\u2097(r) \u00B7 Y\u2097\u1D50(\u03B8,\u03C6)";
    this._descriptionLines = orbitalDescription(this.n, this.l, this.m);
  }

  _updateInfoPanel() {
    this._orbitalLabel = orbitalLabel(this.n, this.l, this.m);
    this._descriptionLines = orbitalDescription(this.n, this.l, this.m);
  }

  _drawInfoPanel(ctx) {
    const cx = this.width / 2;
    const startY = CONFIG.toggle.margin + CONFIG.toggle.height + 16;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Orbital label (e.g. "3d (m=0)")
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#88ccff";
    ctx.fillText(this._orbitalLabel, cx, startY);

    // Equation
    ctx.font = "12px monospace";
    ctx.fillStyle = "#668899";
    ctx.fillText(this._equationLabel, cx, startY + 30);

    // Description lines
    ctx.font = "11px monospace";
    ctx.fillStyle = "#556677";
    const lineCount = this._descriptionLines.length;
    for (let i = 0; i < lineCount; i++) {
      ctx.fillText(this._descriptionLines[i], cx, startY + 48 + i * 16);
    }

    ctx.restore();
  }

  // --- Task 8: UI Panel ---

  _buildPanel() {
    const isMobile = Screen.isMobile;
    const panelWidth = Screen.responsive(
      this.width - 20, this.width - 20, CONFIG.panel.width
    );
    const padding = isMobile ? CONFIG.panel.mobilePadding : CONFIG.panel.padding;
    const { spacing } = CONFIG.panel;

    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing,
      headerHeight: 28,
      debug: true,
      debugColor: "rgba(0, 255, 200, 0.08)",
    });
    this._layoutPanel();

    // Panel background
    const originalDraw = this.panel.draw.bind(this.panel);
    this.panel.draw = () => {
      Painter.shapes.rect(
        0, 0,
        this.panel._width, this.panel._height,
        CONFIG.panel.backgroundColor
      );
      originalDraw();
    };

    // Bottom-anchor relayout on section toggle
    const originalLayout = this.panel.layout.bind(this.panel);
    this.panel.layout = () => {
      originalLayout();
      this._layoutPanel();
    };

    this.pipeline.add(this.panel);

    const sw = panelWidth - padding * 2;
    this._controls = {};

    // Preset dropdown
    const presetOptions = Object.entries(PRESETS).map(([key, val]) => ({
      label: orbitalLabel(val.n, val.l, val.m),
      value: key,
    }));
    this._controls.preset = new Dropdown(this, {
      label: "ORBITAL",
      options: presetOptions,
      width: sw,
      value: "1s",
      onChange: (key) => this._onPresetChange(key),
    });
    this.panel.addItem(this._controls.preset);

    // --- Quantum Numbers section ---
    this._quantumSection = this.panel.addSection("Quantum Numbers", {
      expanded: !isMobile,
    });

    this._controls.n = new Stepper(this, {
      label: "n (PRINCIPAL)",
      width: sw,
      value: this.n,
      min: 1,
      max: 7,
      step: 1,
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.n = v;
        const clamped = validateQuantumNumbers(this.n, this.l, this.m);
        this.l = clamped.l;
        this.m = clamped.m;
        this._updatingSliders = true;
        this._controls.l.setBounds(0, this.n - 1);
        this._controls.l.value = this.l;
        this._controls.m.setBounds(-this.l, this.l);
        this._controls.m.value = this.m;
        this._updatingSliders = false;
        this._regenerateOrbital();
      },
    });
    this._quantumSection.addItem(this._controls.n);

    this._controls.l = new Stepper(this, {
      label: "l (ANGULAR)",
      width: sw,
      value: this.l,
      min: 0,
      max: this.n - 1,
      step: 1,
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.l = v;
        const clamped = validateQuantumNumbers(this.n, this.l, this.m);
        this.m = clamped.m;
        this._updatingSliders = true;
        this._controls.m.setBounds(-this.l, this.l);
        this._controls.m.value = this.m;
        this._updatingSliders = false;
        this._regenerateOrbital();
      },
    });
    this._quantumSection.addItem(this._controls.l);

    this._controls.m = new Stepper(this, {
      label: "m (MAGNETIC)",
      width: sw,
      value: this.m,
      min: -this.l,
      max: this.l,
      step: 1,
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.m = v;
        this._regenerateOrbital();
      },
    });
    this._quantumSection.addItem(this._controls.m);

    this.panel.commitSection(this._quantumSection);

    // --- Particles section ---
    this._particlesSection = this.panel.addSection("Particles", { expanded: false });

    this._controls.count = new Stepper(this, {
      label: "COUNT",
      width: sw,
      value: this.particleCount,
      min: 5000,
      max: 50000,
      step: 5000,
      formatValue: (v) => (v / 1000).toFixed(0) + "k",
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.particleCount = v;
        this._regenerateOrbital();
      },
    });
    this._particlesSection.addItem(this._controls.count);

    this._controls.pointSize = new Slider(this, {
      label: "POINT SIZE",
      width: sw,
      min: 1,
      max: 8,
      value: CONFIG.particles.pointSize,
      step: 0.5,
      formatValue: (v) => v.toFixed(1),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.particles.pointSize = v;
        this._buildParticles();
      },
    });
    this._particlesSection.addItem(this._controls.pointSize);

    this.panel.commitSection(this._particlesSection);

    // --- Color section ---
    this._colorSection = this.panel.addSection("Color", { expanded: false });

    const colormapOptions = Object.keys(COLORMAPS).map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: key,
    }));
    this._controls.colormap = new Dropdown(this, {
      label: "COLORMAP",
      width: sw,
      options: colormapOptions,
      value: CONFIG.visual.colormap,
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.visual.colormap = v;
        this._buildParticles();
      },
    });
    this._colorSection.addItem(this._controls.colormap);

    this._controls.colormapFloor = new Slider(this, {
      label: "COLOR FLOOR",
      width: sw,
      min: 0,
      max: 0.5,
      value: CONFIG.visual.colormapFloor,
      step: 0.05,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.visual.colormapFloor = v;
        this._buildParticles();
      },
    });
    this._colorSection.addItem(this._controls.colormapFloor);

    this._controls.alpha = new Slider(this, {
      label: "OPACITY",
      width: sw,
      min: 0.1,
      max: 1.0,
      value: CONFIG.visual.alpha,
      step: 0.05,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.visual.alpha = v;
        this._buildParticles();
      },
    });
    this._colorSection.addItem(this._controls.alpha);

    this.panel.commitSection(this._colorSection);

    // --- View section ---
    this._viewSection = this.panel.addSection("View", { expanded: false });

    this._controls.autoRotate = new ToggleButton(this, {
      text: "Auto-Rotate", width: sw,
      startToggled: CONFIG.camera.autoRotate,
      onToggle: (on) => {
        this.camera.autoRotate = on;
      },
    });
    this._viewSection.addItem(this._controls.autoRotate);

    this._controls.rotateSpeed = new Slider(this, {
      label: "ROTATION SPEED",
      width: sw,
      min: 0.05,
      max: 1.0,
      value: CONFIG.camera.rotateSpeed,
      step: 0.05,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => {
        if (this._updatingSliders) return;
        this.camera.autoRotateSpeed = v;
      },
    });
    this._viewSection.addItem(this._controls.rotateSpeed);

    this.panel.commitSection(this._viewSection);

    // ── Reset + Restart buttons ────────────────────────────────────────
    this._controls.reset = new Button(this, {
      text: "Reset Defaults", width: sw, height: 32,
      onClick: () => this._resetToDefaults(),
    });
    this.panel.addItem(this._controls.reset);

    this._controls.restart = new Button(this, {
      text: "Restart", width: sw, height: 32,
      onClick: () => this._regenerateOrbital(),
    });
    this.panel.addItem(this._controls.restart);

    // Track sections for exclusive toggle on mobile
    this._sections = [
      this._quantumSection,
      this._particlesSection,
      this._colorSection,
      this._viewSection,
    ];
    if (isMobile) {
      this._setupExclusiveSections();
    }

    this.panel.layout();
  }

  _onPresetChange(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    this._activePreset = key;
    this._controls.preset.close();

    this._updatingSliders = true;

    this.n = preset.n;
    this.l = preset.l;
    this.m = preset.m;

    this._controls.n.value = this.n;
    this._controls.l.setBounds(0, this.n - 1);
    this._controls.l.value = this.l;
    this._controls.m.setBounds(-this.l, this.l);
    this._controls.m.value = this.m;

    this._updatingSliders = false;
    this._regenerateOrbital();
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
    this._toggleBtn.visible = Screen.isMobile;
    this._toggleBtn.interactive = Screen.isMobile;
  }

  _buildMathButton() {
    this._mathBtn = new ToggleButton(this, {
      text: "\u03BB",
      width: CONFIG.toggle.width,
      height: CONFIG.toggle.height,
      onToggle: (on) => {
        if (on && this._bohrBtn.toggled) {
          this._bohrBtn.toggle(false);
        }
      },
    });
    // Position to the right of the toggle button
    this._mathBtn.x = CONFIG.toggle.margin * 2 + CONFIG.toggle.width + CONFIG.toggle.width / 2;
    this._mathBtn.y = CONFIG.toggle.margin + CONFIG.toggle.height / 2;
    this.pipeline.add(this._mathBtn);
  }

  _buildBohrButton() {
    this._bohrBtn = new ToggleButton(this, {
      text: "\u269B",
      width: CONFIG.toggle.width,
      height: CONFIG.toggle.height,
      onToggle: (on) => {
        if (on && this._mathBtn.toggled) {
          this._mathBtn.toggle(false);
        }
      },
    });
    // Position to the right of the math button
    this._bohrBtn.x = CONFIG.toggle.margin * 3 + CONFIG.toggle.width * 2 + CONFIG.toggle.width / 2;
    this._bohrBtn.y = CONFIG.toggle.margin + CONFIG.toggle.height / 2;
    this.pipeline.add(this._bohrBtn);
  }

  _drawBohrOverlay(ctx) {
    if (!this._bohrBtn || !this._bohrBtn.toggled) return;

    const n = this.n;
    const l = this.l;
    const letters = ["s", "p", "d", "f", "g", "h", "i"];

    // Panel sizing
    const size = Screen.isMobile ? Math.min(this.width - 40, 280) : 300;
    const panelW = size;
    const panelH = size + 40;

    // Mobile: top-center below buttons. Desktop: left, vertically centered
    const px = Screen.isMobile
      ? (this.width - panelW) / 2
      : CONFIG.panel.marginRight;
    const py = Screen.isMobile
      ? CONFIG.toggle.margin + CONFIG.toggle.height + 12
      : (this.height - panelH) / 2;

    // Background
    Painter.shapes.rect(px, py, panelW, panelH, "rgba(0, 0, 0, 0.6)");

    const cx = px + panelW / 2;
    const cy = py + 20 + size / 2;
    const maxOrbitR = (size / 2) - 20;

    ctx.save();

    // Shared palette — matches math overlay and info panel
    // n=1 red (energy), n=2 green (angular), n=3 blue (magnetic),
    // n=4 amber (spatial), n=5 purple (parity), n=6+ cycle
    const shellColors = ["#ff8888", "#88ff88", "#8888ff", "#ffcc88", "#cc88ff", "#88ccff", "#ffcc88"];

    // Nucleus
    const nucleusR = 6;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, nucleusR);
    grad.addColorStop(0, "#ffcc88");
    grad.addColorStop(1, "#aa6622");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
    ctx.fill();

    // Draw orbits and electrons
    for (let k = 1; k <= n; k++) {
      const orbitR = (k / n) * maxOrbitR;
      const isActive = k === n;
      const color = shellColors[(k - 1) % shellColors.length];

      // Orbit ring
      ctx.strokeStyle = isActive ? color : "rgba(136, 204, 255, 0.12)";
      ctx.lineWidth = isActive ? 1.5 : 0.8;
      if (!isActive) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Shell label
      ctx.font = "10px monospace";
      ctx.fillStyle = isActive ? color : "#445566";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`n=${k}`, cx + orbitR + 4, cy);

      // Electrons on this shell
      const numElectrons = isActive ? Math.min(2 * (2 * l + 1), 2 * k * k) : 2 * k * k;
      const displayElectrons = Math.min(numElectrons, 18);

      for (let e = 0; e < displayElectrons; e++) {
        const baseAngle = (e / displayElectrons) * Math.PI * 2;
        const speed = 0.5 / (k * 0.7);
        const angle = baseAngle + this.time * speed;
        const ex = cx + Math.cos(angle) * orbitR;
        const ey = cy + Math.sin(angle) * orbitR;

        const electronR = isActive ? 4 : 2.5;

        // Glow for active shell
        if (isActive) {
          ctx.fillStyle = color.replace(")", ", 0.15)").replace("rgb", "rgba").replace("#", "");
          // Use hex to rgba for glow
          ctx.fillStyle = `rgba(255, 255, 255, 0.12)`;
          ctx.beginPath();
          ctx.arc(ex, ey, electronR * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isActive ? color : "rgba(136, 204, 255, 0.35)";
        ctx.beginPath();
        ctx.arc(ex, ey, electronR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Label at bottom
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#88ccff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const label = `Bohr Model \u00B7 ${n}${letters[l] || l} shell`;
    ctx.fillText(label, cx, py + panelH - 30);

    ctx.font = "10px monospace";
    ctx.fillStyle = "#556677";
    ctx.fillText("(not how electrons actually behave)", cx, py + panelH - 14);

    ctx.restore();
  }

  _computeMathValues() {
    const n = this.n;
    const l = this.l;
    const m = this.m;
    const letters = ["s", "p", "d", "f", "g", "h", "i"];
    const letter = letters[l] || l;

    const energy = -13.6 / (n * n);
    const angMom = Math.sqrt(l * (l + 1));
    const radialNodes = n - l - 1;
    const bohrScale = n * n;

    // Mean radius: <r> = (n²a₀/Z)[1 + ½(1 - l(l+1)/n²)]
    const meanR = bohrScale * (1 + 0.5 * (1 - (l * (l + 1)) / (n * n)));

    return [
      // Header
      { label: `\u03C8 ${n}${letter}  (n=${n}, l=${l}, m=${m})`, value: null, color: "#88ccff" },
      { label: `\u03C8 = R\u2099\u2097(r) \u00B7 Y\u2097\u1D50(\u03B8,\u03C6)`, value: null, color: "#556677" },
      // Energy
      { label: "Energy", value: `${energy.toFixed(2)} eV`, color: "#ff8888" },
      { label: "Formula", value: `E = -13.6 / ${n}\u00B2`, color: "#ff8888" },
      // Angular momentum
      { label: "Orbital L", value: `\u221A(${l}\u00D7${l + 1})\u210F = ${angMom.toFixed(3)}\u210F`, color: "#88ff88" },
      { label: "z-component", value: `L\u1D64 = ${m}\u210F`, color: "#8888ff" },
      // Nodes
      { label: "Radial nodes", value: `${n}-${l}-1 = ${radialNodes}`, color: "#cccccc" },
      { label: "Angular nodes", value: `${l}`, color: "#cccccc" },
      { label: "Total nodes", value: `${n - 1}`, color: "#cccccc" },
      // Spatial
      { label: "Mean radius", value: `${meanR.toFixed(1)} a\u2080`, color: "#ffcc88" },
      { label: "|\u03C8(0)|\u00B2", value: l === 0 ? "\u2260 0 (s-orbital)" : "= 0 (l\u22600)", color: "#ffcc88" },
      { label: "Parity", value: l % 2 === 0 ? "even (-1)\u02E1 = +1" : "odd (-1)\u02E1 = -1", color: "#cc88ff" },
    ];
  }

  _drawMathOverlay(ctx) {
    if (!this._mathBtn || !this._mathBtn.toggled) return;

    const lines = this._computeMathValues();
    const padding = 18;
    const lineHeight = 20;
    const panelW = Screen.isMobile ? this.width - 40 : 320;
    const panelH = padding * 2 + lines.length * lineHeight;

    // Mobile: top-center below buttons. Desktop: left, vertically centered
    const px = Screen.isMobile
      ? (this.width - panelW) / 2
      : CONFIG.panel.marginRight;
    const py = Screen.isMobile
      ? CONFIG.toggle.margin + CONFIG.toggle.height + 12
      : (this.height - panelH) / 2;

    // Background
    Painter.shapes.rect(px, py, panelW, panelH, "rgba(0, 0, 0, 0.8)");

    ctx.save();
    ctx.textBaseline = "top";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.value && !line.label) continue;

      const y = py + padding + i * lineHeight;

      // Header lines (label only, no value)
      if (line.value === null) {
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = line.color;
        ctx.textAlign = "left";
        ctx.fillText(line.label, px + padding, y);
      } else {
        // Label on left, value on right
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#889";
        ctx.textAlign = "left";
        ctx.fillText(line.label, px + padding, y);

        ctx.font = "12px monospace";
        ctx.fillStyle = line.color;
        ctx.textAlign = "right";
        ctx.fillText(line.value, px + panelW - padding, y);
      }
    }

    ctx.restore();
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

  _togglePanel() {
    if (this._panelFSM.is("panel-hidden")) {
      this._panelFSM.setState("panel-visible");
    } else {
      this._panelFSM.setState("panel-hidden");
    }
  }

  _layoutPanel() {
    if (!this.panel) return;
    if (Screen.isMobile) {
      const maxH = this.height * CONFIG.panel.mobileMaxHeight;
      const panelH = Math.min(this.panel._height || 400, maxH);
      this.panel.x = 10;
      this.panel.y = this.height - panelH - 10;
    } else {
      this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
      this.panel.y = CONFIG.panel.marginTop;
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

  // ─── Reset to Preset Defaults ─────────────────────────────────────

  _resetToDefaults() {
    const key = this._activePreset || "1s";
    this._onPresetChange(key);
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.currentZoom += (this.targetZoom - this.currentZoom) * CONFIG.zoom.easing;
    this.camera.update(dt);
  }

  render() {
    // Manual render order: clear → WebGL → info text → pipeline (panel on top)
    Painter.setContext(this.ctx);
    if (this.running) this.clear();

    const ctx = this.ctx;

    if (this.glRenderer && this.glRenderer.isAvailable()) {
      const cx = this.width / 2;
      const cy = this.height / 2;
      const projected = [];
      const globalT = this._transition.progress;
      const stagger = CONFIG.transition.stagger;

      for (const p of this._particles) {
        // Per-particle local progress based on spawn threshold
        const localT = Math.min(1, Math.max(0, (globalT - p.spawnT) / (1 - stagger)));
        if (localT <= 0) continue;

        const eased = Easing.easeOutCubic(localT);
        const pt = this.camera.project(p.x * eased, p.y * eased, p.z * eased);
        if (pt.z < 0) continue;

        const scale = this.currentZoom * (CONFIG.camera.perspective / (CONFIG.camera.perspective + pt.z));
        projected.push({
          x: cx + pt.x * scale,
          y: cy + pt.y * scale,
          size: p.size * scale * eased,
          color: p.color,
          depth: pt.z,
        });
      }

      projected.sort((a, b) => b.depth - a.depth);

      this.glRenderer.resize(this.width, this.height);
      this.glRenderer.clear();
      this.glRenderer.updateParticles(projected);
      this.glRenderer.render(projected.length);
      this.glRenderer.compositeOnto(ctx, 0, 0);
    }

    // Info text: behind the panel, on top of particles
    this._drawInfoPanel(ctx);

    // Pipeline last: panel, toggle button, FPS render on top
    this.pipeline.render();

    // Overlays on top of everything
    this._drawBohrOverlay(ctx);
    this._drawMathOverlay(ctx);
  }

  onResize() {
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    if (!this.panel) return;

    this._layoutPanel();

    // Update toggle button visibility
    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }

    // Transition FSM on resize
    if (!Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-visible");
    } else if (Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-hidden");
    }
  }
}

function sampleColormap(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const n = stops.length - 1;
  const idx = t * n;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const frac = idx - lo;
  return [
    Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * frac),
    Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * frac),
    Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * frac),
  ];
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new HydrogenOrbitalDemo(canvas);
  demo.start();
});

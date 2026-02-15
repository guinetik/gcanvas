import {
  Game,
  Painter,
  Camera3D,
  Text,
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
import { WebGLParticleRenderer } from "../../src/webgl/webgl-particle-renderer.js";
import {
  sampleOrbitalPositions,
  validateQuantumNumbers,
  orbitalLabel,
} from "../../src/math/hydrogen.js";

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
    logCompression: 12,
    alpha: 0.85,
  },
  zoom: {
    min: 0.3,
    max: 4.0,
    speed: 0.5,
    easing: 0.12,
    baseScreenSize: 600,
  },
  panel: { width: 280, padding: 14, marginRight: 16, marginTop: 16 },
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

    // Generate initial orbital
    this._regenerateOrbital();

    // FPS counter
    this.fps = new FPSCounter(this);
    this.pipeline.add(this.fps);

    // Info panel (Task 7)
    this._buildInfoPanel();

    // UI panel (Task 8)
    this._updatingSliders = false;
    this._controls = {};
    this._buildPanel();
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
  }

  _buildParticles() {
    const data = this._orbitalData;
    if (!data) return;

    const count = data.length / 4;
    const colormap = COLORMAPS[CONFIG.visual.colormap] || COLORMAPS.inferno;
    const logComp = CONFIG.visual.logCompression;
    const scale = this.n * 4;

    this._particles.length = 0;

    for (let i = 0; i < count; i++) {
      const idx = i * 4;
      const x = data[idx] / scale;
      const y = data[idx + 1] / scale;
      const z = data[idx + 2] / scale;
      const prob = data[idx + 3];

      const t = Math.max(0, Math.min(1,
        (Math.log10(prob + 1e-15) + logComp) / logComp
      ));

      const color = sampleColormap(colormap, t);

      this._particles.push({
        x: x * 100,
        y: y * 100,
        z: z * 100,
        size: CONFIG.particles.pointSize * (0.5 + t * 0.5),
        color: { r: color[0], g: color[1], b: color[2], a: CONFIG.visual.alpha * t },
      });
    }
  }

  // --- Task 7: Info Panel ---

  _buildInfoPanel() {
    const leftEdge = -this.width / 2 + 30;

    this.orbitalText = new Text(this, orbitalLabel(this.n, this.l, this.m), {
      font: "bold 24px monospace",
      color: "#88ccff",
      align: "left",
      x: leftEdge,
      y: -15,
    });
    this.equationText = new Text(this, "\u03C8(r,\u03B8,\u03C6) = R\u2099,\u2097(r) \u00B7 Y\u2097\u1D50(\u03B8,\u03C6)", {
      font: "12px monospace",
      color: "#668899",
      align: "left",
      x: leftEdge,
      y: 15,
    });

    // Text drawn manually in render() after WebGL composite, not via pipeline
  }

  _updateInfoPanel() {
    if (this.orbitalText) {
      this.orbitalText.text = orbitalLabel(this.n, this.l, this.m);
    }
  }

  // --- Task 8: UI Panel ---

  _buildPanel() {
    this.panel = new AccordionGroup(this, {
      width: CONFIG.panel.width,
      padding: CONFIG.panel.padding,
      spacing: 10,
      headerHeight: 28,
      debug: true,
      debugColor: "rgba(0, 255, 200, 0.08)",
    });
    this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
    this.panel.y = CONFIG.panel.marginTop;

    // Preset dropdown
    const presetOptions = Object.entries(PRESETS).map(([key, val]) => ({
      label: orbitalLabel(val.n, val.l, val.m),
      value: key,
    }));
    this._controls.preset = new Dropdown(this, {
      label: "ORBITAL",
      options: presetOptions,
      value: "1s",
      onChange: (key) => this._onPresetChange(key),
    });
    this.panel.addItem(this._controls.preset);

    // Restart button
    this._controls.restart = new Button(this, {
      text: "Restart",
      onClick: () => this._regenerateOrbital(),
    });
    this.panel.addItem(this._controls.restart);

    // --- Quantum Numbers section ---
    this._quantumSection = this.panel.addSection("Quantum Numbers", true);

    this._controls.n = new Stepper(this, {
      label: "n (PRINCIPAL)",
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
    this._particlesSection = this.panel.addSection("Particles", false);

    this._controls.count = new Stepper(this, {
      label: "COUNT",
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
    this._colorSection = this.panel.addSection("Color", false);

    const colormapOptions = Object.keys(COLORMAPS).map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: key,
    }));
    this._controls.colormap = new Dropdown(this, {
      label: "COLORMAP",
      options: colormapOptions,
      value: CONFIG.visual.colormap,
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.visual.colormap = v;
        this._buildParticles();
      },
    });
    this._colorSection.addItem(this._controls.colormap);

    this._controls.logComp = new Slider(this, {
      label: "LOG COMPRESSION",
      min: 4,
      max: 20,
      value: CONFIG.visual.logCompression,
      step: 1,
      formatValue: (v) => v.toFixed(0),
      onChange: (v) => {
        if (this._updatingSliders) return;
        CONFIG.visual.logCompression = v;
        this._buildParticles();
      },
    });
    this._colorSection.addItem(this._controls.logComp);

    this._controls.alpha = new Slider(this, {
      label: "OPACITY",
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
    this._viewSection = this.panel.addSection("View", false);

    this._controls.autoRotate = new ToggleButton(this, {
      text: "Auto-Rotate",
      startToggled: CONFIG.camera.autoRotate,
      onToggle: (on) => {
        this.camera.autoRotate = on;
      },
    });
    this._viewSection.addItem(this._controls.autoRotate);

    this._controls.rotateSpeed = new Slider(this, {
      label: "ROTATION SPEED",
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

    this.panel.layout();
    this.pipeline.add(this.panel);
  }

  _onPresetChange(key) {
    const preset = PRESETS[key];
    if (!preset) return;
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

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.currentZoom += (this.targetZoom - this.currentZoom) * CONFIG.zoom.easing;
    this.camera.update(dt);
  }

  render() {
    super.render();
    const ctx = this.ctx;

    if (!this.glRenderer || !this.glRenderer.isAvailable()) return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const projected = [];

    for (const p of this._particles) {
      const pt = this.camera.project(p.x, p.y, p.z);
      if (pt.z < 0) continue;

      const scale = this.currentZoom * (CONFIG.camera.perspective / (CONFIG.camera.perspective + pt.z));
      projected.push({
        x: cx + pt.x * scale,
        y: cy + pt.y * scale,
        size: p.size * scale,
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

    // Draw text on top of WebGL composite
    if (this.orbitalText) this.orbitalText.draw(ctx);
    if (this.equationText) this.equationText.draw(ctx);
  }

  onResize() {
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    if (this.panel) {
      this.panel.x = this.width - CONFIG.panel.width - CONFIG.panel.marginRight;
      this.panel.y = CONFIG.panel.marginTop;
    }
    if (this.orbitalText) {
      const leftEdge = -this.width / 2 + 30;
      this.orbitalText.x = leftEdge;
      this.equationText.x = leftEdge;
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

import { Game, GameObject, Painter, Camera3D, Screen, WebGLAttractorPipeline, AccordionGroup, Dropdown, Slider, Button, VerticalLayout, Text, UI_THEME, THEMES } from "../../src/index.js";
import { PALETTES, LOOKS } from "./navier-stokes-looks.js";

const CONFIG = {
  background: "#060909",
  strands: { mobile: 36, desktop: 64, samples: 260, radius: 1.25, axialSeed: 0.012, axialSpread: 0.065, extent: 1.85 },
  camera: { perspective: 1600, rotationX: 0.22, rotationY: 0.4, screenRotation: -0.16 },
  motion: { speed: 1.3, orbit: 24, maxOrbit: 60, drag: 0.006, maxDt: 0.05, pulseWidth: 0.025 },
  appearance: { palette: "copper", look: "neon", maxBloom: 2, maxGlow: 1.5, mobileGlowScale: 0.55 },
  caption: { spacing: 12, paddingX: 20, paddingY: 16, background: "rgba(3,12,20,0.96)", border: "#315b72", title: "#f2c879", subtitle: "#83cfff", equation: "#b7d6e8" },
  ui: { panelWidth: 300, panelTop: 48, padding: 14, spacing: 8, margin: 12, buttonHeight: 36, toggleWidth: 128, captionBottom: 42, compactWidth: 900, compactHeight: 650, minZoom: 0.5, maxZoom: 2, wheelZoom: 0.001 },
  layout: { leftX: 0.33, widthScale: 0.39, heightScale: 0.24, centerY: 0.47, embed: { widthScale: 0.42, heightScale: 0.264, centerY: 0.5 } },
  gpu: {
    lineWidth: 2.4,
    visual: { minHue: 26, maxHue: 210, saturation: 58, lightness: 58, maxAlpha: 0.48, hueJitter: 0 },
    bloom: { enabled: true, threshold: 0.3, strength: 0.3, radius: 0.5, passes: 1 },
    glow: { enabled: false },
    background: { baseColor: [0.012, 0.023, 0.02], fogDensity: 0.045, noiseScale: 2, animSpeed: 0.025 },
    // Physical travel highlights are separate from the optional decorative shimmer.
    energyFlow: { intensity: 0, speed: 0, sparkThreshold: 1.1 },
    depthFog: { enabled: true, density: 0.8, energyFalloff: 0.4 },
    iridescence: { enabled: false },
    colorGrading: { enabled: true, exposure: 1.1, vignetteStrength: 0.3, vignetteRadius: 0.85, grainIntensity: 0.008, warmth: 0.06, bleach: 0.15 },
  },
};

export const PRESETS = {
  balance: { viscosity: 0.008, strain: 0.18, circulation: 1.5, label: "01 / BALANCE" },
  silk: { viscosity: 0.021, strain: 0.11, circulation: 1.1, label: "02 / SILK" },
  coil: { viscosity: 0.004, strain: 0.29, circulation: 2.1, label: "03 / COIL" },
};

const MOTION_PRESETS = { slow: 6, fast: CONFIG.motion.orbit };

/** Burgers vortex in normalized units: ur = -αr/2, uz = αz.
 * ω(r) = Γ/(2πr²) [1 - exp(-αr²/(4ν))]. The axis limit is finite.
 * Reference: https://arxiv.org/abs/1002.2489
 */
export function angularVelocity(radius, { strain, viscosity, circulation }) {
  const r2 = radius * radius;
  if (r2 < 1e-12) return circulation * strain / (8 * Math.PI * viscosity);
  return circulation * -Math.expm1(-strain * r2 / (4 * viscosity)) / (2 * Math.PI * r2);
}

export function vortexVelocity(x, y, z, parameters) {
  const omega = angularVelocity(Math.hypot(x, y), parameters);
  const a = parameters.strain;
  return { x: -a * x / 2 - omega * y, y: -a * y / 2 + omega * x, z: a * z };
}

/** Exact radial/axial evolution; midpoint quadrature for angular travel.
 * Finite streamline window, not a singularity simulation. z*r² is conserved.
 */
export function traceVortex(radius, axialSeed, phase, parameters, samples = CONFIG.strands.samples) {
  const duration = Math.log(CONFIG.strands.extent / Math.abs(axialSeed)) / parameters.strain;
  const dt = duration / (samples - 1);
  const points = [];
  let theta = phase;
  const maxOmega = angularVelocity(0, parameters);
  for (let i = 0; i < samples; i++) {
    const time = i * dt;
    const r = radius * Math.exp(-parameters.strain * time / 2);
    if (i) theta += angularVelocity(radius * Math.exp(-parameters.strain * (time - dt / 2) / 2), parameters) * dt;
    points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), z: axialSeed * Math.exp(parameters.strain * time), heat: angularVelocity(r, parameters) / maxOmega });
  }
  return { points, duration };
}

class VortexField extends GameObject {
  constructor(game) {
    // Full-canvas layer: top-left origin. Projected points are in this local space.
    super(game, { origin: "top-left", x: 0, y: 0, interactive: false });
    this.camera = new Camera3D(CONFIG.camera);
    this.time = 0;
    this.parameters = { ...PRESETS.balance };
    this.gpu = new WebGLAttractorPipeline(game.width, game.height, CONFIG.strands.desktop * (CONFIG.strands.samples - 1), CONFIG.gpu);
    this.gpu.init();
    this.gpu.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.gpu.available = false;
      game.refresh();
    });
    this.resize();
  }

  rebuild() {
    const count = this.game.width <= 700 ? CONFIG.strands.mobile : CONFIG.strands.desktop;
    this.paths = Array.from({ length: count }, (_, i) => {
      const spread = (i * 0.61803398875) % 1;
      const axial = (CONFIG.strands.axialSeed + spread * CONFIG.strands.axialSpread) * (i % 2 ? -1 : 1);
      const path = traceVortex(CONFIG.strands.radius * (0.8 + spread * 0.2), axial, i * 2.39996322973, this.parameters);
      path.phase = spread;
      return path;
    });
    // Reuse segment records across frames instead of allocating thousands each tick.
    this.segments = Array.from({ length: count * (CONFIG.strands.samples - 1) }, () => ({}));
  }

  resize() {
    this.width = this.game.width;
    this.height = this.game.height;
    const clean = this.game.ambient || this.game.embed;
    const availableWidth = !this.game.compact && !clean ? this.width - CONFIG.ui.panelWidth - CONFIG.ui.margin * 2 : this.width;
    const layout = this.game.embed ? CONFIG.layout.embed : CONFIG.layout;
    this.scale = Math.min(availableWidth * layout.widthScale, this.height * layout.heightScale) * this.game.zoom;
    this.gpu.lineWidth = CONFIG.gpu.lineWidth * Math.max(0.3, Math.min(1, this.scale / 180));
    this.gpu.setGlowConfig({ radius: LOOKS[this.game.activeLook].glow.radius * (this.game.compact ? CONFIG.appearance.mobileGlowScale : 1) });
    this.centerX = this.game.focusLeft && !this.game.compact ? this.width * CONFIG.layout.leftX : availableWidth / 2;
    this.centerY = this.height * layout.centerY;
    if (this.gpu.width !== this.width || this.gpu.height !== this.height) this.gpu.resize(this.width, this.height);
    this.rebuild();
  }

  update(dt) {
    super.update(dt);
    if (this.game.paused) return;
    this.time += Math.min(dt, CONFIG.motion.maxDt) * CONFIG.motion.speed;
    if (!this.game.dragging) this.camera.rotationY += Math.min(dt, CONFIG.motion.maxDt) * this.game.autoMove * Math.PI / 180;
  }

  collectSegments() {
    let index = 0;
    for (const path of this.paths) {
      const travel = (this.time / path.duration + path.phase) % 1;
      let previous;
      for (let i = 0; i < path.points.length; i++) {
        const point = path.points[i];
        // The physical z axis becomes screen-up; Camera3D remains centered at zero.
        const projected = this.camera.project(point.x * this.scale, -point.z * this.scale, point.y * this.scale);
        if (previous) {
          const t = i / (path.points.length - 1);
          const edge = Math.min(1, t * 12, (1 - t) * 12);
          const distance = Math.abs(t - travel);
          const pulse = Math.exp(-Math.pow(distance / CONFIG.motion.pulseWidth, 2));
          const segment = this.segments[index++];
          segment.x1 = this.centerX + previous.x;
          segment.y1 = this.centerY + previous.y;
          segment.x2 = this.centerX + projected.x;
          segment.y2 = this.centerY + projected.y;
          // Copper keeps two distinct bands; other palettes blend along core rotation.
          segment.speedNorm = PALETTES[this.game.activePalette].banded
            ? (point.heat < 0.8 ? (1 - point.heat / 0.8) * 0.14 : 0.94 + (point.heat - 0.8) * 0.3)
            : point.heat;
          segment.age = (1 - edge) * 1.4 + 0.1;
          segment.blink = pulse * edge;
          segment.segIdx = t;
          segment.depth1 = Math.max(0, Math.min(1, 0.5 + previous.z / (this.scale * 3)));
          segment.depth2 = Math.max(0, Math.min(1, 0.5 + projected.z / (this.scale * 3)));
        }
        previous = projected;
      }
    }
  }

  draw() {
    super.draw();
    this.collectSegments();
    if (this.gpu.isAvailable()) {
      this.gpu.beginFrame(this.time);
      this.gpu.updateLines(this.segments);
      this.gpu.renderLines(this.segments.length, this.time, 0);
      this.gpu.endFrame();
      Painter.useCtx((ctx) => this.gpu.compositeOnto(ctx), { saveState: true });
    } else {
      Painter.shapes.rect(0, 0, this.width, this.height, CONFIG.background);
      for (const s of this.segments) {
        const { minHue, maxHue, saturation, lightness } = this.gpu.visualConfig;
        const hue = maxHue - s.speedNorm * (maxHue - minHue);
        const alpha = Math.max(0, 1 - s.age * 0.7) * (0.3 + s.blink * 0.5) * (1 - s.depth2 * 0.6);
        Painter.lines.line(s.x1, s.y1, s.x2, s.y2, `hsla(${hue},${saturation}%,${lightness}%,${alpha})`, 1);
      }
    }
  }
}

export class NavierStokesDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.theme = THEMES.vortex;
    const query = new URLSearchParams(location.search);
    this.embed = query.get("embed") === "1";
    this.ambient = this.embed || query.get("ambient") === "1";
    this.focusLeft = query.get("focus") === "left";
    this.paused = Screen.prefersReducedMotion();
    this.zoom = 1;
    this.activePreset = "balance";
    this.autoMove = CONFIG.motion.orbit;
    this.activeMotion = "fast";
    this.activePalette = CONFIG.appearance.palette;
    this.activeLook = CONFIG.appearance.look;
    this.backgroundColor = CONFIG.background;
    this.listeners = new AbortController();
    this.enableFluidSize();
  }

  get compact() { return this.width < CONFIG.ui.compactWidth || this.height < CONFIG.ui.compactHeight; }

  init() {
    super.init();
    Screen.init(this);
    for (const [name, value] of Object.entries({ accent: this.theme.colors.lightText, gold: this.theme.slider.label.value, surface: this.theme.colors.darkBg, border: this.theme.colors.subtleBorder })) {
      document.documentElement.style.setProperty(`--vortex-${name}`, value);
    }
    this.panelOpen = !this.compact && !this.ambient;
    this.field = new VortexField(this);
    this.setPalette(this.activePalette);
    this.setLook(this.activeLook);
    this.pipeline.add(this.field);
    this.buildUI();
    this.listen(document, "DOMContentLoaded", () => this.layoutUI());
    // Touch already goes through Input; suppress the browser's duplicate mouse click.
    this.listen(this.canvas, "touchstart", (event) => event.preventDefault());
    this.events.on("inputdown", (event) => {
      if (this._uiHandledInput || this.pointerOverPanel(event)) return;
      this.dragging = true;
      this.pointer = { x: event.x, y: event.y };
    });
    this.events.on("inputmove", (event) => {
      if (!this.dragging) return;
      this.field.camera.rotationY += (event.x - this.pointer.x) * CONFIG.motion.drag;
      this.field.camera.rotationX += (event.y - this.pointer.y) * CONFIG.motion.drag;
      this.pointer = { x: event.x, y: event.y };
    });
    this.events.on("inputup", () => { this.dragging = false; });
    for (const name of ["pointerup", "pointercancel", "blur"]) this.listen(window, name, () => { this.dragging = false; });
    this.listen(document, "visibilitychange", () => {
      if (document.hidden) this.stop();
      else this.resume();
    });
    this.listen(window, "keydown", (event) => {
      if (/INPUT|BUTTON|A|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === "Space") { event.preventDefault(); this.togglePause(); }
      if (event.code === "KeyH") { this.ambient = !this.ambient; this.panelOpen = !this.ambient; this.layoutUI(); }
      if (event.code === "KeyR") this.reset();
    });
    this.listen(this.canvas, "wheel", (event) => {
      if (this._uiPointerOverInteractive || this.pointerOverPanel({ x: event.offsetX, y: event.offsetY })) return;
      event.preventDefault();
      this.zoom = Math.max(CONFIG.ui.minZoom, Math.min(CONFIG.ui.maxZoom, this.zoom * Math.exp(-event.deltaY * CONFIG.ui.wheelZoom)));
      this.syncControls();
      this.field.resize();
    });
  }

  listen(target, name, callback) { target.addEventListener(name, callback, { signal: this.listeners.signal, passive: false }); }

  pointerOverPanel(point) {
    return this.panel?.visible && point.x >= this.panel.x && point.x <= this.panel.x + this.panel.width * this.panel.scaleX &&
      point.y >= this.panel.y && point.y <= this.panel.y + this.panel.height * this.panel.scaleY;
  }

  buildUI() {
    const width = Math.min(CONFIG.ui.panelWidth, this.width - CONFIG.ui.margin * 2);
    const panel = new AccordionGroup(this, {
      width, padding: this.compact ? 8 : CONFIG.ui.padding, spacing: this.compact ? 4 : CONFIG.ui.spacing,
      headerHeight: this.compact ? 24 : 28,
      origin: "top-left", debug: true, debugColor: this.theme.colors.subtleBorder,
    });
    this.panel = panel;
    const draw = panel.draw.bind(panel);
    panel.draw = () => {
      Painter.shapes.rect(0, 0, panel.width * panel.scaleX, panel.height * panel.scaleY, this.theme.colors.darkBg);
      draw();
    };
    this.pipeline.add(panel);
    this.controls = {};
    this.controls.preset = new Dropdown(this, {
      label: "FLOW", width: panel.itemWidth, origin: "center",
      options: [
        { label: "Balance", value: "balance" }, { label: "Silk", value: "silk" },
        { label: "Coil", value: "coil" }, { label: "Custom", value: "custom" },
      ],
      value: this.activePreset,
      onChange: (name) => { if (!this.syncing && PRESETS[name]) this.setPreset(name); },
    });
    panel.addItem(this.controls.preset);
    this.parametersSection = panel.addSection("Parameters", { expanded: false });
    this.motionSection = panel.addSection("Motion", { expanded: false });
    this.appearanceSection = panel.addSection("Color & light", { expanded: !this.compact });
    this.viewSection = panel.addSection("View", { expanded: false });
    for (const [name, label, presets, value, apply] of [
      ["palette", "PALETTE", PALETTES, this.activePalette, (name) => this.setPalette(name)],
      ["look", "LOOK", LOOKS, this.activeLook, (name) => this.setLook(name)],
    ]) {
      this.controls[name] = new Dropdown(this, {
        label, width: panel.itemWidth, origin: "center", value,
        options: Object.entries(presets).map(([value, preset]) => ({ label: preset.label, value })),
        onChange: (name) => { if (!this.syncing) apply(name); },
      });
      this.appearanceSection.addItem(this.controls[name]);
    }
    for (const [name, label, min, max, step, digits] of [
      ["viscosity", "VISCOSITY (ν)", 0.002, 0.025, 0.001, 3],
      ["strain", "AXIAL STRETCH (α)", 0.08, 0.36, 0.01, 2],
    ]) {
      this.controls[name] = new Slider(this, {
        label, min, max, step, width: panel.itemWidth, origin: "center",
        value: this.field.parameters[name], formatValue: (value) => value.toFixed(digits),
        onChange: (value) => {
          if (this.syncing) return;
          this.field.parameters[name] = value;
          this.activePreset = "custom";
          this.field.rebuild();
          this.syncControls();
        },
      });
      this.parametersSection.addItem(this.controls[name]);
    }
    this.controls.motionPreset = new Dropdown(this, {
      label: "MOVEMENT", width: panel.itemWidth, origin: "center",
      options: [{ label: "Slow", value: "slow" }, { label: "Fast", value: "fast" }, { label: "Custom", value: "custom" }],
      value: this.activeMotion,
      onChange: (name) => {
        if (this.syncing || !(name in MOTION_PRESETS)) return;
        this.activeMotion = name;
        this.autoMove = MOTION_PRESETS[name];
        this.syncControls();
      },
    });
    this.controls.autoMove = new Slider(this, {
      label: "AUTO MOVE", width: panel.itemWidth, origin: "center",
      min: 0, max: CONFIG.motion.maxOrbit, step: 1, value: this.autoMove,
      formatValue: (value) => value === 0 ? "Off" : `${value.toFixed(0)}°/s`,
      onChange: (value) => {
        if (this.syncing) return;
        this.autoMove = value;
        this.activeMotion = Object.keys(MOTION_PRESETS).find((name) => MOTION_PRESETS[name] === value) || "custom";
        this.syncControls();
      },
    });
    this.motionSection.addItem(this.controls.motionPreset);
    this.motionSection.addItem(this.controls.autoMove);
    this.controls.zoom = new Slider(this, {
      label: "SCALE", width: panel.itemWidth, origin: "center",
      min: CONFIG.ui.minZoom, max: CONFIG.ui.maxZoom, step: 0.05, value: this.zoom,
      formatValue: (value) => value.toFixed(2),
      onChange: (value) => { if (!this.syncing) { this.zoom = value; this.field.resize(); } },
    });
    this.controls.bloom = new Slider(this, {
      label: "BLOOM", width: panel.itemWidth, origin: "center",
      min: 0, max: CONFIG.appearance.maxBloom, step: 0.05, value: this.field.gpu.bloomConfig.strength,
      formatValue: (value) => value.toFixed(2),
      onChange: (value) => { if (!this.syncing) this.field.gpu.setBloomConfig({ strength: value }); },
    });
    this.viewSection.addItem(this.controls.zoom);
    this.viewSection.addItem(this.controls.bloom);
    this.controls.glow = new Slider(this, {
      label: "GLOW", width: panel.itemWidth, origin: "center",
      min: 0, max: CONFIG.appearance.maxGlow, step: 0.05, value: this.field.gpu.glowConfig.intensity,
      formatValue: (value) => value.toFixed(2),
      onChange: (value) => { if (!this.syncing) this.field.gpu.setGlowConfig({ enabled: value > 0, intensity: value }); },
    });
    this.viewSection.addItem(this.controls.glow);
    this.pauseButton = new Button(this, {
      text: this.paused ? "Resume" : "Pause", width: panel.itemWidth,
      height: CONFIG.ui.buttonHeight, origin: "center", onClick: () => this.togglePause(),
    });
    panel.addItem(this.pauseButton);
    panel.addItem(new Button(this, {
      text: "Reset Defaults", width: panel.itemWidth, height: CONFIG.ui.buttonHeight,
      origin: "center", onClick: () => this.reset(),
    }));
    // On small screens, expand one section at a time so all controls remain reachable.
    const sections = [this.parametersSection, this.motionSection, this.appearanceSection, this.viewSection];
    for (const section of sections) {
      const toggle = section.toggle.bind(section);
      section.toggle = (force) => {
        if (this.compact && force !== false && !section.expanded) {
          for (const other of sections) if (other !== section) other.toggle(false);
        }
        toggle(force);
      };
    }
    const layout = panel.layout.bind(panel);
    panel.layout = () => { layout(); this.layoutUI(); };
    panel.layoutAll();

    this.toggleButton = new Button(this, {
      text: "Controls", width: CONFIG.ui.toggleWidth, height: CONFIG.ui.buttonHeight,
      origin: "center", x: CONFIG.ui.margin + CONFIG.ui.toggleWidth / 2, y: CONFIG.ui.margin + CONFIG.ui.buttonHeight / 2,
      onClick: () => { this.ambient = false; this.panelOpen = !this.panelOpen; this.layoutUI(); },
    });
    this.pipeline.add(this.toggleButton);
    this.caption = new VerticalLayout(this, { spacing: CONFIG.caption.spacing, align: "center", origin: "top-left", interactive: false });
    this.caption.getLayoutOffset = () => ({ offsetX: 0, offsetY: 0 });
    const captionLayout = this.caption.calculateLayout.bind(this.caption);
    this.caption.calculateLayout = () => {
      const layout = captionLayout();
      // VerticalLayout returns left edges on X; the text uses center origins.
      layout.positions.forEach((position, index) => {
        position.x += this.caption.children[index].width / 2;
      });
      return layout;
    };
    const captionDraw = this.caption.draw.bind(this.caption);
    this.caption.draw = () => {
      const { paddingX, paddingY, background, border } = CONFIG.caption;
      Painter.shapes.roundRect(-paddingX, -paddingY, this.caption.width + paddingX * 2, this.caption.height + paddingY * 2, 8, background, border, 1);
      captionDraw();
    };
    const fontSize = this.compact ? 17 : 26;
    this.title = new Text(this, "NAVIER–STOKES", { font: `bold ${fontSize}px ${UI_THEME.fonts.family}`, color: CONFIG.caption.title, align: "center", origin: "center" });
    this.subtitle = new Text(this, this.compact ? "Burgers vortex · drag to orbit" : "Inward spiraling, axial stretching, viscous balance", {
      font: `${this.compact ? 10 : 14}px ${UI_THEME.fonts.family}`, color: CONFIG.caption.subtitle, align: "center", origin: "center",
    });
    this.equation = new Text(this, "∂u/∂t + (u·∇)u = −∇p + ν∇²u   ∇·u = 0", {
      font: `${this.compact ? 9 : 12}px ${UI_THEME.fonts.family}`, color: CONFIG.caption.equation, align: "center", origin: "center",
    });
    this.caption.add(this.title);
    this.caption.add(this.subtitle);
    this.caption.add(this.equation);
    this.pipeline.add(this.caption);
    this.uiCompact = this.compact;
    this.layoutUI();
  }

  update(dt) {
    super.update(dt);
    // Text dimensions become available during pipeline update (and after font loading).
    this.positionCaption();
  }

  positionCaption() {
    if (!this.caption) return;
    const availableWidth = !this.compact && this.panel.visible ? this.panel.x : this.width;
    this.caption.x = (availableWidth - this.caption.width) / 2;
    this.caption.y = this.height - this.caption.height - CONFIG.ui.captionBottom;
  }

  layoutUI() {
    if (!this.panel) return;
    this.panel.visible = this.panelOpen && !this.ambient && !this.embed;
    this.panel.interactive = this.panel.visible;
    const panelTop = this.compact ? CONFIG.ui.margin : CONFIG.ui.panelTop;
    const panelScale = Math.min(1, (this.height - panelTop - CONFIG.ui.margin) / this.panel.height);
    this.panel.scaleX = this.panel.scaleY = panelScale;
    this.panel.x = this.compact ? (this.width - this.panel.width * panelScale) / 2 : this.width - this.panel.width * panelScale - CONFIG.ui.margin;
    this.panel.y = this.compact ? this.height - this.panel.height * panelScale - CONFIG.ui.margin : panelTop;
    if (this.toggleButton) {
      this.toggleButton.visible = !this.embed && (this.compact || this.ambient);
      this.toggleButton.interactive = this.toggleButton.visible;
      this.toggleButton.text = this.panel.visible ? "Close controls" : "Controls";
    }
    if (this.caption) {
      this.caption.visible = !this.ambient && !this.embed && !(this.compact && this.panel.visible);
      this.caption._layoutDirty = true;
      this.caption.update(0);
      this.positionCaption();
    }
    for (const id of ["info", "info-toggle"]) {
      const element = document.getElementById(id);
      if (element) element.style.display = this.embed || this.ambient ? "none" : "";
    }
    this.field?.resize();
  }

  setPreset(name) {
    this.activePreset = name;
    this.field.parameters = { ...PRESETS[name] };
    this.field.rebuild();
    this.syncControls();
  }

  setPalette(name) {
    if (!PALETTES[name]) return;
    this.activePalette = name;
    this.field.gpu.setVisualConfig(PALETTES[name]);
    this.syncControls();
  }

  setLook(name) {
    if (!LOOKS[name]) return;
    this.activeLook = name;
    const look = LOOKS[name];
    this.field.gpu.setBloomConfig({ ...look.bloom, enabled: true });
    this.field.gpu.setGlowConfig({ ...look.glow, enabled: look.glow.intensity > 0, radius: look.glow.radius * (this.compact ? CONFIG.appearance.mobileGlowScale : 1) });
    this.field.gpu.setEnergyConfig(look.energy);
    this.field.gpu.setIridescenceConfig(look.iridescence);
    this.syncControls();
  }

  syncControls() {
    if (!this.controls) return;
    this.syncing = true;
    this.controls.preset.value = this.activePreset;
    this.controls.viscosity.value = this.field.parameters.viscosity;
    this.controls.strain.value = this.field.parameters.strain;
    this.controls.zoom.value = this.zoom;
    this.controls.bloom.value = this.field.gpu.bloomConfig.strength;
    this.controls.motionPreset.value = this.activeMotion;
    this.controls.autoMove.value = this.autoMove;
    this.controls.palette.value = this.activePalette;
    this.controls.look.value = this.activeLook;
    this.controls.glow.value = this.field.gpu.glowConfig.intensity;
    this.syncing = false;
  }

  togglePause() {
    // Keep the UI pipeline alive: only the fluid clock and camera motion pause.
    this.paused = !this.paused;
    this.pauseButton.text = this.paused ? "Resume" : "Pause";
  }

  reset() {
    Object.assign(this.field.camera, CONFIG.camera);
    this.field.time = 0;
    this.zoom = 1;
    this.autoMove = CONFIG.motion.orbit;
    this.activeMotion = "fast";
    this.setPalette(CONFIG.appearance.palette);
    this.setLook(CONFIG.appearance.look);
    this.setPreset("balance");
    this.field.resize();
  }

  refresh() { if (!this.running && this.field) this.render(); }

  onResize() {
    if (!this.field) return;
    const width = Math.min(CONFIG.ui.panelWidth, this.width - CONFIG.ui.margin * 2);
    if (this.panel && (this.uiCompact !== this.compact || this.panel.width !== width)) {
      for (const object of [this.panel, this.toggleButton, this.caption]) {
        object.interactive = false;
        this.pipeline.remove(object);
      }
      this.panelOpen = !this.compact && !this.ambient;
      this.buildUI();
    }
    this.uiCompact = this.compact;
    this.layoutUI();
  }

  destroy() {
    this.stop();
    this.listeners.abort();
    this.disableFluidSize();
    this.field?.gpu.destroy();
  }
}

const canvas = document.getElementById("game");
if (canvas) {
  const demo = new NavierStokesDemo(canvas);
  demo.start();
  window.navierStokesDemo = demo;
}

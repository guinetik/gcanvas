import { Game, GameObject, Painter, Camera3D, Screen, WebGLAttractorPipeline, THEMES } from "../../src/index.js";
import { coreScales, advanceDecades, createCorePaths, viewScales, SINGULARITY_CONFIG as MODEL } from "./singularity-model.js";
import { UI_CONFIG, buildSingularityUI, syncSingularityUI } from "./singularity-ui.js";
import { PALETTES, LOOKS } from "./navier-stokes-looks.js";

const LOOK = LOOKS.nebula;

const CONFIG = {
  background: "#030910", compactWidth: 900, compactHeight: 650,
  camera: { perspective: 1800, rotationX: 0.25, rotationY: 0.35, screenRotation: -0.2 },
  fit: { width: 0.56, height: 0.50 }, centerY: 0.47, offsetX: 0, mobileGlowScale: 0.55, drag: 0.006, maxDt: 0.05,
  motion: { autoMove: 24, maxAutoMove: 60 }, // Y-axis degrees per second, like Navier–Stokes.
  zoom: { min: 0.35, max: 6, wheel: 0.0015, linePixels: 16 },
  reference: { stride: 8, color: "rgba(112,162,180,0.18)" },
  // Fiber-optic packets: dark fiber, bright light walking in the flow direction.
  // Packet tempo follows the physical shrinkage: speed ~ (1/radius)^exponent, capped.
  highlights: { pulses: 3, travel: 0.22, width: 0.01, jitter: 0.25, tempo: { exponent: 0.15, max: 6 } },
  pulses: { rings: 8, samples: 96, radius: 1.08, ripple: 0.025, waves: 18, height: 0.8, speed: 1.6 },
  inset: { x: 32, y: 150, width: 164, height: 145, scale: 42, minWidth: 1000, minHeight: 670 },
  gpu: {
    lineWidth: 1.5, visual: { ...PALETTES.copper, maxAlpha: 0.22, hueJitter: 0 },
    blink: { intensityBoost: 2.6, saturationBoost: 1.6, alphaBoost: 3.2 },
    bloom: { enabled: true, ...LOOK.bloom, passes: 1 },
    glow: { enabled: true, ...LOOK.glow },
    background: { baseColor: [0.009, 0.02, 0.03], fogDensity: 0.035, noiseScale: 2, animSpeed: 0 },
    energyFlow: LOOK.energy,
    depthFog: { enabled: true, density: 0.55, energyFalloff: 0.4 },
    iridescence: LOOK.iridescence,
    colorGrading: { enabled: true, exposure: 1.05, vignetteStrength: 0.25, grainIntensity: 0, warmth: 0.03 },
  },
};

class ConcentratingCore extends GameObject {
  constructor(game) {
    super(game, { origin: "top-left", x: 0, y: 0, interactive: false });
    this.camera = new Camera3D(CONFIG.camera);
    this.paths = createCorePaths(game.compact ? MODEL.strands / 2 : MODEL.strands);
    this.time = 0;
    const capacity = MODEL.strands * (MODEL.samples - 1) + CONFIG.pulses.rings * CONFIG.pulses.samples;
    this.segments = Array.from({ length: capacity }, () => ({}));
    this.activeSegments = [];
    this.gpu = new WebGLAttractorPipeline(game.width, game.height, capacity, CONFIG.gpu);
    this.gpu.init();
    game.listen(this.gpu.canvas, "webglcontextlost", (event) => { event.preventDefault(); this.gpu.available = false; });
    this.resize();
  }

  resize() {
    this.width = this.game.width; this.height = this.game.height;
    this.scale = Math.min(this.width * CONFIG.fit.width, this.height * CONFIG.fit.height);
    this.cx = this.width / 2 + CONFIG.offsetX; this.cy = this.height * CONFIG.centerY;
    this.gpu.setGlowConfig({ radius: LOOK.glow.radius * (this.game.compact ? CONFIG.mobileGlowScale : 1) });
    if (this.gpu.width !== this.width || this.gpu.height !== this.height) this.gpu.resize(this.width, this.height);
  }

  project(point, radial, axial, scale = this.scale, cx = this.cx, cy = this.cy, zoom = this.game.zoom) {
    const p = this.camera.project(point.x * radial * scale, -point.z * axial * scale, point.y * radial * scale);
    // Magnify after projection so wheel zoom cannot move geometry through the camera.
    return { x: cx + p.x * zoom, y: cy + p.y * zoom, z: p.z };
  }

  segment(a, b, heat, alpha, blink = 0) {
    const index = this.activeSegments.length, segment = this.segments[index];
    segment.x1 = a.x; segment.y1 = a.y; segment.x2 = b.x; segment.y2 = b.y;
    // Two color bands follow the existing Copper Tide art direction.
    segment.speedNorm = heat < 0.65 ? (1 - heat / 0.65) * 0.14 : 0.94 + (heat - 0.65) / 0.35 * 0.06;
    segment.age = (1 - alpha) * 1.3; segment.blink = blink;
    segment.segIdx = index / this.segments.length;
    segment.depth1 = Math.max(0, Math.min(1, 0.5 + a.z / (this.scale * 4)));
    segment.depth2 = Math.max(0, Math.min(1, 0.5 + b.z / (this.scale * 4)));
    this.activeSegments.push(segment);
  }

  collect() {
    this.activeSegments.length = 0;
    const view = viewScales(this.game.scales, this.game.magnify);
    const hl = CONFIG.highlights;
    // Packets hurry as the core shrinks: a tamed power of the real speed scale.
    const tempo = Math.min(hl.tempo.max, this.game.scales.radius ** -hl.tempo.exponent);
    for (let strand = 0; strand < this.paths.length; strand++) {
      const path = this.paths[strand];
      const rate = hl.travel * tempo * (1 + hl.jitter * (((strand * 0.618) % 1) - 0.5));
      const travel = (this.time * rate + strand / this.paths.length) % 1;
      let previous;
      for (const point of path) {
        const p = this.project(point, view.radial, view.axial);
        if (previous) {
          const edge = Math.min(1, point.s * 12, (1 - point.s) * 10);
          // Comb of pulses along s; distance to the nearest one, wrapped.
          const comb = (point.s - travel) * hl.pulses;
          const blink = Math.exp(-Math.pow((comb - Math.round(comb)) / (hl.pulses * hl.width), 2));
          this.segment(previous, p, point.s, edge, blink * edge);
        }
        previous = p;
      }
    }
    if (!this.game.pulses) return;
    const c = CONFIG.pulses;
    for (let ring = 0; ring < c.rings; ring++) {
      const family = ring % 2;
      const height = ((ring / (c.rings - 1)) * 2 - 1) * c.height;
      const envelope = 0.3 + 0.7 * Math.sin(this.time * c.speed + ring) ** 2;
      let previous;
      for (let i = 0; i <= c.samples; i++) {
        const theta = i / c.samples * Math.PI * 2;
        const r = c.radius + c.ripple * envelope * Math.sin(theta * c.waves + this.time * c.speed + family * Math.PI);
        const point = this.project({ x: r * Math.cos(theta), y: r * Math.sin(theta), z: height }, view.radial, view.axial);
        if (previous) this.segment(previous, point, family ? 0.95 : 0.05, 0.4 + 0.3 * envelope);
        previous = point;
      }
    }
  }

  update(dt) {
    super.update(dt);
    if (this.game.paused) return;
    this.time += Math.min(dt, CONFIG.maxDt);
    if (!this.game.dragging) this.camera.rotationY += Math.min(dt, CONFIG.maxDt) * this.game.autoMove * Math.PI / 180;
  }

  draw() {
    super.draw();
    this.collect();
    if (this.gpu.isAvailable()) {
      this.gpu.beginFrame(this.time);
      this.gpu.updateLines(this.activeSegments);
      this.gpu.renderLines(this.activeSegments.length, this.time, 0);
      this.gpu.endFrame();
      Painter.useCtx((ctx) => this.gpu.compositeOnto(ctx), { saveState: true });
    } else {
      for (const s of this.activeSegments) {
        const hue = PALETTES.copper.maxHue - s.speedNorm * (PALETTES.copper.maxHue - PALETTES.copper.minHue);
        Painter.lines.line(s.x1, s.y1, s.x2, s.y2, `hsla(${hue},76%,65%,${Math.max(0, 1 - s.age * 0.7) * (0.16 + s.blink * 0.8)})`, 1);
      }
    }
    if (!this.game.magnify) this.drawReference();
    if (!this.game.clean && this.width >= CONFIG.inset.minWidth && this.height >= CONFIG.inset.minHeight) this.drawInset();
  }

  drawReference() {
    // The initial footprint stays fixed while the current core contracts inside it.
    for (const path of this.paths.filter((_, i) => i % CONFIG.reference.stride < 2)) {
      let previous;
      for (const point of path) {
        const p = this.project(point, 1, 1);
        if (previous) Painter.lines.line(previous.x, previous.y, p.x, p.y, CONFIG.reference.color, 1);
        previous = p;
      }
    }
  }

  drawInset() {
    const c = CONFIG.inset, scales = this.game.scales;
    Painter.shapes.roundRect(c.x, c.y, c.width, c.height, 8, "#061019dd", "#233944", 1);
    Painter.text.fillText("FIXED SCALE", c.x + 12, c.y + 20, "#8da9b3", "10px monospace");
    const cx = c.x + c.width / 2, cy = c.y + c.height / 2 + 8;
    for (const [radius, height, color] of [[1, 1, "#233944"], [scales.radius, scales.height, "#70e2da"]]) {
      for (const path of this.paths.filter((_, i) => i % 8 < 2)) {
        let previous;
        for (const point of path) {
          const p = this.project(point, radius, height, c.scale, cx, cy, 1);
          if (previous) Painter.lines.line(previous.x, previous.y, p.x, p.y, color, 1);
          previous = p;
        }
      }
    }
    Painter.text.fillText(scales.radius * c.scale < 1 ? "Core below one pixel" : "Initial / current core", c.x + 12, c.y + c.height - 10, "#8da9b3", "10px monospace");
  }
}

export class SingularityDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.theme = THEMES.vortex;
    const query = new URLSearchParams(location.search);
    this.embed = query.get("embed") === "1";
    this.clean = this.embed || query.get("ambient") === "1";
    this.backgroundColor = CONFIG.background;
    this.paused = Screen.prefersReducedMotion();
    this.decades = 0; this.scales = coreScales(0); this.rate = 1;
    this.magnify = false; this.pulses = true; this.zoom = 1;
    this.autoMove = CONFIG.motion.autoMove;
    this.listeners = new AbortController();
    this.enableFluidSize();
  }

  get compact() { return this.width <= CONFIG.compactWidth || this.height <= CONFIG.compactHeight; }
  listen(target, event, callback) { target.addEventListener(event, callback, { signal: this.listeners.signal }); }

  init() {
    super.init();
    Screen.init(this);
    this.panelOpen = !this.compact && !this.clean;
    this.field = new ConcentratingCore(this);
    this.pipeline.add(this.field);
    buildSingularityUI(this);
    this.listen(document, "DOMContentLoaded", () => this.layoutUI());
    // Match the other fluid demos: Input owns touch/mouse dispatch and UI capture.
    this.listen(this.canvas, "touchstart", (event) => event.preventDefault());
    this.events.on("inputdown", (event) => {
      if (this._uiHandledInput || this.pointerOverPanel(event)) return;
      this.dragging = true;
      this.pointer = { x: event.x, y: event.y };
    });
    this.events.on("inputmove", (event) => {
      if (!this.dragging) return;
      this.field.camera.rotationY += (event.x - this.pointer.x) * CONFIG.drag;
      this.field.camera.rotationX += (event.y - this.pointer.y) * CONFIG.drag;
      this.pointer = { x: event.x, y: event.y };
    });
    this.events.on("inputup", () => { this.dragging = false; });
    for (const name of ["pointerup", "pointercancel", "blur"]) this.listen(window, name, () => { this.dragging = false; });
    this.listen(window, "keydown", (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || /^(INPUT|SELECT|BUTTON|TEXTAREA|SUMMARY|A)$/.test(event.target.tagName)) return;
      if (event.code === "Space") { event.preventDefault(); this.togglePause(); }
      if (event.code === "KeyR") this.reset();
      if (event.code === "KeyH") { this.clean = !this.clean; this.panelOpen = !this.clean; this.layoutUI(); }
    });
    this.listen(document, "visibilitychange", () => { if (document.hidden) this.stop(); else this.resume(); });
    this.listen(this.canvas, "wheel", (event) => {
      if (event.ctrlKey || this._uiPointerOverInteractive || this.pointerOverPanel({ x: event.offsetX, y: event.offsetY })) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? CONFIG.zoom.linePixels : event.deltaMode === 2 ? this.height : 1;
      this.setZoom(this.zoom * Math.exp(-event.deltaY * unit * CONFIG.zoom.wheel));
    });
  }

  setZoom(zoom) {
    this.zoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, zoom));
    this.syncUI();
  }

  get zoomRange() { return CONFIG.zoom; }
  get maxAutoMove() { return CONFIG.motion.maxAutoMove; }
  get atDisplayLimit() { return this.decades === MODEL.maxDecades; }
  get corePixelRadius() { return this.field ? this.field.scale * this.zoom * this.scales.radius : Infinity; }

  pointerOverPanel(point) {
    const p = this.panel;
    return p?.visible && point.x >= p.x && point.x <= p.x + p.width * p.scaleX &&
      point.y >= p.y && point.y <= p.y + p.height * p.scaleY;
  }

  setTime(decades) {
    this.scales = coreScales(decades); this.decades = this.scales.decades;
    if (this.decades === MODEL.maxDecades) this.paused = true;
    this.syncUI();
  }

  togglePause() {
    if (this.paused && this.decades === MODEL.maxDecades) this.setTime(0);
    this.paused = !this.paused; this.syncUI();
  }

  reset() {
    this.field.time = 0;
    this.field.camera.reset();
    this.zoom = 1;
    this.autoMove = CONFIG.motion.autoMove;
    this.setTime(0);
  }

  syncUI() { syncSingularityUI(this); }

  positionCaption() {
    if (!this.caption) return;
    this.caption.x = (this.width - this.caption.width) / 2 + UI_CONFIG.captionOffsetX;
    if (!this.compact && this.panel?.visible) {
      this.caption.x = Math.min(this.caption.x, this.panel.x - this.caption.width - UI_CONFIG.margin);
    }
    this.caption.y = this.height - this.caption.height - UI_CONFIG.captionBottom;
  }

  layoutUI() {
    if (!this.panel) return;
    const c = UI_CONFIG, p = this.panel;
    p.visible = this.panelOpen && !this.clean && !this.embed;
    p.interactive = p.visible;
    const top = this.compact ? c.margin : c.panelTop;
    p.scaleX = p.scaleY = Math.min(1, (this.height - top - c.margin) / p.height);
    p.x = this.compact ? (this.width - p.width * p.scaleX) / 2 : this.width - p.width * p.scaleX - c.margin;
    p.y = this.compact ? this.height - p.height * p.scaleY - c.margin : top;
    if (this.toggleButton) {
      this.toggleButton.visible = !this.embed && (this.compact || this.clean);
      this.toggleButton.interactive = this.toggleButton.visible;
      this.toggleButton.text = p.visible ? "Close controls" : "Controls";
    }
    if (this.caption) {
      this.caption.visible = !this.clean && !this.embed && !(this.compact && p.visible);
      this.caption._layoutDirty = true;
      this.caption.update(0);
      this.positionCaption();
    }
    if (this.limitReadout) this.limitReadout.visible = !this.clean && !this.embed && !(this.compact && p.visible);
    for (const id of ["info", "info-toggle"]) {
      const element = document.getElementById(id);
      if (element) element.style.display = this.clean || this.embed ? "none" : "";
    }
    this.field.resize();
  }

  onResize() {
    if (!this.field) return;
    const width = Math.min(UI_CONFIG.panelWidth, this.width - UI_CONFIG.margin * 2);
    if (this.panel && (this.uiCompact !== this.compact || this.panel.width !== width)) {
      for (const object of [this.panel, this.toggleButton, this.caption, this.limitReadout]) {
        object.interactive = false;
        this.pipeline.remove(object);
      }
      this.panelOpen = !this.compact && !this.clean;
      buildSingularityUI(this);
    }
    this.layoutUI();
  }

  update(dt) {
    if (!this.paused) this.setTime(advanceDecades(this.decades, Math.min(dt, CONFIG.maxDt), this.rate));
    super.update(dt);
    this.positionCaption();
  }
  destroy() { this.stop(); this.listeners.abort(); this.disableFluidSize(); this.field?.gpu.destroy(); }
}

const canvas = document.getElementById("game");
if (canvas) {
  const demo = new SingularityDemo(canvas);
  demo.start();
  window.singularityDemo = demo;
}

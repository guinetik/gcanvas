import { Game, Painter, Screen, THEMES } from "/gcanvas.es.min.js";
import { coreScales, SINGULARITY_CONFIG as MODEL } from "./singularity-model.js";
import { LOOM_CONFIG, loomState } from "./nsvortex-model.js";
import { PALETTES } from "./navier-stokes-looks.js";
import { VortexField, VortexScaleInset } from "./nsvortex-field.js";
import { UI_CONFIG, buildVortexUI, syncVortexUI } from "./nsvortex-ui.js";

const CONFIG = {
  background: "#030910", compactWidth: 900, compactHeight: 650, maxDt: 0.05,
  drag: 0.006, motion: { autoMove: 4.6, maxAutoMove: 60 },
  zoom: { min: 0.3, max: 3, wheel: 0.001, linePixels: 16 },
  finale: { bleedStart: 0.86, spread: 4, hold: 0.12, fade: 1.2 },
};

export class NSVortexDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.theme = THEMES.vortex;
    const query = new URLSearchParams(location.search);
    this.embed = query.get("embed") === "1";
    this.clean = this.embed || query.get("ambient") === "1";
    this.backgroundColor = CONFIG.background;
    this.reducedMotion = Screen.prefersReducedMotion();
    this.paused = this.reducedMotion || query.get("paused") === "1";
    this.flashRemaining = 0;
    this.bleed = 0; this.resumeAfterFlash = false;
    this.seed = Number(query.get("seed") ?? 42) >>> 0;
    this.palette = "copper"; this.seconds = 0; this.state = loomState(0);
    this.decades = 0; this.scales = coreScales(0); this.rate = 1;
    this.magnify = true; this.pulses = true; this.zoom = 1;
    this.autoMove = CONFIG.motion.autoMove;
    this.listeners = new AbortController();
    this.enableFluidSize();
  }

  get compact() { return this.width <= CONFIG.compactWidth || this.height <= CONFIG.compactHeight; }
  get waves() { return this.pulses; }
  listen(target, event, callback) { target.addEventListener(event, callback, { signal: this.listeners.signal }); }

  init() {
    super.init();
    Screen.init(this);
    this.panelOpen = !this.compact && !this.clean;
    this.field = new VortexField(this);
    this.pipeline.add(this.field);
    this.scaleInset = new VortexScaleInset(this);
    this.pipeline.add(this.scaleInset);
    buildVortexUI(this);
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
      if (event.code === "KeyH") this.toggleUI();
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
    const playing = !this.paused, previous = this.decades;
    const requested = coreScales(decades);
    const restart = playing && previous < MODEL.maxDecades && requested.decades === MODEL.maxDecades && this.magnify;
    // Rewind beneath the opaque peak, so the reveal always shows the intact core.
    this.scales = restart ? coreScales(0) : requested; this.decades = this.scales.decades;
    this.seconds = this.decades / MODEL.maxDecades * LOOM_CONFIG.duration;
    this.state = loomState(this.seconds, this.magnify);
    this.flashRemaining = restart && !this.reducedMotion ? CONFIG.finale.hold + CONFIG.finale.fade : 0;
    this.resumeAfterFlash = this.flashRemaining > 0;
    if (restart) this.paused = this.resumeAfterFlash;
    else if (this.decades === MODEL.maxDecades) this.paused = true;
    this.bleed = playing && this.magnify && !this.reducedMotion ?
      Math.max(0, (this.state.progress - CONFIG.finale.bleedStart) / (1 - CONFIG.finale.bleedStart)) : 0;
    this.syncUI();
  }

  togglePause() {
    this.flashRemaining = 0; this.resumeAfterFlash = false;
    if (this.paused && this.decades === MODEL.maxDecades) this.setTime(0);
    this.paused = !this.paused; this.syncUI();
  }

  reset() {
    this.seconds = 0;
    this.field.camera.reset();
    this.zoom = 1;
    this.autoMove = CONFIG.motion.autoMove;
    this.setTime(0);
  }

  reseed() {
    this.seed = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
    this.field.reseed(); this.setTime(0);
    const url = new URL(location.href);
    url.searchParams.set("seed", this.seed);
    history.replaceState(null, "", url);
  }

  setPalette(value) {
    this.palette = value;
    this.field.gpu.setVisualConfig(PALETTES[value]);
  }

  toggleUI() {
    for (const control of Object.values(this.controls ?? {})) control.close?.();
    this.clean = !this.clean; this.panelOpen = !this.clean; this.layoutUI();
  }

  save() {
    // Export the artwork at the current framing, omitting canvas UI objects.
    const objects = this.pipeline.gameObjects.filter(object => object !== this.field);
    const visibility = objects.map(object => object.visible);
    try {
      objects.forEach(object => { object.visible = false; });
      this.render();
      this.canvas.toBlob(blob => {
        if (!blob) { this.notice = "Could not save frame"; this.syncUI(); return; }
        const url = URL.createObjectURL(blob), link = document.createElement("a");
        link.href = url; link.download = `nsvortex-${this.seed}-${this.seconds.toFixed(2)}.png`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    } finally {
      objects.forEach((object, i) => { object.visible = visibility[i]; });
      this.render();
    }
  }

  syncUI() {
    this.state = loomState(this.seconds, this.magnify);
    syncVortexUI(this);
  }

  positionCaption() {
    if (!this.caption) return;
    this.caption.x = Math.max(UI_CONFIG.margin, (this.width - this.caption.width) / 2);
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
      this.toggleButton.x = this.width - c.margin - c.toggleWidth / 2;
    }
    if (this.caption) {
      this.caption.visible = !this.clean && !this.embed && !(this.compact && p.visible);
      this.caption._layoutDirty = true;
      this.caption.update(0);
      this.positionCaption();
    }
    if (this.limitReadout) this.limitReadout.visible = !this.clean && !this.embed && !(this.compact && p.visible);
    this.scaleInset.visible = !this.clean && !this.embed;
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
      for (const control of Object.values(this.controls ?? {})) control.close?.();
      for (const object of [this.panel, this.toggleButton, this.caption, this.limitReadout]) {
        object.interactive = false;
        this.pipeline.remove(object);
      }
      this.panelOpen = !this.compact && !this.clean;
      buildVortexUI(this);
    }
    this.layoutUI();
  }

  update(dt) {
    this.flashRemaining = Math.max(0, this.flashRemaining - dt);
    if (this.resumeAfterFlash && this.flashRemaining === 0) {
      this.resumeAfterFlash = false;
      this.paused = false;
      this.syncUI();
    }
    if (!this.paused) {
      const elapsed = Math.min(dt, CONFIG.maxDt) * this.rate;
      this.setTime((this.seconds + elapsed) / LOOM_CONFIG.duration * MODEL.maxDecades);
      if (!this.dragging) this.field.camera.rotationY += elapsed * this.autoMove * Math.PI / 180;
    }
    super.update(dt);
    this.positionCaption();
  }
  render() {
    super.render();
    if (this.flashRemaining <= 0 && (!this.magnify || this.bleed <= 0)) return;
    Painter.useCtx(ctx => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (this.flashRemaining > 0) {
        const alpha = Math.min(1, this.flashRemaining / CONFIG.finale.fade);
        ctx.fillStyle = `rgba(255,255,255,${alpha * alpha})`;
      } else {
        const { cx, cy } = this.field;
        const reach = Math.hypot(Math.max(cx, this.width - cx), Math.max(cy, this.height - cy));
        const radius = this.field.scale * 0.2 + reach * CONFIG.finale.spread * this.bleed ** 3;
        const alpha = this.bleed ** 2, glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        glow.addColorStop(0, `rgba(255,255,255,${alpha})`);
        glow.addColorStop(0.35, `rgba(255,255,255,${alpha})`);
        glow.addColorStop(0.7, `rgba(255,255,255,${alpha * 0.45})`);
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
      }
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }, { saveState: true });
  }
  destroy() { this.stop(); this.listeners.abort(); this.disableFluidSize(); this.field?.gpu.destroy(); }
}

const canvas = document.getElementById("game");
if (canvas) {
  const demo = new NSVortexDemo(canvas);
  demo.start();
  window.nsVortexDemo = demo;
}

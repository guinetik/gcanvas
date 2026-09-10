import { Game, GameObject, Painter, Screen, AccordionGroup, Dropdown, Slider, Button, Text, THEMES } from "../../src/index.js";
import { FluidVortexField } from "./fluid-vortex-field.js";
import { FLUID_CONFIG } from "./fluid-vortex-model.js";
import { PALETTES, LOOKS } from "./navier-stokes-looks.js";

const CONFIG = {
  background: "#02060c", panelWidth: 300, margin: 12, panelTop: 48,
  compactWidth: 900, compactHeight: 650, brushSpeed: 3,
  captionWidth: 480, captionHeight: 70, captionBottom: 20,
};

class Caption extends GameObject {
  draw() {
    super.draw();
    Painter.shapes.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8, "rgba(3,12,20,0.96)", "#315b72", 1);
  }
}

export class FluidVortexDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.theme = THEMES.vortex;
    this.backgroundColor = CONFIG.background;
    const query = new URLSearchParams(location.search);
    this.embed = query.get("embed") === "1";
    this.ambient = query.get("ambient") === "1";
    this.focusLeft = query.get("focus") === "left";
    this.paused = Screen.prefersReducedMotion();
    this.listeners = new AbortController();
    this.enableFluidSize();
  }

  get compact() { return this.width < CONFIG.compactWidth || this.height < CONFIG.compactHeight; }
  get clean() { return this.embed || this.ambient; }

  init() {
    super.init();
    Screen.init(this);
    this.panelOpen = !this.compact;
    this.field = new FluidVortexField(this);
    this.pipeline.add(this.field);
    this.buildUI();
    this.listen(document, "DOMContentLoaded", () => this.layoutUI());
    this.listen(this.canvas, "touchstart", (event) => event.preventDefault());
    this.events.on("inputdown", (event) => {
      if (this._uiHandledInput || this.overPanel(event)) return;
      const point = this.field.toWorld(event.x, event.y);
      Object.assign(this.field.model.brush, point, { down: true, vx: 0, vy: 0 });
      this.lastPointerTime = performance.now();
    });
    this.events.on("inputmove", (event) => {
      const brush = this.field.model.brush;
      if (!brush.down) return;
      const point = this.field.toWorld(event.x, event.y);
      const now = performance.now(), dt = Math.max(1 / 120, (now - this.lastPointerTime) / 1000);
      brush.vx = Math.max(-CONFIG.brushSpeed, Math.min(CONFIG.brushSpeed, (point.x - brush.x) / dt));
      brush.vy = Math.max(-CONFIG.brushSpeed, Math.min(CONFIG.brushSpeed, (point.y - brush.y) / dt));
      brush.x = point.x; brush.y = point.y;
      this.lastPointerTime = now;
    });
    this.events.on("inputup", () => { this.field.model.brush.down = false; });
    for (const event of ["pointerup", "pointercancel", "blur"]) this.listen(window, event, () => { this.field.model.brush.down = false; });
    this.listen(window, "keydown", (event) => {
      if (/INPUT|BUTTON|TEXTAREA|SELECT|A/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === "Space") { event.preventDefault(); this.togglePause(); }
      if (event.code === "KeyR") this.reset();
      if (event.code === "KeyH") { this.ambient = !this.ambient; this.layoutUI(); }
    });
    this.listen(document, "visibilitychange", () => { if (document.hidden) this.stop(); else this.resume(); });
  }

  listen(target, event, handler) { target.addEventListener(event, handler, { signal: this.listeners.signal, passive: false }); }

  overPanel(point) {
    const p = this.panel;
    return p.visible && point.x >= p.x && point.x <= p.x + p.width * p.scaleX && point.y >= p.y && point.y <= p.y + p.height * p.scaleY;
  }

  buildUI() {
    const width = Math.min(CONFIG.panelWidth, this.width - CONFIG.margin * 2);
    const panel = new AccordionGroup(this, { width, padding: this.compact ? 8 : 14, spacing: this.compact ? 4 : 8, headerHeight: this.compact ? 24 : 28, origin: "top-left", debug: true, debugColor: this.theme.colors.subtleBorder });
    this.panel = panel;
    const draw = panel.draw.bind(panel);
    panel.draw = () => { Painter.shapes.rect(0, 0, panel.width * panel.scaleX, panel.height * panel.scaleY, this.theme.colors.darkBg); draw(); };
    this.pipeline.add(panel);
    this.controls = {};
    const model = this.field.model;
    const dropdown = (name, label, options, value, action) => {
      const control = new Dropdown(this, { label, options, value, width: panel.itemWidth, origin: "center", onChange: (value) => { if (!this.syncing) action(value); } });
      this.controls[name] = control;
      return control;
    };
    panel.addItem(dropdown("mode", "FLOW", [
      { label: "Whirlpool", value: "whirlpool" }, { label: "Twin currents", value: "twins" }, { label: "Free ink", value: "free" },
    ], model.mode, (value) => { model.mode = value; this.field.restart(); }));
    const physics = panel.addSection("Fluid", { expanded: !this.compact });
    const appearance = panel.addSection("Color & light", { expanded: !this.compact });
    const brush = panel.addSection("Brush", { expanded: false });
    this.sections = [physics, appearance, brush];
    for (const [name, label, min, max, step, value, apply, section] of [
      ["drive", "VORTEX DRIVE", 0, 3, 0.1, model.drive, (v) => { model.drive = v; }, physics],
      ["viscosity", "VISCOSITY", 0, 0.15, 0.005, model.viscosity, (v) => { model.viscosity = v; }, physics],
      ["radius", "STIRRING RADIUS", 0.1, 0.65, 0.05, model.brush.radius, (v) => { model.brush.radius = v; }, brush],
    ]) {
      const slider = new Slider(this, { label, min, max, step, value, width: panel.itemWidth, origin: "center", formatValue: (value) => value.toFixed(name === "viscosity" ? 3 : 2), onChange: (value) => { if (!this.syncing) apply(value); } });
      this.controls[name] = slider;
      section.addItem(slider);
    }
    appearance.addItem(dropdown("palette", "PALETTE", Object.entries(PALETTES).map(([value, p]) => ({ label: p.label, value })), this.field.palette, (value) => this.field.setPalette(value)));
    appearance.addItem(dropdown("look", "LOOK", Object.entries(LOOKS).map(([value, p]) => ({ label: p.label, value })), this.field.look, (value) => this.field.setLook(value)));
    this.pauseButton = new Button(this, { text: this.paused ? "Resume" : "Pause", width: panel.itemWidth, origin: "center", onClick: () => this.togglePause() });
    panel.addItem(this.pauseButton);
    panel.addItem(new Button(this, { text: "Reset experiment", width: panel.itemWidth, origin: "center", onClick: () => this.reset() }));
    for (const section of this.sections) {
      const toggle = section.toggle.bind(section);
      section.toggle = (force) => {
        if (this.compact && force !== false && !section.expanded) for (const other of this.sections) if (other !== section) other.toggle(false);
        toggle(force);
      };
    }
    const layout = panel.layout.bind(panel);
    panel.layout = () => { layout(); this.layoutUI(); };
    panel.layoutAll();
    this.toggleButton = new Button(this, { text: "Controls", width: 128, origin: "center", x: 76, y: 30, onClick: () => { this.panelOpen = !this.panelOpen; this.layoutUI(); } });
    this.pipeline.add(this.toggleButton);
    this.caption = new Caption(this, { width: Math.min(CONFIG.captionWidth, this.width - 24), height: CONFIG.captionHeight, origin: "center", interactive: false });
    this.title = new Text(this, "FLUID VORTEX", { font: `bold ${this.compact ? 19 : 25}px ${this.theme.fonts.family}`, color: "#f2c879", origin: "center", align: "center", interactive: false });
    this.hint = new Text(this, this.compact ? "Drag to stir · hold to spin" : "Drag to stir · hold to spin · pressure + viscosity", { font: `${this.compact ? 11 : 13}px ${this.theme.fonts.family}`, color: "#83cfff", origin: "center", align: "center", interactive: false });
    for (const item of [this.caption, this.title, this.hint]) this.pipeline.add(item);
    this.uiCompact = this.compact;
    this.layoutUI();
  }

  layoutUI() {
    if (!this.panel) return;
    const p = this.panel, margin = CONFIG.margin;
    p.visible = this.panelOpen && !this.clean; p.interactive = p.visible;
    const top = this.compact ? margin : CONFIG.panelTop;
    p.scaleX = p.scaleY = Math.min(1, (this.height - top - margin) / p.height);
    p.x = this.compact ? (this.width - p.width * p.scaleX) / 2 : this.width - p.width * p.scaleX - margin;
    p.y = this.compact ? this.height - p.height * p.scaleY - margin : top;
    if (this.toggleButton) {
      this.toggleButton.visible = this.compact && !this.clean;
      this.toggleButton.interactive = this.toggleButton.visible;
      this.toggleButton.text = p.visible ? "Close controls" : "Controls";
    }
    if (this.caption) {
      const x = !this.compact && p.visible ? p.x / 2 : this.width / 2;
      const y = this.height - CONFIG.captionBottom - CONFIG.captionHeight / 2;
      for (const item of [this.caption, this.title, this.hint]) { item.visible = !this.clean && !(this.compact && p.visible); item.x = x; }
      this.caption.y = y; this.title.y = y - 12; this.hint.y = y + 15;
    }
    for (const id of ["info", "info-toggle"]) { const el = document.getElementById(id); if (el) el.style.display = this.clean ? "none" : ""; }
    this.field?.resize();
  }

  togglePause() { this.paused = !this.paused; this.pauseButton.text = this.paused ? "Resume" : "Pause"; }

  reset() {
    const model = this.field.model;
    model.mode = "whirlpool"; model.drive = FLUID_CONFIG.drive; model.viscosity = FLUID_CONFIG.viscosity;
    model.brush.radius = FLUID_CONFIG.brushRadius;
    this.field.setPalette("ice"); this.field.setLook("neon"); this.field.restart();
    this.syncing = true;
    for (const [name, value] of Object.entries({ mode: model.mode, drive: model.drive, viscosity: model.viscosity, radius: model.brush.radius, palette: this.field.palette, look: this.field.look })) this.controls[name].value = value;
    this.syncing = false;
  }

  onResize() {
    if (!this.field) return;
    if (this.uiCompact !== this.compact || this.panel.width !== Math.min(CONFIG.panelWidth, this.width - CONFIG.margin * 2)) {
      for (const item of [this.panel, this.toggleButton, this.caption, this.title, this.hint]) { item.interactive = false; this.pipeline.remove(item); }
      this.panelOpen = !this.compact;
      this.buildUI();
    }
    this.layoutUI();
  }

  destroy() { this.stop(); this.listeners.abort(); this.disableFluidSize(); this.field?.gpu.destroy(); }
}

const canvas = document.getElementById("game");
if (canvas) { const demo = new FluidVortexDemo(canvas); demo.start(); window.fluidVortexDemo = demo; }

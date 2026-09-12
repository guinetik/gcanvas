import { Game, GameObject, Painter, Screen, AccordionGroup, Dropdown, Slider, Button, Text, THEMES, FluidGrid2D } from '../../src/index.js';
import { GPUInk } from './fluid-dynamics-ink.js';
import { PALETTES } from './navier-stokes-looks.js';

const CONFIG = {
  background: '#05080e', gridLong: 160, gridShortMin: 48, dt: 1 / 60, maxSteps: 2,
  panelWidth: 280, margin: 12, top: 52, compactWidth: 850, compactHeight: 650,
  radius: 0.075, brushForce: 0.55, brushMaxSpeed: 3, ink: 8, drive: 1,
  tracers: 1200, tracerLife: 3, exposure: 1.6,
  colors: [[0.04, 0.65, 1], [1, 0.09, 0.22], [1, 0.52, 0.025], [0.17, 1, 0.55]],
  quality: { mobile: 512, tablet: 768, desktop: 1024, standard: 512, high: 1536, min: 256, dprCap: 2,
    slowMs: 24, samples: 180, cooldownMs: 8000, downgrade: 0.75 },
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

class InkField extends GameObject {
  constructor(game) {
    super(game, { origin: 'top-left', interactive: false });
    this.raster = document.createElement('canvas');
    this.context = this.raster.getContext('2d');
    this.tracers = [];
    this.gpu = new URLSearchParams(location.search).has('cpu') ? null : new GPUInk();
    this.resize();
  }

  resize() {
    const g = this.game, aspect = g.width / Math.max(1, g.height);
    const nx = Math.max(CONFIG.gridShortMin, Math.round(CONFIG.gridLong * Math.min(1, aspect)));
    const ny = Math.max(CONFIG.gridShortMin, Math.round(CONFIG.gridLong * Math.min(1, 1 / aspect)));
    if (this.model?.nx === nx && this.model?.ny === ny) { this.resizeInk(); return; }
    const previous = this.model;
    this.model = new FluidGrid2D({ nx, ny, viscosity: previous?.viscosity ?? 0.00002, fade: previous?.fade ?? 0.15 });
    this.raster.width = nx; this.raster.height = ny;
    this.pixels = this.context.createImageData(nx, ny);
    if (previous) {
      // Preserve the experiment across resizing/orientation changes.
      const m = this.model;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const k = i + j * m.stride;
        m.u[k] = previous.sample(previous.u, i / nx * previous.nx, (j + 0.5) / ny * previous.ny - 0.5, previous.nx, previous.ny - 1) * m.width / previous.width;
        m.v[k] = previous.sample(previous.v, (i + 0.5) / nx * previous.nx - 0.5, j / ny * previous.ny, previous.nx - 1, previous.ny);
        for (let c = 0; c < 3; c++) m.dye[c][k] = previous.sample(previous.dye[c], (i + 0.5) / nx * previous.nx - 0.5, (j + 0.5) / ny * previous.ny - 0.5);
      }
      m.project(); m.time = previous.time;
    } else this.seed();
    this.tracers = Array.from({ length: CONFIG.tracers }, () => this.newTracer());
    this.resizeInk();
  }

  resizeInk() {
    const g = this.game, c = CONFIG.quality;
    const cap = g.quality === 'auto' ? Screen.responsive(c.mobile, c.tablet, c.desktop) * g.autoScale : c[g.quality];
    const long = Math.max(c.min, Math.round(Math.min(cap, Math.max(g.width, g.height))));
    const aspect = g.width / g.height;
    this.gpu?.resize(Math.max(32, Math.round(long * Math.min(1, aspect))), Math.max(32, Math.round(long * Math.min(1, 1 / aspect))), this.model);
    this.dirty = true;
    g.syncResolution?.();
  }

  splat(x, y, dx, dy, radius, color, amount = 1, spin = 0) {
    this.model.splat(x, y, dx, dy, radius, color, this.gpu?.available ? 0 : amount, spin);
    this.gpu?.splat(x, y, radius, color, amount);
  }

  clear() { this.model.clear(); this.gpu?.clear(); this.dirty = true; }

  newTracer() { return { x: Math.random() * this.model.width, y: Math.random(), age: Math.random() * CONFIG.tracerLife }; }

  seed() {
    const m = this.model;
    this.clear();
    for (let n = 0; n < 7; n++) {
      const x = m.width * (0.15 + 0.7 * ((n * 0.618) % 1)), y = 0.2 + 0.6 * ((n * 0.381) % 1);
      this.splat(x, y, 0, 0, Math.min(m.width, 1) * 0.18, CONFIG.colors[n % 4], 2, n % 2 ? 1.6 : -1.6);
    }
    m.project(); this.dirty = true;
  }

  step(dt) {
    const m = this.model, g = this.game, t = m.time;
    if (this.gpu?.restored) {
      this.gpu.destroy(); this.gpu = new GPUInk(); this.resizeInk();
    }
    if (g.drive > 0) for (let n = 0; n < 3; n++) {
      const phase = t * (0.4 + n * 0.07) + n * Math.PI * 2 / 3;
      const x = m.width * (0.5 + 0.31 * Math.cos(phase));
      const y = 0.5 + 0.3 * Math.sin(phase * 1.37 + n);
      const angle = phase * 1.7 + n * 2;
      this.splat(x, y, Math.cos(angle) * dt * 5 * g.drive, Math.sin(angle) * dt * 5 * g.drive,
        Math.min(1, m.width) * 0.075, CONFIG.colors[n], CONFIG.ink * dt * g.drive, dt * 1.5 * g.drive);
    }
    const b = g.brush;
    if (b) {
      const x = b.x / g.width * m.width, y = b.y / g.height;
      const dx = clamp((b.x - b.lastX) / g.width * m.width / dt, -CONFIG.brushMaxSpeed, CONFIG.brushMaxSpeed);
      const dy = clamp((b.y - b.lastY) / g.height / dt, -CONFIG.brushMaxSpeed, CONFIG.brushMaxSpeed);
      // Interpolate deposits along a fast drag, avoiding isolated dots.
      const distance = Math.hypot((b.x - b.lastX) / g.width * m.width, (b.y - b.lastY) / g.height);
      const count = Math.min(16, Math.max(1, Math.ceil(distance / (g.radius * 0.4))));
      for (let n = 1; n <= count; n++) {
        const f = n / count;
        this.splat(x - (1 - f) * (b.x - b.lastX) / g.width * m.width, y - (1 - f) * (b.y - b.lastY) / g.height,
          dx * CONFIG.brushForce / count, dy * CONFIG.brushForce / count, g.radius,
          CONFIG.colors[g.inkColor], CONFIG.ink * dt / count, b.sign * dt * 4 / count);
      }
      b.lastX = b.x; b.lastY = b.y;
    }
    m.step(dt, !this.gpu?.available);
    this.gpu?.step(m, dt);
    for (const p of this.tracers) {
      p.px = p.x; p.py = p.y;
      const [u, v] = m.velocity(p.x, p.y);
      p.x += u * dt; p.y += v * dt; p.age += dt;
      if (p.age > CONFIG.tracerLife || p.x < 0 || p.x > m.width || p.y < 0 || p.y > 1) Object.assign(p, this.newTracer(), { age: 0, px: undefined });
    }
    this.dirty = true;
  }

  draw() {
    super.draw();
    const m = this.model, g = this.game, data = this.pixels.data;
    const gpuInk = this.gpu?.available && g.view === 'ink';
    if (this.dirty && !gpuInk) {
      for (let j = 0; j < m.ny; j++) for (let i = 0; i < m.nx; i++) {
        const k = i + j * m.stride, p = (i + j * m.nx) * 4;
        if (g.view === 'speed') {
          const u = (m.u[k] + m.u[k + 1]) / 2, v = (m.v[k] + m.v[k + m.stride]) / 2;
          const q = clamp(Math.hypot(u, v) * 1.8, 0, 1);
          data[p] = 35 + 215 * Math.pow(q, 2); data[p + 1] = 8 + 240 * Math.sin(q * Math.PI / 2);
          data[p + 2] = 65 + 100 * (1 - q);
        } else for (let c = 0; c < 3; c++) {
          const matrix = g.inkMatrix;
          const density = matrix[c] * m.dye[0][k] + matrix[3 + c] * m.dye[1][k] + matrix[6 + c] * m.dye[2][k];
          data[p + c] = 255 * (1 - Math.exp(-density * CONFIG.exposure)) + (c === 2 ? 9 : 3);
        }
        data[p + 3] = 255;
      }
      this.context.putImageData(this.pixels, 0, 0); this.dirty = false;
    }
    Painter.useCtx(ctx => {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(gpuInk ? this.gpu.draw(g.inkMatrix) : this.raster, 0, 0, g.width, g.height);
      if (g.trails) {
        ctx.strokeStyle = 'rgba(225,250,255,0.32)'; ctx.lineWidth = g.displayRatio;
        ctx.beginPath();
        for (const p of this.tracers) {
          if (p.px === undefined) continue;
          ctx.moveTo(p.px / m.width * g.width, p.py * g.height);
          ctx.lineTo(p.x / m.width * g.width, p.y * g.height);
        }
        ctx.stroke();
      }
    });
  }
}

export class FluidDynamicsDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.theme = THEMES.vortex; this.backgroundColor = CONFIG.background;
    this.paused = Screen.prefersReducedMotion() || new URLSearchParams(location.search).has('paused');
    this.drive = CONFIG.drive; this.radius = CONFIG.radius; this.inkColor = 0;
    this.view = 'ink'; this.trails = false; this.accumulator = 0;
    this.setPalette('original');
    this.quality = 'auto'; this.autoScale = 1; this.frameCost = 0; this.qualitySamples = 0; this.lastQualityChange = 0;
    this.listeners = new AbortController();
    Screen.init(this);
    this.events.on('screenresize', () => this.resizeDisplay());
    this.resizeDisplay();
  }
  get compact() { return this.width / this.displayRatio < CONFIG.compactWidth || this.height / this.displayRatio < CONFIG.compactHeight; }
  resizeDisplay() {
    this.displayRatio = Math.min(CONFIG.quality.dprCap, Screen.pixelRatio);
    this.canvas.style.width = `${Screen.width}px`; this.canvas.style.height = `${Screen.height}px`;
    this.canvas.width = Math.round(Screen.width * this.displayRatio); this.canvas.height = Math.round(Screen.height * this.displayRatio);
    this.markBoundsDirty(); this.onResize();
  }
  listen(target, type, handler) { target.addEventListener(type, handler, { signal: this.listeners.signal, passive: false }); }

  init() {
    super.init(); Screen.init(this);
    this.field = new InkField(this); this.pipeline.add(this.field);
    this.panelOpen = !this.compact; this.buildUI();
    this.canvas.style.touchAction = 'none';
    this.listen(this.canvas, 'touchstart', e => e.preventDefault());
    this.events.on('inputdown', e => {
      const button = this.toggle;
      const overToggle = button && Math.abs(e.x - button.x) <= button.width * button.scaleX / 2 && Math.abs(e.y - button.y) <= button.height * button.scaleY / 2;
      if (this._uiHandledInput || this.overPanel(e) || overToggle) return;
      if (this.paused) this.togglePause();
      this.inkColor = (this.inkColor + 1) % CONFIG.colors.length;
      this.brush = { x: e.x, y: e.y, lastX: e.x, lastY: e.y, sign: e.shiftKey ? -1 : 1 };
      const m = this.field.model;
      this.field.splat(e.x / this.width * m.width, e.y / this.height, 0, 0, this.radius, CONFIG.colors[this.inkColor], 0.7, this.brush.sign * 0.6);
      this.field.dirty = true;
    });
    this.events.on('inputmove', e => {
      if (this.brush) { this.brush.x = e.x; this.brush.y = e.y; }
    });
    this.events.on('inputup', () => { this.brush = null; });
    for (const e of ['pointerup', 'pointercancel', 'blur']) this.listen(window, e, () => { this.brush = null; });
    this.listen(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY|A)$/.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePause(); }
      if (e.code === 'KeyR') this.field.seed();
      if (e.code === 'KeyH') { this.panelOpen = !this.panelOpen; this.layoutUI(); }
    });
    this.listen(document, 'visibilitychange', () => { if (document.hidden) { this.brush = null; this.stop(); } else this.resume(); });
  }

  overPanel(e) {
    const p = this.panel;
    return p.visible && e.x >= p.x && e.x <= p.x + p.width * p.scaleX && e.y >= p.y && e.y <= p.y + p.height * p.scaleY;
  }

  setPalette(name) {
    if (name !== 'original' && !Object.hasOwn(PALETTES, name)) return;
    this.palette = name;
    // The three transported quantities stay unchanged. Only their display basis
    // changes, so a palette switch also recolors old ink, mixtures and paused frames.
    this.inkMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    if (name !== 'original') {
      const p = PALETTES[name];
      const stops = p.banded ? [0, 0, 1] : [0, 0.5, 1];
      this.inkMatrix = new Float32Array(stops.flatMap(t => {
        const hue = ((p.minHue + (p.maxHue - p.minHue) * t) % 360 + 360) % 360;
        return Painter.colors.hslToRgb(hue, p.saturation, p.lightness).map(v => v / 255);
      }));
    }
    if (this.field) this.field.dirty = true;
  }

  buildUI() {
    const panel = new AccordionGroup(this, { width: Math.min(CONFIG.panelWidth, this.width / this.displayRatio - 24), padding: 12, spacing: 8, headerHeight: 28, origin: 'top-left' });
    this.panel = panel;
    const draw = panel.draw.bind(panel);
    panel.draw = () => { Painter.shapes.rect(0, 0, panel.width * panel.scaleX, panel.height * panel.scaleY, this.theme.colors.darkBg); draw(); };
    this.pipeline.add(panel);
    const label = text => new Text(this, text, { font: `12px ${this.theme.fonts.family}`, color: '#d4e6ea', origin: 'center', interactive: false });
    panel.addItem(label('FLUID DYNAMICS'));
    const dropdown = (label, options, value, onChange) => new Dropdown(this, { label, options, value, onChange, width: panel.itemWidth, origin: 'center' });
    panel.addItem(dropdown('VIEW', [{ label: 'Flowing ink', value: 'ink' }, { label: 'Flow speed', value: 'speed' }], this.view, v => { this.view = v; this.field.dirty = true; }));
    this.paletteControl = dropdown('INK PALETTE', [{ label: 'Original Ink', value: 'original' },
      ...Object.entries(PALETTES).map(([value, p]) => ({ label: p.label, value }))], this.palette, v => this.setPalette(v));
    panel.addItem(this.paletteControl);
    panel.addItem(dropdown('INK QUALITY', [{ label: 'Auto · screen + frame time', value: 'auto' }, { label: 'Standard', value: 'standard' }, { label: 'High', value: 'high' }], this.quality, v => {
      this.quality = v; this.autoScale = 1; this.qualitySamples = 0; this.lastQualityChange = performance.now(); this.field.resizeInk();
    }));
    this.resolutionLabel = label(''); panel.addItem(this.resolutionLabel); this.syncResolution();
    const fluid = panel.addSection('Flow & brush', { expanded: !this.compact });
    for (const [label, min, max, step, value, apply] of [
      ['AUTO STIR · 0 = OFF', 0, 2, 0.1, this.drive, v => { this.drive = v; }],
      ['BRUSH SIZE', 0.025, 0.18, 0.005, this.radius, v => { this.radius = v; }],
      ['VISCOSITY', 0, 0.001, 0.00001, this.field.model.viscosity, v => { this.field.model.viscosity = v; }],
      ['INK FADE', 0, 0.8, 0.05, this.field.model.fade, v => { this.field.model.fade = v; }],
    ]) fluid.addItem(new Slider(this, { label, min, max, step, value, onChange: apply, width: panel.itemWidth, origin: 'center', formatValue: v => v < 0.01 && v > 0 ? v.toExponential(1) : v.toFixed(2) }));
    panel.addItem(dropdown('MOTION TRACERS', [{ label: 'Visible', value: true }, { label: 'Hidden', value: false }], this.trails, v => { this.trails = v; }));
    this.pauseButton = new Button(this, { text: this.paused ? 'Resume' : 'Pause', width: panel.itemWidth, origin: 'center', onClick: () => this.togglePause() });
    panel.addItem(this.pauseButton);
    panel.addItem(new Button(this, { text: 'Fresh ink', width: panel.itemWidth, origin: 'center', onClick: () => this.field.seed() }));
    panel.addItem(new Button(this, { text: 'Clear container', width: panel.itemWidth, origin: 'center', onClick: () => this.field.clear() }));
    panel.addItem(label('Drag to push · hold to spin'));
    panel.addItem(label('Planar flow · transported RGB ink'));
    const layout = panel.layout.bind(panel);
    panel.layout = () => { layout(); this.layoutUI(); }; panel.layoutAll();
    this.toggle = new Button(this, { text: 'Controls', width: 132, x: 78, y: 30, origin: 'center', onClick: () => { this.panelOpen = !this.panelOpen; this.layoutUI(); } });
    this.pipeline.add(this.toggle);
    this.uiCompact = this.compact; this.layoutUI();
  }

  layoutUI() {
    const p = this.panel; if (!p) return;
    const dpr = this.displayRatio;
    p.visible = this.panelOpen; p.interactive = p.visible;
    p.scaleX = p.scaleY = dpr * Math.min(1, (this.height / dpr - CONFIG.top - CONFIG.margin) / Math.max(1, p.height));
    p.x = this.width - p.width * p.scaleX - CONFIG.margin * dpr; p.y = CONFIG.top * dpr;
    if (this.toggle) {
      this.toggle.text = p.visible ? 'Hide controls' : 'Controls';
      this.toggle.scaleX = this.toggle.scaleY = dpr;
      this.toggle.x = this.width - (CONFIG.margin + this.toggle.width / 2) * dpr; this.toggle.y = 30 * dpr;
    }
  }

  syncResolution() {
    if (!this.resolutionLabel) return;
    const f = this.field, gpu = f.gpu;
    this.resolutionLabel.text = gpu?.available ? `Ink ${gpu.width} × ${gpu.height} · GPU` : `Ink ${f.model.nx} × ${f.model.ny} · CPU fallback`;
  }

  onResize() {
    if (!this.field) return;
    this.brush = null; this.field.resize();
    if (this.uiCompact !== this.compact || this.panel.width !== Math.min(CONFIG.panelWidth, this.width / this.displayRatio - 24)) {
      this.panel.interactive = false; this.pipeline.remove(this.panel); this.pipeline.remove(this.toggle);
      this.panelOpen = !this.compact; this.buildUI();
    }
    this.layoutUI();
  }

  togglePause() { this.paused = !this.paused; this.brush = null; this.accumulator = 0; this.pauseButton.text = this.paused ? 'Resume' : 'Pause'; }

  update(dt) {
    this.frameStarted = performance.now();
    if (Math.min(CONFIG.quality.dprCap, window.devicePixelRatio || 1) !== this.displayRatio) { Screen.init(this); this.resizeDisplay(); }
    if (!this.paused) {
      this.accumulator = Math.min(this.accumulator + dt, CONFIG.maxSteps * CONFIG.dt);
      while (this.accumulator >= CONFIG.dt) { this.field.step(CONFIG.dt); this.accumulator -= CONFIG.dt; }
    }
    super.update(dt);
    this.syncResolution();
  }

  render() {
    super.render();
    if (!this.running || this.paused || !this.frameStarted || !this.field.gpu?.available || this.quality !== 'auto') return;
    this.frameCost += 0.05 * (performance.now() - this.frameStarted - this.frameCost);
    const c = CONFIG.quality;
    if (++this.qualitySamples >= c.samples && this.frameCost > c.slowMs && performance.now() - this.lastQualityChange > c.cooldownMs && this.autoScale > 0.5) {
      this.autoScale = Math.max(0.5, this.autoScale * c.downgrade); this.qualitySamples = 0;
      this.lastQualityChange = performance.now(); this.field.resizeInk();
    }
  }

  destroy() { this.stop(); this.listeners.abort(); this.field?.gpu?.destroy(); }
}

const canvas = document.getElementById('game');
if (canvas) { const demo = new FluidDynamicsDemo(canvas); demo.start(); window.fluidDynamicsDemo = demo; }

import { GameObject, Painter, WebGLAttractorPipeline } from "../../src/index.js";
import { FluidVortexModel, FLUID_CONFIG } from "./fluid-vortex-model.js";
import { PALETTES, LOOKS } from "./navier-stokes-looks.js";

const CONFIG = {
  history: 120, sampleEvery: 3, fit: 0.41, lineWidth: 1.3,
  warmupSteps: 90, speedColorScale: 1.8, trailFade: 1.45,
  gpu: {
    visual: { maxAlpha: 0.32, hueJitter: 0 },
    background: { baseColor: [0.004, 0.008, 0.018], fogDensity: 0.02, noiseScale: 2, animSpeed: 0.02 },
    depthFog: { enabled: true, density: 0.45, energyFalloff: 0.4 },
    colorGrading: { enabled: true, exposure: 1.05, warmth: 0, bleach: 0.15, grainIntensity: 0.005 },
    energyFlow: { intensity: 0, sparkThreshold: 1.1 },
  },
};

export class FluidVortexField extends GameObject {
  constructor(game) {
    super(game, { origin: "top-left", interactive: false });
    this.model = new FluidVortexModel(game.width < 700 ? FLUID_CONFIG.mobileCount : FLUID_CONFIG.count);
    const capacity = this.model.count * (CONFIG.history - 1);
    this.gpu = new WebGLAttractorPipeline(game.width, game.height, capacity, CONFIG.gpu);
    this.gpu.init();
    this.gpu.canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); this.gpu.available = false; });
    this.segments = Array.from({ length: capacity }, () => ({}));
    this.activeSegments = [];
    this.history = new Float32Array(this.model.count * CONFIG.history * 3);
    this.palette = "ice";
    this.look = "neon";
    this.setPalette(this.palette);
    this.setLook(this.look);
    this.resize();
    this.restart();
  }

  restart() {
    this.model.reset();
    this.head = -1; this.samples = 0; this.ticks = 0;
    this.record();
    // Seed a short, genuinely simulated history so the first frame already has trails.
    for (let i = 0; i < CONFIG.warmupSteps; i++) { this.model.step(FLUID_CONFIG.step); if (++this.ticks % CONFIG.sampleEvery === 0) this.record(); }
  }

  setPalette(name) { this.palette = name; this.gpu.setVisualConfig(PALETTES[name]); }
  setLook(name) {
    this.look = name;
    const look = LOOKS[name];
    this.gpu.setBloomConfig({ ...look.bloom, enabled: true });
    this.gpu.setGlowConfig({ ...look.glow, enabled: look.glow.intensity > 0, radius: this.game.compact ? look.glow.radius * 0.5 : look.glow.radius });
    this.gpu.setIridescenceConfig(look.iridescence);
  }

  resize() {
    this.width = this.game.width; this.height = this.game.height;
    const available = !this.game.compact && !this.game.clean ? this.width - 324 : this.width;
    this.scale = Math.min(available, this.height) * CONFIG.fit;
    this.centerX = this.game.focusLeft && !this.game.compact ? this.width * 0.33 : available / 2;
    this.centerY = this.height * 0.48;
    this.gpu.lineWidth = CONFIG.lineWidth * Math.max(0.55, this.scale / 300);
    this.gpu.setGlowConfig({ radius: LOOKS[this.look].glow.radius * (this.game.compact ? 0.5 : 1) });
    if (this.gpu.width !== this.width || this.gpu.height !== this.height) this.gpu.resize(this.width, this.height);
  }

  toWorld(x, y) { return { x: (x - this.centerX) / this.scale, y: (y - this.centerY) / this.scale }; }

  record() {
    this.head = (this.head + 1) % CONFIG.history;
    this.samples = Math.min(CONFIG.history, this.samples + 1);
    this.model.particles.forEach((p, i) => {
      const index = (i * CONFIG.history + this.head) * 3;
      this.history[index] = p.x; this.history[index + 1] = p.y;
      this.history[index + 2] = Math.min(1, Math.hypot(p.vx, p.vy) / CONFIG.speedColorScale);
    });
  }

  update(dt) {
    super.update(dt);
    if (this.game.paused) return;
    this.model.advance(dt, () => { if (++this.ticks % CONFIG.sampleEvery === 0) this.record(); });
  }

  collect() {
    let count = 0;
    for (let i = 0; i < this.model.count; i++) {
      for (let age = this.samples - 2; age >= 0; age--) {
        const end = (this.head - age + CONFIG.history) % CONFIG.history;
        const start = (end - 1 + CONFIG.history) % CONFIG.history;
        const a = (i * CONFIG.history + start) * 3, b = (i * CONFIG.history + end) * 3;
        const s = this.segments[count++];
        s.x1 = this.centerX + this.history[a] * this.scale;
        s.y1 = this.centerY + this.history[a + 1] * this.scale;
        s.x2 = this.centerX + this.history[b] * this.scale;
        s.y2 = this.centerY + this.history[b + 1] * this.scale;
        s.speedNorm = this.history[b + 2];
        s.age = age / Math.max(1, this.samples - 1) * CONFIG.trailFade;
        s.blink = age < 3 ? 0.25 : 0;
        s.segIdx = 1 - age / CONFIG.history;
        s.depth1 = s.depth2 = 0.35;
        this.activeSegments[count - 1] = s;
      }
    }
    this.activeSegments.length = count;
    return count;
  }

  draw() {
    super.draw();
    const count = this.collect();
    if (this.gpu.isAvailable()) {
      this.gpu.beginFrame(this.model.time);
      this.gpu.updateLines(this.activeSegments);
      this.gpu.renderLines(count, this.model.time, 0);
      this.gpu.endFrame();
      Painter.useCtx((ctx) => this.gpu.compositeOnto(ctx), { saveState: true });
    } else {
      const palette = PALETTES[this.palette];
      for (let i = 0; i < count; i++) {
        const s = this.segments[i];
        const hue = palette.maxHue + s.speedNorm * (palette.minHue - palette.maxHue);
        Painter.lines.line(s.x1, s.y1, s.x2, s.y2, `hsla(${hue},${palette.saturation}%,${palette.lightness}%,${Math.max(0, 0.5 - s.age * 0.34)})`, 1);
      }
    }
    if (this.model.brush.down) {
      const brush = this.model.brush;
      Painter.shapes.strokeCircle(this.centerX + brush.x * this.scale, this.centerY + brush.y * this.scale, brush.radius * this.scale, "rgba(131,207,255,0.4)", 1);
    }
  }
}

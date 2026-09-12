import { GameObject, Painter, Camera3D, WebGLAttractorPipeline } from "../../src/index.js";
import { PALETTES, LOOKS } from "./navier-stokes-looks.js";
import { LOOM_CONFIG as MODEL, createWeave, loomState, filamentPoint, activePulses, pulsePoint } from "./nsvortex-model.js";

const CONFIG = {
  seed: 42, maxDt: 0.05, background: "#030910", mobileWidth: 740,
  camera: { perspective: 2200, rotationX: 0.38, rotationY: 0.2, screenRotation: -0.27 },
  drag: 0.006, orbit: 0.08, zoom: { min: 0.3, max: 3, wheel: 0.001 },
  gpu: {
    lineWidth: 1.3, visual: { ...PALETTES.copper, maxAlpha: 0.44, hueJitter: 0 },
    blink: { intensityBoost: 1.35, saturationBoost: 1.3, alphaBoost: 2.5 },
    bloom: { enabled: true, ...LOOKS.nebula.bloom, passes: 1 },
    glow: { enabled: true, intensity: 0.55, radius: 28 },
    background: { baseColor: [0.006, 0.014, 0.024], fogDensity: 0.02, noiseScale: 2, animSpeed: 0 },
    energyFlow: { intensity: 0, speed: 0, sparkThreshold: 1.1 },
    depthFog: { enabled: true, density: 0.35, energyFalloff: 0.3 },
    iridescence: { enabled: false },
    colorGrading: { enabled: true, exposure: 1, vignetteStrength: 0.3, grainIntensity: 0, warmth: 0.02 },
  },
};


export class VortexField extends GameObject {
  constructor(game) {
    super(game, { origin: "top-left", interactive: false });
    this.camera = new Camera3D(CONFIG.camera);
    const capacity = MODEL.strands * MODEL.samples + 4 * MODEL.tracks * MODEL.ringSamples;
    this.pool = Array.from({ length: capacity }, () => ({}));
    this.segments = [];
    this.gpu = new WebGLAttractorPipeline(game.width, game.height, capacity, CONFIG.gpu);
    this.gpu.init();
    game.listen(this.gpu.canvas, "webglcontextlost", e => {
      e.preventDefault(); this.gpu.available = false;
      game.notice = "Canvas fallback · reload to restore GPU glow"; game.syncUI();
    });
    this.reseed(); this.resize();
  }

  reseed() { this.strands = createWeave(this.game.seed); }
  resize() {
    this.width = this.game.width; this.height = this.game.height;
    const available = !this.game.compact && this.game.panel?.visible ? this.game.panel.x : this.width;
    this.scale = Math.min(available * 0.34, this.height * 0.28);
    this.cx = available * 0.5; this.cy = this.height * 0.45;
    if (this.gpu.width !== this.width || this.gpu.height !== this.height) this.gpu.resize(this.width, this.height);
  }

  project(point) {
    const v = this.game.state.view, scale = this.scale;
    const p = this.camera.project(point.x * v.radial * scale, -point.z * v.axial * scale, point.y * v.radial * scale);
    return { x: this.cx + p.x * this.game.zoom, y: this.cy + p.y * this.game.zoom, z: p.z };
  }

  segment(a, b, color, alpha, blink) {
    const index = this.segments.length, s = this.pool[index];
    s.x1 = a.x; s.y1 = a.y; s.x2 = b.x; s.y2 = b.y;
    s.speedNorm = color; s.age = 1 - alpha; s.blink = blink;
    s.segIdx = index / this.pool.length;
    s.depth1 = Math.max(0, Math.min(1, 0.5 + a.z / (4 * this.scale)));
    s.depth2 = Math.max(0, Math.min(1, 0.5 + b.z / (4 * this.scale)));
    this.segments.push(s);
  }

  collect() {
    this.segments.length = 0;
    const { motion, decades } = this.game.state;
    const mobile = this.width < CONFIG.mobileWidth;
    for (let k = 0; k < this.strands.length; k++) {
      if (mobile && k % 4 >= 2) continue;
      const strand = this.strands[k];
      let previous;
      for (let j = 0; j < MODEL.samples; j++) {
        const s = j / (MODEL.samples - 1);
        const point = this.project(filamentPoint(strand, s, motion));
        const edge = Math.min(1, s * 12, (1 - s) * 14);
        const comb = 3 * s - motion * 0.32 - strand.offset;
        const light = Math.exp(-(((comb - Math.round(comb)) / 0.1) ** 2));
        if (previous) this.segment(previous, point, strand.branch > 0 ? 0.96 : 0.06,
          edge * (0.35 + light * 0.65), light * edge);
        previous = point;
      }
    }
    if (!this.game.waves) return;
    for (const pulse of activePulses(decades)) {
      for (let track = 0; track < MODEL.tracks; track += mobile ? 2 : 1) {
        const band = track / (MODEL.tracks - 1);
        const alpha = pulse.envelope * Math.sin(Math.PI * (0.08 + band * 0.84));
        let previous;
        for (let j = 0; j <= MODEL.ringSamples; j++) {
          const theta = j / MODEL.ringSamples * Math.PI * 2;
          const point = this.project(pulsePoint(pulse, theta, band, motion));
          if (previous) this.segment(previous, point, pulse.family ? 0.04 : 0.98, alpha,
            alpha * (0.5 + 0.5 * Math.sin(theta * pulse.modes - motion)));
          previous = point;
        }
      }
    }
  }

  draw() {
    super.draw(); this.collect();
    if (this.gpu.isAvailable()) {
      this.gpu.beginFrame(this.game.seconds);
      this.gpu.updateLines(this.segments);
      this.gpu.renderLines(this.segments.length, this.game.seconds, 0);
      this.gpu.endFrame();
      Painter.useCtx(ctx => this.gpu.compositeOnto(ctx), { saveState: true });
    } else {
      const palette = PALETTES[this.game.palette];
      Painter.useCtx(ctx => {
        ctx.globalCompositeOperation = "lighter";
        for (const s of this.segments) {
          const hue = palette.maxHue + (palette.minHue - palette.maxHue) * s.speedNorm;
          ctx.strokeStyle = `hsla(${hue},${palette.saturation}%,65%,${Math.max(0, 1 - s.age) * 0.7})`;
          ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        }
      }, { saveState: true });
    }
  }
}

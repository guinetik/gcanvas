import { GameObject, Painter, Camera3D, WebGLAttractorPipeline } from "/gcanvas.es.min.js";
import { PALETTES, LOOKS } from "./navier-stokes-looks.js";
import { LOOM_CONFIG as MODEL, createWeave, filamentPoint, unstablePoint, activePulses, pulsePoint } from "./nsvortex-model.js";

const CONFIG = {
  seed: 42, maxDt: 0.05, background: "#030910", mobileWidth: 740,
  camera: { perspective: 2200, rotationX: 0.38, rotationY: 0.2, screenRotation: -0.27 },
  fit: { height: 0.36, width: 0.5, centerY: 0.52 },
  drag: 0.006, orbit: 0.08, zoom: { min: 0.3, max: 3, wheel: 0.001 },
  reference: { stride: 8, color: "rgba(112,162,180,0.22)" },
  inset: { x: 8, width: 164, height: 145, scale: 32, minWidth: 1000, minHeight: 670,
    initial: "#456372", current: "#70e2da", text: "#a7bec7" },
  crescendo: { pushIn: 0.1, motion: 12, packetPhase: 18, extraPackets: 3,
    bloom: 0.1, glow: 0.13, glowRadius: 14, exposure: 0.04, lineWidth: 0.03, blink: 0.1, alpha: -0.1 },
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

  reseed() {
    this.strands = createWeave(this.game.seed);
    // Freeze the initial geometry, but project it through the live camera.
    this.referencePaths = this.strands.filter((_, i) => i % CONFIG.reference.stride < 2)
      .map(strand => Array.from({ length: MODEL.samples }, (_, j) => filamentPoint(strand, j / (MODEL.samples - 1), 0)));
  }
  resize() {
    this.width = this.game.width; this.height = this.game.height;
    // Fit the opening vortex to the viewport height; only narrow screens limit width.
    this.scale = Math.min(this.width * CONFIG.fit.width, this.height * CONFIG.fit.height);
    // Controls overlay the scene; keep the artwork aligned with the canvas title.
    this.cx = this.width * 0.5; this.cy = this.height * CONFIG.fit.centerY;
    if (this.gpu.width !== this.width || this.gpu.height !== this.height) this.gpu.resize(this.width, this.height);
  }

  project(point, radial = this.game.state.view.radial, axial = this.game.state.view.axial,
    scale = this.scale * (1 + CONFIG.crescendo.pushIn * this.game.state.crescendo),
    cx = this.cx, cy = this.cy, zoom = this.game.zoom) {
    const p = this.camera.project(point.x * radial * scale, -point.z * axial * scale, point.y * radial * scale);
    return { x: cx + p.x * zoom, y: cy + p.y * zoom, z: p.z };
  }

  drawReference(radial = 1, axial = 1, color = CONFIG.reference.color,
    scale = this.scale, cx = this.cx, cy = this.cy, zoom = this.game.zoom) {
    for (const path of this.referencePaths) {
      let previous;
      for (const point of path) {
        const p = this.project(point, radial, axial, scale, cx, cy, zoom);
        if (previous) Painter.lines.line(previous.x, previous.y, p.x, p.y, color, 1);
        previous = p;
      }
    }
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
    const { decades, crescendo, surge } = this.game.state, c = CONFIG.crescendo;
    const motion = this.game.state.motion + c.motion * surge;
    const mobile = this.width < CONFIG.mobileWidth;
    for (let k = 0; k < this.strands.length; k++) {
      if (mobile && k % 4 >= 2) continue;
      const strand = this.strands[k];
      let previous;
      for (let j = 0; j < MODEL.samples; j++) {
        const s = j / (MODEL.samples - 1);
        const point = this.project(unstablePoint(filamentPoint(strand, s, motion), motion, crescendo));
        const edge = Math.min(1, s * 12, (1 - s) * 14);
        const comb = (3 + c.extraPackets * crescendo) * s - motion * 0.32 - c.packetPhase * surge - strand.offset;
        const light = Math.exp(-(((comb - Math.round(comb)) / (0.1 - 0.025 * crescendo)) ** 2));
        if (previous) this.segment(previous, point, strand.branch > 0 ? 0.96 : 0.06,
          edge * (0.35 - 0.15 * crescendo + light * (0.65 + 0.15 * crescendo)), light * edge);
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
          const point = this.project(unstablePoint(pulsePoint(pulse, theta, band, motion), motion, crescendo));
          if (previous) this.segment(previous, point, pulse.family ? 0.04 : 0.98, alpha,
            alpha * (0.5 + 0.5 * Math.sin(theta * pulse.modes - motion)));
          previous = point;
        }
      }
    }
  }

  draw() {
    super.draw(); this.collect();
    const intensity = this.game.state.crescendo, c = CONFIG.crescendo;
    if (this.gpu.isAvailable()) {
      this.gpu.setBloomConfig({ strength: CONFIG.gpu.bloom.strength + c.bloom * intensity });
      this.gpu.setGlowConfig({ intensity: CONFIG.gpu.glow.intensity + c.glow * intensity,
        radius: CONFIG.gpu.glow.radius + c.glowRadius * intensity });
      this.gpu.setColorGradingConfig({ exposure: CONFIG.gpu.colorGrading.exposure + c.exposure * intensity });
      this.gpu.setVisualConfig({ maxAlpha: CONFIG.gpu.visual.maxAlpha + c.alpha * intensity });
      this.gpu.blinkConfig.intensityBoost = CONFIG.gpu.blink.intensityBoost + c.blink * intensity;
      this.gpu.lineWidth = CONFIG.gpu.lineWidth + c.lineWidth * intensity;
      this.gpu.beginFrame(this.game.seconds);
      this.gpu.updateLines(this.segments);
      this.gpu.renderLines(this.segments.length, this.game.seconds, 0);
      this.gpu.endFrame();
      Painter.useCtx(ctx => this.gpu.compositeOnto(ctx), { saveState: true });
    } else {
      const palette = PALETTES[this.game.palette];
      Painter.useCtx(ctx => {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = CONFIG.gpu.lineWidth + c.lineWidth * intensity;
        for (const s of this.segments) {
          const hue = palette.maxHue + (palette.minHue - palette.maxHue) * s.speedNorm;
          ctx.strokeStyle = `hsla(${hue},${palette.saturation}%,65%,${Math.max(0, 1 - s.age) * (0.7 - 0.2 * intensity)})`;
          ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        }
      }, { saveState: true });
    }
    // Keep the starting-view outline visible even when the live core is magnified.
    this.drawReference();
  }
}

/** The initial/current size comparison shares the main camera, without its zoom. */
export class VortexScaleInset extends GameObject {
  constructor(game) { super(game, { origin: "top-left", interactive: false }); }

  draw() {
    super.draw();
    const game = this.game, c = CONFIG.inset;
    if (game.width < c.minWidth || game.height < c.minHeight) return;
    const y = (game.height - c.height) / 2;
    Painter.shapes.roundRect(c.x, y, c.width, c.height, 8, game.theme.colors.darkerBg, game.theme.colors.subtleBorder, 1);
    Painter.useCtx(ctx => {
      ctx.beginPath(); ctx.rect(c.x, y + 28, c.width, c.height - 50); ctx.clip();
      const cx = c.x + c.width / 2, cy = game.height / 2 + 8;
      game.field.drawReference(1, 1, c.initial, c.scale, cx, cy, 1);
      game.field.drawReference(game.scales.radius, game.scales.height, c.current, c.scale, cx, cy, 1);
    }, { saveState: true });
    const font = `10px ${game.theme.fonts.family}`;
    Painter.text.fillText("FIXED SCALE", c.x + 12, y + 20, c.text, font);
    Painter.text.fillText(game.scales.radius * c.scale < 1 ? "Core below one pixel" : "Initial / current core",
      c.x + 12, y + c.height - 10, c.text, font);
  }
}

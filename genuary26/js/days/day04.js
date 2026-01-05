/**
 * Genuary 2026 - Day 4
 * Prompt: "Black on black"
 *
 * VOID DEPTHS
 * Barely visible dark particles on pure black.
 * Subtle variations in darkness create depth.
 * Mouse reveals hidden structure.
 */

import { Game, Camera3D, Painter, ParticleSystem, ParticleEmitter, Updaters, Noise } from '../../../src/index.js';

const CONFIG = {
  // Particles
  maxParticles: 2000,
  particleSize: { min: 1, max: 4 },

  // Spawn area
  spreadX: 500,
  spreadY: 300,
  spreadZ: 200,

  // Colors - VERY dark grays
  colorMin: 8,
  colorMax: 20,
  alphaBase: 0.08,

  // Motion
  driftSpeed: 8,
  damping: 0.98,

  // Camera
  perspective: 800,
  sensitivity: 0.003,

  // Mouse reveal
  mouseRadius: 180,
  revealBrightness: 60,
  revealAlpha: 0.7,
};

class BlackOnBlackDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.time = 0;
    this.mouseX = -9999;
    this.mouseY = -9999;

    Noise.seed(42);

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      rotationX: 0.1,
      rotationY: 0,
      sensitivity: CONFIG.sensitivity,
      inertia: true,
      friction: 0.95,
      clampX: false,
    });
    this.camera.enableMouseControl(this.canvas);

    // Updaters
    const drift = this.createDriftUpdater();
    const mouseReveal = this.createMouseUpdater();

    // ParticleSystem
    this.particles = new ParticleSystem(this, {
      camera: this.camera,
      depthSort: true,
      maxParticles: CONFIG.maxParticles,
      blendMode: 'lighter',
      updaters: [
        drift,
        mouseReveal,
        Updaters.velocity,
        Updaters.damping(CONFIG.damping),
      ],
    });

    const emitter = new ParticleEmitter({
      rate: 0,
      lifetime: { min: 999, max: 999 },
      size: CONFIG.particleSize,
      color: { r: CONFIG.colorMin, g: CONFIG.colorMin, b: CONFIG.colorMin, a: CONFIG.alphaBase },
    });
    this.particles.addEmitter('void', emitter);

    this.spawnParticles();

    this.pipeline.add(this.particles);

    console.log(`[Day4] Black on black: ${this.particles.particleCount} particles`);

    // Mouse tracking
    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };
    this._onMouseLeave = () => {
      this.mouseX = -9999;
      this.mouseY = -9999;
    };
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
  }

  spawnParticles() {
    const emitter = this.particles.getEmitter('void');

    for (let i = 0; i < CONFIG.maxParticles; i++) {
      const p = this.particles.acquire();
      emitter.emit(p);

      p.x = (Math.random() - 0.5) * CONFIG.spreadX * 2;
      p.y = (Math.random() - 0.5) * CONFIG.spreadY * 2;
      p.z = (Math.random() - 0.5) * CONFIG.spreadZ * 2;

      const gray = CONFIG.colorMin + Math.random() * (CONFIG.colorMax - CONFIG.colorMin);
      p.custom.baseGray = gray;
      p.custom.baseAlpha = CONFIG.alphaBase + Math.random() * 0.04;
      p.custom.phase = Math.random() * Math.PI * 2;

      p.color.r = gray;
      p.color.g = gray;
      p.color.b = gray;
      p.color.a = p.custom.baseAlpha;

      p.size = CONFIG.particleSize.min + Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min);

      this.particles.particles.push(p);
    }
  }

  createDriftUpdater() {
    return (p, dt, system) => {
      // Gentle noise-based drift
      const nx = Noise.simplex3(p.x * 0.003, p.y * 0.003, this.time * 0.2);
      const ny = Noise.simplex3(p.y * 0.003, p.z * 0.003, this.time * 0.2 + 100);
      const nz = Noise.simplex3(p.z * 0.003, p.x * 0.003, this.time * 0.2 + 200);

      p.vx += nx * CONFIG.driftSpeed * dt;
      p.vy += ny * CONFIG.driftSpeed * dt;
      p.vz += nz * CONFIG.driftSpeed * dt * 0.5;

      // Subtle breathing
      const breathe = Math.sin(this.time * 0.5 + p.custom.phase) * 0.02;
      p.color.a = p.custom.baseAlpha * (1 + breathe);
    };
  }

  createMouseUpdater() {
    return (p, dt, system) => {
      if (this.mouseX < 0) return;

      const proj = this.camera.project(p.x, p.y, p.z);
      const screenX = this.width / 2 + proj.x;
      const screenY = this.height / 2 + proj.y;

      const mdx = screenX - this.mouseX;
      const mdy = screenY - this.mouseY;
      const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);

      if (mouseDist < CONFIG.mouseRadius) {
        // Reveal - brighten on hover
        const reveal = 1 - mouseDist / CONFIG.mouseRadius;
        const targetGray = p.custom.baseGray + reveal * (CONFIG.revealBrightness - p.custom.baseGray);
        const targetAlpha = p.custom.baseAlpha + reveal * (CONFIG.revealAlpha - p.custom.baseAlpha);

        p.color.r += (targetGray - p.color.r) * 0.2;
        p.color.g = p.color.r;
        p.color.b = p.color.r;
        p.color.a += (targetAlpha - p.color.a) * 0.2;
      } else {
        // Fade back to darkness
        p.color.r += (p.custom.baseGray - p.color.r) * 0.05;
        p.color.g = p.color.r;
        p.color.b = p.color.r;
        p.color.a += (p.custom.baseAlpha - p.color.a) * 0.05;
      }
    };
  }

  stop() {
    super.stop();
    if (this.camera) this.camera.disableMouseControl();
    if (this._onMouseMove) {
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
    }
    if (this._onMouseLeave) {
      this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.camera.update(dt);
  }

  render() {
    // Very slow fade - emphasizes the darkness
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.pipeline.render(this.ctx);
  }
}

export default function day04(canvas) {
  const game = new BlackOnBlackDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}

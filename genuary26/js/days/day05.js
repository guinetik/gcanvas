/**
 * Genuary 2026 - Day 5
 * Prompt: "Write 'Genuary'. Avoid using a font."
 *
 * ORBITAL TEXT - Pluribus Style
 * Concentric orbital rings emanate from the first letter (G).
 * Background particles flow along these orbits like planets around a sun.
 * Letters formed by particles with fingerprint/cymatic wave patterns.
 */

import { Game, Camera3D, Painter, ParticleSystem, ParticleEmitter, Updaters, Noise } from '../../../src/index.js';

const CONFIG = {
  // Text layout
  letterWidth: 5,
  letterHeight: 7,
  letterSpacing: 1.5,
  pixelSize: 18,
  marginRatio: 0.85,

  // Fingerprint wave pattern inside letters
  waveFrequency: 0.15,
  waveAmplitude: 8,
  lineThickness: 0.22,

  // Particles
  maxParticles: 8000,
  particleSize: { min: 0.8, max: 1.4 },
  sampleDensity: 0.8,

  // Orbital rings (ripples from G)
  orbitCount: 35,
  orbitBaseRadius: 50,
  orbitSpacing: 40,
  orbitEccentricity: 0.55,  // wider horizontally
  orbitSpeed: 0.15,
  particlesPerOrbit: 50,
  orbitSpawnDelay: 0.3,  // delay between each ring spawning
  orbitGrowDuration: 0.5,  // how long each ring takes to grow out

  // Animation
  spawnDuration: 1.5,
  letterStagger: 1.2,     // seconds between each letter
  breatheAmount: 0.8,
  breatheSpeed: 1.2,

  // Camera
  perspective: 800,
  sensitivity: 0.003,

  // Mouse
  mouseRadius: 120,
  mousePush: 80,
};

// 5x7 pixel font
const LETTERS = {
  G: [[1,0],[2,0],[3,0],[0,1],[0,2],[0,3],[2,3],[3,3],[4,3],[0,4],[4,4],[0,5],[4,5],[1,6],[2,6],[3,6]],
  E: [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[0,4],[0,5],[0,6],[1,6],[2,6],[3,6],[4,6]],
  N: [[0,0],[4,0],[0,1],[1,1],[4,1],[0,2],[2,2],[4,2],[0,3],[2,3],[4,3],[0,4],[3,4],[4,4],[0,5],[4,5],[0,6],[4,6]],
  U: [[0,0],[4,0],[0,1],[4,1],[0,2],[4,2],[0,3],[4,3],[0,4],[4,4],[0,5],[4,5],[1,6],[2,6],[3,6]],
  A: [[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3],[4,3],[0,4],[4,4],[0,5],[4,5],[0,6],[4,6]],
  R: [[0,0],[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3],[0,4],[2,4],[0,5],[3,5],[0,6],[4,6]],
  Y: [[0,0],[4,0],[0,1],[4,1],[1,2],[3,2],[2,3],[2,4],[2,5],[2,6]],
};

class OrbitalTextDemo extends Game {
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
      rotationX: 0,
      rotationY: 0,
      sensitivity: CONFIG.sensitivity,
      inertia: true,
      friction: 0.95,
      clampX: false,
    });
    this.camera.enableMouseControl(this.canvas);

    // Calculate text bounds to find orbit origin (first letter G)
    this.textBounds = this.calculateTextBounds('GENUARY');
    this.orbitOrigin = {
      x: this.textBounds.firstLetterX,
      y: 0,
    };

    // Pre-calculate letter target positions
    this.targetPositions = this.calculateTargetPositions('GENUARY');

    // Custom updaters
    const orbitalMotion = this.createOrbitalUpdater();
    const spawnAnimation = this.createSpawnUpdater();
    const breatheMotion = this.createBreatheUpdater();
    const mouseInteraction = this.createMouseUpdater();

    // ParticleSystem
    this.particles = new ParticleSystem(this, {
      camera: this.camera,
      depthSort: true,
      maxParticles: CONFIG.maxParticles,
      blendMode: 'screen',
      updaters: [
        orbitalMotion,
        spawnAnimation,
        breatheMotion,
        mouseInteraction,
        Updaters.velocity,
        Updaters.damping(0.92),
      ],
    });

    const emitter = new ParticleEmitter({
      rate: 0,
      lifetime: { min: 999, max: 999 },
      size: CONFIG.particleSize,
      color: { r: 200, g: 200, b: 200, a: 0.8 },
    });
    this.particles.addEmitter('text', emitter);

    // Spawn particles
    this.spawnLetterParticles();
    this.spawnOrbitalParticles();

    this.pipeline.add(this.particles);

    console.log(`[Day5] Orbital GENUARY: ${this.particles.particleCount} particles`);

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

  calculateTextBounds(text) {
    const chars = text.split('');
    const totalWidth = chars.length * (CONFIG.letterWidth + CONFIG.letterSpacing) - CONFIG.letterSpacing;

    const maxWidth = this.width * CONFIG.marginRatio;
    const naturalWidth = totalWidth * CONFIG.pixelSize;
    const scale = Math.min(1, maxWidth / naturalWidth);
    const pixelSize = CONFIG.pixelSize * scale;

    const startX = -totalWidth * pixelSize / 2;
    const firstLetterX = startX + (CONFIG.letterWidth / 2) * pixelSize;

    // Calculate center of each letter for cascade spawning
    const letterCenters = [];
    let offsetX = 0;
    for (let i = 0; i < chars.length; i++) {
      const letterCenterX = startX + (offsetX + CONFIG.letterWidth / 2) * pixelSize;
      letterCenters.push({ x: letterCenterX, y: 0 });
      offsetX += CONFIG.letterWidth + CONFIG.letterSpacing;
    }

    return { startX, pixelSize, firstLetterX, letterCenters };
  }

  calculateTargetPositions(text) {
    const positions = [];
    const chars = text.split('');
    const { startX, pixelSize, letterCenters } = this.textBounds;
    let offsetX = 0;
    let letterIndex = 0;

    for (const char of chars) {
      const letter = LETTERS[char];
      if (!letter) {
        offsetX += CONFIG.letterWidth + CONFIG.letterSpacing;
        letterIndex++;
        continue;
      }

      // Previous letter center (or G's own center for first letter - the orbit origin)
      const spawnOrigin = letterIndex === 0
        ? letterCenters[0]  // G spawns from its own center (orbit origin)
        : letterCenters[letterIndex - 1];

      for (const [lx, ly] of letter) {
        const centerX = startX + (offsetX + lx) * pixelSize;
        const centerY = (ly - CONFIG.letterHeight / 2) * pixelSize;

        const halfSize = pixelSize / 2;
        const step = CONFIG.sampleDensity;

        for (let dy = -halfSize; dy <= halfSize; dy += step) {
          for (let dx = -halfSize; dx <= halfSize; dx += step) {
            const wx = centerX + dx;
            const wy = centerY + dy;

            // Fingerprint wave pattern
            const noiseVal = Noise.simplex2(wx * 0.008, wy * 0.008);
            const warpedX = wx + noiseVal * CONFIG.waveAmplitude;
            const warpedY = wy + noiseVal * CONFIG.waveAmplitude * 0.5;

            const wave = Math.sin(
              (warpedX + warpedY) * CONFIG.waveFrequency +
              noiseVal * 3
            );

            if (Math.abs(wave) < CONFIG.lineThickness) {
              const z = noiseVal * 15;
              const brightness = 0.7 + Math.random() * 0.3;

              positions.push({
                x: wx, y: wy, z: z,
                brightness: brightness,
                phase: (wx + wy) * 0.02,
                letterIndex: letterIndex,
                spawnOriginX: spawnOrigin.x,
                spawnOriginY: spawnOrigin.y,
              });
            }
          }
        }
      }
      offsetX += CONFIG.letterWidth + CONFIG.letterSpacing;
      letterIndex++;
    }

    return positions;
  }

  spawnLetterParticles() {
    const emitter = this.particles.getEmitter('text');

    for (const target of this.targetPositions) {
      const p = this.particles.acquire();
      emitter.emit(p);

      // Start at THIS letter's spawn origin (previous letter's center)
      p.x = target.spawnOriginX + (Math.random() - 0.5) * 30;
      p.y = target.spawnOriginY + (Math.random() - 0.5) * 30;
      p.z = (Math.random() - 0.5) * 20;

      p.custom.targetX = target.x;
      p.custom.targetY = target.y;
      p.custom.targetZ = target.z;
      p.custom.spawnOriginX = target.spawnOriginX;
      p.custom.spawnOriginY = target.spawnOriginY;
      p.custom.phase = target.phase;
      p.custom.brightness = target.brightness;
      p.custom.baseBrightness = target.brightness;
      p.custom.isLetter = true;
      // Simple: G when first orbit done, then equal stagger for each letter
      const gDelay = CONFIG.orbitGrowDuration + 0.2;
      p.custom.spawnDelay = gDelay + target.letterIndex * CONFIG.letterStagger + Math.random() * 0.1;
      p.custom.spawnProgress = 0;

      const gray = Math.floor(180 + target.brightness * 75);
      p.color.r = gray;
      p.color.g = gray;
      p.color.b = gray;
      p.color.a = 0;

      p.size = CONFIG.particleSize.min + Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min);

      this.particles.particles.push(p);
    }
  }

  spawnOrbitalParticles() {
    const emitter = this.particles.getEmitter('text');

    // All orbits centered on G, growing outward like ripples
    for (let ring = 0; ring < CONFIG.orbitCount; ring++) {
      const orbitRadius = CONFIG.orbitBaseRadius + ring * CONFIG.orbitSpacing;
      const particleCount = CONFIG.particlesPerOrbit + ring * 2;
      const ringDelay = ring * CONFIG.orbitSpawnDelay;

      for (let i = 0; i < particleCount; i++) {
        const p = this.particles.acquire();
        emitter.emit(p);

        const baseAngle = (i / particleCount) * Math.PI * 2;
        const angle = baseAngle + (Math.random() - 0.5) * 0.2;

        // Tall vertical ellipses - Y is long axis, X is short axis
        const rx = orbitRadius * CONFIG.orbitEccentricity;
        const ry = orbitRadius;

        // Start at G's center
        p.x = this.orbitOrigin.x;
        p.y = this.orbitOrigin.y;
        p.z = (Math.random() - 0.5) * 5;

        p.custom.isLetter = false;
        p.custom.isOrbital = true;
        p.custom.orbitCenterX = this.orbitOrigin.x;
        p.custom.orbitCenterY = this.orbitOrigin.y;
        p.custom.orbitRx = rx;
        p.custom.orbitRy = ry;
        p.custom.orbitAngle = angle;
        p.custom.orbitSpeed = CONFIG.orbitSpeed / (1 + ring * 0.1);
        p.custom.orbitDirection = Math.random() > 0.2 ? 1 : -1;
        p.custom.ringIndex = ring;
        p.custom.spawnDelay = ringDelay;
        p.custom.spawnProgress = 0;

        const brightness = 0.5 + Math.random() * 0.5;
        p.custom.brightness = brightness;
        p.custom.baseBrightness = brightness;

        const gray = Math.floor(180 + brightness * 70);  // 180-250 range
        p.color.r = gray;
        p.color.g = gray;
        p.color.b = gray;
        p.color.a = 0;  // Start invisible, fades in

        p.size = 0.4 + Math.random() * 0.6;

        this.particles.particles.push(p);
      }
    }
  }

  createOrbitalUpdater() {
    return (p, dt, system) => {
      if (!p.custom.isOrbital) return;

      // Wait for spawn delay
      if (this.time < p.custom.spawnDelay) return;

      // Grow animation - ring expands outward from G
      if (p.custom.spawnProgress < 1) {
        p.custom.spawnProgress = Math.min(1, (p.custom.spawnProgress || 0) + dt / CONFIG.orbitGrowDuration);
        const t = this.easeOutCubic(p.custom.spawnProgress);

        // Fade in - brighter alpha
        p.color.a = (0.6 + p.custom.baseBrightness * 0.35) * t;
      }

      // Rotate
      p.custom.orbitAngle += p.custom.orbitSpeed * p.custom.orbitDirection * dt;

      // All rings centered on G (orbitOrigin)
      const scale = p.custom.spawnProgress;  // grow from center

      const targetX = this.orbitOrigin.x + Math.cos(p.custom.orbitAngle) * p.custom.orbitRx * scale;
      const targetY = this.orbitOrigin.y + Math.sin(p.custom.orbitAngle) * p.custom.orbitRy * scale;

      p.vx += (targetX - p.x) * 0.3;
      p.vy += (targetY - p.y) * 0.3;
    };
  }

  createSpawnUpdater() {
    return (p, dt, system) => {
      if (!p.custom.isLetter || p.custom.spawnProgress >= 1) return;

      if (this.time > p.custom.spawnDelay) {
        p.custom.spawnProgress = Math.min(1, (p.custom.spawnProgress || 0) + dt / CONFIG.spawnDuration);

        const t = this.easeOutCubic(p.custom.spawnProgress);

        // Fly from THIS particle's spawn origin (previous letter) to target
        const startX = p.custom.spawnOriginX;
        const startY = p.custom.spawnOriginY;

        p.x = startX + (p.custom.targetX - startX) * t;
        p.y = startY + (p.custom.targetY - startY) * t;
        p.z = (p.custom.targetZ || 0) * t;

        p.color.a = p.custom.brightness * t;
      }
    };
  }

  createBreatheUpdater() {
    return (p, dt, system) => {
      if (!p.custom.isLetter || p.custom.spawnProgress < 1) return;

      const phase = p.custom.phase || 0;
      const breathe = Math.sin(this.time * CONFIG.breatheSpeed + phase) * CONFIG.breatheAmount;

      const baseX = p.custom.targetX + breathe;
      const baseY = p.custom.targetY + breathe * 0.5;

      p.vx += (baseX - p.x) * 0.1;
      p.vy += (baseY - p.y) * 0.1;
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

      if (mouseDist < CONFIG.mouseRadius && mouseDist > 1) {
        const force = (1 - mouseDist / CONFIG.mouseRadius) * CONFIG.mousePush * dt;
        p.vx += (mdx / mouseDist) * force;
        p.vy += (mdy / mouseDist) * force;

        // Brighten on hover
        p.custom.brightness = Math.min(1, p.custom.baseBrightness + 0.3);
      } else if (p.custom.isLetter && p.custom.spawnProgress >= 1) {
        p.custom.brightness = p.custom.baseBrightness;
      }

      // Update color based on brightness
      if (p.custom.isLetter) {
        const gray = Math.floor(180 + p.custom.brightness * 75);
        p.color.r = gray;
        p.color.g = gray;
        p.color.b = gray;
      }
    };
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
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
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.pipeline.render(this.ctx);
  }
}

export default function day05(canvas) {
  const game = new OrbitalTextDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}

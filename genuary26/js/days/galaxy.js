/**
 *
 * SPIRAL GALAXY
 *
 * Logarithmic spiral arms (golden ratio) wind out from a supermassive black hole.
 * Stars cluster along the arms, creating the classic galaxy silhouette.
 *
 * Drag to tilt the galaxy. Click to pause.
 */

import { Game, Camera3D, Painter } from '../../../src/index.js';

const CONFIG = {
  // Galaxy structure
  numArms: 2,             // Number of spiral arms
  starCount: 3000,
  galaxyRadius: 350,
  armWidth: 40,           // How wide the arms are (star scatter)

  // Spiral geometry - logarithmic spiral: r = a * e^(b*θ)
  // For golden spiral: b = ln(φ) / (π/2) ≈ 0.306
  spiralTightness: 0.25,  // Controls how tightly wound (lower = tighter)
  spiralStart: 30,        // Starting radius of arms

  // Rotation - slow enough that spiral persists for a long viewing session
  // (Real galaxies take ~250 million years per rotation)
  baseRotationSpeed: 0.033,
  rotationFalloff: 0.35,

  // Black hole
  blackHoleRadius: 12,
  accretionDiskRadius: 50,
  accretionHue: 30,       // Orange/yellow hot gas

  // Visual
  armHue: 210,            // Blue-ish arms
  coreStarHue: 50,        // Yellowish near center

  // Camera
  perspective: 600,
  initialTiltX: 0.6,
  maxTilt: 1.4,
};

const TAU = Math.PI * 2;
const PHI = (1 + Math.sqrt(5)) / 2;

class SpiralGalaxyDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.time = 0;
    this.paused = false;
    this.galaxyRotation = 0;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.perspective,
      rotationX: CONFIG.initialTiltX,
      rotationY: 0,
      sensitivity: 0.002,
      inertia: true,
      friction: 0.92,
    });
    this.camera.enableMouseControl(this.canvas);

    // Generate stars along spiral arms
    this.stars = [];
    this.generateSpiralArms();

    // Click to pause
    this.canvas.addEventListener('click', () => {
      if (!this.camera._isDragging) {
        this.paused = !this.paused;
      }
    });
  }

  generateSpiralArms() {
    const starsPerArm = Math.floor(CONFIG.starCount / CONFIG.numArms);

    for (let arm = 0; arm < CONFIG.numArms; arm++) {
      // Each arm starts at a different angle
      const armOffset = (arm / CONFIG.numArms) * TAU;

      for (let i = 0; i < starsPerArm; i++) {
        // Progress along the arm (0 to 1)
        const t = i / starsPerArm;

        // Logarithmic spiral: r = a * e^(b*θ)
        // θ increases as we go outward
        const theta = t * TAU * 2.5;  // About 2.5 full turns
        const r = CONFIG.spiralStart * Math.exp(CONFIG.spiralTightness * theta);

        // Skip if beyond galaxy radius
        if (r > CONFIG.galaxyRadius) continue;

        // Base position on the spiral arm
        const baseAngle = theta + armOffset;

        // Add scatter perpendicular to arm (Gaussian-ish distribution)
        const scatter = (Math.random() - 0.5 + Math.random() - 0.5) * CONFIG.armWidth;
        const scatterAngle = baseAngle + Math.PI / 2;  // Perpendicular

        // Also add some along-arm scatter
        const alongScatter = (Math.random() - 0.5) * 20;

        const x = Math.cos(baseAngle) * (r + alongScatter) + Math.cos(scatterAngle) * scatter;
        const z = Math.sin(baseAngle) * (r + alongScatter) + Math.sin(scatterAngle) * scatter;

        // Y (thickness) - thinner at edges
        const thickness = 8 * (1 - t * 0.7);
        const y = (Math.random() - 0.5) * thickness;

        // Actual radius from center (for rotation speed)
        const actualRadius = Math.sqrt(x * x + z * z);
        const actualAngle = Math.atan2(z, x);

        // Rotation speed - Keplerian
        const rotationSpeed = CONFIG.baseRotationSpeed /
          Math.pow(Math.max(actualRadius, 20) / 20, CONFIG.rotationFalloff);

        // Color - bluer in arms, yellower near center
        const distFactor = actualRadius / CONFIG.galaxyRadius;
        const hue = CONFIG.coreStarHue + (CONFIG.armHue - CONFIG.coreStarHue) * Math.pow(distFactor, 0.6);

        // Brightness variation
        const brightness = 0.4 + Math.random() * 0.6;

        // Size - larger near center
        const size = (1.5 - distFactor * 0.8) + Math.random() * 1.2;

        this.stars.push({
          radius: actualRadius,
          angle: actualAngle,
          y,
          rotationSpeed,
          hue,
          brightness,
          size,
          twinklePhase: Math.random() * TAU,
        });
      }
    }

    // Add some scattered field stars (not in arms)
    const fieldStars = Math.floor(CONFIG.starCount * 0.15);
    for (let i = 0; i < fieldStars; i++) {
      const angle = Math.random() * TAU;
      const radius = Math.sqrt(Math.random()) * CONFIG.galaxyRadius;
      const y = (Math.random() - 0.5) * 15;

      const rotationSpeed = CONFIG.baseRotationSpeed /
        Math.pow(Math.max(radius, 20) / 20, CONFIG.rotationFalloff);

      this.stars.push({
        radius,
        angle,
        y,
        rotationSpeed,
        hue: CONFIG.armHue + Math.random() * 30,
        brightness: 0.2 + Math.random() * 0.4,
        size: 0.5 + Math.random() * 0.8,
        twinklePhase: Math.random() * TAU,
      });
    }
  }

  update(dt) {
    super.update(dt);

    // Clamp camera tilt
    if (this.camera.rotationX > CONFIG.maxTilt) this.camera.rotationX = CONFIG.maxTilt;
    if (this.camera.rotationX < -CONFIG.maxTilt) this.camera.rotationX = -CONFIG.maxTilt;

    this.camera.update(dt);

    if (this.paused) return;

    this.time += dt;

    // Rotate entire galaxy slowly
    this.galaxyRotation += dt * 0.02;

    // Update each star's position (differential rotation)
    for (const star of this.stars) {
      star.angle += star.rotationSpeed * dt;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Draw galactic glow (behind everything)
    this.drawGalacticHaze(ctx, cx, cy);

    // Draw stars
    this.drawStars(ctx, cx, cy);

    // Draw black hole with accretion disk
    this.drawBlackHole(ctx, cx, cy);
  }

  drawGalacticHaze(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x;
    const screenY = cy + p.y;

    // Elliptical haze based on tilt
    const tilt = Math.cos(this.camera.rotationX);
    const hazeRadius = CONFIG.galaxyRadius * p.scale * 0.9;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(1, Math.max(0.15, Math.abs(tilt)));

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, hazeRadius);
    gradient.addColorStop(0, `hsla(${CONFIG.accretionHue}, 70%, 50%, 0.1)`);
    gradient.addColorStop(0.2, `hsla(${CONFIG.armHue}, 50%, 40%, 0.06)`);
    gradient.addColorStop(0.5, `hsla(${CONFIG.armHue}, 40%, 30%, 0.03)`);
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(0, 0, hazeRadius, 0, TAU);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  drawStars(ctx, cx, cy) {
    // Project all stars and sort by depth
    const projected = [];

    for (const star of this.stars) {
      const x = Math.cos(star.angle) * star.radius;
      const z = Math.sin(star.angle) * star.radius;

      const p = this.camera.project(x, star.y, z);
      projected.push({ star, p, x, z });
    }

    // Sort back to front
    projected.sort((a, b) => a.p.z - b.p.z);

    // Draw stars
    for (const { star, p } of projected) {
      if (p.scale < 0.02) continue;

      const screenX = cx + p.x;
      const screenY = cy + p.y;

      // Twinkle
      const twinkle = 0.7 + 0.3 * Math.sin(this.time * 2.5 + star.twinklePhase);
      const alpha = star.brightness * twinkle * Math.min(1, p.scale * 1.5);

      const size = Math.max(0.4, star.size * p.scale);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${star.hue}, 60%, ${55 + star.brightness * 35}%)`;

      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, TAU);
      ctx.fill();

      // Glow for brighter stars
      if (size > 1.2 && star.brightness > 0.6) {
        ctx.globalAlpha = alpha * 0.25;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2.5, 0, TAU);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  drawBlackHole(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x;
    const screenY = cy + p.y;

    // Accretion disk (hot gas spiraling in)
    const diskRadius = CONFIG.accretionDiskRadius * p.scale;
    const holeRadius = CONFIG.blackHoleRadius * p.scale;

    // Flatten disk based on viewing angle
    const tilt = Math.cos(this.camera.rotationX);

    ctx.save();
    ctx.translate(screenX, screenY);

    // Accretion disk glow
    ctx.globalCompositeOperation = 'lighter';

    // Outer disk
    const diskGradient = ctx.createRadialGradient(0, 0, holeRadius, 0, 0, diskRadius);
    diskGradient.addColorStop(0, `hsla(${CONFIG.accretionHue + 20}, 100%, 70%, 0.9)`);
    diskGradient.addColorStop(0.3, `hsla(${CONFIG.accretionHue}, 100%, 60%, 0.6)`);
    diskGradient.addColorStop(0.6, `hsla(${CONFIG.accretionHue - 10}, 90%, 50%, 0.3)`);
    diskGradient.addColorStop(1, 'transparent');

    ctx.scale(1, Math.max(0.1, Math.abs(tilt)));
    ctx.beginPath();
    ctx.arc(0, 0, diskRadius, 0, TAU);
    ctx.fillStyle = diskGradient;
    ctx.fill();

    ctx.restore();

    // The black hole itself (event horizon - pure black)
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(1, Math.max(0.3, Math.abs(tilt)));

    ctx.beginPath();
    ctx.arc(0, 0, holeRadius, 0, TAU);
    ctx.fillStyle = '#000';
    ctx.fill();

    // Photon ring (light bending around the black hole)
    ctx.strokeStyle = `hsla(${CONFIG.accretionHue + 10}, 100%, 75%, 0.8)`;
    ctx.lineWidth = 2 * p.scale;
    ctx.stroke();

    ctx.restore();

    // Gravitational lensing effect - bright ring just outside event horizon
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(1, Math.max(0.3, Math.abs(tilt)));

    const lensRing = ctx.createRadialGradient(0, 0, holeRadius * 0.9, 0, 0, holeRadius * 1.5);
    lensRing.addColorStop(0, 'transparent');
    lensRing.addColorStop(0.5, `hsla(${CONFIG.accretionHue}, 100%, 80%, 0.5)`);
    lensRing.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(0, 0, holeRadius * 1.5, 0, TAU);
    ctx.fillStyle = lensRing;
    ctx.fill();

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }
}

export default function (canvas) {
  const game = new SpiralGalaxyDemo(canvas);
  game.start();
  return { stop: () => game.stop(), game };
}

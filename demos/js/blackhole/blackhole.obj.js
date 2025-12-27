/**
 * BlackHole - Event horizon, photon ring, and Hawking radiation
 *
 * Renders the black hole core with gravitational lensing effects,
 * photon ring glow, and Hawking radiation particles.
 */
import { GameObject, Easing } from "../../../src/index.js";

// Hawking radiation configuration
const HAWKING_SPAWN_RATE = 0.15;
const HAWKING_SPEED = 0.25;
const HAWKING_LIFETIME = 3.5;

export class BlackHole extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {Camera3D} options.camera - Camera for projection
   * @param {StateMachine} options.formationFSM - Formation state machine
   * @param {number} options.baseScale - Base scale for sizing
   * @param {number} options.bhRadius - Black hole radius
   * @param {number} options.diskOuter - Outer disk radius (for Hawking bounds)
   */
  constructor(game, options = {}) {
    super(game, options);

    this.camera = options.camera;
    this.formationFSM = options.formationFSM;

    // Sizing
    this.baseScale = options.baseScale ?? 500;
    this.bhRadius = options.bhRadius ?? 40;
    this.diskOuter = options.diskOuter ?? 175;

    // Hawking radiation
    this.hawkingParticles = [];
    this.hawkingSpawnTimer = 0;
  }

  /**
   * Update sizing when window resizes.
   */
  updateSizing(baseScale, bhRadius, diskOuter) {
    this.baseScale = baseScale;
    this.bhRadius = bhRadius;
    this.diskOuter = diskOuter;
  }

  /**
   * Reset Hawking radiation state.
   */
  reset() {
    this.hawkingParticles = [];
    this.hawkingSpawnTimer = 0;
  }

  /**
   * Calculate formation progress (0-1) based on consumed particles.
   */
  getFormationLambda(particlesConsumed, totalParticleMass) {
    const state = this.formationFSM.state;
    const progress = this.formationFSM.progress;

    if (state === "infall") {
      if (!particlesConsumed || particlesConsumed === 0) return 0;
      const maxConsumed = totalParticleMass * 0.4;
      const consumedRatio = Math.min(1, particlesConsumed / maxConsumed);
      return consumedRatio * 0.5;
    } else if (state === "collapse") {
      const delayedProgress = Math.max(0, (progress - 0.2) / 0.8);
      return 0.5 + Easing.easeOutQuad(delayedProgress) * 0.3;
    } else if (state === "circularize") {
      return 0.8 + progress * 0.2;
    }
    return 1; // stable
  }

  /**
   * Spawn a new Hawking radiation particle.
   */
  spawnHawkingParticle() {
    const angle = Math.random() * Math.PI * 2;
    const startRadius = this.bhRadius * 1.05;

    // ~10% chance to be an "escaper"
    const isEscaper = Math.random() < 0.1;

    this.hawkingParticles.push({
      angle,
      radius: startRadius,
      speed: isEscaper
        ? HAWKING_SPEED * (1.5 + Math.random() * 1.0)
        : HAWKING_SPEED * (0.6 + Math.random() * 0.8),
      size: isEscaper ? 3 + Math.random() * 2 : 2 + Math.random() * 2,
      brightness: isEscaper ? 1.0 : 0.8 + Math.random() * 0.2,
      age: 0,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 3,
      isEscaper,
      maxRadius: isEscaper ? this.baseScale * 0.8 : this.diskOuter,
    });
  }

  update(dt) {
    super.update(dt);
    this.updateHawkingRadiation(dt);
  }

  /**
   * Update Hawking radiation particles.
   */
  updateHawkingRadiation(dt) {
    // Only spawn when stable
    if (this.formationFSM.is("stable")) {
      this.hawkingSpawnTimer += dt;
      if (this.hawkingSpawnTimer > 1 / HAWKING_SPAWN_RATE) {
        this.spawnHawkingParticle();
        this.hawkingSpawnTimer = 0;
      }
    }

    // Update existing particles
    for (let i = this.hawkingParticles.length - 1; i >= 0; i--) {
      const p = this.hawkingParticles[i];
      p.age += dt;
      p.radius += p.speed * this.bhRadius * dt;
      const wobble = Math.sin(p.age * p.wobbleSpeed + p.wobblePhase) * 0.02;
      p.angle += (0.05 + wobble) * dt;

      const maxLife = p.isEscaper ? HAWKING_LIFETIME * 2.5 : HAWKING_LIFETIME;
      if (p.age > maxLife || p.radius > p.maxRadius) {
        this.hawkingParticles.splice(i, 1);
      }
    }
  }

  /**
   * Build render list with black hole and Hawking particles.
   */
  buildRenderList(lambda) {
    const renderList = [];

    // Black hole (only render after formation starts)
    if (lambda > 0.05) {
      const holeProj = this.camera.project(0, 0, 0);
      renderList.push({
        type: "hole",
        z: holeProj.z,
        x: holeProj.x,
        y: holeProj.y,
        scale: holeProj.scale,
        lambda: lambda,
      });
    }

    // Hawking particles
    for (const p of this.hawkingParticles) {
      const x = Math.cos(p.angle) * p.radius;
      const z = Math.sin(p.angle) * p.radius;
      const y = 0;

      const cosY = Math.cos(this.camera.rotationY);
      const sinY = Math.sin(this.camera.rotationY);
      let xCam = x * cosY - z * sinY;
      let zCam = x * sinY + z * cosY;

      const cosX = Math.cos(this.camera.rotationX);
      const sinX = Math.sin(this.camera.rotationX);
      let yCam = y * cosX - zCam * sinX;
      zCam = y * sinX + zCam * cosX;

      const perspectiveScale =
        this.camera.perspective / (this.camera.perspective + zCam);
      const screenX = xCam * perspectiveScale;
      const screenY = yCam * perspectiveScale;

      if (zCam < -this.camera.perspective + 10) continue;

      const maxLife = p.isEscaper ? HAWKING_LIFETIME * 2.5 : HAWKING_LIFETIME;
      const ageRatio = p.age / maxLife;
      const fadeIn = Math.min(1, p.age * 4);
      const fadeOut = 1 - Math.pow(ageRatio, 2);
      const brightness = p.brightness * fadeIn * fadeOut;

      renderList.push({
        type: "hawking",
        z: zCam,
        x: screenX,
        y: screenY,
        scale: perspectiveScale,
        size: p.size,
        brightness: brightness,
        age: p.age,
      });
    }

    return renderList;
  }

  /**
   * Draw the event horizon and photon ring.
   * Static method for use in main render loop.
   */
  static drawHole(ctx, item, bhRadius) {
    const r = bhRadius * item.scale * item.lambda;

    // Photon ring glow (additive)
    ctx.globalCompositeOperation = "screen";
    const glowIntensity = item.lambda;
    const gradient = ctx.createRadialGradient(
      item.x,
      item.y,
      r * 0.8,
      item.x,
      item.y,
      r * 1.5,
    );
    gradient.addColorStop(0, `rgba(255, 200, 100, ${glowIntensity})`);
    gradient.addColorStop(0.2, `rgba(255, 150, 50, ${0.6 * glowIntensity})`);
    gradient.addColorStop(1, "rgba(255, 50, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // Event horizon (void)
    ctx.beginPath();
    ctx.arc(item.x, item.y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#000";
    ctx.fill();
  }

  /**
   * Draw a Hawking radiation particle.
   * Static method for use in main render loop.
   */
  static drawHawkingParticle(ctx, item, baseScale) {
    const size = item.size * item.scale * (baseScale * 0.001);
    if (size < 0.1) return;

    const pulseIntensity = 0.8 + 0.2 * Math.sin(item.age * 8);

    // Outer glow
    ctx.globalCompositeOperation = "screen";
    ctx.shadowColor = "rgba(0, 255, 200, 0.9)";
    ctx.shadowBlur = 25 * item.brightness;

    // Core - cyan-green
    ctx.fillStyle = `rgba(100, 255, 220, ${item.brightness * 0.9 * pulseIntensity})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = `rgba(200, 255, 250, ${item.brightness * 0.7})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
  }

  /**
   * Draw the formation collapse flash.
   */
  drawFormationFlash(ctx, cx, cy, lambda, time) {
    const intensity = 1 - lambda / 0.3;

    // Collapse flash - bright white center
    const size = this.bhRadius * (1 - lambda) * 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
    gradient.addColorStop(0.3, `rgba(255, 220, 180, ${0.6 * intensity})`);
    gradient.addColorStop(0.6, `rgba(255, 150, 100, ${0.3 * intensity})`);
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();

    // Infalling streaks
    if (lambda > 0.1) {
      const streakAlpha = intensity * 0.6;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + time * 0.5;
        const startR = this.bhRadius * 2;
        const endR = this.bhRadius * lambda * 0.5;

        const streakGradient = ctx.createLinearGradient(
          cx + Math.cos(angle) * startR,
          cy + Math.sin(angle) * startR,
          cx + Math.cos(angle) * endR,
          cy + Math.sin(angle) * endR,
        );
        streakGradient.addColorStop(0, "transparent");
        streakGradient.addColorStop(
          0.5,
          `rgba(255, 200, 150, ${streakAlpha * 0.5})`,
        );
        streakGradient.addColorStop(1, `rgba(255, 255, 200, ${streakAlpha})`);

        ctx.strokeStyle = streakGradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(
          cx + Math.cos(angle) * startR,
          cy + Math.sin(angle) * startR,
        );
        ctx.lineTo(cx + Math.cos(angle) * endR, cy + Math.sin(angle) * endR);
        ctx.stroke();
      }
    }
  }
}

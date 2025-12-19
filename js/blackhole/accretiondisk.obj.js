/**
 * AccretionDisk - Manages disk particles and formation animation
 *
 * Handles particle creation, formation state transitions,
 * camera-space projection with gravitational lensing, and Doppler effects.
 */
import { GameObject, Easing } from "/gcanvas.es.min.js";
import { Particle } from "./particle.js";

// Formation source configuration
const INFALL_SOURCE_ANGLE = Math.PI * 1.25; // Top-right corner
const INFALL_STREAM_WIDTH = 0.12;
const INFALL_SPIRAL_TURNS = 1.5;

export class AccretionDisk extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {Camera3D} options.camera - Camera for projection
   * @param {StateMachine} options.formationFSM - Formation state machine
   * @param {number} options.baseScale - Base scale for sizing
   * @param {number} options.bhRadius - Black hole radius
   * @param {number} options.diskInner - Inner disk radius
   * @param {number} options.diskOuter - Outer disk radius
   * @param {number} [options.particleCount=2500] - Number of particles
   * @param {number} [options.diskTilt=0] - Disk tilt in radians
   * @param {Object} [options.colors] - Color configuration
   */
  constructor(game, options = {}) {
    super(game, options);

    this.camera = options.camera;
    this.formationFSM = options.formationFSM;

    // Sizing (updated from main demo on resize)
    this.baseScale = options.baseScale ?? 500;
    this.bhRadius = options.bhRadius ?? 40;
    this.diskInner = options.diskInner ?? 60;
    this.diskOuter = options.diskOuter ?? 175;
    this.diskTilt = options.diskTilt ?? 0;

    // Particle configuration
    this.particleCount = options.particleCount ?? 2500;
    this.particles = [];

    // Colors for temperature gradient
    this.colors = options.colors ?? {
      inner: [255, 250, 220], // White-hot
      mid: [255, 160, 50], // Orange
      outer: [180, 40, 40], // Deep red
    };

    // Consumption tracking
    this.particlesConsumed = 0;
    this.totalParticleMass = this.particleCount;
  }

  /**
   * Update sizing when window resizes.
   */
  updateSizing(baseScale, bhRadius, diskInner, diskOuter) {
    this.baseScale = baseScale;
    this.bhRadius = bhRadius;
    this.diskInner = diskInner;
    this.diskOuter = diskOuter;
  }

  /**
   * Get temperature-based color for a particle at radius r.
   */
  getHeatColor(r) {
    const t = (r - this.diskInner) / (this.diskOuter - this.diskInner);
    const c1 = t < 0.3 ? this.colors.inner : this.colors.mid;
    const c2 = t < 0.3 ? this.colors.mid : this.colors.outer;
    const mix = t < 0.3 ? t / 0.3 : (t - 0.3) / 0.7;

    return {
      r: c1[0] + (c2[0] - c1[0]) * mix,
      g: c1[1] + (c2[1] - c1[1]) * mix,
      b: c1[2] + (c2[2] - c1[2]) * mix,
      a: 1 - t,
    };
  }

  /**
   * Initialize particles at their final disk positions.
   * Used for initial load and resize.
   */
  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const t = Math.random();
      // Bias toward inner (hotter) region
      const r = this.diskInner + t * t * (this.diskOuter - this.diskInner);

      const speed = (1 / Math.sqrt(r)) * 600; // Keplerian
      const yOffset = (Math.random() - 0.5) * this.baseScale * 0.006;
      const baseColor = this.getHeatColor(r);

      this.particles.push(
        Particle.createForDisk(angle, r, yOffset, speed, baseColor),
      );
    }
  }

  /**
   * Reset particles for infall animation.
   * Sets up continuous stream from top-right corner.
   */
  initParticlesForInfall() {
    this.particlesConsumed = 0;
    this.totalParticleMass = this.particles.length;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Stream offset - like beads on a string
      p.streamOffset = i / this.particles.length;

      // Start position: far off-screen
      const angleOffset = (Math.random() - 0.5) * INFALL_STREAM_WIDTH;
      p.startAngle = INFALL_SOURCE_ANGLE + angleOffset;
      p.startDistance =
        this.baseScale * 0.9 + Math.random() * this.baseScale * 0.3;
      p.startYOffset = (Math.random() - 0.5) * this.baseScale * 0.08;

      // ~40% fall into black hole, ~60% form the disk
      p.willFallIn = Math.random() < 0.4;
      p.consumed = false;

      if (p.willFallIn) {
        p.targetDistance = 0;
        p.spiralTurns = INFALL_SPIRAL_TURNS * (1.5 + Math.random() * 0.5);
      } else {
        p.targetAngle = Math.random() * Math.PI * 2;
        const t = Math.random();
        p.targetDistance =
          this.diskInner + t * t * (this.diskOuter - this.diskInner);
        p.spiralTurns =
          INFALL_SPIRAL_TURNS +
          (p.targetAngle - INFALL_SOURCE_ANGLE) / (Math.PI * 2);
      }

      p.targetYOffset = (Math.random() - 0.5) * this.baseScale * 0.006;

      // Initialize to start position
      p.angle = p.startAngle;
      p.distance = p.startDistance;
      p.yOffset = p.startYOffset;

      // Color based on final position
      p.baseColor = p.willFallIn
        ? { r: 255, g: 200, b: 150, a: 1 }
        : this.getHeatColor(p.targetDistance);
    }
  }

  /**
   * Normalize angle to [-PI, PI] range.
   */
  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  update(dt) {
    super.update(dt);
    this.updateParticleFormation(dt);
  }

  /**
   * Update particle positions based on formation state.
   */
  updateParticleFormation(dt) {
    const state = this.formationFSM.state;
    const progress = this.formationFSM.progress;

    for (const p of this.particles) {
      if (p.consumed) continue;

      if (state === "infall") {
        this.updateInfall(p, progress);
      } else if (state === "collapse") {
        this.updateCollapse(p, progress, dt);
      } else if (state === "circularize") {
        this.updateCircularize(p, progress, dt);
      } else if (state === "stable") {
        this.updateStable(p, dt);
      }
    }
  }

  updateInfall(p, progress) {
    const particleProgress = progress + p.streamOffset * 0.5;
    const t = Math.min(1, Easing.easeInQuad(Math.max(0, particleProgress)));

    // Spiral inward
    const spiralAngle = p.startAngle + p.spiralTurns * Math.PI * 2 * t;
    p.angle = spiralAngle;

    const targetDist = p.willFallIn ? 0 : this.bhRadius * 2;
    p.distance = Easing.lerp(p.startDistance, targetDist, t);
    p.yOffset = Easing.lerp(p.startYOffset, 0, t);

    // Check if consumed
    if (p.willFallIn && p.distance < this.bhRadius * 0.5) {
      p.consumed = true;
      this.particlesConsumed++;
    }
  }

  updateCollapse(p, progress, dt) {
    // Delay particle spreading so black hole grows first
    // Particles wait until 20% into collapse before spreading
    const delayedProgress = Math.max(0, (progress - 0.2) / 0.8);
    const t = Easing.easeOutQuad(delayedProgress);

    if (p.willFallIn) {
      // Falling particles spiral in immediately
      const fallT = Easing.easeInQuad(progress);
      p.distance = Easing.lerp(p.distance, 0, fallT * 0.7);
      p.angle += p.spiralTurns * 0.1 * (1 - progress);

      if (p.distance < this.bhRadius * 0.5) {
        p.consumed = true;
        this.particlesConsumed++;
      }
    } else if (delayedProgress > 0) {
      // Disk particles spread slowly - reduced factors for gradual expansion
      p.distance = Easing.lerp(p.distance, p.targetDistance, t * 0.3);
      p.angle = Easing.lerp(p.angle, p.targetAngle, t * 0.2);
      p.yOffset = Easing.lerp(p.yOffset, p.targetYOffset, t * 0.2);
    }
  }

  updateCircularize(p, progress, dt) {
    const t = Easing.easeOutCubic(progress) * p.circularizeSpeed;
    const clampedT = Math.min(1, t);

    p.distance = Easing.lerp(p.distance, p.targetDistance, clampedT * 0.15);
    p.yOffset = Easing.lerp(p.yOffset, p.targetYOffset, clampedT * 0.2);

    // Start orbital motion
    const orbitSpeed = p.speed * dt * 0.01 * clampedT;
    p.angle += orbitSpeed;

    // Drift toward target angle
    const angleDiff = this.normalizeAngle(p.targetAngle - p.angle);
    p.angle += angleDiff * 0.03 * clampedT;
  }

  updateStable(p, dt) {
    // Occasionally a particle loses angular momentum and falls in
    if (
      !p.isFalling &&
      p.distance < this.diskInner * 1.5 &&
      Math.random() < 0.0001
    ) {
      p.isFalling = true;
    }

    if (p.isFalling) {
      p.distance *= 0.985;
      p.angle += p.speed * dt * 0.03;
      p.yOffset *= 0.95;

      if (p.distance < this.bhRadius * 0.5) {
        p.consumed = true;
        this.particlesConsumed++;
      }
    } else {
      // Normal Keplerian orbits
      p.angle += p.speed * dt * 0.01;
      p.distance = Easing.lerp(p.distance, p.targetDistance, 0.02);
      p.yOffset = Easing.lerp(p.yOffset, p.targetYOffset, 0.02);
    }
  }

  /**
   * Build render list with projected particles.
   * Returns array of render items for depth sorting.
   */
  buildRenderList() {
    const state = this.formationFSM.state;
    const renderList = [];

    const diskAlpha =
      state === "infall" || state === "collapse"
        ? 0.9
        : state === "stable"
          ? 1
          : Math.max(0.5, this.formationFSM.progress);

    // Calculate lensing strength based on formation state
    let lensingStrength = 0;
    if (state === "stable") {
      lensingStrength = 1;
    } else if (state === "circularize") {
      lensingStrength =
        0.4 + Easing.easeOutCubic(this.formationFSM.progress) * 0.6;
    } else if (state === "collapse") {
      lensingStrength = Easing.easeInQuad(this.formationFSM.progress) * 0.4;
    }

    const cosTilt = Math.cos(this.diskTilt);
    const sinTilt = Math.sin(this.diskTilt);

    for (const p of this.particles) {
      if (p.consumed) continue;

      // World coordinates (flat disk)
      let x = Math.cos(p.angle) * p.distance;
      let z = Math.sin(p.angle) * p.distance;
      let y = p.yOffset;

      // Apply disk tilt
      const yTilted = y * cosTilt - z * sinTilt;
      const zTilted = y * sinTilt + z * cosTilt;
      y = yTilted;
      z = zTilted;

      // Transform to camera space
      const cosY = Math.cos(this.camera.rotationY);
      const sinY = Math.sin(this.camera.rotationY);
      let xCam = x * cosY - z * sinY;
      let zCam = x * sinY + z * cosY;

      const cosX = Math.cos(this.camera.rotationX);
      const sinX = Math.sin(this.camera.rotationX);
      let yCam = y * cosX - zCam * sinX;
      zCam = y * sinX + zCam * cosX;

      // Apply gravitational lensing
      if (lensingStrength > 0 && zCam > 0) {
        const currentR = Math.sqrt(xCam * xCam + yCam * yCam);
        const ringRadius = this.bhRadius * 1.3;
        const lensFactor = Math.exp(-currentR / (this.bhRadius * 1.5));
        const warp = lensFactor * 1.2 * lensingStrength;

        if (currentR > 0) {
          const ratio = (currentR + ringRadius * warp) / currentR;
          xCam *= ratio;
          yCam *= ratio;
        } else {
          yCam = ringRadius * lensingStrength;
        }
      }

      // Perspective projection
      const perspectiveScale =
        this.camera.perspective / (this.camera.perspective + zCam);
      const screenX = xCam * perspectiveScale;
      const screenY = yCam * perspectiveScale;

      if (zCam < -this.camera.perspective + 10) continue;

      // Doppler effect
      const velocityDir = Math.cos(p.angle + this.camera.rotationY);
      const doppler = 1 + velocityDir * 0.4;

      renderList.push({
        type: "particle",
        z: zCam,
        x: screenX,
        y: screenY,
        scale: perspectiveScale,
        color: p.baseColor,
        doppler: doppler,
        diskAlpha: diskAlpha,
      });
    }

    return renderList;
  }
}

/**
 * Star - Deformable stellar object for TDE demo
 *
 * A star on an elliptical orbit that gets tidally disrupted.
 * Uses proper orbital mechanics with cyclone-like particle ejection.
 */
import {
  GameObject,
  ParticleSystem,
  Easing,
  Painter,
} from "../../../src/index.js";
import { polarToCartesian } from "../../../src/math/gr.js";

const CONFIG = {
  // Star colors (yellow-white to orange core)
  colorOuter: { r: 255, g: 245, b: 220 },
  colorCore: { r: 255, g: 200, b: 100 },

  // Particle sizes - visible but not too big
  sizeMin: 1,
  sizeMax: 3,
  coronaExtent: 1.5, // Particles extend to 1.5x the star radius (corona)

  // Orbital physics - star starts FAR and falls IN
  initialOrbitAngle: Math.PI * 0.8, // Start position
  orbitSpeed: 0.4, // Slower orbit for more drama
  periapsisRatio: 0.08, // Close approach (grazes BH)
  apoapsisRatio: 0.6, // Start FARTHER out for more dramatic approach

  // Tidal effects - DRAMATIC spaghettification like the reference image
  stretchMaxFactor: 8.0, // More extreme stretching
  tidalRadiusRatio: 0.12, // Where tidal forces rip the star
  tearDropFactor: 2.5, // How much particles toward BH stretch more

  // Star body glow (smaller than corona)
  glowRadius: 1.4,
  bodyRadius: 0.6, // Core body is smaller than particle cloud

  // Depth perception - star SHRINKS as it falls toward BH
  perspectiveMultiplier: 1.0, // Base scale (no extra multiplier)
  // DRAMATIC size change as star approaches
  distanceScaleMax: 2.5, // BIG when far from BH (at start)
  distanceScaleMin: 0.3, // SMALL when close to BH (falling in)

  // Particle streaming toward BH
  streamSpeed: 80, // How fast particles stream toward BH
  streamSpread: 0.3, // Angular spread when streaming

  // STAR PARTICLE DRIFT - particles drift toward BH while still attached
  // MUCH STRONGER for visible streaming effect from the start
  driftStartProgress: 0.0, // Drift starts immediately
  driftStrength: 300, // Stronger drift for visible streaming
  driftAcceleration: 3.0, // Faster acceleration toward BH
};

/**
 * Simple particle data class for star particles.
 */
class StarParticle {
  constructor(options = {}) {
    // Offset from star center (local space)
    this.offsetX = options.offsetX ?? 0;
    this.offsetY = options.offsetY ?? 0;
    this.offsetZ = options.offsetZ ?? 0;

    // Original offset (for deformation)
    this.baseOffsetX = this.offsetX;
    this.baseOffsetY = this.offsetY;
    this.baseOffsetZ = this.offsetZ;

    // Distance from center (for release ordering)
    this.baseDist = Math.sqrt(
      this.baseOffsetX ** 2 + this.baseOffsetY ** 2 + this.baseOffsetZ ** 2,
    );

    // Appearance
    this.size = options.size ?? 3;
    this.color = options.color ?? { r: 255, g: 240, b: 200, a: 1 };

    // State
    this.released = false;
    this.releasedAt = 0;

    // Spiral parameters (set on release)
    this.spiralPhase = Math.random() * Math.PI * 2;
    this.spiralSpeed = 0.5 + Math.random() * 1.5;

    // DRIFT toward black hole (while still attached to star)
    this.driftX = 0;
    this.driftY = 0;
    this.driftZ = 0;
    this.driftVelX = 0;
    this.driftVelY = 0;
    this.driftVelZ = 0;
  }
}

export class Star extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {Camera3D} options.camera - Camera for projection
   * @param {number} options.radius - Star radius
   * @param {number} options.particleCount - Number of particles
   * @param {number} options.baseScale - Base scale for sizing
   * @param {number} options.startDistance - Initial distance from black hole
   */
  constructor(game, options = {}) {
    super(game, options);

    this.camera = options.camera;
    this.radius = options.radius ?? 50;
    this.particleCount = options.particleCount ?? 600;
    this.baseScale = options.baseScale ?? 500;
    this.startDistance = options.startDistance ?? 200;

    // Orbital state
    this.orbitAngle = CONFIG.initialOrbitAngle;
    this.orbitRadius = this.startDistance;
    this.periapsis = this.baseScale * CONFIG.periapsisRatio;
    this.apoapsis = this.baseScale * CONFIG.apoapsisRatio;

    // Star position (world space)
    this.centerX = 0;
    this.centerY = 0;
    this.centerZ = 0;

    // Star state
    this.stretchFactor = 1.0;
    this.intactRatio = 1.0;
    this.phase = "approach";

    // Cached render state (computed in update, used in draw)
    this.screenX = 0;
    this.screenY = 0;
    this.effectiveRadius = 0;
    this.cameraZ = 0;
    this.perspectiveScale = 1.0; // Camera perspective scale
    this.distanceScale = CONFIG.distanceScaleMax; // Start at max (far from BH)

    // Particles
    this.particles = [];

    // Particle system for rendering
    this.particleSystem = null;
  }

  /**
   * Initialize the star.
   */
  init() {
    this.createParticleSystem();
    this.initParticles();
    this.resetPosition();
  }

  /**
   * Create the particle system for rendering.
   */
  createParticleSystem() {
    this.particleSystem = new ParticleSystem(this.game, {
      maxParticles: this.particleCount,
      camera: this.camera,
      depthSort: true,
      blendMode: "lighter",
      updaters: [],
    });
  }

  /**
   * Create spherical distribution of particles.
   * Particles extend beyond the star body to form a corona.
   */
  initParticles() {
    this.particles = [];

    // Corona radius - particles extend beyond the solid body
    const coronaRadius = this.radius * CONFIG.coronaExtent;

    for (let i = 0; i < this.particleCount; i++) {
      // Spherical distribution
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      // Distribution biased toward outer edge for corona effect
      // More particles in the corona, fewer in the core
      const r = coronaRadius * Math.pow(Math.random(), 0.8);

      const offsetX = r * Math.sin(phi) * Math.cos(theta);
      const offsetY = r * Math.sin(phi) * Math.sin(theta);
      const offsetZ = r * Math.cos(phi);

      // Color based on distance from center (hotter core)
      const distRatio = r / coronaRadius;
      const color = this.lerpColor(
        CONFIG.colorCore,
        CONFIG.colorOuter,
        distRatio,
      );

      // Size - larger particles in the corona, smaller in core
      // This makes the outer glow more prominent
      const size =
        CONFIG.sizeMin + (CONFIG.sizeMax - CONFIG.sizeMin) * distRatio;

      // Alpha - brighter core, fainter corona
      const alpha = 1.0 - distRatio * 0.5;

      this.particles.push(
        new StarParticle({
          offsetX,
          offsetY,
          offsetZ,
          size,
          color: { ...color, a: alpha },
        }),
      );
    }
  }

  lerpColor(c1, c2, t) {
    return {
      r: c1.r + (c2.r - c1.r) * t,
      g: c1.g + (c2.g - c1.g) * t,
      b: c1.b + (c2.b - c1.b) * t,
    };
  }

  resetPosition() {
    this.orbitAngle = CONFIG.initialOrbitAngle;
    this.orbitRadius = this.startDistance;
    const pos = polarToCartesian(this.orbitRadius, this.orbitAngle);
    this.centerX = pos.x;
    this.centerY = 0;
    this.centerZ = pos.z;
  }

  reset() {
    this.stretchFactor = 1.0;
    this.intactRatio = 1.0;
    this.orbitAngle = CONFIG.initialOrbitAngle;
    this.initParticles();
    this.resetPosition();
    this.visible = true;
    // Reset all particle drift
    for (const p of this.particles) {
      p.driftX = 0;
      p.driftY = 0;
      p.driftZ = 0;
      p.driftVelX = 0;
      p.driftVelY = 0;
      p.driftVelZ = 0;
    }
  }

  updateSizing(radius, baseScale) {
    this.radius = radius;
    this.baseScale = baseScale;
    this.startDistance = baseScale * CONFIG.apoapsisRatio;
    this.periapsis = baseScale * CONFIG.periapsisRatio;
    this.apoapsis = baseScale * CONFIG.apoapsisRatio;
  }

  startApproach() {
    this.phase = "approach";
    this.resetPosition();
  }

  startStretch() {
    this.phase = "stretch";
  }

  startDisrupt() {
    this.phase = "disrupt";
  }

  /**
   * Apply tidal stretching during approach phase.
   * This creates the initial teardrop deformation before full stretch phase.
   */
  applyTidalStretch(intensity) {
    if (intensity <= 0) return;

    // Direction toward black hole
    const dist = Math.sqrt(this.centerX ** 2 + this.centerZ ** 2) || 1;
    const dirX = -this.centerX / dist;
    const dirZ = -this.centerZ / dist;

    // Mild stretching during approach
    const stretchAmount = 1 + intensity * (CONFIG.stretchMaxFactor - 1) * 0.3;

    for (const p of this.particles) {
      if (p.released) continue;

      const dot = p.baseOffsetX * dirX + p.baseOffsetZ * dirZ;
      const normalizedDot = dot / (this.radius * CONFIG.coronaExtent);

      // Teardrop effect - particles toward BH stretch more
      const tearDropMult =
        1 + Math.max(0, normalizedDot) * CONFIG.tearDropFactor * intensity;
      const actualStretch = stretchAmount * tearDropMult;
      const compressAmount = 1 / Math.sqrt(actualStretch);

      p.offsetX =
        p.baseOffsetX * compressAmount + dirX * dot * (actualStretch - 1);
      p.offsetZ =
        p.baseOffsetZ * compressAmount + dirZ * dot * (actualStretch - 1);
      p.offsetY = p.baseOffsetY * compressAmount;
    }

    this.stretchFactor = stretchAmount;
  }

  /**
   * Apply particle drift toward black hole.
   * Particles on the BH-facing side start drifting toward the BH
   * while still attached to the star - creates streaming effect.
   */
  applyParticleDrift(dt, intensity) {
    if (intensity <= 0) return;

    // Direction toward black hole (world space, from star center)
    const starDist = Math.sqrt(this.centerX ** 2 + this.centerZ ** 2) || 1;
    const toBHx = -this.centerX / starDist;
    const toBHz = -this.centerZ / starDist;

    for (const p of this.particles) {
      if (p.released) continue;

      // How much this particle faces the BH (positive = toward BH)
      const offsetDist = Math.sqrt(p.offsetX ** 2 + p.offsetZ ** 2) || 1;
      const facingBH = (p.offsetX * toBHx + p.offsetZ * toBHz) / offsetDist;

      // Only particles facing the BH drift toward it
      if (facingBH > 0) {
        // Drift strength increases for particles more toward BH
        const driftMult = facingBH * CONFIG.driftAcceleration * intensity;

        // Accelerate toward BH
        p.driftVelX += toBHx * CONFIG.driftStrength * driftMult * dt;
        p.driftVelZ += toBHz * CONFIG.driftStrength * driftMult * dt;
        p.driftVelY *= 0.95; // Dampen vertical drift

        // Apply velocity to drift position
        p.driftX += p.driftVelX * dt;
        p.driftY += p.driftVelY * dt;
        p.driftZ += p.driftVelZ * dt;

        // Damping to prevent runaway
        p.driftVelX *= 0.98;
        p.driftVelZ *= 0.98;
      }
    }
  }

  /**
   * Compute orbital radius for elliptical orbit.
   * r = a(1-e²) / (1 + e*cos(θ))
   */
  getOrbitalRadius(angle, progress) {
    const a = (this.periapsis + this.apoapsis) / 2;
    const e =
      (this.apoapsis - this.periapsis) / (this.apoapsis + this.periapsis);
    return (a * (1 - e * e)) / (1 + e * Math.cos(angle));
  }

  /**
   * Update during approach phase - star spirals in on elliptical orbit.
   */
  updateApproach(dt, progress) {
    // Advance orbital angle (faster as it approaches periapsis - Kepler's 2nd law)
    const speedFactor = 1 + progress * 2;
    this.orbitAngle += dt * CONFIG.orbitSpeed * speedFactor;

    // Interpolate toward periapsis
    const t = Easing.easeInQuad(progress);
    this.orbitRadius = Easing.lerp(this.startDistance, this.periapsis * 1.5, t);

    // Update position
    const pos = polarToCartesian(this.orbitRadius, this.orbitAngle);
    this.centerX = pos.x;
    this.centerZ = pos.z;

    // Slight vertical oscillation
    this.centerY = Math.sin(this.orbitAngle * 2) * this.baseScale * 0.02;
  }

  /**
   * Update during stretch phase - orbiting at periapsis, tidal stretching.
   * Creates TEARDROP spaghettification like the reference image.
   */
  updateStretch(dt, progress, bhPosition) {
    // Continue orbiting faster at periapsis
    const speedFactor = 2 + progress;
    this.orbitAngle += dt * CONFIG.orbitSpeed * speedFactor;

    // Stay near periapsis
    const t = Easing.easeInOutQuad(progress);
    this.orbitRadius = Easing.lerp(this.periapsis * 1.5, this.periapsis, t);

    const pos = polarToCartesian(this.orbitRadius, this.orbitAngle);
    this.centerX = pos.x;
    this.centerZ = pos.z;
    this.centerY = Math.sin(this.orbitAngle * 2) * this.baseScale * 0.015;

    // Apply tidal stretching - increases dramatically with progress
    this.stretchFactor =
      1 + (CONFIG.stretchMaxFactor - 1) * Easing.easeInQuad(progress);

    // Direction toward black hole
    const dist = Math.sqrt(this.centerX ** 2 + this.centerZ ** 2) || 1;
    const dirX = -this.centerX / dist;
    const dirZ = -this.centerZ / dist;

    // TEARDROP deformation - particles facing BH stretch MORE
    for (const p of this.particles) {
      if (p.released) continue;

      // How much this particle faces the BH (-1 to 1)
      const dot = p.baseOffsetX * dirX + p.baseOffsetZ * dirZ;
      const normalizedDot = dot / (this.radius * CONFIG.coronaExtent);

      // Particles toward BH (dot > 0) stretch MORE than those away
      // This creates the teardrop/spaghetti shape
      const tearDropMult =
        1 + Math.max(0, normalizedDot) * CONFIG.tearDropFactor * progress;
      const stretchAmount = this.stretchFactor * tearDropMult;
      const compressAmount = 1 / Math.sqrt(stretchAmount);

      // Apply asymmetric stretching
      p.offsetX =
        p.baseOffsetX * compressAmount + dirX * dot * (stretchAmount - 1);
      p.offsetZ =
        p.baseOffsetZ * compressAmount + dirZ * dot * (stretchAmount - 1);
      p.offsetY = p.baseOffsetY * compressAmount;
    }
  }

  /**
   * Update during disrupt phase - extreme stretching, particles spiral off.
   * Creates extreme spaghettification as star is torn apart.
   */
  updateDisrupt(dt, progress) {
    // Continue orbiting past periapsis
    const speedFactor = 3 - progress * 1.5;
    this.orbitAngle += dt * CONFIG.orbitSpeed * speedFactor;

    // Move outward slightly as star is disrupted
    const t = Easing.easeOutQuad(progress);
    this.orbitRadius = Easing.lerp(this.periapsis, this.periapsis * 1.5, t);

    const pos = polarToCartesian(this.orbitRadius, this.orbitAngle);
    this.centerX = pos.x;
    this.centerZ = pos.z;

    // EXTREME stretching during disruption
    this.stretchFactor = CONFIG.stretchMaxFactor * (1 + progress * 3);

    const dist = Math.sqrt(this.centerX ** 2 + this.centerZ ** 2) || 1;
    const dirX = -this.centerX / dist;
    const dirZ = -this.centerZ / dist;

    // TEARDROP deformation continues with even more extreme stretching
    for (const p of this.particles) {
      if (p.released) continue;

      const dot = p.baseOffsetX * dirX + p.baseOffsetZ * dirZ;
      const normalizedDot = dot / (this.radius * CONFIG.coronaExtent);

      // Even more extreme teardrop during disruption
      const tearDropMult =
        1 + Math.max(0, normalizedDot) * CONFIG.tearDropFactor * 2;
      const stretchAmount = this.stretchFactor * tearDropMult;
      const compressAmount = 1 / Math.sqrt(stretchAmount);

      p.offsetX =
        p.baseOffsetX * compressAmount + dirX * dot * (stretchAmount - 1);
      p.offsetZ =
        p.baseOffsetZ * compressAmount + dirZ * dot * (stretchAmount - 1);
      p.offsetY = p.baseOffsetY * compressAmount;
    }
  }

  /**
   * Release particles that stream toward the black hole.
   * ONLY particles on BH-facing side release, and they ALWAYS flow toward BH.
   */
  releaseParticles(progress) {
    const released = [];

    // Direction toward black hole from star center
    const starDist = Math.sqrt(this.centerX ** 2 + this.centerZ ** 2) || 1;
    const toBHx = -this.centerX / starDist;
    const toBHz = -this.centerZ / starDist;

    // Release rate increases with progress
    const releaseRate = 0.003 + progress * progress * 0.02;
    // Allow up to 60% to be released organically
    const maxReleased = 0.6;
    if (this.intactRatio < 1 - maxReleased) return released;

    for (const p of this.particles) {
      if (p.released) continue;

      // How much this particle faces the BH (1 = directly toward BH, -1 = away)
      const offsetDist = Math.sqrt(p.offsetX ** 2 + p.offsetZ ** 2) || 1;
      const facingBH = (p.offsetX * toBHx + p.offsetZ * toBHz) / offsetDist;

      // ONLY release particles on BH-facing side (facingBH > 0)
      // Particles on the far side of star should NOT release
      if (facingBH < 0.1) continue;

      // Outer corona releases easier
      const stretchedDist = Math.sqrt(
        p.offsetX ** 2 + p.offsetY ** 2 + p.offsetZ ** 2,
      );
      const releaseScore = facingBH * 0.6 + (stretchedDist / this.radius) * 0.4;

      // Threshold decreases with progress
      const threshold = 0.6 - progress * 0.5;

      if (releaseScore > threshold && Math.random() < releaseRate) {
        p.released = true;
        p.releasedAt = progress;

        // World position of released particle
        const worldX = this.centerX + p.offsetX + p.driftX;
        const worldY = this.centerY + p.offsetY + p.driftY;
        const worldZ = this.centerZ + p.offsetZ + p.driftZ;

        // Velocity ALWAYS toward BH center (0,0,0)
        // Calculate direction from particle position to BH
        const particleDist = Math.sqrt(worldX ** 2 + worldZ ** 2) || 1;
        const toOriginX = -worldX / particleDist;
        const toOriginZ = -worldZ / particleDist;

        // Strong velocity toward BH center
        const speed = CONFIG.streamSpeed * (0.8 + Math.random() * 0.4);

        released.push({
          x: worldX,
          y: worldY,
          z: worldZ,
          // Velocity TOWARD BH center (origin)
          vx: toOriginX * speed,
          vy: -Math.abs(worldY) * 0.2,
          vz: toOriginZ * speed,
          size: p.size,
          color: { ...p.color },
        });
      }
    }

    this.intactRatio =
      this.particles.filter((p) => !p.released).length / this.particles.length;
    return released;
  }

  /**
   * Release all remaining particles streaming toward BH.
   */
  releaseAllParticles() {
    const released = [];

    const starDist = Math.sqrt(this.centerX ** 2 + this.centerZ ** 2) || 1;
    const tangentX = this.centerZ / starDist;
    const tangentZ = -this.centerX / starDist;

    for (const p of this.particles) {
      if (p.released) continue;

      p.released = true;

      const worldX = this.centerX + p.offsetX;
      const worldY = this.centerY + p.offsetY;
      const worldZ = this.centerZ + p.offsetZ;

      // Stream toward BH center
      const toCenter = Math.sqrt(worldX ** 2 + worldZ ** 2) || 1;
      const toCenterX = -worldX / toCenter;
      const toCenterZ = -worldZ / toCenter;

      const speed = CONFIG.streamSpeed * (0.4 + Math.random() * 0.6);
      const spread = (Math.random() - 0.5) * CONFIG.streamSpread * 2;

      released.push({
        x: worldX,
        y: worldY,
        z: worldZ,
        vx:
          toCenterX * speed * 0.6 +
          tangentX * speed * 0.4 +
          spread * tangentX * speed,
        vy: -Math.abs(p.offsetY) * 0.3,
        vz:
          toCenterZ * speed * 0.6 +
          tangentZ * speed * 0.4 +
          spread * tangentZ * speed,
        size: p.size,
        color: { ...p.color },
      });
    }

    this.intactRatio = 0;
    this.visible = false;
    return released;
  }

  /**
   * Update - compute render state for use in draw().
   */
  update(dt) {
    super.update(dt);

    // Compute screen position and effective radius for rendering
    if (this.camera && this.visible && this.intactRatio > 0.01) {
      const projected = this.camera.project(
        this.centerX,
        this.centerY,
        this.centerZ,
      );
      this.screenX = this.game.width / 2 + projected.x;
      this.screenY = this.game.height / 2 + projected.y;

      // Calculate camera-space z for z-ordering
      this.cameraZ = this.getCameraZ();

      // DISTANCE-BASED SCALING: Star SHRINKS as it approaches black hole
      // This creates the effect of falling "into" the scene toward the BH
      const distToBH = Math.sqrt(
        this.centerX ** 2 + this.centerY ** 2 + this.centerZ ** 2,
      );

      // Normalize: 0 at periapsis (close), 1 at apoapsis (far)
      const normalizedDist = Math.max(
        0,
        Math.min(
          1,
          (distToBH - this.periapsis) / (this.apoapsis - this.periapsis),
        ),
      );

      // Scale: big when far (1.8x), small when close (0.4x)
      this.distanceScale =
        CONFIG.distanceScaleMin +
        (CONFIG.distanceScaleMax - CONFIG.distanceScaleMin) * normalizedDist;

      // Combined scale: distance + camera perspective + consumption
      this.perspectiveScale = projected.scale;
      const shrinkFactor = Math.pow(this.intactRatio, 0.7);

      this.effectiveRadius =
        this.radius *
        shrinkFactor *
        this.distanceScale *
        CONFIG.perspectiveMultiplier;
    }
  }

  /**
   * Get the star's z-position in camera space.
   * Used for z-ordering relative to black hole.
   */
  getCameraZ() {
    if (!this.camera) return 0;

    // Transform star center to camera space
    const cosY = Math.cos(this.camera.rotationY);
    const sinY = Math.sin(this.camera.rotationY);
    let zCam = this.centerX * sinY + this.centerZ * cosY;

    const cosX = Math.cos(this.camera.rotationX);
    const sinX = Math.sin(this.camera.rotationX);
    zCam = this.centerY * sinX + zCam * cosX;

    return zCam;
  }

  /**
   * Draw the star body and particle texture.
   * Uses CAMERA PERSPECTIVE for correct size scaling.
   * ALPHA IS CONSTANT - no transparency during approach/disruption.
   */
  render() {
    super.render();
    if (!this.visible) return;
    if (this.intactRatio <= 0.01) return;

    // SIZE shrinks when disrupted, but ALPHA stays constant (no transparency)
    const sizeFactor =
      this.intactRatio > 0.6 ? 1.0 : Math.pow(this.intactRatio / 0.6, 0.5);

    const cx = this.game.width / 2;
    const cy = this.game.height / 2;

    // Use DISTANCE-BASED scaling (computed in update)
    // Star shrinks as it approaches BH
    const distScale = this.distanceScale || 1.0;

    // Base size scaled by DISTANCE TO BLACK HOLE
    // Far = big (1.8x), Close = small (0.4x)
    const baseVisualSize =
      this.radius * distScale * CONFIG.perspectiveMultiplier;

    Painter.useCtx((ctx) => {
      // Draw each star particle with distance-based scaling
      for (const p of this.particles) {
        if (p.released) continue;

        // World position INCLUDING DRIFT toward black hole
        const wx = this.centerX + p.offsetX + p.driftX;
        const wy = this.centerY + p.offsetY + p.driftY;
        const wz = this.centerZ + p.offsetZ + p.driftZ;

        // Project through camera
        const projected = this.camera.project(wx, wy, wz);
        const screenX = cx + projected.x;
        const screenY = cy + projected.y;

        // Skip if behind camera
        if (projected.scale <= 0) continue;

        // Size uses DISTANCE SCALE - shrinks as star approaches BH
        const size =
          p.size * distScale * sizeFactor * CONFIG.perspectiveMultiplier;

        // Draw particle - ALPHA IS CONSTANT (no transparency!)
        const alpha = p.color.a;
        ctx.fillStyle = `rgba(${Math.round(p.color.r)}, ${Math.round(p.color.g)}, ${Math.round(p.color.b)}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw star core with distance scale - ALPHA IS CONSTANT
      const coreRadius = baseVisualSize * CONFIG.bodyRadius * sizeFactor;
      const glowRadius = baseVisualSize * CONFIG.glowRadius * sizeFactor;

      if (coreRadius > 1) {
        // Outer glow - FULL OPACITY, scales with distance
        const outerGradient = ctx.createRadialGradient(
          this.screenX,
          this.screenY,
          coreRadius * 0.5,
          this.screenX,
          this.screenY,
          glowRadius,
        );
        outerGradient.addColorStop(0, "rgba(255, 250, 220, 0.8)");
        outerGradient.addColorStop(0.3, "rgba(255, 230, 180, 0.5)");
        outerGradient.addColorStop(0.6, "rgba(255, 180, 100, 0.2)");
        outerGradient.addColorStop(1, "rgba(255, 150, 50, 0)");

        ctx.fillStyle = outerGradient;
        ctx.shadowColor = "rgba(255, 220, 150, 0.6)";
        ctx.shadowBlur = 20 * distScale; // Glow scales with distance
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Star body core - FULL OPACITY
        ctx.shadowBlur = 0;
        const bodyGradient = ctx.createRadialGradient(
          this.screenX,
          this.screenY,
          0,
          this.screenX,
          this.screenY,
          coreRadius,
        );
        bodyGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        bodyGradient.addColorStop(0.3, "rgba(255, 255, 240, 1)");
        bodyGradient.addColorStop(0.6, "rgba(255, 240, 200, 0.95)");
        bodyGradient.addColorStop(1, "rgba(255, 220, 150, 0.9)");

        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, coreRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

/**
 * BlackHole - Event horizon and photon ring for TDE demo
 *
 * Renders the black hole using direct canvas drawing.
 * State computed in update(), rendered in draw() via Painter.useCtx().
 */
import { GameObject, Painter, Easing } from "/gcanvas.es.min.js";

const CONFIG = {
  // Photon ring
  photonRingRatio: 1.8,
  photonRingGlowBase: 50,

  // Growth - starts SMALL, grows as it feeds
  initialMass: 0.1, // Start at 40% size
  maxMass: 1.1, // Can grow up to 150% of base size
  growthRate: 0.03, // How fast it grows per unit of mass added

  // Dormant state - starts DARK, wakes up as it feeds
  dormantGlow: 0.0, // NO glow when dormant (starts black)
  dormantRingAlpha: 0.0, // NO photon ring when dormant

  // Colors
  glowColorInner: [255, 220, 150],
  glowColorMid: [255, 150, 50],
  glowColorOuter: [255, 50, 0],

  // RELATIVISTIC JETS - fountain of particles from poles
  jets: {
    enabled: true,
    maxParticles: 1000,
    spawnRate: 15, // particles per second when active
    velocity: 800, // upward speed
    spread: 40, // horizontal spread
    lifetime: 2.0, // seconds
    size: { min: 1, max: 2 },
    color: { r: 250, g: 255, b: 255 }, // Blue-white
  },
};

export class BlackHole extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {number} options.radius - Event horizon radius
   * @param {Camera3D} options.camera - Camera for projection
   */
  constructor(game, options = {}) {
    super(game, options);

    this.baseRadius = options.radius ?? 50;
    this.radius = this.baseRadius * Math.sqrt(CONFIG.initialMass); // Start smaller
    this.glowIntensity = options.glowIntensity ?? 0;
    this.accretionRate = 0;
    this.camera = options.camera;

    // Mass tracking for growth
    this.mass = CONFIG.initialMass;
    this.targetMass = CONFIG.initialMass;

    // Awakening state - BH starts dormant (black), wakes up as it feeds
    this.totalConsumed = 0;
    this.awakeningLevel = 0; // 0 = dormant (pure black), 1 = fully awake (full glow/ring)
    this.feedingPulse = 0; // Temporary glow boost when consuming particles

    // Screen position (computed in update, used in draw)
    this.screenX = game.width / 2;
    this.screenY = game.height / 2;
    this.screenScale = 1;

    // Relativistic jets - particles shooting from poles
    this.jetParticles = [];
    this.jetActive = false;
    this.jetSpawnAccum = 0;
  }

  /**
   * Initialize.
   */
  init() {
    this.jetParticles = [];
  }

  /**
   * Activate jets (during accretion phase).
   */
  setJetsActive(active) {
    this.jetActive = active;
  }

  /**
   * Update sizing when window resizes.
   */
  updateRadius(radius) {
    this.baseRadius = radius;
    this.radius = this.baseRadius * Math.sqrt(this.mass);
  }

  /**
   * Set glow intensity (0-1).
   */
  setGlowIntensity(intensity) {
    this.glowIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Set accretion rate for color/intensity effects.
   */
  setAccretionRate(rate) {
    this.accretionRate = rate;
  }

  /**
   * Add mass from accreted particles.
   * Black hole grows and "wakes up" as it feeds.
   */
  addMass(amount) {
    // Grow SLOWLY over time
    this.targetMass = Math.min(
      CONFIG.maxMass,
      this.targetMass + amount * CONFIG.growthRate * 0.5,
    );

    // Track total consumed for awakening effect
    this.totalConsumed += amount;

    // Awakening: glow and ring intensity increase as BH feeds
    // Slower awakening for more gradual effect
    const awakeningProgress = Math.min(1, this.totalConsumed * 0.15);
    this.awakeningLevel = Math.max(this.awakeningLevel, awakeningProgress);

    // FEEDING PULSE - temporary glow boost when consuming
    this.feedingPulse = Math.min(1, this.feedingPulse + amount * 0.3);
  }

  /**
   * Reset mass to initial value (dormant state).
   */
  resetMass() {
    this.mass = CONFIG.initialMass;
    this.targetMass = CONFIG.initialMass;
    this.radius = this.baseRadius * Math.sqrt(CONFIG.initialMass);
    this.jetParticles = [];
    this.jetActive = false;
    this.totalConsumed = 0;
    this.awakeningLevel = 0; // Starts fully dormant
    this.feedingPulse = 0;
  }

  /**
   * Update - compute render state and jets.
   */
  update(dt) {
    super.update(dt);

    // Smoothly grow mass toward target (SLOW growth)
    if (this.mass !== this.targetMass) {
      this.mass = Easing.lerp(this.mass, this.targetMass, 0.02);
      this.radius = this.baseRadius * Math.sqrt(this.mass);
    }

    // Decay feeding pulse over time (creates pulsing glow when feeding)
    if (this.feedingPulse > 0) {
      this.feedingPulse = Math.max(0, this.feedingPulse - dt * 2);
    }

    // Project (0,0,0) through camera to get screen position
    if (this.camera) {
      const projected = this.camera.project(0, 0, 0);
      this.screenX = this.game.width / 2 + projected.x;
      this.screenY = this.game.height / 2 + projected.y;
      this.screenScale = projected.scale;
    }

    // Update relativistic jets
    this.updateJets(dt);
  }

  /**
   * Update jet particles - spawn new ones and move existing.
   */
  updateJets(dt) {
    const cfg = CONFIG.jets;
    if (!cfg.enabled) return;

    // Spawn new jet particles when active
    if (this.jetActive && this.jetParticles.length < cfg.maxParticles) {
      this.jetSpawnAccum += dt * cfg.spawnRate;
      while (
        this.jetSpawnAccum >= 1 &&
        this.jetParticles.length < cfg.maxParticles
      ) {
        this.jetSpawnAccum -= 1;

        // Spawn from north pole (shooting upward)
        const spread = (Math.random() - 0.5) * cfg.spread;
        const spreadZ = (Math.random() - 0.5) * cfg.spread;

        this.jetParticles.push({
          x: spread,
          y: -this.radius * 0.5, // Start just above BH
          z: spreadZ,
          vx: spread * 2,
          vy: -cfg.velocity * (0.8 + Math.random() * 0.4), // Upward (negative y)
          vz: spreadZ * 2,
          age: 0,
          lifetime: cfg.lifetime * (0.8 + Math.random() * 0.4),
          size: cfg.size.min + Math.random() * (cfg.size.max - cfg.size.min),
        });
      }
    }

    // Update existing particles
    for (let i = this.jetParticles.length - 1; i >= 0; i--) {
      const p = this.jetParticles[i];
      p.age += dt;

      if (p.age >= p.lifetime) {
        this.jetParticles.splice(i, 1);
        continue;
      }

      // Move particle
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Slight deceleration
      p.vy *= 0.995;
    }
  }

  /**
   * Draw the black hole with photon ring glow and jets.
   * Uses Painter.useCtx() for direct canvas drawing.
   * BH starts dormant (pure black) and "wakes up" as it feeds.
   */
  render() {
    super.render();
    const scaledRadius = this.radius * this.screenScale;

    // Awakening-based intensity - BH starts black, glows as it feeds
    // awakeningLevel: 0 = dormant (black), 1 = fully awake
    const awakeningFactor = Easing.easeOutQuad(this.awakeningLevel);

    // FEEDING PULSE adds extra glow when actively consuming
    const pulseBoost = this.feedingPulse * 0.5;

    // Glow intensity scales with awakening + activity + feeding pulse
    const activeIntensity = this.glowIntensity * awakeningFactor + pulseBoost;
    const totalIntensity = Math.min(1, activeIntensity);

    // Ring only appears as BH awakens (also boosted by feeding)
    const ringAlpha =
      awakeningFactor * Math.max(0.3, this.glowIntensity) + pulseBoost * 0.3;

    // Screen center for projections
    const cx = this.game.width / 2;
    const cy = this.game.height / 2;

    Painter.useCtx((ctx) => {
      // Draw jet particles FIRST (behind black hole)
      if (this.jetParticles.length > 0) {
        const cfg = CONFIG.jets;
        ctx.shadowBlur = 3;
        ctx.shadowColor = `rgba(${cfg.color.r}, ${cfg.color.g}, ${cfg.color.b}, 0.5)`;

        for (const p of this.jetParticles) {
          // Project through camera - absolute screen position
          const projected = this.camera.project(p.x, p.y, p.z);
          const jetScreenX = cx + projected.x;
          const jetScreenY = cy + projected.y;

          // Skip if behind camera
          if (projected.scale <= 0) continue;

          // Fade with age
          const lifeRatio = 1 - p.age / p.lifetime;
          const alpha = lifeRatio * 0.8;

          ctx.fillStyle = `rgba(${cfg.color.r}, ${cfg.color.g}, ${cfg.color.b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(
            jetScreenX,
            jetScreenY,
            p.size * projected.scale,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      // Only draw glow effects if BH has awakened
      if (totalIntensity > 0.01) {
        // Outer glow layer - fades in as BH awakens
        ctx.shadowBlur = 25 * totalIntensity;
        ctx.shadowColor = `rgba(255, 100, 30, ${totalIntensity * 0.8})`;
        ctx.fillStyle = `rgba(255, 120, 40, ${totalIntensity * 0.15})`;
        ctx.beginPath();
        ctx.arc(this.screenX, this.screenY, scaledRadius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Photon ring - only appears as BH awakens
      if (ringAlpha > 0.01) {
        ctx.shadowBlur = 12 * ringAlpha;
        ctx.shadowColor = `rgba(255, 180, 60, ${ringAlpha * 0.9})`;
        ctx.fillStyle = `rgba(255, 180, 80, ${ringAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          this.screenX,
          this.screenY,
          scaledRadius * 1.15,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Event horizon (the void) - ALWAYS has subtle edge gradient
      ctx.shadowBlur = 0;

      // Gradient: slightly visible dark edge, pure black center
      // Edge gets slightly brighter when awakened (more visible ring edge)
      const edgeBrightness = Math.round(18 + awakeningFactor * 20); // 18-38
      const midBrightness = Math.round(10 + awakeningFactor * 12); // 10-22

      const horizonGradient = ctx.createRadialGradient(
        this.screenX,
        this.screenY,
        scaledRadius * 0.6,
        this.screenX,
        this.screenY,
        scaledRadius,
      );
      horizonGradient.addColorStop(0, "#000"); // Pure black center
      horizonGradient.addColorStop(0.5, "#000"); // Still black
      horizonGradient.addColorStop(
        0.8,
        `rgb(${midBrightness}, ${midBrightness}, ${midBrightness + 8})`,
      );
      horizonGradient.addColorStop(
        1,
        `rgb(${edgeBrightness}, ${edgeBrightness}, ${edgeBrightness + 8})`,
      );

      ctx.fillStyle = horizonGradient;
      ctx.beginPath();
      ctx.arc(this.screenX, this.screenY, scaledRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

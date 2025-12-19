/**
 * Black Hole - Cinematic Visualization
 *
 * Particle-based accretion disk with:
 * - Camera-space gravitational lensing
 * - Doppler beaming
 * - Depth-sorted rendering
 * - Hawking radiation
 *
 * Based on Camera3D for proper 3D projection.
 */

import {
  Game,
  Painter,
  Camera3D,
  StateMachine,
  Easing,
} from "/gcanvas.es.min.js";

// Configuration (base values, will be scaled)
const CONFIG = {
  // Black hole (as fraction of screen)
  bhRadiusRatio: 0.08, // 8% of min dimension
  diskInnerRatio: 0.12, // 12% of min dimension
  diskOuterRatio: 0.35, // 35% of min dimension

  // Disk tilt (radians)
  diskTilt: (0 * Math.PI) / 180,

  particleCount: 2500,

  // Colors (white-hot inner to deep red outer)
  colors: {
    inner: [255, 250, 220], // White-hot
    mid: [255, 160, 50], // Orange
    outer: [180, 40, 40], // Deep red
  },

  // Hawking radiation
  hawkingSpawnRate: 0.15,
  hawkingSpeed: 0.25,
  hawkingLifetime: 3.5,

  // Formation phases (durations in seconds)
  formation: {
    infall: 4.0, // Material streams in cyclone from off-screen
    collapse: 1.2, // Rapid gravitational collapse
    circularize: 2.5, // Orbits settle into disk
  },

  // Infall source (simulates tidal stream from companion star off-screen)
  infallSourceAngle: Math.PI * 1.25, // Top-right corner (225 deg, upper right quadrant)
  infallSourceDistance: 1.3, // Well off-screen
  infallStreamWidth: 0.12, // Tight coherent stream
  infallSpiralTurns: 1.5, // Graceful arc sweeping down

  // Stars (dense field to contrast the void)
  starCount: 3000,

  // Visual
  backgroundColor: "#050505",
};

class BlackHoleDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.backgroundColor;
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.time = 0;

    // Calculate scaled sizes
    this.updateScaledSizes();

    // Setup Camera3D
    this.camera = new Camera3D({
      rotationX: 0.1,
      rotationY: 0,
      perspective: this.baseScale * 0.6, // Scale perspective too
      autoRotate: true,
      autoRotateSpeed: 0.2,
    });
    this.camera.enableMouseControl(this.canvas);

    // Generate particles
    this.initParticles();

    // Generate star background
    this.initStarfield();

    // Hawking radiation
    this.hawkingParticles = [];
    this.hawkingSpawnTimer = 0;

    // Black hole mass (grows as particles are consumed)
    this.particlesConsumed = 0;
    this.totalParticleMass = CONFIG.particleCount;

    // Formation state machine
    this.initFormationStateMachine();

    // Click to form new black hole
    this.canvas.addEventListener("click", () => {
      if (this.formationFSM.is("stable")) {
        this.formNewBlackHole();
      }
    });
  }

  initFormationStateMachine() {
    this.formationFSM = StateMachine.fromSequence(
      [
        {
          name: "infall",
          duration: CONFIG.formation.infall,
          enter: () => {
            // Reset particles to infall starting positions
            this.initParticlesForInfall();
          },
        },
        {
          name: "collapse",
          duration: CONFIG.formation.collapse,
        },
        {
          name: "circularize",
          duration: CONFIG.formation.circularize,
        },
        {
          name: "stable",
          duration: Infinity, // Stays here until clicked
        },
      ],
      { context: this },
    );
  }

  formNewBlackHole() {
    this.hawkingParticles = [];
    this.hawkingSpawnTimer = 0;
    // Reset state machine to infall phase (which calls initParticlesForInfall)
    this.formationFSM.setState("infall");
  }

  updateScaledSizes() {
    // Use the smaller dimension as base for scaling
    this.baseScale = Math.min(this.width, this.height);
    this.bhRadius = this.baseScale * CONFIG.bhRadiusRatio;
    this.diskInner = this.baseScale * CONFIG.diskInnerRatio;
    this.diskOuter = this.baseScale * CONFIG.diskOuterRatio;
  }

  onResize() {
    // Called when canvas resizes
    this.updateScaledSizes();
    if (this.camera) {
      this.camera.perspective = this.baseScale * 0.6;
    }
    // Regenerate particles with new sizes
    if (this.particles) {
      this.initParticles();
    }
  }

  getHeatColor(r) {
    const t = (r - this.diskInner) / (this.diskOuter - this.diskInner);
    const c1 = t < 0.3 ? CONFIG.colors.inner : CONFIG.colors.mid;
    const c2 = t < 0.3 ? CONFIG.colors.mid : CONFIG.colors.outer;
    const mix = t < 0.3 ? t / 0.3 : (t - 0.3) / 0.7;

    return {
      r: c1[0] + (c2[0] - c1[0]) * mix,
      g: c1[1] + (c2[1] - c1[1]) * mix,
      b: c1[2] + (c2[2] - c1[2]) * mix,
      a: 1 - t,
    };
  }

  initParticles() {
    // Create particles at their final disk positions (used for resize)
    this.particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const t = Math.random();
      // Bias toward inner (hotter) region
      const r = this.diskInner + t * t * (this.diskOuter - this.diskInner);

      this.particles.push({
        // Current animated position
        angle: angle,
        distance: r,
        yOffset: (Math.random() - 0.5) * this.baseScale * 0.006,

        // Target (final disk orbit)
        targetAngle: angle,
        targetDistance: r,
        targetYOffset: (Math.random() - 0.5) * this.baseScale * 0.006,

        // Starting position (set during infall)
        startAngle: angle,
        startDistance: r,
        startYOffset: 0,

        // Physics
        speed: (1 / Math.sqrt(r)) * 600, // Keplerian
        baseColor: this.getHeatColor(r),

        // Per-particle variation for organic look
        infallDelay: 0,
        circularizeSpeed: 0.8 + Math.random() * 0.4,
      });
    }
  }

  initParticlesForInfall() {
    // Set up particles as a continuous stream from top-right
    // Some will fall into the black hole, others will form the disk
    const sourceAngle = CONFIG.infallSourceAngle;
    const streamWidth = CONFIG.infallStreamWidth;
    const spiralTurns = CONFIG.infallSpiralTurns;

    // Track how many particles have been consumed by black hole
    this.particlesConsumed = 0;
    this.totalParticleMass = this.particles.length;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Each particle has an "offset" in the stream - like beads on a string
      p.streamOffset = i / this.particles.length;

      // Start position: far off-screen (top-right)
      const angleOffset = (Math.random() - 0.5) * streamWidth;
      p.startAngle = sourceAngle + angleOffset;
      p.startDistance =
        this.baseScale * 0.9 + Math.random() * this.baseScale * 0.3;
      p.startYOffset = (Math.random() - 0.5) * this.baseScale * 0.08;

      // Determine fate: will this particle fall in or form the disk?
      // ~40% fall into black hole, ~60% have enough angular momentum to orbit
      p.willFallIn = Math.random() < 0.4;
      p.consumed = false; // Has it crossed the event horizon?

      if (p.willFallIn) {
        // These spiral all the way into the event horizon
        p.targetDistance = 0;
        p.spiralTurns = spiralTurns * (1.5 + Math.random() * 0.5); // Tighter spiral
      } else {
        // These have angular momentum to form the disk
        // Target angle should be FULLY distributed around 360° for a complete disk
        p.targetAngle = Math.random() * Math.PI * 2; // Full circle distribution
        const t = Math.random();
        p.targetDistance =
          this.diskInner + t * t * (this.diskOuter - this.diskInner);
        // Spiral turns adjusted so particles reach their distributed positions
        p.spiralTurns =
          spiralTurns + (p.targetAngle - sourceAngle) / (Math.PI * 2);
      }

      p.targetYOffset = (Math.random() - 0.5) * this.baseScale * 0.006;

      // Initialize to start position
      p.angle = p.startAngle;
      p.distance = p.startDistance;
      p.yOffset = p.startYOffset;

      // Color based on final position (consumed particles glow hotter)
      p.baseColor = p.willFallIn
        ? { r: 255, g: 200, b: 150, a: 1 } // Hotter - falling in
        : this.getHeatColor(p.targetDistance);
    }
  }

  initStarfield() {
    // Pre-render dense starfield to offscreen canvas
    this.starCanvas = document.createElement("canvas");
    this.starCanvas.width = 2000;
    this.starCanvas.height = 2000;
    const sCtx = this.starCanvas.getContext("2d");

    for (let i = 0; i < CONFIG.starCount; i++) {
      const x = Math.random() * 2000;
      const y = Math.random() * 2000;
      const brightness = Math.random();
      const size =
        brightness < 0.95 ? Math.random() * 1.5 : 1.5 + Math.random() * 1.5; // Rare bright stars

      // Slight color variation (blue-white to yellow-white)
      const temp = Math.random();
      const r = 255;
      const g = 240 + Math.random() * 15;
      const b = temp < 0.3 ? 255 : 200 + Math.random() * 55; // Some blue-ish

      sCtx.fillStyle = `rgba(${r},${g},${b},${0.3 + brightness * 0.7})`;
      sCtx.fillRect(x, y, size, size);

      // Add glow to brighter stars
      if (brightness > 0.85) {
        sCtx.fillStyle = `rgba(255,255,255,${brightness * 0.15})`;
        sCtx.fillRect(x - 1, y - 1, size + 2, size + 2);
      }
    }
  }

  spawnHawkingParticle() {
    const angle = Math.random() * Math.PI * 2;
    const startRadius = this.bhRadius * 1.05;

    // ~10% chance to be an "escaper" - faster, longer-lived, escapes the disk
    const isEscaper = Math.random() < 0.1;

    this.hawkingParticles.push({
      angle,
      radius: startRadius,
      speed: isEscaper
        ? CONFIG.hawkingSpeed * (1.5 + Math.random() * 1.0) // Faster escapers
        : CONFIG.hawkingSpeed * (0.6 + Math.random() * 0.8),
      size: isEscaper ? 3 + Math.random() * 2 : 2 + Math.random() * 2,
      brightness: isEscaper ? 1.0 : 0.8 + Math.random() * 0.2,
      age: 0,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 3,
      isEscaper, // Track if this one escapes
      maxRadius: isEscaper
        ? this.baseScale * 0.8 // Escapers go way beyond disk
        : this.diskOuter,
    });
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Update camera
    this.camera.update(dt);

    // Update formation state machine
    this.formationFSM.update(dt);

    // Animate particles based on current phase
    this.updateParticleFormation(dt);

    // Spawn Hawking radiation only when stable
    if (this.formationFSM.is("stable")) {
      this.hawkingSpawnTimer += dt;
      if (this.hawkingSpawnTimer > 1 / CONFIG.hawkingSpawnRate) {
        this.spawnHawkingParticle();
        this.hawkingSpawnTimer = 0;
      }
    }

    for (let i = this.hawkingParticles.length - 1; i >= 0; i--) {
      const p = this.hawkingParticles[i];
      p.age += dt;
      p.radius += p.speed * this.bhRadius * dt;
      const wobble = Math.sin(p.age * p.wobbleSpeed + p.wobblePhase) * 0.02;
      p.angle += (0.05 + wobble) * dt;

      const maxLife = p.isEscaper
        ? CONFIG.hawkingLifetime * 2.5
        : CONFIG.hawkingLifetime;
      if (p.age > maxLife || p.radius > p.maxRadius) {
        this.hawkingParticles.splice(i, 1);
      }
    }
  }

  updateParticleFormation(dt) {
    const state = this.formationFSM.state;
    const progress = this.formationFSM.progress;

    for (const p of this.particles) {
      if (state === "infall") {
        // Skip consumed particles
        if (p.consumed) continue;

        // Continuous stream: each particle is at a different point in its journey
        const particleProgress = progress + p.streamOffset * 0.5;
        const t = Math.min(1, Easing.easeInQuad(Math.max(0, particleProgress)));

        // Spiral inward from top-right
        const spiralAngle = p.startAngle + p.spiralTurns * Math.PI * 2 * t;
        p.angle = spiralAngle;

        // Distance decreases as particle falls in
        const targetDist = p.willFallIn ? 0 : this.bhRadius * 2;
        p.distance = Easing.lerp(p.startDistance, targetDist, t);

        // Flatten toward disk plane
        p.yOffset = Easing.lerp(p.startYOffset, 0, t);

        // Check if particle crosses event horizon (gets consumed by black hole)
        if (p.willFallIn && p.distance < this.bhRadius * 0.5) {
          p.consumed = true;
          this.particlesConsumed++;
        }
      } else if (state === "collapse") {
        // Skip consumed particles
        if (p.consumed) continue;

        // Delay particle spreading so black hole grows first
        // Particles wait until 20% into collapse before spreading
        const delayedProgress = Math.max(0, (progress - 0.2) / 0.8);
        const t = Easing.easeOutQuad(delayedProgress);

        // Collapse phase: remaining "willFallIn" particles get consumed immediately
        // Disk particles wait then settle to their orbits
        if (p.willFallIn) {
          // These fall in right away (no delay)
          const fallT = Easing.easeInQuad(progress);
          p.distance = Easing.lerp(p.distance, 0, fallT * 0.7);
          p.angle += p.spiralTurns * 0.1 * (1 - progress);

          if (p.distance < this.bhRadius * 0.5) {
            p.consumed = true;
            this.particlesConsumed++;
          }
        } else {
          // Disk particles wait for black hole to grow, then spread
          if (delayedProgress > 0) {
            p.distance = Easing.lerp(p.distance, p.targetDistance, t * 0.6);
            p.angle = Easing.lerp(p.angle, p.targetAngle, t * 0.4);
            p.yOffset = Easing.lerp(p.yOffset, p.targetYOffset, t * 0.4);
          }
        }
      } else if (state === "circularize") {
        // Skip consumed particles
        if (p.consumed) continue;

        // Orbits settle into stable Keplerian disk
        const t = Easing.easeOutCubic(progress) * p.circularizeSpeed;
        const clampedT = Math.min(1, t);

        // Interpolate to final disk position
        p.distance = Easing.lerp(p.distance, p.targetDistance, clampedT * 0.15);
        p.yOffset = Easing.lerp(p.yOffset, p.targetYOffset, clampedT * 0.2);

        // Start orbital motion, ramping up
        const orbitSpeed = p.speed * dt * 0.01 * clampedT;
        p.angle += orbitSpeed;

        // Also drift toward target angle
        const angleDiff = this.normalizeAngle(p.targetAngle - p.angle);
        p.angle += angleDiff * 0.03 * clampedT;
      } else if (state === "stable") {
        // Skip consumed particles
        if (p.consumed) continue;

        // Occasionally a particle loses angular momentum and falls in
        if (
          !p.isFalling &&
          p.distance < this.diskInner * 1.5 &&
          Math.random() < 0.0001
        ) {
          p.isFalling = true; // Mark as falling into black hole
        }

        if (p.isFalling) {
          // Spiral into the black hole
          p.distance *= 0.985; // Shrink toward center
          p.angle += p.speed * dt * 0.03; // Speed up as it falls
          p.yOffset *= 0.95; // Flatten

          // Consumed when crossing event horizon
          if (p.distance < this.bhRadius * 0.5) {
            p.consumed = true;
            this.particlesConsumed++;
          }
        } else {
          // Normal Keplerian orbits
          p.angle += p.speed * dt * 0.01;

          // Gradually settle any remaining differences
          p.distance = Easing.lerp(p.distance, p.targetDistance, 0.02);
          p.yOffset = Easing.lerp(p.yOffset, p.targetYOffset, 0.02);
        }
      }
    }
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  getFormationLambda() {
    // Returns 0-1 representing how "formed" the black hole is
    // Size is based on how many particles have been consumed!
    const state = this.formationFSM.state;
    const progress = this.formationFSM.progress;

    if (state === "infall") {
      // Black hole grows as particles fall through the event horizon
      // No consumed particles = no black hole yet
      if (!this.particlesConsumed || this.particlesConsumed === 0) return 0;

      // Size proportional to consumed mass (max ~40% of particles fall in)
      const maxConsumed = this.totalParticleMass * 0.4;
      const consumedRatio = Math.min(1, this.particlesConsumed / maxConsumed);
      return consumedRatio * 0.5; // Grows up to 50% during infall
    } else if (state === "collapse") {
      // Delay black hole growth to match particle spreading (both start at 20%)
      const delayedProgress = Math.max(0, (progress - 0.2) / 0.8);
      return 0.5 + Easing.easeOutQuad(delayedProgress) * 0.3;
    } else if (state === "circularize") {
      // Final settling to full size
      return 0.8 + progress * 0.2;
    }
    return 1; // stable
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Calculate formation visibility based on state
    const lambda = this.getFormationLambda();

    // Clear
    Painter.useCtx((ctx) => {
      ctx.fillStyle = CONFIG.backgroundColor;
      ctx.fillRect(0, 0, w, h);

      // Draw scrolling starfield
      const starX = (this.camera.rotationY * 50) % 2000;
      ctx.drawImage(this.starCanvas, -starX, 0);
      ctx.drawImage(this.starCanvas, -starX + 2000, 0);
    });

    // Draw formation collapse flash
    if (lambda < 0.3 && lambda > 0) {
      this.drawFormationFlash(cx, cy, lambda);
    }

    // Build render list
    const renderList = [];

    // Particles are always visible - brighter during infall for visibility
    const state = this.formationFSM.state;
    const diskAlpha =
      state === "infall" || state === "collapse"
        ? 0.9
        : state === "stable"
          ? 1
          : Math.max(0.5, lambda);

    // Project particles with camera-aware lensing
    const cosTilt = Math.cos(CONFIG.diskTilt);
    const sinTilt = Math.sin(CONFIG.diskTilt);

    for (const p of this.particles) {
      // Skip particles that have been consumed by the black hole
      if (p.consumed) continue;

      // World coordinates (flat disk)
      let x = Math.cos(p.angle) * p.distance;
      let z = Math.sin(p.angle) * p.distance;
      let y = p.yOffset;

      // Apply disk tilt (rotate around X axis)
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

      // Apply gravitational lensing - fades in starting at collapse
      // This creates smooth transition from Saturn-ring to Gargantua look
      let lensingStrength = 0;
      if (state === "stable") {
        lensingStrength = 1;
      } else if (state === "circularize") {
        // Continue ramping up lensing during circularize (0.4 -> 1.0)
        lensingStrength =
          0.4 + Easing.easeOutCubic(this.formationFSM.progress) * 0.6;
      } else if (state === "collapse") {
        // Start lensing during collapse (0 -> 0.4)
        lensingStrength = Easing.easeInQuad(this.formationFSM.progress) * 0.4;
      }

      if (lensingStrength > 0 && zCam > 0) {
        const currentR = Math.sqrt(xCam * xCam + yCam * yCam);
        const ringRadius = this.bhRadius * 1.3;
        const lensFactor = Math.exp(-currentR / (this.bhRadius * 1.5));
        const warp = lensFactor * 1.2 * lensingStrength; // Scale warp by lensing strength

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

    // Project black hole (only render after formation starts)
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

    // Project Hawking particles
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

      const maxLife = p.isEscaper
        ? CONFIG.hawkingLifetime * 2.5
        : CONFIG.hawkingLifetime;
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

    // Sort by depth (back to front)
    renderList.sort((a, b) => b.z - a.z);

    // Draw everything
    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.translate(cx, cy);

      for (const item of renderList) {
        if (item.type === "hole") {
          // Scale radius by lambda during formation
          const r = this.bhRadius * item.scale * item.lambda;

          // Photon ring glow (additive) - intensity based on formation
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
          gradient.addColorStop(
            0.2,
            `rgba(255, 150, 50, ${0.6 * glowIntensity})`,
          );
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
        } else if (item.type === "particle") {
          const size = this.baseScale * 0.003 * item.scale;
          if (size < 0.1) continue;

          let { r, g, b, a } = item.color;
          const isInfalling = state === "infall" || state === "collapse";

          // During infall, particles are cooler (bluer) and transition to hot
          if (isInfalling) {
            const heatProgress = 1 - item.z / (this.baseScale * 0.5); // Closer = hotter
            const coolFactor = Math.max(0, 1 - heatProgress);
            // Shift toward blue for cold, distant matter
            r = Math.floor(r * (0.6 + heatProgress * 0.4));
            g = Math.floor(g * (0.7 + heatProgress * 0.3));
            b = Math.min(255, Math.floor(b + coolFactor * 80));
          }

          const finalAlpha = Math.max(
            0,
            Math.min(1, a * item.doppler * item.diskAlpha),
          );

          // Core particle (circle)
          ctx.fillStyle = `rgba(${r},${g},${b},${finalAlpha})`;
          ctx.beginPath();
          ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
          ctx.fill();

          // Additive glow for bright/close particles
          if (
            (item.doppler > 1.1 && item.diskAlpha > 0.5) ||
            (isInfalling && item.z < 0)
          ) {
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = `rgba(${r},${g},${b},${finalAlpha * 0.4})`;
            ctx.beginPath();
            ctx.arc(item.x, item.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
          }
        } else if (item.type === "hawking") {
          const size = item.size * item.scale * (this.baseScale * 0.001); // Scale with screen
          if (size < 0.1) continue;

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
      }

      ctx.restore();
    });

    // Info
    this.drawInfo(w, h);
  }

  drawFormationFlash(cx, cy, lambda) {
    const intensity = 1 - lambda / 0.3;

    Painter.useCtx((ctx) => {
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
          const angle = (i / 8) * Math.PI * 2 + this.time * 0.5;
          const startR = this.bhRadius * 2;
          const endR = this.bhRadius * lambda * 0.5;

          const gradient = ctx.createLinearGradient(
            cx + Math.cos(angle) * startR,
            cy + Math.sin(angle) * startR,
            cx + Math.cos(angle) * endR,
            cy + Math.sin(angle) * endR,
          );
          gradient.addColorStop(0, "transparent");
          gradient.addColorStop(
            0.5,
            `rgba(255, 200, 150, ${streakAlpha * 0.5})`,
          );
          gradient.addColorStop(1, `rgba(255, 255, 200, ${streakAlpha})`);

          ctx.strokeStyle = gradient;
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
    });
  }

  drawInfo(w, h) {
    Painter.useCtx((ctx) => {
      ctx.font = "11px monospace";
      ctx.textAlign = "left";

      // Formation status with phase names
      const state = this.formationFSM.state;
      const progress = this.formationFSM.progress;

      const stateLabels = {
        infall: "Matter Infall",
        collapse: "Gravitational Collapse",
        circularize: "Disk Circularization",
        stable: "Stable Orbit",
      };

      const stateColors = {
        infall: "#88f", // Blue - cold matter falling
        collapse: "#f88", // Red - intense collapse
        circularize: "#fa8", // Orange - settling
        stable: "#8a8", // Green - stable
      };

      ctx.fillStyle = stateColors[state] || "#888";
      if (state === "stable") {
        ctx.fillText(stateLabels[state], 15, h - 30);
      } else {
        ctx.fillText(
          `${stateLabels[state]}: ${(progress * 100).toFixed(0)}%`,
          15,
          h - 30,
        );
      }

      ctx.textAlign = "right";
      ctx.fillStyle = "#444";
      ctx.fillText("click to form  |  drag to orbit", w - 15, h - 15);
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new BlackHoleDemo(canvas);
  demo.start();
});

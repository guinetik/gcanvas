/**
 * DebrisManager - Manages debris streams for TDE demo
 *
 * Uses ParticleSystem with gravitational attraction toward the black hole.
 * Handles tidal shear, disk formation with lensing, and accretion tracking.
 */
import { GameObject, Easing, Painter } from "../../../src/index.js";

const CONFIG = {
  // Physics - VISIBLE gravity for dramatic streaming
  gravityStrength: 1000, // Reduced so particles are visible longer
  damping: 0.992,
  tidalShearStrength: 0.6,

  // Disk formation - WIDER disk to match blackhole demo
  diskInnerRatio: 1.6, // Inner disk radius as multiple of bhRadius
  diskOuterRatio: 6.0, // Outer disk radius - MUCH WIDER for dense disk
  circularizationRate: 0.084,
  diskFlattenRate: 0.063,

  // Accretion - particles must reach center to be consumed
  accretionRadius: 0.24453, // Smaller so particles spiral longer
  fallInRate: 0.22,

  // Particle lifetime - LONG for stable disk
  maxLifetime: 300, // 5 minutes - disk particles should persist

  // Lensing
  lensingStrength: 1.4,

  // CYCLONE SPIRAL
  spiralTurnsMin: 1.0,
  spiralTurnsMax: 8.0,
  spiralSpeedBase: 400,

  // Falling particle speed
  fallingSpiralRate: 0.08,
  diskSpiralRate: 0.015,

  // Colors - temperature gradient
  colors: {
    inner: [255, 240, 200], // Brighter white-yellow core
    mid: [255, 140, 50], // Vibrant orange
    outer: [200, 40, 10], // Deep red/crimson
  },

  // Max debris particles
  maxDebris: 15000,
};

export class DebrisManager extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {Camera3D} options.camera - Camera for projection
   * @param {number} options.bhRadius - Black hole radius
   * @param {number} options.baseScale - Base scale
   */
  constructor(game, options = {}) {
    super(game, options);

    this.camera = options.camera;
    this.bhRadius = options.bhRadius ?? 50;
    this.baseScale = options.baseScale ?? 500;

    // Black hole position (attraction target)
    this.bhPosition = { x: 0, y: 0, z: 0 };

    // Disk sizing
    this.diskInner = this.bhRadius * CONFIG.diskInnerRatio;
    this.diskOuter = this.bhRadius * CONFIG.diskOuterRatio;

    // Particle system
    this.particleSystem = null;

    // Debris particles (manual tracking for lensing)
    this.debris = [];

    // Accretion tracking
    this.particlesAccreted = 0;
    this.accretionRate = 0;
    this.lastAccretionCount = 0;

    // Lensing strength (increases as disk forms)
    this.lensingAmount = 0;
  }

  /**
   * Initialize the debris manager.
   */
  init() {
    // We'll manually manage debris instead of using ParticleSystem
    // This gives us control over lensing projection
    this.debris = [];
    this.diskParticles = []; // Permanent accretion disk (like blackhole demo)
    this.diskFormed = false;
  }

  /**
   * Create a permanent accretion disk (like the blackhole demo).
   * Called early to ensure there's always a visible disk.
   */
  createAccretionDisk(particleCount = 2000) {
    if (this.diskFormed) return;
    this.diskFormed = true;
    this.addToDisk(particleCount);
  }

  /**
   * Add more particles to the accretion disk.
   */
  addToDisk(particleCount) {
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const t = Math.random();
      // Bias toward inner (hotter) region like blackhole demo
      const r = this.diskInner + t * t * (this.diskOuter - this.diskInner);

      // Keplerian orbital speed
      const speed = (1 / Math.sqrt(r / this.bhRadius)) * 2.0;
      // FLAT disk - very small y offset
      const yOffset = (Math.random() - 0.5) * this.bhRadius * 0.05;

      this.diskParticles.push({
        angle: angle,
        distance: r,
        yOffset: yOffset,
        speed: speed,
        baseColor: this.getHeatColor(r),
        size: 1.5 + Math.random() * 2.5,
        isFalling: false,
      });
    }
  }

  /**
   * Get temperature-based color for distance from black hole.
   * Outer particles FADE TO TRANSPARENT - no hard edge.
   */
  getHeatColor(dist) {
    const t = (dist - this.diskInner) / (this.diskOuter - this.diskInner);
    const clampedT = Math.max(0, Math.min(1, t));

    let c1, c2, mix;
    if (clampedT < 0.3) {
      c1 = CONFIG.colors.inner;
      c2 = CONFIG.colors.mid;
      mix = clampedT / 0.3;
    } else {
      c1 = CONFIG.colors.mid;
      c2 = CONFIG.colors.outer;
      mix = (clampedT - 0.3) / 0.7;
    }

    // Alpha FADES at outer edge - but stays visible longer
    // Inner: fully opaque, Outer: still visible (0.2 minimum)
    const alpha = 0.2 + Math.pow(1 - clampedT, 1.2) * 0.7;

    return {
      r: c1[0] + (c2[0] - c1[0]) * mix,
      g: c1[1] + (c2[1] - c1[1]) * mix,
      b: c1[2] + (c2[2] - c1[2]) * mix,
      a: alpha,
    };
  }

  /**
   * Update sizing.
   */
  updateSizing(bhRadius, baseScale) {
    this.bhRadius = bhRadius;
    this.baseScale = baseScale;
    this.diskInner = bhRadius * CONFIG.diskInnerRatio;
    this.diskOuter = bhRadius * CONFIG.diskOuterRatio;
  }

  /**
   * Add debris particles from the disrupted star.
   * Particles flow FROM star TOWARD BH center - either into disk or consumed.
   */
  addDebris(debrisData) {
    for (const d of debrisData) {
      // Limit total debris
      if (this.debris.length >= CONFIG.maxDebris) break;

      // Distance and angle from BH center (origin)
      const dist = Math.sqrt(d.x * d.x + d.z * d.z);
      const angle = Math.atan2(d.z, d.x);

      // Determine fate: accretion disk or fall into BH
      // MOST particles should form the disk - only small fraction falls in
      const normalizedDist = Math.min(1, dist / (this.bhRadius * 8));
      // 15% of close particles fall in, 5% of far particles - keeps disk DENSE
      const fallInChance = 0.15 - normalizedDist * 0.1;
      const willFallIn = Math.random() < fallInChance;

      // Target orbit radius - biased toward inner disk
      const randFactor = Math.pow(Math.random(), 1.5); // Bias toward inner
      const targetDist = willFallIn
        ? 0
        : this.diskInner + randFactor * (this.diskOuter - this.diskInner) * 0.6;

      // Spiral toward BH - all particles spiral inward
      const spiralTurns =
        CONFIG.spiralTurnsMin +
        Math.random() * (CONFIG.spiralTurnsMax - CONFIG.spiralTurnsMin);

      // Target angle - continue in spiral direction toward BH
      const targetAngle = angle + spiralTurns * Math.PI * 2;

      // Initial velocities from star stream
      const vx = d.vx || 0;
      const vy = d.vy || 0;
      const vz = d.vz || 0;

      // FLAT DISK like the original blackhole demo
      const yVariation = this.baseScale * 0.006;

      this.debris.push({
        // Current state
        x: d.x,
        y: d.y,
        z: d.z,
        vx: vx,
        vy: vy,
        vz: vz,

        // SPIRAL trajectory state (for disk formation logic)
        startAngle: angle,
        startDistance: dist,
        startYOffset: d.y,

        // Current polar state (animated via physics)
        angle: angle,
        distance: dist,
        yOffset: d.y,

        // Target state - THICK disk with vertical variation
        targetAngle: targetAngle,
        targetDistance: targetDist,
        targetYOffset: (Math.random() - 0.5) * yVariation,

        // SPIRAL PARAMS
        spiralTurns: spiralTurns,
        spiralProgress: 0, // Start at zero - no jump

        // Behavior flags
        willFallIn: willFallIn,
        // Treat ALL incoming debris as dynamic "falling" physics initially
        // They will transition to disk orbit later if not consumed
        isFalling: true, 

        // Appearance - slight size variation
        size: d.size * (0.6 + Math.random() * 0.6),
        baseColor: this.getHeatColor(dist),

        // State
        age: 0,
        consumed: false,
        circularized: false,
      });
    }
  }

  /**
   * Clear all debris (but keep permanent disk if formed).
   */
  clear() {
    this.debris = [];
    this.particlesAccreted = 0;
    this.accretionRate = 0;
    this.lastAccretionCount = 0;
    this.lensingAmount = 0;
    // Reset disk for new simulation
    this.diskParticles = [];
    this.diskFormed = false;
  }

  /**
   * Get current accretion rate.
   */
  getAccretionRate() {
    return this.accretionRate;
  }

  /**
   * Set lensing amount (0-1).
   */
  setLensingAmount(amount) {
    this.lensingAmount = Math.max(0, Math.min(1, amount));
  }

  update(dt) {
    super.update(dt);

    const accretionDist = this.bhRadius * CONFIG.accretionRadius;
    let newAccretions = 0;

    // Update each debris particle
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const p = this.debris[i];
      if (p.consumed) continue;

      p.age += dt;

      if (p.isFalling) {
        // --- NEW PHYSICS: ORBITAL MECHANICS ---
        
        // 1. Gravity (Newtonian approx)
        const distSq = p.x * p.x + p.y * p.y + p.z * p.z;
        const dist = Math.sqrt(distSq);
        
        // Gravity force = G * M / r^2
        // We can tune strength to match visual scale
        const gravityAccel = CONFIG.gravityStrength / Math.max(distSq, 100);
        
        // Direction to center
        const dirX = -p.x / dist;
        const dirY = -p.y / dist;
        const dirZ = -p.z / dist;
        
        // Apply Gravity
        p.vx = (p.vx || 0) + dirX * gravityAccel * dt;
        p.vy = (p.vy || 0) + dirY * gravityAccel * dt;
        p.vz = (p.vz || 0) + dirZ * gravityAccel * dt;
        
        // 2. Drag / Circularization / Accretion Force
        // Gently nudge velocity towards a circular orbit to form disk
        // Target velocity for circular orbit: sqrt(GM/r)
        // Tangent direction: cross product of vertical axis (0,1,0) and radius
        
        // But for "S" shape, we primarily just want gravity to do the work first.
        // We add a small "drag" to prevent them from flying off forever if they are too fast.
        
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
        if (speed > 200) {
            // Drag if moving too fast
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.vz *= 0.99;
        }

        // 3. Move
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        
        // Update derived polar coords for rendering logic
        p.distance = Math.sqrt(p.x * p.x + p.z * p.z);
        p.angle = Math.atan2(p.z, p.x);
        
        // Check accretion
        if (dist < accretionDist) {
          p.consumed = true;
          newAccretions++;
        }
        
        // 4. Force Capture (Prevent flying off to infinity)
        // If particle gets too far, nudge it back strongly
        if (dist > this.bhRadius * 15) {
             const pullBack = 2.0;
             p.vx += dirX * pullBack * dt;
             p.vy += dirY * pullBack * dt;
             p.vz += dirZ * pullBack * dt;
        }

      } else {
        // Disk-forming particles - ALWAYS move inward first, then settle
        p.spiralProgress = Math.min(1, p.spiralProgress + 0.05);

        // ALWAYS apply inward pull - particles MUST move toward BH
        p.distance -= p.inwardVel * dt * 0.4;

        // Gravity pull toward center
        const gravityAccel =
          (CONFIG.gravityStrength * dt * 0.2) / Math.max(p.distance, 50);
        p.inwardVel = Math.min(100, p.inwardVel + gravityAccel);

        // Once close to target orbit, start settling into circular orbit
        if (p.distance <= p.targetDistance * 1.3) {
          const settleRate = 0.05;
          p.distance = Easing.lerp(p.distance, p.targetDistance, settleRate);
          p.circularized = p.distance < p.targetDistance * 1.1;
        }

        // Clamp minimum distance - don't go inside inner disk
        p.distance = Math.max(this.diskInner * 0.5, p.distance);

        // Angular motion - rotate around BH
        const angularSpeed =
          1.8 / Math.sqrt(Math.max(1, p.distance / this.bhRadius));
        p.angle += angularSpeed * dt;

        // Flatten to disk plane
        const flattenT = Math.min(1, p.age * 0.5);
        p.yOffset = Easing.lerp(p.startYOffset, p.targetYOffset, flattenT);

        // Once circularized, maintain stable Keplerian orbit
        if (p.circularized) {
          // Stable orbital motion - particles stay in orbit
          const orbitalSpeed =
            (1 / Math.sqrt(Math.max(1, p.distance / this.bhRadius))) * 2.0;
          p.angle += orbitalSpeed * dt;

          // Small wobble to keep disk flat but not perfectly static
          const wobble =
            Math.sin(p.angle * 3 + p.startAngle) * this.baseScale * 0.003;
          p.yOffset = p.targetYOffset + wobble;

          // VERY rarely, inner particles fall in (keeps disk dynamic but dense)
          if (p.distance < this.diskInner * 1.1 && Math.random() < 0.00001) {
            p.isFalling = true;
            // Initialize velocity for falling physics
            // Tangent velocity + slight inward kick
            const tangentX = -Math.sin(p.angle);
            const tangentZ = Math.cos(p.angle);
            const orbSpeed = orbitalSpeed * p.distance; // rad/s * dist = units/s
            
            p.vx = tangentX * orbSpeed * 0.9; // 0.9 to start spiral
            p.vz = tangentZ * orbSpeed * 0.9;
            p.vy = 0;
            
            // Explicitly set positions from polar
            p.x = Math.cos(p.angle) * p.distance;
            p.z = Math.sin(p.angle) * p.distance;
            p.y = p.yOffset;
          }
        }

        // Convert stray particles that haven't settled
        if (p.age > 5 && p.distance > this.diskOuter) {
          p.isFalling = true;
          p.vx = (Math.random()-0.5) * 10;
          p.vz = (Math.random()-0.5) * 10;
          p.vy = 0;
        }
      }

      // Update Cartesian coordinates from polar (ONLY FOR DISK PARTICLES)
      // Falling particles update Cartesian directly in physics block above
      if (!p.isFalling) {
        p.x = Math.cos(p.angle) * p.distance;
        p.z = Math.sin(p.angle) * p.distance;
        p.y = p.yOffset;
      }

      // Update color based on current distance
      // For falling particles, use full distance (3D)
      const colorDist = p.isFalling ? Math.sqrt(p.x*p.x + p.z*p.z) : p.distance;
      p.baseColor = this.getHeatColor(colorDist);
    }

    // Remove consumed particles and expired particles
    this.debris = this.debris.filter(
      (p) => !p.consumed && p.age < CONFIG.maxLifetime,
    );

    this.particlesAccreted += newAccretions;
    this.accretionRate = newAccretions / (dt || 1);

    // Update permanent accretion disk particles (stable Keplerian orbits)
    for (const p of this.diskParticles) {
      if (p.isFalling) {
        // Falling particles spiral in
        p.distance *= 0.99;
        p.angle += p.speed * dt * 1.5;
        p.yOffset *= 0.95;

        if (p.distance < accretionDist) {
          p.consumed = true;
        }
      } else {
        // Stable Keplerian orbit (like blackhole demo)
        p.angle += p.speed * dt;

        // Very rarely, inner particles fall in
        if (p.distance < this.diskInner * 1.3 && Math.random() < 0.0001) {
          p.isFalling = true;
        }
      }
    }

    // Remove consumed disk particles
    this.diskParticles = this.diskParticles.filter((p) => !p.consumed);

    // Increase lensing as disk forms
    const circularizedCount = this.debris.filter((p) => p.circularized).length;
    const targetLensing =
      this.debris.length > 0
        ? Math.min(1, circularizedCount / (this.debris.length * 0.5))
        : 0;
    this.lensingAmount = Easing.lerp(this.lensingAmount, targetLensing, 0.02);
  }

  /**
   * Build render list with lensing applied.
   * Uses same simple lensing as the blackhole demo - just warps particles outward.
   */
  buildRenderList() {
    const renderList = [];
    // Use full lensing once disk has some particles
    const lensingStrength =
      this.debris.length > 50 ? CONFIG.lensingStrength : 0;

    for (const p of this.debris) {
      if (p.consumed) continue;

      // Transform to camera space
      const cosY = Math.cos(this.camera.rotationY);
      const sinY = Math.sin(this.camera.rotationY);
      let xCam = p.x * cosY - p.z * sinY;
      let zCam = p.x * sinY + p.z * cosY;

      const cosX = Math.cos(this.camera.rotationX);
      const sinX = Math.sin(this.camera.rotationX);
      let yCam = p.y * cosX - zCam * sinX;
      zCam = p.y * sinX + zCam * cosX;

      // Apply gravitational lensing
      if (lensingStrength > 0) {
        let currentR = Math.sqrt(xCam * xCam + yCam * yCam);
        const ringRadius = this.bhRadius * 1.5; // Einstein ring approx

        if (zCam > 0) {
          // Behind BH - The "Interstellar" Halo Effect
          // Light from behind is bent around the BH.
          // We see the light that traveled "up" and bent down to us.
          // So we shift the image UP (negative Y) towards the Einstein ring.

          // 1. Radial expansion (standard lensing)
          const lensFactor = Math.exp(-currentR / (this.bhRadius * 2.0));
          const warp = lensFactor * 2.0 * lensingStrength;

          if (currentR > 0) {
            const ratio = (currentR + ringRadius * warp) / currentR;
            xCam *= ratio;
            yCam *= ratio;
          }

          // 2. Vertical Arching (Crucial for edge-on view)
          // If the particle is behind the BH, we pull it towards the ring radius vertically
          // This creates the "hump" or halo over the shadow
          const archStrength =
            Math.exp(-(xCam * xCam) / (ringRadius * ringRadius * 4)) *
            lensingStrength;
          
          // Shift Y upwards (negative) to form the upper arc
          // We blend the current Y with the ring height
          // stronger shift when x is small (directly behind)
          const targetY = -ringRadius * 0.9; 
          yCam = yCam + (targetY - yCam) * archStrength * 0.8;
          
        } else if (currentR > 0 && currentR < this.bhRadius * 3) {
          // In front of BH - bend around the black hole edge
          // Particles near BH edge curve around it
          const edgeProximity = currentR / this.bhRadius;

          if (edgeProximity < 2.5) {
            // Strong bending near the edge - pushes particles outward and around
            const bendStrength =
              Math.exp(-edgeProximity * 0.8) * lensingStrength;
            const pushOut = 1 + bendStrength * 0.4;

            // Also curve around - displace perpendicular to radius
            const angle = Math.atan2(yCam, xCam);
            const curvature = bendStrength * 0.3 * Math.sign(yCam || 1);

            xCam =
              xCam * pushOut +
              Math.cos(angle + Math.PI / 2) * curvature * this.bhRadius;
            yCam =
              yCam * pushOut +
              Math.sin(angle + Math.PI / 2) * curvature * this.bhRadius;
          }
        }
      }

      // OCCLUSION: Cull particles behind BH that project inside the shadow
      const finalDist = Math.sqrt(xCam * xCam + yCam * yCam);
      if (zCam > 0 && finalDist < this.bhRadius * 0.95) continue;

      // Perspective projection
      const perspectiveScale =
        this.camera.perspective / (this.camera.perspective + zCam);
      const screenX = xCam * perspectiveScale;
      const screenY = yCam * perspectiveScale;

      // Cull particles behind camera
      if (zCam < -this.camera.perspective + 10) continue;

      // Doppler effect
      const velocityDir = Math.cos(p.angle + this.camera.rotationY);
      const doppler = 1 + velocityDir * 0.4;

      renderList.push({
        z: zCam,
        x: screenX,
        y: screenY,
        scale: perspectiveScale,
        color: p.baseColor,
        doppler: doppler,
        size: p.size,
        isFalling: p.willFallIn,
        horizonProximity: p.distance / this.bhRadius,
      });
    }

    // Add permanent accretion disk particles (if any exist)
    for (const p of this.diskParticles) {
      if (p.consumed) continue;

      // Convert polar to Cartesian
      const px = Math.cos(p.angle) * p.distance;
      const pz = Math.sin(p.angle) * p.distance;
      const py = p.yOffset;

      // Transform to camera space
      const cosY = Math.cos(this.camera.rotationY);
      const sinY = Math.sin(this.camera.rotationY);
      let xCam = px * cosY - pz * sinY;
      let zCam = px * sinY + pz * cosY;

      const cosX = Math.cos(this.camera.rotationX);
      const sinX = Math.sin(this.camera.rotationX);
      let yCam = py * cosX - zCam * sinX;
      zCam = py * sinX + zCam * cosX;

      // Apply gravitational lensing
      if (lensingStrength > 0) {
        const rSq = xCam * xCam + yCam * yCam;
        const currentR = Math.sqrt(rSq);
        const ringRadius = this.bhRadius * 1.5; // Approx Einstein ring radius

        if (zCam > 0) {
          // BEHIND THE BLACK HOLE (The "Halo")
          // Light from the back of the disk is bent around the BH.
          // We see it as a halo/ring surrounding the shadow.
          
          // Warp factor: increases as we get closer to the center axis
          // This pushes the image OUTWARD towards the Einstein ring radius
          const distToRing = Math.abs(currentR - ringRadius);
          
          // Simple geometric warp for the "Interstellar" look:
          // If we are behind, we map the coordinates to the ring radius vertically.
          
          // Strength of the warp depends on how close we are to the BH shadow
          // Particles directly behind (small currentR) get pushed to the ring.
          if (currentR < ringRadius * 2) {
             const t = Math.max(0, 1 - currentR / (ringRadius * 2.5));
             
             // Push Y towards the ring edge, preserving sign
             // This creates the "arch" over and under the shadow
             const targetY = (yCam > 0 ? 1 : -1) * Math.sqrt(Math.max(0, ringRadius*ringRadius - xCam*xCam * 0.5));
             
             // Blend between original position and warped position
             // Stronger blend near the center (high t)
             const blend = t * t * lensingStrength * 0.9;
             yCam = yCam * (1 - blend) + targetY * blend;
             
             // Also slight radial expansion
             const radialPush = 1 + t * 0.5 * lensingStrength;
             xCam *= radialPush;
             yCam *= radialPush;
          }

        } else if (currentR > 0 && currentR < this.bhRadius * 3) {
          // FRONT OF BLACK HOLE (Accretion Disk proper)
          // Light is still bent, but less dramatically. 
          // Main effect is slight apparent magnification and distortion near the shadow.
          
          const edgeProximity = currentR / this.bhRadius;
          if (edgeProximity < 3.0) {
             // Warp space slightly near the event horizon
             const warp = 1.0 + Math.exp(-edgeProximity * 2.0) * 0.2 * lensingStrength;
             xCam *= warp;
             yCam *= warp;
          }
        }
      }

      // OCCLUSION: Cull particles that end up inside the Event Horizon shadow
      // The shadow is slightly larger than the BH radius due to light capture
      const finalRSq = xCam * xCam + yCam * yCam;
      const shadowRadiusSq = (this.bhRadius * 0.9) ** 2; // 0.9 to allow slight overlap/glow
      
      // If behind (z>0) AND projected inside shadow, it's occluded
      if (zCam > 0 && finalRSq < shadowRadiusSq) continue;
      
      // If in front (z<0) AND inside, it might be blocking the view (but we usually draw on top)
      // Actually, particles *in front* should be visible even if projected on the black circle,
      // because they are between us and the BH.
      // BUT if they physically fell in (r < radius), they are gone.
      // Our physics handles physical consumption. This check is purely for visual occlusion of background.

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
        z: zCam,
        x: screenX,
        y: screenY,
        scale: perspectiveScale,
        color: p.baseColor,
        doppler: doppler,
        size: p.size,
        isFalling: p.isFalling,
        horizonProximity: p.distance / this.bhRadius,
      });
    }

    return renderList;
  }

  /**
   * Draw debris particles with lensing.
   * Uses Painter.useCtx() for direct canvas drawing.
   */
  draw() {
    const renderList = this.buildRenderList();
    if (renderList.length === 0) return;

    // Sort by z for proper depth
    renderList.sort((a, b) => b.z - a.z);

    const cx = this.game.width / 2;
    const cy = this.game.height / 2;

    Painter.useCtx((ctx) => {
      // Use additive blending for glowing plasma effect
      ctx.globalCompositeOperation = "screen";

      // Render each particle
      for (const item of renderList) {
        const screenX = cx + item.x;
        const screenY = cy + item.y;

        // Particle size based on type
        // Larger base size for better blending
        const baseSize = Math.max(1.5, item.size * item.scale * 1.5);
        const size = item.isFalling ? baseSize * 0.4 : baseSize * 0.5;

        // Apply doppler effect to color
        const color = item.color;
        const dopplerBoost = item.doppler; // 0.6 to 1.4

        // Enhance doppler contrast - brighter approaching, dimmer receding
        const boost = Math.pow(dopplerBoost, 1.5);

        const r = Math.min(255, Math.round(color.r * boost));
        const g = Math.min(255, Math.round(color.g * boost));
        const b = Math.min(255, Math.round(color.b * boost));

        // Falling particles are brighter
        const alpha = item.isFalling
          ? Math.min(1, color.a * 1.5)
          : color.a * 0.8;

        // Brighter glow for particles near the horizon or falling
        const horizonGlow =
          item.horizonProximity < 2 ? (2 - item.horizonProximity) * 0.5 : 0;

        // Draw particle
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        // Only use shadowBlur for very bright particles to save performance
        // and create "hot spots"
        if (item.isFalling || horizonGlow > 0.3) {
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.shadowBlur = size * 2;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Reset composite operation
      ctx.globalCompositeOperation = "source-over";
    });
  }
}

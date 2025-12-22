import { GameObject, Painter, Tweenetik, Easing } from "/gcanvas.es.min.js";
import { keplerianOmega } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

/**
 * AccretionDisk - Keplerian particle disk with gravitational lensing
 *
 * Uses the same proven lensing formula as demos/js/blackhole.js:
 * - Single-pass lensing that pushes particles outward
 * - Einstein ring forms naturally from disk geometry
 * - Doppler beaming for brightness variation
 */

const DISK_CONFIG = {
    // Orbital bounds (multiplier of BH radius)
    innerRadiusMultiplier: 1.5,
    outerRadiusMultiplier: 9.0,    // Wide disk with margin from screen edges

    // Particle properties
    maxParticles: 4000,
    particleLifetime: 80,
    spawnRate: 50,

    // Orbital physics
    baseOrbitalSpeed: 0.8,

    // Decay mechanics
    decayChanceBase: 0.0002,
    decaySpeedFactor: 0.995,

    // Disk geometry - thin disk with some spread
    diskThickness: 0.006,

    // Lensing - pushes particles outward to form Einstein ring
    ringRadiusFactor: 1.8,      // Higher = more margin between BH and ring
    lensingFalloff: 1.8,        // Slightly wider falloff

    // Visual - heat gradient (white-hot inner to deep red outer)
    colorHot: { r: 255, g: 250, b: 220 },   // Inner (white-hot)
    colorMid: { r: 255, g: 160, b: 50 },    // Mid (orange)
    colorCool: { r: 180, g: 40, b: 40 },    // Outer (deep red)

    sizeMin: 1,
    sizeMax: 2.5,
};

export class AccretionDisk extends GameObject {
    constructor(game, options = {}) {
        super(game, options);

        this.camera = options.camera;
        this.bhRadius = options.bhRadius ?? 50;
        this.bhMass = options.bhMass ?? CONFIG.blackHole.initialMass;

        // Disk bounds scale with BH radius
        this.innerRadius = this.bhRadius * DISK_CONFIG.innerRadiusMultiplier;
        this.outerRadius = this.bhRadius * DISK_CONFIG.outerRadiusMultiplier;

        // State
        this.active = false;
        this.lensingStrength = 0;   // Ramps up during activation
        this.scale = 0;             // For expand-from-BH animation

        // Callback when particle falls into BH
        this.onParticleConsumed = options.onParticleConsumed ?? null;

        // Particle array
        this.particles = [];
    }

    /**
     * Activate disk with expand-from-center animation
     */
    activate() {
        if (this.active) return;
        this.active = true;
        this.scale = 0.3;  // Start partially expanded so it's visible immediately
        this.lensingStrength = 0;
        // Expansion from BH center - 2 seconds (was 4, felt too slow)
        Tweenetik.to(this, { scale: 1 }, 2.0, Easing.easeOutQuart);
        // Lensing ramps up alongside scale
        Tweenetik.to(this, { lensingStrength: 1 }, 2.5, Easing.easeOutQuad);
    }

    init() {
        this.particles = [];
    }

    /**
     * Get heat-based color for particle at given radius
     */
    getHeatColor(distance) {
        const t = (distance - this.innerRadius) / (this.outerRadius - this.innerRadius);

        let r, g, b;
        if (t < 0.5) {
            // Inner half: hot -> mid
            const t2 = t * 2;
            r = DISK_CONFIG.colorHot.r + (DISK_CONFIG.colorMid.r - DISK_CONFIG.colorHot.r) * t2;
            g = DISK_CONFIG.colorHot.g + (DISK_CONFIG.colorMid.g - DISK_CONFIG.colorHot.g) * t2;
            b = DISK_CONFIG.colorHot.b + (DISK_CONFIG.colorMid.b - DISK_CONFIG.colorHot.b) * t2;
        } else {
            // Outer half: mid -> cool
            const t2 = (t - 0.5) * 2;
            r = DISK_CONFIG.colorMid.r + (DISK_CONFIG.colorCool.r - DISK_CONFIG.colorMid.r) * t2;
            g = DISK_CONFIG.colorMid.g + (DISK_CONFIG.colorCool.g - DISK_CONFIG.colorMid.g) * t2;
            b = DISK_CONFIG.colorMid.b + (DISK_CONFIG.colorCool.b - DISK_CONFIG.colorMid.b) * t2;
        }

        return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
    }

    /**
     * Spawn a new particle at random position in disk
     */
    spawnParticle() {
        if (this.particles.length >= DISK_CONFIG.maxParticles) return;

        // Balanced distribution with slight inner bias for lensing visibility
        // Lower power = more particles near inner edge (where lensing is strongest)
        const t = Math.pow(Math.random(), 0.6);
        const distance = this.innerRadius + (this.outerRadius - this.innerRadius) * t;

        const angle = Math.random() * Math.PI * 2;

        // Keplerian orbital speed
        const speed = keplerianOmega(distance, this.bhMass, DISK_CONFIG.baseOrbitalSpeed, this.outerRadius);

        // Small vertical offset for thin disk
        const baseScale = this.game.baseScale ?? Math.min(this.game.width, this.game.height);
        const yOffset = (Math.random() - 0.5) * baseScale * DISK_CONFIG.diskThickness;

        this.particles.push({
            angle,
            distance,
            yOffset,
            speed,
            // Small random initial age prevents batch death
            age: Math.random() * DISK_CONFIG.particleLifetime * 0.1,  // Only 10% spread
            isFalling: false,
            size: DISK_CONFIG.sizeMin + Math.random() * (DISK_CONFIG.sizeMax - DISK_CONFIG.sizeMin),
            baseColor: this.getHeatColor(distance),
        });
    }

    /**
     * Capture a particle from the tidal stream
     * Converts Cartesian stream particle to polar disk orbit
     */
    captureParticle(streamParticle) {
        if (this.particles.length >= DISK_CONFIG.maxParticles) return;

        const x = streamParticle.x;
        const z = streamParticle.z;
        const dist = Math.sqrt(x * x + z * z);

        // Skip if outside disk bounds
        if (dist < this.innerRadius || dist > this.outerRadius) return;

        const angle = Math.atan2(z, x);

        // Calculate tangential velocity from stream particle
        const vx = streamParticle.vx ?? 0;
        const vz = streamParticle.vz ?? 0;
        const tangentVx = -z / dist;
        const tangentVz = x / dist;
        const tangentSpeed = vx * tangentVx + vz * tangentVz;

        // Convert to angular velocity
        const angularVelocity = Math.abs(tangentSpeed) / dist;

        // Target Keplerian speed
        const keplerianSpeed = keplerianOmega(dist, this.bhMass, DISK_CONFIG.baseOrbitalSpeed, this.outerRadius);

        // Blend toward Keplerian (captured particles circularize)
        const blendedSpeed = (angularVelocity + keplerianSpeed) / 2;

        this.particles.push({
            angle,
            distance: dist,
            yOffset: streamParticle.y ?? 0,
            speed: blendedSpeed,
            age: 0,
            isFalling: false,
            size: streamParticle.size ?? (DISK_CONFIG.sizeMin + Math.random() * (DISK_CONFIG.sizeMax - DISK_CONFIG.sizeMin)),
            baseColor: this.getHeatColor(dist),
        });
    }

    /**
     * Check if particle should begin decay spiral
     */
    checkDecay(p) {
        // Higher decay chance near ISCO (innermost stable circular orbit)
        const iscoProximity = (p.distance - this.innerRadius) / (this.outerRadius - this.innerRadius);
        const ageDecayFactor = Math.min(1, p.age / DISK_CONFIG.particleLifetime);

        // Particles near inner edge or old ones are more likely to fall
        const decayChance = DISK_CONFIG.decayChanceBase *
            (1 + 3 * (1 - iscoProximity)) *
            (1 + ageDecayFactor);

        if (Math.random() < decayChance) {
            p.isFalling = true;
        }
    }

    update(dt) {
        super.update(dt);

        // Spawn new particles when active
        if (this.active && this.particles.length < DISK_CONFIG.maxParticles) {
            for (let i = 0; i < DISK_CONFIG.spawnRate; i++) {
                this.spawnParticle();
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;

            // Remove old particles
            if (p.age > DISK_CONFIG.particleLifetime) {
                this.particles.splice(i, 1);
                continue;
            }

            if (p.isFalling) {
                // Spiral inward - exponential decay
                p.distance *= DISK_CONFIG.decaySpeedFactor;
                p.angle += p.speed * dt * 2; // Accelerate as falls
                p.yOffset *= 0.95; // Flatten toward equator

                // Consumed by black hole
                if (p.distance < this.bhRadius * 0.5) {
                    this.particles.splice(i, 1);
                    if (this.onParticleConsumed) {
                        this.onParticleConsumed();
                    }
                    continue;
                }
            } else {
                // Normal Keplerian orbit
                p.angle += p.speed * dt;

                // Check for decay
                this.checkDecay(p);
            }
        }
    }

    /**
     * Build render list with camera-space lensing
     * Uses the proven formula from demos/js/blackhole.js
     */
    buildRenderList() {
        const renderList = [];
        if (!this.camera || this.particles.length === 0) return renderList;

        const lensingStrength = this.lensingStrength;

        for (const p of this.particles) {
            // World coordinates (flat disk in x-z plane)
            const scaledDist = p.distance * this.scale;
            let x = Math.cos(p.angle) * scaledDist;
            let y = p.yOffset * this.scale;
            let z = Math.sin(p.angle) * scaledDist;

            // Transform to camera space
            const cosY = Math.cos(this.camera.rotationY);
            const sinY = Math.sin(this.camera.rotationY);
            let xCam = x * cosY - z * sinY;
            let zCam = x * sinY + z * cosY;

            const cosX = Math.cos(this.camera.rotationX);
            const sinX = Math.sin(this.camera.rotationX);
            let yCam = y * cosX - zCam * sinX;
            zCam = y * sinX + zCam * cosX;

            // === GRAVITATIONAL LENSING (from blackhole.js) ===
            // Only affects particles behind the BH (zCam > 0)
            if (lensingStrength > 0 && zCam > 0) {
                const currentR = Math.sqrt(xCam * xCam + yCam * yCam);
                const ringRadius = this.bhRadius * DISK_CONFIG.ringRadiusFactor;
                const lensFactor = Math.exp(-currentR / (this.bhRadius * DISK_CONFIG.lensingFalloff));
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
            const perspectiveScale = this.camera.perspective / (this.camera.perspective + zCam);
            const screenX = xCam * perspectiveScale;
            const screenY = yCam * perspectiveScale;

            // Skip particles behind camera
            if (zCam < -this.camera.perspective + 10) continue;

            // Doppler beaming - approaching side brighter
            const velocityDir = Math.cos(p.angle + this.camera.rotationY);
            const doppler = 1 + velocityDir * 0.4;

            // Age-based fade
            const ageRatio = p.age / DISK_CONFIG.particleLifetime;
            const alpha = Math.max(0.3, 1 - Math.pow(ageRatio, 2.5));

            // Color (redshift for falling particles)
            let color = p.baseColor;
            if (p.isFalling) {
                const fallProgress = 1 - (p.distance / this.innerRadius);
                color = {
                    r: Math.round(p.baseColor.r * (1 - fallProgress * 0.5)),
                    g: Math.round(p.baseColor.g * (1 - fallProgress * 0.7)),
                    b: Math.round(p.baseColor.b * (1 - fallProgress * 0.3)),
                };
            }

            renderList.push({
                x: screenX,
                y: screenY,
                z: zCam,
                scale: perspectiveScale,
                color,
                doppler,
                alpha,
                size: p.size,
            });
        }

        // Sort back to front for proper blending
        renderList.sort((a, b) => b.z - a.z);
        return renderList;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Update BH radius - also updates disk bounds since they scale with BH
     * Particles inside the event horizon are consumed; others remain in place
     * and will naturally be replaced by new spawns at correct radii
     */
    updateBHRadius(radius) {
        this.bhRadius = radius;
        // Disk bounds scale with BH radius
        this.innerRadius = this.bhRadius * DISK_CONFIG.innerRadiusMultiplier;
        this.outerRadius = this.bhRadius * DISK_CONFIG.outerRadiusMultiplier;

        // Consume particles swallowed by event horizon (same threshold as update loop)
        const consumeRadius = this.bhRadius * 0.5;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.distance < consumeRadius) {
                this.particles.splice(i, 1);
                if (this.onParticleConsumed) {
                    this.onParticleConsumed();
                }
            }
        }
    }

    render() {
        super.render();

        if (!this.active || !this.camera || this.particles.length === 0) return;

        const cx = this.game.width / 2;
        const cy = this.game.height / 2;
        const baseScale = this.game.baseScale ?? Math.min(this.game.width, this.game.height);
        const renderList = this.buildRenderList();

        Painter.useCtx((ctx) => {
            // Reset transform (bypass Scene3D transforms)
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            for (const item of renderList) {
                const { r, g, b } = item.color;
                const size = baseScale * 0.003 * item.scale;
                if (size < 0.1) continue;

                // Apply Doppler brightness
                const dr = Math.min(255, Math.round(r * item.doppler));
                const dg = Math.min(255, Math.round(g * item.doppler * 0.95));
                const db = Math.min(255, Math.round(b * item.doppler * 0.9));

                const finalAlpha = Math.max(0, Math.min(1, item.alpha * item.doppler));

                // Core particle
                ctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, ${finalAlpha})`;
                ctx.beginPath();
                ctx.arc(cx + item.x, cy + item.y, size / 2, 0, Math.PI * 2);
                ctx.fill();

                // Additive glow for bright/close particles (from blackhole.js)
                if (item.doppler > 1.1 && item.alpha > 0.5) {
                    ctx.globalCompositeOperation = "screen";
                    ctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, ${finalAlpha * 0.4})`;
                    ctx.beginPath();
                    ctx.arc(cx + item.x, cy + item.y, size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalCompositeOperation = "source-over";
                }
            }
        });
    }
}

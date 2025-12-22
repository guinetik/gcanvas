import { GameObject, Painter } from "../../../src/index.js";

/**
 * TidalStream - Simple particle stream from star to black hole
 *
 * Physics:
 * - Particles emitted from star inherit star's velocity
 * - Gravity attracts particles toward black hole (0,0,0)
 * - That's it. The S-shape should emerge naturally.
 */

// Stream-specific config
const STREAM_CONFIG = {
    gravity: 120000,        // Strong gravity (linear falloff G/r)
    maxParticles: 6000,
    particleLifetime: 1200,

    // Velocity inheritance - how much of star's velocity particles get
    // Lower = particles emit more "from" the star, not ahead of it
    velocityInheritance: 0.3,  // 30% inheritance

    // Inward velocity - particles should FALL toward BH, not orbit
    // This is the key to making particles flow INTO the black hole
    inwardVelocity: 5,     // Base inward velocity toward BH (reduced for longer trails)
    inwardSpread: 12,       // Random spread on inward velocity

    // Tangent spread for S-shape - higher = more spread along orbit direction
    tangentSpread: Math.PI * 120,      // Increased for visible S-shape

    // Emission offset: 1.0 = star's BH-facing edge (L1 Lagrange point)
    // Positive = toward BH, negative = away from BH
    emissionOffset: -1 * Math.PI,  // Larger numbers create bigger S-Shape. Negative PI works very well here for some reason makes the animation very cool.

    // Drag factor - removes angular momentum so orbits decay
    // 1.0 = no drag, 0.99 = slight drag, 0.95 = strong drag
    drag: 0.995,

    // Colors: match star shader at emission, cool as they approach BH
    colorHot: { r: 255, g: 95, b: 45 },     // Deep red-orange (matches star shader initial)
    colorCool: { r: 180, g: 40, b: 15 },    // Darker red near BH

    // Particle size
    sizeMin: 1,
    sizeMax: 3,
};

export class TidalStream extends GameObject {
    constructor(game, options = {}) {
        super(game, options);

        this.camera = options.camera;
        this.scene = options.scene;  // Scene reference for screen center
        this.bhRadius = options.bhRadius ?? 50;

        // Callbacks for particle lifecycle
        this.onParticleConsumed = options.onParticleConsumed ?? null;
        this.onParticleCaptured = options.onParticleCaptured ?? null;

        // Particle array - simple flat structure
        this.particles = [];
    }

    init() {
        this.particles = [];
    }

    /**
     * Emit a particle from the star
     *
     * For S-shape formation, particles need TANGENTIAL velocity spread:
     * - Faster particles (more angular momentum) spiral outward
     * - Slower particles (less angular momentum) spiral inward
     * - This creates two opposing tails = S-shape
     *
     * @param {number} x - Star x position
     * @param {number} y - Star y position
     * @param {number} z - Star z position
     * @param {number} vx - Star velocity x
     * @param {number} vy - Star velocity y
     * @param {number} vz - Star velocity z
     * @param {number} starRadius - Current star radius (for position spread)
     * @param {number} starRotation - Current star rotation (for angular offset)
     */
    emit(x, y, z, vx, vy, vz, starRadius, starRotation = 0) {
        if (this.particles.length >= STREAM_CONFIG.maxParticles) return;

        const dist = Math.sqrt(x * x + z * z) || 1;

        // Direction toward BH in x-z plane (unit vector)
        const radialX = -x / dist;
        const radialZ = -z / dist;

        // Emit from star center with spread for visible "bleeding" effect
        // Larger spread = bigger emission hole on the star
        const emitX = x + (Math.random() - 0.5) * starRadius * 0.8;
        const emitY = y + (Math.random() - 0.5) * starRadius * 0.8;
        const emitZ = z + (Math.random() - 0.5) * starRadius * 0.8;

        // Tangent is perpendicular to radial - gives the orbital direction
        const tangentX = -radialZ;
        const tangentZ = radialX;

        // Reduce inherited velocity so gravity can dominate
        const inheritedVx = vx * STREAM_CONFIG.velocityInheritance;
        const inheritedVz = vz * STREAM_CONFIG.velocityInheritance;

        // INWARD velocity - particles flow TOWARD the black hole
        // radialX, radialZ point toward BH (origin)
        const inward = STREAM_CONFIG.inwardVelocity + (Math.random() - 0.5) * STREAM_CONFIG.inwardSpread;

        // Small tangential spread for the S-shape variation
        const tangent = (Math.random() - 0.5) * STREAM_CONFIG.tangentSpread;

        this.particles.push({
            x: emitX,
            y: emitY,
            z: emitZ,

            // Velocity = inherited + INWARD toward BH + small tangent spread
            vx: inheritedVx + radialX * inward + tangentX * tangent,
            vy: vy,
            vz: inheritedVz + radialZ * inward + tangentZ * tangent,

            age: 0,
            size: STREAM_CONFIG.sizeMin + Math.random() * (STREAM_CONFIG.sizeMax - STREAM_CONFIG.sizeMin),

            // Track initial distance for color gradient
            initialDist: dist,
        });
    }

    updateDiskBounds(innerRadius, outerRadius) {
        // Don't override bhRadius here - it's set by updateBHRadius
        // We only care about disk bounds for potential capture detection
        this.diskInnerRadius = innerRadius;
        this.diskOuterRadius = outerRadius;
    }

    /**
     * Update all particles - just gravity
     */
    update(dt) {
        super.update(dt);

        // Consume particles at the BH's visual edge (not inside it)
        // Use 1.0x so particles disappear right at the event horizon
        const accretionRadius = this.bhRadius * 1.1;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.age += dt;

            // Remove old or accreted particles
            if (p.age > STREAM_CONFIG.particleLifetime) {
                this.particles.splice(i, 1);
                continue;
            }

            // Skip physics on first frame - let particle appear at spawn point first
            // This prevents the "jump" where particles move before being rendered
            if (p.age < dt * 1.5) {
                continue;
            }

            // Distance to BH (at origin)
            const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);

            // Accreted by black hole?
            if (dist < accretionRadius) {
                this.particles.splice(i, 1);
                // Trigger callback - feeds the black hole's glow!
                if (this.onParticleConsumed) {
                    this.onParticleConsumed();
                }
                continue;
            }

            // Gravity: F = G/r (linear falloff for better visuals)
            // Linear falloff keeps gravity significant at larger distances
            const gravity = STREAM_CONFIG.gravity / dist;
            const dirX = -p.x * 2 / dist;
            const dirY = -p.y * 2 / dist;
            const dirZ = -p.z * 2 / dist;

            // Apply gravity acceleration
            p.vx += dirX * gravity * dt;
            p.vy += dirY * gravity * dt;
            p.vz += dirZ * gravity * dt;

            // Apply drag - removes angular momentum so particles spiral inward
            // Without drag, particles would orbit forever
            p.vx *= STREAM_CONFIG.drag;
            p.vy *= STREAM_CONFIG.drag;
            p.vz *= STREAM_CONFIG.drag;

            // Move particle
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
        }
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Update BH radius (for accretion check)
     */
    updateBHRadius(radius) {
        this.bhRadius = radius;
    }

    /**
     * Render particles
     * We reset the canvas transform to identity since Scene3D applies its own
     * transforms, and we need absolute screen coordinates for particle rendering.
     */
    render() {
        super.render();

        if (!this.camera || this.particles.length === 0) return;

        // Get the actual canvas transform that Scene3D has set up
        // This is the same approach Sphere3D uses to get screen position
        const ctx = Painter.ctx;
        const transform = ctx.getTransform();
        
        // TidalStream is at world (0,0,0), so Scene3D translated to:
        // scene.x + project(0,0,0).x which is approximately scene.x
        // We need to use this as our center, then add particle projections
        const cx = transform.e;
        const cy = transform.f;

        // Build render list with projection
        const renderList = [];

        // Young particles stay invisible (appear to emerge from star)
        const fadeInTime = 0.05;  // seconds before particles become visible
        const fadeInDuration = 0.1;  // seconds to fade from invisible to full opacity

        for (const p of this.particles) {
            // Skip very young particles - they're "inside" the star
            if (p.age < fadeInTime) continue;

            const projected = this.camera.project(p.x, p.y, p.z);

            // Skip if behind camera
            if (projected.scale <= 0) continue;

            // Fade in young particles (after fadeInTime threshold)
            const fadeInProgress = Math.min(1, (p.age - fadeInTime) / fadeInDuration);

            // Distance from BH for color
            const dist = Math.sqrt(p.x * p.x + p.z * p.z);
            const colorT = Math.min(1, dist / (p.initialDist || 1));

            // Lerp color: cool near BH, hot near initial position
            const color = {
                r: STREAM_CONFIG.colorCool.r + (STREAM_CONFIG.colorHot.r - STREAM_CONFIG.colorCool.r) * colorT,
                g: STREAM_CONFIG.colorCool.g + (STREAM_CONFIG.colorHot.g - STREAM_CONFIG.colorCool.g) * colorT,
                b: STREAM_CONFIG.colorCool.b + (STREAM_CONFIG.colorHot.b - STREAM_CONFIG.colorCool.b) * colorT,
            };

            // Fade with age (fade out at end of life) and fade in at birth
            const fadeOutAlpha = Math.max(0, 1 - p.age / STREAM_CONFIG.particleLifetime);
            const alpha = fadeOutAlpha * fadeInProgress;  // Combine fade-in and fade-out

            // Screen position = center + projected offset
            renderList.push({
                x: cx + projected.x,
                y: cy + projected.y,
                z: projected.z,
                size: p.size * projected.scale,
                color,
                alpha,
            });
        }

        // Sort back to front
        renderList.sort((a, b) => b.z - a.z);

        // Draw particles with reset transform (absolute screen coords)
        Painter.useCtx((ctx) => {
            // Reset to identity matrix - Scene3D has applied transforms we need to bypass
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            ctx.globalCompositeOperation = "lighter";

            for (const item of renderList) {
                const r = Math.round(item.color.r);
                const g = Math.round(item.color.g);
                const b = Math.round(item.color.b);

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${item.alpha})`;
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalCompositeOperation = "source-over";
        });
    }
}

import { GameObject, Painter } from "../../../src/index.js";
import { PI } from "../../../src/math/constants.js";
import { CONFIG } from "./config.js";

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
    maxParticles: 4000,
    particleLifetime: 8,

    // Velocity inheritance - how much of star's velocity particles get
    // Lower = particles emit more "from" the star, not ahead of it
    velocityInheritance: 0.15998746,  // 10% inheritance

    // Inward velocity - particles should FALL toward BH, not orbit
    // This is the key to making particles flow INTO the black hole
    inwardVelocity: 80,     // Base inward velocity toward BH
    inwardSpread: 10,       // Random spread on inward velocity

    // Tangent spread for S-shape (reduced - we want mostly inward flow)
    tangentSpread: 30,

    // Emission offset: 1.0 = star's BH-facing edge (L1 Lagrange point)
    // Positive = toward BH, negative = away from BH
    emissionOffset: PI * -1,  // Emit from the tidal bulge facing the BH

    // Drag factor - removes angular momentum so orbits decay
    // 1.0 = no drag, 0.99 = slight drag, 0.95 = strong drag
    drag: 0.995,

    // Colors: hot near star, cool near BH
    colorHot: { r: 255, g: 240, b: 180 },   // Yellow-white
    colorCool: { r: 200, g: 60, b: 20 },    // Deep red

    // Particle size
    sizeMin: .5,
    sizeMax: 1.5,
};

export class TidalStream extends GameObject {
    constructor(game, options = {}) {
        super(game, options);

        this.camera = options.camera;
        this.bhRadius = options.bhRadius ?? 50;

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
     */
    emit(x, y, z, vx, vy, vz, starRadius) {
        if (this.particles.length >= STREAM_CONFIG.maxParticles) return;

        const dist = Math.sqrt(x * x + z * z) || 1;

        // Direction toward BH in x-z plane
        const radialX = -x / dist;
        const radialZ = -z / dist;

        // Emit from POLE of star facing BH
        const edgeOffset = starRadius * STREAM_CONFIG.emissionOffset;

        // Emit position: offset along radial direction + random spread
        const emitX = x + radialX * edgeOffset + (Math.random() - 0.5) * starRadius * 0.25;
        const emitY = y + (Math.random() - 0.5) * starRadius * 0.3;
        const emitZ = z + radialZ * edgeOffset + (Math.random() - 0.5) * starRadius * 0.25;

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
            x: emitX - tangent,
            y: emitY - tangent,
            z: emitZ + vy,

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
        this.bhRadius = innerRadius;
        //this.bhRadius = outerRadius;
    }

    /**
     * Update all particles - just gravity
     */
    update(dt) {
        super.update(dt);

        const accretionRadius = this.bhRadius * 0.98;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.age += dt;

            // Remove old or accreted particles
            if (p.age > STREAM_CONFIG.particleLifetime) {
                this.particles.splice(i, 1);
                continue;
            }

            // Distance to BH (at origin)
            const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);

            // Accreted?
            if (dist < accretionRadius) {
                this.particles.splice(i, 1);
                continue;
            }

            // Gravity: F = G/r (linear falloff for better visuals)
            // Linear falloff keeps gravity significant at larger distances
            const gravity = STREAM_CONFIG.gravity / dist;
            const dirX = -p.x / dist;
            const dirY = -p.y / dist;
            const dirZ = -p.z / dist;

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

        // Screen center - we'll reset transform and use absolute coords
        const cx = this.game.width / 2;
        const cy = this.game.height / 2;

        // Build render list with projection
        const renderList = [];

        for (const p of this.particles) {
            const projected = this.camera.project(p.x, p.y, p.z);

            // Skip if behind camera
            if (projected.scale <= 0) continue;

            // Distance from BH for color
            const dist = Math.sqrt(p.x * p.x + p.z * p.z);
            const colorT = Math.min(1, dist / (p.initialDist || 1));

            // Lerp color: cool near BH, hot near initial position
            const color = {
                r: STREAM_CONFIG.colorCool.r + (STREAM_CONFIG.colorHot.r - STREAM_CONFIG.colorCool.r) * colorT,
                g: STREAM_CONFIG.colorCool.g + (STREAM_CONFIG.colorHot.g - STREAM_CONFIG.colorCool.g) * colorT,
                b: STREAM_CONFIG.colorCool.b + (STREAM_CONFIG.colorHot.b - STREAM_CONFIG.colorCool.b) * colorT,
            };

            // Fade with age
            const alpha = Math.max(0, 1 - p.age / STREAM_CONFIG.particleLifetime);

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

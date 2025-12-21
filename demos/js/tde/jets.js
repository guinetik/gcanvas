import { GameObject, Painter, Tweenetik, Easing } from "../../../src/index.js";

/**
 * RelativisticJets - Bipolar jets shooting from black hole poles
 *
 * Physics:
 * - Particles ejected along ±Y axis (perpendicular to disk)
 * - Conical spread gives characteristic jet shape
 * - Velocity decreases with distance (deceleration)
 * - Bright blue-white core fading to orange at edges
 */

const JET_CONFIG = {
    // Particle properties
    maxParticles: 4000,
    particleLifetime: 20.0,     // Long lifetime - visible from Earth!
    spawnRate: 100,              // Particles per frame when active

    // Jet geometry
    coneAngle: 0.08,            // Tighter cone for more focused jets
    initialSpeed: 600,          // Ejection speed
    speedVariation: 200,        // Random variation in speed
    deceleration: 0.9995,       // Very low deceleration - continuous stream

    // Jet length - shoots off screen
    maxLength: 1000,             // Way off screen

    // Visual - smaller particles
    colorCore: { r: 200, g: 220, b: 255 },    // Blue-white core
    colorEdge: { r: 255, g: 180, b: 100 },    // Orange edge
    sizeMin: 1.0,
    sizeMax: 2.5,

    // Animation
    activationDuration: .5,    // Longer ramp-up
    deactivationDuration: 5,  // Slow fade out
};

export class RelativisticJets extends GameObject {
    constructor(game, options = {}) {
        super(game, options);

        this.camera = options.camera;
        this.bhRadius = options.bhRadius ?? 50;

        // State
        this.active = false;
        this.intensity = 0;     // 0-1, controls spawn rate and brightness

        // Particle arrays - one for each jet (up and down)
        this.particles = [];
    }

    init() {
        this.particles = [];
    }

    /**
     * Activate jets with intensity ramp-up
     * Uses easeOutExpo for explosive ignition feel
     */
    activate() {
        if (this.active) return;
        this.active = true;
        this.intensity = 0;
        // Explosive start, then sustains - like jets igniting
        Tweenetik.to(this, { intensity: 1 }, JET_CONFIG.activationDuration, Easing.easeOutExpo);
    }

    /**
     * Deactivate jets with fade-out
     */
    deactivate() {
        if (!this.active) return;
        // Slow graceful fade
        Tweenetik.to(this, { intensity: 0 }, JET_CONFIG.deactivationDuration, Easing.easeInQuad, {
            onComplete: () => {
                this.active = false;
            }
        });
    }

    /**
     * Pulse the jets - boost intensity for sustained firing
     */
    pulse() {
        if (!this.active) return;
        this.intensity = 1;
        Tweenetik.to(this, { intensity: 0.6 }, 2.0, Easing.easeOutQuad);
    }

    /**
     * Spawn jet particles from both poles
     */
    spawnParticles() {
        if (this.particles.length >= JET_CONFIG.maxParticles) return;

        const spawnCount = Math.floor(JET_CONFIG.spawnRate * this.intensity);

        for (let i = 0; i < spawnCount; i++) {
            // Spawn from both poles (up and down)
            const direction = Math.random() < 0.5 ? 1 : -1;

            // Conical spread - random angle within cone
            const spreadAngle = Math.random() * JET_CONFIG.coneAngle;
            const azimuth = Math.random() * Math.PI * 2;

            // Convert to velocity components
            const speed = JET_CONFIG.initialSpeed +
                (Math.random() - 0.5) * JET_CONFIG.speedVariation;

            // Y is the main jet direction, x/z give the spread
            const vy = direction * speed * Math.cos(spreadAngle);
            const spreadMag = speed * Math.sin(spreadAngle);
            const vx = spreadMag * Math.cos(azimuth);
            const vz = spreadMag * Math.sin(azimuth);

            // Start position - slightly offset from BH center along jet axis
            const startOffset = this.bhRadius * 0.5;

            this.particles.push({
                x: vx * 0.01,   // Tiny initial spread
                y: direction * startOffset,
                z: vz * 0.01,
                vx,
                vy,
                vz,
                age: 0,
                direction,      // Track which jet (for color)
                size: JET_CONFIG.sizeMin + Math.random() * (JET_CONFIG.sizeMax - JET_CONFIG.sizeMin),
                // Core particles (small spread) are brighter
                isCore: spreadAngle < JET_CONFIG.coneAngle * 0.3,
            });
        }
    }

    update(dt) {
        super.update(dt);

        if (!this.active) return;

        // Spawn new particles
        this.spawnParticles();

        // Update existing particles
        const maxDist = this.bhRadius * JET_CONFIG.maxLength;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;

            // Remove old particles
            if (p.age > JET_CONFIG.particleLifetime) {
                this.particles.splice(i, 1);
                continue;
            }

            // Remove particles that traveled too far
            const dist = Math.abs(p.y);
            if (dist > maxDist) {
                this.particles.splice(i, 1);
                continue;
            }

            // Apply deceleration
            p.vx *= JET_CONFIG.deceleration;
            p.vy *= JET_CONFIG.deceleration;
            p.vz *= JET_CONFIG.deceleration;

            // Move particle
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.z += p.vz * dt;
        }
    }

    /**
     * Build render list with camera projection
     */
    buildRenderList() {
        const renderList = [];
        if (!this.camera || this.particles.length === 0) return renderList;

        for (const p of this.particles) {
            // Transform to camera space
            const cosY = Math.cos(this.camera.rotationY);
            const sinY = Math.sin(this.camera.rotationY);
            let xCam = p.x * cosY - p.z * sinY;
            let zCam = p.x * sinY + p.z * cosY;

            const cosX = Math.cos(this.camera.rotationX);
            const sinX = Math.sin(this.camera.rotationX);
            let yCam = p.y * cosX - zCam * sinX;
            zCam = p.y * sinX + zCam * cosX;

            // Perspective projection
            const perspectiveScale = this.camera.perspective / (this.camera.perspective + zCam);
            const screenX = xCam * perspectiveScale;
            const screenY = yCam * perspectiveScale;

            // Skip particles behind camera
            if (zCam < -this.camera.perspective + 10) continue;

            // Color: core is blue-white, edge is orange
            // Also fade with distance from BH
            const distFactor = Math.min(1, Math.abs(p.y) / (this.bhRadius * JET_CONFIG.maxLength * 0.5));
            const ageFactor = 1 - (p.age / JET_CONFIG.particleLifetime);

            let color;
            if (p.isCore) {
                // Core: bright blue-white
                color = {
                    r: JET_CONFIG.colorCore.r,
                    g: JET_CONFIG.colorCore.g,
                    b: JET_CONFIG.colorCore.b,
                };
            } else {
                // Edge: lerp toward orange with distance
                color = {
                    r: JET_CONFIG.colorCore.r + (JET_CONFIG.colorEdge.r - JET_CONFIG.colorCore.r) * distFactor,
                    g: JET_CONFIG.colorCore.g + (JET_CONFIG.colorEdge.g - JET_CONFIG.colorCore.g) * distFactor,
                    b: JET_CONFIG.colorCore.b + (JET_CONFIG.colorEdge.b - JET_CONFIG.colorCore.b) * distFactor,
                };
            }

            // Alpha based on age, intensity, and distance
            const alpha = ageFactor * this.intensity * (1 - distFactor * 0.5);

            renderList.push({
                x: screenX,
                y: screenY,
                z: zCam,
                scale: perspectiveScale,
                color,
                alpha,
                size: p.size * (p.isCore ? 1.5 : 1),
            });
        }

        // Sort back to front
        renderList.sort((a, b) => b.z - a.z);
        return renderList;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
        this.active = false;
        this.intensity = 0;
    }

    /**
     * Update BH radius
     */
    updateBHRadius(radius) {
        this.bhRadius = radius;
    }

    render() {
        super.render();

        if (!this.active || !this.camera || this.particles.length === 0) return;

        const cx = this.game.width / 2;
        const cy = this.game.height / 2;
        const renderList = this.buildRenderList();

        Painter.useCtx((ctx) => {
            // Reset transform
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = "lighter";

            for (const item of renderList) {
                const { r, g, b } = item.color;

                ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${item.alpha})`;
                ctx.beginPath();
                ctx.arc(cx + item.x, cy + item.y, item.size * item.scale, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalCompositeOperation = "source-over";
        });
    }
}

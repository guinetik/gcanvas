import { GameObject, Sphere3D } from "../../../src/index.js";
import { polarToCartesian } from "../../../src/math/gr.js";
import { CONFIG } from "./config.js";

// Star shader configuration
const STAR_SHADER_CONFIG = {
    useShader: true,
    shaderType: "star",
    shaderUniforms: {
        uStarColor: [1.0, 0.85, 0.3],  // Golden yellow
        uTemperature: 5500,             // K (slightly cooler than Sun)
        uActivityLevel: 0.75,            // Moderate surface activity
    },
};

export class Star extends GameObject {
    constructor(game, options = {}) {
        super(game, options);
        this.mass = options.initialMass ?? CONFIG.star.initialMass;
        this.initialMass = this.mass; // Store for mass ratio calculations
        this.phi = 0;
        // Initialize with reasonable defaults, will be updated by onResize
        this.baseRadius = game.baseScale ? game.baseScale * CONFIG.starRadiusRatio : 20;
        this.currentRadius = this.baseRadius;
        this.orbitalRadius = game.baseScale ? game.baseScale * CONFIG.star.initialOrbitRadius : 200;
        this.initialOrbitalRadius = this.orbitalRadius; // Store initial for decay calculations

        // Velocity tracking for particle emission
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this._prevX = 0;
        this._prevY = 0;
        this._prevZ = 0;

        // Use WebGL shaders for star rendering
        this.useShader = options.useShader ?? true;

        // Cumulative rotation for angular emission detail
        this.rotation = 0;
        // Angular velocity (rad/s) - accumulates smoothly instead of discrete recalc
        this.angularVelocity = CONFIG.star.rotationSpeed ?? 0.5;

        // Tidal disruption state
        this.tidalStretch = 0;      // 0 = spherical, 1 = max elongation
        this.pulsationPhase = 0;    // Oscillation phase
        this.stressLevel = 0;       // Surface chaos level
        this.tidalProgress = 0;     // External tidal progress from FSM (0-1)
    }

    init() {
        // Initialize position on the orbit
        const pos = polarToCartesian(this.orbitalRadius, this.phi);
        this.x = pos.x;
        this.z = pos.z;

        // Initialize prev position to avoid velocity spike on first frame
        this._prevX = this.x;
        this._prevY = this.y || 0;
        this._prevZ = this.z;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;

        // Reset tidal state
        this.tidalStretch = 0;
        this.pulsationPhase = 0;
        this.stressLevel = 0;
        this.tidalProgress = 0;
        this.angularVelocity = CONFIG.star.rotationSpeed ?? 0.5;
        this.rotation = 0;

        this.updateVisual();
    }

    /**
     * Reset velocity tracking (call after position changes like restart)
     */
    resetVelocity() {
        this._prevX = this.x;
        this._prevY = this.y || 0;
        this._prevZ = this.z;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
    }

    updateVisual() {
        const massRatio = this.mass / this.initialMass;

        // === NON-LINEAR SIZE COLLAPSE ===
        // Star resists at first (internal pressure), then collapses rapidly
        // Use a power curve: slow start, rapid end
        const collapseProgress = 1 - massRatio;  // 0 = full, 1 = gone
        const resistanceCurve = Math.pow(collapseProgress, 0.5);  // sqrt = resists early
        const effectiveMassRatio = 1 - resistanceCurve;

        // Base radius with non-linear collapse
        this.currentRadius = this.baseRadius * Math.max(0.05, effectiveMassRatio);

        // Don't update geometry if star is consumed
        if (this.currentRadius <= 0 || this.mass <= 0) {
            return;
        }

        // === TIDAL STRETCH (Spaghettification) ===
        // Disable deformation when star is small/fast - not visible, saves resources
        const dist = Math.sqrt(this.x * this.x + (this.z || 0) * (this.z || 0)) || 1;
        let dirX = -this.x / dist;
        let dirZ = -(this.z || 0) / dist;
        let proximityFactor = 0;
        this.tidalStretch = 0; //disabling for now
        /*if (collapseProgress > 0.1 || this.angularVelocity > 1.3) {
            // Star is collapsing fast or spinning - disable deformation
            this.tidalStretch = 0;
        } else {
            // Normal deformation calculation
             proximityFactor = Math.max(0, 1 - dist / this.initialOrbitalRadius);
            const externalStretch = this.tidalProgress * 0.6;

            this.tidalStretch = Math.max(
                externalStretch,
                proximityFactor * 0.8 + collapseProgress * 0.5
            );
            this.tidalStretch = Math.min(1.5, this.tidalStretch); 
        }*/

        // === BREATHING (Slow, ominous expansion/contraction) ===
        // Very slow rhythm - like a dying star's final gasps
        // No rapid bouncing - this should feel cosmic, not cartoonish
        const breathingAmp = 0.03 * (1 - collapseProgress * 0.5);  // Subtle, weakens as disrupted
        const breathing = Math.sin(this.pulsationPhase) * breathingAmp;

        // Apply breathing to radius (very subtle)
        this.currentRadius *= (1 + breathing);

        // === STRESS LEVEL ===
        // Combines proximity and mass loss - drives surface chaos
        // Use power curve so stress stays LOW for most of disruption, then ramps up sharply
        // This gives more time to see the red-orange star with surface chaos
        const rawStress = proximityFactor * 0.4 + collapseProgress * 0.6;  // Reduced weights
        // Power of 3 = stays low longer, ramps up sharply at the end
        this.stressLevel = Math.min(1, Math.pow(rawStress, 2.5));

        // === ACTIVITY & ROTATION ===
        const activityLevel = 0.3 + this.stressLevel * 0.7;  // 0.3 -> 1.0

        // Angular momentum conservation: shrinking = faster spin
        const baseRotationSpeed = CONFIG.star.rotationSpeed ?? 0.5;
        const spinUpFactor = 1 / Math.max(0.2, effectiveMassRatio);  // Inverse of size
        const rotationSpeed = Math.min(10, baseRotationSpeed * spinUpFactor);

        // === COLOR SHIFT ===
        // Start deep red-orange, transition through orange → yellow → white
        // This lets us see the tidal chaos on a colorful surface before brightening
        //
        // Phase 1 (stress 0-0.5): Deep red-orange, surface chaos building
        // Phase 2 (stress 0.5-0.8): Shift to orange-yellow, intense activity
        // Phase 3 (stress 0.8-1.0): Rapid shift to white-hot, death throes

        // Temperature increases with stress (tidal heating is real physics!)
        const tempShift = this.stressLevel * this.stressLevel * 2500;  // Up to +2500K at max stress
        const temperature = (CONFIG.star.temperature ?? 3800) + tempShift;

        // Color transition: red-orange → orange → yellow → white
        // R stays high, G increases with stress, B only increases late
        let r = 1.0;
        let g, b;

        if (this.stressLevel < 0.5) {
            // Phase 1: Deep red-orange → orange (stress 0-0.5)
            const t = this.stressLevel * 2;  // 0 to 1 over this phase
            g = 0.35 + t * 0.25;  // 0.35 → 0.6
            b = 0.15 + t * 0.1;   // 0.15 → 0.25
        } else if (this.stressLevel < 0.8) {
            // Phase 2: Orange → yellow-orange (stress 0.5-0.8)
            const t = (this.stressLevel - 0.5) / 0.3;  // 0 to 1
            g = 0.6 + t * 0.2;    // 0.6 → 0.8
            b = 0.25 + t * 0.1;   // 0.25 → 0.35
        } else {
            // Phase 3: Yellow-orange → white-hot (stress 0.8-1.0)
            const t = (this.stressLevel - 0.8) / 0.2;  // 0 to 1
            g = 0.8 + t * 0.15;   // 0.8 → 0.95
            b = 0.35 + t * 0.5;   // 0.35 → 0.85 (rapid blue increase = white)
        }

        const stressColor = [r, g, b];

        if (!this.visual) {
            this.visual = new Sphere3D(this.currentRadius, {
                color: CONFIG.star.color,
                camera: this.game.camera,
                useShader: this.useShader,
                shaderType: "star",
                shaderUniforms: {
                    uStarColor: stressColor,
                    uTemperature: temperature,
                    uActivityLevel: activityLevel,
                    uRotationSpeed: rotationSpeed,
                    uTidalStretch: this.tidalStretch,
                    uStretchDirX: dirX,
                    uStretchDirZ: dirZ,
                    uStressLevel: this.stressLevel,
                },
            });
        } else {
            this.visual.radius = this.currentRadius;
            if (this.visual.useShader) {
                this.visual.setShaderUniforms({
                    uStarColor: stressColor,
                    uTemperature: temperature,
                    uActivityLevel: activityLevel,
                    uRotationSpeed: rotationSpeed,
                    uTidalStretch: this.tidalStretch,
                    uStretchDirX: dirX,
                    uStretchDirZ: dirZ,
                    uStressLevel: this.stressLevel,
                });
            }
            this.visual._generateGeometry();
        }
    }

    onResize(baseRadius, orbitalRadius) {
        this.baseRadius = baseRadius;
        this.orbitalRadius = orbitalRadius;
        this.initialOrbitalRadius = orbitalRadius;

        // Update position to match new orbital radius
        const pos = polarToCartesian(this.orbitalRadius, this.phi);
        this.x = pos.x;
        this.z = pos.z;

        this.updateVisual();
    }

    update(dt) {
        super.update(dt);

        // Calculate velocity from position change
        const currentY = this.y || 0;
        if (dt > 0) {
            this.velocityX = (this.x - this._prevX) / dt;
            this.velocityY = (currentY - this._prevY) / dt;
            this.velocityZ = (this.z - this._prevZ) / dt;
        }

        // Store current position for next frame
        this._prevX = this.x;
        this._prevY = currentY;
        this._prevZ = this.z;

        // Update self-rotation with smooth angular momentum conservation
        // As star shrinks, angular velocity increases (I*ω = constant)
        // But cap it when star is tiny (< 10% radius) - no point wasting frames
        const radiusRatio = this.currentRadius / this.baseRadius;

        if (radiusRatio > 0.1) {
            // Base rotation speed from config
            const baseSpeed = CONFIG.star.rotationSpeed ?? 0.5;

            // Spin-up factor based on tidal progress (FSM-driven, smooth)
            // Only significant spin-up during actual disruption (mass loss)
            const massRatio = (this.mass || 1) / (this.initialMass || 1);
            const massLoss = 1 - massRatio;  // 0 = no loss, 1 = fully consumed

            // Gentle spin-up from tidal stress, moderate spin-up from mass loss
            // tidalProgress: 0-1 during stretch, 1 during disrupt
            // massLoss: 0 during stretch, 0-1 during disrupt
            const tidalSpinUp = 1 + this.tidalProgress * 0.3;  // Up to 1.3x from tidal
            const collapseSpinUp = 1 + massLoss * 1.5;  // Up to 2.5x from collapse

            const targetVelocity = baseSpeed * tidalSpinUp * collapseSpinUp;

            // Very slow approach to target - no sudden jumps
            const accelRate = 0.001;
            this.angularVelocity += (targetVelocity - this.angularVelocity) * accelRate * dt;

            // Hard cap on max spin (2.5 rad/s - calm, cosmic feel)
            this.angularVelocity = Math.min(2.5, this.angularVelocity);
        }
        // else: keep current velocity, don't accelerate tiny remnant

        this.rotation += this.angularVelocity * dt;

        // Update breathing phase - slow, cosmic rhythm (0.3-0.5 Hz)
        const breathingFreq = 0.3 + this.stressLevel * 0.2;
        this.pulsationPhase += breathingFreq * dt * Math.PI * 2;

        this.updateVisual();
    }

    render() {
        super.render();
        if (this.mass > 0 && this.visual) {
            // Sync visual position with star position
            this.visual.x = this.x;
            this.visual.y = this.y || 0;
            this.visual.z = this.z;
            this.visual.render();
        }
    }
}

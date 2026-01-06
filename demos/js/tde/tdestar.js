import { GameObject, Sphere3D } from "../../../src/index.js";
import { polarToCartesian } from "../../../src/math/gr.js";
import { CONFIG } from "./config.js";

// Performance tuning: reduce update frequency for expensive operations
const PERF_CONFIG = {
    geometryUpdateThreshold: 0.02,  // Only regenerate geometry if radius changes by 2%
    uniformUpdateInterval: 2,        // Update shader uniforms every N frames
    breathingEnabled: true,          // Toggle breathing effect
    stressColorEnabled: true,        // Toggle dynamic color shifts
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
        this.tidalFlare = 0;        // 0-1, sudden brightness burst at disruption start
        this.tidalWobble = 0;       // 0-1, violent geometry wobble during trauma

        // Performance optimization state
        this._frameCount = 0;
        this._lastGeometryRadius = 0;
        this._cachedUniforms = null;
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
        this.tidalFlare = 0;
        this.tidalWobble = 0;
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
        // Use sqrt for resistance curve (star resists early, then collapses)
        const collapseProgress = 1 - massRatio;
        const effectiveMassRatio = 1 - Math.sqrt(collapseProgress);

        // Base radius with non-linear collapse
        this.currentRadius = this.baseRadius * Math.max(0.05, effectiveMassRatio);

        // Don't update if star is consumed
        if (this.currentRadius <= 0 || this.mass <= 0) {
            return;
        }

        // === TIDAL STRETCH (Simplified) ===
        const zVal = this.z || 0;
        const distSq = this.x * this.x + zVal * zVal;
        const dist = Math.sqrt(distSq) || 1;
        const invDist = 1 / dist;
        
        // Direction toward black hole (unit vector)
        const dirX = -this.x * invDist;
        const dirZ = -zVal * invDist;
        
        // Proximity factor: closer to BH = more stretch
        const proximityFactor = Math.max(0, 1 - dist / this.initialOrbitalRadius);
        
        // Simplified stretch calculation
        if (collapseProgress > 0.8) {
            this.tidalStretch = (1 - collapseProgress) * 2;
        } else {
            this.tidalStretch = Math.min(1.8, this.tidalProgress * 1.2 + proximityFactor * 0.5);
        }

        // === BREATHING (Optional, can be disabled for performance) ===
        if (PERF_CONFIG.breathingEnabled) {
            const breathingAmp = 0.03 * (1 - collapseProgress * 0.5);
            this.currentRadius *= (1 + Math.sin(this.pulsationPhase) * breathingAmp);
        }

        // === STRESS LEVEL (Simplified power curve) ===
        const rawStress = proximityFactor * 0.4 + collapseProgress * 0.6;
        this.stressLevel = Math.min(1, rawStress * rawStress * rawStress);  // Cubic approximation

        // === ACTIVITY & ROTATION ===
        const activityLevel = 0.3 + this.stressLevel * 0.7;
        const baseRotationSpeed = CONFIG.star.rotationSpeed ?? 0.5;
        const rotationSpeed = Math.min(10, baseRotationSpeed / Math.max(0.2, effectiveMassRatio));

        // === COLOR SHIFT (Simplified linear interpolation) ===
        let r = 1.0, g, b;
        const stress = this.stressLevel;
        
        if (PERF_CONFIG.stressColorEnabled) {
            // Simplified color: lerp from red-orange to white based on stress
            g = 0.35 + stress * 0.6;   // 0.35 → 0.95
            b = 0.15 + stress * 0.7;   // 0.15 → 0.85
        } else {
            g = 0.5;
            b = 0.2;
        }

        const stressColor = [r, g, b];
        this.currentColor = stressColor;

        // Temperature calculation
        const temperature = (CONFIG.star.temperature ?? 3800) + stress * stress * 2500;

        // === VISUAL UPDATE ===
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
                    uTidalFlare: this.tidalFlare,
                    uTidalWobble: this.tidalWobble,
                },
            });
            this._lastGeometryRadius = this.currentRadius;
        } else {
            this.visual.radius = this.currentRadius;
            
            // Only update shader uniforms every N frames
            this._frameCount++;
            if (this._frameCount >= PERF_CONFIG.uniformUpdateInterval) {
                this._frameCount = 0;
                
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
                        uTidalFlare: this.tidalFlare,
                        uTidalWobble: this.tidalWobble,
                    });
                }
            }
            
            // Only regenerate geometry if radius changed significantly
            const radiusChange = Math.abs(this.currentRadius - this._lastGeometryRadius) / this._lastGeometryRadius;
            if (radiusChange > PERF_CONFIG.geometryUpdateThreshold) {
                this.visual._generateGeometry();
                this._lastGeometryRadius = this.currentRadius;
            }
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

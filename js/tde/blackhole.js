import { GameObject, Sphere3D, Painter, Easing } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

export class BlackHole extends GameObject {
    constructor(game, options = {}) {
        super(game, options);
        this.mass = options.initialMass ?? CONFIG.blackHole.initialMass;
        this.baseRadius = game.baseScale ? game.baseScale * CONFIG.bhRadiusRatio : 50;
        this.currentRadius = this.baseRadius;

        // Awakening state - BH starts dormant, wakes up as it feeds
        this.awakeningLevel = 0;    // 0 = dormant (pure black), 1 = fully awake
        this.feedingPulse = 0;      // Temporary glow boost when consuming
        this.totalConsumed = 0;     // Track total mass consumed

        // Dynamic growth animation
        this.growthSpurt = 0;       // Overshoot when consuming (decays to 0)
        this.breathPhase = 0;       // Oscillation phase for breathing effect
        this.targetRadius = this.baseRadius;  // Smooth radius target

        // Rotation - black holes spin!
        this.rotation = 0;
        this.rotationSpeed = options.rotationSpeed ?? 2.9; // Slow, ominous spin

        // Use WebGL shaders for rendering
        this.useShader = options.useShader ?? true;
    }

    init() {
        this.updateVisual();
    }

    /**
     * Add mass from consumed particles - triggers awakening and pulse
     *
     * @param {number} amount - Amount of mass to add
     *
     * Note: Feeding pulse is only triggered before the stable phase.
     * Once stabilizing, particles can still be consumed but won't
     * cause the visual pulse effect.
     */
    addConsumedMass(amount) {
        this.totalConsumed += amount;

        // Skip pulse effects if we're in the stable phase
        if (this.isStabilizing) {
            return;
        }

        // Awakening increases as BH feeds (slow ramp up)
        const awakeningProgress = Math.min(1, this.totalConsumed * 0.1);
        this.awakeningLevel = Math.max(this.awakeningLevel, awakeningProgress);

        // Feeding pulse - temporary glow boost
        this.feedingPulse = Math.min(1, this.feedingPulse + amount * 0.2);

        // Growth spurt - overshoot effect when consuming
        // More dramatic spurts as awakening increases
        const spurtIntensity = 0.03 + this.awakeningLevel * 0.05;
        this.growthSpurt = Math.min(0.15, this.growthSpurt + amount * spurtIntensity);
    }

    /**
     * Reset to dormant state
     */
    resetAwakening() {
        this.awakeningLevel = 0;
        this.feedingPulse = 0;
        this.totalConsumed = 0;
        this.rotation = 0;
        this.growthSpurt = 0;
        this.breathPhase = 0;
        this.isStabilizing = false;  // Reset stabilization state
    }

    updateVisual() {
        // Calculate how much mass has been absorbed (0 = none, 1 = full star)
        const massAbsorbed = Math.max(0, this.mass - CONFIG.blackHole.initialMass);
        const absorptionProgress = massAbsorbed / CONFIG.star.initialMass;

        // Apply easing to make growth feel more organic
        // easeOutCubic: rapid initial growth that slows as it fills
        const easedProgress = Easing.easeOutCubic(absorptionProgress);

        // Base radius from absorption with easing
        const baseScale = this.baseRadius / CONFIG.bhRadiusRatio;
        const radiusFraction = CONFIG.bhRadiusRatio +
            easedProgress * (CONFIG.bhFinalRadiusRatio - CONFIG.bhRadiusRatio);
        this.targetRadius = baseScale * radiusFraction;

        // Breathing oscillation - subtle when dormant, stronger when awake
        const breathAmplitude = 0.01 + this.awakeningLevel * 0.02 + this.feedingPulse * 0.03;
        const breathSpeed = 1.5 + this.awakeningLevel * 0.5;  // Faster when active
        const breathOffset = Math.sin(this.breathPhase * breathSpeed) * breathAmplitude;

        // Growth spurt overshoot effect (elastic rebound)
        const spurtOffset = this.growthSpurt * (1 + Math.sin(this.breathPhase * 8) * 0.3);

        // Combine all effects
        this.currentRadius = this.targetRadius * (1 + breathOffset + spurtOffset);

        if (this.currentRadius <= 0) {
            this.currentRadius = this.baseRadius;
        }

        // Edge brightness increases with awakening
        const awakeFactor = this.awakeningLevel;
        const pulseFactor = this.feedingPulse;

        // For Canvas 2D fallback - gradient rendering
        // Dormant: pure black edges (#101010)
        // Awake: warmer edges with hint of orange/red glow
        const edgeBase = 16 + Math.round(awakeFactor * 24 + pulseFactor * 16); // 16-56
        const edgeR = Math.min(255, edgeBase + Math.round(awakeFactor * 40 + pulseFactor * 60));
        const edgeG = Math.min(255, edgeBase + Math.round(awakeFactor * 20 + pulseFactor * 30));
        const edgeB = edgeBase;

        const midBase = 8 + Math.round(awakeFactor * 12 + pulseFactor * 8);
        const midR = Math.min(255, midBase + Math.round(awakeFactor * 20 + pulseFactor * 30));
        const midG = Math.min(255, midBase + Math.round(awakeFactor * 10 + pulseFactor * 15));
        const midB = midBase;

        const gradient = Painter.colors.radialGradient(
            0, 0, 0.01 * this.currentRadius,
            0, 0, this.currentRadius,
            [
                { offset: 0, color: "#000" },
                { offset: 0.5, color: "#000" },
                { offset: 0.85, color: `rgb(${midR}, ${midG}, ${midB})` },
                { offset: 1, color: `rgb(${edgeR}, ${edgeG}, ${edgeB})` },
            ]
        );

        if (!this.core) {
            this.core = new Sphere3D(this.currentRadius, {
                color: gradient,
                camera: this.game.camera,
                stroke: null,   // No wireframe
                debug: false,
                segments: 32,   // Smoother sphere
                // WebGL shader options
                useShader: this.useShader,
                shaderType: "blackHole",
                shaderUniforms: {
                    uAwakeningLevel: awakeFactor,
                    uFeedingPulse: pulseFactor,
                    uRotation: this.rotation,
                },
            });
        } else {
            this.core.radius = this.currentRadius;
            this.core.color = gradient;  // Keep gradient for Canvas 2D fallback
            // Update shader uniforms
            if (this.core.useShader) {
                this.core.setShaderUniforms({
                    uAwakeningLevel: awakeFactor,
                    uFeedingPulse: pulseFactor,
                    uRotation: this.rotation,
                });
            }
            this.core._generateGeometry();
        }
    }

    update(dt) {
        super.update(dt);

        // Animate breathing phase
        this.breathPhase += dt * Math.PI * 2;  // Full cycle per second

        // Spin the black hole - rotation speeds up when feeding
        const spinMultiplier = 1 + this.feedingPulse * 2 + this.awakeningLevel * 0.5;
        this.rotation += this.rotationSpeed * spinMultiplier * dt;

        // Decay feeding pulse over time
        if (this.feedingPulse > 0) {
            this.feedingPulse = Math.max(0, this.feedingPulse - dt * 1.5);
        }

        // Decay growth spurt with elastic damping
        if (this.growthSpurt > 0) {
            // Fast initial decay, slows down (feels like elastic settling)
            const decayRate = 3 + this.growthSpurt * 5;  // Faster when larger
            this.growthSpurt = Math.max(0, this.growthSpurt - dt * decayRate);
        }

        // Decay awakening level when stabilizing (slow cool-down)
        // Minimum level is 0.3 - never goes fully dormant after feeding
        if (this.isStabilizing && this.awakeningLevel > 0.3) {
            this.awakeningLevel = Math.max(0.3, this.awakeningLevel - dt * 0.15);
        }

        this.updateVisual();
    }

    /**
     * Start the stabilization phase - black hole calms down
     */
    startStabilizing() {
        this.isStabilizing = true;
    }

    /**
     * Reset stabilization state
     */
    resetStabilizing() {
        this.isStabilizing = false;
    }

    onResize(baseRadius) {
        this.baseRadius = baseRadius;
        this.updateVisual();
    }

    render() {
        super.render();
        this.core.render();
    }
}

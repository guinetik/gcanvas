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
        // Radius scales with mass - star shrinks as it loses mass
        this.currentRadius = this.baseRadius * (this.mass / this.initialMass);

        // Don't update geometry if star is consumed
        if (this.currentRadius <= 0) {
            return;
        }

        // Calculate activity level based on disruption (increases as star is torn apart)
        const massRatio = this.mass / this.initialMass;
        const activityLevel = 0.4 + (1 - massRatio) * 0.6;  // 0.4 -> 1.0 as star disrupts

        // Rotation speed increases as star disrupts (tidal forces spin it up)
        // Conservation of angular momentum: as star shrinks, it spins faster
        const baseRotationSpeed = CONFIG.star.rotationSpeed ?? 0.5;
        const spinUpFactor = 1 + (1 - massRatio) * 4;  // Up to 5x faster when disrupted
        const rotationSpeed = baseRotationSpeed * spinUpFactor;

        if (!this.visual) {
            this.visual = new Sphere3D(this.currentRadius, {
                color: CONFIG.star.color,
                camera: this.game.camera,
                // WebGL shader options
                useShader: this.useShader,
                shaderType: "star",
                shaderUniforms: {
                    uStarColor: [1.0, 0.85, 0.3],  // Golden yellow
                    uTemperature: CONFIG.star.temperature ?? 5500,
                    uActivityLevel: activityLevel,
                    uRotationSpeed: rotationSpeed,
                },
            });
        } else {
            this.visual.radius = this.currentRadius;
            // Update shader uniforms with current activity level and rotation
            if (this.visual.useShader) {
                this.visual.setShaderUniforms({
                    uActivityLevel: activityLevel,
                    uRotationSpeed: rotationSpeed,
                });
            }
            // Regenerate geometry with new radius (for Canvas 2D fallback)
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

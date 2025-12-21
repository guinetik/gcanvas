/**
 * LensedStarfield - Starfield with gravitational lensing around black hole
 *
 * Extends the base StarField to add camera-space lensing effects:
 * - Stars behind the black hole are displaced radially outward
 * - Creates the "Einstein ring" effect where light bends around massive objects
 * - Lensing strength can be animated for dramatic effect
 */
import { Painter } from "../../../src/index.js";
import { applyGravitationalLensing } from "../../../src/math/gr.js";
import { StarField } from "../blackhole/starfield.obj.js";

const LENSING_CONFIG = {
    // How far the lensing effect reaches in screen pixels
    effectRadiusPixels: 500,

    // Base strength (multiplied by lensingStrength property)
    baseStrength: 200,

    // Falloff exponent - higher = tighter effect around BH
    falloff: 0.008,

    // Minimum screen distance to apply lensing (avoid division issues)
    minDistance: 5,
};

export class LensedStarfield extends StarField {
    /**
     * @param {Game} game
     * @param {Object} options
     * @param {Camera3D} options.camera
     * @param {BlackHole} options.blackHole - Reference to black hole for radius
     * @param {number} options.starCount
     */
    constructor(game, options = {}) {
        super(game, options);

        // Reference to black hole (for radius and position)
        this.blackHole = options.blackHole ?? null;

        // Animated lensing strength (0 = off, 1 = full)
        // Allows ramping up during disruption phases
        this.lensingStrength = options.lensingStrength ?? 1.0;
    }

    /**
     * Update black hole reference (if set after construction)
     */
    setBlackHole(bh) {
        this.blackHole = bh;
    }

    /**
     * Override render to apply gravitational lensing
     */
    render() {
        // Skip parent render - we do our own with lensing
        if (!this.camera) return;

        const cx = this.game.width / 2;
        const cy = this.game.height / 2;
        const time = performance.now() / 1000;

        // Lensing parameters (strength scales with lensingStrength property)
        const lensingPower = LENSING_CONFIG.baseStrength * this.lensingStrength;
        const effectRadius = LENSING_CONFIG.effectRadiusPixels;

        Painter.useCtx((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            for (const star of this.stars) {
                // === CAMERA SPACE TRANSFORMATION ===
                const cosY = Math.cos(this.camera.rotationY);
                const sinY = Math.sin(this.camera.rotationY);
                let xCam = star.x * cosY - star.z * sinY;
                let zCam = star.x * sinY + star.z * cosY;

                const cosX = Math.cos(this.camera.rotationX);
                const sinX = Math.sin(this.camera.rotationX);
                let yCam = star.y * cosX - zCam * sinX;
                zCam = star.y * sinX + zCam * cosX;

                // Skip stars behind camera
                if (zCam < -this.camera.perspective + 50) continue;

                // === PERSPECTIVE PROJECTION ===
                const perspectiveScale = this.camera.perspective / (this.camera.perspective + zCam);
                let screenX = xCam * perspectiveScale;
                let screenY = yCam * perspectiveScale;

                // === GRAVITATIONAL LENSING (screen space) ===
                // Only apply to stars "behind" the black hole (zCam > 0)
                if (lensingPower > 0 && zCam > 0) {
                    const lensed = applyGravitationalLensing(
                        screenX, screenY,
                        effectRadius,
                        lensingPower,
                        LENSING_CONFIG.falloff,
                        LENSING_CONFIG.minDistance
                    );
                    screenX = lensed.x;
                    screenY = lensed.y;
                }

                // Final screen position
                const finalX = cx + screenX;
                const finalY = cy + screenY;

                // Viewport cull
                if (finalX < -30 || finalX > this.game.width + 30 ||
                    finalY < -30 || finalY > this.game.height + 30) continue;

                // === TWINKLE ===
                const val = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
                const alpha = 0.6 + 0.4 * val;
                if (alpha < 0.1) continue;

                // === DRAW ===
                const finalSize = star.type.baseSize * star.baseScale * perspectiveScale;
                const sprite = this.sprites.get(star.type.type);
                if (!sprite) continue;

                ctx.globalAlpha = alpha;
                ctx.drawImage(
                    sprite,
                    finalX - finalSize * 2,
                    finalY - finalSize * 2,
                    finalSize * 4,
                    finalSize * 4
                );
            }

            ctx.globalAlpha = 1.0;
        });
    }
}

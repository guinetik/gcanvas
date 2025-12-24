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
    effectRadiusPixels: 600,

    // Base strength (multiplied by lensingStrength property)
    baseStrength: 200,

    // Falloff exponent - higher = tighter effect around BH
    falloff: 0.008,

    // Minimum screen distance to apply lensing (avoid division issues)
    minDistance: 5,

    // Occlusion radius multiplier (stars within BH radius * this are hidden)
    // The dark shadow region extends to ~2.6x the event horizon (photon sphere)
    occlusionMultiplier: 2.6,
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

        // Project black hole position once for all stars
        // This is crucial when camera has moved (e.g., following the star)
        const bhProjected = this.camera.project(0, 0, 0);
        const bhScreenX = bhProjected.x;
        const bhScreenY = bhProjected.y;

        Painter.useCtx((ctx) => {
            ctx.globalCompositeOperation = "source-over";

            for (const star of this.stars) {
                // === USE CAMERA.PROJECT FOR PROPER POSITION HANDLING ===
                // This accounts for camera position (translation) not just rotation
                const projected = this.camera.project(star.x, star.y, star.z);

                // Skip stars behind camera
                if (projected.scale <= 0) continue;

                let screenX = projected.x;
                let screenY = projected.y;
                const perspectiveScale = projected.scale;

                // === GRAVITATIONAL LENSING (relative to BH screen position) ===
                // Only apply to stars "behind" the black hole (positive z after projection)
                if (lensingPower > 0 && projected.z > 0) {
                    // Calculate position relative to BH's screen position
                    const relX = screenX - bhScreenX;
                    const relY = screenY - bhScreenY;

                    const lensed = applyGravitationalLensing(
                        relX, relY,
                        effectRadius,
                        lensingPower,
                        LENSING_CONFIG.falloff,
                        LENSING_CONFIG.minDistance
                    );

                    // Transform back to screen space
                    screenX = lensed.x + bhScreenX;
                    screenY = lensed.y + bhScreenY;
                }

                // === OCCLUSION CHECK (relative to BH screen position) ===
                // Hide stars that fall within the black hole's occlusion radius
                if (this.blackHole) {
                    const bhScreenRadius = this.blackHole.currentRadius * LENSING_CONFIG.occlusionMultiplier;
                    const dxBH = screenX - bhScreenX;
                    const dyBH = screenY - bhScreenY;
                    const distFromBH = Math.sqrt(dxBH * dxBH + dyBH * dyBH);
                    if (distFromBH < bhScreenRadius) continue;
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

import { Scene3D } from "../../../src/index.js";
import { BlackHole } from "./blackhole.js";
import { Star } from "./tdestar.js";
import { TidalStream } from "./tidalstream.js";
import { AccretionDisk } from "./accretiondisk.js";
import { RelativisticJets } from "./jets.js";
import { CONFIG } from "./config.js";

/**
 * BlackHoleScene - Main 3D scene containing the TDE visualization
 *
 * Z-Order Rendering Rules:
 * 1. TidalStream (particles) always on top of both Star and BlackHole
 * 2. Star position relative to BlackHole changes based on camera depth
 * 3. When star in front of BH: star > BH
 * 4. When star behind BH: BH > star
 *
 * Z-Index Buckets (lower = renders first = behind):
 * - disk: 10 (accretion disk - always at back)
 * - starBack: 15 (star when behind BH)
 * - blackHole: 20 (center reference)
 * - starFront: 25 (star when in front of BH)
 * - stream: 30 (particles - always on top of star and BH)
 * - jets: 40 (always on top)
 *
 * @extends Scene3D
 */
export class BlackHoleScene extends Scene3D {
    constructor(game, options = {}) {
        super(game, options);
        // Camera is passed via options and handled by Scene3D

        /**
         * Z-index buckets for render ordering
         * Scene3D sorts by zIndex first (lower renders first/behind),
         * then uses camera depth as tie-breaker
         *
         * Layering (simple):
         * - Particles always on top of star and BH (no jarring transitions)
         * - Star moves in front of/behind BH based on camera view
         */
        this.Z = {
            disk: 10,        // AccretionDisk: always at back
            starBack: 15,    // Star when behind BH
            blackHole: 20,   // BlackHole: center reference
            starFront: 25,   // Star when in front of BH
            stream: 30,      // TidalStream: always on top of star and BH
            jets: 40,        // Jets: always on top
        };
    }

    init() {
        // Z-order buckets: lower draws first, equal uses depth
        // IMPORTANT: Set zIndex AFTER add() because ZOrderedCollection.add()
        // overwrites zIndex with array index

        // Add BlackHole at (0,0,0)
        this.bh = new BlackHole(this.game);
        this.add(this.bh);
        this.bh.zIndex = this.Z.blackHole;  // Set AFTER add()

        // Add a Star orbiting the black hole
        this.star = new Star(this.game);
        this.add(this.star);
        this.star.zIndex = this.Z.starFront;  // Set AFTER add(), will be updated per-frame

        // Add accretion disk (starts inactive)
        this.disk = new AccretionDisk(this.game, {
            camera: this.game.camera,
            bhRadius: this.game.baseScale * CONFIG.bhRadiusRatio,
            bhMass: CONFIG.blackHole.initialMass,
            onParticleConsumed: () => {
                this.bh.addConsumedMass(0.1); // Disk particles worth more
            },
        });
        this.add(this.disk);
        this.disk.zIndex = this.Z.disk;  // Set AFTER add()

        // Add tidal stream for particles
        // When particles are consumed, feed the black hole
        // When particles circularize, transfer to accretion disk
        this.stream = new TidalStream(this.game, {
            camera: this.game.camera,
            bhRadius: this.game.baseScale * CONFIG.bhRadiusRatio,
            diskInnerRadius: this.disk.innerRadius,
            diskOuterRadius: this.disk.outerRadius,
            onParticleConsumed: () => {
                this.bh.addConsumedMass(0.05); // Each particle adds small amount
            },
            onParticleCaptured: (p) => {
                this.disk.captureParticle(p);
            },
        });
        this.add(this.stream);
        this.stream.zIndex = this.Z.stream;  // Set AFTER add()

        // Add relativistic jets (activated during flare phase)
        this.jets = new RelativisticJets(this.game, {
            camera: this.game.camera,
            bhRadius: this.game.baseScale * CONFIG.bhRadiusRatio,
        });
        this.add(this.jets);
        this.jets.zIndex = this.Z.jets;  // Set AFTER add()

        // Mark z-order as dirty to ensure initial sort
        if (this._collection) {
            this._collection._zOrderDirty = true;
        }
    }

    update(dt) {
        super.update(dt);

        // Sync all particle systems with current BH radius (grows as it feeds)
        if (this.bh) {
            if (this.stream) {
                this.stream.updateBHRadius(this.bh.currentRadius);
            }
            if (this.disk) {
                this.disk.updateBHRadius(this.bh.currentRadius);
                // Also sync stream's disk bounds for capture detection
                if (this.stream) {
                    this.stream.updateDiskBounds(this.disk.innerRadius, this.disk.outerRadius);
                }
            }
            if (this.jets) {
                this.jets.updateBHRadius(this.bh.currentRadius);
            }
        }

        // Note: Z-order update is called from TDEDemo.update() AFTER star position
        // is updated, to ensure we use the current frame's position, not the previous frame's.
    }

    /**
     * Update star's z-index based on its depth relative to the black hole
     *
     * Dynamic z-ordering:
     * - When star in front of BH: star renders on top of BH
     * - When star behind BH: BH renders on top of star
     * - Stream (particles) always stays on top of both
     *
     * Camera3D.project() returns z as depth after rotation:
     * - Lower z = closer to camera
     * - Higher z = farther from camera
     *
     * IMPORTANT: Must be called AFTER star position is updated each frame.
     */
    updateStarZOrder() {
        if (!this.star || !this.bh || !this.game?.camera) {
            return;
        }

        const camera = this.game.camera;

        // Project star position to get its depth after camera rotation
        const projStar = camera.project(
            this.star.x || 0,
            this.star.y || 0,
            this.star.z || 0
        );

        // Black hole is always at origin (0, 0, 0)
        const projBH = camera.project(0, 0, 0);

        // Star is "in front" if its depth is LESS than BH's depth
        const starInFront = projStar.z < projBH.z;

        // Update star's z-index
        const newZIndex = starInFront ? this.Z.starFront : this.Z.starBack;

        if (this.star.zIndex !== newZIndex) {
            this.star.zIndex = newZIndex;
            // Mark ordering dirty so Scene3D resort happens this frame
            if (this._collection) {
                this._collection._zOrderDirty = true;
            }
        }
    }

    onResize() {
        const game = this.game;
        if (this.bh) {
            this.bh.onResize(game.baseScale * CONFIG.bhRadiusRatio);
        }
        if (this.star) {
            this.star.onResize(
                game.baseScale * CONFIG.starRadiusRatio,
                game.baseScale * CONFIG.star.initialOrbitRadius
            );
        }
        if (this.disk && this.bh) {
            this.disk.updateBHRadius(this.bh.currentRadius);
        }
        if (this.stream && this.bh) {
            this.stream.updateBHRadius(this.bh.currentRadius);
            // Update disk bounds for capture detection
            if (this.disk) {
                this.stream.updateDiskBounds(this.disk.innerRadius, this.disk.outerRadius);
            }
        }
        if (this.jets && this.bh) {
            this.jets.updateBHRadius(this.bh.currentRadius);
        }
    }
}

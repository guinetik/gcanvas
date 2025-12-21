import { Scene3D } from "/gcanvas.es.min.js";
import { BlackHole } from "./blackhole.js";
import { Star } from "./tdestar.js";
import { TidalStream } from "./tidalstream.js";
import { AccretionDisk } from "./accretiondisk.js";
import { RelativisticJets } from "./jets.js";
import { CONFIG } from "./config.js";

export class BlackHoleScene extends Scene3D {
    constructor(game, options = {}) {
        super(game, options);
        // Camera is passed via options and handled by Scene3D
    }

    init() {
        // Add BlackHole at (0,0,0)
        this.bh = new BlackHole(this.game);
        this.add(this.bh);

        // Add a Star orbiting the black hole
        this.star = new Star(this.game);
        this.add(this.star);

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

        // Add relativistic jets (activated during flare phase)
        this.jets = new RelativisticJets(this.game, {
            camera: this.game.camera,
            bhRadius: this.game.baseScale * CONFIG.bhRadiusRatio,
        });
        this.add(this.jets);
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

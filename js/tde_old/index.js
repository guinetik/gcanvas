/**
 * Tidal Disruption Event - Cinematic Visualization
 *
 * A star torn apart by a supermassive black hole's tidal forces.
 * Uses ParticleSystem for debris, Shapes for black hole/flare,
 * and StateMachine for phase management.
 */
import {
  Game,
  Camera3D,
  StateMachine,
  Painter,
  Text,
  Scene,
} from "/gcanvas.es.min.js";

import { BlackHole } from "./blackhole.obj.js";
import { Star } from "./star.obj.js";
import { DebrisManager } from "./debris.obj.js";
import { Flare } from "./flare.obj.js";
import { StarField } from "../blackhole/starfield.obj.js";

// Configuration
const CONFIG = {
  // Sizing (as fraction of screen)
  bhRadiusRatio: 0.08,
  starRadiusRatio: 0.05, // Smaller base size - distance scaling makes it look bigger when far
  tidalRadiusRatio: 0.35,

  // Star - starts FAR, falls IN
  starParticleCount: 8000, // Much denser for fluid look
  starStartDistance: 0.6, // Matches apoapsisRatio - start at farthest point

  // Camera
  cameraDistance: 0.7,
  autoRotateSpeed: 0.05, // Slower rotation to admire the view

  // Phase durations (seconds) - FASTER, MORE DRAMATIC
  phases: {
    approach: 10.0, // Longer approach to build tension
    stretch: 3.0, // Orbital stretching
    disrupt: 5.0, // Extended disruption - particles spiral off
    accrete: 6.0, // Longer accretion for more drama
    flare: 2.0, // Bright flare
  },

  // Visual
  backgroundColor: "#020206",
};

class TDEDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.backgroundColor;
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.time = 0;

    // Calculate scaled sizes
    this.updateScaledSizes();

    // Setup Camera3D - lower perspective = stronger depth effect
    this.camera = new Camera3D({
      rotationX: 1.2, // ~70 degrees - lower angle for Interstellar look
      rotationY: 0,
      perspective: this.baseScale * CONFIG.cameraDistance,
      autoRotate: true,
      autoRotateSpeed: CONFIG.autoRotateSpeed,
    });
    this.camera.enableMouseControl(this.canvas);

    // Create Starfield (background) - LOTS OF STARS
    this.starfield = new StarField(this, {
      camera: this.camera,
      starCount: 5000,
    });
    this.starfield.init();
    this.starfield.zIndex = 0;
    this.pipeline.add(this.starfield);

    // Create Flare (renders as background glow)
    this.flare = new Flare(this, {
      radius: this.bhRadius * 4,
      camera: this.camera,
    });
    this.flare.init();
    this.flare.zIndex = 10;
    this.pipeline.add(this.flare);

    // Create a Scene to properly manage z-ordering of star and black hole
    this.mainScene = new Scene(this, { sortByZIndex: true });
    this.mainScene.zIndex = 30;
    this.pipeline.add(this.mainScene);

    // Create Black Hole (event horizon at center)
    this.blackHole = new BlackHole(this, {
      radius: this.bhRadius,
      glowIntensity: 0,
      camera: this.camera,
    });
    this.blackHole.init();
    this.blackHole.zIndex = 50; // Middle layer
    this.mainScene.add(this.blackHole);

    // Create Star (approaching from outside)
    // zIndex updated dynamically: behind BH when z > 0, in front when z < 0
    this.star = new Star(this, {
      camera: this.camera,
      radius: this.starRadius,
      particleCount: CONFIG.starParticleCount,
      baseScale: this.baseScale,
      startDistance: this.baseScale * CONFIG.starStartDistance,
    });
    this.star.init();
    this.star.zIndex = 25; // Start behind black hole
    this.mainScene.add(this.star);

    // Create Debris Manager (accretion disk particles with lensing)
    this.debrisManager = new DebrisManager(this, {
      camera: this.camera,
      bhRadius: this.bhRadius,
      baseScale: this.baseScale,
    });
    this.debrisManager.init();
    this.debrisManager.zIndex = 75; // On top of black hole
    this.mainScene.add(this.debrisManager);

    // Initialize state machine
    this.initStateMachine();

    // Click to restart
    this.canvas.addEventListener("click", () => {
      if (this.fsm.is("stable")) {
        this.restart();
      }
    });

    // Info label (always on top)
    this.infoLabel = new Text(this, "", {
      x: 15,
      y: this.height - 30,
      color: "#888",
      font: "11px monospace",
    });
    this.infoLabel.zIndex = 100;
    this.pipeline.add(this.infoLabel);

    // Flash overlay for dramatic collapse moment
    this.flashIntensity = 0;
    this.flashDecay = 3.0; // How fast flash fades (higher = faster)
  }

  initStateMachine() {
    this.fsm = StateMachine.fromSequence(
      [
        {
          name: "approach",
          duration: CONFIG.phases.approach,
          enter: () => this.onApproachEnter(),
        },
        {
          name: "stretch",
          duration: CONFIG.phases.stretch,
          enter: () => this.onStretchEnter(),
        },
        {
          name: "disrupt",
          duration: CONFIG.phases.disrupt,
          enter: () => this.onDisruptEnter(),
        },
        {
          name: "accrete",
          duration: CONFIG.phases.accrete,
          enter: () => this.onAccreteEnter(),
        },
        {
          name: "flare",
          duration: CONFIG.phases.flare,
          enter: () => this.onFlareEnter(),
        },
        {
          name: "stable",
          duration: Infinity,
          enter: () => this.onStableEnter(),
        },
      ],
      { context: this },
    );
  }

  // Phase callbacks
  onApproachEnter() {
    this.star.startApproach();
    // No pre-made disk - it forms organically from star particles
  }

  onStretchEnter() {
    this.star.startStretch();
    // Glow controlled by awakening - just set target intensity
    this.blackHole.setGlowIntensity(0.5);
  }

  onDisruptEnter() {
    this.star.startDisrupt();
    // Glow controlled by awakening - just set target intensity
    this.blackHole.setGlowIntensity(0.8);
  }

  onAccreteEnter() {
    // Flash white when star collapses!
    this.flashIntensity = 1.0;

    // Transfer remaining star particles to debris - these form the final disk
    const debris = this.star.releaseAllParticles();
    this.debrisManager.addDebris(debris);

    // FLARE TRIGGERS IMMEDIATELY ON COLLISION - not waiting for flare phase
    this.flare.trigger();
    this.blackHole.setGlowIntensity(1.0);

    // Activate relativistic jets during accretion (only if BH is awakened enough)
    this.blackHole.setJetsActive(true);
  }

  onFlareEnter() {
    // Flare already triggered in accrete - this phase is just for decay
    // Keep intensity high
    this.flare.setIntensity(1.0);
  }

  onStableEnter() {
    this.blackHole.setGlowIntensity(1.0); // Keep full glow after collision
    this.blackHole.setJetsActive(false); // Turn off jets when stable
    this.flare.fadeOut();
  }

  restart() {
    this.star.reset();
    this.debrisManager.clear();
    this.flare.reset();
    this.flashIntensity = 0;
    this.blackHole.setGlowIntensity(0);
    this.blackHole.resetMass();
    this.fsm.setState("approach");
  }

  updateScaledSizes() {
    this.baseScale = Math.min(this.width, this.height);
    this.bhRadius = this.baseScale * CONFIG.bhRadiusRatio;
    this.starRadius = this.baseScale * CONFIG.starRadiusRatio;
    this.tidalRadius = this.baseScale * CONFIG.tidalRadiusRatio;
  }

  onResize() {
    this.updateScaledSizes();

    if (this.camera) {
      this.camera.perspective = this.baseScale * CONFIG.cameraDistance;
    }

    if (this.blackHole) {
      this.blackHole.updateRadius(this.bhRadius);
    }

    if (this.star) {
      this.star.updateSizing(this.starRadius, this.baseScale);
    }

    if (this.debrisManager) {
      this.debrisManager.updateSizing(this.bhRadius, this.baseScale);
    }

    if (this.flare) {
      this.flare.updateRadius(this.bhRadius * 4);
    }

    if (this.infoLabel) {
      this.infoLabel.y = this.height - 30;
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Update camera
    this.camera.update(dt);

    // Update state machine
    this.fsm.update(dt);

    // Update components based on current phase
    const state = this.fsm.state;
    const progress = this.fsm.progress;

    // Black hole feeds on debris during ALL phases (awakens progressively)
    const accretionRate = this.debrisManager.getAccretionRate();
    if (accretionRate > 0) {
      this.blackHole.addMass(accretionRate * dt * 0.01);
    }

    if (state === "approach") {
      this.star.updateApproach(dt, progress);
      // ORGANIC STREAMING FROM THE VERY START
      // As star approaches, tidal forces gradually pull matter off
      // Drift starts immediately but very weak, builds up over time
      const driftStrength = progress * progress; // Quadratic buildup
      this.star.applyParticleDrift(dt, driftStrength);

      // Start releasing particles from 10% onward - very slow at first
      if (progress > 0.1) {
        const releaseProgress = (progress - 0.1) / 0.9;
        // Mild tidal stretch that builds up
        this.star.applyTidalStretch(releaseProgress * 0.2);
        // Release particles - slow at first, faster as star approaches
        const released = this.star.releaseParticles(releaseProgress * 0.25);
        if (released.length > 0) {
          this.debrisManager.addDebris(released);
          // BH GROWS as star releases particles
          this.blackHole.addMass(released.length * 0.002);
        }
      }
    } else if (state === "stretch") {
      this.star.updateStretch(dt, progress, { x: 0, y: 0, z: 0 });
      // DRIFT particles toward BH - stronger during stretch
      this.star.applyParticleDrift(dt, 1.0 + progress);
      // Continue streaming during stretch - more aggressively
      const released = this.star.releaseParticles(0.3 + progress * 0.4);
      if (released.length > 0) {
        this.debrisManager.addDebris(released);
        // BH GROWS as star releases particles
        this.blackHole.addMass(released.length * 0.003);
      }
    } else if (state === "disrupt") {
      this.star.updateDisrupt(dt, progress);
      // DRIFT particles toward BH - maximum during disruption
      this.star.applyParticleDrift(dt, 2.0 + progress);
      // Continue releasing particles during disruption
      const released = this.star.releaseParticles(0.7 + progress * 0.3);
      if (released.length > 0) {
        this.debrisManager.addDebris(released);
        // BH GROWS as star releases particles
        this.blackHole.addMass(released.length * 0.004);
      }

      // COLLISION CHECK - trigger accrete when star is close to BH
      const starDist = Math.sqrt(
        this.star.centerX ** 2 +
          this.star.centerY ** 2 +
          this.star.centerZ ** 2,
      );
      if (starDist < this.bhRadius * 2) {
        // Star has reached the black hole - trigger accrete immediately
        this.fsm.setState("accrete");
      }
    } else if (state === "flare") {
      this.flare.setIntensity(1 - progress * 0.5);
    }

    // Update star z-ordering based on camera-space z position
    // Star behind black hole (z > 0) = lower zIndex, in front (z < 0) = higher zIndex
    // Use hysteresis to prevent jittering when star is near the z=0 plane
    if (this.star && this.star.visible) {
      const starCameraZ = this.star.getCameraZ();
      const hysteresis = this.bhRadius * 0.5; // Threshold to prevent jittering

      let newZIndex = this.star.zIndex;
      if (starCameraZ > hysteresis) {
        // Clearly behind BH
        newZIndex = 25;
      } else if (starCameraZ < -hysteresis) {
        // Clearly in front of BH
        newZIndex = 75;
      }
      // If within hysteresis range, keep current zIndex to avoid flickering

      if (this.star.zIndex !== newZIndex) {
        this.star.zIndex = newZIndex;
        // Mark z-order as dirty for re-sorting
        this.mainScene._collection._zOrderDirty = true;
      }
    }

    // Decay flash intensity
    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(
        0,
        this.flashIntensity - dt * this.flashDecay,
      );
    }

    // Update info label
    this.updateInfoLabel();
  }

  updateInfoLabel() {
    const state = this.fsm.state;
    const progress = this.fsm.progress;

    const stateLabels = {
      approach: "Star Approaching",
      stretch: "Tidal Stretching",
      disrupt: "Stellar Disruption",
      accrete: "Debris Accretion",
      flare: "Luminous Flare",
      stable: "Stable Disk",
    };

    const stateColors = {
      approach: "#88f",
      stretch: "#fa8",
      disrupt: "#f88",
      accrete: "#ff8",
      flare: "#fff",
      stable: "#8a8",
    };

    this.infoLabel.color = stateColors[state] || "#888";

    if (state === "stable") {
      this.infoLabel.text = `${stateLabels[state]} — click to restart`;
    } else {
      this.infoLabel.text = `${stateLabels[state]}: ${Math.round(progress * 100)}%`;
    }
  }

  render() {
    // Pipeline already sorts by zIndex via ZOrderedCollection
    super.render();

    // Draw flash overlay on top of everything using direct canvas
    if (this.flashIntensity > 0) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.flashIntensity})`;
        ctx.fillRect(0, 0, this.width, this.height);
      });
    }
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new TDEDemo(canvas);
  demo.start();
});

import {
  Game,
  Camera3D,
  StateMachine,
  Painter,
  Text,
  Button,
  Tweenetik,
  Easing,
} from "/gcanvas.es.min.js";
import { LensedStarfield } from "./lensedstarfield.js";
import { polarToCartesian } from "/gcanvas.es.min.js";
import { keplerianOmega, decayingOrbitalRadius } from "/gcanvas.es.min.js";
import { applyAnchor } from "/gcanvas.es.min.js";
import { Position } from "/gcanvas.es.min.js";

import { CONFIG } from "./config.js";
import { BlackHoleScene } from "./blackholescene.js";

export class TDEDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#020202";
  }

  updateScaledSizes() {
    this.baseScale = Math.min(this.width, this.height);
  }

  init() {
    super.init();
    this.updateScaledSizes();

    this.camera = new Camera3D({
      rotationX: 0.6,
      rotationY: 0,
      perspective: this.baseScale * 1.2, // Wider view to see full orbit
      autoRotate: true,
      autoRotateSpeed: 0.08,
    });
    this.camera.enableMouseControl(this.canvas);

    this.scene = new BlackHoleScene(this, {
      camera: this.camera,
      x: this.width / 2,
      y: this.height / 2,
    });
    this.pipeline.add(this.scene);

    // Initialize scene sizes and positions before first frame
    this.scene.onResize();

    // Create lensed starfield AFTER scene so we can pass the black hole reference
    this.starField = new LensedStarfield(this, {
      camera: this.camera,
      starCount: CONFIG.sceneOptions.starCount,
      blackHole: this.scene.bh,
      lensingStrength: 0, // Starts at 0, ramps up during disruption
    });
    this.pipeline.add(this.starField);
    this.pipeline.sendToBack(this.starField);

    // Flash overlay for dramatic collision moment
    this.flashIntensity = 0;

    // Replay button (hidden until stable state)
    this.replayButton = new Button(this, {
      width: 120,
      height: 40,
      text: "▶ Replay",
      font: "16px monospace",
      colorDefaultBg: "rgba(0, 0, 0, 0.6)",
      colorDefaultStroke: "#666",
      colorDefaultText: "#aaa",
      colorHoverBg: "rgba(30, 30, 30, 0.8)",
      colorHoverStroke: "#ff8844",
      colorHoverText: "#ff8844",
      colorPressedBg: "rgba(50, 50, 50, 0.9)",
      colorPressedStroke: "#ffaa66",
      colorPressedText: "#ffaa66",
      debug: true,
      onClick: () => this.restart(),
    });
    applyAnchor(this.replayButton, {
      anchor: Position.BOTTOM_RIGHT,
      anchorMargin: 20,
    });
    this.replayButton.zIndex = 100;
    //this.replayButton.visible = false; // Hidden until stable
    this.pipeline.add(this.replayButton);

    // Phase Info Label
    this.infoLabel = new Text(this, "", {
      color: "#888",
      font: "14px monospace",
    });
    applyAnchor(this.infoLabel, {
      anchor: Position.BOTTOM_LEFT,
      anchorOffsetX: -60
    });
    this.infoLabel.zIndex = 100;
    this.pipeline.add(this.infoLabel);

    this.initStateMachine();

    // Initialize state properly (same as restart)
    this.restart();
  }

  initStateMachine() {
    this.fsm = new StateMachine({
      initial: "approach",
      context: this,
      states: {
        approach: {
          // Star in stable wide orbit
          duration: CONFIG.durations.approach,
          next: "stretch",
        },
        stretch: {
          // Orbit begins to decay, tidal forces start
          duration: CONFIG.durations.stretch,
          next: "disrupt",
        },
        disrupt: {
          // No duration - transitions via trigger when star mass depletes
          on: {
            starConsumed: "accrete",
          },
        },
        accrete: {
          // Debris accretion phase - triggers flash
          duration: CONFIG.durations.accrete,
          next: "flare",
          enter: () => {
            // White flash with dramatic falloff
            this.flashIntensity = 1.0;
            Tweenetik.to(this, { flashIntensity: 0 }, 5.0, Easing.easeOutExpo);
          },
        },
        flare: {
          // Luminous flare after consumption - JETS FIRE!
          duration: CONFIG.durations.flare,
          next: "stable",
          enter: () => {
            // Second flash for jet ignition
            this.flashIntensity = 0.8;
            Tweenetik.to(this, { flashIntensity: 0 }, 5, Easing.easeOutExpo);
          },
        },
        stable: {
          // Terminal state - button to restart
          duration: CONFIG.durations.stable,
          enter: () => {
            // Black hole calms down after feeding
            this.scene.bh.startStabilizing();
            // Show replay button
            if (this.replayButton) this.replayButton.visible = true;
          },
        },
      },
    });
  }

  restart() {
    // Reset masses
    this.scene.bh.mass = CONFIG.blackHole.initialMass;
    this.scene.star.mass = CONFIG.star.initialMass;
    this.scene.star.initialMass = CONFIG.star.initialMass;

    // Reset orbital state
    this.scene.star.phi = 0;
    this.scene.star.orbitalRadius = this.baseScale * CONFIG.star.initialOrbitRadius;
    this.scene.star.initialOrbitalRadius = this.scene.star.orbitalRadius;

    // Reset position to initial orbit
    const pos = polarToCartesian(this.scene.star.orbitalRadius, 0);
    this.scene.star.x = pos.x;
    this.scene.star.z = pos.z;

    // Reset velocity tracking to avoid spike after position reset
    this.scene.star.resetVelocity();

    // Clear tidal stream particles
    if (this.scene.stream) {
      this.scene.stream.clear();
    }

    // Reset accretion disk
    if (this.scene.disk) {
      this.scene.disk.clear();
      this.scene.disk.active = false;
      this.scene.disk.lensingStrength = 0;
      this.scene.disk.scale = 0;
    }

    // Reset relativistic jets
    if (this.scene.jets) {
      this.scene.jets.clear();
    }
    this._lastJetPulse = -1;

    // Reset black hole to dormant state
    if (this.scene.bh) {
      this.scene.bh.resetAwakening();
    }

    // Reset flash
    this.flashIntensity = 0;

    // Reset starfield lensing to subtle base level
    if (this.starField) {
      this.starField.lensingStrength = 0.15;
    }

    // Hide replay button
    if (this.replayButton) this.replayButton.visible = false;

    this.fsm.setState("approach");
  }

  /**
   * Centralized particle emission with interpolation and angular detail
   */
  emitStreamParticles(dt, rate, phiStep) {
    const star = this.scene.star;
    const stream = this.scene.stream;

    if (!stream || star.mass <= 0) return;

    // Calculate rotation step based on star's current rotation speed
    const massRatio = (star.mass || 1) / (star.initialMass || 1);
    const spinUpFactor = 1 + (1 - massRatio) * 2;
    const rotationSpeed = (CONFIG.star.rotationSpeed ?? 0.5) * spinUpFactor;
    const rotationStep = rotationSpeed * dt;

    for (let i = 0; i < rate; i++) {
      const t = i / rate;

      // 1. Interpolate angle (phi) and radius for perfect curved arc
      const interpPhi = star.phi - (phiStep * t);
      const interpRadius = star.orbitalRadius;

      // 2. Interpolate rotation for angular detail at the source
      const interpRotation = star.rotation - (rotationStep * t);

      // 3. Convert to Cartesian coordinates
      const pos = polarToCartesian(interpRadius, interpPhi);

      // 4. Emit! Use star.y to include vertical wobble from chaotic orbit
      // Scale radius up to match actual visual star edge
      const bodyRadius = star.currentRadius * 1.5;
      this.scene.stream.emit(
        pos.x, pos.y || 0, pos.z,
        star.velocityX, star.velocityY, star.velocityZ,
        bodyRadius,
        interpRotation
      );
    }
  }

  update(dt) {
    super.update(dt);
    if (this.camera) this.camera.update(dt);
    Tweenetik.updateAll(dt);
    if (!this.fsm) return;
    this.fsm.update(dt);

    const state = this.fsm.state;
    const progress = this.fsm.progress;
    const star = this.scene.star;
    const bh = this.scene.bh;

    // Flash is now handled by Tweenetik in FSM enter callbacks

    // Update info label
    if (this.infoLabel) {
      // Calculate display progress (disrupt uses stateTime, not duration-based progress)
      let displayProgress;
      if (state === "disrupt") {
        displayProgress = Math.min(1, this.fsm.stateTime / CONFIG.durations.disrupt);
      } else if (state === "stable") {
        displayProgress = 1;
      } else {
        displayProgress = progress;
      }
      const pPercent = Math.round(displayProgress * 100);

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
        this.infoLabel.text = `${stateLabels[state]}`;
      } else {
        this.infoLabel.text = `${stateLabels[state]}: ${pPercent}%`;
      }
    }

    // === GRAVITATIONAL LENSING RAMP ===
    // Black holes always warp spacetime - subtle base, INTENSE when feeding
    if (this.starField) {
      const baseLensing = 0.15;  // Subtle base - dormant BH
      if (state === "approach") {
        this.starField.lensingStrength = baseLensing;
      } else if (state === "stretch") {
        // Gentle ramp: 0.15 -> 0.4
        this.starField.lensingStrength = baseLensing + progress * 0.25;
      } else if (state === "disrupt") {
        // AGGRESSIVE ramp: 0.4 -> 2.0 (goes past 1.0 for dramatic effect)
        const disruptProgress = Math.min(1, this.fsm.stateTime / CONFIG.durations.disrupt);
        this.starField.lensingStrength = 0.4 + disruptProgress * 1.6;
      } else {
        // Max lensing during accrete/flare/stable
        this.starField.lensingStrength = 2.0;
      }
    }

    // Approach phase: Stable wide orbit - constant radius
    if (state === "approach") {
      const omega = keplerianOmega(star.orbitalRadius, bh.mass, 1.0, star.initialOrbitalRadius);
      star.phi += omega * dt * CONFIG.star.orbitSpeed;
      const pos = polarToCartesian(star.orbitalRadius, star.phi);
      star.x = pos.x;
      star.z = pos.z;
    }
    // Stretch phase: Orbit begins to decay, no mass transfer yet
    else if (state === "stretch") {
      const stretchProgress = this.fsm.progress;

      // Gentle orbital decay during stretch
      star.orbitalRadius = decayingOrbitalRadius(
        star.initialOrbitalRadius,
        CONFIG.star.decayRate * 0.3,
        stretchProgress * 2
      );

      const omega = keplerianOmega(star.orbitalRadius, bh.mass, 1.0, star.initialOrbitalRadius);
      const phiStep = omega * dt * CONFIG.star.orbitSpeed * 1.1;
      star.phi += phiStep;

      const pos = polarToCartesian(star.orbitalRadius, star.phi);
      star.x = pos.x;
      star.z = pos.z;

      // Start emitting particles during stretch (slowly at first)
      if (this.scene.stream && stretchProgress > 0.3) {
        this.emitStreamParticles(dt, 15, phiStep);
      }
    }
    // Disrupt phase: Rapid decay with mass transfer
    else if (state === "disrupt") {
      // Use stateTime to calculate decay progress (event-based exit)
      const decayTime = this.fsm.stateTime;
      const disruptProgress = Math.min(1, decayTime / CONFIG.durations.disrupt);

      // Continue decay from where stretch left off
      const stretchEndRadius = decayingOrbitalRadius(
        star.initialOrbitalRadius,
        CONFIG.star.decayRate * 0.3,
        2 // stretch ended at progress=1, factor=2
      );

      // Exponential decay of orbital radius
      const baseRadius = decayingOrbitalRadius(
        stretchEndRadius,
        CONFIG.star.decayRate,
        disruptProgress * 5
      );

      // === ORBITAL CHAOS ===
      // As the star loses mass asymmetrically, its orbit becomes unstable
      // Subtle at first, builds gradually
      const chaos = 0.1 + disruptProgress * 0.5;  // Reduced: starts at 10%, builds to 60%
      const time = this.fsm.stateTime;

      // Radial wobble - tidal forces pull the star in and out
      const radialWobble = Math.sin(time * 2.5) * chaos * baseRadius * 0.15
        + Math.sin(time * 5.8) * chaos * baseRadius * 0.08;
      star.orbitalRadius = baseRadius + radialWobble;

      // Angular velocity - slight jitter in orbital speed
      const omega = keplerianOmega(star.orbitalRadius, bh.mass, 1.0, star.initialOrbitalRadius);
      const angularJitter = Math.sin(time * 3.7) * chaos * 0.2;
      const phiStep = omega * dt * CONFIG.star.orbitSpeed * (1 + disruptProgress * 2 + angularJitter);
      star.phi += phiStep;

      const pos = polarToCartesian(star.orbitalRadius, star.phi);

      // Vertical wobble - star bobs out of orbital plane
      const verticalWobble = Math.sin(time * 1.7) * chaos * baseRadius * 0.12
        + Math.cos(time * 3.9) * chaos * baseRadius * 0.06;

      star.x = pos.x;
      star.y = verticalWobble;
      star.z = pos.z;

      // Emit particles throughout disrupt phase (more than stretch)
      if (this.scene.stream && star.mass > 0) {
        const emitRate = 10 + Math.floor(disruptProgress * 30);
        this.emitStreamParticles(dt, emitRate, phiStep);
      }

      // Mass transfer starts at configured percentage of disrupt phase
      if (disruptProgress >= CONFIG.star.massTransferStart) {
        const transferRate = (CONFIG.star.initialMass / (CONFIG.durations.disrupt * 0.5)) * dt;

        star.mass = Math.max(0, star.mass - transferRate);
        bh.mass += transferRate;

        // AWAKEN the black hole as it feeds! This triggers the glow
        bh.addConsumedMass(transferRate * 0.5);

        // Force visual updates to reflect mass changes
        star.updateVisual();
        bh.updateVisual();

        // Trigger accrete state when star mass is depleted
        if (star.mass <= 0) {
          this.fsm.trigger("starConsumed");
        }
      }

      // Activate accretion disk at 80% progress (handles its own tweens)
      if (disruptProgress >= 0.8 && this.scene.disk) {
        this.scene.disk.activate();
      }
    }
    // Accrete phase: ensure disk active
    else if (state === "accrete") {
      if (this.scene.disk && !this.scene.disk.active) {
        this.scene.disk.activate();
      }
    }
    // Flare phase: jets fire continuously
    else if (state === "flare") {
      if (this.scene.jets) {
        this.scene.jets.active = true;
        this.scene.jets.intensity = 1;  // Keep at full blast
      }
    }
    // Stable phase: jets fade out
    else if (state === "stable") {
      if (this.scene.jets && this.scene.jets.active) {
        this.scene.jets.deactivate();
      }
    }
  }

  onResize() {
    this.updateScaledSizes();
    if (this.camera) {
      this.camera.perspective = this.baseScale * 0.5;
    }
    if (this.scene) {
      this.scene.x = this.width / 2;
      this.scene.y = this.height / 2;
      this.scene.onResize();
    }
  }

  render() {
    super.render();

    // Draw flash overlay on top of everything
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
  demo.enableFluidSize();
  demo.start();
});
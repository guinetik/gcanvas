import {
  Game,
  Camera3D,
  StateMachine,
  Painter,
  Text,
  Button,
  Tweenetik,
  Easing,
} from "../../../src/index.js";
import { FPSCounter } from "../../../src/game/ui/fps.js";
import { LensedStarfield } from "./lensedstarfield.js";
import { polarToCartesian } from "../../../src/math/gr.js";
import { keplerianOmega, decayingOrbitalRadius, orbitalRadius } from "../../../src/math/orbital.js";
import { applyAnchor } from "../../../src/mixins/anchor.js";
import { Position } from "../../../src/util/position.js";

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
      rotationX: 0.3,
      rotationY: 0,
      rotationZ: 0,
      perspective: this.baseScale * 1.8, // Zoomed out for wider view
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

    // Phase Info Label (bottom left)
    this.infoLabel = new Text(this, "", {
      color: "#888",
      font: "14px monospace",
    });
    applyAnchor(this.infoLabel, {
      anchor: Position.BOTTOM_LEFT,
      anchorOffsetX: -60,
      anchorMargin: 20,
    });
    this.infoLabel.zIndex = 100;
    this.pipeline.add(this.infoLabel);

    // Replay button (above phase text)
    this.replayButton = new Button(this, {
      width: 120,
      height: 32,
      text: "▶ Replay",
      font: "14px monospace",
      colorDefaultBg: "rgba(0, 0, 0, 0.6)",
      colorDefaultStroke: "#666",
      colorDefaultText: "#aaa",
      colorHoverBg: "rgba(30, 30, 30, 0.8)",
      colorHoverStroke: "#ff8844",
      colorHoverText: "#ff8844",
      colorPressedBg: "rgba(50, 50, 50, 0.9)",
      colorPressedStroke: "#ffaa66",
      colorPressedText: "#ffaa66",
      onClick: () => this.restart(),
    });
    applyAnchor(this.replayButton, {
      anchor: Position.BOTTOM_LEFT,
      anchorMargin: 20,
      anchorOffsetY: -30, // Above the phase text
    });
    this.replayButton.zIndex = 100;
    this.pipeline.add(this.replayButton);

    // FPS Counter (bottom right)
    this.fpsCounter = new FPSCounter(this, {
      font: "12px monospace",
      color: "#666",
    });
    applyAnchor(this.fpsCounter, {
      anchor: Position.BOTTOM_RIGHT,
      anchorMargin: 20,
    });
    this.fpsCounter.zIndex = 100;
    this.pipeline.add(this.fpsCounter);

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

    // Store eccentricity
    const eccentricity = CONFIG.star.eccentricity || 0;
    this.scene.star.eccentricity = eccentricity;

    // Calculate semi-major axis (average orbital distance)
    let semiMajorAxis = this.baseScale * CONFIG.star.initialOrbitRadius;

    // Constrain orbit to keep star visible
    // Use width for horizontal extent (orbit goes left-right)
    const starRadius = this.baseScale * CONFIG.starRadiusRatio;

    // Horizontal constraint: apoapsis should fit within screen width
    const horizontalMargin = starRadius;
    const maxHorizontalExtent = (this.width / 2) - horizontalMargin;
    const maxSafeApoapsisH = maxHorizontalExtent;
    const maxSafeSemiMajorH = maxSafeApoapsisH / (1 + eccentricity);

    // Vertical constraint: use practical tilt (initial * 2), not extreme max
    const practicalTilt = Math.min(Math.abs(this.camera._initialRotationX || 0.3) * 2, 0.6);
    const verticalMargin = starRadius * 0.5;
    const maxVerticalDisplacement = (this.height / 2) - verticalMargin;
    const tiltFactor = Math.abs(Math.sin(practicalTilt));
    const maxSafeApoapsisV = tiltFactor > 0.01 ? maxVerticalDisplacement / tiltFactor : Infinity;
    const maxSafeSemiMajorV = maxSafeApoapsisV / (1 + eccentricity);

    // Use the more restrictive of horizontal or vertical
    semiMajorAxis = Math.min(semiMajorAxis, maxSafeSemiMajorH, maxSafeSemiMajorV);

    this.scene.star.semiMajorAxis = semiMajorAxis;
    this.scene.star.initialSemiMajorAxis = semiMajorAxis;
    // Keep orbitalRadius for compatibility (will be updated each frame)
    this.scene.star.orbitalRadius = semiMajorAxis;
    this.scene.star.initialOrbitalRadius = semiMajorAxis;

    // Start at apoapsis (phi = π) - star swings in from far point
    this.scene.star.phi = Math.PI;

    // Reset position to apoapsis
    const r = orbitalRadius(semiMajorAxis, eccentricity, Math.PI);
    const pos = polarToCartesian(r, Math.PI);
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
   * Emit particles from the star's center position
   *
   * The trailing effect happens NATURALLY because:
   * - Each frame, particles are emitted at star's CURRENT position
   * - As star moves, older particles stay at their emission positions
   * - This creates a trail without needing artificial offsets
   *
   * No velocity-based offset is applied because that only looks correct
   * from specific camera angles. Emitting at center works from any angle.
   */
  emitStreamParticles(dt, rate) {
    const star = this.scene.star;
    const stream = this.scene.stream;

    if (!stream || star.mass <= 0) return;

    // Use star's ACTUAL current radius (shrinks during disruption)
    const currentRadius = star.currentRadius;

    // Use star's ACTUAL tracked velocity for particle inheritance
    const vx = star.velocityX || 0;
    const vz = star.velocityZ || 0;

    // Add radial offset to compensate for visual projection mismatch
    // Calculate in full 3D space including Y
    const starY = star.y || 0;
    const dist = Math.sqrt(star.x * star.x + starY * starY + star.z * star.z) || 1;
    const radialX = star.x / dist;  // Unit vector pointing away from BH (3D)
    const radialY = starY / dist;
    const radialZ = star.z / dist;
    
    // Make offset proportional to current orbital distance
    // As orbit shrinks, offset shrinks proportionally
    const orbitOffsetRatio = 0.8;  // 80% of current orbital radius as offset
    const orbitOffset = dist * orbitOffsetRatio;
    
    // Also add tangential offset (along velocity direction) to compensate for arc lag
    const speed = Math.sqrt(vx * vx + vz * vz) || 1;
    const velDirX = vx / speed;
    const velDirZ = vz / speed;
    const tangentOffset = 15;  // pixels ahead along orbit path
    
    const emitX = star.x + radialX * orbitOffset + velDirX * tangentOffset;
    const emitY = starY + radialY * orbitOffset;
    const emitZ = star.z + radialZ * orbitOffset + velDirZ * tangentOffset;

    for (let i = 0; i < rate; i++) {
      stream.emit(
        emitX, emitY, emitZ,
        vx, 0, vz,
        currentRadius,
        star.rotation || 0
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

    // Store star's position before updates for accurate velocity computation
    const oldStarX = star.x;
    const oldStarZ = star.z;

    // Approach phase: Elliptical orbit - star swings from apoapsis toward periapsis
    if (state === "approach") {
      star.tidalProgress = 0;  // No distortion yet

      const e = star.eccentricity || 0;
      const a = star.semiMajorAxis;

      // Current radius from ellipse equation
      const r = orbitalRadius(a, e, star.phi);
      star.orbitalRadius = r;

      // Angular velocity varies with r² (Kepler's 2nd law: r²·dθ/dt = const)
      // Faster at periapsis, slower at apoapsis
      const baseOmega = keplerianOmega(a, bh.mass, 1.0, star.initialSemiMajorAxis);
      const omega = baseOmega * (a * a) / (r * r);

      star.phi += omega * dt * CONFIG.star.orbitSpeed;

      // Store effective orbit speed for particle emission
      star.effectiveOrbitSpeed = omega * r * CONFIG.star.orbitSpeed;

      const pos = polarToCartesian(r, star.phi);
      star.x = pos.x;
      star.z = pos.z;
    }
    // Stretch phase: Elliptical orbit decays and circularizes
    else if (state === "stretch") {
      const stretchProgress = this.fsm.progress;

      // Drive tidal distortion - starts subtle, builds through phase
      // Use easeIn curve so distortion starts slowly then accelerates
      star.tidalProgress = stretchProgress * stretchProgress;

      // Semi-major axis decays
      const a = decayingOrbitalRadius(
        star.initialSemiMajorAxis,
        CONFIG.star.decayRate * 0.3,
        stretchProgress * 2
      );
      star.semiMajorAxis = a;

      // Eccentricity decreases as orbit circularizes (tidal forces)
      const e = star.eccentricity * (1 - stretchProgress * 0.5);

      // Current radius from ellipse
      const r = orbitalRadius(a, e, star.phi);
      star.orbitalRadius = r;

      // Angular velocity with Kepler's 2nd law
      const baseOmega = keplerianOmega(a, bh.mass, 1.0, star.initialSemiMajorAxis);
      const omega = baseOmega * (a * a) / (r * r);
      const speedMultiplier = 1.1;
      const phiStep = omega * dt * CONFIG.star.orbitSpeed * speedMultiplier;
      star.phi += phiStep;

      // Store effective orbit speed for particle emission
      star.effectiveOrbitSpeed = omega * r * CONFIG.star.orbitSpeed * speedMultiplier;

      const pos = polarToCartesian(r, star.phi);
      star.x = pos.x;
      star.z = pos.z;

      // Start emitting particles during stretch (slowly at first)
      if (this.scene.stream && stretchProgress > 0.1) {
        // Compute current-frame velocity for accurate particle emission
        if (dt > 0) {
          star.velocityX = (star.x - oldStarX) / dt;
          star.velocityZ = (star.z - oldStarZ) / dt;
        }
        const emitRate = 2 + Math.floor(stretchProgress * 100);
        this.emitStreamParticles(dt, emitRate);
      }
    }
    // Disrupt phase: Rapid decay with mass transfer
    else if (state === "disrupt") {
      star.tidalProgress = 1;  // Max external distortion

      // Use stateTime to calculate decay progress (event-based exit)
      const decayTime = this.fsm.stateTime;
      const disruptProgress = Math.min(1, decayTime / CONFIG.durations.disrupt);

      // Continue decay from where stretch left off
      const stretchEndAxis = decayingOrbitalRadius(
        star.initialSemiMajorAxis,
        CONFIG.star.decayRate * 0.3,
        2 // stretch ended at progress=1, factor=2
      );

      // Semi-major axis decays with easing - slow start, accelerates later
      const decayEase = disruptProgress * disruptProgress; // easeIn quadratic
      // Blend from stretch rate (0.3x) to full rate over first 50% of disrupt
      const decayRateBlend = 0.3 + Math.min(disruptProgress * 2, 1) * 0.7; // 0.3 -> 1.0
      const a = decayingOrbitalRadius(
        stretchEndAxis,
        CONFIG.star.decayRate * decayRateBlend,
        decayEase * 5
      );

      // Eccentricity continues from stretch end (0.5 * initial) and decays to 0
      const e = star.eccentricity * 0.5 * (1 - disruptProgress);

      // Current radius from ellipse equation
      const baseRadius = orbitalRadius(a, e, star.phi);

      // === ORBITAL CHAOS ===
      // Starts at 0, builds with easeIn curve for gradual onset
      const chaosProgress = disruptProgress * disruptProgress; // easeIn
      const chaos = chaosProgress * 0.6;  // 0% -> 60%
      const time = this.fsm.stateTime;

      // Radial wobble - only after chaos builds
      const radialWobble = chaos > 0.01
        ? Math.sin(time * 2.5) * chaos * baseRadius * 0.15
        + Math.sin(time * 5.8) * chaos * baseRadius * 0.08
        : 0;
      star.orbitalRadius = baseRadius + radialWobble;

      // Angular velocity with Kepler's 2nd law (same as stretch phase)
      const baseOmega = keplerianOmega(a, bh.mass, 1.0, star.initialSemiMajorAxis);
      const omega = baseOmega * (a * a) / (star.orbitalRadius * star.orbitalRadius);

      // Speed ramp: starts at 1.1x (matching stretch end), accelerates toward end
      const speedRamp = Math.pow(disruptProgress, 4); // easeIn quartic
      const speedMultiplier = 1.1 + speedRamp * 1.4; // 1.1x -> 2.5x

      // Angular jitter only kicks in as chaos builds
      const angularJitter = chaos > 0.05 ? Math.sin(time * 3.7) * chaos * 0.15 : 0;
      const phiStep = omega * dt * CONFIG.star.orbitSpeed * (speedMultiplier + angularJitter);
      star.phi += phiStep;

      // Store effective orbit speed for particle emission
      star.effectiveOrbitSpeed = omega * star.orbitalRadius * CONFIG.star.orbitSpeed * (speedMultiplier);

      const pos = polarToCartesian(star.orbitalRadius, star.phi);

      // Vertical wobble - only after chaos builds
      const verticalWobble = chaos > 0.01
        ? Math.sin(time * 1.7) * chaos * baseRadius * 0.12
        + Math.cos(time * 3.9) * chaos * baseRadius * 0.06
        : 0;

      star.x = pos.x;
      star.y = verticalWobble;
      star.z = pos.z;

      // Emit particles throughout disrupt phase (more than stretch)
      if (this.scene.stream && star.mass > 0) {
        // Compute current-frame velocity for accurate particle emission
        if (dt > 0) {
          star.velocityX = (star.x - oldStarX) / dt;
          star.velocityZ = (star.z - oldStarZ) / dt;
        }
        const emitRate = 10 + Math.floor(star.effectiveOrbitSpeed * disruptProgress) * 100;
        this.emitStreamParticles(dt, emitRate);
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

    // Update star z-order AFTER position is set (must be last in update)
    // This ensures correct depth sorting relative to black hole
    if (this.scene) {
      this.scene.updateStarZOrder();
    }
  }

  onResize() {
    this.updateScaledSizes();
    if (this.camera) {
      this.camera.perspective = this.baseScale * 1.8;
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
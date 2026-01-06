/**
 * Black Hole - Cinematic Visualization
 *
 * Particle-based accretion disk with:
 * - Camera-space gravitational lensing
 * - Doppler beaming
 * - Depth-sorted rendering
 * - Hawking radiation
 *
 * Refactored into modular components:
 * - StarField: Background starfield with parallax
 * - AccretionDisk: Particle management and formation
 * - BlackHole: Event horizon and Hawking radiation
 */

import { Game, Painter, Camera3D, StateMachine, Button } from "../../../src/index.js";
import { applyAnchor } from "../../../src/mixins/anchor.js";
import { Position } from "../../../src/util/position.js";

import { LensedStarfield } from "../tde/lensedstarfield.js";
import { AccretionDisk } from "./accretiondisk.obj.js";
import { BlackHole } from "./blackhole.obj.js";

// Configuration
const CONFIG = {
  // Black hole (as fraction of screen)
  bhRadiusRatio: 0.08,
  diskInnerRatio: 0.12,
  diskOuterRatio: 0.35,

  // Disk tilt (radians)
  diskTilt: (0 * Math.PI) / 180,

  particleCount: 2500,

  // Colors (white-hot inner to deep red outer)
  colors: {
    inner: [255, 250, 220],
    mid: [255, 160, 50],
    outer: [180, 40, 40],
  },

  // Formation phases (durations in seconds)
  formation: {
    infall: 4.0,
    collapse: 1.2,
    circularize: 2.5,
  },

  // Stars
  starCount: 3000,

  // Visual
  backgroundColor: "#050505",
};

class BlackHoleDemo extends Game {
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

    // Setup Camera3D with inertia
    this.camera = new Camera3D({
      rotationX: 0.1,
      rotationY: 0,
      perspective: this.baseScale * 0.6,
      autoRotate: true,
      autoRotateSpeed: 0.2,
      // Inertia for smooth camera drag
      inertia: true,
      friction: 0.94,
      velocityScale: 1.2,
    });
    this.camera.enableMouseControl(this.canvas);

    // Black hole reference for lensed starfield occlusion
    this.bhRef = { currentRadius: 0 };

    // Lensed starfield with gravitational lensing
    // Use smaller distanceScale (0.33) because camera perspective is 0.6x vs TDE's 1.8x
    this.starField = new LensedStarfield(this, {
      camera: this.camera,
      blackHole: this.bhRef,
      starCount: CONFIG.starCount,
      distanceScale: 0.33,
      lensingStrength: 1.0,
    });
    this.starField.init();
    this.pipeline.add(this.starField);

    // Create AccretionDisk
    this.accretionDisk = new AccretionDisk(this, {
      camera: this.camera,
      baseScale: this.baseScale,
      bhRadius: this.bhRadius,
      diskInner: this.diskInner,
      diskOuter: this.diskOuter,
      diskTilt: CONFIG.diskTilt,
      particleCount: CONFIG.particleCount,
      colors: CONFIG.colors,
    });
    this.accretionDisk.initParticles();
    this.pipeline.add(this.accretionDisk);

    // Create BlackHole
    this.blackHole = new BlackHole(this, {
      camera: this.camera,
      baseScale: this.baseScale,
      bhRadius: this.bhRadius,
      diskOuter: this.diskOuter,
    });
    this.pipeline.add(this.blackHole);

    // Initialize formation state machine (after components exist, as FSM triggers infall immediately)
    this.initFormationStateMachine();

    // Set FSM reference on components
    this.accretionDisk.formationFSM = this.formationFSM;
    this.blackHole.formationFSM = this.formationFSM;

    // Replay button (bottom left)
    this.replayButton = new Button(this, {
      width: 120,
      height: 32,
      text: "▶ Replay",
      font: "14px monospace",
      colorDefaultBg: "rgba(0, 0, 0, 0.6)",
      colorDefaultStroke: "#666",
      colorDefaultText: "#888",
      colorHoverBg: "rgba(40, 40, 40, 0.8)",
      colorHoverStroke: "#aaa",
      colorHoverText: "#fff",
      colorPressedBg: "rgba(60, 40, 20, 0.8)",
      colorPressedStroke: "#ffaa66",
      colorPressedText: "#ffaa66",
      onClick: () => this.formNewBlackHole(),
    });
    applyAnchor(this.replayButton, {
      anchor: Position.BOTTOM_LEFT,
      anchorMargin: 20,
      anchorOffsetY: -30,
    });
    this.replayButton.zIndex = 100;
    this.replayButton.visible = false; // Hidden until stable
    this.pipeline.add(this.replayButton);
  }

  initFormationStateMachine() {
    this.formationFSM = StateMachine.fromSequence(
      [
        {
          name: "infall",
          duration: CONFIG.formation.infall,
          enter: () => {
            this.accretionDisk.initParticlesForInfall();
          },
        },
        {
          name: "collapse",
          duration: CONFIG.formation.collapse,
        },
        {
          name: "circularize",
          duration: CONFIG.formation.circularize,
        },
        {
          name: "stable",
          duration: Infinity,
          enter: () => {
            // Show replay button when stable
            if (this.replayButton) this.replayButton.visible = true;
          },
        },
      ],
      { context: this },
    );
  }

  formNewBlackHole() {
    // Hide replay button
    if (this.replayButton) this.replayButton.visible = false;

    this.blackHole.reset();
    this.formationFSM.setState("infall");
  }

  updateScaledSizes() {
    this.baseScale = Math.min(this.width, this.height);
    this.bhRadius = this.baseScale * CONFIG.bhRadiusRatio;
    this.diskInner = this.baseScale * CONFIG.diskInnerRatio;
    this.diskOuter = this.baseScale * CONFIG.diskOuterRatio;
  }

  onResize() {
    this.updateScaledSizes();
    if (this.camera) {
      this.camera.perspective = this.baseScale * 0.6;
    }
    if (this.accretionDisk) {
      this.accretionDisk.updateSizing(
        this.baseScale,
        this.bhRadius,
        this.diskInner,
        this.diskOuter,
      );
      this.accretionDisk.initParticles();
    }
    if (this.blackHole) {
      this.blackHole.updateSizing(
        this.baseScale,
        this.bhRadius,
        this.diskOuter,
      );
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Update camera
    this.camera.update(dt);

    // Update formation state machine
    this.formationFSM.update(dt);

    // Components update via pipeline
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Calculate formation visibility
    const lambda = this.blackHole.getFormationLambda(
      this.accretionDisk.particlesConsumed,
      this.accretionDisk.totalParticleMass,
    );

    // Update black hole reference for lensed starfield occlusion
    this.bhRef.currentRadius = this.bhRadius * lambda;

    // Adjust starfield lensing strength based on formation phase
    if (this.starField) {
      const state = this.formationFSM.state;
      if (state === "stable") {
        this.starField.lensingStrength = 1.0;
      } else if (state === "circularize") {
        this.starField.lensingStrength = 0.4 + this.formationFSM.progress * 0.6;
      } else if (state === "collapse") {
        this.starField.lensingStrength = this.formationFSM.progress * 0.4;
      } else {
        // infall - subtle lensing as BH forms
        this.starField.lensingStrength = lambda * 0.3;
      }
    }

    // Clear and draw starfield (via pipeline)
    super.render();

    // Draw formation collapse flash
    if (lambda < 0.3 && lambda > 0) {
      Painter.useCtx((ctx) => {
        this.blackHole.drawFormationFlash(ctx, cx, cy, lambda, this.time);
      });
    }

    // Build combined render list from components
    const renderList = [
      ...this.accretionDisk.buildRenderList(),
      ...this.blackHole.buildRenderList(lambda),
    ];

    // Sort by depth (back to front)
    renderList.sort((a, b) => b.z - a.z);

    // Draw everything
    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.translate(cx, cy);

      for (const item of renderList) {
        if (item.type === "hole") {
          BlackHole.drawHole(ctx, item, this.bhRadius);
        } else if (item.type === "particle") {
          this.drawParticle(ctx, item);
        } else if (item.type === "hawking") {
          BlackHole.drawHawkingParticle(ctx, item, this.baseScale);
        }
      }

      ctx.restore();
    });

    // Info HUD
    this.drawInfo(w, h);
  }

  drawParticle(ctx, item) {
    const size = this.baseScale * 0.003 * item.scale;
    if (size < 0.1) return;

    let { r, g, b, a } = item.color;
    const state = this.formationFSM.state;
    const isInfalling = state === "infall" || state === "collapse";

    // Gravitational redshift for particles falling into the black hole
    // As they approach the event horizon, light shifts to red and dims (time dilation)
    if (item.isFalling && item.horizonProximity < 3) {
      const redshift = 1 - (item.horizonProximity - 0.5) / 2.5;
      const rs = Math.max(0, Math.min(1, redshift));

      // Shift toward deep red (reduce green/blue more than red)
      r = Math.floor(r * (1 - rs * 0.2));
      g = Math.floor(g * (1 - rs * 0.85));
      b = Math.floor(b * (1 - rs * 0.95));

      // Time dilation dimming - particles appear to freeze and fade
      a *= 1 - rs * 0.8;
    } else if (isInfalling) {
      // Non-falling particles during infall: cooler (bluer) transitioning to hot
      const heatProgress = 1 - item.z / (this.baseScale * 0.5);
      const coolFactor = Math.max(0, 1 - heatProgress);
      r = Math.floor(r * (0.6 + heatProgress * 0.4));
      g = Math.floor(g * (0.7 + heatProgress * 0.3));
      b = Math.min(255, Math.floor(b + coolFactor * 80));
    }

    const finalAlpha = Math.max(
      0,
      Math.min(1, a * item.doppler * item.diskAlpha),
    );

    // Core particle (circle)
    ctx.fillStyle = `rgba(${r},${g},${b},${finalAlpha})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Additive glow for bright/close particles
    if (
      (item.doppler > 1.1 && item.diskAlpha > 0.5) ||
      (isInfalling && item.z < 0)
    ) {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = `rgba(${r},${g},${b},${finalAlpha * 0.4})`;
      ctx.beginPath();
      ctx.arc(item.x, item.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
  }

  drawInfo(w, h) {
    Painter.useCtx((ctx) => {
      ctx.font = "11px monospace";
      ctx.textAlign = "left";

      const state = this.formationFSM.state;
      const progress = this.formationFSM.progress;

      const stateLabels = {
        infall: "Matter Infall",
        collapse: "Gravitational Collapse",
        circularize: "Disk Circularization",
        stable: "Stable Orbit",
      };

      const stateColors = {
        infall: "#88f",
        collapse: "#f88",
        circularize: "#fa8",
        stable: "#8a8",
      };

      ctx.fillStyle = stateColors[state] || "#888";
      if (state === "stable") {
        ctx.fillText(stateLabels[state], 15, h - 30);
      } else {
        ctx.fillText(
          `${stateLabels[state]}: ${(progress * 100).toFixed(0)}%`,
          15,
          h - 30,
        );
      }

      ctx.textAlign = "right";
      ctx.fillStyle = "#444";
      ctx.fillText("drag to orbit", w - 15, h - 15);
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new BlackHoleDemo(canvas);
  demo.start();
});

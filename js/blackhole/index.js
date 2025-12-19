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

import { Game, Painter, Camera3D, StateMachine } from "/gcanvas.es.min.js";

import { StarField } from "./starfield.obj.js";
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

    // Setup Camera3D
    this.camera = new Camera3D({
      rotationX: 0.1,
      rotationY: 0,
      perspective: this.baseScale * 0.6,
      autoRotate: true,
      autoRotateSpeed: 0.2,
    });
    this.camera.enableMouseControl(this.canvas);

    // Create StarField
    this.starField = new StarField(this, {
      camera: this.camera,
      starCount: CONFIG.starCount,
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

    // Click to form new black hole
    this.canvas.addEventListener("click", () => {
      if (this.formationFSM.is("stable")) {
        this.formNewBlackHole();
      }
    });
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
        },
      ],
      { context: this },
    );
  }

  formNewBlackHole() {
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

    // During infall, particles are cooler (bluer) and transition to hot
    if (isInfalling) {
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
      ctx.fillText("click to form  |  drag to orbit", w - 15, h - 15);
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new BlackHoleDemo(canvas);
  demo.start();
});

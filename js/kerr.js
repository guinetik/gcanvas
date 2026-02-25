/**
 * Kerr Metric - Rotating Black Hole Demo
 *
 * Visualization of the Kerr solution to Einstein's field equations.
 * Shows frame dragging, ergosphere, and the non-diagonal metric tensor.
 *
 * Key difference from Schwarzschild: g_tφ ≠ 0 (frame dragging term)
 */

import { Game, Painter, Camera3D, Screen, Gesture, Text, Scene, applyAnchor, FPSCounter } from "/gcanvas.es.min.js";
import { Position } from "/gcanvas.es.min.js";
import { Tensor } from "/gcanvas.es.min.js";
import { flammEmbeddingHeight } from "/gcanvas.es.min.js";
import {
  keplerianOmega,
  kerrPrecessionRate,
  orbitalRadiusSimple,
  updateTrail,
} from "/gcanvas.es.min.js";
import { Tooltip } from "/gcanvas.es.min.js";
import { Button } from "/gcanvas.es.min.js";
import { ToggleButton } from "/gcanvas.es.min.js";
import { KerrInfoPanel } from "./kerr.info.js";

// Configuration
const CONFIG = {
  // Grid parameters - match spacetime.js for clean visuals
  gridSize: 20,
  gridResolution: 40,
  baseGridScale: 15,

  // Mobile breakpoint
  mobileWidth: 600,

  // Physics (geometrized units: G = c = 1)
  defaultMass: 1.0,
  defaultSpin: 0.7, // 70% of extremal
  massRange: [1.0, 3.0],
  spinRange: [0.1, 0.95], // As fraction of M

  // Embedding diagram - visible funnel depth (matches Schwarzschild)
  embeddingScale: 180, // Consistent with Schwarzschild

  // 3D view - tilted to see frame dragging twist
  rotationX: 0.5, // Slightly less tilt to see more of the surface
  rotationY: 0.4,
  perspective: 900, // Bit more perspective for drama

  // Orbit parameters
  orbitSemiMajor: 10,
  orbitEccentricity: 0.15,
  angularMomentum: 4.0,

  // Animation
  autoRotateSpeed: 0.1,
  orbitSpeed: 0.5,
  precessionFactor: 0.15,
  frameDraggingAmplification: 3.0, // Visual enhancement

  // Zoom
  minZoom: 0.3,
  maxZoom: 3.0,
  zoomSpeed: 0.5,
  zoomEasing: 0.12,
  baseScreenSize: 600,

  // Formation animation (λ: 0→1 interpolation from flat to Kerr)
  // Slow enough for users to notice the transformation
  formationDuration: 6.0, // Seconds to form the black hole
  formationEasing: 0.3, // Easing factor for smooth transition

  // Visual exaggeration for user understanding (rubber sheet analogy)
  // These values are NOT physically accurate - intentionally amplified
  frameDraggingReach: 3.0, // How far frame dragging visually extends (multiplier)
  frameDraggingStrength: 40, // INCREASED from 25 for stronger twist
  blackHoleSizeBase: 12, // Base visual size of black hole
  blackHoleSizeMassScale: 10, // How much mass affects visual size (more dramatic)

  // Colors
  gridColor: "rgba(0, 180, 255, 0.3)",
  gridHighlight: "rgba(100, 220, 255, 0.5)",
  outerHorizonColor: "rgba(255, 50, 50, 0.8)",
  innerHorizonColor: "rgba(200, 50, 100, 0.6)",
  ergosphereColor: "rgba(255, 150, 0, 0.7)",
  progradeISCOColor: "rgba(50, 255, 150, 0.6)",
  retrogradeISCOColor: "rgba(100, 150, 255, 0.6)",
  frameDragColor: "rgba(255, 200, 100, 0.5)",
  orbiterColor: "#4af",
  orbiterGlow: "rgba(100, 180, 255, 0.6)",

  // Button layout
  btnMargin: 12,
  btnSize: 44,
  btnGap: 8,
};

class KerrDemo extends Game {
  constructor(canvas) {
    super(canvas);
    // Black background - it's space!
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.time = 0;

    // Initialize Screen for responsive handling
    Screen.init(this);

    // Calculate initial zoom based on screen size
    const initialZoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize),
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // Mass and spin
    this.mass = CONFIG.defaultMass;
    this.spin = CONFIG.defaultSpin * this.mass;

    // Grid scale
    this.gridScale = CONFIG.baseGridScale;

    // Camera with inertia for smooth drag
    this.camera = new Camera3D({
      rotationX: CONFIG.rotationX,
      rotationY: CONFIG.rotationY,
      perspective: CONFIG.perspective,
      minRotationX: -0.5,
      maxRotationX: 1.5,
      autoRotate: true,
      autoRotateSpeed: CONFIG.autoRotateSpeed,
      autoRotateAxis: "y",
      inertia: true,
      friction: 0.95,
      velocityScale: 2.0,
    });
    this.camera.enableMouseControl(this.canvas);

    // Enable zoom via mouse wheel and pinch gesture
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoomSpeed;
        this.targetZoom = Math.max(
          CONFIG.minZoom,
          Math.min(CONFIG.maxZoom, this.targetZoom),
        );
      },
      onPan: null, // Camera3D handles rotation via drag
    });

    // Double-click to reset zoom and camera
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.camera.reset();
    });

    // Orbital state
    this.orbitR = CONFIG.orbitSemiMajor;
    this.orbitPhi = 0;
    this.orbitVr = 0;
    this.orbitL = CONFIG.angularMomentum;
    this.precessionAngle = 0;
    this.orbitTrail = [];

    // Formation parameter λ: interpolates from flat (0) to Kerr (1)
    // This is NOT physical time - it's a geometric interpolation parameter
    // representing the cumulative effects during black hole formation
    this.formationProgress = 0; // λ ∈ [0, 1]

    // Initialize grid
    this.initGrid();
    this.gridScale = CONFIG.baseGridScale;

    // ── Info header (top-left summary) ──
    this._buildInfoHeader();

    // ── Buttons: settings (toggle) + new black hole, always visible ──
    this._buildButtons();

    // ── Info modal panel (rendered manually after all scene drawing) ──
    this.infoPanel = new KerrInfoPanel(this);

    // Panel emits "panel:dismiss" when user clicks outside — untoggle the button
    this.events.on("panel:dismiss", () => {
      this._settingsBtn.toggle(false);
    });

    // Tooltip (responsive) — NOT in pipeline, rendered manually after panel
    const isMobile = this.width < CONFIG.mobileWidth;
    this.tooltip = new Tooltip(this, {
      maxWidth: isMobile ? 200 : 300,
      font: `${isMobile ? 9 : 11}px monospace`,
      padding: isMobile ? 6 : 10,
      bgColor: "rgba(20, 20, 30, 0.95)",
    });

    this.hoveredFeature = null;

    // Event listeners
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseleave", () => this.tooltip.hide());

    // FPS counter
    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);
  }

  // ── Info Header ─────────────────────────────────────────────────────────

  _buildInfoHeader() {
    this._infoScene = new Scene(this, { x: 0, y: 0 });
    applyAnchor(this._infoScene, {
      anchor: Position.TOP_LEFT,
      anchorOffsetX: Screen.responsive(15, 30, 40),
      anchorOffsetY: Screen.responsive(60, 80, 90),
    });

    this._titleText = new Text(this, "Kerr Metric", {
      font: `bold ${Screen.responsive(18, 24, 28)}px monospace`,
      color: "#f7a",
      align: "left",
      baseline: "middle",
    });

    this._equationText = new Text(this, "ds\u00B2 = g\u03BC\u03BD dx\u03BC dx\u03BD", {
      font: `${Screen.responsive(14, 18, 20)}px monospace`,
      color: "#fff",
      align: "left",
      baseline: "middle",
    });

    this._massText = new Text(this, "M = 1.00", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    this._spinText = new Text(this, "a = 0.70M (70%)", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    this._orbitText = new Text(this, "r = 10.00  \u03A9_drag = 0.0200", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    const items = [this._titleText, this._equationText, this._massText, this._spinText, this._orbitText];
    const spacing = Screen.responsive(14, 20, 24);
    let y = 0;
    for (const item of items) {
      item.x = 0;
      item.y = y;
      y += spacing;
      this._infoScene.add(item);
    }
    this.pipeline.add(this._infoScene);
  }

  _updateInfoHeader() {
    const spinPercent = ((this.spin / this.mass) * 100).toFixed(0);
    const omega = Tensor.kerrFrameDraggingOmega(this.orbitR, Math.PI / 2, this.mass, this.spin);
    this._massText.text = `M = ${this.mass.toFixed(2)}`;
    this._spinText.text = `a = ${this.spin.toFixed(2)}M (${spinPercent}%)`;
    this._orbitText.text = `r = ${this.orbitR.toFixed(2)}  \u03A9_drag = ${omega.toFixed(4)}`;
  }

  // ── Buttons ────────────────────────────────────────────────────────────

  _buildButtons() {
    const { btnMargin, btnSize, btnGap } = CONFIG;
    const centerY = btnMargin + btnSize / 2;

    // Settings toggle button (always visible)
    this._settingsBtn = new ToggleButton(this, {
      text: "\u2699",
      width: btnSize,
      height: btnSize,
      font: "18px monospace",
      onToggle: (isOn) => {
        if (isOn) this.infoPanel.show();
        else this.infoPanel.hide();
      },
    });
    this._settingsBtn.x = btnMargin + btnSize / 2;
    this._settingsBtn.y = centerY;
    this.pipeline.add(this._settingsBtn);

    // New Black Hole button (always visible, right of settings)
    this._shuffleBtn = new Button(this, {
      text: "\u21BB",
      width: btnSize,
      height: btnSize,
      font: "18px monospace",
      colorDefaultBg: "rgba(20, 20, 40, 0.8)",
      colorDefaultStroke: "#f80",
      colorDefaultText: "#fa8",
      colorHoverBg: "rgba(40, 30, 60, 0.9)",
      colorHoverStroke: "#ff0",
      colorHoverText: "#ff0",
      colorPressedBg: "rgba(60, 40, 80, 1)",
      colorPressedStroke: "#fff",
      colorPressedText: "#fff",
      onClick: () => this.shuffleParameters(),
    });
    this._shuffleBtn.x = btnMargin + btnSize + btnGap + btnSize / 2;
    this._shuffleBtn.y = centerY;
    this.pipeline.add(this._shuffleBtn);
  }

  /**
   * 3D projection with zoom applied
   */
  project3D(x, y, z) {
    const proj = this.camera.project(x, y, z);
    return {
      x: proj.x * this.zoom,
      y: proj.y * this.zoom,
      z: proj.z,
      scale: proj.scale * this.zoom,
    };
  }

  onResize() {
    // Recalculate default zoom for new screen size
    this.defaultZoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize),
    );

    // Info header repositioning
    if (this._infoScene) {
      applyAnchor(this._infoScene, {
        anchor: Position.TOP_LEFT,
        anchorOffsetX: Screen.responsive(15, 30, 40),
        anchorOffsetY: Screen.responsive(60, 80, 90),
      });
    }

    // Close modal on resize
    if (this.infoPanel && this.infoPanel.visible) {
      this.infoPanel.hide();
      if (this._settingsBtn) this._settingsBtn.toggle(false);
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check info panel (when visible)
    const feature = this.infoPanel.getFeatureAt(mouseX, mouseY);
    if (feature && feature.desc) {
      if (this.hoveredFeature !== feature) {
        this.hoveredFeature = feature;
        this.tooltip.show(feature.desc, mouseX, mouseY);
      }
      return;
    }

    // Check effective potential graph (responsive)
    const isMobile = this.width < CONFIG.mobileWidth;
    const graphW = isMobile ? 120 : 160;
    const graphH = isMobile ? 70 : 100;
    const graphX = this.width - graphW - (isMobile ? 15 : 20);
    const graphY = isMobile ? 80 : 220; // Desktop moved down to avoid info div

    if (
      mouseX >= graphX - 10 &&
      mouseX <= graphX + graphW + 10 &&
      mouseY >= graphY - 10 &&
      mouseY <= graphY + graphH + 30
    ) {
      if (this.hoveredFeature !== "graph") {
        this.hoveredFeature = "graph";
        this.tooltip.show(
          "Kerr Effective Potential\n\nShows gravitational + centrifugal potential for the current spin.\n\nGreen = prograde ISCO (closer!)\nBlue = retrograde ISCO (farther!)\n\nFrame dragging makes co-rotating orbits more stable.",
          mouseX,
          mouseY,
        );
      }
      return;
    }

    if (this.hoveredFeature) {
      this.hoveredFeature = null;
      this.tooltip.hide();
    }
  }

  initGrid() {
    const { gridSize, gridResolution } = CONFIG;
    this.gridVertices = [];

    for (let i = 0; i <= gridResolution; i++) {
      const row = [];
      for (let j = 0; j <= gridResolution; j++) {
        const x = (i / gridResolution - 0.5) * 2 * gridSize;
        const z = (j / gridResolution - 0.5) * 2 * gridSize;
        row.push({ x, y: 0, z, baseX: x, baseZ: z }); // Store original positions
      }
      this.gridVertices.push(row);
    }

    // Initialize dragged particles in ergosphere
    this.draggedParticles = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 3; // Between horizon and ergosphere
      this.draggedParticles.push({
        angle,
        r,
        baseR: r,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  shuffleParameters() {
    // Randomize mass
    this.mass =
      CONFIG.massRange[0] +
      Math.random() * (CONFIG.massRange[1] - CONFIG.massRange[0]);

    // Randomize spin (as fraction of M)
    const spinFraction =
      CONFIG.spinRange[0] +
      Math.random() * (CONFIG.spinRange[1] - CONFIG.spinRange[0]);
    this.spin = spinFraction * this.mass;

    // Reset orbit outside prograde ISCO
    const iscoP = Tensor.kerrISCO(this.mass, this.spin, true);
    this.orbitR = iscoP + 2 + Math.random() * 8;
    this.orbitPhi = Math.random() * Math.PI * 2;
    this.orbitL = 3.5 + Math.random() * 2;
    this.precessionAngle = 0;
    this.orbitTrail = [];

    // Reset formation - grid goes back to flat, then forms into new Kerr
    this.formationProgress = 0;
    this.formationCompleteTime = null; // Reset for new orbiter fade-in

    // Reset grid to original positions
    const { gridResolution } = CONFIG;
    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const vertex = this.gridVertices[i][j];
        vertex.x = vertex.baseX;
        vertex.z = vertex.baseZ;
        vertex.y = 0;
      }
    }

    // Reset dragged particles
    if (this.draggedParticles) {
      for (const p of this.draggedParticles) {
        p.angle = Math.random() * Math.PI * 2;
      }
    }
  }

  /**
   * Embedding height for Kerr using shared gr.js module.
   * Uses r+ (outer horizon) instead of 2M for the Kerr case.
   */
  getEmbeddingHeight(r) {
    const rPlus = Tensor.kerrHorizonRadius(this.mass, this.spin, false);
    const height = flammEmbeddingHeight(
      r,
      rPlus,
      this.mass,
      CONFIG.gridSize,
      CONFIG.embeddingScale,
    );
    // Clamp to non-negative to prevent grid lines appearing above the flat plane
    return Math.max(0, height);
  }

  /**
   * Update geodesic motion with frame dragging using orbital.js utilities.
   */
  updateGeodesic(dt) {
    const M = this.mass;
    const a = this.spin;
    const r = this.orbitR;

    // Base Keplerian angular velocity
    const baseOmega = keplerianOmega(r, M, CONFIG.orbitSpeed);

    // Frame dragging contribution (Kerr-specific, stays in Tensor)
    const omegaDrag = Tensor.kerrFrameDraggingOmega(r, Math.PI / 2, M, a);

    // Total angular velocity (frame dragging adds to prograde motion)
    const totalOmega =
      baseOmega + omegaDrag * CONFIG.frameDraggingAmplification;

    // Update orbital angle
    this.orbitPhi += totalOmega * dt;

    // Radial oscillation for eccentricity
    this.orbitR = orbitalRadiusSimple(
      CONFIG.orbitSemiMajor,
      CONFIG.orbitEccentricity,
      this.orbitPhi,
    );

    // Keep orbit outside prograde ISCO
    const minR = Tensor.kerrISCO(M, a, true) + 1;
    if (this.orbitR < minR) this.orbitR = minR;

    // GR precession (enhanced by frame dragging)
    const precessionRate = kerrPrecessionRate(r, M, a, CONFIG.precessionFactor);
    this.precessionAngle += precessionRate * dt;

    // Store in trail
    const totalAngle = this.orbitPhi + this.precessionAngle;
    updateTrail(
      this.orbitTrail,
      {
        x: Math.cos(totalAngle) * this.orbitR,
        z: Math.sin(totalAngle) * this.orbitR,
        r: this.orbitR,
        omega: omegaDrag,
      },
      80,
    );
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Formation progress: λ goes from 0 to 1 over formationDuration
    // Once at 1, stays there (Kerr is stationary - the final state)
    const wasForming = this.formationProgress < 1;
    if (this.formationProgress < 1) {
      this.formationProgress += dt / CONFIG.formationDuration;
      if (this.formationProgress >= 1) {
        this.formationProgress = 1;
        // Record when formation completed (for orbiter fade-in)
        this.formationCompleteTime = this.time;
      }
    }

    // Smooth easing for formation (ease-out cubic)
    const lambda = 1 - Math.pow(1 - this.formationProgress, 3);

    this.camera.update(dt);

    // Ease zoom towards target
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    // Only update geodesic motion after black hole has formed
    // The orbiter appears after formation completes
    if (this.formationProgress >= 1) {
      this.updateGeodesic(dt);
    }

    // Update grid with Kerr geometry
    // The twist is proportional to λ (formation progress), NOT accumulating over time
    // This shows the FINAL Kerr geometry, not "evolving" spacetime
    const { gridResolution } = CONFIG;
    const M = this.mass;
    const a = this.spin;
    const rPlus = Tensor.kerrHorizonRadius(M, a, false);
    const rErgo = Tensor.kerrErgosphereRadius(M, a, Math.PI / 2);

    // Extended reach for frame dragging visualization (rubber sheet analogy)
    // Real effect falls off as ~1/r³, but we extend it for visual clarity
    const visualReach = rErgo * CONFIG.frameDraggingReach;

    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const vertex = this.gridVertices[i][j];
        const baseR = Math.sqrt(
          vertex.baseX * vertex.baseX + vertex.baseZ * vertex.baseZ,
        );

        // Frame dragging twist proportional to formation progress (λ)
        // At λ=0: flat spacetime, no twist
        // At λ=1: full Kerr geometry with frame dragging
        // INTENTIONALLY EXAGGERATED: extends beyond physical ergosphere for visibility
        if (baseR > rPlus * 0.5 && baseR < visualReach) {
          const omega = Tensor.kerrFrameDraggingOmega(
            Math.max(baseR, rPlus + 0.1),
            Math.PI / 2,
            M,
            a,
          );

          // Visual falloff: smooth transition from max twist near horizon to zero at visualReach
          // Uses quadratic falloff for smoother visual effect
          const proximityFactor =
            1 - Math.pow((baseR - rPlus) / (visualReach - rPlus), 2);
          const clampedProximity = Math.max(0, proximityFactor);

          // Static twist angle - EXAGGERATED for visualization
          const maxTwist = Math.PI / 4; // ~45 degrees max for dramatic effect
          const twistAngle =
            omega * CONFIG.frameDraggingStrength * lambda * clampedProximity;
          const cappedTwist = Math.min(twistAngle, maxTwist);

          // Apply rotation to grid point
          const cosT = Math.cos(cappedTwist);
          const sinT = Math.sin(cappedTwist);
          vertex.x = vertex.baseX * cosT - vertex.baseZ * sinT;
          vertex.z = vertex.baseX * sinT + vertex.baseZ * cosT;
        }

        // Embedding depth also scales with λ (flat → curved)
        // Function already clamps at horizon, no need for extra clamp here
        const r = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
        vertex.y = this.getEmbeddingHeight(r) * lambda;
      }
    }

    // Update dragged particles in ergosphere
    if (this.draggedParticles) {
      for (const p of this.draggedParticles) {
        // Particles get dragged by frame dragging
        const omega = Tensor.kerrFrameDraggingOmega(p.baseR, Math.PI / 2, M, a);
        p.angle += omega * dt * 50; // Strong visual drag
        // Slight radial oscillation
        p.r = p.baseR + Math.sin(this.time * 2 + p.phase) * 0.3;
      }
    }

    // Update info panel (even when hidden, so values are current when opened)
    // Use EFFECTIVE mass and spin based on formation progress (lambda)
    const effectiveM = Math.max(0.001, this.mass * lambda);
    const effectiveA = this.spin * lambda;

    this.infoPanel.setMetricValues(this.orbitR, Math.PI / 2, effectiveM, effectiveA);
    this.infoPanel.setOrbiterPosition(this.orbitR, this.orbitPhi, effectiveM, effectiveA);

    // Update info header
    this._updateInfoHeader();
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2; // Centered to see fabric edges from outside

    super.render();

    // Draw ergosphere fill with dragged particles
    this.drawErgosphere(cx, cy);

    // Draw grid (now with frame dragging twist!)
    this.drawGrid(cx, cy);

    // Draw rotating black hole with accretion disk
    this.drawHorizon(cx, cy);

    // Draw orbiter
    this.drawOrbiter(cx, cy);

    // Draw effective potential graph
    this.drawEffectivePotential();

    // Draw formation progress indicator
    this.drawFormationProgress(w, h);

    // Draw controls hint
    this.drawControls(w, h);

    // Info modal renders LAST so it overlays everything
    this.infoPanel.render();

    // Tooltip renders after info panel so it's always on top
    this.tooltip.render();
  }

  drawControls(w, h) {
    const isMobile = w < CONFIG.mobileWidth;

    Painter.useCtx((ctx) => {
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#556677";

      if (isMobile) {
        ctx.fillText(
          "drag to rotate \u00B7 pinch to zoom",
          w - 15,
          h - 10,
        );
      } else {
        ctx.fillText(
          "drag to rotate \u00B7 scroll to zoom \u00B7 double-click to reset",
          w - 20,
          h - 10,
        );
      }
    });
  }

  drawFormationProgress(w, h) {
    const progress = this.formationProgress;
    const lambda = 1 - Math.pow(1 - progress, 3); // Eased progress

    // Position above the chart (same x alignment as chart)
    const isMobile = w < CONFIG.mobileWidth;
    const graphW = isMobile ? 120 : 160;
    const graphX = w - graphW - (isMobile ? 15 : 20);
    const graphY = isMobile ? 80 : 220; // Desktop moved down to avoid info div

    const barWidth = graphW; // Same width as chart
    const barHeight = 6;
    const barX = graphX;
    const barY = graphY - 35; // Above the chart

    Painter.useCtx((ctx) => {
      // Phase-aware label
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      let label, color;

      if (progress >= 1) {
        label = "Kerr (stationary)";
        color = "#8f8";
      } else if (lambda < 0.2) {
        label = "Collapse...";
        color = "#fff";
      } else if (lambda < 0.5) {
        label = "Horizon forming...";
        color = "#f88";
      } else if (lambda < 0.8) {
        label = "Ergosphere emerging...";
        color = "#fa8";
      } else {
        label = "Frame dragging stabilizing...";
        color = "#ff0";
      }

      ctx.fillStyle = color;
      ctx.fillText(label, barX, barY - 8);

      // Background bar
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress bar
      const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      gradient.addColorStop(0, "rgba(100, 100, 255, 0.8)");
      gradient.addColorStop(1, "rgba(255, 100, 100, 0.8)");
      ctx.fillStyle = gradient;
      ctx.fillRect(barX, barY, barWidth * progress, barHeight);

      // λ indicator
      ctx.fillStyle = "#888";
      ctx.font = "9px monospace";
      ctx.fillText(`λ = ${progress.toFixed(2)}`, barX, barY + 16);
    });
  }

  drawKeyRadii(cx, cy) {
    const M = this.mass;
    const a = this.spin;

    const radii = [
      {
        r: Tensor.kerrHorizonRadius(M, a, false),
        color: CONFIG.outerHorizonColor,
        label: "r+",
      },
      {
        r: Tensor.kerrErgosphereRadius(M, a, Math.PI / 2),
        color: CONFIG.ergosphereColor,
        label: "ergo",
        dashed: true,
      },
      {
        r: Tensor.kerrISCO(M, a, true),
        color: CONFIG.progradeISCOColor,
        label: "ISCO_pro",
      },
      {
        r: Tensor.kerrISCO(M, a, false),
        color: CONFIG.retrogradeISCOColor,
        label: "ISCO_retro",
      },
    ];

    for (const { r, color, dashed } of radii) {
      if (isNaN(r)) continue;
      const segments = 48;

      Painter.useCtx((ctx) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        if (dashed) ctx.setLineDash([5, 5]);
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          const y = this.getEmbeddingHeight(r);

          const p = this.project3D(x * this.gridScale, y, z * this.gridScale);

          if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
          else ctx.lineTo(cx + p.x, cy + p.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
  }

  drawErgosphere(cx, cy) {
    const M = this.mass;
    const a = this.spin;
    const rErgo = Tensor.kerrErgosphereRadius(M, a, Math.PI / 2);
    const rPlus = Tensor.kerrHorizonRadius(M, a, false);

    if (isNaN(rErgo) || isNaN(rPlus) || rErgo <= rPlus) return;

    // Ergosphere only visible after significant formation (λ > 0.4)
    // This is a property of the final Kerr geometry
    const lambda = 1 - Math.pow(1 - this.formationProgress, 3);
    const ergoVisibility = Math.max(0, (lambda - 0.4) / 0.6); // 0 at λ=0.4, 1 at λ=1
    if (ergoVisibility <= 0) return;

    const segments = 64;

    Painter.useCtx((ctx) => {
      // Semi-transparent orange fill for ergosphere - fades in with formation
      ctx.fillStyle = `rgba(255, 100, 0, ${0.15 * ergoVisibility})`;
      ctx.beginPath();

      // Outer boundary (ergosphere)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * rErgo;
        const z = Math.sin(angle) * rErgo;
        const y = this.getEmbeddingHeight(rErgo);

        const p = this.project3D(x * this.gridScale, y, z * this.gridScale);

        if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
        else ctx.lineTo(cx + p.x, cy + p.y);
      }

      // Inner boundary (horizon) - reverse to create ring
      for (let i = segments; i >= 0; i--) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * rPlus;
        const z = Math.sin(angle) * rPlus;
        const y = this.getEmbeddingHeight(rPlus + 0.1);

        const p = this.project3D(x * this.gridScale, y, z * this.gridScale);
        ctx.lineTo(cx + p.x, cy + p.y);
      }

      ctx.closePath();
      ctx.fill();
    });

    // Draw dragged particles in ergosphere - shows frame dragging!
    // Particles also fade in with ergosphere visibility
    if (this.draggedParticles && ergoVisibility > 0) {
      Painter.useCtx((ctx) => {
        for (const p of this.draggedParticles) {
          // Only draw if within ergosphere
          if (p.r < rErgo && p.r > rPlus) {
            const x = Math.cos(p.angle) * p.r;
            const z = Math.sin(p.angle) * p.r;
            const y = this.getEmbeddingHeight(p.r);

            const proj = this.project3D(
              x * this.gridScale,
              y,
              z * this.gridScale,
            );

            // Particles glow orange - they're being dragged!
            const size = 3 * proj.scale;
            ctx.fillStyle = `rgba(255, 180, 50, ${0.9 * ergoVisibility})`;
            ctx.beginPath();
            ctx.arc(cx + proj.x, cy + proj.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Trail showing direction of drag
            const trailAngle = p.angle - 0.3;
            const trailX = Math.cos(trailAngle) * p.r;
            const trailZ = Math.sin(trailAngle) * p.r;
            const trailProj = this.project3D(
              trailX * this.gridScale,
              y,
              trailZ * this.gridScale,
            );

            ctx.strokeStyle = `rgba(255, 150, 50, ${0.4 * ergoVisibility})`;
            ctx.lineWidth = 2 * proj.scale;
            ctx.beginPath();
            ctx.moveTo(cx + trailProj.x, cy + trailProj.y);
            ctx.lineTo(cx + proj.x, cy + proj.y);
            ctx.stroke();
          }
        }
      });
    }
  }

  drawGrid(cx, cy) {
    const { gridResolution, gridColor, gridHighlight } = CONFIG;
    const gridScale = this.gridScale;

    const projected = this.gridVertices.map((row) =>
      row.map((v) => {
        const p = this.project3D(v.x * gridScale, v.y, v.z * gridScale);
        return { x: cx + p.x, y: cy + p.y, z: p.z };
      }),
    );

    for (let i = 0; i <= gridResolution; i++) {
      const isMain = i % 5 === 0;
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = isMain ? gridHighlight : gridColor;
        ctx.lineWidth = isMain ? 1.2 : 0.6;
        ctx.beginPath();
        for (let j = 0; j <= gridResolution; j++) {
          const p = projected[i][j];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    }

    for (let j = 0; j <= gridResolution; j++) {
      const isMain = j % 5 === 0;
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = isMain ? gridHighlight : gridColor;
        ctx.lineWidth = isMain ? 1.2 : 0.6;
        ctx.beginPath();
        for (let i = 0; i <= gridResolution; i++) {
          const p = projected[i][j];
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    }
  }

  drawHorizon(cx, cy) {
    const rPlus = Tensor.kerrHorizonRadius(this.mass, this.spin, false);

    // Formation progress affects size, intensity, AND vertical position
    // Smooth easing for formation (ease-out cubic)
    const lambda = 1 - Math.pow(1 - this.formationProgress, 3);

    // Black hole sinks down as space curves around it
    // At λ=0: sits at flat space level (y=0)
    // At λ=1: sits at bottom of the well
    const finalY = this.getEmbeddingHeight(rPlus + 0.1);
    const y = finalY * lambda; // Interpolate from 0 to final depth

    const centerP = this.project3D(0, y + 10, 0);
    const centerX = cx + centerP.x;
    const centerY = cy + centerP.y;

    // Black hole size scales with mass AND formation progress
    // Starts as tiny seed (3px), grows to full size
    const fullSize =
      CONFIG.blackHoleSizeBase + this.mass * CONFIG.blackHoleSizeMassScale;
    const seedSize = 3; // Initial collapse seed
    const size = (seedSize + (fullSize - seedSize) * lambda) * centerP.scale;

    // Spin direction indicator (which way the hole rotates)
    const spinDirection = this.spin > 0 ? 1 : -1;
    // Rotation speed increases as formation progresses
    const rotationAngle = this.time * 2 * spinDirection * lambda;

    // During early formation, show bright collapse point
    if (lambda < 0.3) {
      const collapseIntensity = 1 - lambda / 0.3; // Fades out as formation progresses
      Painter.useCtx((ctx) => {
        // Bright white-blue collapse flash
        const flashSize = (10 + (1 - lambda) * 30) * centerP.scale;
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          flashSize,
        );
        gradient.addColorStop(
          0,
          `rgba(255, 255, 255, ${0.9 * collapseIntensity})`,
        );
        gradient.addColorStop(
          0.3,
          `rgba(150, 200, 255, ${0.6 * collapseIntensity})`,
        );
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, flashSize, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Outer glow - intensity grows with formation
    const glowIntensity = 0.2 + lambda * 0.8; // 20% → 100%
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        size,
        centerX,
        centerY,
        size * 4,
      );
      gradient.addColorStop(0, `rgba(100, 50, 150, ${0.5 * glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(255, 100, 50, ${0.2 * glowIntensity})`);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // ROTATING ACCRETION DISK - fades in as black hole forms
    // Only visible after initial collapse phase (λ > 0.2)
    const diskVisibility = Math.max(0, (lambda - 0.2) / 0.8); // 0 at λ=0.2, 1 at λ=1
    if (diskVisibility > 0) {
      Painter.useCtx((ctx) => {
        ctx.save();
        ctx.translate(centerX, centerY);

        // Draw spinning spiral arms
        const numArms = 3;
        for (let arm = 0; arm < numArms; arm++) {
          const armAngle = (arm / numArms) * Math.PI * 2 + rotationAngle;

          // Spiral gradient for each arm
          ctx.beginPath();
          ctx.moveTo(0, 0);

          // Draw spiral
          for (let t = 0; t <= 1; t += 0.02) {
            const r = size * 1.2 + t * size * 2.5;
            const angle = armAngle + t * Math.PI * 1.5 * spinDirection;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r * 0.4; // Flatten for disk perspective
            ctx.lineTo(x, y);
          }

          const baseAlpha = 0.6 - arm * 0.15;
          const alpha = baseAlpha * diskVisibility;
          ctx.strokeStyle = `rgba(255, ${150 + arm * 30}, ${50 + arm * 20}, ${alpha})`;
          ctx.lineWidth = 3 - arm * 0.5;
          ctx.stroke();
        }

        // Inner bright ring (hot gas closest to horizon)
        ctx.strokeStyle = `rgba(255, 200, 100, ${0.8 * diskVisibility})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 1.5, size * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Spinning particles in the disk
        const numParticles = 12;
        for (let i = 0; i < numParticles; i++) {
          const baseAngle = (i / numParticles) * Math.PI * 2;
          const particleR = size * 1.8 + Math.sin(i * 2.7) * size * 0.5;
          const particleAngle =
            baseAngle + rotationAngle * (2 - particleR / (size * 3));
          const px = Math.cos(particleAngle) * particleR;
          const py = Math.sin(particleAngle) * particleR * 0.4;

          const brightness = 150 + Math.sin(this.time * 3 + i) * 50;
          ctx.fillStyle = `rgba(255, ${brightness}, 50, ${0.8 * diskVisibility})`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
    }

    // Black hole body (actual black center)
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();

      // Inner edge glow
      const innerGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        size * 0.7,
        centerX,
        centerY,
        size,
      );
      innerGrad.addColorStop(0, "transparent");
      innerGrad.addColorStop(1, "rgba(255, 100, 0, 0.5)");
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Event horizon circle on grid
    const segments = 32;
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.outerHorizonColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * rPlus;
        const z = Math.sin(angle) * rPlus;

        const p = this.project3D(x * this.gridScale, y, z * this.gridScale);

        if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
        else ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.closePath();
      ctx.stroke();
    });
  }

  drawOrbiter(cx, cy) {
    // Only show orbiter after black hole has fully formed
    // Geodesic motion is a property of the final Kerr spacetime
    if (this.formationProgress < 1) return;

    // Fade in the orbiter over 0.5 seconds after formation completes
    const timeSinceFormation =
      this.formationProgress >= 1
        ? this.time - this.formationCompleteTime || 0
        : 0;
    const orbiterAlpha = Math.min(1, timeSinceFormation * 2); // 0.5s fade-in

    const totalAngle = this.orbitPhi + this.precessionAngle;
    const orbiterX = Math.cos(totalAngle) * this.orbitR;
    const orbiterZ = Math.sin(totalAngle) * this.orbitR;
    const orbiterY = this.getEmbeddingHeight(this.orbitR);

    const p = this.project3D(
      orbiterX * this.gridScale,
      orbiterY,
      orbiterZ * this.gridScale,
    );

    const screenX = cx + p.x;
    const screenY = cy + p.y;
    const size = 5 * p.scale;

    // Glow
    Painter.useCtx((ctx) => {
      ctx.globalAlpha = orbiterAlpha;
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        size * 4,
      );
      gradient.addColorStop(0, CONFIG.orbiterGlow);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Body
    Painter.useCtx((ctx) => {
      ctx.globalAlpha = orbiterAlpha;
      const gradient = ctx.createRadialGradient(
        screenX - size * 0.3,
        screenY - size * 0.3,
        0,
        screenX,
        screenY,
        size,
      );
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.5, CONFIG.orbiterColor);
      gradient.addColorStop(1, CONFIG.orbiterGlow);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    this.drawOrbitPath(cx, cy, orbiterAlpha);
    this.drawOrbitalTrail(cx, cy, orbiterAlpha);
  }

  drawOrbitPath(cx, cy, alpha = 1) {
    const segments = 64;
    const eccentricity = CONFIG.orbitEccentricity;

    Painter.useCtx((ctx) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "rgba(100, 180, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + this.precessionAngle;
        const phi = (i / segments) * Math.PI * 2;
        const radialOscillation = eccentricity * Math.sin(phi * 2);
        const r = CONFIG.orbitSemiMajor + radialOscillation * 2;

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = this.getEmbeddingHeight(r);

        const p = this.project3D(x * this.gridScale, y, z * this.gridScale);

        if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
        else ctx.lineTo(cx + p.x, cy + p.y);
      }

      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  drawOrbitalTrail(cx, cy, fadeAlpha = 1) {
    if (this.orbitTrail.length < 2) return;

    Painter.useCtx((ctx) => {
      ctx.lineCap = "round";

      for (let i = 1; i < this.orbitTrail.length; i++) {
        const t = i / this.orbitTrail.length;
        const point = this.orbitTrail[i];
        const prevPoint = this.orbitTrail[i - 1];

        const trailY = this.getEmbeddingHeight(point.r);
        const prevY = this.getEmbeddingHeight(prevPoint.r);

        const p = this.project3D(
          point.x * this.gridScale,
          trailY,
          point.z * this.gridScale,
        );

        const prevP = this.project3D(
          prevPoint.x * this.gridScale,
          prevY,
          prevPoint.z * this.gridScale,
        );

        const alpha = (1 - t) * 0.5 * fadeAlpha;
        ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
        ctx.lineWidth = (1 - t) * 2.5 * p.scale;
        ctx.beginPath();
        ctx.moveTo(cx + prevP.x, cy + prevP.y);
        ctx.lineTo(cx + p.x, cy + p.y);
        ctx.stroke();
      }
    });
  }

  drawEffectivePotential() {
    // Responsive graph sizing
    const isMobile = this.width < CONFIG.mobileWidth;
    const graphW = isMobile ? 120 : 160;
    const graphH = isMobile ? 70 : 100;
    const graphX = this.width - graphW - (isMobile ? 15 : 20);
    const graphY = isMobile ? 80 : 220; // Desktop moved down to avoid info div
    const M = this.mass;
    const a = this.spin;

    Painter.useCtx((ctx) => {
      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(graphX - 10, graphY - 10, graphW + 20, graphH + 40);

      // Title
      ctx.fillStyle = "#ccc"; // Brightened from #888
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Kerr Effective Potential", graphX + graphW / 2, graphY);

      // Axes
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(graphX, graphY + graphH);
      ctx.lineTo(graphX + graphW, graphY + graphH);
      ctx.moveTo(graphX, graphY + 10);
      ctx.lineTo(graphX, graphY + graphH);
      ctx.stroke();

      // Labels
      ctx.fillStyle = "#aaa"; // Brightened from #666
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText("r", graphX + graphW - 10, graphY + graphH + 12);

      // Plot V_eff (using Schwarzschild approximation for display)
      const rPlus = Tensor.kerrHorizonRadius(M, a, false);
      const rMin = rPlus * 1.2;
      const rMax = 20;

      ctx.strokeStyle = "#8f8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      let firstPoint = true;
      for (let i = 0; i <= 100; i++) {
        const r = rMin + (i / 100) * (rMax - rMin);
        const V = Tensor.effectivePotential(M, this.orbitL, r);

        const px = graphX + ((r - rMin) / (rMax - rMin)) * graphW;
        const py = graphY + graphH - 20 - (V + 0.1) * 300;

        if (py > graphY + 10 && py < graphY + graphH) {
          if (firstPoint) {
            ctx.moveTo(px, py);
            firstPoint = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
      }
      ctx.stroke();

      // Current position
      const currentPx =
        graphX + ((this.orbitR - rMin) / (rMax - rMin)) * graphW;
      const currentV = Tensor.effectivePotential(M, this.orbitL, this.orbitR);
      const currentPy = graphY + graphH - 20 - (currentV + 0.1) * 300;

      if (currentPy > graphY + 10 && currentPy < graphY + graphH) {
        ctx.fillStyle = CONFIG.orbiterColor;
        ctx.beginPath();
        ctx.arc(currentPx, currentPy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mark prograde ISCO
      const iscoP = Tensor.kerrISCO(M, a, true);
      const iscoPx = graphX + ((iscoP - rMin) / (rMax - rMin)) * graphW;
      ctx.strokeStyle = CONFIG.progradeISCOColor;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(iscoPx, graphY + 10);
      ctx.lineTo(iscoPx, graphY + graphH);
      ctx.stroke();

      // Mark retrograde ISCO
      const iscoR = Tensor.kerrISCO(M, a, false);
      const iscoRx = graphX + ((iscoR - rMin) / (rMax - rMin)) * graphW;
      if (iscoRx < graphX + graphW) {
        ctx.strokeStyle = CONFIG.retrogradeISCOColor;
        ctx.beginPath();
        ctx.moveTo(iscoRx, graphY + 10);
        ctx.lineTo(iscoRx, graphY + graphH);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new KerrDemo(canvas);
  demo.start();
});

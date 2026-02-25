/**
 * Schwarzschild Metric - General Relativity Demo
 *
 * Visualization of the Schwarzschild solution to Einstein's field equations.
 * Shows the metric tensor components and geodesic motion with orbital precession.
 *
 * Metric: ds² = -(1-rs/r)c²dt² + (1-rs/r)⁻¹dr² + r²dΩ²
 * where rs = 2GM/c² is the Schwarzschild radius
 */

import { Game, Painter, Camera3D, Screen, Gesture, FPSCounter } from "/gcanvas.es.min.js";
import { Position } from "/gcanvas.es.min.js";
import { Tensor } from "/gcanvas.es.min.js";
import { flammEmbeddingHeight } from "/gcanvas.es.min.js";
import {
  keplerianOmega,
  schwarzschildPrecessionRate,
  orbitalRadiusSimple,
  updateTrail,
  createTrailPoint,
} from "/gcanvas.es.min.js";
import { Tooltip } from "/gcanvas.es.min.js";
import { Button } from "/gcanvas.es.min.js";
import { ToggleButton } from "/gcanvas.es.min.js";
import { Text, Scene, applyAnchor } from "/gcanvas.es.min.js";
import { SchwarzschildInfoPanel } from "./schwarzschild.info.js";

// Configuration
const CONFIG = {
  // Grid parameters - match spacetime.js for clean visuals
  gridSize: 20,
  gridResolution: 40,
  baseGridScale: 15,

  // Mobile breakpoint
  mobileWidth: 600,

  // Physics (geometrized units: G = c = 1)
  schwarzschildRadius: 2.0, // rs = 2M in geometrized units
  massRange: [1.0, 4.0], // Mass range for shuffling

  // Embedding diagram - visible funnel depth
  embeddingScale: 180, // Deeper funnel like Kerr

  // 3D view
  rotationX: 0.5,
  rotationY: 0.3,
  perspective: 900, // Match Kerr for similar depth perception

  // Orbit parameters
  orbitSemiMajor: 10, // Semi-major axis (in units of M)
  orbitEccentricity: 0.3, // Orbital eccentricity
  angularMomentum: 4.0, // Specific angular momentum L/m

  // Animation
  autoRotateSpeed: 0.1,
  orbitSpeed: 0.5, // Base orbital angular velocity
  precessionFactor: 0.15, // GR precession rate

  // Zoom
  minZoom: 0.3,
  maxZoom: 3.0,
  zoomSpeed: 0.5,
  zoomEasing: 0.12,
  baseScreenSize: 600,

  // Black hole visualization - mass-proportional sizing (rubber sheet analogy)
  blackHoleSizeBase: 8,
  blackHoleSizeMassScale: 6,

  // Visual
  gridColor: "rgba(0, 180, 255, 0.3)",
  gridHighlight: "rgba(100, 220, 255, 0.5)",
  horizonColor: "rgba(255, 50, 50, 0.8)",
  photonSphereColor: "rgba(255, 200, 50, 0.6)",
  iscoColor: "rgba(50, 255, 150, 0.6)",
  orbiterColor: "#4af",
  orbiterGlow: "rgba(100, 180, 255, 0.6)",

  // Button layout
  btnMargin: 12,
  btnSize: 44,
  btnGap: 8,
};

class SchwarzschildDemo extends Game {
  constructor(canvas) {
    super(canvas);
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
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;

    // Mass (in geometrized units where G = c = 1)
    this.mass = 1.0;
    this.rs = 2 * this.mass;

    // Initialize grid scale
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
        this.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.targetZoom));
      },
      onPan: null,
    });

    // Double-click to reset zoom and camera
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.camera.reset();
    });

    // Orbital state (using r, phi in equatorial plane)
    this.orbitR = CONFIG.orbitSemiMajor;
    this.orbitPhi = 0;
    this.orbitVr = 0;
    this.orbitL = CONFIG.angularMomentum;
    this.precessionAngle = 0;

    // Trail stores actual positions
    this.orbitTrail = [];

    // Initialize grid vertices
    this.initGrid();

    // Fixed grid scale
    this.gridScale = CONFIG.baseGridScale;

    // ── Info header (zeta-style, top-left) ──
    this._buildInfoHeader();

    // ── Buttons: settings (toggle) + shuffle mass, always visible ──
    this._buildButtons();

    // ── Info modal panel (rendered manually after all scene drawing) ──
    this.infoPanel = new SchwarzschildInfoPanel(this);

    // Panel emits "panel:dismiss" when user clicks outside — untoggle the button
    this.events.on("panel:dismiss", () => {
      this._settingsBtn.toggle(false);
    });

    // Create tooltip for explanations (responsive)
    const isMobile = this.width < CONFIG.mobileWidth;
    this.tooltip = new Tooltip(this, {
      maxWidth: isMobile ? 200 : 280,
      font: `${isMobile ? 9 : 11}px monospace`,
      padding: isMobile ? 6 : 10,
      bgColor: "rgba(20, 20, 30, 0.95)",
    });
    // NOT in pipeline — rendered manually after info panel

    // Track what's being hovered for tooltip
    this.hoveredFeature = null;

    // Mouse move for tooltip
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

    this._titleText = new Text(this, "Schwarzschild Metric", {
      font: `bold ${Screen.responsive(18, 24, 28)}px monospace`,
      color: "#7af",
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

    this._rsText = new Text(this, "rs = 2.00", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    this._orbitText = new Text(this, "r = 10.00  \u03C6 = 0.00", {
      font: `${Screen.responsive(9, 12, 13)}px monospace`,
      color: "#667",
      align: "left",
      baseline: "middle",
    });

    const items = [this._titleText, this._equationText, this._massText, this._rsText, this._orbitText];
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
    const totalAngle = this.orbitPhi + this.precessionAngle;
    const phi = (totalAngle % (2 * Math.PI)).toFixed(2);
    this._massText.text = `M = ${this.mass.toFixed(2)}`;
    this._rsText.text = `rs = 2M = ${this.rs.toFixed(2)}`;
    this._orbitText.text = `r = ${this.orbitR.toFixed(2)}  \u03C6 = ${phi}`;
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
        if (isOn) {
          this.infoPanel.show();
        } else {
          this.infoPanel.hide();
        }
      },
    });
    this._settingsBtn.x = btnMargin + btnSize / 2;
    this._settingsBtn.y = centerY;
    this.pipeline.add(this._settingsBtn);

    // Shuffle mass button (always visible, right of settings)
    this._shuffleBtn = new Button(this, {
      text: "\u21BB",
      width: btnSize,
      height: btnSize,
      font: "18px monospace",
      colorDefaultBg: "rgba(20, 20, 40, 0.8)",
      colorDefaultStroke: "#7af",
      colorDefaultText: "#8af",
      colorHoverBg: "rgba(40, 30, 60, 0.9)",
      colorHoverStroke: "#aff",
      colorHoverText: "#aff",
      colorPressedBg: "rgba(60, 40, 80, 1)",
      colorPressedStroke: "#fff",
      colorPressedText: "#fff",
      onClick: () => this.shuffleParameters(),
    });
    this._shuffleBtn.x = btnMargin + btnSize + btnGap + btnSize / 2;
    this._shuffleBtn.y = centerY;
    this.pipeline.add(this._shuffleBtn);
  }

  // ── Mouse / Tooltip ────────────────────────────────────────────────────

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if over info panel (when visible)
    if (this.infoPanel.visible) {
      const feature = this.infoPanel.getFeatureAt(mouseX, mouseY);
      if (feature && feature.desc) {
        if (this.hoveredFeature !== feature) {
          this.hoveredFeature = feature;
          this.tooltip.show(feature.desc, mouseX, mouseY);
        }
        return;
      }
    }

    // Check if over effective potential graph (responsive)
    const isMobile = this.width < CONFIG.mobileWidth;
    const graphW = isMobile ? 120 : 160;
    const graphH = isMobile ? 70 : 100;
    const graphX = this.width - graphW - (isMobile ? 15 : 20);
    const graphY = isMobile ? 80 : 220;

    if (
      mouseX >= graphX - 10 &&
      mouseX <= graphX + graphW + 10 &&
      mouseY >= graphY - 10 &&
      mouseY <= graphY + graphH + 30
    ) {
      if (this.hoveredFeature !== "graph") {
        this.hoveredFeature = "graph";
        this.tooltip.show(
          "Effective Potential V_eff(r)\n\nShows the combined gravitational and centrifugal potential.\n\nThe blue dot marks the orbiter's current position.\n\nLocal minima = stable orbits\nLocal maxima = unstable orbits\n\nThe GR term (-ML\u00B2/r\u00B3) creates the inner peak that doesn't exist in Newtonian gravity.",
          mouseX,
          mouseY,
        );
      }
      return;
    }

    // Not over anything - hide tooltip
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
        row.push({ x, y: 0, z });
      }
      this.gridVertices.push(row);
    }
  }

  shuffleParameters() {
    this.mass =
      CONFIG.massRange[0] +
      Math.random() * (CONFIG.massRange[1] - CONFIG.massRange[0]);
    this.rs = 2 * this.mass;

    const isco = Tensor.iscoRadius(this.rs);
    this.orbitR = isco + 2 + Math.random() * 8;
    this.orbitPhi = Math.random() * Math.PI * 2;
    this.orbitL = 3.5 + Math.random() * 2;
    this.precessionAngle = 0;

    this.orbitTrail = [];
  }

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
    this.defaultZoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize)
    );

    // Info header repositioning
    if (this._infoScene) {
      applyAnchor(this._infoScene, {
        anchor: Position.TOP_LEFT,
        anchorOffsetX: Screen.responsive(15, 30, 40),
        anchorOffsetY: Screen.responsive(60, 80, 90),
      });
    }

    // Close modal on resize (re-layout)
    if (this.infoPanel && this.infoPanel.visible) {
      this.infoPanel.hide();
      if (this._settingsBtn) this._settingsBtn.toggle(false);
    }
  }

  getEmbeddingHeight(r) {
    const height = flammEmbeddingHeight(
      r,
      this.rs,
      this.mass,
      CONFIG.gridSize,
      CONFIG.embeddingScale,
    );
    return Math.max(0, height);
  }

  effectivePotential(r) {
    return Tensor.effectivePotential(this.mass, this.orbitL, r);
  }

  updateGeodesic(dt) {
    const r = this.orbitR;

    const baseOmega = keplerianOmega(r, this.mass, CONFIG.orbitSpeed);
    this.orbitPhi += baseOmega * dt;

    this.orbitR = orbitalRadiusSimple(
      CONFIG.orbitSemiMajor,
      CONFIG.orbitEccentricity,
      this.orbitPhi,
    );

    const minR = Tensor.iscoRadius(this.rs) + 1;
    if (this.orbitR < minR) this.orbitR = minR;

    const precessionRate = schwarzschildPrecessionRate(
      r,
      this.rs,
      CONFIG.precessionFactor,
    );
    this.precessionAngle += precessionRate * dt;

    const totalAngle = this.orbitPhi + this.precessionAngle;
    updateTrail(this.orbitTrail, createTrailPoint(this.orbitR, totalAngle), 80);
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    this.camera.update(dt);

    // Ease zoom towards target
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    this.updateGeodesic(dt);

    // Update grid with Flamm's paraboloid embedding
    const { gridResolution } = CONFIG;
    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const vertex = this.gridVertices[i][j];
        const r = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
        vertex.y = this.getEmbeddingHeight(r);
      }
    }

    // Update info panel (even when hidden, so values are current when opened)
    this.infoPanel.setMetricValues(this.orbitR, this.rs, this.mass);
    this.infoPanel.setOrbiterPosition(this.orbitR, this.orbitPhi);

    // Update info header
    this._updateInfoHeader();
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    super.render();

    // Draw grid
    this.drawGrid(cx, cy);

    // Draw event horizon
    this.drawHorizon(cx, cy);

    // Draw orbiter
    this.drawOrbiter(cx, cy);

    // Draw effective potential graph
    this.drawEffectivePotential();

    // Draw controls hint
    this.drawControls(w, h);

    // Info modal renders LAST so it overlays everything
    this.infoPanel.render();

    // Tooltip renders after info panel so it's always on top
    this.tooltip.render();
  }

  drawKeyRadii(cx, cy) {
    const radii = [
      { r: this.rs, color: CONFIG.horizonColor, label: "rs" },
      { r: this.rs * 1.5, color: CONFIG.photonSphereColor, label: "r_ph" },
      { r: this.rs * 3, color: CONFIG.iscoColor, label: "ISCO" },
    ];

    for (const { r, color, label } of radii) {
      const segments = 48;
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();

        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          const y = this.getEmbeddingHeight(r);

          const p = this.project3D(
            x * this.gridScale,
            y,
            z * this.gridScale,
          );

          if (i === 0) {
            ctx.moveTo(cx + p.x, cy + p.y);
          } else {
            ctx.lineTo(cx + p.x, cy + p.y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
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
    const segments = 32;
    const r = this.rs;
    const y = this.getEmbeddingHeight(r + 0.1);

    const centerP = this.project3D(0, y + 10, 0);
    const centerX = cx + centerP.x;
    const centerY = cy + centerP.y;

    const baseSize =
      CONFIG.blackHoleSizeBase + this.mass * CONFIG.blackHoleSizeMassScale;
    const size = baseSize * centerP.scale;

    // Dark glow
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        centerX, centerY, size,
        centerX, centerY, size * 3,
      );
      gradient.addColorStop(0, "rgba(80, 40, 120, 0.6)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Black hole body
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(150, 100, 200, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 1.3, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Event horizon circle on the grid
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.horizonColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        const p = this.project3D(
          x * this.gridScale,
          y,
          z * this.gridScale,
        );

        if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
        else ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.closePath();
      ctx.stroke();
    });
  }

  drawOrbiter(cx, cy) {
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
      const gradient = ctx.createRadialGradient(
        screenX, screenY, 0,
        screenX, screenY, size * 4,
      );
      gradient.addColorStop(0, CONFIG.orbiterGlow);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Body
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        screenX - size * 0.3, screenY - size * 0.3, 0,
        screenX, screenY, size,
      );
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.5, CONFIG.orbiterColor);
      gradient.addColorStop(1, CONFIG.orbiterGlow);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();
    });

    this.drawOrbitPath(cx, cy);
    this.drawOrbitalTrail(cx, cy);
  }

  drawOrbitPath(cx, cy) {
    const segments = 64;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = "rgba(100, 180, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + this.precessionAngle;
        const phi = (i / segments) * Math.PI * 2;

        const r = orbitalRadiusSimple(
          CONFIG.orbitSemiMajor,
          CONFIG.orbitEccentricity,
          phi,
        );

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = this.getEmbeddingHeight(r);

        const p = this.project3D(
          x * this.gridScale,
          y,
          z * this.gridScale,
        );

        if (i === 0) {
          ctx.moveTo(cx + p.x, cy + p.y);
        } else {
          ctx.lineTo(cx + p.x, cy + p.y);
        }
      }

      ctx.closePath();
      ctx.stroke();
    });
  }

  drawOrbitalTrail(cx, cy) {
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

        const alpha = (1 - t) * 0.5;
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
    const isMobile = this.width < CONFIG.mobileWidth;
    const graphW = isMobile ? 120 : 160;
    const graphH = isMobile ? 70 : 100;
    const graphX = this.width - graphW - (isMobile ? 15 : 20);
    const graphY = isMobile ? 80 : 220;

    Painter.useCtx((ctx) => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(graphX - 10, graphY - 10, graphW + 20, graphH + 40);

      ctx.fillStyle = "#888";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Effective Potential V_eff(r)", graphX + graphW / 2, graphY);

      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(graphX, graphY + graphH);
      ctx.lineTo(graphX + graphW, graphY + graphH);
      ctx.moveTo(graphX, graphY + 10);
      ctx.lineTo(graphX, graphY + graphH);
      ctx.stroke();

      ctx.fillStyle = "#666";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText("r", graphX + graphW - 10, graphY + graphH + 12);
      ctx.fillText("V", graphX - 8, graphY + 15);

      ctx.strokeStyle = "#8f8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const rMin = this.rs * 1.2;
      const rMax = 20;
      let firstPoint = true;

      for (let i = 0; i <= 100; i++) {
        const r = rMin + (i / 100) * (rMax - rMin);
        const V = this.effectivePotential(r);

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

      const currentPx =
        graphX + ((this.orbitR - rMin) / (rMax - rMin)) * graphW;
      const currentV = this.effectivePotential(this.orbitR);
      const currentPy = graphY + graphH - 20 - (currentV + 0.1) * 300;

      if (currentPy > graphY + 10 && currentPy < graphY + graphH) {
        ctx.fillStyle = CONFIG.orbiterColor;
        ctx.beginPath();
        ctx.arc(currentPx, currentPy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      const iscoPx = graphX + ((3 * this.rs - rMin) / (rMax - rMin)) * graphW;
      ctx.strokeStyle = CONFIG.iscoColor;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(iscoPx, graphY + 10);
      ctx.lineTo(iscoPx, graphY + graphH);
      ctx.stroke();
      ctx.setLineDash([]);
    });
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
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new SchwarzschildDemo(canvas);
  demo.start();
});

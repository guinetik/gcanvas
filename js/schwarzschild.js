/**
 * Schwarzschild Metric - General Relativity Demo
 *
 * Visualization of the Schwarzschild solution to Einstein's field equations.
 * Shows the metric tensor components and geodesic motion with orbital precession.
 *
 * Metric: ds² = -(1-rs/r)c²dt² + (1-rs/r)⁻¹dr² + r²dΩ²
 * where rs = 2GM/c² is the Schwarzschild radius
 */

import { Game, Painter, Camera3D } from "/gcanvas.es.min.js";
import { GameObject } from "/gcanvas.es.min.js";
import { Rectangle } from "/gcanvas.es.min.js";
import { TextShape } from "/gcanvas.es.min.js";
import { Position } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Grid parameters
  gridSize: 20,
  gridResolution: 40,
  baseGridScale: 12,        // Base scale, adjusted for screen size

  // Physics (geometrized units: G = c = 1)
  schwarzschildRadius: 2.0,  // rs = 2M in geometrized units
  massRange: [1.0, 4.0],     // Mass range for shuffling

  // Embedding diagram
  embeddingScale: 25,        // Scale for Flamm's paraboloid

  // 3D view
  rotationX: 0.6,
  rotationY: 0.3,
  perspective: 1000,

  // Orbit parameters
  orbitSemiMajor: 10,        // Semi-major axis (in units of M)
  orbitEccentricity: 0.3,    // Orbital eccentricity
  angularMomentum: 4.0,      // Specific angular momentum L/m

  // Animation
  autoRotateSpeed: 0.1,
  orbitSpeed: 0.5,           // Base orbital angular velocity
  precessionFactor: 0.15,    // GR precession rate

  // Visual
  gridColor: "rgba(0, 180, 255, 0.3)",
  gridHighlight: "rgba(100, 220, 255, 0.5)",
  horizonColor: "rgba(255, 50, 50, 0.8)",
  photonSphereColor: "rgba(255, 200, 50, 0.6)",
  iscoColor: "rgba(50, 255, 150, 0.6)",
  orbiterColor: "#4af",
  orbiterGlow: "rgba(100, 180, 255, 0.6)",
};

/**
 * MetricPanelGO - Displays the Schwarzschild metric tensor components
 */
class MetricPanelGO extends GameObject {
  constructor(game, options = {}) {
    const panelWidth = 320;
    const panelHeight = 280;

    super(game, {
      ...options,
      width: panelWidth,
      height: panelHeight,
      anchor: Position.BOTTOM_LEFT,
      anchorMargin: 20,
    });

    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;

    // Background
    this.bgRect = new Rectangle({
      width: panelWidth,
      height: panelHeight,
      color: "rgba(0, 0, 0, 0.7)",
    });

    // Title
    this.titleText = new TextShape("Schwarzschild Metric Tensor", {
      font: "bold 13px monospace",
      color: "#7af",
      align: "left",
      baseline: "top",
    });

    // Metric equation
    this.metricEqText = new TextShape("ds² = gμν dxμ dxν", {
      font: "12px monospace",
      color: "#888",
      align: "left",
      baseline: "top",
    });

    // Tensor components (will be updated)
    this.gttLabel = new TextShape("g_tt = -(1 - rs/r)", {
      font: "11px monospace",
      color: "#f88",
      align: "left",
      baseline: "top",
    });
    this.gttValue = new TextShape("= -0.800", {
      font: "11px monospace",
      color: "#fff",
      align: "left",
      baseline: "top",
    });

    this.grrLabel = new TextShape("g_rr = (1 - rs/r)⁻¹", {
      font: "11px monospace",
      color: "#8f8",
      align: "left",
      baseline: "top",
    });
    this.grrValue = new TextShape("= 1.250", {
      font: "11px monospace",
      color: "#fff",
      align: "left",
      baseline: "top",
    });

    this.gththLabel = new TextShape("g_θθ = r²", {
      font: "11px monospace",
      color: "#88f",
      align: "left",
      baseline: "top",
    });
    this.gththValue = new TextShape("= 100.00", {
      font: "11px monospace",
      color: "#fff",
      align: "left",
      baseline: "top",
    });

    this.gphphLabel = new TextShape("g_φφ = r²sin²θ", {
      font: "11px monospace",
      color: "#f8f",
      align: "left",
      baseline: "top",
    });
    this.gphphValue = new TextShape("= 100.00", {
      font: "11px monospace",
      color: "#fff",
      align: "left",
      baseline: "top",
    });

    // Key radii
    this.rsText = new TextShape("rs = 2GM/c² = 2.00", {
      font: "10px monospace",
      color: "#f55",
      align: "left",
      baseline: "top",
    });
    this.rphText = new TextShape("r_photon = 1.5rs = 3.00", {
      font: "10px monospace",
      color: "#fa5",
      align: "left",
      baseline: "top",
    });
    this.riscoText = new TextShape("r_ISCO = 3rs = 6.00", {
      font: "10px monospace",
      color: "#5f8",
      align: "left",
      baseline: "top",
    });

    // Current position
    this.posText = new TextShape("Orbiter: r = 10.00, φ = 0.00", {
      font: "10px monospace",
      color: "#aaa",
      align: "left",
      baseline: "top",
    });
  }

  setMetricValues(r, rs, theta = Math.PI / 2) {
    // Calculate metric components
    const factor = 1 - rs / r;
    const gtt = -factor;
    const grr = 1 / factor;
    const gthth = r * r;
    const gphph = r * r * Math.sin(theta) * Math.sin(theta);

    this.gttValue.text = `= ${gtt.toFixed(4)}`;
    this.grrValue.text = `= ${grr.toFixed(4)}`;
    this.gththValue.text = `= ${gthth.toFixed(2)}`;
    this.gphphValue.text = `= ${gphph.toFixed(2)}`;

    // Update key radii
    this.rsText.text = `rs = 2GM/c² = ${rs.toFixed(2)}`;
    this.rphText.text = `r_photon = 1.5rs = ${(1.5 * rs).toFixed(2)}`;
    this.riscoText.text = `r_ISCO = 3rs = ${(3 * rs).toFixed(2)}`;
  }

  setOrbiterPosition(r, phi) {
    this.posText.text = `Orbiter: r = ${r.toFixed(2)}, φ = ${(phi % (2 * Math.PI)).toFixed(2)}`;
  }

  draw() {
    super.draw();

    this.bgRect.render();

    const left = -this.panelWidth / 2 + 15;
    let y = -this.panelHeight / 2 + 15;
    const lineHeight = 16;
    const sectionGap = 8;

    // Title
    Painter.save();
    Painter.translate(left, y);
    this.titleText.render();
    Painter.restore();
    y += lineHeight + 4;

    // Metric equation
    Painter.save();
    Painter.translate(left, y);
    this.metricEqText.render();
    Painter.restore();
    y += lineHeight + sectionGap;

    // g_tt
    Painter.save();
    Painter.translate(left, y);
    this.gttLabel.render();
    Painter.restore();
    Painter.save();
    Painter.translate(left + 160, y);
    this.gttValue.render();
    Painter.restore();
    y += lineHeight;

    // g_rr
    Painter.save();
    Painter.translate(left, y);
    this.grrLabel.render();
    Painter.restore();
    Painter.save();
    Painter.translate(left + 160, y);
    this.grrValue.render();
    Painter.restore();
    y += lineHeight;

    // g_θθ
    Painter.save();
    Painter.translate(left, y);
    this.gththLabel.render();
    Painter.restore();
    Painter.save();
    Painter.translate(left + 160, y);
    this.gththValue.render();
    Painter.restore();
    y += lineHeight;

    // g_φφ
    Painter.save();
    Painter.translate(left, y);
    this.gphphLabel.render();
    Painter.restore();
    Painter.save();
    Painter.translate(left + 160, y);
    this.gphphValue.render();
    Painter.restore();
    y += lineHeight + sectionGap;

    // Key radii section
    Painter.save();
    Painter.translate(left, y);
    this.rsText.render();
    Painter.restore();
    y += lineHeight - 2;

    Painter.save();
    Painter.translate(left, y);
    this.rphText.render();
    Painter.restore();
    y += lineHeight - 2;

    Painter.save();
    Painter.translate(left, y);
    this.riscoText.render();
    Painter.restore();
    y += lineHeight + sectionGap;

    // Orbiter position
    Painter.save();
    Painter.translate(left, y);
    this.posText.render();
    Painter.restore();
  }
}

class SchwarzschildDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000008";
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.time = 0;

    // Mass (in geometrized units where G = c = 1)
    this.mass = 1.0;
    this.rs = 2 * this.mass;  // Schwarzschild radius

    // Initialize grid scale (will be updated for screen size)
    this.gridScale = CONFIG.baseGridScale;

    // Camera
    this.camera = new Camera3D({
      rotationX: CONFIG.rotationX,
      rotationY: CONFIG.rotationY,
      perspective: CONFIG.perspective,
      minRotationX: 0.2,
      maxRotationX: 1.3,
      autoRotate: true,
      autoRotateSpeed: CONFIG.autoRotateSpeed,
      autoRotateAxis: 'y',
    });
    this.camera.enableMouseControl(this.canvas);

    // Orbital state (using r, phi in equatorial plane)
    this.orbitR = CONFIG.orbitSemiMajor;
    this.orbitPhi = 0;
    this.orbitVr = 0;  // Radial velocity
    this.orbitL = CONFIG.angularMomentum;  // Angular momentum per unit mass
    this.precessionAngle = 0;

    // Trail stores actual positions
    this.orbitTrail = [];

    // Initialize grid vertices
    this.initGrid();

    // Grid scale responsive to screen size
    this.updateGridScale();

    // Create metric panel
    this.metricPanel = new MetricPanelGO(this, { name: "metricPanel" });
    this.pipeline.add(this.metricPanel);

    // Click to shuffle
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
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

  updateGridScale() {
    // Scale grid to fit screen while keeping physics unchanged
    const minDim = Math.min(this.width, this.height);
    this.gridScale = CONFIG.baseGridScale * (minDim / 800);
  }

  handleClick(e) {
    if (this.camera.isDragging()) return;
    this.shuffleParameters();
  }

  shuffleParameters() {
    // Randomize mass
    this.mass = CONFIG.massRange[0] + Math.random() * (CONFIG.massRange[1] - CONFIG.massRange[0]);
    this.rs = 2 * this.mass;

    // Randomize orbit (keep it outside ISCO)
    const isco = 3 * this.rs;
    this.orbitR = isco + 2 + Math.random() * 8;
    this.orbitPhi = Math.random() * Math.PI * 2;
    this.orbitL = 3.5 + Math.random() * 2;
    this.precessionAngle = 0;

    // Clear trail for fresh start
    this.orbitTrail = [];
  }

  /**
   * Flamm's paraboloid embedding: z² = 8M(r - 2M)
   * Inverted so it looks like a gravity well going DOWN
   */
  getEmbeddingHeight(r) {
    if (r <= this.rs) return CONFIG.embeddingScale * 2;  // Deep well at horizon
    const height = Math.sqrt(8 * this.mass * (r - this.rs));
    // Invert: far = flat (y=0), near horizon = deep (y=positive into well)
    const maxHeight = Math.sqrt(8 * this.mass * (CONFIG.gridSize - this.rs));
    return (maxHeight - height) * CONFIG.embeddingScale / 4;
  }

  /**
   * Effective potential for geodesic motion
   * V_eff = -M/r + L²/(2r²) - ML²/r³
   */
  effectivePotential(r) {
    const M = this.mass;
    const L = this.orbitL;
    return -M / r + (L * L) / (2 * r * r) - (M * L * L) / (r * r * r);
  }

  /**
   * Update geodesic motion using effective potential
   * Simplified for visualization while maintaining GR character
   */
  updateGeodesic(dt) {
    const M = this.mass;
    const r = this.orbitR;

    // Kepler's 3rd law base: ω ∝ 1/r^(3/2), scaled for visibility
    // Closer orbits are faster (like real gravity)
    const baseOmega = CONFIG.orbitSpeed * Math.sqrt(M) / Math.pow(r / 5, 1.5);

    // Update orbital angle
    this.orbitPhi += baseOmega * dt;

    // Add radial oscillation for slight eccentricity effect
    const eccentricity = 0.15;
    const radialOscillation = eccentricity * Math.sin(this.orbitPhi * 2);
    this.orbitR = CONFIG.orbitSemiMajor + radialOscillation * 2;

    // Keep orbit bounded outside ISCO
    const minR = this.rs * 3 + 1;
    if (this.orbitR < minR) this.orbitR = minR;

    // GR precession: orbit doesn't close, rotates over time
    // Rate increases closer to black hole: Δφ ≈ 6πM/r per orbit
    const precessionRate = CONFIG.precessionFactor * (this.rs / r);
    this.precessionAngle += precessionRate * dt;

    // Store current position in trail
    const totalAngle = this.orbitPhi + this.precessionAngle;
    this.orbitTrail.unshift({
      x: Math.cos(totalAngle) * this.orbitR,
      z: Math.sin(totalAngle) * this.orbitR,
      r: this.orbitR,
    });

    // Limit trail length
    const maxTrailLength = 80;
    if (this.orbitTrail.length > maxTrailLength) {
      this.orbitTrail.pop();
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    this.camera.update(dt);
    this.updateGeodesic(dt);
    this.updateGridScale();  // Keep grid responsive

    // Update grid with Flamm's paraboloid embedding
    const { gridResolution } = CONFIG;
    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const vertex = this.gridVertices[i][j];
        const r = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
        vertex.y = this.getEmbeddingHeight(Math.max(r, this.rs + 0.1));
      }
    }

    // Update metric panel
    if (this.metricPanel) {
      this.metricPanel.setMetricValues(this.orbitR, this.rs);
      this.metricPanel.setOrbiterPosition(this.orbitR, this.orbitPhi);
    }
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2 + 30;

    super.render();

    // Draw key radii circles
    this.drawKeyRadii(cx, cy);

    // Draw grid
    this.drawGrid(cx, cy);

    // Draw event horizon
    this.drawHorizon(cx, cy);

    // Draw orbiter
    this.drawOrbiter(cx, cy);

    // Draw effective potential graph
    this.drawEffectivePotential();

    // Draw controls
    this.drawControls(w, h);
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

          const p = this.camera.project(
            x * this.gridScale,
            y,
            z * this.gridScale
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

    const projected = this.gridVertices.map(row =>
      row.map(v => {
        const p = this.camera.project(v.x * gridScale, v.y, v.z * gridScale);
        return { x: cx + p.x, y: cy + p.y, z: p.z };
      })
    );

    // Draw grid lines
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
    // Draw filled event horizon
    const segments = 32;
    const r = this.rs;
    const y = this.getEmbeddingHeight(r + 0.1);

    Painter.useCtx((ctx) => {
      ctx.fillStyle = "rgba(20, 0, 30, 0.9)";
      ctx.strokeStyle = CONFIG.horizonColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        const p = this.camera.project(
          x * this.gridScale,
          y,
          z * this.gridScale
        );

        if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
        else ctx.lineTo(cx + p.x, cy + p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // Singularity point
    const centerP = this.camera.project(0, y + 20, 0);
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#f0f";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx + centerP.x, cy + centerP.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  drawOrbiter(cx, cy) {
    // Apply precession to orbit
    const totalAngle = this.orbitPhi + this.precessionAngle;

    // Position in orbital plane
    const orbiterX = Math.cos(totalAngle) * this.orbitR;
    const orbiterZ = Math.sin(totalAngle) * this.orbitR;
    const orbiterY = this.getEmbeddingHeight(this.orbitR);

    const p = this.camera.project(
      orbiterX * this.gridScale,
      orbiterY,
      orbiterZ * this.gridScale
    );

    const screenX = cx + p.x;
    const screenY = cy + p.y;
    const size = 5 * p.scale;

    // Glow
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        screenX, screenY, 0,
        screenX, screenY, size * 4
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
        screenX, screenY, size
      );
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.5, CONFIG.orbiterColor);
      gradient.addColorStop(1, CONFIG.orbiterGlow);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw full orbital path
    this.drawOrbitPath(cx, cy);

    // Draw trailing tail
    this.drawOrbitalTrail(cx, cy);
  }

  drawOrbitPath(cx, cy) {
    const segments = 64;
    const eccentricity = 0.15;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = "rgba(100, 180, 255, 0.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        // Full circle with precession applied
        const angle = (i / segments) * Math.PI * 2 + this.precessionAngle;
        const phi = (i / segments) * Math.PI * 2;

        // Same radius formula as the orbiter
        const radialOscillation = eccentricity * Math.sin(phi * 2);
        const r = CONFIG.orbitSemiMajor + radialOscillation * 2;

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = this.getEmbeddingHeight(r);

        const p = this.camera.project(
          x * this.gridScale,
          y,
          z * this.gridScale
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

        const p = this.camera.project(
          point.x * this.gridScale,
          trailY,
          point.z * this.gridScale
        );

        const prevP = this.camera.project(
          prevPoint.x * this.gridScale,
          prevY,
          prevPoint.z * this.gridScale
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
    const graphX = this.width - 180;
    const graphY = 180;  // Offset down to clear title area
    const graphW = 160;
    const graphH = 100;

    Painter.useCtx((ctx) => {
      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(graphX - 10, graphY - 10, graphW + 20, graphH + 40);

      // Title
      ctx.fillStyle = "#888";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Effective Potential V_eff(r)", graphX + graphW / 2, graphY);

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
      ctx.fillStyle = "#666";
      ctx.font = "8px monospace";
      ctx.textAlign = "left";
      ctx.fillText("r", graphX + graphW - 10, graphY + graphH + 12);
      ctx.fillText("V", graphX - 8, graphY + 15);

      // Plot V_eff
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

      // Current position marker
      const currentPx = graphX + ((this.orbitR - rMin) / (rMax - rMin)) * graphW;
      const currentV = this.effectivePotential(this.orbitR);
      const currentPy = graphY + graphH - 20 - (currentV + 0.1) * 300;

      if (currentPy > graphY + 10 && currentPy < graphY + graphH) {
        ctx.fillStyle = CONFIG.orbiterColor;
        ctx.beginPath();
        ctx.arc(currentPx, currentPy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mark ISCO
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
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#445";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText("click to shuffle  |  drag to rotate", w - 15, h - 30);
      ctx.fillText("Flamm's paraboloid embedding  |  Geodesic precession", w - 15, h - 15);
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new SchwarzschildDemo(canvas);
  demo.start();
});

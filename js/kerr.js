/**
 * Kerr Metric - Rotating Black Hole Demo
 *
 * Visualization of the Kerr solution to Einstein's field equations.
 * Shows frame dragging, ergosphere, and the non-diagonal metric tensor.
 *
 * Key difference from Schwarzschild: g_tφ ≠ 0 (frame dragging term)
 */

import { Game, Painter, Camera3D } from "/gcanvas.es.min.js";
import { GameObject } from "/gcanvas.es.min.js";
import { Rectangle } from "/gcanvas.es.min.js";
import { TextShape } from "/gcanvas.es.min.js";
import { Position } from "/gcanvas.es.min.js";
import { Tensor } from "/gcanvas.es.min.js";
import { verticalLayout, applyLayout } from "/gcanvas.es.min.js";
import { Tooltip } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Grid parameters
  gridSize: 20,
  gridResolution: 40,
  baseGridScale: 12,

  // Physics (geometrized units: G = c = 1)
  defaultMass: 1.0,
  defaultSpin: 0.7, // 70% of extremal
  massRange: [1.0, 3.0],
  spinRange: [0.1, 0.95], // As fraction of M

  // Embedding diagram (exaggerated for visual drama)
  embeddingScale: 50,

  // 3D view
  rotationX: 0.6,
  rotationY: 0.3,
  perspective: 1000,

  // Orbit parameters
  orbitSemiMajor: 10,
  orbitEccentricity: 0.15,
  angularMomentum: 4.0,

  // Animation
  autoRotateSpeed: 0.1,
  orbitSpeed: 0.5,
  precessionFactor: 0.15,
  frameDraggingAmplification: 3.0, // Visual enhancement

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
};

/**
 * KerrMetricPanelGO - Displays the Kerr metric tensor components
 * Highlights the off-diagonal g_tφ frame dragging term
 */
class KerrMetricPanelGO extends GameObject {
  constructor(game, options = {}) {
    const panelWidth = 340;
    const panelHeight = 300;
    const lineHeight = 14;
    const valueOffset = 180;

    super(game, {
      ...options,
      width: panelWidth,
      height: panelHeight,
      anchor: Position.BOTTOM_LEFT,
    });

    this.bgRect = new Rectangle({
      width: panelWidth,
      height: panelHeight,
      color: "rgba(0, 0, 0, 0.7)",
    });

    // Define features with descriptions for tooltips
    this.features = {
      title: {
        text: "Kerr Metric (Rotating Black Hole)",
        font: "bold 12px monospace",
        color: "#f7a",
        height: lineHeight + 4,
        desc: "The Kerr metric describes spacetime around a rotating (spinning) black hole. Discovered by Roy Kerr in 1963, it's more realistic than Schwarzschild since real black holes spin.",
      },
      equation: {
        text: "ds² = gμν dxμ dxν (Boyer-Lindquist)",
        font: "12px monospace",
        color: "#888",
        height: lineHeight,
        desc: "Boyer-Lindquist coordinates (t, r, θ, φ) generalize Schwarzschild coordinates for rotating spacetime.",
      },
      mass: {
        text: "M = 1.00",
        font: "11px monospace",
        color: "#888",
        height: lineHeight,
        desc: "Mass of the black hole in geometrized units (G = c = 1).",
      },
      spin: {
        text: "a = 0.70M (70%)",
        font: "bold 11px monospace",
        color: "#fa8",
        height: lineHeight + 4,
        desc: "Spin parameter a = J/Mc (angular momentum per unit mass).\n\n0 = Schwarzschild (no rotation)\nM = Extremal Kerr (maximum spin)\n\nClick to randomize!",
      },
      gtt: {
        text: "g_tt = -(1 - 2Mr/Σ)",
        font: "10px monospace",
        color: "#f88",
        height: lineHeight,
        value: "= -0.800",
        desc: "Time-time component. Modified by Σ = r² + a²cos²θ.\nDepends on BOTH r and θ (not spherically symmetric!).",
      },
      grr: {
        text: "g_rr = Σ/Δ",
        font: "10px monospace",
        color: "#8f8",
        height: lineHeight,
        value: "= 1.250",
        desc: "Radial component. Δ = r² - 2Mr + a².\nDiverges at horizons where Δ = 0.",
      },
      gthth: {
        text: "g_θθ = Σ",
        font: "10px monospace",
        color: "#88f",
        height: lineHeight,
        value: "= 100.00",
        desc: "Theta component. Σ = r² + a²cos²θ.\nNot just r² - rotation breaks spherical symmetry.",
      },
      gphph: {
        text: "g_φφ = (r²+a²+...)sin²θ",
        font: "10px monospace",
        color: "#f8f",
        height: lineHeight,
        value: "= 100.00",
        desc: "Phi component. More complex than Schwarzschild.\nIncludes 2Ma²r sin²θ/Σ rotation term.",
      },
      gtph: {
        text: "g_tφ = -2Mar sin²θ/Σ",
        font: "bold 11px monospace",
        color: "#ff0",
        height: lineHeight + 6,
        value: "= -0.180",
        desc: "FRAME DRAGGING TERM\n\nThis off-diagonal component is THE key difference!\n\nIt couples time and rotation: even light must rotate with the black hole.\n\nInside the ergosphere, NOTHING can stay still.",
      },
      rplus: {
        text: "r+ = 1.44",
        font: "10px monospace",
        color: "#f55",
        height: lineHeight - 2,
        desc: "Outer Event Horizon: r+ = M + √(M² - a²)\nSmaller than Schwarzschild 2M when spinning.\nApproaches M as a → M (extremal).",
      },
      rminus: {
        text: "r- = 0.56",
        font: "10px monospace",
        color: "#a55",
        height: lineHeight - 2,
        desc: "Inner (Cauchy) Horizon: r- = M - √(M² - a²)\nUnique to rotating black holes.\nHides a ring singularity, not a point.",
      },
      rergo: {
        text: "r_ergo = 2.00",
        font: "10px monospace",
        color: "#f80",
        height: lineHeight - 2,
        desc: "Ergosphere boundary (at equator)\nBetween r+ and r_ergo: the ergosphere.\nObjects can escape, but CANNOT stay stationary!",
      },
      riscoP: {
        text: "r_ISCO(pro) = 2.32",
        font: "10px monospace",
        color: "#5f8",
        height: lineHeight - 2,
        desc: "ISCO for prograde (co-rotating) orbits.\nCloser than Schwarzschild ISCO!\nFrame dragging helps co-rotating orbits.",
      },
      riscoR: {
        text: "r_ISCO(retro) = 8.71",
        font: "10px monospace",
        color: "#58f",
        height: lineHeight - 2,
        desc: "ISCO for retrograde (counter-rotating) orbits.\nFarther than Schwarzschild ISCO!\nFrame dragging opposes counter-rotation.",
      },
      pos: {
        text: "Orbiter: r=10, Ω_drag=0.02",
        font: "10px monospace",
        color: "#aaa",
        height: lineHeight,
        desc: "Orbiter position and local frame-dragging rate.\nΩ_drag shows how fast spacetime rotates here.",
      },
    };

    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;

    // Create TextShapes
    const rowItems = [];
    for (const [key, config] of Object.entries(this.features)) {
      config.shape = new TextShape(config.text, {
        font: config.font,
        color: config.color,
        align: "left",
        baseline: "top",
        height: config.height,
      });
      rowItems.push(config.shape);

      if (config.value) {
        config.valueShape = new TextShape(config.value, {
          font: config.font,
          color: "#fff",
          align: "left",
          baseline: "top",
        });
      }
    }

    // Apply vertical layout
    const layout = verticalLayout(rowItems, {
      spacing: 10,
      padding: 0,
      align: "start",
      centerItems: false,
    });
    applyLayout(rowItems, layout.positions, {
      offsetX: -panelWidth / 2,
      offsetY: -panelHeight / 2,
    });

    // Position value shapes
    for (const config of Object.values(this.features)) {
      if (config.valueShape) {
        config.valueShape.x = config.shape.x + valueOffset;
        config.valueShape.y = config.shape.y;
      }
    }
  }

  setMetricValues(r, theta, M, a) {
    const metric = Tensor.kerr(r, theta, M, a);
    const f = this.features;

    // Diagonal components
    f.gtt.valueShape.text = `= ${metric.get(0, 0).toFixed(4)}`;
    f.grr.valueShape.text = `= ${metric.get(1, 1).toFixed(4)}`;
    f.gthth.valueShape.text = `= ${metric.get(2, 2).toFixed(2)}`;
    f.gphph.valueShape.text = `= ${metric.get(3, 3).toFixed(2)}`;

    // OFF-DIAGONAL (the key term!)
    f.gtph.valueShape.text = `= ${metric.get(0, 3).toFixed(4)}`;

    // Parameters
    const spinPercent = ((a / M) * 100).toFixed(0);
    f.spin.shape.text = `a = ${a.toFixed(2)}M (${spinPercent}%)`;
    f.mass.shape.text = `M = ${M.toFixed(2)}`;

    // Key radii
    const rPlus = Tensor.kerrHorizonRadius(M, a, false);
    const rMinus = Tensor.kerrHorizonRadius(M, a, true);
    const rErgo = Tensor.kerrErgosphereRadius(M, a, Math.PI / 2);
    const iscoP = Tensor.kerrISCO(M, a, true);
    const iscoR = Tensor.kerrISCO(M, a, false);

    f.rplus.shape.text = `r+ = ${rPlus.toFixed(2)}`;
    f.rminus.shape.text = `r- = ${rMinus.toFixed(2)}`;
    f.rergo.shape.text = `r_ergo = ${rErgo.toFixed(2)}`;
    f.riscoP.shape.text = `r_ISCO(pro) = ${iscoP.toFixed(2)}`;
    f.riscoR.shape.text = `r_ISCO(retro) = ${iscoR.toFixed(2)}`;
  }

  setOrbiterPosition(r, phi, M, a) {
    const omega = Tensor.kerrFrameDraggingOmega(r, Math.PI / 2, M, a);
    this.features.pos.shape.text = `Orbiter: r=${r.toFixed(2)}, Ω_drag=${omega.toFixed(4)}`;
  }

  getFeatureAt(screenX, screenY) {
    const localX = screenX - this.x;
    const localY = screenY - this.y;

    if (
      localX < -this.panelWidth / 2 ||
      localX > this.panelWidth / 2 ||
      localY < -this.panelHeight / 2 ||
      localY > this.panelHeight / 2
    ) {
      return null;
    }

    for (const config of Object.values(this.features)) {
      const shape = config.shape;
      const rowTop = shape.y;
      const rowBottom = shape.y + (config.height || 14);

      if (localY >= rowTop && localY <= rowBottom) {
        return config;
      }
    }

    return null;
  }

  draw() {
    super.draw();
    this.bgRect.render();

    for (const config of Object.values(this.features)) {
      config.shape.render();
      if (config.valueShape) config.valueShape.render();
    }
  }
}

class KerrDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000008";
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.time = 0;

    // Mass and spin
    this.mass = CONFIG.defaultMass;
    this.spin = CONFIG.defaultSpin * this.mass;

    // Grid scale
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
      autoRotateAxis: "y",
    });
    this.camera.enableMouseControl(this.canvas);

    // Orbital state
    this.orbitR = CONFIG.orbitSemiMajor;
    this.orbitPhi = 0;
    this.orbitVr = 0;
    this.orbitL = CONFIG.angularMomentum;
    this.precessionAngle = 0;
    this.orbitTrail = [];

    // Separate timer for frame dragging (resets on shuffle)
    this.frameDragTime = 0;

    // Initialize grid
    this.initGrid();
    this.updateGridScale();

    // Create metric panel
    this.metricPanel = new KerrMetricPanelGO(this, { name: "metricPanel" });
    this.pipeline.add(this.metricPanel);

    // Tooltip
    this.tooltip = new Tooltip(this, {
      maxWidth: 300,
      font: "11px monospace",
      padding: 10,
    });
    this.pipeline.add(this.tooltip);

    this.hoveredFeature = null;

    // Event listeners
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseleave", () => this.tooltip.hide());
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check metric panel
    const feature = this.metricPanel.getFeatureAt(mouseX, mouseY);
    if (feature && feature.desc) {
      if (this.hoveredFeature !== feature) {
        this.hoveredFeature = feature;
        this.tooltip.show(feature.desc, mouseX, mouseY);
      }
      return;
    }

    // Check effective potential graph
    const graphX = this.width - 180;
    const graphY = 180;
    const graphW = 160;
    const graphH = 100;

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

  updateGridScale() {
    const minDim = Math.min(this.width, this.height);
    this.gridScale = CONFIG.baseGridScale * (minDim / 800);
  }

  handleClick(e) {
    if (this.camera.isDragging()) return;
    this.shuffleParameters();
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

    // Reset spacetime - grid goes back to flat, then starts twisting fresh
    this.frameDragTime = 0;

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
   * Embedding height for Kerr (approximation based on Flamm's paraboloid)
   * Exaggerated for visual drama - steeper near horizon
   */
  getEmbeddingHeight(r) {
    const rPlus = Tensor.kerrHorizonRadius(this.mass, this.spin, false);
    if (r <= rPlus) return CONFIG.embeddingScale * 3; // Deep well at horizon

    // Modified Flamm's paraboloid for Kerr
    const M = this.mass;
    const height = Math.sqrt(8 * M * (r - rPlus));
    const maxHeight = Math.sqrt(8 * M * (CONFIG.gridSize - rPlus));

    // Base embedding
    let embedding = ((maxHeight - height) * CONFIG.embeddingScale) / 3;

    // Extra steepness near horizon (exponential falloff)
    const proximity = rPlus / r;
    const extraDepth = Math.pow(proximity, 3) * CONFIG.embeddingScale * 0.8;

    return embedding + extraDepth;
  }

  /**
   * Update geodesic motion with frame dragging
   */
  updateGeodesic(dt) {
    const M = this.mass;
    const a = this.spin;
    const r = this.orbitR;

    // Base Keplerian angular velocity
    const baseOmega = (CONFIG.orbitSpeed * Math.sqrt(M)) / Math.pow(r / 5, 1.5);

    // Frame dragging contribution
    const omegaDrag = Tensor.kerrFrameDraggingOmega(r, Math.PI / 2, M, a);

    // Total angular velocity (frame dragging adds to prograde motion)
    const totalOmega =
      baseOmega + omegaDrag * CONFIG.frameDraggingAmplification;

    // Update orbital angle
    this.orbitPhi += totalOmega * dt;

    // Radial oscillation
    const eccentricity = CONFIG.orbitEccentricity;
    const radialOscillation = eccentricity * Math.sin(this.orbitPhi * 2);
    this.orbitR = CONFIG.orbitSemiMajor + radialOscillation * 2;

    // Keep orbit outside prograde ISCO
    const minR = Tensor.kerrISCO(M, a, true) + 1;
    if (this.orbitR < minR) this.orbitR = minR;

    // GR precession (enhanced by frame dragging)
    const precessionRate = CONFIG.precessionFactor * (M / r) * (1 + a / M);
    this.precessionAngle += precessionRate * dt;

    // Store in trail
    const totalAngle = this.orbitPhi + this.precessionAngle;
    this.orbitTrail.unshift({
      x: Math.cos(totalAngle) * this.orbitR,
      z: Math.sin(totalAngle) * this.orbitR,
      r: this.orbitR,
      omega: omegaDrag,
    });

    if (this.orbitTrail.length > 80) {
      this.orbitTrail.pop();
    }
  }

  update(dt) {
    super.update(dt);
    this.time += dt;
    this.frameDragTime += dt; // Separate timer for frame dragging

    this.camera.update(dt);
    this.updateGeodesic(dt);
    this.updateGridScale();

    // Update grid with FRAME DRAGGING TWIST
    const { gridResolution } = CONFIG;
    const M = this.mass;
    const a = this.spin;
    const rPlus = Tensor.kerrHorizonRadius(M, a, false);
    const rErgo = Tensor.kerrErgosphereRadius(M, a, Math.PI / 2);

    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const vertex = this.gridVertices[i][j];
        const baseR = Math.sqrt(
          vertex.baseX * vertex.baseX + vertex.baseZ * vertex.baseZ,
        );

        // Frame dragging twist: rotate grid points based on local ω
        // Stronger near the black hole, falls off as ~1/r³
        if (baseR > rPlus * 0.5) {
          const omega = Tensor.kerrFrameDraggingOmega(
            Math.max(baseR, rPlus + 0.1),
            Math.PI / 2,
            M,
            a,
          );

          // Continuous rotation (resets when black hole changes)
          const twistAngle = omega * this.frameDragTime * 8;

          // Cap the twist to max ~45 degrees to keep grid readable
          const maxTwist = Math.PI / 4;
          const cappedTwist =
            Math.sin(twistAngle) * maxTwist * (rErgo / Math.max(baseR, rErgo));

          // Apply rotation to grid point
          const cosT = Math.cos(cappedTwist);
          const sinT = Math.sin(cappedTwist);
          vertex.x = vertex.baseX * cosT - vertex.baseZ * sinT;
          vertex.z = vertex.baseX * sinT + vertex.baseZ * cosT;
        }

        const r = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
        vertex.y = this.getEmbeddingHeight(Math.max(r, rPlus + 0.1));
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

    // Update metric panel
    if (this.metricPanel) {
      this.metricPanel.setMetricValues(
        this.orbitR,
        Math.PI / 2,
        this.mass,
        this.spin,
      );
      this.metricPanel.setOrbiterPosition(
        this.orbitR,
        this.orbitPhi,
        this.mass,
        this.spin,
      );
    }
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2 + 30;

    super.render();

    // Draw key radii (ergosphere, horizons, ISCOs)
    this.drawKeyRadii(cx, cy);

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

    // Draw controls
    this.drawControls(w, h);
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

          const p = this.camera.project(
            x * this.gridScale,
            y,
            z * this.gridScale,
          );

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

    const segments = 64;

    Painter.useCtx((ctx) => {
      // Semi-transparent orange fill for ergosphere
      ctx.fillStyle = "rgba(255, 100, 0, 0.15)";
      ctx.beginPath();

      // Outer boundary (ergosphere)
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * rErgo;
        const z = Math.sin(angle) * rErgo;
        const y = this.getEmbeddingHeight(rErgo);

        const p = this.camera.project(
          x * this.gridScale,
          y,
          z * this.gridScale,
        );

        if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
        else ctx.lineTo(cx + p.x, cy + p.y);
      }

      // Inner boundary (horizon) - reverse to create ring
      for (let i = segments; i >= 0; i--) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle) * rPlus;
        const z = Math.sin(angle) * rPlus;
        const y = this.getEmbeddingHeight(rPlus + 0.1);

        const p = this.camera.project(
          x * this.gridScale,
          y,
          z * this.gridScale,
        );
        ctx.lineTo(cx + p.x, cy + p.y);
      }

      ctx.closePath();
      ctx.fill();
    });

    // Draw dragged particles in ergosphere - shows frame dragging!
    if (this.draggedParticles) {
      Painter.useCtx((ctx) => {
        for (const p of this.draggedParticles) {
          // Only draw if within ergosphere
          if (p.r < rErgo && p.r > rPlus) {
            const x = Math.cos(p.angle) * p.r;
            const z = Math.sin(p.angle) * p.r;
            const y = this.getEmbeddingHeight(p.r);

            const proj = this.camera.project(
              x * this.gridScale,
              y,
              z * this.gridScale,
            );

            // Particles glow orange - they're being dragged!
            const size = 3 * proj.scale;
            ctx.fillStyle = "rgba(255, 180, 50, 0.9)";
            ctx.beginPath();
            ctx.arc(cx + proj.x, cy + proj.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Trail showing direction of drag
            const trailAngle = p.angle - 0.3;
            const trailX = Math.cos(trailAngle) * p.r;
            const trailZ = Math.sin(trailAngle) * p.r;
            const trailProj = this.camera.project(
              trailX * this.gridScale,
              y,
              trailZ * this.gridScale,
            );

            ctx.strokeStyle = "rgba(255, 150, 50, 0.4)";
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
        const p = this.camera.project(v.x * gridScale, v.y, v.z * gridScale);
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
    const y = this.getEmbeddingHeight(rPlus + 0.1);

    const centerP = this.camera.project(0, y + 10, 0);
    const centerX = cx + centerP.x;
    const centerY = cy + centerP.y;
    const size = 12 * centerP.scale;

    // Spin direction indicator (which way the hole rotates)
    const spinDirection = this.spin > 0 ? 1 : -1;
    const rotationAngle = this.time * 2 * spinDirection;

    // Outer glow
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        size,
        centerX,
        centerY,
        size * 4,
      );
      gradient.addColorStop(0, "rgba(100, 50, 150, 0.5)");
      gradient.addColorStop(0.5, "rgba(255, 100, 50, 0.2)");
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // ROTATING ACCRETION DISK - the key visual!
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

        const alpha = 0.6 - arm * 0.15;
        ctx.strokeStyle = `rgba(255, ${150 + arm * 30}, ${50 + arm * 20}, ${alpha})`;
        ctx.lineWidth = 3 - arm * 0.5;
        ctx.stroke();
      }

      // Inner bright ring (hot gas closest to horizon)
      ctx.strokeStyle = "rgba(255, 200, 100, 0.8)";
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
        ctx.fillStyle = `rgba(255, ${brightness}, 50, 0.8)`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

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

        const p = this.camera.project(
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

    const p = this.camera.project(
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
    });

    // Body
    Painter.useCtx((ctx) => {
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
    });

    this.drawOrbitPath(cx, cy);
    this.drawOrbitalTrail(cx, cy);
  }

  drawOrbitPath(cx, cy) {
    const segments = 64;
    const eccentricity = CONFIG.orbitEccentricity;

    Painter.useCtx((ctx) => {
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

        const p = this.camera.project(
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
          point.z * this.gridScale,
        );

        const prevP = this.camera.project(
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
    const graphX = this.width - 180;
    const graphY = 180;
    const graphW = 160;
    const graphH = 100;
    const M = this.mass;
    const a = this.spin;

    Painter.useCtx((ctx) => {
      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(graphX - 10, graphY - 10, graphW + 20, graphH + 40);

      // Title
      ctx.fillStyle = "#888";
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
      ctx.fillStyle = "#666";
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

  drawControls(w, h) {
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#445";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText("click to shuffle  |  drag to rotate", w - 15, h - 30);
      ctx.fillText(
        "Frame Dragging  |  Ergosphere  |  Kerr Geodesics",
        w - 15,
        h - 15,
      );
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new KerrDemo(canvas);
  demo.start();
});

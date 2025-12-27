/**
 * Schrodinger Wave Packet - Math & Physics Demo
 *
 * 3D visualization of a Gaussian wave packet showing the complex
 * wave function as a helix/spiral traveling through space.
 *
 * Ψ(x,t) = A * e^(-(x-vt)²/4a²) * e^(i(kx-ωt))
 */

import { Game, Painter, Camera3D, Text, applyAnchor, Position, Scene, verticalLayout, applyLayout } from "../../src/index.js";
import { gaussianWavePacket } from "../../src/math/quantum.js";

// Configuration
const CONFIG = {
  // Wave packet parameters
  amplitude: 1.0,
  sigma: 0.8,           // Width of Gaussian envelope
  k: 8.0,               // Wave number (controls oscillation frequency)
  omega: 4.0,           // Angular frequency
  velocity: 0.5,        // Group velocity of packet

  // Visualization
  numPoints: 300,       // Points along the wave
  xRange: 12,           // Total x range (-xRange/2 to +xRange/2)
  helixRadius: 80,      // Radius of the helix (Re/Im amplitude)
  zScale: 40,           // Scale for z-axis (position)

  // 3D view
  rotationX: 0.3,       // Tilt angle
  rotationY: -0.4,      // Side rotation
  perspective: 800,     // Perspective depth

  // Grid
  gridSize: 16,         // Grid lines count
  gridSpacing: 30,      // Spacing between grid lines
  gridY: 120,           // Y offset for grid plane

  // Animation
  timeScale: 1.0,

  // Colors
  waveColor: [80, 160, 255],    // Cyan-blue for the helix
  waveGlow: [150, 200, 255],    // Brighter for the center
  gridColor: "rgba(60, 80, 120, 0.4)",
  axisColor: "rgba(100, 150, 200, 0.6)",
  envelopeColor: "rgba(255, 100, 100, 0.5)", // Red envelope line
};

class SchrodingerDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000000";
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.time = 0;

    // Create 3D camera with mouse controls
    this.camera = new Camera3D({
      rotationX: CONFIG.rotationX,
      rotationY: CONFIG.rotationY,
      perspective: CONFIG.perspective,
      minRotationX: -1.2,
      maxRotationX: 1.2,
    });

    // Enable mouse/touch rotation
    this.camera.enableMouseControl(this.canvas);

    // Override double-click to also reset time
    this.canvas.addEventListener("dblclick", () => {
      this.time = 0;
    });

    // Create info panel container anchored to top center
    this.infoPanel = new Scene(this, { x: 0, y: 0 });
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_CENTER,
      anchorOffsetY: 150,
    });
    this.pipeline.add(this.infoPanel);

    // Create all text items
    const { amplitude, sigma, k, omega, velocity } = CONFIG;

    this.titleText = new Text(this, "Gaussian Wave Packet", {
      font: "bold 16px monospace",
      color: "#7af",
      align: "center",
      baseline: "middle",
    });

    this.equationText = new Text(this, "\u03A8(x,t) = A\u00B7e^(-(x-vt)\u00B2/4\u03C3\u00B2) \u00B7 e^(i(kx-\u03C9t))", {
      font: "14px monospace",
      color: "#fff",
      align: "center",
      baseline: "middle",
    });

    this.paramsText = new Text(this, `A=${amplitude}  \u03C3=${sigma}  k=${k}  \u03C9=${omega}  v=${velocity}`, {
      font: "12px monospace",
      color: "#6d8",
      align: "center",
      baseline: "middle",
    });

    this.liveText = new Text(this, "t=0.00s  x\u2080=0.00", {
      font: "12px monospace",
      color: "#fa6",
      align: "center",
      baseline: "middle",
    });

    // Use vertical layout to position items
    const textItems = [this.titleText, this.equationText, this.paramsText, this.liveText];
    const layout = verticalLayout(textItems, { spacing: 20, align: "center" });
    applyLayout(textItems, layout.positions);

    // Add all to panel
    textItems.forEach(item => this.infoPanel.add(item));
  }

  /**
   * Compute Gaussian wave packet using quantum.js module.
   * Ψ(x,t) = A * e^(-(x-vt)²/4σ²) * e^(i(kx-ωt))
   */
  computeWavePacket(x, t) {
    return gaussianWavePacket(x, t, {
      amplitude: CONFIG.amplitude,
      sigma: CONFIG.sigma,
      k: CONFIG.k,
      omega: CONFIG.omega,
      velocity: CONFIG.velocity,
    });
  }

  /**
   * 3D rotation and projection - delegates to Camera3D
   */
  project3D(x, y, z) {
    return this.camera.project(x, y, z);
  }

  update(dt) {
    super.update(dt);
    this.time += dt * CONFIG.timeScale;

    // Loop when wave packet exits the visible range
    const packetCenter = CONFIG.velocity * this.time;
    if (packetCenter > CONFIG.xRange * 0.6) {
      this.time = -CONFIG.xRange * 0.6 / CONFIG.velocity;
    }

    // Update live text values
    if (this.liveText) {
      const t = this.time.toFixed(2);
      const x0 = (CONFIG.velocity * this.time).toFixed(2);
      this.liveText.text = `t=${t}s  x\u2080=${x0}`;
    }
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2 - 30;

    super.render();

    // Compute wave packet points
    const points = [];
    const { numPoints, xRange, helixRadius, zScale } = CONFIG;

    for (let i = 0; i < numPoints; i++) {
      const t_param = i / (numPoints - 1);
      const x = (t_param - 0.5) * xRange;

      const { psi, envelope } = this.computeWavePacket(x, this.time);

      // 3D coordinates: helix in Re/Im plane, extending along Z
      const px = psi.real * helixRadius;  // Re(Ψ) -> X
      const py = psi.imag * helixRadius;  // Im(Ψ) -> Y
      const pz = x * zScale;               // position -> Z

      const projected = this.project3D(px, py, pz);

      points.push({
        x: cx + projected.x,
        y: cy + projected.y,
        z: projected.z,
        scale: projected.scale,
        envelope,
        psi,
        worldX: x,
      });
    }

    // Draw grid plane
    this.drawGrid(cx, cy);

    // Draw axis line (position axis)
    this.drawAxis(cx, cy);

    // Draw envelope curves (Gaussian bell on grid)
    this.drawEnvelope(cx, cy, points);

    // Sort points by depth for proper rendering
    const sortedIndices = points
      .map((p, i) => ({ z: p.z, i }))
      .sort((a, b) => a.z - b.z)
      .map(item => item.i);

    // Draw the helix wave
    this.drawHelix(points, sortedIndices);

    // Draw projection on grid (2D wave)
    this.drawProjection(cx, cy, points);

    // Info text
    this.drawInfo(w, h);
  }

  drawGrid(cx, cy) {
    const { gridSize, gridSpacing, gridY } = CONFIG;
    const halfGrid = (gridSize * gridSpacing) / 2;

    // Draw grid lines
    for (let i = -gridSize / 2; i <= gridSize / 2; i++) {
      // Lines along Z
      const x1 = i * gridSpacing;
      const z1 = -halfGrid;
      const z2 = halfGrid;

      const p1 = this.project3D(x1, gridY, z1);
      const p2 = this.project3D(x1, gridY, z2);

      Painter.useCtx((ctx) => {
        ctx.strokeStyle = CONFIG.gridColor;
        ctx.lineWidth = 1;
        ctx.moveTo(cx + p1.x, cy + p1.y);
        ctx.lineTo(cx + p2.x, cy + p2.y);
        ctx.stroke();
      });

      // Lines along X
      const p3 = this.project3D(-halfGrid, gridY, i * gridSpacing);
      const p4 = this.project3D(halfGrid, gridY, i * gridSpacing);

      Painter.useCtx((ctx) => {
        ctx.strokeStyle = CONFIG.gridColor;
        ctx.lineWidth = 1;
        ctx.moveTo(cx + p3.x, cy + p3.y);
        ctx.lineTo(cx + p4.x, cy + p4.y);
        ctx.stroke();
      });
    }
  }

  drawAxis(cx, cy) {
    const { zScale, xRange } = CONFIG;

    // Main position axis (Z direction in 3D space)
    const p1 = this.project3D(0, 0, -xRange / 2 * zScale * 1.2);
    const p2 = this.project3D(0, 0, xRange / 2 * zScale * 1.2);

    // Glowing axis line
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.axisColor;
      ctx.lineWidth = 2;
      ctx.moveTo(cx + p1.x, cy + p1.y);
      ctx.lineTo(cx + p2.x, cy + p2.y);
      ctx.stroke();
    });

    // Bright center dot where wave packet is
    const packetCenter = CONFIG.velocity * this.time;
    const centerProj = this.project3D(0, 0, packetCenter * zScale);

    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#88ccff";
      ctx.shadowBlur = 20;
      ctx.arc(cx + centerProj.x, cy + centerProj.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  drawEnvelope(cx, cy, points) {
    const { gridY } = CONFIG;

    // Precompute envelope path points
    const pathPoints = points.map(p => {
      const envHeight = p.envelope * CONFIG.helixRadius * 0.8;
      return this.project3D(0, gridY - envHeight, p.worldX * CONFIG.zScale);
    });

    // Draw Gaussian envelope on the grid plane
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.envelopeColor;
      ctx.lineWidth = 2;

      for (let i = 0; i < pathPoints.length; i++) {
        const proj = pathPoints[i];
        if (i === 0) {
          ctx.moveTo(cx + proj.x, cy + proj.y);
        } else {
          ctx.lineTo(cx + proj.x, cy + proj.y);
        }
      }
      ctx.stroke();
    });
  }

  drawHelix(points, sortedIndices) {
    const { waveColor, waveGlow } = CONFIG;

    // Draw helix as connected line segments with varying thickness
    for (let j = 0; j < sortedIndices.length - 1; j++) {
      const i = sortedIndices[j];
      const p1 = points[i];
      const p2 = points[i + 1] || points[i];

      if (Math.abs(i - (sortedIndices[j + 1] || i)) > 2) continue;

      // Thickness based on envelope (thicker where amplitude is higher)
      const thickness = 1 + p1.envelope * 6;

      // Color intensity based on envelope
      const intensity = 0.3 + p1.envelope * 0.7;

      const r = Math.floor(waveColor[0] + (waveGlow[0] - waveColor[0]) * p1.envelope);
      const g = Math.floor(waveColor[1] + (waveGlow[1] - waveColor[1]) * p1.envelope);
      const b = Math.floor(waveColor[2] + (waveGlow[2] - waveColor[2]) * p1.envelope);

      Painter.useCtx((ctx) => {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = `rgba(${r},${g},${b},${intensity})`;
        ctx.lineWidth = thickness * p1.scale;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });
    }

    // Add glow effect at high-amplitude regions
    for (const p of points) {
      if (p.envelope > 0.5) {
        const size = p.envelope * 4 * p.scale;
        Painter.useCtx((ctx) => {
          ctx.shadowColor = "rgba(100, 180, 255, 0.8)";
          ctx.shadowBlur = 15;
          ctx.fillStyle = `rgba(200, 230, 255, ${p.envelope * 0.5})`;
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }
    }
  }

  drawProjection(cx, cy, points) {
    const { gridY, zScale } = CONFIG;

    // Precompute projection path points
    const pathPoints = points.map(p => {
      const waveHeight = p.psi.real * CONFIG.helixRadius * 0.5;
      return this.project3D(waveHeight, gridY, p.worldX * zScale);
    });

    // Draw 2D wave projection on grid (Re(Ψ) only)
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = "rgba(80, 160, 255, 0.6)";
      ctx.lineWidth = 1.5;

      for (let i = 0; i < pathPoints.length; i++) {
        const proj = pathPoints[i];
        if (i === 0) {
          ctx.moveTo(cx + proj.x, cy + proj.y);
        } else {
          ctx.lineTo(cx + proj.x, cy + proj.y);
        }
      }
      ctx.stroke();
    });
  }

  drawInfo(w, h) {
    Painter.useCtx((ctx) => {
      // Controls hint (bottom right)
      ctx.fillStyle = "#445";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText("drag to rotate  |  double-click to reset", w - 15, h - 30);

      // Legend
      ctx.fillText("Helix = \u03A8  |  Blue = Re(\u03A8)  |  Red = |\u03A8|\u00B2", w - 15, h - 15);
      ctx.textAlign = "left";
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new SchrodingerDemo(canvas);
  demo.start();
});

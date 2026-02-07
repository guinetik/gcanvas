/**
 * Spacetime Curvature - Math & Physics Demo
 *
 * Visualization of how mass curves spacetime, based on Einstein's
 * general relativity. The "rubber sheet" analogy where massive objects
 * create wells/depressions in the fabric of spacetime.
 *
 * Uses gravitational potential: Φ(r) = -GM/r
 * Grid deformation: y = Σ(-M_i / |r - r_i|)
 */

import {
  Game,
  Painter,
  Camera3D,
  Text,
  applyAnchor,
  Position,
  Scene,
  verticalLayout,
  applyLayout,
  Screen,
  Gesture,
} from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Grid parameters
  gridSize: 20, // Grid extends from -gridSize to +gridSize
  gridResolution: 40, // Number of grid lines
  gridScale: 15, // Scale factor for grid spacing

  // Physics - Gaussian well profile for smooth falloff to flat edges
  wellDepth: 75, // Base depth (scaled by sqrt of mass)
  wellWidth: 4.0, // Base width (scaled by mass)

  // 3D view
  rotationX: 0.7, // Initial tilt (looking down at grid)
  rotationY: 0.3, // Initial rotation
  perspective: 1000, // Perspective depth

  // Stellar body
  initialBody: { x: 0, z: 0, mass: 3.0, type: "blackhole" },

  // Body properties by type
  bodyTypes: {
    blackhole: {
      color: "#111",
      glowColor: "rgba(100, 50, 150, 0.8)",
      minMass: 2.0,
      maxMass: 5.0,
    },
    star: {
      color: "#ff8800",
      glowColor: "rgba(255, 200, 50, 0.6)",
      minMass: 0.5,
      maxMass: 2.0,
    },
    neutron: {
      color: "#88ccff",
      glowColor: "rgba(150, 200, 255, 0.7)",
      minMass: 1.5,
      maxMass: 3.0,
    },
  },

  // Visual
  gridColor: "rgba(0, 180, 255, 0.4)",
  gridHighlight: "rgba(100, 220, 255, 0.6)",
  wellGradientStart: "rgba(80, 0, 120, 0.3)",
  wellGradientEnd: "rgba(0, 100, 200, 0.1)",

  // Animation
  autoRotateSpeed: 0.15, // Auto-rotate speed (radians per second)
  pulseSpeed: 2.0, // Glow pulse speed
  wellPulseSpeed: 1.5, // Well breathing speed
  wellPulseAmount: 0.08, // How much the well pulses (0-1)

  // Zoom
  minZoom: 0.3,
  maxZoom: 3.0,
  zoomSpeed: 0.5,
  zoomEasing: 0.12,
  baseScreenSize: 600,

  // Orbiting body
  orbitRadiusMultiplier: 2.0, // Orbit at this multiple of well width (sigma)
  orbitSpeed: 0.8, // Base orbit speed (faster for heavier central mass)
  orbiterSize: 4, // Size of orbiting body
  orbiterColor: "#4af", // Color of orbiter
  orbiterGlow: "rgba(100, 180, 255, 0.6)",
};

class SpacetimeDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000008";
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

    // Create 3D camera with mouse controls and auto-rotate
    this.camera = new Camera3D({
      rotationX: CONFIG.rotationX,
      rotationY: CONFIG.rotationY,
      perspective: CONFIG.perspective,
      minRotationX: 0.2, // Don't allow looking from below
      maxRotationX: 1.3, // Don't flip over
      autoRotate: true,
      autoRotateSpeed: CONFIG.autoRotateSpeed,
      autoRotateAxis: "y",
      inertia: true,
      friction: 0.94,
      velocityScale: 1.2,
    });
    this.camera.enableMouseControl(this.canvas);

    // Enable zoom via mouse wheel and pinch gesture
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoomSpeed;
        this.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.targetZoom));
      },
      onPan: null, // Camera3D handles rotation via drag
    });

    // Double-click to reset
    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.camera.reset();
    });

    // Initialize single stellar body
    this.body = {
      ...CONFIG.initialBody,
      orbitPhase: Math.random() * Math.PI * 2,
    };

    // Initialize orbiting test particle
    this.orbiterAngle = 0;

    // Precompute grid vertex positions (flat)
    this.initGrid();

    // Click to add bodies
    this.canvas.addEventListener("click", (e) => this.handleClick(e));

    // Setup info panel
    this.setupInfoPanel();
  }

  setupInfoPanel() {
    this.infoPanel = new Scene(this, { x: 0, y: 0, origin: "center" });
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_CENTER,
      anchorOffsetY: 150,
    });
    this.pipeline.add(this.infoPanel);

    this.titleText = new Text(this, "Spacetime Curvature", {
      font: "bold 16px monospace",
      color: "#7af",
      align: "center",
      baseline: "middle",
      origin: "center",
    });

    this.equationText = new Text(
      this,
      "gμν = ημν + hμν   |   Rμν - ½Rgμν = 8πGTμν",
      {
        font: "12px monospace",
        color: "#888",
        align: "center",
        baseline: "middle",
        origin: "center",
      },
    );

    this.statsText = new Text(this, "Blackhole | Mass: 3.0 M☉", {
      font: "12px monospace",
      color: "#6d8",
      align: "center",
      baseline: "middle",
      origin: "center",
    });

    const textItems = [this.titleText, this.equationText, this.statsText];
    const layout = verticalLayout(textItems, { spacing: 18, align: "center" });
    applyLayout(textItems, layout.positions);
    textItems.forEach((item) => this.infoPanel.add(item));
  }

  initGrid() {
    const { gridSize, gridResolution } = CONFIG;
    this.gridVertices = [];

    // Create grid of vertices
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

  handleClick(e) {
    if (this.camera.isDragging()) return;
    this.shuffleBody();
  }

  shuffleBody() {
    // Randomly choose body type (weighted toward black holes for dramatic effect)
    const rand = Math.random();
    let type = "blackhole";
    if (rand > 0.5) type = "star";
    else if (rand > 0.3) type = "neutron";

    const typeConfig = CONFIG.bodyTypes[type];
    const mass =
      typeConfig.minMass +
      Math.random() * (typeConfig.maxMass - typeConfig.minMass);

    // Always centered
    this.body = {
      x: 0,
      z: 0,
      mass,
      type,
      orbitPhase: Math.random() * Math.PI * 2,
    };
  }

  /**
   * Calculate well depth at a point using Gaussian profile
   * Returns positive value (depth of well)
   * Gaussian naturally falls to 0 at edges - no clamping needed
   * Includes subtle pulsing animation
   */
  calculateWellDepth(x, z) {
    const dx = x - this.body.x;
    const dz = z - this.body.z;
    const rSquared = dx * dx + dz * dz;

    // Gaussian well: depth = A * exp(-r²/2σ²)
    // More mass = wider crater (sigma increases)
    // More mass = deeper but with diminishing returns (sqrt)
    const sigma = CONFIG.wellWidth * Math.sqrt(this.body.mass);
    const baseAmplitude = CONFIG.wellDepth * Math.sqrt(this.body.mass);

    // Pulsing animation - well "breathes"
    const pulse =
      1 + CONFIG.wellPulseAmount * Math.sin(this.time * CONFIG.wellPulseSpeed);
    const amplitude = baseAmplitude * pulse;

    return amplitude * Math.exp(-rSquared / (2 * sigma * sigma));
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
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize)
    );
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    // Update camera (handles auto-rotate when not dragging)
    this.camera.update(dt);

    // Ease zoom towards target
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    // Update grid vertices based on gravitational wells
    // Positive Y = wells curving DOWN (with current camera angle)
    const { gridResolution } = CONFIG;
    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const vertex = this.gridVertices[i][j];
        vertex.y = this.calculateWellDepth(vertex.x, vertex.z);
      }
    }

    // Update orbiter - faster orbit for heavier central mass (Kepler's law)
    const orbitSpeed = CONFIG.orbitSpeed * Math.sqrt(this.body.mass);
    this.orbiterAngle += orbitSpeed * dt;

    // Update stats text
    if (this.statsText) {
      const typeName =
        this.body.type.charAt(0).toUpperCase() + this.body.type.slice(1);
      this.statsText.text = `${typeName} | Mass: ${this.body.mass.toFixed(1)} M\u2609`;
    }
  }

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2 + 50;

    super.render();

    // Draw grid lines
    this.drawGrid(cx, cy);

    // Draw orbiting body (behind or in front based on position)
    this.drawOrbiter(cx, cy);

    // Draw stellar body
    this.drawBody(cx, cy);

    // Draw controls hint
    this.drawControls(w, h);
  }

  drawGrid(cx, cy) {
    const { gridResolution, gridScale, gridColor, gridHighlight } = CONFIG;

    // Project all vertices with zoom
    const projected = this.gridVertices.map((row) =>
      row.map((v) => {
        const p = this.project3D(v.x * gridScale, v.y, v.z * gridScale);
        return {
          x: cx + p.x,
          y: cy + p.y,
          z: p.z,
          depth: v.y,
        };
      }),
    );

    // Draw grid lines along X direction
    for (let i = 0; i <= gridResolution; i++) {
      const isMainLine = i % 5 === 0;
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = isMainLine ? gridHighlight : gridColor;
        ctx.lineWidth = isMainLine ? 1.5 : 0.8;
        ctx.beginPath();

        for (let j = 0; j <= gridResolution; j++) {
          const p = projected[i][j];
          if (j === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      });
    }

    // Draw grid lines along Z direction
    for (let j = 0; j <= gridResolution; j++) {
      const isMainLine = j % 5 === 0;
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = isMainLine ? gridHighlight : gridColor;
        ctx.lineWidth = isMainLine ? 1.5 : 0.8;
        ctx.beginPath();

        for (let i = 0; i <= gridResolution; i++) {
          const p = projected[i][j];
          if (i === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      });
    }
  }

  drawOrbiter(cx, cy) {
    // Orbit radius scales with well width (sigma)
    const sigma = CONFIG.wellWidth * Math.sqrt(this.body.mass);
    const orbitRadius = sigma * CONFIG.orbitRadiusMultiplier;

    // Calculate orbiter position on the grid
    const orbiterX = this.body.x + Math.cos(this.orbiterAngle) * orbitRadius;
    const orbiterZ = this.body.z + Math.sin(this.orbiterAngle) * orbitRadius;

    // Get well depth at orbiter position (follows the curvature)
    const wellDepth = this.calculateWellDepth(orbiterX, orbiterZ);

    // Project to screen with zoom
    const p = this.project3D(
      orbiterX * CONFIG.gridScale,
      wellDepth,
      orbiterZ * CONFIG.gridScale,
    );

    const screenX = cx + p.x;
    const screenY = cy + p.y;
    const size = CONFIG.orbiterSize * p.scale;

    // Draw glow
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        size * 3,
      );
      gradient.addColorStop(0, CONFIG.orbiterGlow);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw orbiter body
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

    // Draw trail (fading arc showing recent path)
    this.drawOrbiterTrail(cx, cy);
  }

  drawOrbiterTrail(cx, cy) {
    // Orbit radius scales with well width (sigma)
    const sigma = CONFIG.wellWidth * Math.sqrt(this.body.mass);
    const orbitRadius = sigma * CONFIG.orbitRadiusMultiplier;

    const trailLength = 40; // Number of trail segments
    const trailArc = Math.PI * 0.8; // How much of the orbit to show as trail

    Painter.useCtx((ctx) => {
      ctx.lineCap = "round";

      for (let i = 0; i < trailLength; i++) {
        const t = i / trailLength;
        const angle = this.orbiterAngle - t * trailArc;

        const trailX = this.body.x + Math.cos(angle) * orbitRadius;
        const trailZ = this.body.z + Math.sin(angle) * orbitRadius;
        const wellDepth = this.calculateWellDepth(trailX, trailZ);

        const p = this.project3D(
          trailX * CONFIG.gridScale,
          wellDepth,
          trailZ * CONFIG.gridScale,
        );

        if (i === 0) continue;

        const prevAngle =
          this.orbiterAngle - ((i - 1) / trailLength) * trailArc;
        const prevX = this.body.x + Math.cos(prevAngle) * orbitRadius;
        const prevZ = this.body.z + Math.sin(prevAngle) * orbitRadius;
        const prevDepth = this.calculateWellDepth(prevX, prevZ);
        const prevP = this.project3D(
          prevX * CONFIG.gridScale,
          prevDepth,
          prevZ * CONFIG.gridScale,
        );

        const alpha = (1 - t) * 0.5;
        ctx.strokeStyle = `rgba(100, 180, 255, ${alpha})`;
        ctx.lineWidth = (1 - t) * 2 * p.scale;
        ctx.beginPath();
        ctx.moveTo(cx + prevP.x, cy + prevP.y);
        ctx.lineTo(cx + p.x, cy + p.y);
        ctx.stroke();
      }
    });
  }

  drawBody(cx, cy) {
    const body = this.body;
    const typeConfig = CONFIG.bodyTypes[body.type];

    const wellDepth = this.calculateWellDepth(body.x, body.z);
    const p = this.project3D(
      body.x * CONFIG.gridScale,
      wellDepth * 0.7, // Place body in the well
      body.z * CONFIG.gridScale,
    );

    const screenX = cx + p.x;
    const screenY = cy + p.y;

    // Size based on mass and perspective
    const baseSize = 8 + body.mass * 6;
    const size = baseSize * p.scale;

    // Pulsing glow effect
    const pulse =
      0.8 + 0.2 * Math.sin(this.time * CONFIG.pulseSpeed + body.orbitPhase);

    // Draw glow
    Painter.useCtx((ctx) => {
      const gradient = ctx.createRadialGradient(
        screenX,
        screenY,
        0,
        screenX,
        screenY,
        size * 3 * pulse,
      );
      gradient.addColorStop(0, typeConfig.glowColor);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size * 3 * pulse, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw body
    Painter.useCtx((ctx) => {
      if (body.type === "blackhole") {
        // Black hole: dark center with bright accretion disk effect
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon ring
        ctx.strokeStyle = "rgba(150, 100, 200, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Stars and neutron stars: bright center
        const gradient = ctx.createRadialGradient(
          screenX - size * 0.3,
          screenY - size * 0.3,
          0,
          screenX,
          screenY,
          size,
        );
        gradient.addColorStop(0, "#fff");
        gradient.addColorStop(0.3, typeConfig.color);
        gradient.addColorStop(1, typeConfig.glowColor);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawControls(w, h) {
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "#999";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        "click to shuffle  |  drag to rotate  |  scroll to zoom  |  double-click to reset",
        w - 20,
        h - 30,
      );
      ctx.fillText(
        "Mass curves spacetime  |  Objects follow geodesics",
        w - 20,
        h - 15,
      );
      ctx.textAlign = "left";
    });
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new SpacetimeDemo(canvas);
  demo.start();
});

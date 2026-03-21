/**
 * Harmonic Geometries — Polygon Epicycle Playground
 *
 * Nested oscillators where each arm traces the perimeter of a
 * regular polygon instead of a circle. The compound motion of
 * chained arms produces intricate geometric patterns.
 *
 * Arms have fixed radii (large → tiny) and fixed speeds (slow →
 * blazing fast with alternating sign), matching the exponential
 * scaling of the original Three.js project by Shahnab Ahmed.
 * The user controls: number of arms, speed multiplier, and shape.
 *
 * Trail rendered with a hot plasma gradient (white tip → deep red tail)
 * and canvas shadowBlur for a bloom-like glow on 2D canvas.
 */
import {
  Game,
  Painter,
  Screen,
  Gesture,
  FPSCounter,
  applyAnchor,
  Position,
} from "../../src/index.js";
import {
  CONFIG,
  ALL_RADII,
  ALL_SPEEDS,
  SHAPES,
  THEMES,
} from "./harmonic/harmonicgeo.config.js";
import {
  createInfoPanel,
  createControlPanel,
  createToggleButton,
  createPanelStateMachine,
  layoutPanel,
} from "./harmonic/harmonicgeo.ui.js";

// ─────────────────────────────────────────────────────────────────────────────
// POLYGON PERIMETER MATH
// ─────────────────────────────────────────────────────────────────────────────

const TWO_PI = Math.PI * 2;

/**
 * Effective radius at a given angle for a regular N-sided polygon
 * inscribed in a circle of the given radius.
 *
 * For sides=0 returns constant radius (circle).
 * For N >= 3: r(θ) = R·cos(π/N) / cos((θ mod 2π/N) − π/N)
 *
 * @param {number} angle - Angle in radians
 * @param {number} radius - Circumscribed circle radius
 * @param {number} sides - 0 for circle, 3+ for polygon
 * @returns {number} Effective radius at this angle
 */
function getRadiusAtAngle(angle, radius, sides) {
  if (sides === 0) return radius;
  const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  const p = TWO_PI / sides;
  return (radius * Math.cos(Math.PI / sides)) / Math.cos((a % p) - Math.PI / sides);
}

/**
 * Generates vertices for drawing a polygon/circle outline.
 *
 * @param {number} sides - 0 for circle (64 segments), 3+ for polygon
 * @param {number} radius - Radius in pixels
 * @returns {number[][]} Array of [x, y] pairs
 */
function shapeVertices(sides, radius) {
  const segments = sides === 0 ? 64 : sides;
  const verts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TWO_PI;
    verts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
  }
  return verts;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLORMAP INTERPOLATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interpolates a color from a colormap (array of [r,g,b] stops).
 * Stops are evenly spaced from 0 to 1 along the fade axis.
 *
 * @param {number[][]} stops - Array of [r, g, b] color stops
 * @param {number} fade - 0 (oldest/tail) to 1 (newest/tip)
 * @returns {number[]} [r, g, b] each 0-255
 */
function sampleColormap(stops, fade) {
  const t = Math.max(0, Math.min(1, fade));
  const n = stops.length - 1;
  const idx = t * n;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, n);
  const f = idx - lo;
  const a = stops[lo], b = stops[hi];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// HARMONIC GEOMETRIES DEMO
// ─────────────────────────────────────────────────────────────────────────────

export class HarmonicGeometriesDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.background;
    this.enableFluidSize();
  }

  // ── Init ────────────────────────────────────────────────────────────────

  init() {
    super.init();

    this.time = 0;
    this.numCircles = CONFIG.defaultNumCircles;
    this.speedMultiplier = CONFIG.defaultSpeed;
    this.sides = CONFIG.defaultSides;
    this.fadeExponent = CONFIG.defaultFade;
    this.baseRadius = CONFIG.defaultRadius;
    this.spread = CONFIG.defaultSpread;
    this.themeName = CONFIG.defaultTheme;
    this.colorStops = THEMES[this.themeName];
    this.showWireframe = true;

    /** Trail stored in world coordinates (not screen pixels). */
    this.trail = [];
    this.zoom = 1.0;
    this.targetZoom = 1.0;

    Screen.init(this);
    this._initGestures();
    this._buildInfoPanel();
    this._buildUI();
    this._buildToggleButton();
    this._initPanelStateMachine();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);
  }

  // ── Input ───────────────────────────────────────────────────────────────

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * 0.15;
        this.targetZoom = Math.max(0.2, Math.min(4.0, this.targetZoom));
      },
      onPan: null,
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = 1.0;
    });
  }

  // ── Info Panel ──────────────────────────────────────────────────────────

  _buildInfoPanel() {
    const { panel, updateStats } = createInfoPanel(this);
    this.infoPanel = panel;
    this._updateStats = () => {
      const shapeName = SHAPES.find((s) => s.sides === this.sides)?.label || "Circle";
      updateStats(`${this.numCircles} arms · ${shapeName} · speed ${this.speedMultiplier.toFixed(2)}×`);
    };
    this._updateStats();
    this.pipeline.add(this.infoPanel);
  }

  // ── UI Panel ────────────────────────────────────────────────────────────

  _buildUI() {
    const { panel, controls } = createControlPanel(this, {
      onNumCirclesChange: (v) => {
        this.numCircles = v;
        this.trail = [];
        this.time = 0;
        this._updateStats();
      },
      onRadiusChange: (v) => {
        this.baseRadius = v;
        this.trail = [];
        this.time = 0;
      },
      onSpreadChange: (v) => {
        this.spread = v;
        this.trail = [];
        this.time = 0;
      },
      onSpeedChange: (v) => {
        this.speedMultiplier = v;
        this.trail = [];
        this.time = 0;
        this._updateStats();
      },
      onShapeChange: (v) => {
        this.sides = v;
        this.trail = [];
        this.time = 0;
        this._updateStats();
      },
      onFadeChange: (v) => {
        this.fadeExponent = v;
      },
      onThemeChange: (v) => {
        this.themeName = v;
        this.colorStops = THEMES[v];
      },
      onWireframeToggle: (isOn) => {
        this.showWireframe = isOn;
      },
      numCircles: this.numCircles,
      radius: this.baseRadius,
      spread: this.spread,
      speedMultiplier: this.speedMultiplier,
      sides: this.sides,
      fade: this.fadeExponent,
      theme: this.themeName,
      showWireframe: this.showWireframe,
    });
    this.panel = panel;
    this._controls = controls;
    this.pipeline.add(this.panel);
  }

  _buildToggleButton() {
    this._toggleBtn = createToggleButton(this, {
      onToggle: () => this._togglePanel(),
    });
    this.pipeline.add(this._toggleBtn);
  }

  _initPanelStateMachine() {
    this._panelFSM = createPanelStateMachine({
      panel: this.panel,
      toggleBtn: this._toggleBtn,
    });
  }

  _togglePanel() {
    if (this._panelFSM.is("panel-hidden")) {
      this._panelFSM.setState("panel-visible");
    } else {
      this._panelFSM.setState("panel-hidden");
    }
  }

  // ── Epicycle computation ────────────────────────────────────────────────

  /**
   * Returns the radius for arm i, scaled proportionally
   * so that arm 0 matches this.baseRadius.
   *
   * @param {number} i - Arm index
   * @returns {number}
   */
  _armRadius(i) {
    return ALL_RADII[i] * (this.baseRadius / ALL_RADII[0]);
  }

  /**
   * Computes the pen position at a given time t in world units.
   * Sum of all arm contributions.
   *
   * @param {number} t - Time value
   * @returns {{ x: number, y: number }}
   */
  _penPosition(t) {
    let x = 0, y = 0;
    for (let i = 0; i < this.numCircles; i++) {
      const angle = t * ALL_SPEEDS[i] * this.speedMultiplier;
      const r = getRadiusAtAngle(angle, this._armRadius(i), this.sides) * this.spread;
      x += Math.cos(angle) * r;
      y += Math.sin(angle) * r;
    }
    return { x, y };
  }

  /**
   * Computes the chain of arm centers in screen coordinates
   * for drawing the arm visualization.
   *
   * @returns {{ centers: { x: number, y: number }[], pen: { x: number, y: number } }}
   */
  _computeChain() {
    const scale = CONFIG.worldScale * this.zoom;
    const cx = this.width / 2;
    const cy = this.height / 2;

    let curX = cx, curY = cy;
    const centers = [{ x: curX, y: curY }];

    for (let i = 0; i < this.numCircles; i++) {
      const angle = this.time * ALL_SPEEDS[i] * this.speedMultiplier;
      const r = getRadiusAtAngle(angle, this._armRadius(i), this.sides) * scale * this.spread;
      curX += Math.cos(angle) * r;
      curY += Math.sin(angle) * r;
      centers.push({ x: curX, y: curY });
    }

    return { centers, pen: { x: curX, y: curY } };
  }

  // ── Update ──────────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);

    this.zoom += (this.targetZoom - this.zoom) * 0.12;

    this.time += dt;

    // Adaptive trail sampling: subdivide the frame based on the fastest arm
    const maxSpeed = Math.abs(ALL_SPEEDS[this.numCircles - 1] * this.speedMultiplier);
    const maxAngleChange = Math.abs(dt * maxSpeed);
    const steps = Math.min(500, Math.max(1, Math.ceil(maxAngleChange / 0.1)));
    const stepDt = dt / steps;

    for (let step = 1; step <= steps; step++) {
      const stepT = this.time - dt + step * stepDt;
      const pos = this._penPosition(stepT);
      this.trail.push(pos);
    }

    if (this.trail.length > CONFIG.maxPoints) {
      this.trail.splice(0, this.trail.length - CONFIG.maxPoints);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  render() {
    super.render();

    this._drawTrail();

    const { centers, pen } = this._computeChain();
    if (this.showWireframe) {
      this._drawArms(centers);
    }
    this._drawPen(pen);

    this.pipeline.render();
  }

  /**
   * Draws the trail with a two-pass approach and additive blending.
   * Pass 1: thick semi-transparent glow (wider line, low alpha).
   * Pass 2: thin bright core (narrow line, high alpha).
   *
   * Trail self-intersections naturally bloom through additive compositing.
   * Trail points are in world coords; we transform to screen here.
   * Batched by color: ~250 draw calls per pass instead of 30K.
   */
  _drawTrail() {
    const trail = this.trail;
    const len = trail.length;
    if (len < 2) return;

    const scale = CONFIG.worldScale * this.zoom;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const tc = CONFIG.trail;
    const numBatches = Math.ceil((len - 1) / tc.batchSize);
    const fExp = this.fadeExponent;
    const stops = this.colorStops;

    Painter.useCtx((ctx) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "lighter";

      // Pass 1 — glow (thick, dim)
      ctx.lineWidth = tc.glowWidth;
      for (let b = 0; b < numBatches; b++) {
        const start = b * tc.batchSize;
        const end = Math.min(start + tc.batchSize, len - 1);
        const midFade = Math.pow(((start + end) / 2) / len, fExp);
        const [r, g, bb] = sampleColormap(stops, midFade);
        const a = tc.glowAlphaScale * midFade;
        if (a < 0.005) continue;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${bb}, ${a.toFixed(3)})`;
        ctx.beginPath();
        const p0 = trail[start];
        ctx.moveTo(cx + p0.x * scale, cy + p0.y * scale);
        for (let i = start + 1; i <= end; i++) {
          const p = trail[i];
          ctx.lineTo(cx + p.x * scale, cy + p.y * scale);
        }
        ctx.stroke();
      }

      // Pass 2 — core (thin, bright)
      ctx.lineWidth = tc.coreWidth;
      for (let b = 0; b < numBatches; b++) {
        const start = b * tc.batchSize;
        const end = Math.min(start + tc.batchSize, len - 1);
        const midFade = Math.pow(((start + end) / 2) / len, fExp);
        const [r, g, bb] = sampleColormap(stops, midFade);
        const a = tc.coreAlphaBase + tc.coreAlphaScale * midFade;

        ctx.strokeStyle = `rgba(${r}, ${g}, ${bb}, ${a.toFixed(3)})`;
        ctx.beginPath();
        const p0 = trail[start];
        ctx.moveTo(cx + p0.x * scale, cy + p0.y * scale);
        for (let i = start + 1; i <= end; i++) {
          const p = trail[i];
          ctx.lineTo(cx + p.x * scale, cy + p.y * scale);
        }
        ctx.stroke();
      }

      ctx.globalCompositeOperation = "source-over";
    });
  }

  /**
   * Draws the arm circles/polygons and connecting center line.
   */
  _drawArms(centers) {
    const scale = CONFIG.worldScale * this.zoom;
    const ac = CONFIG.arms;

    Painter.useCtx((ctx) => {
      ctx.lineWidth = ac.lineWidth;

      for (let i = 0; i < this.numCircles; i++) {
        const center = centers[i];
        const r = this._armRadius(i) * scale;
        const verts = shapeVertices(this.sides, r);
        const t = this.numCircles > 1 ? Math.pow(i / (this.numCircles - 1), 0.4) : 0;
        const gr = Math.round(t * 255);
        const alpha = 0.35 + t * 0.45;
        ctx.strokeStyle = `rgba(${gr}, 255, ${gr}, ${alpha})`;

        ctx.beginPath();
        for (let v = 0; v < verts.length; v++) {
          const vx = center.x + verts[v][0];
          const vy = center.y + verts[v][1];
          if (v === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = CONFIG.colors.armLine;
      ctx.lineWidth = ac.lineWidth;
      ctx.beginPath();
      for (let i = 0; i < centers.length; i++) {
        if (i === 0) ctx.moveTo(centers[i].x, centers[i].y);
        else ctx.lineTo(centers[i].x, centers[i].y);
      }
      ctx.stroke();
    });
  }

  /**
   * Draws the pen dot at the tip with a glow halo.
   */
  _drawPen(pen) {
    const [pr, pg, pb] = CONFIG.colors.penGlow;
    const [cr, cg, cb] = CONFIG.colors.penCore;

    Painter.useCtx((ctx) => {
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(
        pen.x, pen.y, 0,
        pen.x, pen.y, CONFIG.pen.glowRadius * this.zoom
      );
      grad.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, 0.6)`);
      grad.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pen.x, pen.y, CONFIG.pen.glowRadius * this.zoom, 0, TWO_PI);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.beginPath();
      ctx.arc(pen.x, pen.y, CONFIG.pen.radius * this.zoom, 0, TWO_PI);
      ctx.fill();
    });
  }

  // ── Resize ──────────────────────────────────────────────────────────────

  onResize() {
    if (this.infoPanel) {
      applyAnchor(this.infoPanel, {
        anchor: Position.TOP_LEFT,
        anchorOffsetX: Screen.responsive(10, 10, 10),
        anchorOffsetY: Screen.responsive(66, 10, 10),
      });
    }
    if (this.panel) {
      layoutPanel(this.panel, this.width, this.height);
    }
    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }
    if (!Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-visible");
    } else if (Screen.isMobile && this._panelFSM) {
      this._panelFSM.setState("panel-hidden");
    }
  }
}

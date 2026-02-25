/**
 * Quantum Manifold Playground
 *
 * 3D mesh surface deformed by quantum wave functions with interactive
 * controls. NxN vertex grid, height = |Psi(x,z,t)|^2, rendered as
 * depth-sorted filled quads with height-mapped colors and wireframe overlay.
 *
 * Quantum gravity wells can be added that pull the mesh downward,
 * creating dramatic interference between quantum probability and
 * curved spacetime geometry.
 *
 * Uses Camera3D for 3D projection, AccordionGroup for UI panel,
 * and CPU-computed 2D quantum wave functions.
 */

import {
  Game,
  Painter,
  Camera3D,
  Screen,
  Gesture,
  FPSCounter,
} from "/gcanvas.es.min.js";
import { Complex } from "/gcanvas.es.min.js";
import { Random } from "/gcanvas.es.min.js";
import { createTheme } from "/gcanvas.es.min.js";
import {
  CONFIG,
  MANIFOLD_PRESETS,
  SURFACE_PRESETS,
} from "./quantum/quantuman.config.js";
import {
  createInfoPanel,
  createControlPanel,
  createToggleButton,
  createInfoButton,
  createPanelStateMachine,
  layoutPanel,
  buildParamSliders,
  buildSurfaceSliders,
  getPresetExplanation,
  drawInfoOverlay,
} from "./quantum/quantuman.ui.js";

// ─────────────────────────────────────────────────────────────────────────────
// QUANTUM MANIFOLD PLAYGROUND
// ─────────────────────────────────────────────────────────────────────────────

export class QuantumManifoldPlayground extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.background;
    this.enableFluidSize();
    this.theme = createTheme("#0ff");
  }

  // ─── Init ────────────────────────────────────────────────────────────

  init() {
    super.init();
    this.time = 0;
    this._activePreset = "superposition";
    this._waveParams = { ...MANIFOLD_PRESETS.superposition };
    this._activeSurface = "flat";
    this._surfaceParams = { ...SURFACE_PRESETS.flat };
    this._updatingSliders = false;

    this._gravityWells = [];
    this._paramSliders = [];

    Screen.init(this);
    this._initZoom();
    this._initCamera();
    this._initGrid();
    this._initCollapse();
    this._initGestures();
    this._crossSectionVisible = true;
    this._infoOverlayVisible = false;

    this._buildInfoPanel();
    this._buildUI();
    this._buildToggleButton();
    this._buildInfoButton();
    this._initPanelStateMachine();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    this._superPackets = this._generateSuperPackets(
      this._waveParams.numPackets || 3
    );
    this._standingNx = this._waveParams.nx || 3;
    this._standingNy = this._waveParams.ny || 2;
    this._hermiteNx = this._waveParams.nx || 2;
    this._hermiteNy = this._waveParams.ny || 3;
  }

  _initZoom() {
    const initialZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );
    this.zoom = initialZoom;
    this.targetZoom = initialZoom;
    this.defaultZoom = initialZoom;
  }

  _initCamera() {
    this.camera = new Camera3D({
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      perspective: CONFIG.camera.perspective,
      clampX: false,
      autoRotate: CONFIG.camera.autoRotate,
      autoRotateSpeed: CONFIG.camera.autoRotateSpeed,
      autoRotateAxis: "y",
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      velocityScale: 1.2,
    });
    this.camera.enableMouseControl(this.canvas, { game: this });
  }

  _initGrid() {
    const { size, resolution } = CONFIG.grid;
    const n = resolution + 1;
    this.gridVertices = new Array(n);
    for (let i = 0; i < n; i++) {
      this.gridVertices[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        const x = (i / resolution - 0.5) * 2 * size;
        const z = (j / resolution - 0.5) * 2 * size;
        this.gridVertices[i][j] = { x, y: 0, z, height: 0, gravityDip: 0 };
      }
    }
  }

  _initCollapse() {
    this.isCollapsed = false;
    this.collapseAmount = 0;
    this.collapseX = 0;
    this.collapseZ = 0;
    this.collapseTimer = null;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
  }

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(
          CONFIG.zoom.min,
          Math.min(CONFIG.zoom.max, this.targetZoom)
        );
      },
      onPan: null,
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = this.defaultZoom;
      this.camera.reset();
    });

    const startCollapse = (x, y) => {
      this.pointerStartX = x;
      this.pointerStartY = y;
      this.collapseTimer = setTimeout(() => {
        if (!this.isCollapsed) this._collapse();
      }, CONFIG.collapse.holdTime);
    };

    const checkDrag = (x, y) => {
      const dx = Math.abs(x - this.pointerStartX);
      const dy = Math.abs(y - this.pointerStartY);
      if (dx > CONFIG.collapse.dragThreshold || dy > CONFIG.collapse.dragThreshold) {
        this._cancelCollapse();
      }
    };

    const endCollapse = () => {
      this._cancelCollapse();
      this.isCollapsed = false;
    };

    this.canvas.addEventListener("mousedown", (e) => startCollapse(e.clientX, e.clientY));
    this.canvas.addEventListener("mousemove", (e) => checkDrag(e.clientX, e.clientY));
    this.canvas.addEventListener("mouseup", endCollapse);
    this.canvas.addEventListener("mouseleave", endCollapse);
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1)
        startCollapse(e.touches[0].clientX, e.touches[0].clientY);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1)
        checkDrag(e.touches[0].clientX, e.touches[0].clientY);
      else this._cancelCollapse();
    });
    this.canvas.addEventListener("touchend", endCollapse);
    this.canvas.addEventListener("touchcancel", endCollapse);
  }

  _collapse() {
    this.isCollapsed = true;
    const vertices = this.gridVertices.flat();
    const weights = vertices.map((v) => {
      const psi = this._computeWave(v.x, v.z, this.time);
      return psi.real * psi.real + psi.imag * psi.imag;
    });
    const point = Random.weighted(vertices, weights);
    this.collapseX = point.x;
    this.collapseZ = point.z;
  }

  _cancelCollapse() {
    if (this.collapseTimer) {
      clearTimeout(this.collapseTimer);
      this.collapseTimer = null;
    }
  }

  // ─── Gravity Wells ───────────────────────────────────────────────────

  _addRandomWell() {
    if (this._gravityWells.length >= CONFIG.gravity.maxWells) return;
    const s = CONFIG.grid.size * 0.6;
    this._gravityWells.push({
      x: (Math.random() - 0.5) * 2 * s,
      z: (Math.random() - 0.5) * 2 * s,
      mass: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    });
  }

  _clearWells() {
    this._gravityWells = [];
  }

  /**
   * Compute total gravity well depth at (x, z) using Gaussian profile.
   * Positive return = depth of downward pull.
   */
  _computeGravityAt(x, z) {
    if (!CONFIG.gravity.enabled || this._gravityWells.length === 0) return 0;

    const sigma = CONFIG.gravity.wellWidth;
    const baseDepth = CONFIG.gravity.wellDepth;
    let total = 0;

    for (const well of this._gravityWells) {
      const dx = x - well.x;
      const dz = z - well.z;
      const r2 = dx * dx + dz * dz;
      const pulse = 1 + CONFIG.gravity.pulseAmount *
        Math.sin(this.time * CONFIG.gravity.pulseSpeed + well.phase);
      const depth = baseDepth * Math.sqrt(well.mass) * pulse;
      const s = sigma * Math.sqrt(well.mass);
      total += depth * Math.exp(-r2 / (2 * s * s));
    }
    return total;
  }

  // ─── Surface Geometry ─────────────────────────────────────────────────

  _computeSurface(x, z, t) {
    switch (this._activeSurface) {
      case "saddle":
        return this._saddleSurface(x, z);
      case "torusRidge":
        return this._torusRidgeSurface(x, z);
      default:
        return 0;
    }
  }

  _saddleSurface(x, z) {
    const c = this._surfaceParams.curvature || 2.0;
    const L = CONFIG.grid.size;
    return c * (x * x - z * z) / (L * L);
  }

  _torusRidgeSurface(x, z) {
    const R = this._surfaceParams.ringRadius || 5.0;
    const w = this._surfaceParams.ringWidth || 1.5;
    const amp = this._surfaceParams.ringAmplitude || 3.0;
    const r = Math.sqrt(x * x + z * z);
    const dr = r - R;
    return amp * Math.exp(-(dr * dr) / (2 * w * w));
  }

  // ─── Info Panel ──────────────────────────────────────────────────────

  _buildInfoPanel() {
    const { panel, statsText, updateStats } = createInfoPanel(this);
    this.infoPanel = panel;
    this.statsText = statsText;
    this._updateStatsText = () => {
      const preset = MANIFOLD_PRESETS[this._activePreset];
      const wellCount = this._gravityWells.length;
      const wellStr = wellCount > 0 ? ` | ${wellCount} well${wellCount > 1 ? "s" : ""}` : "";
      const surfaceLabel = this._activeSurface !== "flat"
        ? ` | ${SURFACE_PRESETS[this._activeSurface]?.label || ""}`
        : "";
      if (this._activePreset === "superposition") {
        statsText.text = `${preset.label} | ${this._waveParams.numPackets || 3} packets${surfaceLabel}${wellStr}`;
      } else {
        statsText.text = `${preset.label}${surfaceLabel}${wellStr}`;
      }
    };
    this.pipeline.add(this.infoPanel);
  }

  // ─── UI Panel ────────────────────────────────────────────────────────

  _buildUI() {
    const paramCallbacks = {
      getUpdatingSliders: () => this._updatingSliders,
      onNumPacketsChange: (v) => {
        this._waveParams.numPackets = v;
        this._superPackets = this._generateSuperPackets(v);
      },
      onSpeedChange: () => {
        this._superPackets = this._generateSuperPackets(
          this._waveParams.numPackets || 3
        );
      },
      onNxChange: (v) => {
        this._waveParams.nx = v;
        if (this._activePreset === "standingWave") this._standingNx = v;
        else this._hermiteNx = v;
      },
      onNyChange: (v) => {
        this._waveParams.ny = v;
        if (this._activePreset === "standingWave") this._standingNy = v;
        else this._hermiteNy = v;
      },
      onGridResChange: () => this._initGrid(),
    };

    const { panel, controls, paramsSection, surfaceGeomSection, sections } = createControlPanel(this, {
      onPresetChange: (key) => this._onPresetChange(key),
      onSurfaceChange: (key) => this._onSurfaceChange(key),
      activeSurface: this._activeSurface,
      surfaceParams: this._surfaceParams,
      buildParamSliders,
      addWell: () => this._addRandomWell(),
      clearWells: () => this._clearWells(),
      collapse: () => {
        if (!this.isCollapsed) {
          this._collapse();
          setTimeout(() => {
            this.isCollapsed = false;
          }, CONFIG.collapse.duration);
        }
      },
      resetToDefaults: () => this._resetToDefaults(),
      restart: () => {
        this.time = 0;
        this.isCollapsed = false;
        this.collapseAmount = 0;
        this._clearWells();
        if (this._activePreset === "superposition") {
          this._superPackets = this._generateSuperPackets(
            this._waveParams.numPackets || 3
          );
        }
      },
      ...paramCallbacks,
      waveParams: this._waveParams,
      activePreset: this._activePreset,
      camera: this.camera,
    });

    this.panel = panel;
    this._controls = controls;
    this._paramsSection = paramsSection;
    this._surfaceGeomSection = surfaceGeomSection;
    this._sections = sections;
    this.pipeline.add(this.panel);
  }

  // ─── Mobile Toggle Button ──────────────────────────────────────────

  _buildToggleButton() {
    this._toggleBtn = createToggleButton(this, {
      onToggle: () => this._togglePanel(),
    });
    this.pipeline.add(this._toggleBtn);
  }

  _buildInfoButton() {
    this._infoBtn = createInfoButton(this, {
      onToggle: (on) => {
        this._infoOverlayVisible = on;
        if (on && Screen.isMobile) {
          if (this._panelFSM && this._panelFSM.is("panel-visible")) {
            this._panelFSM.setState("panel-hidden");
          }
        }
      },
    });
    this.pipeline.add(this._infoBtn);
  }

  _initPanelStateMachine() {
    this._panelFSM = createPanelStateMachine({
      panel: this.panel,
      toggleBtn: this._toggleBtn,
      infoBtn: this._infoBtn,
      setCrossSectionVisible: (v) => { this._crossSectionVisible = v; },
      setInfoOverlayVisible: (v) => {
        this._infoOverlayVisible = v;
        if (this._infoBtn?.toggled) this._infoBtn.toggle(false);
      },
    });
  }

  _togglePanel() {
    if (this._panelFSM.is("panel-hidden")) {
      this._panelFSM.setState("panel-visible");
    } else {
      this._panelFSM.setState("panel-hidden");
    }
  }

  _layoutPanel() {
    layoutPanel(this.panel, this.width, this.height);
  }

  _onPresetChange(key) {
    const preset = MANIFOLD_PRESETS[key];
    if (!preset) return;

    this._controls.preset.close();
    this._activePreset = key;
    this._waveParams = { ...preset };
    this.time = 0;
    this.isCollapsed = false;
    this.collapseAmount = 0;

    if (key === "superposition") {
      this._superPackets = this._generateSuperPackets(preset.numPackets || 3);
    }
    if (key === "standingWave") {
      this._standingNx = preset.nx || 3;
      this._standingNy = preset.ny || 2;
    }
    if (key === "harmonic") {
      this._hermiteNx = preset.nx || 2;
      this._hermiteNy = preset.ny || 3;
    }

    this._updateStatsText();
    this._paramSliders = buildParamSliders(
      this,
      this.panel,
      this._paramsSection,
      key,
      this._waveParams,
      {
        getUpdatingSliders: () => this._updatingSliders,
        onNumPacketsChange: (v) => {
          this._waveParams.numPackets = v;
          this._superPackets = this._generateSuperPackets(v);
        },
        onSpeedChange: () => {
          this._superPackets = this._generateSuperPackets(
            this._waveParams.numPackets || 3
          );
        },
        onNxChange: (v) => {
          this._waveParams.nx = v;
          if (key === "standingWave") this._standingNx = v;
          else this._hermiteNx = v;
        },
        onNyChange: (v) => {
          this._waveParams.ny = v;
          if (key === "standingWave") this._standingNy = v;
          else this._hermiteNy = v;
        },
      }
    );
  }

  _onSurfaceChange(key) {
    const preset = SURFACE_PRESETS[key];
    if (!preset) return;

    this._controls.surface.close();
    this._activeSurface = key;
    this._surfaceParams = { ...preset };

    this._surfaceSliders = buildSurfaceSliders(
      this,
      this.panel,
      this._surfaceGeomSection,
      key,
      this._surfaceParams,
      {
        getUpdatingSliders: () => this._updatingSliders,
      }
    );
  }

  _resetToDefaults() {
    this._onPresetChange(this._activePreset);
    this._onSurfaceChange(this._activeSurface);
  }

  // ─── Info Overlay ────────────────────────────────────────────────────

  _drawInfoOverlay() {
    drawInfoOverlay({
      visible: this._infoOverlayVisible,
      info: getPresetExplanation(
        this._activePreset,
        this._waveParams,
        this._gravityWells.length,
        this._activeSurface
      ),
      width: this.width,
      height: this.height,
    });
  }

  // ─── Wave Functions ──────────────────────────────────────────────────

  _wrapDelta(d) {
    const size = CONFIG.grid.size;
    const range = 2 * size;
    return ((((d + size) % range) + range) % range) - size;
  }

  _gaussianPacket2D(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 1.0;
    const k = p.k || 4.0;
    const omega = p.omega || 2.0;
    const vx = p.vx || 0;
    const vz = p.vz || 0;

    const dx = this._wrapDelta(x - vx * t);
    const dz = this._wrapDelta(z - vz * t);
    const r2 = dx * dx + dz * dz;
    const envelope = Math.exp(-r2 / (4 * sigma * sigma));
    const phase = k * x + k * 0.5 * z - omega * t;
    return Complex.fromPolar(envelope, phase);
  }

  _doubleSlit(x, z, t) {
    const p = this._waveParams;
    const d = (p.slitSeparation || 2.5) / 2;
    const sigma = p.sigma || 0.8;
    const k = p.k || 6.0;
    const omega = p.omega || 3.0;

    const r1sq = (x - d) * (x - d) + z * z;
    const r2sq = (x + d) * (x + d) + z * z;
    const r1 = Math.sqrt(r1sq);
    const r2 = Math.sqrt(r2sq);

    const env1 = Math.exp(-r1sq / (4 * sigma * sigma));
    const env2 = Math.exp(-r2sq / (4 * sigma * sigma));

    const psi1 = Complex.fromPolar(env1, k * r1 - omega * t);
    const psi2 = Complex.fromPolar(env2, k * r2 - omega * t);
    return psi1.add(psi2);
  }

  _standingWave(x, z, t) {
    const p = this._waveParams;
    const nx = this._standingNx;
    const ny = this._standingNy;
    const omega = p.omega || 2.0;
    const L = CONFIG.grid.size;

    const valX = Math.sin((nx * Math.PI * (x + L)) / (2 * L));
    const valZ = Math.sin((ny * Math.PI * (z + L)) / (2 * L));
    const amplitude = valX * valZ;
    const phase = -omega * t;
    return Complex.fromPolar(amplitude, phase);
  }

  _generateSuperPackets(n) {
    const speed = this._waveParams.speed || 0.3;
    const packets = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + 0.3;
      packets.push({
        kx: Math.cos(angle) * (3 + i * 1.5),
        kz: Math.sin(angle) * (3 + i * 1.5),
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        phase: i * 1.2,
      });
    }
    return packets;
  }

  _superposition(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 1.2;
    const omega = p.omega || 3.0;
    const packets = this._superPackets;

    let result = new Complex(0, 0);
    for (const pkt of packets) {
      const dx = this._wrapDelta(x - pkt.vx * t);
      const dz = this._wrapDelta(z - pkt.vz * t);
      const r2 = dx * dx + dz * dz;
      const envelope = Math.exp(-r2 / (4 * sigma * sigma));
      const phase = pkt.kx * x + pkt.kz * z - omega * t + pkt.phase;
      result = result.add(Complex.fromPolar(envelope, phase));
    }
    return result.scale(1 / packets.length);
  }

  _tunneling(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 0.9;
    const k = p.k || 5.0;
    const omega = p.omega || 2.5;
    const vx = p.vx || 0.6;
    const bH = p.barrierHeight || 0.6;
    const bW = p.barrierWidth || 0.8;

    const dx = this._wrapDelta(x - vx * t);
    const r2 = dx * dx + z * z;
    const envelope = Math.exp(-r2 / (4 * sigma * sigma));

    let transmission = 1.0;
    if (Math.abs(x) < bW) {
      const kappa = Math.sqrt(Math.max(0, 2 * bH - k * k * 0.01));
      transmission = Math.exp(-2 * kappa * bW) * 0.5 + 0.5;
    }

    let reflectionPhase = 0;
    if (x < -bW && vx * t > 0) {
      reflectionPhase = Math.PI;
    }

    const phase = k * x - omega * t + reflectionPhase;
    return Complex.fromPolar(envelope * transmission, phase);
  }

  _hermitePolynomial(n, x) {
    switch (n) {
      case 1: return 1;
      case 2: return 2 * x;
      case 3: return 4 * x * x - 2;
      case 4: return 8 * x * x * x - 12 * x;
      case 5: return 16 * x * x * x * x - 48 * x * x + 12;
      case 6: return 32 * x * x * x * x * x - 160 * x * x * x + 120 * x;
      default: return 1;
    }
  }

  _harmonicOscillator(x, z, t) {
    const p = this._waveParams;
    const sigma = p.sigma || 1.5;
    const omega = p.omega || 2.0;
    const nx = this._hermiteNx;
    const ny = this._hermiteNy;

    const xn = x / sigma;
    const zn = z / sigma;
    const hx = this._hermitePolynomial(nx, xn);
    const hz = this._hermitePolynomial(ny, zn);
    const gauss = Math.exp(-(xn * xn + zn * zn) / 2);
    const amplitude = hx * hz * gauss;
    const phase = -omega * t * (nx + ny);
    return Complex.fromPolar(amplitude, phase);
  }

  _computeWave(x, z, t) {
    switch (this._activePreset) {
      case "gaussian":
        return this._gaussianPacket2D(x, z, t);
      case "doubleSlit":
        return this._doubleSlit(x, z, t);
      case "standingWave":
        return this._standingWave(x, z, t);
      case "superposition":
        return this._superposition(x, z, t);
      case "tunneling":
        return this._tunneling(x, z, t);
      case "harmonic":
        return this._harmonicOscillator(x, z, t);
      default:
        return this._gaussianPacket2D(x, z, t);
    }
  }

  // ─── Color Helpers ───────────────────────────────────────────────────

  _heightColor(t) {
    const grad = CONFIG.colors.gradient;

    let i = 0;
    while (i < grad.length - 1 && grad[i + 1].stop < t) i++;
    if (i >= grad.length - 1) i = grad.length - 2;

    const lo = grad[i];
    const hi = grad[i + 1];
    const range = hi.stop - lo.stop;
    const f = range > 0 ? (t - lo.stop) / range : 0;

    const r = Math.floor(lo.color[0] + (hi.color[0] - lo.color[0]) * f);
    const g = Math.floor(lo.color[1] + (hi.color[1] - lo.color[1]) * f);
    const b = Math.floor(lo.color[2] + (hi.color[2] - lo.color[2]) * f);

    return [r, g, b];
  }

  _surfaceGeomColor(t) {
    const grad = CONFIG.colors.surfaceGradient;

    let i = 0;
    while (i < grad.length - 1 && grad[i + 1].stop < t) i++;
    if (i >= grad.length - 1) i = grad.length - 2;

    const lo = grad[i];
    const hi = grad[i + 1];
    const range = hi.stop - lo.stop;
    const f = range > 0 ? (t - lo.stop) / range : 0;

    const r = Math.floor(lo.color[0] + (hi.color[0] - lo.color[0]) * f);
    const g = Math.floor(lo.color[1] + (hi.color[1] - lo.color[1]) * f);
    const b = Math.floor(lo.color[2] + (hi.color[2] - lo.color[2]) * f);

    return [r, g, b];
  }

  _gravityColor(normalizedDip) {
    const t = Math.min(1, normalizedDip);
    const r = Math.floor(20 + 235 * t);
    const g = Math.floor(60 * (1 - t * 0.5));
    const b = Math.floor(40 * (1 - t));
    return [r, g, b];
  }

  // ─── Projection ──────────────────────────────────────────────────────

  _project3D(x, y, z) {
    const proj = this.camera.project(x, y, z);
    return {
      x: proj.x * this.zoom,
      y: proj.y * this.zoom,
      z: proj.z,
      scale: proj.scale * this.zoom,
    };
  }

  // ─── Update ──────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);
    this.time += dt * CONFIG.timeScale;
    this.camera.update(dt);

    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;

    const targetCollapse = this.isCollapsed ? 1 : 0;
    this.collapseAmount += (targetCollapse - this.collapseAmount) * 0.12;

    this._evolveWaveFunction();
    this._updateStatsText();
  }

  _evolveWaveFunction() {
    const { resolution } = CONFIG.grid;
    const n = resolution + 1;
    const amplitude = CONFIG.surface.amplitude;
    const collapse = this.collapseAmount;
    const t = this.time;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = this.gridVertices[i][j];
        const psi = this._computeWave(v.x, v.z, t);
        let probDensity = psi.real * psi.real + psi.imag * psi.imag;

        if (collapse > 0.01) {
          const cdx = v.x - this.collapseX;
          const cdz = v.z - this.collapseZ;
          const cr2 = cdx * cdx + cdz * cdz;
          const collapsedProb = Math.exp(-cr2 / 0.3);
          probDensity = probDensity * (1 - collapse) + collapsedProb * collapse;
        }

        const gravityDip = this._computeGravityAt(v.x, v.z);
        v.gravityDip = gravityDip;

        const surfaceH = this._computeSurface(v.x, v.z, t);
        v.surfaceH = surfaceH;
        v.height = probDensity;

        // Barrier height (tunneling preset only)
        let barrierH = 0;
        if (this._activePreset === "tunneling") {
          const bH = this._waveParams.barrierHeight || 0.6;
          const bW = this._waveParams.barrierWidth || 0.8;
          if (Math.abs(v.x) < bW) {
            barrierH = bH * (1 - Math.abs(v.x) / bW);
          }
        }
        v.barrierH = barrierH;

        v.y = surfaceH + probDensity * amplitude + barrierH * amplitude * 0.5 - gravityDip;
      }
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  render() {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2 + 30;

    Painter.setContext(this.ctx);
    if (this.running) this.clear();

    this._renderBackground(w, h);
    this._renderSurface(cx, cy);
    this._renderGravityWellMarkers(cx, cy);
    if (CONFIG.crossSection.enabled && this._crossSectionVisible) {
      this._renderCrossSection(w, h);
    }
    this._renderControls(w, h);

    this.pipeline.render();
    this._drawInfoOverlay();
  }

  _renderBackground(w, h) {
    Painter.useCtx((ctx) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#000810");
      grad.addColorStop(0.5, "#001018");
      grad.addColorStop(1, "#000408");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }

  _renderSurface(cx, cy) {
    const { resolution } = CONFIG.grid;
    const n = resolution + 1;
    const gridScale = 15;

    const projected = new Array(n);
    for (let i = 0; i < n; i++) {
      projected[i] = new Array(n);
      for (let j = 0; j < n; j++) {
        const v = this.gridVertices[i][j];
        const p = this._project3D(
          v.x * gridScale,
          -v.y * gridScale * 0.5,
          v.z * gridScale
        );
        projected[i][j] = {
          x: cx + p.x,
          y: cy + p.y,
          z: p.z,
          height: v.height,
          gravityDip: v.gravityDip,
          surfaceH: v.surfaceH || 0,
          barrierH: v.barrierH || 0,
        };
      }
    }

    const quads = [];
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const p00 = projected[i][j];
        const p10 = projected[i + 1][j];
        const p11 = projected[i + 1][j + 1];
        const p01 = projected[i][j + 1];
        const avgZ = (p00.z + p10.z + p11.z + p01.z) * 0.25;
        const avgH = (p00.height + p10.height + p11.height + p01.height) * 0.25;
        const avgDip = (p00.gravityDip + p10.gravityDip + p11.gravityDip + p01.gravityDip) * 0.25;
        const avgSurfaceH = (p00.surfaceH + p10.surfaceH + p11.surfaceH + p01.surfaceH) * 0.25;
        const avgBarrier = (p00.barrierH + p10.barrierH + p11.barrierH + p01.barrierH) * 0.25;
        quads.push({ p00, p10, p11, p01, avgZ, avgH, avgDip, avgSurfaceH, avgBarrier });
      }
    }

    quads.sort((a, b) => a.avgZ - b.avgZ);

    let maxH = 0;
    let maxDip = 0;
    for (const q of quads) {
      if (q.avgH > maxH) maxH = q.avgH;
      if (q.avgDip > maxDip) maxDip = q.avgDip;
    }
    if (maxH < 0.001) maxH = 1;
    if (maxDip < 0.001) maxDip = 1;

    let maxSurface = 0;
    let minSurface = 0;
    for (const q of quads) {
      if (q.avgSurfaceH > maxSurface) maxSurface = q.avgSurfaceH;
      if (q.avgSurfaceH < minSurface) minSurface = q.avgSurfaceH;
    }
    const surfaceRange = maxSurface - minSurface;

    Painter.useCtx((ctx) => {
      for (const q of quads) {
        const waveT = Math.min(1, q.avgH / maxH);
        const dipT = Math.min(1, q.avgDip / maxDip);

        // Wave color (matter — green/cyan)
        const [wr, wg, wb] = this._heightColor(waveT);
        let r = wr, g = wg, b = wb;

        // Surface geometry color (spacetime — purple/indigo)
        if (surfaceRange > 0.01) {
          const surfaceT = (q.avgSurfaceH - minSurface) / surfaceRange;
          const [sr, sg, sb] = this._surfaceGeomColor(surfaceT);
          // Blend: surface is the base, wave paints on top proportionally
          const waveMix = Math.min(1, waveT * 1.5);
          r = Math.floor(sr * (1 - waveMix) + wr * waveMix);
          g = Math.floor(sg * (1 - waveMix) + wg * waveMix);
          b = Math.floor(sb * (1 - waveMix) + wb * waveMix);
        }

        // Gravity well color (red/orange)
        if (dipT > 0.05) {
          const [gr, gg, gb] = this._gravityColor(dipT);
          const blend = dipT * 0.7;
          r = Math.floor(r * (1 - blend) + gr * blend);
          g = Math.floor(g * (1 - blend) + gg * blend);
          b = Math.floor(b * (1 - blend) + gb * blend);
        }

        // Barrier color (amber/gold wall)
        if (q.avgBarrier > 0.01) {
          const maxBarrier = this._waveParams.barrierHeight || 0.6;
          const barrierT = Math.min(1, q.avgBarrier / maxBarrier);
          const br = 255, bg = Math.floor(180 + 60 * barrierT), bb = Math.floor(40 * (1 - barrierT));
          const blend = barrierT * 0.85;
          r = Math.floor(r * (1 - blend) + br * blend);
          g = Math.floor(g * (1 - blend) + bg * blend);
          b = Math.floor(b * (1 - blend) + bb * blend);
        }

        ctx.fillStyle = `rgba(${r},${g},${b},${CONFIG.surface.surfaceAlpha})`;

        ctx.beginPath();
        ctx.moveTo(q.p00.x, q.p00.y);
        ctx.lineTo(q.p10.x, q.p10.y);
        ctx.lineTo(q.p11.x, q.p11.y);
        ctx.lineTo(q.p01.x, q.p01.y);
        ctx.closePath();
        ctx.fill();
      }
    });

    if (CONFIG.surface.wireframe) {
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = CONFIG.colors.wireColor;
        ctx.lineWidth = 0.5;

        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          for (let j = 0; j < n; j++) {
            const p = projected[i][j];
            if (j === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }

        for (let j = 0; j < n; j++) {
          ctx.beginPath();
          for (let i = 0; i < n; i++) {
            const p = projected[i][j];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      });
    }
  }

  _renderGravityWellMarkers(cx, cy) {
    if (!CONFIG.gravity.enabled || this._gravityWells.length === 0) return;

    const gridScale = 15;

    for (const well of this._gravityWells) {
      const dip = this._computeGravityAt(well.x, well.z);
      const quantumH = (() => {
        const psi = this._computeWave(well.x, well.z, this.time);
        return (psi.real * psi.real + psi.imag * psi.imag) * CONFIG.surface.amplitude;
      })();
      const netY = quantumH - dip;

      const p = this._project3D(
        well.x * gridScale,
        -netY * gridScale * 0.5,
        well.z * gridScale
      );

      const sx = cx + p.x;
      const sy = cy + p.y;
      const size = (4 + well.mass * 4) * p.scale;
      const pulse = 0.8 + 0.2 * Math.sin(this.time * 2 + well.phase);

      Painter.useCtx((ctx) => {
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3 * pulse);
        gradient.addColorStop(0, CONFIG.colors.wellGlow);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      Painter.useCtx((ctx) => {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = CONFIG.colors.wellRing;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  _renderCrossSection(w, h) {
    const cs = CONFIG.crossSection;
    const plotY = h - cs.marginBottom - cs.height;
    const plotH = cs.height;
    const plotW = w * 0.6;
    const plotX = (w - plotW) / 2;
    const { size } = CONFIG.grid;
    const numSamples = 200;

    const samples = [];
    let maxProb = 0;
    const collapse = this.collapseAmount;
    const sliceZ = collapse > 0.01 ? this.collapseZ * collapse : 0;
    for (let i = 0; i < numSamples; i++) {
      const x = (i / (numSamples - 1) - 0.5) * 2 * size;
      const psi = this._computeWave(x, sliceZ, this.time);
      let prob = psi.real * psi.real + psi.imag * psi.imag;
      let re = psi.real;

      if (collapse > 0.01) {
        const cdx = x - this.collapseX;
        const cr2 = cdx * cdx;
        const collapsedProb = Math.exp(-cr2 / 0.3);
        prob = prob * (1 - collapse) + collapsedProb * collapse;
        re = re * (1 - collapse) + Math.sqrt(collapsedProb) * collapse;
      }

      const grav = this._computeGravityAt(x, sliceZ);
      const surfH = this._computeSurface(x, sliceZ, this.time);
      let barrierVal = 0;
      if (this._activePreset === "tunneling") {
        const bH = this._waveParams.barrierHeight || 0.6;
        const bW = this._waveParams.barrierWidth || 0.8;
        if (Math.abs(x) < bW) {
          barrierVal = bH * (1 - Math.abs(x) / bW);
        }
      }
      samples.push({ x, prob, re, grav, surfH, barrierVal });
      if (prob > maxProb) maxProb = prob;
    }
    if (maxProb < 0.001) maxProb = 1;

    let maxGrav = 0;
    for (const s of samples) {
      if (s.grav > maxGrav) maxGrav = s.grav;
    }

    // Collapse-dependent colors (computed before any draw calls)
    const collapseBlend = Math.min(1, collapse / 0.5);
    const envColor = collapse > 0.01
      ? `rgba(${Math.floor(255 * collapseBlend)}, ${Math.floor(200 + 55 * collapseBlend)}, ${Math.floor(180 + 75 * collapseBlend)}, ${0.3 + 0.4 * collapseBlend})`
      : cs.envelopeColor;
    const waveStrokeColor = collapse > 0.01
      ? `rgba(${Math.floor(255 * collapseBlend)}, 255, ${Math.floor(204 + 51 * collapseBlend)}, 1)`
      : cs.waveColor;

    // Background + border
    Painter.useCtx((ctx) => {
      ctx.fillStyle = "rgba(0, 8, 16, 0.75)";
      ctx.fillRect(plotX - 8, plotY - 8, plotW + 16, plotH + 16);
      const borderColor = collapse > 0.01
        ? `rgba(${Math.floor(100 + 155 * collapseBlend)}, ${Math.floor(200 + 55 * collapseBlend)}, ${Math.floor(180 + 75 * collapseBlend)}, ${0.2 + 0.3 * collapseBlend})`
        : "rgba(0, 200, 180, 0.15)";
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(plotX - 8, plotY - 8, plotW + 16, plotH + 16);
    });

    // Gravity fill
    if (maxGrav > 0.01) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = "rgba(255, 60, 40, 0.2)";
        ctx.beginPath();
        ctx.moveTo(plotX, plotY + plotH / 2);
        for (let i = 0; i < numSamples; i++) {
          const sx = plotX + (i / (numSamples - 1)) * plotW;
          const sy = plotY + plotH / 2 + (samples[i].grav / (maxGrav + 0.1)) * plotH * 0.4;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(plotX + plotW, plotY + plotH / 2);
        ctx.closePath();
        ctx.fill();
      });
    }

    // Barrier fill (tunneling preset)
    if (this._activePreset === "tunneling") {
      const maxBarrier = this._waveParams.barrierHeight || 0.6;
      Painter.useCtx((ctx) => {
        ctx.fillStyle = "rgba(255, 200, 40, 0.25)";
        ctx.beginPath();
        ctx.moveTo(plotX, plotY + plotH);
        for (let i = 0; i < numSamples; i++) {
          const sx = plotX + (i / (numSamples - 1)) * plotW;
          const bNorm = samples[i].barrierVal / maxBarrier;
          const sy = plotY + plotH - bNorm * plotH * 0.6;
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(plotX + plotW, plotY + plotH);
        ctx.closePath();
        ctx.fill();

        // Barrier outline
        ctx.strokeStyle = "rgba(255, 200, 40, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const sx = plotX + (i / (numSamples - 1)) * plotW;
          const bNorm = samples[i].barrierVal / maxBarrier;
          if (bNorm < 0.01) continue;
          const sy = plotY + plotH - bNorm * plotH * 0.6;
          if (i === 0 || samples[i - 1].barrierVal < 0.01) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      });
    }

    // Surface geometry baseline
    let maxSurfH = 0;
    let minSurfH = 0;
    for (const s of samples) {
      if (s.surfH > maxSurfH) maxSurfH = s.surfH;
      if (s.surfH < minSurfH) minSurfH = s.surfH;
    }
    const surfRange = maxSurfH - minSurfH;

    if (surfRange > 0.01) {
      Painter.useCtx((ctx) => {
        ctx.strokeStyle = "rgba(180, 120, 255, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let i = 0; i < numSamples; i++) {
          const sx = plotX + (i / (numSamples - 1)) * plotW;
          const normSurf = (surfRange > 0) ? (samples[i].surfH - minSurfH) / surfRange : 0.5;
          const sy = plotY + plotH - normSurf * plotH * 0.5 - plotH * 0.1;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // |Ψ|² envelope fill
    Painter.useCtx((ctx) => {
      ctx.fillStyle = envColor;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY + plotH);
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const sy = plotY + plotH - (samples[i].prob / maxProb) * plotH * 0.9;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(plotX + plotW, plotY + plotH);
      ctx.closePath();
      ctx.fill();
    });

    // Re(Ψ) wave line
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = waveStrokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const normRe = samples[i].re / Math.sqrt(maxProb);
        const sy = plotY + plotH / 2 - normRe * plotH * 0.4;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    });

    // Labels
    Painter.useCtx((ctx) => {
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = collapse > 0.01 ? `rgba(255,255,255,${0.5 + 0.5 * collapseBlend})` : "#888";
      const sliceLabel = collapse > 0.01 ? `Cross-section (z=${sliceZ.toFixed(1)})` : "Cross-section (z=0)";
      ctx.fillText(sliceLabel, plotX, plotY - 10);
      ctx.fillStyle = collapse > 0.01 ? waveStrokeColor : cs.waveColor;
      ctx.fillText("Re(\u03A8)", plotX + plotW - 50, plotY - 10);
      ctx.fillStyle = "rgba(0, 200, 180, 0.6)";
      ctx.fillText("|\u03A8|\u00B2", plotX + plotW - 100, plotY - 10);
      if (maxGrav > 0.01) {
        ctx.fillStyle = "rgba(255, 60, 40, 0.6)";
        ctx.fillText("\u03A6(r)", plotX + plotW - 150, plotY - 10);
      }
      if (surfRange > 0.01) {
        ctx.fillStyle = "rgba(180, 120, 255, 0.6)";
        ctx.fillText("S(r)", plotX + plotW - 200, plotY - 10);
      }
      if (this._activePreset === "tunneling") {
        ctx.fillStyle = "rgba(255, 200, 40, 0.7)";
        ctx.fillText("V(x)", plotX + plotW - 250, plotY - 10);
      }
    });
  }

  _renderControls() {
    // Hints are now rendered in the info panel (top-left)
  }

  // ─── Resize ──────────────────────────────────────────────────────────

  onResize() {
    this.defaultZoom = Math.min(
      CONFIG.zoom.max,
      Math.max(CONFIG.zoom.min, Screen.minDimension() / CONFIG.zoom.baseScreenSize)
    );

    if (this.panel) {
      this._layoutPanel();
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

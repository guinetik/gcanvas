/**
 * Galaxy Playground
 *
 * Interactive galaxy visualization with Hubble classification types:
 * Spiral (S), Grand Design (Sc), Flocculent (Sd), Barred Spiral (SB),
 * Elliptical (E), and Irregular (Irr). Uses Keplerian-inspired differential
 * rotation and a tunable parameter panel.
 *
 * Drag to tilt the galaxy. Click to pause. Regenerate to apply parameter changes.
 */

import {
  Game,
  Camera3D,
  Painter,
  Screen,
  FPSCounter,
  Gesture,
} from "../../src/index.js";
import { CONFIG, GALAXY_PRESETS } from "./galaxy/galaxy.config.js";
import { generateGalaxy } from "./galaxy/galaxy.generator.js";
import {
  createInfoPanel,
  createControlPanel,
  createToggleButton,
  layoutPanel,
  buildParamSliders,
} from "./galaxy/galaxy.ui.js";
import { createTheme } from "../../src/game/ui/theme.js";
import { WebGLParticleRenderer } from "../../src/webgl/webgl-particle-renderer.js";
import { WebGLNebulaRenderer } from "../../src/webgl/webgl-nebula-renderer.js";
import { WebGLBlackHoleRenderer } from "../../src/webgl/webgl-blackhole-renderer.js";

const TAU = Math.PI * 2;
const BLACK_HOLE_VISUAL_SCALE = 1.45;

// ─────────────────────────────────────────────────────────────────────────────
// GALAXY PLAYGROUND
// ─────────────────────────────────────────────────────────────────────────────

export class GalaxyPlayground extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
    this.theme = createTheme("#0ff");
  }

  init() {
    super.init();
    Painter.init(this.ctx);

    this.time = 0;
    this.paused = false;
    this.galaxyRotation = 0;
    this._updatingSliders = false;
    this._activePreset = "spiral";
    this._galaxyParams = { ...GALAXY_PRESETS.spiral };

    Screen.init(this);
    this._initZoom();
    this._initCamera();
    this._initGestures();
    this._initStars();
    this._initWebGL();
    this._updateDensityMap();
    this._buildInfoPanel();
    this._buildUI();
    this._buildToggleButton();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    this._didDrag = false;
    this.canvas.addEventListener("mousedown", () => { this._didDrag = false; });
    this.canvas.addEventListener("mousemove", () => {
      if (this.camera._isDragging) this._didDrag = true;
    });
    this.canvas.addEventListener("click", () => {
      if (!this._didDrag) {
        this.paused = !this.paused;
      }
    });
  }

  _initCamera() {
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.initialTiltX,
      rotationY: 0,
      sensitivity: CONFIG.camera.sensitivity,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      clampX: false,
    });
    this.camera.enableMouseControl(this.canvas, {
      game: this,
      isOverPanel: (clientX, clientY) => this._isPointerOverPanel(clientX, clientY),
    });
  }

  /**
   * Returns true if the pointer is over the panel area (used to avoid capturing camera drag).
   * @param {number} clientX - Pointer clientX
   * @param {number} clientY - Pointer clientY
   * @returns {boolean}
   */
  _isPointerOverPanel(clientX, clientY) {
    if (!this.panel?.visible) return false;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (this.canvas.width / rect.width);
    return canvasX >= this.width - CONFIG.panel.width - CONFIG.panel.marginRight - 20;
  }

  _initZoom() {
    this.zoom = 1;
    this.targetZoom = 1;
  }

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta, centerX) => {
        if (this.panel?.visible && centerX > this.width - CONFIG.panel.width - CONFIG.panel.marginRight - 20) return;
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
        this.targetZoom = Math.max(
          CONFIG.zoom.min,
          Math.min(CONFIG.zoom.max, this.targetZoom)
        );
      },
      onPan: null,
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetZoom = 1;
      this.camera.reset();
    });
  }

  _initStars() {
    this.stars = generateGalaxy(this._galaxyParams);
  }

  _initWebGL() {
    const maxParticles = 30000;
    this.glRenderer = new WebGLParticleRenderer(maxParticles, {
      width: this.width,
      height: this.height,
      shape: "glow",
      blendMode: "additive",
    });

    this._nebulaSeed = Math.random();
    this.nebulaRenderer = new WebGLNebulaRenderer({
      width: this.width,
      height: this.height,
      nebulaIntensity: CONFIG.nebula.intensity,
    });
    this.nebulaRenderer.init();

    this.blackHoleRenderer = new WebGLBlackHoleRenderer({
      size: CONFIG.blackHole.shaderSize,
    });
    this.blackHoleRenderer.init();
  }

  _regenerate() {
    this._initStars();
    this._nebulaSeed = Math.random();
    this._updateDensityMap();
  }

  _updateDensityMap() {
    if (this.nebulaRenderer && this.nebulaRenderer.isAvailable() && this.stars) {
      this.nebulaRenderer.updateDensityMap(
        this.stars,
        this._galaxyParams.galaxyRadius || 350
      );
    }
  }

  _buildInfoPanel() {
    const { panel, statsText, updateStats } = createInfoPanel(this);
    this.infoPanel = panel;
    this.statsText = statsText;
    this._updateStatsText = () => {
      const preset = GALAXY_PRESETS[this._activePreset];
      const count = this._galaxyParams.starCount || preset?.starCount || 3000;
      statsText.text = `${preset?.label || "Galaxy"} | ${count} stars`;
    };
    this.pipeline.add(this.infoPanel);
  }

  _buildUI() {
    const { panel, controls, paramsSection, structureSection } = createControlPanel(this, {
      onPresetChange: (key) => this._onPresetChange(key),
      regenerate: () => this._regenerate(),
      galaxyParams: this._galaxyParams,
      activePreset: this._activePreset,
      camera: this.camera,
      getUpdatingSliders: () => this._updatingSliders,
      onParamChange: () => this._regenerate(),
    });

    this.panel = panel;
    this._controls = controls;
    this._paramsSection = paramsSection;

    this._controls.preset.close?.();
    this._paramSliders = buildParamSliders(
      this,
      this.panel,
      this._paramsSection,
      this._activePreset,
      this._galaxyParams,
      {
        getUpdatingSliders: () => this._updatingSliders,
        onParamChange: () => this._regenerate(),
      }
    );

    this.panel.interactive = true;
    this.pipeline.add(this.panel);
  }

  _buildToggleButton() {
    this._toggleBtn = createToggleButton(this, {
      onToggle: () => this._togglePanel(),
    });
    this.pipeline.add(this._toggleBtn);
  }

  _togglePanel() {
    this.panel.visible = !this.panel.visible;
    this.panel.interactive = this.panel.visible;
  }

  _onPresetChange(key) {
    const preset = GALAXY_PRESETS[key];
    if (!preset) return;

    this._controls.preset.close?.();
    this._activePreset = key;
    this._galaxyParams = { ...preset };

    this._paramSliders = buildParamSliders(
      this,
      this.panel,
      this._paramsSection,
      key,
      this._galaxyParams,
      {
        getUpdatingSliders: () => this._updatingSliders,
        onParamChange: () => this._regenerate(),
      }
    );

    this._regenerate();
    this._updateStatsText();
  }

  update(dt) {
    super.update(dt);

    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoom.easing;

    // if (this.camera.rotationX > CONFIG.camera.maxTilt) {
    //   this.camera.rotationX = CONFIG.camera.maxTilt;
    // }
    // if (this.camera.rotationX < -CONFIG.camera.maxTilt) {
    //   this.camera.rotationX = -CONFIG.camera.maxTilt;
    // }

    this.camera.update(dt);

    if (this.paused) return;

    this.time += dt;
    this.galaxyRotation += dt * 0.02;

    for (const star of this.stars) {
      star.angle += star.rotationSpeed * dt;
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);

    this._drawGalacticHaze(ctx, cx, cy);
    this._drawNebula(ctx, cx, cy);
    this._drawStars(ctx, cx, cy);
    this._drawBlackHole(ctx, cx, cy);

    this._updateStatsText();
    this.pipeline.render();
  }

  _drawGalacticHaze(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x * this.zoom;
    const screenY = cy + p.y * this.zoom;

    const hazeRadius = (this._galaxyParams.galaxyRadius || 350) * p.scale * this.zoom * 0.4;

    ctx.save();
    ctx.translate(screenX, screenY);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, hazeRadius);
    gradient.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue}, 70%, 50%, 0.1)`);
    gradient.addColorStop(0.2, `hsla(${CONFIG.visual.armHue}, 50%, 40%, 0.06)`);
    gradient.addColorStop(0.5, `hsla(${CONFIG.visual.armHue}, 40%, 30%, 0.03)`);
    gradient.addColorStop(1, "transparent");

    ctx.beginPath();
    ctx.arc(0, 0, hazeRadius, 0, TAU);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  _drawNebula(ctx, cx, cy) {
    if (!CONFIG.nebula.enabled) return;

    if (this.nebulaRenderer && this.nebulaRenderer.isAvailable()) {
      const p = this.camera.project(0, 0, 0);
      const screenX = cx + p.x * this.zoom;
      const screenY = cy + p.y * this.zoom;

      // Render fullscreen — the shader does its own inverse perspective
      // projection matching Camera3D exactly, so no ctx.scale needed
      this.nebulaRenderer.resize(this.width, this.height);
      this.nebulaRenderer.render({
        time: this.time,
        centerX: screenX,
        centerY: screenY,
        perspective: CONFIG.camera.perspective,
        sinTilt: Math.sin(this.camera.rotationX),
        cosTilt: Math.cos(this.camera.rotationX),
        sinRotY: Math.sin(this.camera.rotationY),
        cosRotY: Math.cos(this.camera.rotationY),
        galaxyRadius: this._galaxyParams.galaxyRadius || 350,
        zoom: this.zoom,
        seed: this._nebulaSeed,
        galaxyRotation: this.galaxyRotation,
        axisRatio: this._galaxyParams.axisRatio ?? 1.0,
      });

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      this.nebulaRenderer.compositeOnto(ctx, 0, 0);
      ctx.restore();
    } else {
      this._drawNebulaGlow(ctx, cx, cy);
    }
  }

  _drawNebulaGlow(ctx, cx, cy) {
    const armPoints = this.stars._armPoints;
    if (!armPoints || armPoints.length === 0) return;

    const v = CONFIG.visual;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let a = 0; a < armPoints.length; a++) {
        const samples = armPoints[a];
        for (const sample of samples) {
            // Rotate arm sample point with galaxy
            const angle = sample.angle + this.galaxyRotation;
            const rx = Math.cos(angle) * sample.r;
            const rz = Math.sin(angle) * sample.r;

            const p = this.camera.project(rx, 0, rz);
            if (p.scale < 0.05) continue;

            const sx = cx + p.x * this.zoom;
            const sy = cy + p.y * this.zoom;
            const radius = v.nebulaGlowRadius * p.scale * this.zoom;

            const hue = sample.hue;
            const alpha = v.nebulaGlowAlpha * Math.min(1, p.scale * this.zoom);

            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
            gradient.addColorStop(0, `hsla(${hue}, 60%, 50%, ${alpha})`);
            gradient.addColorStop(0.4, `hsla(${hue}, 50%, 40%, ${alpha * 0.5})`);
            gradient.addColorStop(1, "transparent");

            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, TAU);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    ctx.restore();
  }

  _drawStars(ctx, cx, cy) {
    if (!this.glRenderer || !this.glRenderer.isAvailable()) {
      this._drawStarsCanvas2D(ctx, cx, cy);
      return;
    }

    this.glRenderer.resize(this.width, this.height);
    this.glRenderer.clear();

    const projected = [];

    for (const star of this.stars) {
      const x = Math.cos(star.angle) * star.radius;
      const z = Math.sin(star.angle) * star.radius;

      const p = this.camera.project(x, star.y, z);
      if (p.scale < 0.02) continue;

      const screenX = cx + p.x * this.zoom;
      const screenY = cy + p.y * this.zoom;
      const scale = p.scale * this.zoom;

      const twinkle = star.layer === "dust" ? 1.0 :
        0.7 + 0.3 * Math.sin(this.time * 2.5 + star.twinklePhase);
      const baseAlpha = star.layer === "dust"
        ? Math.max(0.3, star.alpha || star.brightness)
        : (star.alpha || star.brightness);
      const alpha = Math.max(0.15, baseAlpha * twinkle * Math.min(1, scale * 1.5));
      const size = Math.max(1.5, star.size * scale * 1.8);

      // Convert hue to RGB
      const lightness = 50 + star.brightness * 40;
      const saturation = star.layer === "dust" ? 40 : 60;
      const [r, g, b] = Painter.colors.hslToRgb(star.hue, saturation, lightness);

      projected.push({
        x: screenX,
        y: screenY,
        size,
        color: { r, g, b, a: alpha },
        depth: p.z,
      });
    }

    // Sort back-to-front
    projected.sort((a, b) => b.depth - a.depth);

    const count = this.glRenderer.updateParticles(projected);
    this.glRenderer.render(count);
    this.glRenderer.compositeOnto(ctx, 0, 0);
  }

  _drawStarsCanvas2D(ctx, cx, cy) {
    const projected = [];

    for (const star of this.stars) {
      const x = Math.cos(star.angle) * star.radius;
      const z = Math.sin(star.angle) * star.radius;

      const p = this.camera.project(x, star.y, z);
      projected.push({ star, p });
    }

    projected.sort((a, b) => a.p.z - b.p.z);

    for (const { star, p } of projected) {
      if (p.scale < 0.02) continue;

      const screenX = cx + p.x * this.zoom;
      const screenY = cy + p.y * this.zoom;

      const twinkle = star.layer === "dust" ? 1.0 :
          0.7 + 0.3 * Math.sin(this.time * 2.5 + star.twinklePhase);
      const alpha = (star.alpha || star.brightness) * twinkle * Math.min(1, p.scale * this.zoom * 1.5);

      const size = Math.max(0.4, star.size * p.scale * this.zoom);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${star.hue}, 60%, ${55 + star.brightness * 35}%)`;

      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, TAU);
      ctx.fill();

      if (size > 1.2 && star.brightness > 0.6) {
        ctx.globalAlpha = alpha * 0.25;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size * 2.5, 0, TAU);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  _drawBlackHole(ctx, cx, cy) {
    if (this.blackHoleRenderer && this.blackHoleRenderer.isAvailable()) {
      this._drawBlackHoleWebGL(ctx, cx, cy);
    } else {
      this._drawBlackHoleCanvas2D(ctx, cx, cy);
    }
    // this._drawJets(ctx, cx, cy);
  }

  _drawBlackHoleWebGL(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x * this.zoom;
    const screenY = cy + p.y * this.zoom;

    const regionSize = Math.max(
      1,
      Math.round(CONFIG.blackHole.shaderSize * p.scale * this.zoom * BLACK_HOLE_VISUAL_SCALE)
    );
    this.blackHoleRenderer.resize(regionSize);

    // Keep the accretion disk bounded by the galaxy core scale (bulge/bar/inner radius)
    // so the black hole remains small at full-galaxy view.
    const galaxyRadius = Math.max(1, this._galaxyParams.galaxyRadius || 350);
    const coreRadius = Math.max(
      this._galaxyParams.bulgeRadius || 0,
      (this._galaxyParams.spiralStart || 0) * 0.7,
      (this._galaxyParams.barWidth || 0) * 1.2,
      18
    );
    const coreRatio = coreRadius / galaxyRadius;
    const diskOuterLimit = Math.max(0.285, Math.min(0.53, 0.285 + coreRatio * 1.08));

    this.blackHoleRenderer.render({
      time: this.time,
      tiltX: this.camera.rotationX,
      rotY: this.camera.rotationY,
      diskOuterLimit,
    });

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    this.blackHoleRenderer.compositeOnto(ctx, screenX, screenY);
    ctx.restore();
  }

  _drawBlackHoleCanvas2D(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x * this.zoom;
    const screenY = cy + p.y * this.zoom;

    const diskRadius = CONFIG.blackHole.accretionDiskRadius * p.scale * this.zoom * BLACK_HOLE_VISUAL_SCALE;
    const holeRadius = CONFIG.blackHole.radius * p.scale * this.zoom * BLACK_HOLE_VISUAL_SCALE;
    const tilt = Math.cos(this.camera.rotationX);

    ctx.save();
    ctx.translate(screenX, screenY);

    ctx.globalCompositeOperation = "lighter";

    // Spherical glow around black hole (does NOT tilt with camera)
    const glowRadius = holeRadius * 3.5;
    const glowGradient = ctx.createRadialGradient(0, 0, holeRadius, 0, 0, glowRadius);
    glowGradient.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 30}, 100%, 80%, 0.7)`);
    glowGradient.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue + 10}, 90%, 60%, 0.3)`);
    glowGradient.addColorStop(0.7, `hsla(${CONFIG.blackHole.accretionHue}, 70%, 45%, 0.08)`);
    glowGradient.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, TAU);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    // Accretion disk (tilts with camera)
    const diskGradient = ctx.createRadialGradient(0, 0, holeRadius * 1.2, 0, 0, diskRadius);
    diskGradient.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 20}, 100%, 70%, 0.6)`);
    diskGradient.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 100%, 55%, 0.4)`);
    diskGradient.addColorStop(0.6, `hsla(${CONFIG.blackHole.accretionHue - 15}, 80%, 40%, 0.15)`);
    diskGradient.addColorStop(1, "transparent");

    ctx.scale(1, Math.max(0.1, Math.abs(tilt)));
    ctx.beginPath();
    ctx.arc(0, 0, diskRadius, 0, TAU);
    ctx.fillStyle = diskGradient;
    ctx.fill();

    ctx.restore();

    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(screenX, screenY);

    ctx.beginPath();
    ctx.arc(0, 0, holeRadius, 0, TAU);
    ctx.fillStyle = "#000";
    ctx.fill();

    ctx.strokeStyle = `hsla(${CONFIG.blackHole.accretionHue + 10}, 100%, 75%, 0.8)`;
    ctx.lineWidth = 2 * p.scale * this.zoom;
    ctx.stroke();

    ctx.restore();

    ctx.globalCompositeOperation = "lighter";
    ctx.save();
    ctx.translate(screenX, screenY);

    const lensRing = ctx.createRadialGradient(0, 0, holeRadius * 0.9, 0, 0, holeRadius * 1.5);
    lensRing.addColorStop(0, "transparent");
    lensRing.addColorStop(0.5, `hsla(${CONFIG.blackHole.accretionHue}, 100%, 80%, 0.5)`);
    lensRing.addColorStop(1, "transparent");

    ctx.beginPath();
    ctx.arc(0, 0, holeRadius * 1.5, 0, TAU);
    ctx.fillStyle = lensRing;
    ctx.fill();

    ctx.restore();

    ctx.globalCompositeOperation = "source-over";
  }

  _drawJets(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x * this.zoom;
    const screenY = cy + p.y * this.zoom;

    const jetLen = CONFIG.blackHole.jetLength * p.scale * this.zoom;
    const jetW = CONFIG.blackHole.jetWidth * p.scale * this.zoom;
    const jetAlpha = CONFIG.blackHole.jetAlpha;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.globalCompositeOperation = "lighter";

    // Top jet
    const topGrad = ctx.createLinearGradient(0, 0, 0, -jetLen);
    topGrad.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 10}, 100%, 80%, ${jetAlpha})`);
    topGrad.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 80%, 60%, ${jetAlpha * 0.5})`);
    topGrad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.moveTo(-jetW, 0);
    ctx.lineTo(0, -jetLen);
    ctx.lineTo(jetW, 0);
    ctx.closePath();
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Bottom jet
    const botGrad = ctx.createLinearGradient(0, 0, 0, jetLen);
    botGrad.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 10}, 100%, 80%, ${jetAlpha})`);
    botGrad.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 80%, 60%, ${jetAlpha * 0.5})`);
    botGrad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.moveTo(-jetW, 0);
    ctx.lineTo(0, jetLen);
    ctx.lineTo(jetW, 0);
    ctx.closePath();
    ctx.fillStyle = botGrad;
    ctx.fill();

    ctx.restore();

    ctx.globalCompositeOperation = "source-over";
  }

  onResize() {
    if (this.glRenderer) {
      this.glRenderer.resize(this.width, this.height);
    }
    if (this.nebulaRenderer) {
      this.nebulaRenderer.resize(this.width, this.height);
    }
    if (this.blackHoleRenderer) {
      this.blackHoleRenderer.resize(CONFIG.blackHole.shaderSize);
    }

    if (this.panel) {
      layoutPanel(this.panel, this.width, this.height);
    }

    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }
  }
}

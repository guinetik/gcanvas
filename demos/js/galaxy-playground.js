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

const TAU = Math.PI * 2;

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
    this._buildInfoPanel();
    this._buildUI();
    this._buildToggleButton();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    this.canvas.addEventListener("click", () => {
      if (!this.camera._isDragging) {
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

  _regenerate() {
    this._initStars();
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

    if (this.camera.rotationX > CONFIG.camera.maxTilt) {
      this.camera.rotationX = CONFIG.camera.maxTilt;
    }
    if (this.camera.rotationX < -CONFIG.camera.maxTilt) {
      this.camera.rotationX = -CONFIG.camera.maxTilt;
    }

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
    this._drawStars(ctx, cx, cy);
    this._drawBlackHole(ctx, cx, cy);

    this._updateStatsText();
    this.pipeline.render();
  }

  _drawGalacticHaze(ctx, cx, cy) {
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x * this.zoom;
    const screenY = cy + p.y * this.zoom;

    const tilt = Math.cos(this.camera.rotationX);
    const hazeRadius = (this._galaxyParams.galaxyRadius || 350) * p.scale * this.zoom * 0.9;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(1, Math.max(0.15, Math.abs(tilt)));

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

  _drawStars(ctx, cx, cy) {
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

      const twinkle = 0.7 + 0.3 * Math.sin(this.time * 2.5 + star.twinklePhase);
      const alpha = star.brightness * twinkle * Math.min(1, p.scale * this.zoom * 1.5);

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
    const p = this.camera.project(0, 0, 0);
    const screenX = cx + p.x * this.zoom;
    const screenY = cy + p.y * this.zoom;

    const diskRadius = CONFIG.blackHole.accretionDiskRadius * p.scale * this.zoom;
    const holeRadius = CONFIG.blackHole.radius * p.scale * this.zoom;
    const tilt = Math.cos(this.camera.rotationX);

    ctx.save();
    ctx.translate(screenX, screenY);

    ctx.globalCompositeOperation = "lighter";

    const diskGradient = ctx.createRadialGradient(0, 0, holeRadius, 0, 0, diskRadius);
    diskGradient.addColorStop(0, `hsla(${CONFIG.blackHole.accretionHue + 20}, 100%, 70%, 0.9)`);
    diskGradient.addColorStop(0.3, `hsla(${CONFIG.blackHole.accretionHue}, 100%, 60%, 0.6)`);
    diskGradient.addColorStop(0.6, `hsla(${CONFIG.blackHole.accretionHue - 10}, 90%, 50%, 0.3)`);
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
    ctx.scale(1, Math.max(0.3, Math.abs(tilt)));

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
    ctx.scale(1, Math.max(0.3, Math.abs(tilt)));

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

  onResize() {
    if (this.panel) {
      layoutPanel(this.panel, this.width, this.height);
    }

    if (this._toggleBtn) {
      this._toggleBtn.visible = Screen.isMobile;
      this._toggleBtn.interactive = Screen.isMobile;
    }
  }
}

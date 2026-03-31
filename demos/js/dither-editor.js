/**
 * Dither Editor Demo
 *
 * Image loading, real-time adjustments, comprehensive dithering algorithms,
 * zoom/pan, compare toggle, and PNG export.
 */
import {
  Game,
  Painter,
  Screen,
  Dither,
  AccordionGroup,
  Slider,
  Dropdown,
  Button,
  ToggleButton,
  setTheme,
  adjustContrast,
  adjustHighlights,
  adjustShadows,
  adjustGamma,
  addGrain,
  desaturate,
  scalePixels,
  Camera3D,
} from "../../src/index.js";
import { WebGLParticleRenderer } from "../../src/webgl/webgl-particle-renderer.js";

const CONFIG = {
  panel: {
    width: 280,
    padding: 14,
    spacing: 10,
    marginRight: 16,
    marginTop: 16,
    headerHeight: 28,
  },
  zoom: {
    min: 0.1,
    max: 10,
    speed: 0.3,
    easing: 0.15,
  },
  defaults: {
    contrast: 0,
    highlights: 0,
    shadows: 0,
    gamma: 1.0,
    grain: 0,
    algorithm: "floyd-steinberg",
    pixelSize: 1,
  },
  algorithms: [
    { label: "None", value: "none" },
    { label: "Floyd-Steinberg", value: "floyd-steinberg" },
    { label: "Bayer 8x8", value: "bayer" },
    { label: "Blue Noise", value: "blue-noise" },
    { label: "Stucki", value: "stucki" },
    { label: "Atkinson", value: "atkinson" },
    { label: "Jarvis", value: "jarvis" },
    { label: "Sierra", value: "sierra" },
    { label: "Sierra Two-Row", value: "sierra-two-row" },
    { label: "Sierra Lite", value: "sierra-lite" },
    { label: "Burkes", value: "burkes" },
    { label: "Stipple", value: "stipple" },
  ],
  debounceMs: 50,
  freePixels: {
    particleSize: 2,
    springStrength: 8.0,
    springDamping: 0.88,
    repulsionRadius: 120,
    repulsionStrength: 1200,
    perspective: 600,
    friction: 0.95,
    maxParticles: 80000,
  },
};

export class DitherEditor extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
    setTheme("monochrome");
  }

  init() {
    super.init();
    Screen.init(this);

    // State
    this._sourceImage = null;
    this._processedImage = null;
    this._comparing = false;
    this._zoom = 1;
    this._targetZoom = 1;
    this._panX = 0;
    this._panY = 0;
    this._settings = { ...CONFIG.defaults };
    this._controls = {};
    this._debounceTimer = null;
    this._dirty = true;
    this._imgCanvas = null;

    // Free pixels state
    this._freePixelsActive = false;
    this._particles = null;
    this._glRenderer = null;
    this._camera = null;
    this._mouseX = 0;
    this._mouseY = 0;

    this._setupGesture();
    this._setupDragDrop();
    this._buildUI();
    this._generateDefaultImage();
  }

  _setupGesture() {
    // Wheel zoom — only when UI didn't consume the input
    this.canvas.addEventListener("wheel", (e) => {
      if (this._uiHandledInput) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -CONFIG.zoom.speed : CONFIG.zoom.speed;
      this._targetZoom *= 1 + delta;
      this._targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this._targetZoom));
    }, { passive: false });

    // Pan via drag — use game.events so we run AFTER pipeline sets _uiHandledInput
    this._draggingCanvas = false;
    this._lastDragX = 0;
    this._lastDragY = 0;

    this.events.on("inputdown", (e) => {
      if (this._uiHandledInput) return;
      this._draggingCanvas = true;
      this._lastDragX = e.x;
      this._lastDragY = e.y;
    });

    this.events.on("inputmove", (e) => {
      if (!this._draggingCanvas) return;
      const dx = e.x - this._lastDragX;
      const dy = e.y - this._lastDragY;
      this._lastDragX = e.x;
      this._lastDragY = e.y;
      // Only pan if zoomed image exceeds canvas
      if (this._sourceImage) {
        const dw = this._sourceImage.width * this._zoom;
        const dh = this._sourceImage.height * this._zoom;
        if (dw > this.width || dh > this.height) {
          this._panX += dx;
          this._panY += dy;
        }
      }
    });

    this.events.on("inputup", () => {
      this._draggingCanvas = false;
    });
  }

  _setupDragDrop() {
    this.canvas.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });
    this.canvas.addEventListener("drop", (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        this._loadFile(file);
      }
    });
  }

  _loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const oc = document.createElement("canvas");
        oc.width = img.width;
        oc.height = img.height;
        const octx = oc.getContext("2d");
        octx.drawImage(img, 0, 0);
        this._sourceImage = octx.getImageData(0, 0, img.width, img.height);
        this._zoom = 1;
        this._targetZoom = 1;
        this._panX = 0;
        this._panY = 0;
        this._dirty = true;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  _openFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      if (input.files[0]) this._loadFile(input.files[0]);
    };
    input.click();
  }

  _generateDefaultImage() {
    const sz = 256;
    const source = Dither.generateSource(sz, sz, 0);
    const data = new Uint8ClampedArray(sz * sz * 4);
    for (let i = 0; i < source.length; i++) {
      const v = Math.round(source[i] * 255);
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    this._sourceImage = { data, width: sz, height: sz };
    this._dirty = true;
  }

  _buildUI() {
    const panelWidth = Screen.responsive(220, 250, CONFIG.panel.width);
    const padding = Screen.responsive(10, 12, CONFIG.panel.padding);

    this.panel = new AccordionGroup(this, {
      width: panelWidth,
      padding,
      spacing: CONFIG.panel.spacing,
      headerHeight: CONFIG.panel.headerHeight,
    });
    this.panel.interactive = true;
    this.pipeline.add(this.panel);

    // --- Image section ---
    const imageSection = this.panel.addSection("Image", { expanded: true });
    this._controls.loadBtn = new Button(this, {
      text: "Load Image",
      width: panelWidth - padding * 2,
      height: 36,
      onClick: () => this._openFilePicker(),
    });
    imageSection.addItem(this._controls.loadBtn);
    this.panel.commitSection(imageSection);

    // --- Adjustments section ---
    const adjSection = this.panel.addSection("Adjustments", { expanded: true });
    const sliderW = panelWidth - padding * 2;

    this._controls.contrast = new Slider(this, {
      label: "Contrast",
      min: -100, max: 100, value: 0, step: 1,
      width: sliderW,
      onChange: (v) => { this._settings.contrast = v / 100; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.contrast);

    this._controls.highlights = new Slider(this, {
      label: "Highlights",
      min: -100, max: 100, value: 0, step: 1,
      width: sliderW,
      onChange: (v) => { this._settings.highlights = v / 100; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.highlights);

    this._controls.shadows = new Slider(this, {
      label: "Shadows",
      min: -100, max: 100, value: 0, step: 1,
      width: sliderW,
      onChange: (v) => { this._settings.shadows = v / 100; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.shadows);

    this._controls.gamma = new Slider(this, {
      label: "Gamma",
      min: 0.1, max: 3.0, value: 1.0, step: 0.05,
      width: sliderW,
      formatValue: (v) => v.toFixed(2),
      onChange: (v) => { this._settings.gamma = v; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.gamma);

    this._controls.grain = new Slider(this, {
      label: "Grain",
      min: 0, max: 100, value: 0, step: 1,
      width: sliderW,
      onChange: (v) => { this._settings.grain = v; this._scheduleProcess(); },
    });
    adjSection.addItem(this._controls.grain);

    this.panel.commitSection(adjSection);

    // --- Dither section ---
    const ditherSection = this.panel.addSection("Dither", { expanded: true });

    this._controls.algorithm = new Dropdown(this, {
      label: "Algorithm",
      options: CONFIG.algorithms.map((a) => a.label),
      value: "Floyd-Steinberg",
      width: sliderW,
      onChange: (v) => {
        const alg = CONFIG.algorithms.find((a) => a.label === v);
        this._settings.algorithm = alg ? alg.value : "none";
        this._scheduleProcess();
      },
    });
    ditherSection.addItem(this._controls.algorithm);

    this._controls.pixelSize = new Slider(this, {
      label: "Pixel Size",
      min: 1, max: 16, value: 1, step: 1,
      width: sliderW,
      onChange: (v) => { this._settings.pixelSize = v; this._scheduleProcess(); },
    });
    ditherSection.addItem(this._controls.pixelSize);

    this.panel.commitSection(ditherSection);

    // --- Output section ---
    const outputSection = this.panel.addSection("Output", { expanded: true });

    this._controls.compare = new ToggleButton(this, {
      text: "Compare",
      width: sliderW,
      height: 36,
      onToggle: (toggled) => {
        this._comparing = toggled;
      },
    });
    outputSection.addItem(this._controls.compare);

    this._controls.freePixels = new ToggleButton(this, {
      text: "Free Pixels",
      width: sliderW,
      height: 36,
      onToggle: (toggled) => this._toggleFreePixels(toggled),
    });
    outputSection.addItem(this._controls.freePixels);

    this._controls.export = new Button(this, {
      text: "Export PNG",
      width: sliderW,
      height: 36,
      onClick: () => this._exportPNG(),
    });
    outputSection.addItem(this._controls.export);

    this._controls.reset = new Button(this, {
      text: "Reset",
      width: sliderW,
      height: 36,
      onClick: () => this._resetControls(),
    });
    outputSection.addItem(this._controls.reset);

    this.panel.commitSection(outputSection);
    this.panel.layoutAll();
    this._positionPanel();
  }

  _positionPanel() {
    const m = CONFIG.panel;
    this.panel.x = this.width - this.panel.width - m.marginRight;
    this.panel.y = m.marginTop;
  }

  _scheduleProcess() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._dirty = true;
    }, CONFIG.debounceMs);
  }

  _processImage() {
    if (!this._sourceImage) return;
    const s = this._settings;
    let img = this._sourceImage;

    if (s.contrast !== 0) img = adjustContrast(img, s.contrast);
    if (s.highlights !== 0) img = adjustHighlights(img, s.highlights);
    if (s.shadows !== 0) img = adjustShadows(img, s.shadows);
    if (s.gamma !== 1.0) img = adjustGamma(img, s.gamma);
    if (s.grain > 0) img = addGrain(img, s.grain);
    if (s.pixelSize > 1) img = scalePixels(img, s.pixelSize);

    if (s.algorithm !== "none") {
      img = this._applyDither(img, s.algorithm);
    }

    this._processedImage = img;
    this._dirty = false;
  }

  _applyDither(img, algorithm) {
    const { width, height } = img;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      gray[i] = (img.data[idx] * 0.299 + img.data[idx + 1] * 0.587 + img.data[idx + 2] * 0.114) / 255;
    }

    let rgba;
    switch (algorithm) {
      case "floyd-steinberg": rgba = Dither.floydSteinberg(gray, width, height); break;
      case "bayer": rgba = Dither.bayer(gray, width, height); break;
      case "blue-noise": rgba = Dither.blueNoise(gray, width, height); break;
      case "stucki": rgba = Dither.stucki(gray, width, height); break;
      case "atkinson": rgba = Dither.atkinson(gray, width, height); break;
      case "jarvis": rgba = Dither.jarvis(gray, width, height); break;
      case "sierra": rgba = Dither.sierra(gray, width, height); break;
      case "sierra-two-row": rgba = Dither.sierraTwoRow(gray, width, height); break;
      case "sierra-lite": rgba = Dither.sierraLite(gray, width, height); break;
      case "burkes": rgba = Dither.burkes(gray, width, height); break;
      case "stipple": rgba = Dither.stipple(gray, width, height); break;
      default: return img;
    }

    return { data: rgba, width, height };
  }

  // ─── Free Pixels ─────────────────────────────────────────────

  _toggleFreePixels(active) {
    this._freePixelsActive = active;
    if (active) {
      this._initFreePixels();
    } else {
      this._destroyFreePixels();
    }
  }

  _initFreePixels() {
    const img = this._processedImage || this._sourceImage;
    if (!img) return;

    const cfg = CONFIG.freePixels;
    const ps = Math.max(1, this._settings.pixelSize);
    const cols = Math.ceil(img.width / ps);
    const rows = Math.ceil(img.height / ps);
    const count = Math.min(cols * rows, cfg.maxParticles);

    // Build particles from image pixels
    this._particles = [];
    const halfW = (cols * ps) / 2;
    const halfH = (rows * ps) / 2;

    for (let row = 0; row < rows && this._particles.length < count; row++) {
      for (let col = 0; col < cols && this._particles.length < count; col++) {
        const sx = col * ps;
        const sy = row * ps;
        const idx = (sy * img.width + sx) * 4;
        const r = img.data[idx];
        const g = img.data[idx + 1];
        const b = img.data[idx + 2];

        // Skip near-black pixels
        if (r + g + b < 15) continue;

        this._particles.push({
          // Home position (centered at origin for 3D rotation)
          homeX: sx - halfW,
          homeY: sy - halfH,
          homeZ: 0,
          // Current position
          x: sx - halfW,
          y: sy - halfH,
          z: 0,
          // Velocity
          vx: 0, vy: 0, vz: 0,
          // Color
          r, g, b,
          size: Math.max(1, ps * 0.8),
        });
      }
    }

    // WebGL renderer
    if (!this._glRenderer) {
      this._glRenderer = new WebGLParticleRenderer(cfg.maxParticles, {
        width: this.width,
        height: this.height,
        shape: "square",
        blendMode: "alpha",
      });
    } else {
      this._glRenderer.resize(this.width, this.height);
    }

    // Camera for 3D rotation
    this._camera = new Camera3D({
      perspective: cfg.perspective,
      inertia: true,
      friction: cfg.friction,
    });
    this._camera.enableMouseControl(this.canvas, {
      game: this,
      isOverPanel: (x, y) => {
        if (!this.panel) return false;
        const px = this.panel.x;
        const py = this.panel.y;
        return x >= px && x <= px + this.panel.width && y >= py && y <= py + (this.panel.height || 600);
      },
    });

    // Track mouse for repulsion
    this.canvas.addEventListener("mousemove", this._onFreePixelsMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this._mouseX = e.clientX - rect.left;
      this._mouseY = e.clientY - rect.top;
    });
  }

  _destroyFreePixels() {
    this._particles = null;
    if (this._camera) {
      this._camera.disableMouseControl();
      this._camera = null;
    }
    if (this._onFreePixelsMouseMove) {
      this.canvas.removeEventListener("mousemove", this._onFreePixelsMouseMove);
      this._onFreePixelsMouseMove = null;
    }
  }

  _updateFreePixels(dt) {
    if (!this._particles || !this._camera) return;
    const cfg = CONFIG.freePixels;

    this._camera.update(dt);

    // Project mouse into 3D space (approximate: use center of canvas as origin)
    const cx = this.width / 2;
    const cy = this.height / 2;
    const mx = this._mouseX - cx;
    const my = this._mouseY - cy;

    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];

      // Spring force toward home position
      const dx = p.homeX - p.x;
      const dy = p.homeY - p.y;
      const dz = p.homeZ - p.z;
      p.vx += dx * cfg.springStrength * dt;
      p.vy += dy * cfg.springStrength * dt;
      p.vz += dz * cfg.springStrength * dt;

      // Mouse repulsion (in projected screen space, zoom-adjusted)
      const zoom = this._zoom;
      const proj = this._camera.project(p.x, p.y, p.z);
      const screenX = cx + proj.x * zoom;
      const screenY = cy + proj.y * zoom;
      const rdx = screenX - this._mouseX;
      const rdy = screenY - this._mouseY;
      const distSq = rdx * rdx + rdy * rdy;
      const radius = cfg.repulsionRadius;

      if (distSq < radius * radius && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / radius) * cfg.repulsionStrength * dt;
        // Push in 3D along the screen-space direction
        const nx = rdx / dist;
        const ny = rdy / dist;
        p.vx += nx * force;
        p.vy += ny * force;
        p.vz += (Math.random() - 0.5) * force * 0.5;
      }

      // Damping
      p.vx *= cfg.springDamping;
      p.vy *= cfg.springDamping;
      p.vz *= cfg.springDamping;

      // Integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
    }
  }

  _renderFreePixels() {
    if (!this._particles || !this._camera || !this._glRenderer) return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const zoom = this._zoom;

    // Project particles and feed to WebGL renderer
    const projected = [];
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      const proj = this._camera.project(p.x, p.y, p.z);
      if (proj.scale <= 0) continue;
      projected.push({
        x: cx + proj.x * zoom,
        y: cy + proj.y * zoom,
        size: p.size * proj.scale * zoom,
        color: { r: p.r, g: p.g, b: p.b, a: Math.min(1, proj.scale) },
      });
    }

    this._glRenderer.clear();
    const count = this._glRenderer.updateParticles(projected);
    this._glRenderer.render(count);
    this._glRenderer.compositeOnto(Painter.ctx, 0, 0, this.width, this.height);
  }

  _exportPNG() {
    const img = this._processedImage || this._sourceImage;
    if (!img) return;
    const oc = document.createElement("canvas");
    oc.width = img.width;
    oc.height = img.height;
    const octx = oc.getContext("2d");
    const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);
    octx.putImageData(imageData, 0, 0);
    oc.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dither-export.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  _resetControls() {
    this._settings = { ...CONFIG.defaults };
    this._controls.contrast.value = 0;
    this._controls.highlights.value = 0;
    this._controls.shadows.value = 0;
    this._controls.gamma.value = 1.0;
    this._controls.grain.value = 0;
    this._controls.pixelSize.value = 1;
    this._controls.algorithm.value = "Floyd-Steinberg";
    if (this._controls.compare.toggled) {
      this._controls.compare.toggle(false);
    }
    this._dirty = true;
  }

  update(dt) {
    super.update(dt);

    this._zoom += (this._targetZoom - this._zoom) * CONFIG.zoom.easing;

    if (this._freePixelsActive) {
      this._updateFreePixels(dt);
    } else {
      // Center image when it fits within the canvas
      if (this._sourceImage) {
        const dw = this._sourceImage.width * this._zoom;
        const dh = this._sourceImage.height * this._zoom;
        if (dw <= this.width) this._panX = 0;
        if (dh <= this.height) this._panY = 0;
      }
    }

    if (this._dirty) {
      this._processImage();
    }
  }

  render() {
    super.render();

    if (this._freePixelsActive) {
      this._renderFreePixels();
      return;
    }

    const img = this._comparing ? this._sourceImage : this._processedImage;
    if (!img) return;

    const imageData = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height);

    if (!this._imgCanvas || this._imgCanvas.width !== img.width || this._imgCanvas.height !== img.height) {
      this._imgCanvas = document.createElement("canvas");
      this._imgCanvas.width = img.width;
      this._imgCanvas.height = img.height;
    }
    this._imgCanvas.getContext("2d").putImageData(imageData, 0, 0);

    const ctx = Painter.ctx;
    const cx = this.width / 2 + this._panX;
    const cy = this.height / 2 + this._panY;
    const dw = img.width * this._zoom;
    const dh = img.height * this._zoom;

    Painter.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this._imgCanvas, cx - dw / 2, cy - dh / 2, dw, dh);
    Painter.restore();
  }

  onResize() {
    if (this.panel) this._positionPanel();
    if (this._glRenderer) this._glRenderer.resize(this.width, this.height);
  }
}

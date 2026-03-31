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
} from "../../src/index.js";

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

    this._setupGesture();
    this._setupDragDrop();
    this._buildUI();
    this._generateDefaultImage();
  }

  _setupGesture() {
    // Wheel zoom — only when UI didn't handle the area
    this.canvas.addEventListener("wheel", (e) => {
      if (this._uiHandledInput) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -CONFIG.zoom.speed : CONFIG.zoom.speed;
      this._targetZoom *= 1 + delta;
      this._targetZoom = Math.max(CONFIG.zoom.min, Math.min(CONFIG.zoom.max, this._targetZoom));
    }, { passive: false });

    // Pan via drag — only when UI didn't handle the mousedown
    let dragging = false;
    let lastX = 0, lastY = 0;

    this.canvas.addEventListener("mousedown", (e) => {
      // Let the Game's input system process first (it runs synchronously)
      // _uiHandledInput is set by pipeline.dispatchInputEvent
      requestAnimationFrame(() => {
        if (this._uiHandledInput) return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      });
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
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

    window.addEventListener("mouseup", () => {
      dragging = false;
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
    this.pipeline.add(this.panel);
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
    if (this._dirty) {
      this._processImage();
    }
  }

  render() {
    super.render();
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
  }
}

/**
 * Etch — Barnsley Fern × Stipple
 *
 * The Barnsley fern is four affine transforms and a random number
 * generator. It shouldn't produce anything recognizable, but it
 * grows a fern. A real fern.
 *
 * This demo accumulates the IFS into a density map, then renders
 * it through stipple dithering — dot placement weighted by
 * brightness. The result is pointillism. Seurat painting a leaf.
 *
 * The fern breathes. Its parameters drift slowly, bending the
 * fronds, curling the stem. Each frame re-rolls the stipple dots,
 * so the texture shimmers like light through foliage.
 *
 * Click to regrow with new parameters. Space to freeze.
 */

import { Game, ImageGo, Painter } from "/gcanvas.es.min.js";
import { Dither } from "/gcanvas.es.min.js";

const CONFIG = {
  resolution: 420,
  iterations: 180000,

  // Stipple settings — high dot ratio for rich texture
  stipple: {
    numDotsRatio: 0.12,
    seed: 1,
  },

  // How much the fern parameters drift
  drift: {
    speed: 0.15,          // base oscillation speed
    stemCurl: 0.04,       // how much the stem angle varies
    leafSpread: 0.03,     // how much leaf angle opens/closes
    asymmetry: 0.02,      // left-right imbalance
  },

  // Density map processing
  density: {
    gamma: 0.45,          // < 1 opens up the darks
    blur: true,           // soft glow around dense areas
  },

  hud: {
    font: "11px monospace",
    color: "rgba(255,255,255,0.5)",
    pad: 14,
  },
};

class EtchDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();
  }

  init() {
    super.init();

    this.res = CONFIG.resolution;
    this.time = 0;
    this.paused = false;
    this.seed = 1;

    // Density accumulation buffer (float, unnormalized)
    this.density = new Float32Array(this.res * this.res);
    // Normalized source for dither (0-1)
    this.source = new Float32Array(this.res * this.res);
    // Output
    this.imageData = Painter.img.createImageData(this.res, this.res);

    // Display
    this.display = new ImageGo(this, this.imageData, {
      x: 0, y: 0,
      width: this.width, height: this.height,
      anchor: "top-left",
    });
    this.pipeline.add(this.display);

    // Controls
    this.canvas.addEventListener("click", () => {
      this.seed = Math.floor(Math.random() * 10000);
      this.computeFrame(this.time);
    });
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        this.paused = !this.paused;
      }
    });

    this.computeFrame(0);
  }

  /**
   * Build the Barnsley fern with drifting parameters.
   *
   * The classic fern uses four affine transforms with fixed
   * coefficients. Here we let them breathe — the stem curls,
   * the leaves open and close, and left/right asymmetry shifts.
   * The result is a fern that sways like it's alive.
   */
  generateFern(t) {
    const w = this.res;
    const h = this.res;
    const { iterations } = CONFIG;
    const { speed, stemCurl, leafSpread, asymmetry } = CONFIG.drift;

    // Slowly varying offsets
    const curl = Math.sin(t * speed) * stemCurl;
    const spread = Math.sin(t * speed * 0.7 + 1.2) * leafSpread;
    const asym = Math.sin(t * speed * 0.4 + 2.5) * asymmetry;

    // Clear density buffer
    this.density.fill(0);

    let x = 0, y = 0;
    const scale = Math.min(w, h) / 10.5;
    const ox = w / 2;
    const oy = h;

    for (let i = 0; i < iterations; i++) {
      const r = Math.random();
      let nx, ny;

      if (r < 0.01) {
        // Stem
        nx = 0;
        ny = 0.16 * y;
      } else if (r < 0.86) {
        // Main leaf (large copy)
        nx = (0.85 + curl) * x + (0.04 + asym) * y;
        ny = (-0.04 - asym) * x + (0.85 - curl) * y + 1.6;
      } else if (r < 0.93) {
        // Right leaf
        nx = (0.2 - spread) * x - (0.26 + spread) * y;
        ny = (0.23 + spread) * x + (0.22 - spread) * y + 1.6;
      } else {
        // Left leaf
        nx = (-0.15 + spread) * x + (0.28 - spread) * y;
        ny = (0.26 - spread) * x + (0.24 + spread) * y + 0.44;
      }

      x = nx;
      y = ny;

      // Map to pixel coordinates
      const px = Math.floor(x * scale + ox);
      const py = Math.floor(oy - y * scale);

      if (px >= 0 && px < w && py >= 0 && py < h) {
        this.density[py * w + px] += 1;
      }
    }
  }

  /**
   * Normalize the density buffer to 0-1 range with gamma correction,
   * then apply a simple 3x3 blur to soften the stipple input.
   */
  normalizeDensity() {
    const w = this.res;
    const h = this.res;
    const { gamma, blur } = CONFIG.density;

    // Find max density
    let maxD = 0;
    for (let i = 0; i < this.density.length; i++) {
      if (this.density[i] > maxD) maxD = this.density[i];
    }
    if (maxD === 0) maxD = 1;

    // Normalize + gamma
    const inv = 1 / maxD;
    for (let i = 0; i < this.density.length; i++) {
      this.source[i] = Math.pow(this.density[i] * inv, gamma);
    }

    // Optional 3x3 box blur — softens the stipple placement
    if (blur) {
      const tmp = new Float32Array(this.source.length);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          tmp[i] = (
            this.source[i - w - 1] + this.source[i - w] + this.source[i - w + 1] +
            this.source[i - 1]     + this.source[i] * 4 + this.source[i + 1] +
            this.source[i + w - 1] + this.source[i + w] + this.source[i + w + 1]
          ) / 12;
        }
      }
      this.source.set(tmp);
    }
  }

  computeFrame(t) {
    this.generateFern(t);
    this.normalizeDensity();

    // Stipple dither — each call re-rolls the dots
    const dithered = Dither.stipple(this.source, this.res, this.res, {
      numDotsRatio: CONFIG.stipple.numDotsRatio,
      seed: this.seed + Math.floor(t * 7),
    });

    this.imageData.data.set(dithered);
  }

  update(dt) {
    super.update(dt);

    if (!this.paused) {
      this.time += dt;
      this.computeFrame(this.time);
    }

    this.display.shape.bitmap = this.imageData;
    this.display.x = 0;
    this.display.y = 0;
    this.display.width = this.width;
    this.display.height = this.height;
  }

  render() {
    super.render();
    this.ctx.imageSmoothingEnabled = false;

    const ctx = this.ctx;
    const { font, color, pad } = CONFIG.hud;

    ctx.font = font;
    ctx.textBaseline = "bottom";
    ctx.fillStyle = color;
    ctx.fillText("click: regrow   space: freeze", pad, this.height - pad);
    ctx.textBaseline = "alphabetic";
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new EtchDemo(canvas);
  demo.start();
});

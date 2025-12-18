/**
 * Fractal Plasma - Generative Art Demo
 *
 * Animated plasma effect using Fractals.applyColorScheme()
 * for trippy color palettes. Fast single-image rendering.
 */

import { Game, ImageGo, Painter } from "/gcanvas.es.min.js";
import { Fractals } from "/gcanvas.es.min.js";

class PlasmaDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Render at moderate res for balance of quality and performance
    this.plasmaWidth = 512;
    this.plasmaHeight = 512;

    // Create plasma data buffer
    this.plasmaData = new Uint8Array(this.plasmaWidth * this.plasmaHeight);

    // Create ImageData for rendering
    this.imageData = Painter.img.createImageData(this.plasmaWidth, this.plasmaHeight);

    // Create ImageGo to display (fullscreen from top-left corner)
    this.plasmaImage = new ImageGo(this, this.imageData, {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      anchor: 'top-left',
    });
    this.pipeline.add(this.plasmaImage);

    // Animation state
    this.baseTime = 0;  // Steady clock
    this.time = 0;      // Modulated time for fluid speed
    this.colorSchemeIndex = 0;
    // Only use schemes that animate well with hueShift
    this.colorSchemes = ['electric', 'rainbow', 'historic', 'psychedelic', 'neon'];
    this.currentScheme = this.colorSchemes[0];
    this.schemeTime = 0;


    // HSL to RGB helper (needed for some color schemes)
    this.hslToRgb = (h, s, l) => {
      h /= 360;
      const a = s * Math.min(l, 1 - l);
      const f = (n) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      };
      return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
    };
  }

  update(dt) {
    super.update(dt);

    this.baseTime += dt;
    this.schemeTime += dt;

    // Fluid speed modulation - breathing effect (slow -> fast -> slow)
    // Speed varies from 0.3x to 1.7x in smooth waves
    const speedMod = 1 + Math.sin(this.baseTime * 0.4) * 0.7;
    this.time += dt * speedMod;

    // Cycle color schemes every 5 seconds
    if (this.schemeTime > 5) {
      this.schemeTime = 0;
      this.colorSchemeIndex = (this.colorSchemeIndex + 1) % this.colorSchemes.length;
      this.currentScheme = this.colorSchemes[this.colorSchemeIndex];
    }

    // Generate animated plasma
    this.generatePlasma();

    // Apply color scheme (use custom for trippy ones, library for others)
    if (this.currentScheme === 'psychedelic' || this.currentScheme === 'neon') {
      this.applyCustomScheme(this.currentScheme, this.time * 50);
    } else {
      Fractals.applyColorScheme(
        this.plasmaData,
        this.imageData,
        this.currentScheme,
        256,  // iterations (for normalization)
        this.time * 50,  // hue shift for animation
        this.hslToRgb
      );
    }

    // Update the image
    this.plasmaImage.shape.bitmap = this.imageData;

    // Scale to fit screen (fullscreen from top-left)
    this.plasmaImage.x = 0;
    this.plasmaImage.y = 0;
    this.plasmaImage.width = this.width;
    this.plasmaImage.height = this.height;
  }

  applyCustomScheme(scheme, hueShift) {
    const data = this.imageData.data;

    for (let i = 0; i < this.plasmaData.length; i++) {
      const v = this.plasmaData[i];
      const idx = i * 4;

      if (scheme === 'psychedelic') {
        // Multi-frequency color cycling for maximum trippy effect
        const h1 = (v * 2 + hueShift) % 360;
        const h2 = (v * 3 + hueShift * 1.5) % 360;
        const h3 = (v * 5 + hueShift * 0.7) % 360;

        // Blend multiple hues
        const [r1, g1, b1] = this.hslToRgb(h1, 1, 0.5);
        const [r2, g2, b2] = this.hslToRgb(h2, 0.8, 0.6);
        const [r3, g3, b3] = this.hslToRgb(h3, 0.9, 0.4);

        // Mix based on value bands
        const blend = Math.sin(v * 0.05 + hueShift * 0.01) * 0.5 + 0.5;
        data[idx] = Math.floor(r1 * blend + r2 * (1 - blend));
        data[idx + 1] = Math.floor(g1 * (1 - blend) + g3 * blend);
        data[idx + 2] = Math.floor(b2 * blend + b3 * (1 - blend));
      } else if (scheme === 'neon') {
        // Bright neon colors on dark background
        const phase = (v + hueShift) % 256;
        const intensity = Math.sin(v * 0.1) * 0.5 + 0.5;

        // Neon pink, cyan, green cycling
        if (phase < 85) {
          const t = phase / 85;
          data[idx] = Math.floor(255 * intensity);  // Pink/Magenta
          data[idx + 1] = Math.floor(50 * t * intensity);
          data[idx + 2] = Math.floor(255 * (1 - t * 0.5) * intensity);
        } else if (phase < 170) {
          const t = (phase - 85) / 85;
          data[idx] = Math.floor(50 * (1 - t) * intensity);
          data[idx + 1] = Math.floor(255 * intensity);  // Cyan
          data[idx + 2] = Math.floor(255 * intensity);
        } else {
          const t = (phase - 170) / 86;
          data[idx] = Math.floor(50 * t * intensity);
          data[idx + 1] = Math.floor(255 * (1 - t * 0.5) * intensity);  // Green
          data[idx + 2] = Math.floor(50 * intensity);
        }
      }
      data[idx + 3] = 255;
    }
  }

  generatePlasma() {
    const w = this.plasmaWidth;
    const h = this.plasmaHeight;
    const t = this.time;

    // Multiple overlapping sine waves create plasma effect
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Normalized coordinates
        const nx = x / w;
        const ny = y / h;

        // Classic plasma formula with multiple sine waves
        let value = 0;

        // Wave 1: horizontal
        value += Math.sin(nx * 10 + t * 2);

        // Wave 2: vertical
        value += Math.sin(ny * 10 + t * 1.5);

        // Wave 3: diagonal
        value += Math.sin((nx + ny) * 10 + t);

        // Wave 4: radial from center
        const cx = nx - 0.5;
        const cy = ny - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        value += Math.sin(dist * 20 - t * 3);

        // Wave 5: spiral
        const angle = Math.atan2(cy, cx);
        value += Math.sin(angle * 5 + dist * 15 - t * 2);

        // Wave 6: interference pattern
        value += Math.sin(nx * 15 * Math.sin(t * 0.5) + ny * 15 * Math.cos(t * 0.5));

        // Normalize to 0-255 range
        // value is roughly -6 to +6, normalize to 0-255
        const normalized = Math.floor(((value + 6) / 12) * 255);

        this.plasmaData[y * w + x] = Math.max(0, Math.min(255, normalized));
      }
    }
  }
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  const demo = new PlasmaDemo(canvas);
  demo.start();
});

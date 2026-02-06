/**
 * Study 009 - Interference
 *
 * Fast, colorful wave interference with sharp contrasts.
 * No white wash - pure RGB separation with dark gaps.
 *
 * Features:
 * - Sparse grid for performance + visual clarity
 * - High-speed wave propagation
 * - Sharp color bands, not blurry white
 * - Click to randomize
 */

import { gcanvas } from "../../src/index.js";

const CONFIG = {
  spacing: 25,
  baseSize: 3,

  // Wave settings - FAST
  numEmitters: 4,
  emitterSpeed: 1.5,
  waveFreq: 0.04,
  waveSpeed: 8.0,

  // Chromatic
  rgbSpatialOffset: 6,

  // Rotation
  globalRotationSpeed: 1.2,

  bgColor: "#000",
};

class Emitter {
  constructor(index, total) {
    this.baseAngle = (index / total) * Math.PI * 2;
    this.orbitRadius = 0.3;
    this.freq = 0.03 + Math.random() * 0.03;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = 6 + Math.random() * 4;
  }

  getPosition(time, cx, cy, radius) {
    const angle = this.baseAngle + time * CONFIG.emitterSpeed;
    return {
      x: cx + Math.cos(angle) * this.orbitRadius * radius,
      y: cy + Math.sin(angle) * this.orbitRadius * radius,
    };
  }

  wave(x, y, time, ex, ey) {
    const dist = Math.hypot(x - ex, y - ey);
    return Math.sin(dist * this.freq - time * this.speed + this.phase);
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const gi = game.game;

  let grid = [];
  let emitters = [];
  let time = Math.random() * 100;

  function init() {
    emitters = [];
    for (let i = 0; i < CONFIG.numEmitters; i++) {
      emitters.push(new Emitter(i, CONFIG.numEmitters));
    }
  }

  function buildGrid(w, h) {
    grid = [];
    // Use the diagonal as the grid size so rotation never shows black corners
    const diagonal = Math.sqrt(w * w + h * h);
    const cols = Math.ceil(diagonal / CONFIG.spacing) + 2;
    const rows = Math.ceil(diagonal / CONFIG.spacing) + 2;

    // Center the oversized grid
    const ox = (w - (cols - 1) * CONFIG.spacing) / 2;
    const oy = (h - (rows - 1) * CONFIG.spacing) / 2;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        grid.push({ x: ox + i * CONFIG.spacing, y: oy + j * CONFIG.spacing });
      }
    }
  }

  init();
  buildGrid(gi.width, gi.height);

  window.addEventListener("resize", () => {
    buildGrid(gi.width, gi.height);
  });

  gi.clear = function () {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.max(w, h) * 0.5;

    // Hard clear - no trails, sharp image
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, w, h);

    const epos = emitters.map(e => e.getPosition(time, cx, cy, maxR));

    const cosG = Math.cos(time * CONFIG.globalRotationSpeed);
    const sinG = Math.sin(time * CONFIG.globalRotationSpeed);

    for (const p of grid) {
      // Rotate around center
      const dx = p.x - cx;
      const dy = p.y - cy;
      const rx = cx + dx * cosG - dy * sinG;
      const ry = cy + dx * sinG + dy * cosG;

      // Get wave from each emitter with phase offsets for RGB
      let wR = 0, wG = 0, wB = 0;
      for (let i = 0; i < emitters.length; i++) {
        const e = emitters[i];
        const ep = epos[i];
        wR += e.wave(rx, ry, time, ep.x, ep.y);
        wG += e.wave(rx, ry, time + 0.3, ep.x, ep.y);
        wB += e.wave(rx, ry, time + 0.6, ep.x, ep.y);
      }
      wR /= emitters.length;
      wG /= emitters.length;
      wB /= emitters.length;

      // Only draw if wave is positive (creates dark gaps)
      const threshold = 0.1;

      // Size pulses with wave
      const avgWave = (wR + wG + wB) / 3;
      const size = CONFIG.baseSize + Math.max(0, avgWave) * 5;

      // Offset direction for RGB split
      const angle = Math.atan2(ry - cy, rx - cx);
      const offX = Math.cos(angle + Math.PI/2) * CONFIG.rgbSpatialOffset;
      const offY = Math.sin(angle + Math.PI/2) * CONFIG.rgbSpatialOffset;

      // Draw RGB circles only when wave > threshold
      if (wR > threshold) {
        const intensity = Math.floor(wR * 255);
        ctx.fillStyle = `rgb(${intensity}, 0, 0)`;
        ctx.beginPath();
        ctx.arc(rx - offX, ry - offY, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (wG > threshold) {
        const intensity = Math.floor(wG * 255);
        ctx.fillStyle = `rgb(0, ${intensity}, 0)`;
        ctx.beginPath();
        ctx.arc(rx, ry, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (wB > threshold) {
        const intensity = Math.floor(wB * 255);
        ctx.fillStyle = `rgb(0, 0, ${intensity})`;
        ctx.beginPath();
        ctx.arc(rx + offX, ry + offY, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  game.on("update", (dt) => {
    time += dt;
  });

  gi.events.on("click", () => {
    for (const e of emitters) {
      e.freq = 0.02 + Math.random() * 0.05;
      e.speed = 5 + Math.random() * 6;
      e.phase = Math.random() * Math.PI * 2;
      e.orbitRadius = 0.2 + Math.random() * 0.3;
    }
    CONFIG.globalRotationSpeed = 0.8 + Math.random() * 1.0;
  });

  game.start();
});

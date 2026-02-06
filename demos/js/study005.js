/**
 * Study 005 - Hex Flow
 *
 * A hexagonal grid that breathes, warps, and flows with
 * wave interference patterns. Hypnotic honeycomb energy.
 *
 * Features:
 * - Hexagonal tiling that fills the screen
 * - Multi-wave interference displacement
 * - Color cycling based on position + time
 * - Rotation and scale pulsing per cell
 * - Click to shift color palette
 */

import { gcanvas } from "../../src/index.js";

const CONFIG = {
  // Hex grid
  hexSize: 35,

  // Wave settings
  waveSpeed: 2.0,
  waveFreq: 0.015,
  waveAmp: 12,

  // Rotation
  rotationSpeed: 0.8,
  rotationAmp: 0.4,

  // Scale pulsing
  scaleAmp: 0.3,

  // Color
  hueSpeed: 30,
  hueSpread: 120,
  saturation: 85,
  lightness: 55,

  // Style
  strokeWidth: 2,
  fillAlpha: 0.7,

  bgColor: "#0a0a12",
};

const HEX_ANGLE = Math.PI / 3;
const SQRT3 = Math.sqrt(3);

/**
 * Draw a single hexagon with rotation
 */
function drawHex(ctx, x, y, size, rotation, fillColor, strokeColor) {
  if (size < 2) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = HEX_ANGLE * i - Math.PI / 6;
    const hx = size * Math.cos(angle);
    const hy = size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = CONFIG.strokeWidth;
  ctx.stroke();

  ctx.restore();
}

/**
 * Convert axial hex coords to pixel
 */
function hexToPixel(q, r, size) {
  const x = size * (3/2 * q);
  const y = size * (SQRT3/2 * q + SQRT3 * r);
  return { x, y };
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const gameInstance = game.game;

  let hexGrid = [];
  let time = Math.random() * 100;
  let hueOffset = 0;

  function buildGrid(w, h) {
    hexGrid = [];
    const size = CONFIG.hexSize;

    // Use diagonal to ensure full coverage during any transform
    const diagonal = Math.sqrt(w * w + h * h);
    const cols = Math.ceil(diagonal / (size * 1.5)) + 4;
    const rows = Math.ceil(diagonal / (size * SQRT3)) + 4;

    const startQ = -Math.floor(cols / 2);
    const startR = -Math.floor(rows / 2);

    for (let q = startQ; q < startQ + cols; q++) {
      for (let r = startR; r < startR + rows; r++) {
        const pos = hexToPixel(q, r, size);
        hexGrid.push({
          q, r,
          baseX: pos.x,
          baseY: pos.y,
        });
      }
    }
  }

  buildGrid(gameInstance.width, gameInstance.height);

  window.addEventListener("resize", () => {
    buildGrid(gameInstance.width, gameInstance.height);
  });

  gameInstance.clear = function () {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, w, h);

    const t = time;

    for (const hex of hexGrid) {
      // World position
      const wx = hex.baseX + cx;
      const wy = hex.baseY + cy;

      // Distance from center for radial effects
      const dx = hex.baseX;
      const dy = hex.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Multi-wave displacement
      const wave1 = Math.sin(dist * CONFIG.waveFreq - t * CONFIG.waveSpeed);
      const wave2 = Math.sin(dist * CONFIG.waveFreq * 0.7 + t * CONFIG.waveSpeed * 0.5 + angle * 3);
      const wave3 = Math.cos(angle * 6 - t * 1.5) * Math.sin(dist * 0.02);

      const combinedWave = (wave1 + wave2 * 0.6 + wave3 * 0.4) / 2;

      // Displacement
      const displaceX = Math.cos(angle) * combinedWave * CONFIG.waveAmp;
      const displaceY = Math.sin(angle) * combinedWave * CONFIG.waveAmp;

      const finalX = wx + displaceX;
      const finalY = wy + displaceY;

      // Scale pulsing
      const scalePulse = 1 + combinedWave * CONFIG.scaleAmp;
      const size = CONFIG.hexSize * scalePulse;

      // Rotation
      const rotation = combinedWave * CONFIG.rotationAmp + t * 0.1;

      // Color based on position + time
      const hue = (hueOffset + dist * 0.3 + angle * 20 + t * CONFIG.hueSpeed) % 360;
      const sat = CONFIG.saturation + combinedWave * 15;
      const light = CONFIG.lightness + combinedWave * 20;

      const fillColor = `hsla(${hue}, ${sat}%, ${light}%, ${CONFIG.fillAlpha})`;
      const strokeColor = `hsla(${(hue + 30) % 360}, ${sat}%, ${Math.min(light + 20, 80)}%, 0.9)`;

      drawHex(ctx, finalX, finalY, size * 0.9, rotation, fillColor, strokeColor);
    }

    // Draw center glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
    gradient.addColorStop(0, `hsla(${(hueOffset + t * 50) % 360}, 100%, 70%, 0.15)`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.fill();
  };

  game.on("update", (dt) => {
    time += dt;
  });

  // Click to shift palette
  gameInstance.events.on("click", () => {
    hueOffset = (hueOffset + 60) % 360;
  });

  game.start();
});

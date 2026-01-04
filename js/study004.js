/**
 * Study 004 - Hex Bloom
 *
 * Radial hexagon explosion with Tweenetik animations.
 * Inspired by @okazz_
 *
 * Features:
 * - Hexagons bloom radially from center
 * - Color transition: black → colorful → white
 * - Tweenetik-powered staggered animations
 * - Click to trigger new bloom
 */

import { gcanvas, Tweenetik, Easing } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Grid settings
  hexRadius: 25,
  hexSpacing: 2,

  // Animation settings
  bloomDuration: 0.8,
  staggerDelay: 0.03, // Delay per ring
  scaleFrom: 0,
  scaleTo: 1,

  // Colors
  colors: [
    "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
    "#007AFF", "#5856D6", "#AF52DE", "#FF2D55", "#FF6B6B",
    "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
  ],

  // Background
  bgColor: "#000",
  bloomColor: "#fff",
};

// Hexagon math
const HEX_ANGLE = Math.PI / 3;
const HEX_HEIGHT_RATIO = Math.sqrt(3);

/**
 * Calculate hexagon grid position (axial coordinates to pixel)
 */
function hexToPixel(q, r, size, centerX, centerY) {
  const x = size * (3 / 2 * q);
  const y = size * (HEX_HEIGHT_RATIO / 2 * q + HEX_HEIGHT_RATIO * r);
  return { x: centerX + x, y: centerY + y };
}

/**
 * Draw a hexagon
 */
function drawHexagon(ctx, x, y, radius, fillColor, strokeColor, lineWidth) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = HEX_ANGLE * i - Math.PI / 6;
    const hx = x + radius * Math.cos(angle);
    const hy = y + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && lineWidth > 0) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Draw a star/asterisk shape
 */
function drawStar(ctx, x, y, radius, points, color, lineWidth) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";

  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 / points) * i - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    ctx.stroke();
  }
}

/**
 * Hex cell state for animation
 */
class HexCell {
  constructor(q, r, x, y, distFromCenter) {
    this.q = q;
    this.r = r;
    this.x = x;
    this.y = y;
    this.distFromCenter = distFromCenter;

    // Animation state
    this.scale = 0;
    this.opacity = 0;
    this.colorPhase = 0; // 0 = colored, 1 = white
    this.rotation = 0;

    // Visual properties
    this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    this.isStar = Math.random() < 0.15; // 15% chance to be a star
    this.starPoints = 4 + Math.floor(Math.random() * 4); // 4-7 points
  }

  draw(ctx, baseRadius) {
    if (this.opacity <= 0 || this.scale <= 0) return;

    const radius = baseRadius * this.scale;

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Interpolate color from colorful to white based on colorPhase
    const r = Math.floor(this.hexToRgb(this.color).r + (255 - this.hexToRgb(this.color).r) * this.colorPhase);
    const g = Math.floor(this.hexToRgb(this.color).g + (255 - this.hexToRgb(this.color).g) * this.colorPhase);
    const b = Math.floor(this.hexToRgb(this.color).b + (255 - this.hexToRgb(this.color).b) * this.colorPhase);
    const currentColor = `rgb(${r},${g},${b})`;

    if (this.isStar) {
      drawStar(ctx, 0, 0, radius, this.starPoints, currentColor, 2);
    } else {
      // Draw hexagon with stroke and optional fill
      const fillAlpha = this.colorPhase;
      const fillColor = fillAlpha > 0.1 ? `rgba(${r},${g},${b},${fillAlpha})` : null;
      const strokeColor = currentColor;
      drawHexagon(ctx, 0, 0, radius, fillColor, strokeColor, 2);
    }

    ctx.restore();
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const scene = game.scene("main");
  const gameInstance = game.game;

  // State
  let hexCells = [];
  let bgWhiteness = 0; // 0 = black, 1 = white
  let isAnimating = false;
  let phase = "bloom"; // "bloom" or "collapse"

  // Debounced resize
  let resizeTimeout = null;
  let needsRebuild = false;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      needsRebuild = true;
    }, 100);
  };

  window.addEventListener("resize", handleResize);

  /**
   * Generate hexagon grid
   */
  function generateGrid() {
    const w = gameInstance.width;
    const h = gameInstance.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const size = CONFIG.hexRadius + CONFIG.hexSpacing;

    hexCells = [];

    // Calculate how many rings we need to cover the screen
    const maxDist = Math.sqrt(w * w + h * h) / 2;
    const rings = Math.ceil(maxDist / (size * HEX_HEIGHT_RATIO)) + 2;

    // Generate hexagonal grid using axial coordinates
    for (let q = -rings; q <= rings; q++) {
      for (let r = -rings; r <= rings; r++) {
        const pos = hexToPixel(q, r, size, centerX, centerY);

        // Skip if too far from visible area
        if (pos.x < -size * 2 || pos.x > w + size * 2 ||
            pos.y < -size * 2 || pos.y > h + size * 2) {
          continue;
        }

        const distFromCenter = Math.sqrt(
          Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
        );

        hexCells.push(new HexCell(q, r, pos.x, pos.y, distFromCenter));
      }
    }

    // Sort by distance from center for staggered animation
    hexCells.sort((a, b) => a.distFromCenter - b.distFromCenter);
  }

  /**
   * Trigger bloom animation (center → edges, black → white)
   */
  function triggerBloom() {
    if (isAnimating) return;
    isAnimating = true;
    phase = "bloom";

    // Reset all cells for bloom
    for (const cell of hexCells) {
      cell.scale = 0;
      cell.opacity = 0;
      cell.colorPhase = 0;
      cell.rotation = (Math.random() - 0.5) * 0.5;
      cell.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    }

    bgWhiteness = 0;

    // Find max distance for normalization
    const maxDist = hexCells.length > 0 ?
      hexCells[hexCells.length - 1].distFromCenter : 1;

    // Animate each cell with Tweenetik (inner to outer)
    let lastDelay = 0;
    for (const cell of hexCells) {
      const normalizedDist = cell.distFromCenter / maxDist;
      const delay = normalizedDist * CONFIG.staggerDelay * hexCells.length * 0.3;
      lastDelay = Math.max(lastDelay, delay);

      // Scale up
      Tweenetik.to(cell, { scale: 1, opacity: 1 }, CONFIG.bloomDuration * 0.6, Easing.easeOutBack, {
        delay: delay,
      });

      // Color transition (colorful → white)
      Tweenetik.to(cell, { colorPhase: 1 }, CONFIG.bloomDuration * 0.8, Easing.easeInOutQuad, {
        delay: delay + CONFIG.bloomDuration * 0.3,
      });

      // Slight rotation
      Tweenetik.to(cell, { rotation: 0 }, CONFIG.bloomDuration, Easing.easeOutQuad, {
        delay: delay,
      });
    }

    // Wait for all hexagons to finish, then trigger collapse
    const totalBloomTime = lastDelay + CONFIG.bloomDuration * 1.1;
    const randomPause = 100 + Math.random() * 100;
    setTimeout(() => {
      isAnimating = false;
      setTimeout(() => triggerCollapse(), randomPause);
    }, totalBloomTime * 1000);
  }

  /**
   * Trigger collapse animation (edges → center, white → black)
   */
  function triggerCollapse() {
    if (isAnimating) return;
    isAnimating = true;
    phase = "collapse";

    // Find max distance for normalization
    const maxDist = hexCells.length > 0 ?
      hexCells[hexCells.length - 1].distFromCenter : 1;

    // Animate each cell (outer to inner - reverse order)
    let lastDelay = 0;
    for (const cell of hexCells) {
      const normalizedDist = cell.distFromCenter / maxDist;
      // Reverse: outer cells animate first
      const delay = (1 - normalizedDist) * CONFIG.staggerDelay * hexCells.length * 0.3;
      lastDelay = Math.max(lastDelay, delay);

      // Color transition back (white → colorful)
      Tweenetik.to(cell, { colorPhase: 0 }, CONFIG.bloomDuration * 0.5, Easing.easeOutQuad, {
        delay: delay,
      });

      // Scale down and fade out
      Tweenetik.to(cell, { scale: 0, opacity: 0 }, CONFIG.bloomDuration * 0.6, Easing.easeInBack, {
        delay: delay + CONFIG.bloomDuration * 0.3,
      });

      // Rotation
      Tweenetik.to(cell, { rotation: (Math.random() - 0.5) * 0.5 }, CONFIG.bloomDuration, Easing.easeInQuad, {
        delay: delay,
      });
    }

    // Wait for all hexagons to finish collapsing, then trigger bloom
    const totalCollapseTime = lastDelay + CONFIG.bloomDuration * 1.1;
    const randomPause = 100 + Math.random() * 400;
    setTimeout(() => {
      isAnimating = false;
      setTimeout(() => triggerBloom(), randomPause);
    }, totalCollapseTime * 1000);
  }

  /**
   * Reset to black (for resize)
   */
  function resetToBlack() {
    Tweenetik.killAll();

    for (const cell of hexCells) {
      cell.scale = 0;
      cell.opacity = 0;
      cell.colorPhase = 0;
    }

    bgWhiteness = 0;
    isAnimating = false;
    phase = "bloom";
  }

  // Generate initial grid
  generateGrid();

  // Custom render
  gameInstance.clear = function () {
    // Background color interpolated between black and white
    const bg = Math.floor(bgWhiteness * 255);
    this.ctx.fillStyle = `rgb(${bg},${bg},${bg})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw all hex cells
    for (const cell of hexCells) {
      cell.draw(this.ctx, CONFIG.hexRadius);
    }
  };

  // Update loop
  game.on("update", (dt) => {
    if (needsRebuild) {
      needsRebuild = false;
      resetToBlack();
      generateGrid();
      // Auto-trigger bloom after rebuild
      setTimeout(() => triggerBloom(), 100);
    }

    // Update Tweenetik
    Tweenetik.updateAll(dt);
  });

  // Click to bloom
  game.on("click", () => {
    if (bgWhiteness > 0.9) {
      // If already white, reset and bloom again
      resetToBlack();
      setTimeout(() => triggerBloom(), 50);
    } else {
      triggerBloom();
    }
  });

  // Auto-start bloom
  setTimeout(() => triggerBloom(), 500);

  game.start();
});

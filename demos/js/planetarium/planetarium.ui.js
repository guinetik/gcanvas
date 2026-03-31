/**
 * Planetarium — UI rendering.
 *
 * Handles planet labels, starfield background, sun glow, and info text.
 * All functions are stateless renderers that take the current state.
 *
 * @module planetarium/ui
 */

import { Painter } from "../../../src/index.js";
import { CONFIG } from "./planetarium.config.js";

/**
 * Generate a static starfield (call once, reuse the array).
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @returns {Array<{x: number, y: number, brightness: number, size: number}>}
 */
export function generateStarfield(width, height) {
  const stars = [];
  const { count, minBrightness, maxBrightness, minSize, maxSize } = CONFIG.display.starfield;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      brightness: minBrightness + Math.random() * (maxBrightness - minBrightness),
      size: minSize + Math.random() * (maxSize - minSize),
    });
  }
  return stars;
}

/**
 * Render starfield background.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} stars - From generateStarfield
 */
export function drawStarfield(ctx, stars) {
  for (const star of stars) {
    ctx.globalAlpha = star.brightness;
    Painter.shapes.fillCircle(star.x, star.y, star.size, "#fff");
  }
  ctx.globalAlpha = 1;
}

/**
 * Render sun glow (additive blended concentric circles).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} screenX - Sun screen X
 * @param {number} screenY - Sun screen Y
 * @param {number} displayRadius - Sun display radius (already scaled)
 * @param {number} scale - Projection scale
 */
export function drawSunGlow(ctx, screenX, screenY, displayRadius, scale) {
  const { layers, baseAlpha, baseSize, color } = CONFIG.display.sunGlow;
  const r = displayRadius * scale;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < layers; i++) {
    const layerRadius = r * (baseSize + i * 0.8);
    const alpha = baseAlpha / (i + 1);
    const gradient = ctx.createRadialGradient(
      screenX, screenY, r * 0.5,
      screenX, screenY, layerRadius
    );
    gradient.addColorStop(0, `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, layerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Render planet name labels below each body.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<CelestialBody>} bodies - All bodies to label (already projected)
 */
export function drawLabels(ctx, bodies) {
  const { font, color, offsetY } = CONFIG.display.labels;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const body of bodies) {
    if (body.scale <= 0) continue;
    const labelY = body.screenY + body.displayRadius * body.scale + offsetY;
    ctx.fillText(body.name, body.screenX, labelY);
  }
}

/**
 * Render HUD info text.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} simTime - Current simulation time in days
 * @param {number} timeScale - Current time scale
 * @param {boolean} paused - Whether simulation is paused
 */
export function drawHUD(ctx, simTime, timeScale, paused) {
  const years = (simTime / 365.25).toFixed(1);
  const status = paused ? " [PAUSED]" : "";
  const text = `T+${years}y  ×${timeScale.toFixed(0)}${status}`;

  ctx.font = "12px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, 12, 12);
}

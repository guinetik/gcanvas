/**
 * Planetarium — UI rendering and control panel.
 *
 * Handles planet labels, starfield background, sun glow, info text,
 * and the accordion control panel for simulation parameters.
 *
 * @module planetarium/ui
 */

import {
  Painter,
  Screen,
  AccordionGroup,
  Slider,
  ToggleButton,
  Button,
  setTheme,
} from "../../../src/index.js";
import { CONFIG } from "./planetarium.config.js";

// ─────────────────────────────────────────────────────────────────────────────
// STARFIELD
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// SUN GLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render sun glow (additive blended concentric circles).
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

// ─────────────────────────────────────────────────────────────────────────────
// LABELS + HUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render planet name labels below each body.
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

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL PANEL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the accordion control panel for simulation parameters.
 * Returns an object with the panel and callbacks the demo wires to state.
 *
 * @param {Game} game - The PlanetariumDemo instance
 * @param {Object} callbacks - { onTimeScale, onPause, onGR, onAutoRotate, onReset }
 * @returns {{ panel: AccordionGroup, controls: Object }}
 */
export function buildControlPanel(game, callbacks) {
  setTheme("monochrome");

  const panelWidth = Screen.responsive(200, 230, CONFIG.panel.width);
  const padding = Screen.responsive(10, 12, CONFIG.panel.padding);
  const sliderW = panelWidth - padding * 2;

  const panel = new AccordionGroup(game, {
    width: panelWidth,
    padding,
    spacing: CONFIG.panel.spacing,
    headerHeight: CONFIG.panel.headerHeight,
  });
  panel.interactive = true;

  const controls = {};

  // ── Simulation section ──
  const simSection = panel.addSection("Simulation", { expanded: true });

  controls.timeScale = new Slider(game, {
    label: "Time Scale",
    min: 1, max: 100, value: CONFIG.time.scale, step: 1,
    width: sliderW,
    formatValue: (v) => `×${v.toFixed(0)}`,
    onChange: (v) => callbacks.onTimeScale(v),
  });
  simSection.addItem(controls.timeScale);

  controls.pause = new ToggleButton(game, {
    text: "Pause",
    width: sliderW,
    height: 32,
    onToggle: (toggled) => callbacks.onPause(toggled),
  });
  simSection.addItem(controls.pause);

  panel.commitSection(simSection);

  // ── Physics section ──
  const physSection = panel.addSection("Physics", { expanded: true });

  controls.gr = new ToggleButton(game, {
    text: "GR Precession",
    width: sliderW,
    height: 32,
    onToggle: (toggled) => callbacks.onGR(toggled),
  });
  physSection.addItem(controls.gr);

  panel.commitSection(physSection);

  // ── Camera section ──
  const camSection = panel.addSection("Camera", { expanded: false });

  controls.autoRotateSpeed = new Slider(game, {
    label: "Auto-Rotate",
    min: 0, max: 0.5, value: CONFIG.camera.autoRotateSpeed, step: 0.01,
    width: sliderW,
    formatValue: (v) => v.toFixed(2),
    onChange: (v) => callbacks.onAutoRotate(v),
  });
  camSection.addItem(controls.autoRotateSpeed);

  controls.reset = new Button(game, {
    text: "Reset Camera",
    width: sliderW,
    height: 32,
    onClick: () => callbacks.onReset(),
  });
  camSection.addItem(controls.reset);

  panel.commitSection(camSection);

  panel.layoutAll();

  return { panel, controls };
}

/**
 * Position the panel at top-right.
 */
export function positionPanel(panel, gameWidth) {
  panel.x = gameWidth - panel.width - CONFIG.panel.marginRight;
  panel.y = CONFIG.panel.marginTop;
}

/**
 * Flare - Luminous burst effect for TDE demo
 *
 * Renders a bright flare using direct canvas drawing.
 * State computed in update(), rendered in draw() via Painter.useCtx().
 */
import { GameObject, Painter } from "../../../src/index.js";

const CONFIG = {
  // Colors - BRIGHTER
  colorPeak: { r: 255, g: 255, b: 255 },
  colorMid: { r: 255, g: 220, b: 150 },
  colorFade: { r: 255, g: 150, b: 80 },

  // Animation
  pulseSpeed: 8,
  pulseAmount: 0.2,

  // Shadow/glow - MORE INTENSE
  glowBlurBase: 100,

  // Flare size multipliers - LARGER AND DENSER
  outerMultiplier: 2.0,
  innerMultiplier: 0.8,
  coreMultiplier: 0.35,
};

export class Flare extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {number} options.radius - Flare radius
   * @param {Camera3D} options.camera - Camera for projection
   */
  constructor(game, options = {}) {
    super(game, options);

    this.radius = options.radius ?? 100;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.pulsePhase = 0;
    this.camera = options.camera;

    // Screen position (computed in update)
    this.screenX = game.width / 2;
    this.screenY = game.height / 2;
    this.screenScale = 1;
  }

  /**
   * Initialize flare.
   */
  init() {
    // Nothing to pre-create
  }

  /**
   * Get current color based on intensity.
   */
  getCurrentColor() {
    if (this.intensity > 0.7) {
      // Peak - white
      const t = (this.intensity - 0.7) / 0.3;
      return this.lerpColor(CONFIG.colorMid, CONFIG.colorPeak, t);
    } else if (this.intensity > 0.3) {
      // Mid - orange
      const t = (this.intensity - 0.3) / 0.4;
      return this.lerpColor(CONFIG.colorFade, CONFIG.colorMid, t);
    } else {
      // Fade - red
      return CONFIG.colorFade;
    }
  }

  /**
   * Linearly interpolate between two colors.
   */
  lerpColor(c1, c2, t) {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
    };
  }

  /**
   * Get effective intensity with pulse.
   */
  getEffectiveIntensity() {
    const pulse = Math.sin(this.pulsePhase) * CONFIG.pulseAmount;
    return Math.max(0, Math.min(1, this.intensity + pulse * this.intensity));
  }

  /**
   * Update radius.
   */
  updateRadius(radius) {
    this.radius = radius;
  }

  /**
   * Trigger the flare.
   */
  trigger() {
    this.intensity = 1;
    this.targetIntensity = 1;
  }

  /**
   * Set intensity directly.
   */
  setIntensity(intensity) {
    this.intensity = Math.max(0, Math.min(1, intensity));
    this.targetIntensity = this.intensity;
  }

  /**
   * Start fading out.
   */
  fadeOut() {
    this.targetIntensity = 0.3;
  }

  /**
   * Reset flare.
   */
  reset() {
    this.intensity = 0;
    this.targetIntensity = 0;
    this.pulsePhase = 0;
  }

  /**
   * Update - compute render state.
   */
  update(dt) {
    super.update(dt);

    // Update pulse
    this.pulsePhase += dt * CONFIG.pulseSpeed;

    // Smooth intensity transition
    const diff = this.targetIntensity - this.intensity;
    if (Math.abs(diff) > 0.001) {
      this.intensity += diff * dt * 2;
    }

    // Project (0,0,0) through camera to get screen position
    if (this.camera) {
      const projected = this.camera.project(0, 0, 0);
      this.screenX = this.game.width / 2 + projected.x;
      this.screenY = this.game.height / 2 + projected.y;
      this.screenScale = projected.scale;
    }
  }

  /**
   * Draw the flare.
   * Uses Painter.useCtx() for direct canvas drawing.
   */
  draw() {
    const effectiveIntensity = this.getEffectiveIntensity();
    if (effectiveIntensity < 0.01) return;

    const scaledRadius = this.radius * this.screenScale;
    const color = this.getCurrentColor();

    Painter.useCtx((ctx) => {
      // Outer glow (largest, most transparent)
      const outerRadius =
        scaledRadius * CONFIG.outerMultiplier * effectiveIntensity;
      const outerGradient = ctx.createRadialGradient(
        this.screenX,
        this.screenY,
        0,
        this.screenX,
        this.screenY,
        outerRadius,
      );
      outerGradient.addColorStop(
        0,
        `rgba(${color.r}, ${color.g}, ${color.b}, ${effectiveIntensity * 0.6})`,
      );
      outerGradient.addColorStop(
        0.3,
        `rgba(${color.r}, ${Math.round(color.g * 0.7)}, ${Math.round(color.b * 0.5)}, ${effectiveIntensity * 0.4})`,
      );
      outerGradient.addColorStop(
        0.6,
        `rgba(${color.r}, ${Math.round(color.g * 0.5)}, ${Math.round(color.b * 0.3)}, ${effectiveIntensity * 0.2})`,
      );
      outerGradient.addColorStop(1, "rgba(255, 50, 0, 0)");

      ctx.fillStyle = outerGradient;
      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${effectiveIntensity * 0.9})`;
      ctx.shadowBlur = CONFIG.glowBlurBase * effectiveIntensity;
      ctx.beginPath();
      ctx.arc(this.screenX, this.screenY, outerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow (smaller, brighter)
      const innerRadius =
        scaledRadius * CONFIG.innerMultiplier * effectiveIntensity;
      const innerGradient = ctx.createRadialGradient(
        this.screenX,
        this.screenY,
        0,
        this.screenX,
        this.screenY,
        innerRadius,
      );
      innerGradient.addColorStop(
        0,
        `rgba(${color.r}, ${color.g}, ${color.b}, ${effectiveIntensity})`,
      );
      innerGradient.addColorStop(
        0.5,
        `rgba(${color.r}, ${color.g}, ${color.b}, ${effectiveIntensity * 0.6})`,
      );
      innerGradient.addColorStop(1, "rgba(255, 150, 50, 0)");

      ctx.shadowBlur = CONFIG.glowBlurBase * 0.6 * effectiveIntensity;
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(this.screenX, this.screenY, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Core (brightest center)
      const coreRadius =
        scaledRadius * CONFIG.coreMultiplier * effectiveIntensity;
      ctx.shadowColor = "rgba(255, 255, 255, 1)";
      ctx.shadowBlur = 25 * effectiveIntensity;
      ctx.fillStyle = `rgba(255, 255, 255, ${effectiveIntensity})`;
      ctx.beginPath();
      ctx.arc(this.screenX, this.screenY, coreRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

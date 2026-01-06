import { GameObject, Painter } from "../../../src/index.js";

/**
 * LaserBeam - Area denial obstacle
 *
 * Phases:
 * 1. Warning (0.3s): Thin green line appears
 * 2. Charging (0.2s): Line grows wider, turns white
 * 3. Active (0.15s): Full width, damages player
 * 4. Fade (0.2s): Fades out
 */
export class LaserBeam extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: 1,
      height: game.height,
      ...options,
    });

    // Position - random X across screen
    this.x = options.x ?? (50 + Math.random() * (game.width - 100));
    this.y = game.height / 2;

    // Timing
    this.warningDuration = 0.3;
    this.chargeDuration = 0.2;
    this.activeDuration = 0.4; // Longer damage window
    this.fadeDuration = 0.2;
    this.totalDuration = this.warningDuration + this.chargeDuration + this.activeDuration + this.fadeDuration;

    this.elapsedTime = 0;
    this.phase = "warning"; // warning, charging, active, fade

    // Visual properties
    this.maxWidth = 60; // Wider beam during active phase
    this.currentWidth = 1;
    this.opacity = 1;
    this.canDamage = false; // Only damages during active phase
  }

  update(dt) {
    super.update(dt);

    this.elapsedTime += dt;

    // Determine phase and properties
    if (this.elapsedTime < this.warningDuration) {
      // Warning phase - thin green line
      this.phase = "warning";
      this.currentWidth = 1;
      this.canDamage = false;
    } else if (this.elapsedTime < this.warningDuration + this.chargeDuration) {
      // Charging phase - grows wider, turns white
      this.phase = "charging";
      const chargeProgress = (this.elapsedTime - this.warningDuration) / this.chargeDuration;
      this.currentWidth = 1 + (this.maxWidth - 1) * chargeProgress;
      this.canDamage = false;
    } else if (this.elapsedTime < this.warningDuration + this.chargeDuration + this.activeDuration) {
      // Active phase - full width, damages
      this.phase = "active";
      this.currentWidth = this.maxWidth;
      this.canDamage = true;
    } else if (this.elapsedTime < this.totalDuration) {
      // Fade phase
      this.phase = "fade";
      const fadeProgress = (this.elapsedTime - this.warningDuration - this.chargeDuration - this.activeDuration) / this.fadeDuration;
      this.opacity = 1 - fadeProgress;
      this.currentWidth = this.maxWidth * (1 - fadeProgress * 0.5); // Shrink slightly
      this.canDamage = false;
    } else {
      // Done
      this.destroy();
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    const ctx = Painter.ctx;
    ctx.save();

    // Reset transform since we're drawing in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const halfWidth = this.currentWidth / 2;

    if (this.phase === "warning") {
      // Thin green warning line
      ctx.strokeStyle = `rgba(0, 255, 0, 0.8)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, 0);
      ctx.lineTo(this.x, this.game.height);
      ctx.stroke();

      // Flickering effect
      if (Math.sin(this.elapsedTime * 30) > 0) {
        ctx.strokeStyle = `rgba(100, 255, 100, 0.4)`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else if (this.phase === "charging") {
      // Growing white beam with green core
      const chargeProgress = (this.elapsedTime - this.warningDuration) / this.chargeDuration;

      // Outer glow
      const gradient = ctx.createLinearGradient(this.x - halfWidth, 0, this.x + halfWidth, 0);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.3, `rgba(200, 255, 200, ${0.3 * chargeProgress})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.6 * chargeProgress})`);
      gradient.addColorStop(0.7, `rgba(200, 255, 200, ${0.3 * chargeProgress})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - halfWidth, 0, this.currentWidth, this.game.height);

      // Core line
      ctx.strokeStyle = `rgba(150, 255, 150, ${0.5 + chargeProgress * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, 0);
      ctx.lineTo(this.x, this.game.height);
      ctx.stroke();
    } else if (this.phase === "active") {
      // Full deadly beam - bright white with slight transparency
      const gradient = ctx.createLinearGradient(this.x - halfWidth, 0, this.x + halfWidth, 0);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.2, `rgba(255, 255, 255, 0.3)`);
      gradient.addColorStop(0.4, `rgba(255, 255, 255, 0.7)`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, 0.9)`);
      gradient.addColorStop(0.6, `rgba(255, 255, 255, 0.7)`);
      gradient.addColorStop(0.8, `rgba(255, 255, 255, 0.3)`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - halfWidth, 0, this.currentWidth, this.game.height);

      // Bright core
      ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, 0);
      ctx.lineTo(this.x, this.game.height);
      ctx.stroke();
    } else if (this.phase === "fade") {
      // Fading out
      const gradient = ctx.createLinearGradient(this.x - halfWidth, 0, this.x + halfWidth, 0);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.3, `rgba(200, 255, 200, ${0.2 * this.opacity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.5 * this.opacity})`);
      gradient.addColorStop(0.7, `rgba(200, 255, 200, ${0.2 * this.opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(this.x - halfWidth, 0, this.currentWidth, this.game.height);
    }

    ctx.restore();
  }

  destroy() {
    this.active = false;
    this.visible = false;
  }

  getBounds() {
    // Only return bounds during active phase (when it can damage)
    if (!this.canDamage) {
      return { x: -1000, y: -1000, width: 0, height: 0 }; // Off-screen, no collision
    }
    return {
      x: this.x - this.currentWidth / 2,
      y: 0,
      width: this.currentWidth,
      height: this.game.height,
    };
  }
}

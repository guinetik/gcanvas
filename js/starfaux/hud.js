/**
 * HUD - Heads-Up Display for StarFaux
 *
 * Displays score and health. The crosshair is rendered by
 * the Player class since it follows the ship position.
 */

import { GameObject, Painter } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

export class HUD extends GameObject {
  constructor(game) {
    super(game, {});

    this.score = 0;
    this.health = CONFIG.player.maxHealth;
    this.maxHealth = CONFIG.player.maxHealth;
  }

  setScore(score) {
    this.score = score;
  }

  setHealth(health) {
    this.health = health;
  }

  draw() {
    const ctx = Painter.ctx;
    const scale = this.game.scaleFactor || 1;
    const margin = CONFIG.hud.margin * scale;

    ctx.save();

    // Score display (top-left) - scale font size with resolution
    ctx.fillStyle = CONFIG.colors.hud;
    const fontSize = 20 * scale;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`SCORE: ${this.score}`, margin, margin);

    // Health display (bottom-center) - in the UI area below terrain
    this.drawHealth(ctx, this.game.width / 2, this.game.height - margin - 40 * scale, scale);

    ctx.restore();
  }

  /**
   * Draw health indicator as shield bars (centered at bottom)
   */
  drawHealth(ctx, x, y, scale = 1) {
    const fontSize = 16 * scale;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = CONFIG.colors.hud;
    ctx.fillText("SHIELD", x, y);

    const barWidth = 120 * scale;
    const barHeight = 14 * scale;
    const barX = x - barWidth / 2;
    const barY = y + 20 * scale;

    // Background bar
    ctx.fillStyle = "#222222";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health bar
    const healthPercent = this.health / this.maxHealth;
    ctx.fillStyle = healthPercent > 0.3 ? CONFIG.colors.hud : "#ff4444";
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

    // Border
    ctx.strokeStyle = CONFIG.colors.hud;
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}

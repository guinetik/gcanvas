/**
 * Lore Prism - Collectible data fragments from beyond spacetime
 *
 * Mysterious prisms that grant Kerr energy, score, and cryptic knowledge.
 * Hint at the wormhole secret and the true nature of the diagram.
 */

import { Prism } from "/gcanvas.es.min.js";
import { CONFIG } from "./constants.js";

// ============================================================================
// LORE MESSAGES
// ============================================================================

const LORE_EARLY = [
  { text: "Time flows in one direction. Or so they believed.", source: "Fragment 001" },
  { text: "The diamond contains all futures. All pasts.", source: "Axiom" },
  { text: "Light moves at 45 degrees. Always. This is law.", source: "First Principle" },
  { text: "i- is where you began. i+ is where you end.", source: "Doctrine" },
  { text: "The singularity is patient. It has already consumed you.", source: "Paradox" },
  { text: "Your worldline is written. Follow it.", source: "Determinism" },
  { text: "They mapped infinity. They should not have.", source: "Warning" },
  { text: "Penrose drew the boundaries. Not what lies beyond.", source: "Whisper" },
];

const LORE_WORMHOLE_HINTS = [
  { text: "Some paths fold back upon themselves.", source: "Anomaly" },
  { text: "The ancients spoke of doors between moments.", source: "Archive" },
  { text: "Not all who fall into darkness stay fallen.", source: "Heresy" },
  { text: "What if the end was also a beginning?", source: "Query" },
  { text: "Blue light. Spiraling. A tear in the weave.", source: "Witness" },
  { text: "They found a way to cheat causality.", source: "Redacted" },
  { text: "The worm turns. The hole opens. Time bleeds.", source: "Cipher" },
  { text: "Seek the spiral. It remembers your origin.", source: "Guidance" },
];

const LORE_POST_WORMHOLE = [
  { text: "You have seen beyond the veil.", source: "Awakening" },
  { text: "The loop is not a prison. It is a gift.", source: "Revelation" },
  { text: "Each return makes you stronger.", source: "Observer" },
  { text: "Purple light in the void. Something waits.", source: "Vision" },
  { text: "The artifact was not meant to be found.", source: "Defiance" },
  { text: "Survive the unsurvivable. This is the way.", source: "Mantra" },
  { text: "Inside the singularity, time has no meaning.", source: "Tactical" },
  { text: "The void keeps the essence of travelers.", source: "Mystery" },
];

const LORE_KERR = [
  { text: "Rotating black holes bleed energy. Harvest it.", source: "Exploit" },
  { text: "Frame dragging pulls you in. Use it.", source: "Strategy" },
  { text: "The ergosphere is danger. And opportunity.", source: "Duality" },
  { text: "Kerr knew what he unleashed.", source: "History" },
];

// ============================================================================
// LORE PRISM - COLLECTIBLE
// ============================================================================

export class LorePrism {
  constructor(u, v, lorePool = "early") {
    this.u = u;
    this.v = v;

    // Size for collision
    this.radius = 0.04;

    // Animation
    this.rotationPhase = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.hoverOffset = 0;

    // State
    this.collected = false;
    this.spawnTime = 0;

    // Select lore from appropriate pool
    this.lore = this.selectLore(lorePool);

    // Create the prism shape
    this.prism = new Prism(25, {
      width: 18,
      height: 18,
      faceTopColor: "#4df",
      faceBottomColor: "#28a",
      faceLeftColor: "#3bc",
      faceRightColor: "#2ab",
      faceFrontColor: "#4ce",
      faceBackColor: "#1a9",
      stroke: "#8ff",
      lineWidth: 1,
    });
  }

  selectLore(pool) {
    let messages;
    switch (pool) {
      case "wormhole":
        messages = LORE_WORMHOLE_HINTS;
        break;
      case "post_wormhole":
        messages = LORE_POST_WORMHOLE;
        break;
      case "kerr":
        messages = LORE_KERR;
        break;
      default:
        messages = LORE_EARLY;
    }
    return messages[Math.floor(Math.random() * messages.length)];
  }

  update(dt) {
    this.rotationPhase += dt * 1.5;
    this.pulsePhase += dt * 3;
    this.hoverOffset = Math.sin(this.pulsePhase) * 3;
    this.spawnTime += dt;

    // Rotate the prism
    this.prism.setRotation(
      this.rotationPhase * 0.5,
      this.rotationPhase,
      this.rotationPhase * 0.3
    );
  }

  getCircle() {
    return { x: this.u, y: this.v, radius: this.radius };
  }

  get active() {
    return !this.collected;
  }
}

// ============================================================================
// LORE DISPLAY - Shows message when prism collected
// ============================================================================

export class LoreDisplay {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.currentLore = null;
    this.displayTimer = 0;
    this.displayDuration = 3.5;
    this.fadeDuration = 0.4;

    // Glitch effect
    this.glitchOffset = 0;
    this.glitchTimer = 0;
  }

  /**
   * Show a lore message (called when prism collected)
   */
  show(lore) {
    this.currentLore = lore;
    this.active = true;
    this.displayTimer = 0;
    this.glitchTimer = 0;
  }

  update(dt) {
    if (!this.active) return;

    this.displayTimer += dt;
    this.glitchTimer += dt;

    // Glitch effect
    if (Math.random() < 0.08) {
      this.glitchOffset = (Math.random() - 0.5) * 6;
    } else {
      this.glitchOffset *= 0.85;
    }

    // Fade out
    if (this.displayTimer >= this.displayDuration + this.fadeDuration) {
      this.active = false;
      this.currentLore = null;
    }
  }

  render(ctx, targetX = null, targetY = null) {
    if (!this.active || !this.currentLore) return;

    // Use target position (light cone tip) or fallback to center
    const centerX = targetX !== null ? targetX : this.game.width / 2;
    const centerY = targetY !== null ? targetY : 100;

    // Calculate alpha
    let alpha = 1;
    if (this.displayTimer < this.fadeDuration) {
      alpha = this.displayTimer / this.fadeDuration;
    } else if (this.displayTimer >= this.displayDuration) {
      alpha = 1 - ((this.displayTimer - this.displayDuration) / this.fadeDuration);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const glitchX = this.glitchOffset;

    // Background panel
    const panelWidth = Math.min(450, this.game.width - 60);
    const panelHeight = 60;

    ctx.fillStyle = "rgba(0, 20, 30, 0.9)";
    ctx.fillRect(
      centerX - panelWidth / 2 + glitchX,
      centerY - panelHeight / 2,
      panelWidth,
      panelHeight
    );

    // Border
    ctx.strokeStyle = `rgba(100, 220, 255, ${0.7 + Math.sin(this.glitchTimer * 8) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX - panelWidth / 2 + glitchX,
      centerY - panelHeight / 2,
      panelWidth,
      panelHeight
    );

    // Corner accents
    const cornerSize = 8;
    ctx.fillStyle = "#4df";
    // Top left
    ctx.fillRect(centerX - panelWidth / 2 + glitchX, centerY - panelHeight / 2, cornerSize, 2);
    ctx.fillRect(centerX - panelWidth / 2 + glitchX, centerY - panelHeight / 2, 2, cornerSize);
    // Top right
    ctx.fillRect(centerX + panelWidth / 2 - cornerSize + glitchX, centerY - panelHeight / 2, cornerSize, 2);
    ctx.fillRect(centerX + panelWidth / 2 - 2 + glitchX, centerY - panelHeight / 2, 2, cornerSize);
    // Bottom left
    ctx.fillRect(centerX - panelWidth / 2 + glitchX, centerY + panelHeight / 2 - 2, cornerSize, 2);
    ctx.fillRect(centerX - panelWidth / 2 + glitchX, centerY + panelHeight / 2 - cornerSize, 2, cornerSize);
    // Bottom right
    ctx.fillRect(centerX + panelWidth / 2 - cornerSize + glitchX, centerY + panelHeight / 2 - 2, cornerSize, 2);
    ctx.fillRect(centerX + panelWidth / 2 - 2 + glitchX, centerY + panelHeight / 2 - cornerSize, 2, cornerSize);

    // Main text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const hue = 185 + Math.sin(this.glitchTimer * 3) * 15;
    ctx.fillStyle = `hsl(${hue}, 80%, 80%)`;
    ctx.font = "italic 15px monospace";
    ctx.fillText(`"${this.currentLore.text}"`, centerX + glitchX, centerY - 6);

    // Source
    ctx.font = "10px monospace";
    ctx.fillStyle = `rgba(100, 200, 220, 0.7)`;
    ctx.fillText(`— ${this.currentLore.source}`, centerX + glitchX, centerY + 18);

    // Scan line
    const scanY = (this.glitchTimer * 40) % panelHeight;
    ctx.fillStyle = "rgba(100, 220, 255, 0.05)";
    ctx.fillRect(
      centerX - panelWidth / 2 + glitchX,
      centerY - panelHeight / 2 + scanY,
      panelWidth,
      2
    );

    ctx.restore();
  }
}

// ============================================================================
// CONFIG ADDITIONS
// ============================================================================

export const LORE_CONFIG = {
  spawnChance: 0.4,        // 40% chance per spawn cycle
  spawnInterval: 6.0,      // Check every 6 seconds
  kerrReward: 25,          // Kerr energy gained
  scoreReward: 500,        // Score gained
};

import { GameObject, TextShape } from "../../../src/index.js";

export class HUD extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    // Title - centered, below info bar
    this.titleText = new TextShape("SPACE INVADERS", {
      font: "bold 32px monospace",
      color: "#ffff00",
      align: "center",
      baseline: "top",
      originX: 0.5,
      originY: 0,
    });

    // Score - top left
    this.scoreText = new TextShape("SCORE: 0", {
      font: "20px monospace",
      color: "#ffffff",
      align: "left",
      baseline: "top",
      originX: 0,
      originY: 0,
    });

    // Level - top right
    this.levelText = new TextShape("LEVEL: 1", {
      font: "20px monospace",
      color: "#00ffff",
      align: "right",
      baseline: "top",
      originX: 1,
      originY: 0,
    });

    // Lives - bottom left (above FPS)
    this.livesText = new TextShape("LIVES: 3", {
      font: "18px monospace",
      color: "#00ff00",
      align: "left",
      baseline: "bottom",
      originX: 0,
      originY: 1,
    });

    // Center message (font size set dynamically based on screen width)
    this.messageText = new TextShape("", {
      font: "20px monospace",
      color: "#ffff00",
      align: "center",
      baseline: "middle",
      origin: "center",
    });

    // Message auto-hide timer
    this.messageTimer = 0;
    this.messageDuration = 0;
  }

  update(dt) {
    super.update(dt);
    this.scoreText.text = `SCORE: ${this.game.score}`;
    this.levelText.text = `LEVEL: ${this.game.level}`;
    this.livesText.text = `LIVES: ${this.game.lives}`;

    // Auto-hide message after duration
    if (this.messageDuration > 0 && this.messageText.text) {
      this.messageTimer += dt;
      if (this.messageTimer >= this.messageDuration) {
        this.hideMessage();
      }
    }
  }

  draw() {
    super.draw();

    // Title (centered, 100px from top to account for info bar)
    this.titleText.x = this.game.width / 2;
    this.titleText.y = 100;
    this.titleText.render();

    // Score (top left, below title area)
    this.scoreText.x = 20;
    this.scoreText.y = 140;
    this.scoreText.render();

    // Level (top right, below title area)
    this.levelText.x = this.game.width - 20;
    this.levelText.y = 140;
    this.levelText.render();

    // Lives (bottom left, above FPS counter)
    this.livesText.x = 20;
    this.livesText.y = this.game.height - 40;
    this.livesText.render();

    // Center message (scale font based on screen width)
    if (this.messageText.text) {
      // Scale font: 20px at 800px width, scales proportionally (min 14px, max 24px)
      const fontSize = Math.max(14, Math.min(24, Math.floor(this.game.width / 40)));
      this.messageText.font = `${fontSize}px monospace`;
      this.messageText.x = this.game.width / 2;
      this.messageText.y = this.game.height / 2;
      this.messageText.render();
    }
  }

  showMessage(text, duration = 0) {
    this.messageText.text = text;
    this.messageTimer = 0;
    this.messageDuration = duration; // 0 = permanent until hideMessage called
  }

  hideMessage() {
    this.messageText.text = "";
    this.messageTimer = 0;
    this.messageDuration = 0;
  }
}

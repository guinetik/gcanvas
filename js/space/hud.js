import { GameObject, TextShape, Screen } from "/gcanvas.es.min.js";

// Responsive typography — mobile/tablet/desktop
const TITLE_FONT_PX = Screen.responsive(22, 28, 32);
const HUD_FONT_PX = Screen.responsive(14, 18, 20);
const LIVES_FONT_PX = Screen.responsive(14, 16, 18);
const TITLE_Y = Screen.responsive(50, 80, 100);
const HUD_ROW_Y = TITLE_Y + TITLE_FONT_PX + 8;
const HUD_SIDE_MARGIN = Screen.responsive(10, 16, 20);
const LIVES_BOTTOM_MARGIN = Screen.responsive(30, 36, 40);

export class HUD extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    // Title - centered, below info bar
    this.titleText = new TextShape("SPACE INVADERS", {
      font: `bold ${TITLE_FONT_PX}px monospace`,
      color: "#ffff00",
      align: "center",
      baseline: "top",
      originX: 0.5,
      originY: 0,
    });

    // Score - top left
    this.scoreText = new TextShape("SCORE: 0", {
      font: `${HUD_FONT_PX}px monospace`,
      color: "#ffffff",
      align: "left",
      baseline: "top",
      originX: 0,
      originY: 0,
    });

    // Level - top right
    this.levelText = new TextShape("LEVEL: 1", {
      font: `${HUD_FONT_PX}px monospace`,
      color: "#00ffff",
      align: "right",
      baseline: "top",
      originX: 1,
      originY: 0,
    });

    // Lives - bottom left (above FPS)
    this.livesText = new TextShape("LIVES: 3", {
      font: `${LIVES_FONT_PX}px monospace`,
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

    // Title (centered, responsive top padding)
    this.titleText.x = this.game.width / 2;
    this.titleText.y = TITLE_Y;
    this.titleText.render();

    // Score (top left, below title area)
    this.scoreText.x = HUD_SIDE_MARGIN;
    this.scoreText.y = HUD_ROW_Y;
    this.scoreText.render();

    // Level (top right, below title area)
    this.levelText.x = this.game.width - HUD_SIDE_MARGIN;
    this.levelText.y = HUD_ROW_Y;
    this.levelText.render();

    // Lives (bottom left, above FPS counter)
    this.livesText.x = HUD_SIDE_MARGIN;
    this.livesText.y = this.game.height - LIVES_BOTTOM_MARGIN;
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

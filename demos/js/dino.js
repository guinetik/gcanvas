import {
  Game,
  GameObject,
  Text,
  Rectangle,
  Circle,
  Keys,
  FPSCounter,
  PlatformerScene,
  Collision,
  Painter,
  Position,
  Group,
  Synth,
} from "../../src/index.js";

// ==================== Configuration ====================
const CONFIG = {
  // Theme - Vercel meets Terminal
  theme: {
    background: "#000000",
    primary: "#00ff00",      // Terminal green
    secondary: "#0a0a0a",
    accent: "#00cc00",
    text: "#ffffff",
    textDim: "#666666",
    ground: "#1a1a1a",
    groundLine: "#00ff00",
    obstacle: "#00ff00",
    dino: "#00ff00",
  },

  // Game settings
  gravity: 2800,
  jumpVelocity: -750,

  // Player (Dino)
  dinoScale: 1.0,

  // Ground - centered layout
  groundHeight: 2,

  // Obstacles (Cacti)
  cactusWidth: 15,
  cactusMinHeight: 30,
  cactusMaxHeight: 50,
  cactusSpawnMinInterval: 1.0,
  cactusSpawnMaxInterval: 2.2,

  // Scrolling
  scrollSpeed: 350,
  scrollAcceleration: 8,
  maxScrollSpeed: 800,

  // Sound
  soundEnabled: true,
  masterVolume: 0.3,
};

// ==================== Sound Effects ====================
/**
 * SFX - Retro 8-bit style sound effects for the dino game
 */
class SFX {
  static initialized = false;

  static init() {
    if (this.initialized || !CONFIG.soundEnabled) return;

    Synth.init({ masterVolume: CONFIG.masterVolume });
    this.initialized = true;
  }

  static async resume() {
    if (!this.initialized) return;
    await Synth.resume();
  }

  /**
   * Jump sound - Quick upward sweep
   */
  static jump() {
    if (!this.initialized) return;

    // Retro jump: quick upward frequency sweep
    Synth.osc.sweep(150, 400, 0.15, {
      type: "square",
      volume: 0.25,
    });
  }

  /**
   * Score milestone sound - Quick double beep
   */
  static milestone() {
    if (!this.initialized) return;

    const now = Synth.now;

    // Two quick beeps
    Synth.osc.tone(880, 0.08, {
      type: "square",
      volume: 0.2,
      attack: 0.01,
      decay: 0.02,
      sustain: 0.5,
      release: 0.05,
      startTime: now,
    });

    Synth.osc.tone(1100, 0.1, {
      type: "square",
      volume: 0.2,
      attack: 0.01,
      decay: 0.02,
      sustain: 0.5,
      release: 0.05,
      startTime: now + 0.1,
    });
  }

  /**
   * Game over sound - Sad descending tone
   */
  static gameOver() {
    if (!this.initialized) return;

    const now = Synth.now;

    // Descending arpeggio
    const notes = [440, 349, 293, 220];
    notes.forEach((freq, i) => {
      Synth.osc.tone(freq, 0.2, {
        type: "square",
        volume: 0.25,
        attack: 0.01,
        decay: 0.05,
        sustain: 0.6,
        release: 0.15,
        startTime: now + i * 0.12,
      });
    });

    // Final low buzz
    Synth.osc.tone(110, 0.4, {
      type: "sawtooth",
      volume: 0.15,
      attack: 0.05,
      decay: 0.1,
      sustain: 0.3,
      release: 0.25,
      startTime: now + 0.5,
    });
  }

  /**
   * Start game sound - Ascending beep
   */
  static start() {
    if (!this.initialized) return;

    Synth.osc.sweep(200, 600, 0.2, {
      type: "square",
      volume: 0.2,
    });
  }
}

// ==================== Dino Shape (T-Rex silhouette) ====================
/**
 * Creates a pixelated T-Rex dinosaur shape using rectangles
 * Inspired by Chrome's dino but rendered with terminal aesthetic
 */
class DinoShape {
  constructor(options = {}) {
    this.color = options.color || CONFIG.theme.dino;
    this.scale = options.scale || 1;
    this.group = new Group({});
    this.buildDino();
  }

  buildDino() {
    const s = this.scale;
    const c = this.color;
    const px = 3 * s; // pixel size

    // Build the dino pixel by pixel (simplified T-Rex silhouette)
    // Each rectangle represents a "pixel" in the sprite
    const pixels = [
      // Head (top)
      { x: 6, y: 0, w: 7, h: 1 },
      { x: 5, y: 1, w: 9, h: 1 },
      { x: 5, y: 2, w: 9, h: 1 },
      // Eye (gap)
      { x: 5, y: 3, w: 4, h: 1 },
      { x: 11, y: 3, w: 3, h: 1 },
      // Mouth area
      { x: 5, y: 4, w: 9, h: 1 },
      { x: 3, y: 5, w: 11, h: 1 },
      { x: 2, y: 6, w: 8, h: 1 },
      // Neck
      { x: 2, y: 7, w: 5, h: 1 },
      { x: 1, y: 8, w: 5, h: 1 },
      // Body
      { x: 0, y: 9, w: 6, h: 1 },
      { x: 0, y: 10, w: 8, h: 1 },
      { x: 0, y: 11, w: 9, h: 1 },
      // Arms
      { x: 5, y: 9, w: 3, h: 1 },
      { x: 6, y: 10, w: 3, h: 1 },
      // Tail & body
      { x: -3, y: 10, w: 3, h: 1 },
      { x: -4, y: 11, w: 4, h: 1 },
      { x: -5, y: 12, w: 5, h: 1 },
      { x: -5, y: 13, w: 6, h: 1 },
      // Lower body
      { x: 0, y: 12, w: 7, h: 1 },
      { x: 0, y: 13, w: 6, h: 1 },
      // Legs
      { x: 0, y: 14, w: 2, h: 1 },
      { x: 4, y: 14, w: 2, h: 1 },
      { x: 0, y: 15, w: 2, h: 1 },
      { x: 4, y: 15, w: 2, h: 1 },
      // Feet
      { x: -1, y: 16, w: 3, h: 1 },
      { x: 3, y: 16, w: 3, h: 1 },
    ];

    // Center offset
    const offsetX = -3 * px;
    const offsetY = -8 * px;

    pixels.forEach(p => {
      const rect = new Rectangle({
        x: p.x * px + offsetX + (p.w * px) / 2,
        y: p.y * px + offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: c,
      });
      this.group.add(rect);
    });
  }

  render() {
    this.group.render();
  }
}

// ==================== Dino (Player) ====================
/**
 * Dino - The player character with pixel art T-Rex
 */
class Dino extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.width = 50;
    this.height = 55;
    this.vx = 0;
    this.vy = 0;
    this._grounded = true;

    // Visual representation - pixel art dino
    this.dinoShape = new DinoShape({
      color: CONFIG.theme.dino,
      scale: CONFIG.dinoScale,
    });
  }

  draw() {
    super.draw();
    this.dinoShape.render();
  }

  getBounds() {
    // Shrink hitbox for fairness
    const shrink = 8;
    return {
      x: this.x - this.width / 2 + shrink,
      y: this.y - this.height / 2 + shrink,
      width: this.width - shrink * 2,
      height: this.height - shrink * 2,
    };
  }
}

// ==================== Cactus (Obstacle) ====================
/**
 * Cactus - A pixel-art style obstacle
 */
class Cactus extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.width = CONFIG.cactusWidth;
    this.height = options.height || CONFIG.cactusMinHeight +
      Math.random() * (CONFIG.cactusMaxHeight - CONFIG.cactusMinHeight);

    this.group = new Group({});
    this.buildCactus();
  }

  buildCactus() {
    const c = CONFIG.theme.obstacle;
    const w = this.width;
    const h = this.height;

    // Main stem
    this.group.add(new Rectangle({
      x: 0,
      y: 0,
      width: w * 0.6,
      height: h,
      color: c,
    }));

    // Left arm (if tall enough)
    if (h > 35) {
      this.group.add(new Rectangle({
        x: -w * 0.5,
        y: -h * 0.2,
        width: w * 0.4,
        height: h * 0.3,
        color: c,
      }));
      this.group.add(new Rectangle({
        x: -w * 0.5,
        y: -h * 0.35,
        width: w * 0.4,
        height: w * 0.4,
        color: c,
      }));
    }

    // Right arm (if even taller)
    if (h > 45) {
      this.group.add(new Rectangle({
        x: w * 0.5,
        y: -h * 0.1,
        width: w * 0.4,
        height: h * 0.25,
        color: c,
      }));
      this.group.add(new Rectangle({
        x: w * 0.5,
        y: -h * 0.27,
        width: w * 0.4,
        height: w * 0.4,
        color: c,
      }));
    }
  }

  draw() {
    super.draw();
    this.group.render();
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }
}

// ==================== Ground ====================
/**
 * Ground - Terminal-style ground with scrolling texture
 */
class Ground extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.groundWidth = options.width || game.width * 3;
    this.scrollOffset = 0;

    // Main ground line
    this.line = new Rectangle({
      width: this.groundWidth,
      height: CONFIG.groundHeight,
      color: CONFIG.theme.groundLine,
    });

    // Generate ground texture marks (will scroll)
    this.marks = [];
    const markSpacing = 15;
    const numMarks = Math.ceil(this.groundWidth / markSpacing) + 10;
    for (let i = 0; i < numMarks; i++) {
      // Different mark types for variety
      const type = Math.random();
      if (type < 0.3) {
        // Small dash
        this.marks.push({
          baseX: i * markSpacing,
          y: 4 + Math.random() * 3,
          width: 2 + Math.random() * 4,
          height: 1,
        });
      } else if (type < 0.5) {
        // Tall tick
        this.marks.push({
          baseX: i * markSpacing,
          y: 3,
          width: 1,
          height: 3 + Math.random() * 4,
        });
      } else if (type < 0.6) {
        // Double dash
        this.marks.push({
          baseX: i * markSpacing,
          y: 4,
          width: 6 + Math.random() * 8,
          height: 1,
        });
        this.marks.push({
          baseX: i * markSpacing + 2,
          y: 7,
          width: 4 + Math.random() * 4,
          height: 1,
        });
      }
    }
    this.markCycleWidth = numMarks * markSpacing;
  }

  setScrollOffset(offset) {
    this.scrollOffset = offset % this.markCycleWidth;
  }

  draw() {
    super.draw();
    this.line.render();

    // Draw scrolling ground texture
    Painter.useCtx((ctx) => {
      ctx.fillStyle = CONFIG.theme.textDim;
      const startX = -this.groundWidth / 2;
      this.marks.forEach(m => {
        // Calculate scrolled position
        let x = startX + m.baseX - this.scrollOffset;
        // Wrap around
        while (x < startX - 20) x += this.markCycleWidth;
        while (x > startX + this.groundWidth) x -= this.markCycleWidth;
        ctx.fillRect(x, m.y, m.width, m.height);
      });
    });
  }
}

// ==================== Tron Clouds ====================
/**
 * TronClouds - Parallax cloud layer with Tron/grid aesthetic
 */
class TronClouds extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.cloudWidth = game.width * 2;
    this.scrollOffset = 0;

    // Generate cloud grid lines
    this.gridLines = [];
    this.glowLines = [];

    // Horizontal scan lines (main cloud layer)
    const numLines = 8;
    for (let i = 0; i < numLines; i++) {
      const y = -150 + i * 25 + (Math.random() - 0.5) * 10;
      const segments = [];

      // Create broken line segments for cloud effect
      let x = 0;
      while (x < this.cloudWidth) {
        if (Math.random() > 0.4) {
          const segWidth = 50 + Math.random() * 150;
          const opacity = 0.1 + Math.random() * 0.3;
          segments.push({
            x: x - this.cloudWidth / 2,
            width: segWidth,
            opacity,
            glow: Math.random() > 0.7,
          });
        }
        x += 30 + Math.random() * 80;
      }

      this.gridLines.push({ y, segments });
    }

    // Vertical grid lines (sparse, for depth)
    const numVerticals = 12;
    for (let i = 0; i < numVerticals; i++) {
      const x = (i / numVerticals) * this.cloudWidth - this.cloudWidth / 2;
      if (Math.random() > 0.5) {
        this.glowLines.push({
          x,
          y1: -180 + Math.random() * 30,
          y2: -80 + Math.random() * 40,
          opacity: 0.05 + Math.random() * 0.15,
        });
      }
    }
  }

  setScrollOffset(offset) {
    this.scrollOffset = offset % this.cloudWidth;
  }

  draw() {
    super.draw();

    Painter.useCtx((ctx) => {
      const baseX = -this.scrollOffset;

      // Draw vertical grid lines
      ctx.strokeStyle = CONFIG.theme.primary;
      this.glowLines.forEach(line => {
        let x = line.x + baseX;
        // Wrap
        while (x < -this.cloudWidth / 2) x += this.cloudWidth;
        while (x > this.cloudWidth / 2) x -= this.cloudWidth;

        ctx.globalAlpha = line.opacity;
        ctx.beginPath();
        ctx.moveTo(x, line.y1);
        ctx.lineTo(x, line.y2);
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw horizontal cloud lines
      this.gridLines.forEach(line => {
        line.segments.forEach(seg => {
          let x = seg.x + baseX;
          // Wrap
          while (x < -this.cloudWidth / 2 - 200) x += this.cloudWidth;
          while (x > this.cloudWidth / 2 + 200) x -= this.cloudWidth;

          // Glow effect
          if (seg.glow) {
            ctx.globalAlpha = seg.opacity * 0.3;
            ctx.fillStyle = CONFIG.theme.primary;
            ctx.fillRect(x - 2, line.y - 2, seg.width + 4, 5);
          }

          // Main line
          ctx.globalAlpha = seg.opacity;
          ctx.fillStyle = CONFIG.theme.primary;
          ctx.fillRect(x, line.y, seg.width, 1);
        });
      });

      // Add some "data" dots traveling along lines
      const time = Date.now() / 1000;
      ctx.fillStyle = CONFIG.theme.primary;
      for (let i = 0; i < 5; i++) {
        const lineIdx = i % this.gridLines.length;
        const line = this.gridLines[lineIdx];
        if (line.segments.length > 0) {
          const seg = line.segments[i % line.segments.length];
          const dotX = seg.x + baseX + ((time * 50 * (i + 1)) % seg.width);
          let x = dotX;
          while (x < -this.cloudWidth / 2 - 200) x += this.cloudWidth;
          while (x > this.cloudWidth / 2 + 200) x -= this.cloudWidth;

          ctx.globalAlpha = 0.8;
          ctx.fillRect(x, line.y - 1, 3, 3);
        }
      }

      ctx.globalAlpha = 1;
    });
  }
}

// ==================== AutoScrollScene ====================
/**
 * AutoScrollScene - A PlatformerScene for endless runner
 * Full screen centered layout
 */
class AutoScrollScene extends PlatformerScene {
  constructor(game, options = {}) {
    super(game, {
      ...options,
      autoInput: false,
    });
    this.scrollSpeed = options.scrollSpeed || CONFIG.scrollSpeed;
  }

  updateCamera(dt) {
    // No camera following in endless runner
  }

  getCameraOffset() {
    return { x: 0, y: 0 };
  }
}

// ==================== DinoGame ====================
/**
 * DinoGame - Vercel/Terminal aesthetic endless runner
 */
class DinoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.theme.background;
    this.enableFluidSize();
  }

  init() {
    super.init();
    SFX.init();
    this.setupGame();
    this.setupInput();
  }

  setupGame() {
    // Game state
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('dinoHighScore') || '0');
    this.scrollSpeed = CONFIG.scrollSpeed;
    this.gameOver = false;
    this.gameStarted = false;
    this.distance = 0;
    this.nextCactusSpawn = this.getRandomSpawnTime();
    this.cacti = [];

    // Calculate ground Y - centered vertically, slightly below center
    this.groundY = this.height * 0.65;

    // Create player at left side of screen
    this.dino = new Dino(this, {
      x: this.width * 0.15,
      y: this.groundY - 27,
    });

    // Create platformer scene - full screen at origin
    this.level = new AutoScrollScene(this, {
      player: this.dino,
      gravity: CONFIG.gravity,
      jumpVelocity: CONFIG.jumpVelocity,
      groundY: this.groundY - 27,
      scrollSpeed: this.scrollSpeed,
      x: 0,
      y: 0,
    });

    // Add Tron-style clouds (slow parallax)
    this.clouds = new TronClouds(this, {
      x: this.width / 2,
      y: this.groundY - 100,
    });
    this.level.addLayer(this.clouds, { speed: 0.3 });

    // Add ground - spans full width
    this.ground = new Ground(this, {
      x: this.width / 2,
      y: this.groundY,
      width: this.width * 3,
    });
    this.level.addLayer(this.ground, { speed: 0 });

    // Add player to scene
    this.level.add(this.dino);

    this.pipeline.add(this.level);

    // UI Elements
    this.createUI();

    // FPS counter
    this.pipeline.add(
      new FPSCounter(this, {
        color: CONFIG.theme.textDim,
        anchor: Position.BOTTOM_RIGHT,
        anchorOffsetX: 10,
        anchorOffsetY: -10,
      })
    );
  }

  createUI() {
    // Score display (top right)
    this.scoreText = new Text(this, "00000", {
      font: "bold 24px 'Courier New', monospace",
      color: CONFIG.theme.primary,
      align: "right",
      anchor: Position.BOTTOM_LEFT,
      anchorOffsetX: -30,
      anchorOffsetY: 30,
    });
    this.pipeline.add(this.scoreText);

    // High score (next to score)
    this.highScoreText = new Text(this, this.highScore > 0 ? `HI ${String(this.highScore).padStart(5, "0")}` : "", {
      font: "16px 'Courier New', monospace",
      color: CONFIG.theme.textDim,
      align: "right",
      anchor: Position.TOP_RIGHT,
      anchorOffsetX: -30,
      anchorOffsetY: 55,
    });
    this.pipeline.add(this.highScoreText);

    // Start message - centered
    this.startText = new Text(this, "[ PRESS SPACE TO START ]", {
      font: "18px 'Courier New', monospace",
      color: CONFIG.theme.primary,
      align: "center",
      anchor: Position.CENTER,
    });
    this.pipeline.add(this.startText);

    // Subtitle
    this.subtitleText = new Text(this, "avoid the obstacles", {
      font: "14px 'Courier New', monospace",
      color: CONFIG.theme.textDim,
      align: "center",
      anchor: Position.CENTER,
      anchorOffsetY: 30,
    });
    this.pipeline.add(this.subtitleText);

    // Game over text (hidden)
    this.gameOverText = new Text(this, "GAME OVER", {
      font: "bold 36px 'Courier New', monospace",
      color: CONFIG.theme.primary,
      align: "center",
      anchor: Position.CENTER,
      anchorOffsetY: -30,
      visible: false,
    });
    this.pipeline.add(this.gameOverText);

    // Restart instruction (hidden)
    this.restartText = new Text(this, "[ PRESS SPACE TO RESTART ]", {
      font: "16px 'Courier New', monospace",
      color: CONFIG.theme.textDim,
      align: "center",
      anchor: Position.CENTER,
      anchorOffsetY: 20,
      visible: false,
    });
    this.pipeline.add(this.restartText);

    // Final score text (hidden)
    this.finalScoreText = new Text(this, "", {
      font: "20px 'Courier New', monospace",
      color: CONFIG.theme.text,
      align: "center",
      anchor: Position.CENTER,
      anchorOffsetY: 60,
      visible: false,
    });
    this.pipeline.add(this.finalScoreText);
  }

  setupInput() {
    this.events.on(Keys.SPACE, () => this.handleJump());
    this.events.on(Keys.UP, () => this.handleJump());
    this.events.on(Keys.W, () => this.handleJump());
  }

  async handleJump() {
    // Resume audio on first interaction
    await SFX.resume();

    if (this.gameOver) {
      this.restartGame();
      return;
    }

    if (!this.gameStarted) {
      this.startGame();
      return;
    }

    if (this.level.isPlayerGrounded()) {
      this.dino.vy = CONFIG.jumpVelocity;
      this.dino._grounded = false;
      SFX.jump();
    }
  }

  startGame() {
    this.gameStarted = true;
    this.startText.visible = false;
    this.subtitleText.visible = false;
    SFX.start();
  }

  restartGame() {
    // Save high score to localStorage
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('dinoHighScore', String(this.highScore));
    }

    // Clear and restart
    this.pipeline.clear();
    this.setupGame();

    // Auto-start after game over
    this.gameStarted = true;
    this.startText.visible = false;
    this.subtitleText.visible = false;
  }

  getRandomSpawnTime() {
    return CONFIG.cactusSpawnMinInterval +
      Math.random() * (CONFIG.cactusSpawnMaxInterval - CONFIG.cactusSpawnMinInterval);
  }

  update(dt) {
    if (!this.gameStarted || this.gameOver) {
      // Blinking effect for start text
      if (!this.gameStarted && this.startText) {
        const blink = Math.sin(Date.now() / 500) > 0;
        this.startText.opacity = blink ? 1 : 0.5;
      }
      super.update(dt);
      return;
    }

    // Update distance/score
    this.distance += this.scrollSpeed * dt;
    this.score = Math.floor(this.distance / 10);
    this.scoreText.text = String(this.score).padStart(5, "0");

    // Update scroll offsets for ground and clouds
    if (this.ground) {
      this.ground.setScrollOffset(this.distance);
    }
    if (this.clouds) {
      this.clouds.setScrollOffset(this.distance * 0.3); // Slower parallax
    }

    // Milestone flash effect (every 100 points)
    if (this.score > 0 && this.score % 100 === 0 && !this._lastMilestone) {
      this._lastMilestone = this.score;
      this.scoreText.color = CONFIG.theme.text;
      SFX.milestone();
      setTimeout(() => {
        if (this.scoreText) this.scoreText.color = CONFIG.theme.primary;
      }, 100);
    } else if (this.score % 100 !== 0) {
      this._lastMilestone = null;
    }

    // Increase speed over time
    this.scrollSpeed = Math.min(
      CONFIG.maxScrollSpeed,
      this.scrollSpeed + CONFIG.scrollAcceleration * dt
    );

    // Spawn cacti
    this.nextCactusSpawn -= dt;
    if (this.nextCactusSpawn <= 0) {
      this.spawnCactus();
      this.nextCactusSpawn = this.getRandomSpawnTime();
    }

    // Update cacti and check collisions
    for (let i = this.cacti.length - 1; i >= 0; i--) {
      const cactus = this.cacti[i];
      cactus.x -= this.scrollSpeed * dt;

      // Remove off-screen
      if (cactus.x < -100) {
        this.level.remove(cactus);
        this.cacti.splice(i, 1);
        continue;
      }

      // Collision check
      if (Collision.rectRect(this.dino.getBounds(), cactus.getBounds())) {
        this.triggerGameOver();
        break;
      }
    }

    super.update(dt);
  }

  spawnCactus() {
    const cactusHeight = CONFIG.cactusMinHeight +
      Math.random() * (CONFIG.cactusMaxHeight - CONFIG.cactusMinHeight);

    const cactus = new Cactus(this, {
      x: this.width + 50,
      y: this.groundY - cactusHeight / 2,
      height: cactusHeight,
    });

    this.cacti.push(cactus);
    this.level.add(cactus);
  }

  triggerGameOver() {
    this.gameOver = true;
    this.gameOverText.visible = true;
    this.restartText.visible = true;
    this.finalScoreText.visible = true;
    this.finalScoreText.text = `SCORE: ${this.score}`;
    SFX.gameOver();

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.highScoreText.text = `HI ${String(this.highScore).padStart(5, "0")}`;
      localStorage.setItem('dinoHighScore', String(this.highScore));
    }
  }

  onResize() {
    // Recalculate positions on resize
    if (this.dino) {
      this.groundY = this.height * 0.65;
      this.dino.x = this.width * 0.15;
      this.level.groundY = this.groundY - 27;
      if (this.ground) {
        this.ground.x = this.width / 2;
        this.ground.y = this.groundY;
      }
      if (this.clouds) {
        this.clouds.x = this.width / 2;
        this.clouds.y = this.groundY - 100;
      }
    }
  }
}

// ==================== Initialize ====================
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new DinoGame(canvas);
  game.start();
});

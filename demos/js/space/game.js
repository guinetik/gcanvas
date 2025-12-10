import {
  Game,
  TextShape,
  Keys,
  FPSCounter,
  Synth,
  Sound,
  Button,
  ToggleButton,
} from "../../../src/index.js";

// Import constants
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  BULLET_SPEED,
  ALIEN_BASE_ROWS,
  ALIEN_COLS,
  MAX_ALIEN_ROWS,
  ALIEN_WIDTH,
  ALIEN_HEIGHT,
  ALIEN_SPACING_X,
  ALIEN_SPACING_Y,
  ALIEN_MOVE_SPEED,
  ALIEN_DROP_DISTANCE,
  ALIEN_SHOOT_CHANCE,
  ALIEN_BULLET_SPEED,
  POWERUP_SPAWN_CHANCE,
  STARPOWER_SPAWN_CHANCE,
  POWERUP_SIZE,
  MISSILE_SPAWN_CHANCE,
  MISSILE_HEIGHT,
  BOSS_LEVELS,
  LASER_SPAWN_CHANCE,
  LIGHTNING_SPAWN_CHANCE,
} from "./constants.js";

// Import game components
import { Player } from "./player.js";
import { Alien } from "./alien.js";
import { Bullet } from "./bullet.js";
import { Explosion } from "./boom.js";
import { AbsorbEffect } from "./buff.js";
import { PowerUp } from "./powerup.js";
import { StarPowerUp } from "./starpower.js";
import { Missile } from "./missile.js";
import { HUD } from "./hud.js";
import { Starfield } from "./starfield.js";
import { Boss } from "./boss.js";
import { BossMinion } from "./minion.js";
import { LaserBeam } from "./laserbeam.js";
import { Lightning } from "./lightning.js";

export class SpaceGame extends Game {
  constructor(canvas) {
    super(canvas);
    // Enable fluid sizing for fullscreen display
    this.enableFluidSize();
    this.backgroundColor = "#000011";

    // Handle window resize - reset game to ready state
    this._resizeHandler = () => this.handleResize();
    window.addEventListener("resize", this._resizeHandler);
  }

  handleResize() {
    // Only reset if game has been initialized
    if (!this._spaceGameInitialized) return;

    // Clear all game objects and reset to ready state
    this.resetToReady();
  }

  stop() {
    // Clean up resize listener
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    super.stop();
  }

  resetToReady() {
    // Clear all collections
    for (const bullet of this.bullets) {
      this.pipeline.remove(bullet);
    }
    this.bullets = [];

    for (const alien of this.aliens) {
      this.pipeline.remove(alien);
    }
    this.aliens = [];

    for (const explosion of this.explosions) {
      this.pipeline.remove(explosion);
    }
    this.explosions = [];

    for (const powerup of this.powerups) {
      this.pipeline.remove(powerup);
    }
    this.powerups = [];

    for (const missile of this.missiles) {
      this.pipeline.remove(missile);
    }
    this.missiles = [];

    for (const laser of this.laserBeams) {
      this.pipeline.remove(laser);
    }
    this.laserBeams = [];

    for (const lightning of this.lightnings) {
      this.pipeline.remove(lightning);
    }
    this.lightnings = [];

    for (const minion of this.minions) {
      this.pipeline.remove(minion);
    }
    this.minions = [];

    if (this.boss) {
      this.pipeline.remove(this.boss);
      this.boss = null;
    }

    // Remove play button if exists
    if (this.playButton) {
      this.pipeline.remove(this.playButton);
      this.playButton = null;
    }

    // Reset game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameState = "ready";
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.alienMoveInterval = this.baseMoveInterval;
    this.countdownText.text = "";

    // Reset gauntlet state
    this.isGauntletMode = false;
    this.gauntletPhase = 0;

    // Reposition player
    this.player.x = this.width / 2;
    this.player.y = this.height - 90;
    this.player.visible = true;
    this.player.opacity = 1;
    this.player.canShoot = true;
    this.player.starPower = false;
    this.player.starPowerTimer = 0;
    // Reset all upgrades and ship colors
    this.player.resetUpgrades();

    // Reposition HUD elements
    this.hud.hideMessage();

    // Reposition countdown text
    this.countdownText.x = this.width / 2;
    this.countdownText.y = this.height / 2;

    // Reposition sound button
    this.soundButton.x = this.width - 50;
    this.soundButton.y = this.height - 25;

    // Respawn aliens for new screen size
    this.spawnAliens();

    // Create new play button centered
    this.playButton = new Button(this, {
      x: this.width / 2,
      y: this.height / 2,
      width: 200,
      height: 60,
      text: "PLAY",
      font: "bold 24px monospace",
      colorDefaultBg: "#003300",
      colorDefaultStroke: "#00ff00",
      colorDefaultText: "#00ff00",
      colorHoverBg: "#004400",
      colorHoverStroke: "#44ff44",
      colorHoverText: "#44ff44",
      colorPressedBg: "#002200",
      colorPressedStroke: "#00aa00",
      colorPressedText: "#00aa00",
      onClick: () => this.startPlaying(),
    });
    this.pipeline.add(this.playButton);
  }

  init() {
    // Prevent re-initialization on resume from alt-tab
    if (this._spaceGameInitialized) {
      return;
    }
    this._spaceGameInitialized = true;

    super.init();
    this.initKeyboard();
    this.initAudio();

    // Game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameState = "ready"; // ready, countdown, playing, gameover, win, levelcomplete, flyoff, flyin
    this.countdownValue = 3; // 3, 2, 1, then "GO!"
    this.countdownTimer = 0;
    this.alienDirection = 1; // 1 = right, -1 = left
    this.alienMoveTimer = 0;
    this.alienMoveInterval = 1; // seconds between moves
    this.levelStartY = 80;
    this.audioResumed = false;
    this.baseMoveInterval = 1; // Base seconds between moves (decreases with level)
    this.alienMoveInterval = this.baseMoveInterval;
    this.levelStartY = 170; // Below title and score display
    this.levelTransitionTimer = 0;
    this.shipAnimationTimer = 0;
    this.shipStartY = 0; // For fly-in animation
    this.levelPlayTime = 0; // Time spent in current level (for escalating difficulty)

    // Gauntlet mode state (Level 10 - final challenge)
    // Phases: wave1 → boss1 → wave2 → boss2 → wave3 → boss3 → victory
    this.gauntletPhase = 0; // 0-5 (0,2,4 = waves, 1,3,5 = bosses)
    this.isGauntletMode = false;

    // Collections
    this.bullets = [];
    this.aliens = [];
    this.explosions = [];
    this.powerups = [];
    this.missiles = [];
    this.laserBeams = [];
    this.lightnings = [];
    this.minions = [];
    this.boss = null;

    // Create starfield background
    this.starfield = new Starfield(this);
    this.pipeline.add(this.starfield);

    // Create player at bottom center (use actual canvas dimensions)
    this.player = new Player(this, {
      x: this.width / 2,
      y: this.height - 90,
    });
    this.pipeline.add(this.player);

    // Create aliens
    this.spawnAliens();

    // Create HUD
    this.hud = new HUD(this);
    this.pipeline.add(this.hud);

    // Create countdown text (hidden initially)
    this.countdownText = new TextShape("", {
      font: "bold 120px monospace",
      color: "#00ff00",
      align: "center",
      baseline: "middle",
      zIndex: 1000,
    });
    this.countdownText.x = this.width / 2;
    this.countdownText.y = this.height / 2;
    this.pipeline.add(this.countdownText);

    // Create play button for start screen
    this.playButton = new Button(this, {
      x: this.width / 2,
      y: this.height / 2,
      width: 200,
      height: 60,
      text: "PLAY",
      font: "bold 24px monospace",
      colorDefaultBg: "#003300",
      colorDefaultStroke: "#00ff00",
      colorDefaultText: "#00ff00",
      colorHoverBg: "#004400",
      colorHoverStroke: "#44ff44",
      colorHoverText: "#44ff44",
      colorPressedBg: "#002200",
      colorPressedStroke: "#00aa00",
      colorPressedText: "#00aa00",
      onClick: () => this.startPlaying(),
    });
    this.pipeline.add(this.playButton);

    // FPS counter
    this.fpsCounter = new FPSCounter(this, {
      color: "#666666",
      anchor: "bottom-left",
    });
    this.pipeline.add(this.fpsCounter);

    // Sound toggle button (bottom right)
    this.soundEnabled = true;
    this.soundButton = new ToggleButton(this, {
      x: this.width - 50,
      y: this.height - 25,
      width: 80,
      height: 30,
      text: "🔊 ON",
      font: "12px monospace",
      startToggled: true,
      colorDefaultBg: "#222",
      colorDefaultStroke: "#444",
      colorDefaultText: "#666",
      colorActiveBg: "#222",
      colorActiveStroke: "#0f0",
      colorActiveText: "#0f0",
      colorHoverBg: "#333",
      colorHoverStroke: "#666",
      colorHoverText: "#0f0",
      onToggle: (isOn) => {
        this.soundEnabled = isOn;
        this.soundButton.text = isOn ? "🔊 ON" : "🔇 OFF";
      },
    });
    this.pipeline.add(this.soundButton);

    // Debug commands for testing
    this.setupDebugCommands();
  }

  /**
   * Setup window debug commands for testing
   */
  setupDebugCommands() {
    const game = this;

    // Skip to gauntlet boss (0, 1, or 2)
    window.skipToBoss = (bossIndex = 0) => {
      // Clear everything
      game.clearAllEntities();

      // Set up gauntlet state
      game.level = 10;
      game.isGauntletMode = true;
      game.gauntletPhase = bossIndex * 2; // Phase before boss (0, 2, or 4)
      game.gameState = "bossfight";

      // Give player all upgrades
      game.player.applyUpgrade("speed1");
      game.player.applyUpgrade("firerate1");
      game.player.applyUpgrade("speed2");
      game.player.applyUpgrade("tripleshot");
      game.player.applyUpgrade("shield");

      // Position player
      game.player.x = game.width / 2;
      game.player.y = game.height - 90;
      game.player.visible = true;
      game.player.opacity = 1;
      game.player.canShoot = true;

      // Spawn the boss
      game.spawnGauntletBoss(bossIndex);
      game.hud.hideMessage();

      console.log(`Skipped to gauntlet boss ${bossIndex + 1}`);
    };

    // Skip to specific level
    window.skipToLevel = (level) => {
      game.clearAllEntities();

      game.level = level;
      game.isGauntletMode = false;
      game.gauntletPhase = 0;
      game.gameState = "playing";

      // Apply upgrades based on level
      if (level > 3) game.player.applyUpgrade("speed1");
      if (level > 4) game.player.applyUpgrade("firerate1");
      if (level > 5) game.player.applyUpgrade("speed2");
      if (level > 6) game.player.applyUpgrade("tripleshot");
      if (level > 9) game.player.applyUpgrade("shield");

      // Position player
      game.player.x = game.width / 2;
      game.player.y = game.height - 90;
      game.player.visible = true;
      game.player.opacity = 1;
      game.player.canShoot = true;

      game.spawnAliens();
      game.hud.hideMessage();

      console.log(`Skipped to level ${level}`);
    };

    // Skip to gauntlet mode (start of level 10)
    window.skipToGauntlet = () => {
      game.clearAllEntities();

      game.level = 10;
      game.isGauntletMode = true;
      game.gauntletPhase = 0;
      game.gameState = "playing";

      // Give all upgrades
      game.player.applyUpgrade("speed1");
      game.player.applyUpgrade("firerate1");
      game.player.applyUpgrade("speed2");
      game.player.applyUpgrade("tripleshot");
      game.player.applyUpgrade("shield");

      // Position player
      game.player.x = game.width / 2;
      game.player.y = game.height - 90;
      game.player.visible = true;
      game.player.opacity = 1;
      game.player.canShoot = true;

      game.spawnGauntletWave();
      game.hud.hideMessage();

      console.log("Skipped to gauntlet (level 10)");
    };

    console.log("Debug commands available: skipToBoss(0-2), skipToLevel(1-9), skipToGauntlet()");
  }

  /**
   * Clear all game entities (used by debug commands)
   */
  clearAllEntities() {
    for (const bullet of this.bullets) this.pipeline.remove(bullet);
    this.bullets = [];

    for (const alien of this.aliens) this.pipeline.remove(alien);
    this.aliens = [];

    for (const explosion of this.explosions) this.pipeline.remove(explosion);
    this.explosions = [];

    for (const powerup of this.powerups) this.pipeline.remove(powerup);
    this.powerups = [];

    for (const missile of this.missiles) this.pipeline.remove(missile);
    this.missiles = [];

    for (const laser of this.laserBeams) this.pipeline.remove(laser);
    this.laserBeams = [];

    for (const lightning of this.lightnings) this.pipeline.remove(lightning);
    this.lightnings = [];

    for (const minion of this.minions) this.pipeline.remove(minion);
    this.minions = [];

    if (this.boss) {
      this.pipeline.remove(this.boss);
      this.boss = null;
    }

    if (this.playButton) {
      this.pipeline.remove(this.playButton);
      this.playButton = null;
    }
  }

  playSound(soundFn, ...args) {
    if (this.soundEnabled) {
      soundFn(...args);
    }
  }

  initAudio() {
    // Initialize the Synth audio system
    Synth.init({ masterVolume: 0.4 });
    this.logger.log("[SpaceGame] Audio system initialized");
  }

  async resumeAudio() {
    if (!this.audioResumed) {
      await Synth.resume();
      // Play a silent warmup sound to prime the audio pipeline
      Sound.beep(1, 0.01, { volume: 0.001 });
      // Small delay to let the audio pipeline fully initialize
      await new Promise(resolve => setTimeout(resolve, 50));
      this.audioResumed = true;
      this.logger.log("[SpaceGame] Audio context resumed and warmed up");
    }
  }

  spawnAliens() {
    // Clear existing aliens
    for (const alien of this.aliens) {
      this.pipeline.remove(alien);
    }
    this.aliens = [];

    // Calculate rows based on level (starts at 4, increases every 2 levels, max 8)
    const alienRows = Math.min(MAX_ALIEN_ROWS, ALIEN_BASE_ROWS + Math.floor((this.level - 1) / 2));

    // Calculate starting position to center the alien grid
    const gridWidth = ALIEN_COLS * ALIEN_SPACING_X;
    const startX = (this.width - gridWidth) / 2 + ALIEN_SPACING_X / 2;

    // Adjust starting Y based on level - aliens start lower on higher levels
    const levelStartOffset = Math.min(50, (this.level - 1) * 10);
    const startY = this.levelStartY + levelStartOffset;

    for (let row = 0; row < alienRows; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        // Assign row type - distribute all types across rows
        // row=0 → squid, row=1-2 → crab, row=3+ → octopus (matches Alien.createShape logic)
        let rowType;
        if (row < 2) {
          rowType = 0; // Top 2 rows = squid (30pts)
        } else if (row < Math.max(3, Math.floor(alienRows * 0.5))) {
          rowType = 1; // Middle rows = crab (20pts) - at least row 2
        } else {
          rowType = 3; // Bottom rows = octopus (10pts)
        }

        const alien = new Alien(this, {
          x: startX + col * ALIEN_SPACING_X,
          y: startY + row * ALIEN_SPACING_Y,
          row: rowType,
          col: col,
        });
        this.aliens.push(alien);
        this.pipeline.add(alien);
      }
    }

    // Calculate level-based speed multiplier
    // Each level is 15% faster, compounding
    const levelSpeedMultiplier = Math.pow(1.15, this.level - 1);
    this.baseMoveInterval = Math.max(0.3, 1 / levelSpeedMultiplier);
    this.alienMoveInterval = this.baseMoveInterval;
  }

  spawnPlayerBullet(x, y, angle = 0) {
    const bullet = new Bullet(this, {
      x: x,
      y: y,
      speed: BULLET_SPEED,
      direction: -1,
      angle: angle, // Angle in degrees (0 = straight up, negative = left, positive = right)
      isPlayerBullet: true,
    });
    this.bullets.push(bullet);
    this.pipeline.add(bullet);

    // Play laser sound (only for center bullet to avoid triple sound)
    if (angle === 0) {
      this.resumeAudio();
      if (this.soundEnabled) Sound.laser({ startFreq: 1500, endFreq: 300, duration: 0.1, volume: 0.2 });
    }
  }

  spawnAlienBullet(x, y) {
    const bullet = new Bullet(this, {
      x: x,
      y: y,
      speed: ALIEN_BULLET_SPEED,
      direction: 1,
      isPlayerBullet: false,
    });
    this.bullets.push(bullet);
    this.pipeline.add(bullet);

    // Play alien laser sound (lower, more menacing)
    if (this.soundEnabled) Sound.laser({ startFreq: 600, endFreq: 200, duration: 0.12, volume: 0.15, type: "square" });
  }

  spawnExplosion(x, y, color, isPlayer = false) {
    const explosion = new Explosion(this, {
      x: x,
      y: y,
      color: color,
    });
    this.explosions.push(explosion);
    this.pipeline.add(explosion);

    // Play explosion sound - different for player vs alien
    if (this.soundEnabled) {
      if (isPlayer) {
        Sound.explosion(0.8);
      } else {
        // Alien explosion - higher pitched, shorter
        Sound.impact(0.6);
        Sound.beep(200 + Math.random() * 100, 0.08, { volume: 0.15, type: "square" });
      }
    }
  }

  spawnPowerUp() {
    // Spawn at random X position at top of screen
    const powerup = new PowerUp(this, {
      x: POWERUP_SIZE + Math.random() * (this.width - POWERUP_SIZE * 2),
      y: -POWERUP_SIZE,
    });
    this.powerups.push(powerup);
    this.pipeline.add(powerup);
  }

  spawnStarPower() {
    // Spawn golden star power-up at random X position
    const starpower = new StarPowerUp(this, {
      x: POWERUP_SIZE + Math.random() * (this.width - POWERUP_SIZE * 2),
      y: -POWERUP_SIZE,
    });
    this.powerups.push(starpower);
    this.pipeline.add(starpower);
  }

  spawnMissile() {
    // Always spawn from the top - left, middle, or right
    const spawnZone = Math.random();
    let startX, startY;

    startY = -MISSILE_HEIGHT; // Always from top

    if (spawnZone < 0.33) {
      // Top left
      startX = 30 + Math.random() * (this.width / 3 - 60);
    } else if (spawnZone < 0.66) {
      // Top middle
      startX = this.width / 3 + Math.random() * (this.width / 3);
    } else {
      // Top right
      startX = (this.width * 2 / 3) + Math.random() * (this.width / 3 - 30);
    }

    const missile = new Missile(this, {
      x: startX,
      y: startY,
      targetX: this.player.x,
      targetY: this.player.y,
    });
    this.missiles.push(missile);
    this.pipeline.add(missile);

    // Warning sound
    if (this.soundEnabled) {
      Sound.beep(400, 0.1, { volume: 0.2, type: "sawtooth" });
    }
  }

  spawnLaserBeam(targetX = null) {
    // Use provided X or random position
    const x = targetX !== null
      ? Math.max(50, Math.min(this.width - 50, targetX)) // Clamp to screen
      : 80 + Math.random() * (this.width - 160); // Random, avoiding edges

    const laser = new LaserBeam(this, { x });
    this.laserBeams.push(laser);
    this.pipeline.add(laser);

    // Warning sound - high pitch zap
    if (this.soundEnabled) {
      Sound.beep(1200, 0.15, { volume: 0.25, type: "sine" });
    }
  }

  spawnLightning() {
    const lightning = new Lightning(this, {});
    this.lightnings.push(lightning);
    this.pipeline.add(lightning);

    // Thunder crack sound
    if (this.soundEnabled) {
      // Start with high frequency crack
      Sound.beep(2000, 0.08, { volume: 0.3, type: "sawtooth" });
      // Follow with rumble
      setTimeout(() => {
        Sound.beep(80, 0.3, { volume: 0.25, type: "sawtooth" });
      }, 80);
    }
  }

  spawnAbsorbEffect(x, y, color) {
    const effect = new AbsorbEffect(this, {
      x: x,
      y: y,
      color: color,
      targetX: this.player.x,
      targetY: this.player.y,
    });
    this.explosions.push(effect); // Reuse explosions array for effects
    this.pipeline.add(effect);
  }

  /**
   * Spawn a boss based on the current level
   * Level 3 = Squid boss (type 0)
   * Level 6 = Crab boss (type 1)
   * Level 9 = Octopus boss (type 2)
   */
  spawnBoss() {
    // Determine boss type based on which boss level this is
    const bossIndex = BOSS_LEVELS.indexOf(this.level);
    const bossType = bossIndex >= 0 ? bossIndex : 0;

    this.boss = new Boss(this, {
      x: this.width / 2,
      y: -100, // Start above screen
      bossType: bossType,
      targetY: 320, // Where boss will stop after entry animation (below game title)
    });
    this.pipeline.add(this.boss);

    // Warning sound for boss entrance
    if (this.soundEnabled) {
      Sound.beep(200, 0.3, { volume: 0.3, type: "sawtooth" });
      setTimeout(() => Sound.beep(150, 0.3, { volume: 0.3, type: "sawtooth" }), 300);
      setTimeout(() => Sound.beep(100, 0.5, { volume: 0.4, type: "sawtooth" }), 600);
    }
  }

  /**
   * Spawn a missile from boss position toward player
   */
  spawnBossMissile(x, y) {
    const missile = new Missile(this, {
      x: x,
      y: y,
      targetX: this.player.x,
      targetY: this.player.y,
    });
    this.missiles.push(missile);
    this.pipeline.add(missile);

    // Warning sound
    if (this.soundEnabled) {
      Sound.beep(300, 0.1, { volume: 0.2, type: "sawtooth" });
    }
  }

  /**
   * Spawn a boss minion that floats to a position near the boss
   */
  spawnBossMinion(startX, startY, targetX, targetY, minionType) {
    // Spawn minions closer to the boss - within 150px horizontally, 50-120px below
    const bossX = this.boss ? this.boss.x : this.width / 2;
    const bossY = this.boss ? this.boss.y : 170;
    const closeTargetX = bossX + (Math.random() - 0.5) * 300; // ±150px from boss
    const closeTargetY = bossY + 50 + Math.random() * 70; // 50-120px below boss

    const minion = new BossMinion(this, {
      x: startX,
      y: startY,
      startX: startX,
      startY: startY,
      targetX: Math.max(50, Math.min(this.width - 50, closeTargetX)),
      targetY: closeTargetY,
      minionType: minionType,
      boss: this.boss,
    });
    this.minions.push(minion);
    this.pipeline.add(minion);

    // Spawn sound
    if (this.soundEnabled) {
      Sound.beep(600, 0.1, { volume: 0.15, type: "square" });
    }
  }

  update(dt) {
    super.update(dt);

    // Resume audio on any key press (browser autoplay policy)
    if (!this.audioResumed && (Keys.isDown(Keys.SPACE) || Keys.isDown(Keys.LEFT) || Keys.isDown(Keys.RIGHT))) {
      this.resumeAudio();
    }

    // Handle ready state - waiting for player to click play button
    if (this.gameState === "ready") {
      // Button handles the click, just wait
      return;
    }

    // Handle ship flying off screen after level complete
    if (this.gameState === "flyoff") {
      this.shipAnimationTimer += dt;
      const flyOffDuration = 0.8; // 0.8 seconds to fly off
      const progress = Math.min(1, this.shipAnimationTimer / flyOffDuration);

      // Ease in cubic for acceleration
      const eased = Math.pow(progress, 2);

      // Move from current position to off-screen
      const startY = this.height - 90;
      const targetY = -80;
      this.player.y = startY + (targetY - startY) * eased;

      // When ship is off screen, start next level with fly-in
      if (progress >= 1) {
        this.prepareNextLevel();
        this.gameState = "flyin";
        this.shipAnimationTimer = 0;
        this.player.y = this.height + 50; // Start below screen
        this.shipStartY = this.height - 90; // Target position
        this.hud.hideMessage();
      }
      return;
    }

    // Handle ship flying in from bottom
    if (this.gameState === "flyin") {
      this.shipAnimationTimer += dt;
      const flyInDuration = 1.0; // 1 second to fly in
      const progress = Math.min(1, this.shipAnimationTimer / flyInDuration);

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      // Interpolate from bottom to target position
      const startY = this.height + 50;
      const targetY = this.shipStartY;
      this.player.y = startY + (targetY - startY) * eased;

      // When animation complete, start playing
      if (progress >= 1) {
        this.player.y = targetY;
        this.gameState = "playing";
      }
      return;
    }

    // Handle countdown before gameplay starts
    if (this.gameState === "countdown") {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 1) {
        this.countdownTimer = 0;
        this.countdownValue--;

        if (this.countdownValue > 0) {
          // Show next number
          this.countdownText.text = String(this.countdownValue);
          if (this.soundEnabled) Sound.beep(880, 0.15, { volume: 0.4 });
        } else if (this.countdownValue === 0) {
          // Show "GO!"
          this.countdownText.text = "GO!";
          this.countdownText.color = "#ffff00"; // Yellow for GO!
          if (this.soundEnabled) Sound.beep(1320, 0.2, { volume: 0.5 });
        } else {
          // Countdown finished, start gameplay
          this.countdownText.color = "#00ff00"; // Reset color for next time
          this.beginGameplay();
        }
      }
      return;
    }

    // Handle level complete - show message then fly off
    if (this.gameState === "levelcomplete") {
      this.levelTransitionTimer += dt;
      if (this.levelTransitionTimer >= 1.5) {
        this.gameState = "flyoff";
        this.shipAnimationTimer = 0;
      }
      return;
    }

    // Handle boss fight state
    if (this.gameState === "bossfight") {
      this.updateBossFight(dt);
      return;
    }

    if (this.gameState !== "playing") {
      // Buttons handle gameover/win states
      return;
    }

    // Update aliens movement
    this.updateAliens(dt);

    // Alien shooting
    this.alienShooting();

    // Random chance to spawn power-ups (max 1 of each type on screen)
    const has1Up = this.powerups.some(p => p.active && p instanceof PowerUp);
    const hasStarPower = this.powerups.some(p => p.active && p instanceof StarPowerUp);

    if (!has1Up && Math.random() < POWERUP_SPAWN_CHANCE) {
      this.spawnPowerUp();
    }
    if (!hasStarPower && Math.random() < STARPOWER_SPAWN_CHANCE) {
      this.spawnStarPower();
    }

    // Track time in level for escalating missile danger
    this.levelPlayTime += dt;

    // Random chance to spawn homing missiles - ESCALATES over time!
    // Base chance increases with level, PLUS increases every 10 seconds within level
    const levelMultiplier = 1 + (this.level - 1) * 0.5; // +50% per level
    const timeMultiplier = 1 + (this.levelPlayTime / 10) * 0.3; // +30% every 10 seconds
    const missileChance = MISSILE_SPAWN_CHANCE * levelMultiplier * timeMultiplier;
    const maxMissiles = Math.min(5, 2 + Math.floor(this.level / 2)); // +1 max every 2 levels, cap at 5
    if (this.missiles.length < maxMissiles && Math.random() < missileChance) {
      this.spawnMissile();
    }

    // Laser beams start spawning after defeating first boss (level 4+)
    if (this.level > 3) {
      const laserMultiplier = 1 + (this.level - 4) * 0.3; // +30% per level after 4
      const laserChance = LASER_SPAWN_CHANCE * laserMultiplier * timeMultiplier;
      const maxLasers = Math.min(2, 1 + Math.floor((this.level - 3) / 3)); // Max 1-2 lasers
      if (this.laserBeams.filter(l => l.active).length < maxLasers && Math.random() < laserChance) {
        this.spawnLaserBeam();
      }
    }

    // Lightning starts spawning after defeating second boss (level 7+)
    if (this.level > 6) {
      const lightningMultiplier = 1 + (this.level - 7) * 0.25; // +25% per level after 7
      const lightningChance = LIGHTNING_SPAWN_CHANCE * lightningMultiplier * timeMultiplier;
      // Only one lightning at a time - it's dramatic!
      if (this.lightnings.filter(l => l.active).length < 1 && Math.random() < lightningChance) {
        this.spawnLightning();
      }
    }

    // Check collisions
    this.checkCollisions();

    // Check power-up collection
    this.checkPowerUpCollection();

    // Clean up dead objects
    this.cleanup();

    // Check win condition - advance to next level or start boss fight
    if (this.getAliveAliens().length === 0) {
      if (this.isGauntletMode) {
        // In gauntlet mode - wave cleared, spawn boss immediately (no interruption)
        this.advanceGauntlet();
      } else if (BOSS_LEVELS.includes(this.level)) {
        // Normal boss level
        this.startBossFight();
      } else {
        this.levelComplete();
      }
    }
  }

  /**
   * Start a boss fight after clearing all aliens on a boss level
   */
  startBossFight() {
    this.gameState = "bossfight";
    this.levelPlayTime = 0;

    // Clear any remaining bullets
    for (const bullet of this.bullets) {
      this.pipeline.remove(bullet);
    }
    this.bullets = [];

    // Show boss warning
    this.hud.showMessage("WARNING!\nBOSS INCOMING!");

    // Spawn boss after a brief delay
    setTimeout(() => {
      if (this.gameState === "bossfight") {
        this.hud.hideMessage();
        this.spawnBoss();
      }
    }, 1500);
  }

  /**
   * Update boss fight - handles boss, minions, and all combat
   */
  updateBossFight(dt) {
    // Track time for power-ups and missiles
    this.levelPlayTime += dt;

    // Power-ups still spawn during boss fight
    const has1Up = this.powerups.some(p => p.active && p instanceof PowerUp);
    const hasStarPower = this.powerups.some(p => p.active && p instanceof StarPowerUp);

    if (!has1Up && Math.random() < POWERUP_SPAWN_CHANCE) {
      this.spawnPowerUp();
    }
    if (!hasStarPower && Math.random() < STARPOWER_SPAWN_CHANCE) {
      this.spawnStarPower();
    }

    // Regular missiles also spawn during boss fight - scales with boss difficulty
    const bossType = this.boss ? this.boss.bossType : 0;
    const maxMissiles = 2 + bossType; // 2, 3, 4 max missiles
    const missileMultiplier = 1 + bossType * 0.5; // 1x, 1.5x, 2x spawn rate
    if (this.missiles.length < maxMissiles && Math.random() < MISSILE_SPAWN_CHANCE * missileMultiplier) {
      this.spawnMissile();
    }

    // Check bullet collisions with boss and minions
    this.checkBossCollisions();

    // Check power-up collection
    this.checkPowerUpCollection();

    // Clean up dead objects
    this.cleanup();
    this.cleanupMinions();

    // Check if boss is defeated
    if (this.boss && !this.boss.active) {
      this.bossDefeated();
    }
  }

  /**
   * Check collisions during boss fight
   */
  checkBossCollisions() {
    const playerBounds = {
      x: this.player.x - PLAYER_WIDTH / 2,
      y: this.player.y - PLAYER_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    };

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      const bulletBounds = bullet.getBounds();

      if (bullet.isPlayerBullet) {
        // Check against boss
        if (this.boss && this.boss.active) {
          const bossBounds = this.boss.getBounds();
          if (this.intersects(bulletBounds, bossBounds)) {
            bullet.destroy();
            const defeated = this.boss.takeDamage();
            // Small hit effect
            if (!defeated) {
              if (this.soundEnabled) Sound.beep(150, 0.05, { volume: 0.2, type: "square" });
            }
            continue;
          }
        }

        // Check against minions
        for (const minion of this.minions) {
          if (!minion.active) continue;

          const minionBounds = minion.getBounds();
          if (this.intersects(bulletBounds, minionBounds)) {
            bullet.destroy();
            const defeated = minion.takeDamage();
            if (defeated) {
              this.addScore(minion.points);
              this.spawnExplosion(minion.x, minion.y, "#ffff00");
            } else {
              if (this.soundEnabled) Sound.beep(200, 0.05, { volume: 0.15, type: "square" });
            }
            break;
          }
        }
      } else {
        // Enemy bullet - check against player
        if (this.intersects(bulletBounds, playerBounds)) {
          bullet.destroy();
          this.playerHit();
        }
      }
    }

    // Check missile collisions with player
    for (const missile of this.missiles) {
      if (!missile.active) continue;

      const missileBounds = missile.getBounds();
      if (this.intersects(missileBounds, playerBounds)) {
        missile.destroy();
        this.spawnExplosion(missile.x, missile.y, "#ff6600");
        this.playerHit();
      }
    }

    // Check laser beam collisions with player
    for (const laser of this.laserBeams) {
      if (!laser.active || !laser.canDamage) continue;

      const laserBounds = laser.getBounds();
      if (this.intersects(laserBounds, playerBounds)) {
        // Laser damages player once per activation
        if (!laser.hasHitPlayer) {
          laser.hasHitPlayer = true;
          this.spawnExplosion(this.player.x, this.player.y, "#ffffff");
          this.playerHit();
        }
      }
    }

    // Check lightning collisions with player
    for (const lightning of this.lightnings) {
      if (!lightning.active || !lightning.canDamage) continue;

      // Use precise segment-based collision
      if (lightning.checkCollision(playerBounds)) {
        // Lightning damages player once per strike
        if (!lightning.hasHitPlayer) {
          lightning.hasHitPlayer = true;
          this.spawnExplosion(this.player.x, this.player.y, "#8888ff");
          this.playerHit();
        }
      }
    }
  }

  /**
   * Boss has been defeated
   */
  bossDefeated() {
    // Big explosion at boss position
    const bossX = this.boss.x;
    const bossY = this.boss.y;

    // Multiple explosions for dramatic effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        this.spawnExplosion(bossX + offsetX, bossY + offsetY, "#ff8800");
      }, i * 100);
    }

    // Award boss points
    this.addScore(this.boss.points);

    // Award extra life for defeating boss
    this.lives++;
    this.hud.showMessage("BOSS DEFEATED!\n+1 LIFE", 2.0);

    // Clean up boss
    this.pipeline.remove(this.boss);
    this.boss = null;

    // Clear all minions
    for (const minion of this.minions) {
      if (minion.active) {
        this.spawnExplosion(minion.x, minion.y, "#ffff00");
      }
      this.pipeline.remove(minion);
    }
    this.minions = [];

    // Play victory sound
    if (this.soundEnabled) {
      Sound.win();
    }

    // In gauntlet mode, advance seamlessly to next wave
    if (this.isGauntletMode) {
      this.advanceGauntlet();
    } else {
      // Normal level complete
      this.levelComplete();
    }
  }

  /**
   * Clean up inactive minions
   */
  cleanupMinions() {
    this.minions = this.minions.filter((m) => {
      if (!m.active) {
        this.pipeline.remove(m);
        return false;
      }
      return true;
    });
  }

  updateAliens(dt) {
    this.alienMoveTimer += dt;

    if (this.alienMoveTimer >= this.alienMoveInterval) {
      this.alienMoveTimer = 0;

      const aliveAliens = this.getAliveAliens();
      if (aliveAliens.length === 0) return;

      // Play alien march sound (alternating tones like classic Space Invaders)
      this.alienMoveNote = (this.alienMoveNote || 0) + 1;
      const freq = this.alienMoveNote % 2 === 0 ? 100 : 80;
      if (this.soundEnabled) Sound.beep(freq, 0.05, { volume: 0.15, type: "square" });

      // Check if we need to change direction
      let shouldDrop = false;
      let shouldReverse = false;

      for (const alien of aliveAliens) {
        const nextX = alien.x + ALIEN_MOVE_SPEED * this.alienDirection;
        if (nextX < ALIEN_WIDTH / 2 || nextX > this.width - ALIEN_WIDTH / 2) {
          shouldReverse = true;
          shouldDrop = true;
          break;
        }
      }

      if (shouldReverse) {
        this.alienDirection *= -1;
      }

      // Move all aliens
      for (const alien of aliveAliens) {
        if (shouldDrop) {
          alien.y += ALIEN_DROP_DISTANCE;
        } else {
          alien.x += ALIEN_MOVE_SPEED * this.alienDirection;
        }

        // Check if aliens reached the bottom
        if (alien.y > this.height - 100) {
          this.gameOver();
          return;
        }
      }

      // Speed up as fewer aliens remain (relative to level's base speed)
      const totalAliens = this.aliens.length;
      const destroyedCount = totalAliens - aliveAliens.length;
      const killSpeedBonus = 1 + destroyedCount * 0.02;
      this.alienMoveInterval = Math.max(0.1, this.baseMoveInterval / killSpeedBonus);
    }
  }

  alienShooting() {
    const aliveAliens = this.getAliveAliens();
    if (aliveAliens.length === 0) return;

    // Find bottom-most alien in each column
    const bottomAliens = new Map();
    for (const alien of aliveAliens) {
      const existing = bottomAliens.get(alien.col);
      if (!existing || alien.y > existing.y) {
        bottomAliens.set(alien.col, alien);
      }
    }

    // Shooting chance increases with level (base + 50% per level, capped)
    const shootChance = Math.min(0.015, ALIEN_SHOOT_CHANCE * (1 + (this.level - 1) * 0.5));

    // Random chance to shoot from bottom aliens
    for (const alien of bottomAliens.values()) {
      if (Math.random() < shootChance) {
        this.spawnAlienBullet(alien.x, alien.y + ALIEN_HEIGHT / 2);
      }
    }
  }

  checkCollisions() {
    const playerBounds = {
      x: this.player.x - PLAYER_WIDTH / 2,
      y: this.player.y - PLAYER_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    };

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      const bulletBounds = bullet.getBounds();

      if (bullet.isPlayerBullet) {
        // Check against aliens
        for (const alien of this.aliens) {
          if (!alien.active) continue;

          const alienBounds = alien.getBounds();
          if (this.intersects(bulletBounds, alienBounds)) {
            // Hit!
            bullet.destroy();
            alien.destroy();
            this.addScore(alien.points);
            this.spawnExplosion(alien.x, alien.y, "#ffff00");
            break;
          }
        }
      } else {
        // Enemy bullet - check against player
        if (this.intersects(bulletBounds, playerBounds)) {
          bullet.destroy();
          this.playerHit();
        }
      }
    }

    // Check missile collisions with player
    for (const missile of this.missiles) {
      if (!missile.active) continue;

      const missileBounds = missile.getBounds();
      if (this.intersects(missileBounds, playerBounds)) {
        missile.destroy();
        this.spawnExplosion(missile.x, missile.y, "#ff6600");
        this.playerHit();
      }
    }
  }

  intersects(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  checkPowerUpCollection() {
    const playerBounds = {
      x: this.player.x - PLAYER_WIDTH / 2,
      y: this.player.y - PLAYER_HEIGHT / 2,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
    };

    for (const powerup of this.powerups) {
      if (!powerup.active) continue;

      const powerupBounds = powerup.getBounds();
      if (this.intersects(playerBounds, powerupBounds)) {
        // Collected!
        powerup.destroy();

        // Award 500 points for any pickup
        this.addScore(500);

        if (powerup instanceof StarPowerUp) {
          // Star power - invincibility and fast shooting
          this.player.activateStarPower();
          // Golden absorb effect
          this.spawnAbsorbEffect(powerup.x, powerup.y, "#ffd700");
        } else {
          // 1-Up - extra life
          this.lives++;
          // Green absorb effect - particles fly toward player
          this.spawnAbsorbEffect(powerup.x, powerup.y, "#98fb98");
        }
      }
    }
  }

  /**
   * Add score with bonus life check every 5000 points
   */
  addScore(points) {
    const oldMilestone = Math.floor(this.score / 5000);
    this.score += points;
    const newMilestone = Math.floor(this.score / 5000);

    // Award bonus life for every 5000 point milestone crossed
    if (newMilestone > oldMilestone) {
      const livesEarned = newMilestone - oldMilestone;
      this.lives += livesEarned;

      // Show 1UP notification
      this.hud.showMessage("BONUS LIFE!", 1.0);

      // Play 1up sound
      if (this.soundEnabled) {
        Sound.beep(880, 0.1, { volume: 0.3, type: "square" });
        setTimeout(() => Sound.beep(1100, 0.15, { volume: 0.3, type: "square" }), 100);
      }
    }
  }

  playerHit() {
    // Invincible during star power!
    if (this.player.starPower) {
      // Still show a small effect to indicate hit was blocked
      this.spawnExplosion(this.player.x, this.player.y, "#ffd700");
      return;
    }

    // Shield blocks damage!
    if (this.player.isShielded()) {
      // Show cyan shield impact effect
      this.spawnExplosion(this.player.x, this.player.y - 10, "#00ddff");
      if (this.soundEnabled) Sound.beep(800, 0.1, { volume: 0.3, type: "sine" });
      return;
    }

    this.lives--;
    this.spawnExplosion(this.player.x, this.player.y, "#ff0000", true);

    // Play hurt sound
    if (this.soundEnabled) Sound.hurt(0.8);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Brief invulnerability flash
      this.player.opacity = 0.5;
      setTimeout(() => {
        if (this.player) this.player.opacity = 1;
      }, 1000);
    }
  }

  getAliveAliens() {
    return this.aliens.filter((a) => a.active);
  }

  cleanup() {
    // Remove inactive bullets
    this.bullets = this.bullets.filter((b) => {
      if (!b.active) {
        this.pipeline.remove(b);
        return false;
      }
      return true;
    });

    // Remove dead aliens (important for performance!)
    this.aliens = this.aliens.filter((a) => {
      if (!a.active) {
        this.pipeline.remove(a);
        return false;
      }
      return true;
    });

    // Remove finished explosions
    this.explosions = this.explosions.filter((e) => {
      if (!e.active) {
        this.pipeline.remove(e);
        // Clear particles to free memory
        if (e.particles) e.particles = [];
        return false;
      }
      return true;
    });

    // Remove collected/missed power-ups
    this.powerups = this.powerups.filter((p) => {
      if (!p.active) {
        this.pipeline.remove(p);
        return false;
      }
      return true;
    });

    // Remove finished/destroyed missiles
    this.missiles = this.missiles.filter((m) => {
      if (!m.active) {
        this.pipeline.remove(m);
        return false;
      }
      return true;
    });

    // Remove finished laser beams
    this.laserBeams = this.laserBeams.filter((l) => {
      if (!l.active) {
        this.pipeline.remove(l);
        return false;
      }
      return true;
    });

    // Remove finished lightning
    this.lightnings = this.lightnings.filter((l) => {
      if (!l.active) {
        this.pipeline.remove(l);
        return false;
      }
      return true;
    });
  }

  async startPlaying() {
    // Resume audio context on user interaction (required by browser autoplay policy)
    await this.resumeAudio();

    // Hide play button and start countdown
    if (this.playButton) {
      this.pipeline.remove(this.playButton);
      this.playButton = null;
    }
    this.hud.hideMessage();

    // Start countdown
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.countdownText.text = "3";
    this.gameState = "countdown";

    // Play first countdown beep
    if (this.soundEnabled) Sound.beep(880, 0.15, { volume: 0.4 });
  }

  /**
   * Called when countdown finishes - actually start gameplay
   */
  beginGameplay() {
    this.countdownText.text = "";
    this.gameState = "playing";
    this.levelPlayTime = 0; // Reset level timer for missile escalation

    // Play start sound (higher pitch for "GO!")
    if (this.soundEnabled) Sound.beep(1320, 0.3, { volume: 0.5 });
  }

  gameOver() {
    this.gameState = "gameover";
    this.hud.showMessage(`GAME OVER\n\nScore: ${this.score}\nLevel: ${this.level}`);
    this.player.visible = false;

    // Play game over sound
    if (this.soundEnabled) Sound.lose();
    // Show play again button
    this.playButton = new Button(this, {
      x: this.width / 2,
      y: this.height / 2 + 100,
      width: 200,
      height: 60,
      text: "PLAY AGAIN",
      font: "bold 20px monospace",
      colorDefaultBg: "#330000",
      colorDefaultStroke: "#ff0000",
      colorDefaultText: "#ff0000",
      colorHoverBg: "#440000",
      colorHoverStroke: "#ff4444",
      colorHoverText: "#ff4444",
      colorPressedBg: "#220000",
      colorPressedStroke: "#aa0000",
      colorPressedText: "#aa0000",
      onClick: () => this.restart(),
    });
    this.pipeline.add(this.playButton);
  }

  levelComplete() {
    this.gameState = "levelcomplete";
    this.levelTransitionTimer = 0;

    // Bonus points for completing level
    const levelBonus = this.level * 100;
    this.addScore(levelBonus);

    // Apply upgrades after specific levels
    let upgradeMessage = "";
    switch (this.level) {
      case 3: // After first boss
        this.player.applyUpgrade("speed1");
        upgradeMessage = "\nSPEED UP!";
        break;
      case 4:
        this.player.applyUpgrade("firerate1");
        upgradeMessage = "\nRAPID FIRE!";
        break;
      case 5:
        this.player.applyUpgrade("speed2");
        upgradeMessage = "\nHYPER SPEED!";
        break;
      case 6: // After second boss
        this.player.applyUpgrade("tripleshot");
        upgradeMessage = "\nTRIPLE SHOT!";
        break;
      case 9: // After third boss - shield for gauntlet
        this.player.applyUpgrade("shield");
        upgradeMessage = "\nSHIELD! [SHIFT]";
        break;
    }

    // Show level complete message (not used for gauntlet - that uses advanceGauntlet)
    this.hud.showMessage(`LEVEL ${this.level} COMPLETE!\n+${levelBonus}${upgradeMessage}`);
  }

  prepareNextLevel() {
    // Called when ship flies off - set up the next level
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.levelPlayTime = 0; // Reset level timer for missile escalation

    // Clear any remaining bullets
    for (const bullet of this.bullets) {
      this.pipeline.remove(bullet);
    }
    this.bullets = [];

    // Clear explosions
    for (const explosion of this.explosions) {
      this.pipeline.remove(explosion);
    }
    this.explosions = [];

    // Clear power-ups
    for (const powerup of this.powerups) {
      this.pipeline.remove(powerup);
    }
    this.powerups = [];

    // Clear missiles
    for (const missile of this.missiles) {
      this.pipeline.remove(missile);
    }
    this.missiles = [];

    // Clear laser beams
    for (const laser of this.laserBeams) {
      this.pipeline.remove(laser);
    }
    this.laserBeams = [];

    // Clear lightning
    for (const lightning of this.lightnings) {
      this.pipeline.remove(lightning);
    }
    this.lightnings = [];

    // Clear minions
    for (const minion of this.minions) {
      this.pipeline.remove(minion);
    }
    this.minions = [];

    // Clear boss if present
    if (this.boss) {
      this.pipeline.remove(this.boss);
      this.boss = null;
    }

    // Reset player horizontal position (y is animated)
    this.player.x = this.width / 2;
    this.player.canShoot = true;
    // Keep star power through level transitions (reward!)

    // Check if entering gauntlet mode from level 9
    if (this.level === 9 && !this.isGauntletMode) {
      // Entering gauntlet mode (level 10) - seamless entry
      this.level = 10;
      this.isGauntletMode = true;
      this.gauntletPhase = 0;
      this.spawnGauntletWave();
      // Override gameState since we're now in gauntlet playing mode
      // (the flyin state will be set after this, which is fine for first wave)
    } else {
      // Normal level progression
      this.level++;
      this.spawnAliens();
    }
  }

  /**
   * Spawn a gauntlet wave - powered up aliens at level 10 difficulty
   */
  spawnGauntletWave() {
    // Clear existing aliens
    for (const alien of this.aliens) {
      this.pipeline.remove(alien);
    }
    this.aliens = [];

    // Gauntlet uses max rows (8) with level 10 speed
    const alienRows = MAX_ALIEN_ROWS;

    // Calculate starting position to center the alien grid
    const gridWidth = ALIEN_COLS * ALIEN_SPACING_X;
    const startX = (this.width - gridWidth) / 2 + ALIEN_SPACING_X / 2;
    const startY = this.levelStartY + 50; // Start a bit lower

    for (let row = 0; row < alienRows; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        // Assign row type - distribute all types across rows
        let rowType;
        if (row < 2) {
          rowType = 0; // Top 2 rows = squid (30pts)
        } else if (row < 5) {
          rowType = 1; // Middle rows = crab (20pts)
        } else {
          rowType = 3; // Bottom rows = octopus (10pts)
        }

        const alien = new Alien(this, {
          x: startX + col * ALIEN_SPACING_X,
          y: startY + row * ALIEN_SPACING_Y,
          row: rowType,
          col: col,
        });
        this.aliens.push(alien);
        this.pipeline.add(alien);
      }
    }

    // Level 10 speed - very fast
    const levelSpeedMultiplier = Math.pow(1.15, 9); // Same as level 10
    this.baseMoveInterval = Math.max(0.3, 1 / levelSpeedMultiplier);
    this.alienMoveInterval = this.baseMoveInterval;
  }

  /**
   * Spawn a gauntlet boss - larger and different colored
   */
  spawnGauntletBoss(bossIndex) {
    this.boss = new Boss(this, {
      x: this.width / 2,
      y: -150, // Start above screen (larger boss needs more space)
      bossType: bossIndex,
      targetY: 200, // Slightly lower for larger boss
      isGauntlet: true, // Enable gauntlet mode (larger, different colors)
    });
    this.pipeline.add(this.boss);

    // Epic warning sound for gauntlet boss
    if (this.soundEnabled) {
      Sound.beep(150, 0.4, { volume: 0.4, type: "sawtooth" });
      setTimeout(() => Sound.beep(120, 0.4, { volume: 0.4, type: "sawtooth" }), 400);
      setTimeout(() => Sound.beep(80, 0.6, { volume: 0.5, type: "sawtooth" }), 800);
    }
  }

  /**
   * Advance gauntlet to next phase seamlessly (no interruptions)
   * Called when a wave or boss is defeated in gauntlet mode
   */
  advanceGauntlet() {
    // Award bonus points for clearing the phase
    const phaseBonus = 500 + (this.gauntletPhase * 200); // 500, 700, 900, 1100, 1300, 1500
    this.addScore(phaseBonus);

    // Advance to next phase
    this.gauntletPhase++;
    this.levelPlayTime = 0;

    // Clear bullets, missiles, powerups between phases
    for (const bullet of this.bullets) {
      this.pipeline.remove(bullet);
    }
    this.bullets = [];

    for (const missile of this.missiles) {
      this.pipeline.remove(missile);
    }
    this.missiles = [];

    // Check if gauntlet complete (phase 6 = after all 3 waves and 3 bosses)
    if (this.gauntletPhase >= 6) {
      this.win();
      return;
    }

    // Determine what's next based on phase
    // Phases: 0=wave1, 1=boss1, 2=wave2, 3=boss2, 4=wave3, 5=boss3
    if (this.gauntletPhase % 2 === 0) {
      // Even phases (0, 2, 4) = waves - spawn immediately
      this.gameState = "playing";
      this.spawnGauntletWave();
    } else {
      // Odd phases (1, 3, 5) = bosses - spawn immediately
      this.gameState = "bossfight";
      const bossIndex = Math.floor(this.gauntletPhase / 2);
      this.spawnGauntletBoss(bossIndex);
    }
  }

  win() {
    // Victory! Player beat the gauntlet
    this.gameState = "win";

    // Play victory fanfare
    if (this.soundEnabled) Sound.win();

    // Victory message (keep it short for small screens)
    this.hud.showMessage(`VICTORY!\n\nGAUNTLET COMPLETE!\n\nScore: ${this.score}`);

    // Show play again button
    this.playButton = new Button(this, {
      x: this.width / 2,
      y: this.height / 2 + 120,
      width: 200,
      height: 60,
      text: "PLAY AGAIN",
      font: "bold 20px monospace",
      colorDefaultBg: "#333300",
      colorDefaultStroke: "#ffff00",
      colorDefaultText: "#ffff00",
      colorHoverBg: "#444400",
      colorHoverStroke: "#ffff44",
      colorHoverText: "#ffff44",
      colorPressedBg: "#222200",
      colorPressedStroke: "#aaaa00",
      colorPressedText: "#aaaa00",
      onClick: () => this.restart(),
    });
    this.pipeline.add(this.playButton);
  }

  async restart() {
    // Resume audio context on user interaction
    await this.resumeAudio();

    // Remove play again button if present
    if (this.playButton) {
      this.pipeline.remove(this.playButton);
      this.playButton = null;
    }

    // Reset game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.alienMoveInterval = 1;
    this.alienMoveNote = 0;
    this.baseMoveInterval = 1;
    this.alienMoveInterval = this.baseMoveInterval;
    this.hud.hideMessage();

    // Reset gauntlet state
    this.isGauntletMode = false;
    this.gauntletPhase = 0;

    // Start countdown
    this.countdownValue = 3;
    this.countdownTimer = 0;
    this.countdownText.text = "3";
    this.gameState = "countdown";

    // Play first countdown beep
    if (this.soundEnabled) Sound.beep(880, 0.15, { volume: 0.4 });

    // Clear bullets and explosions
    for (const bullet of this.bullets) {
      this.pipeline.remove(bullet);
    }
    this.bullets = [];

    for (const explosion of this.explosions) {
      this.pipeline.remove(explosion);
    }
    this.explosions = [];

    // Clear power-ups
    for (const powerup of this.powerups) {
      this.pipeline.remove(powerup);
    }
    this.powerups = [];

    // Clear missiles
    for (const missile of this.missiles) {
      this.pipeline.remove(missile);
    }
    this.missiles = [];

    // Clear minions
    for (const minion of this.minions) {
      this.pipeline.remove(minion);
    }
    this.minions = [];

    // Clear boss if present
    if (this.boss) {
      this.pipeline.remove(this.boss);
      this.boss = null;
    }

    // Reset player position and state
    this.player.x = this.width / 2;
    this.player.y = this.height - 90;
    this.player.visible = true;
    this.player.opacity = 1;
    this.player.canShoot = true;
    // Reset star power on full restart
    this.player.starPower = false;
    this.player.starPowerTimer = 0;
    // Reset all upgrades and ship colors
    this.player.resetUpgrades();

    // Respawn aliens
    this.spawnAliens();
  }
}

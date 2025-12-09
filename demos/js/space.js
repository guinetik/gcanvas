import {
  Game,
  GameObject,
  Rectangle,
  Triangle,
  Circle,
  TextShape,
  Group,
  Scene,
  Keys,
  FPSCounter,
  Easing,
  Motion,
  Tweenetik,
} from "../../src/index";

// ==========================================================================
// Constants
// ==========================================================================

// Fixed canvas dimensions (must match HTML canvas attributes)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const PLAYER_SPEED = 300;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const BULLET_SPEED = 400;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 12;
const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_WIDTH = 30;
const ALIEN_HEIGHT = 20;
const ALIEN_SPACING_X = 40;
const ALIEN_SPACING_Y = 35;
const ALIEN_MOVE_SPEED = 30;
const ALIEN_DROP_DISTANCE = 20;
const ALIEN_SHOOT_CHANCE = 0.002;
const ALIEN_BULLET_SPEED = 200;

// ==========================================================================
// Player Ship
// ==========================================================================

class Player extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      ...options,
    });

    // Simple ship shape - a single rectangle for now (debug)
    this.ship = new Rectangle({
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      color: "#00ff00",
    });

    this.canShoot = true;
    this.shootCooldown = 0.25; // seconds
    this.shootTimer = 0;
  }

  update(dt) {
    super.update(dt);

    // Handle movement
    if (Keys.isDown(Keys.LEFT) || Keys.isDown("a")) {
      this.x -= PLAYER_SPEED * dt;
    }
    if (Keys.isDown(Keys.RIGHT) || Keys.isDown("d")) {
      this.x += PLAYER_SPEED * dt;
    }

    // Clamp to screen bounds
    const halfWidth = PLAYER_WIDTH / 2;
    this.x = Math.max(halfWidth, Math.min(this.game.width - halfWidth, this.x));

    // Shooting cooldown
    if (!this.canShoot) {
      this.shootTimer += dt;
      if (this.shootTimer >= this.shootCooldown) {
        this.canShoot = true;
        this.shootTimer = 0;
      }
    }

    // Handle shooting
    if (Keys.isDown(Keys.SPACE) && this.canShoot) {
      this.shoot();
    }
  }

  shoot() {
    if (!this.canShoot) return;
    this.canShoot = false;
    this.game.spawnPlayerBullet(this.x, this.y - PLAYER_HEIGHT / 2);
  }

  draw() {
    super.draw();
    // Render ship at origin - parent transform already positions us correctly
    this.ship.x = 0;
    this.ship.y = 0;
    this.ship.render();
  }
}

// ==========================================================================
// Bullet
// ==========================================================================

class Bullet extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      ...options,
    });

    this.speed = options.speed || BULLET_SPEED;
    this.direction = options.direction || -1; // -1 = up, 1 = down
    this.isPlayerBullet = options.isPlayerBullet !== false;

    this.shape = new Rectangle({
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      color: this.isPlayerBullet ? "#ffff00" : "#ff4444",
    });
  }

  update(dt) {
    super.update(dt);
    this.y += this.speed * this.direction * dt;

    // Remove if off screen
    if (this.y < -BULLET_HEIGHT || this.y > this.game.height + BULLET_HEIGHT) {
      this.destroy();
    }
  }

  draw() {
    super.draw();
    // Render at origin - parent transform already positions us correctly
    this.shape.x = 0;
    this.shape.y = 0;
    this.shape.render();
  }

  destroy() {
    this.active = false;
    this.visible = false;
  }

  getBounds() {
    return {
      x: this.x - BULLET_WIDTH / 2,
      y: this.y - BULLET_HEIGHT / 2,
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
    };
  }
}

// ==========================================================================
// Alien
// ==========================================================================

class Alien extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: ALIEN_WIDTH,
      height: ALIEN_HEIGHT,
      ...options,
    });

    this.row = options.row || 0;
    this.col = options.col || 0;
    this.points = options.points || 10;
    this.animTime = Math.random() * 2; // Offset animation

    // Create alien shape based on row
    this.shape = this.createShape();
  }

  createShape() {
    const group = new Group({});

    // Different alien designs based on row
    if (this.row === 0) {
      // Top row - squid type (30 points)
      this.points = 30;
      const body = new Circle(ALIEN_WIDTH / 3, {
        color: "#ff0066",
      });
      const leftEye = new Circle(3, { x: -5, y: -2, color: "#ffffff" });
      const rightEye = new Circle(3, { x: 5, y: -2, color: "#ffffff" });
      group.add(body);
      group.add(leftEye);
      group.add(rightEye);
    } else if (this.row <= 2) {
      // Middle rows - crab type (20 points)
      this.points = 20;
      const body = new Rectangle({
        width: ALIEN_WIDTH - 4,
        height: ALIEN_HEIGHT - 6,
        color: "#00ffff",
      });
      const leftClaw = new Rectangle({
        x: -ALIEN_WIDTH / 2 + 2,
        y: 5,
        width: 6,
        height: 8,
        color: "#00cccc",
      });
      const rightClaw = new Rectangle({
        x: ALIEN_WIDTH / 2 - 2,
        y: 5,
        width: 6,
        height: 8,
        color: "#00cccc",
      });
      group.add(body);
      group.add(leftClaw);
      group.add(rightClaw);
    } else {
      // Bottom rows - octopus type (10 points)
      this.points = 10;
      const body = new Rectangle({
        width: ALIEN_WIDTH - 8,
        height: ALIEN_HEIGHT - 4,
        color: "#66ff66",
      });
      const antenna1 = new Rectangle({
        x: -6,
        y: -ALIEN_HEIGHT / 2 + 2,
        width: 3,
        height: 6,
        color: "#44cc44",
      });
      const antenna2 = new Rectangle({
        x: 6,
        y: -ALIEN_HEIGHT / 2 + 2,
        width: 3,
        height: 6,
        color: "#44cc44",
      });
      group.add(body);
      group.add(antenna1);
      group.add(antenna2);
    }

    return group;
  }

  update(dt) {
    super.update(dt);
    this.animTime += dt;
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Add subtle animation - render at origin with wobble offset
    // Parent transform already positions us correctly
    const wobble = Math.sin(this.animTime * 5) * 2;

    this.shape.x = 0;
    this.shape.y = wobble;
    this.shape.render();
  }

  destroy() {
    this.active = false;
    this.visible = false;
  }

  getBounds() {
    return {
      x: this.x - ALIEN_WIDTH / 2,
      y: this.y - ALIEN_HEIGHT / 2,
      width: ALIEN_WIDTH,
      height: ALIEN_HEIGHT,
    };
  }
}

// ==========================================================================
// Explosion Effect
// ==========================================================================

class Explosion extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    this.particles = [];
    this.lifetime = 0.5;
    this.age = 0;
    this.color = options.color || "#ffff00";

    // Create particles
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        shape: new Circle(3 + Math.random() * 4, {
          color: this.color,
        }),
      });
    }
  }

  update(dt) {
    super.update(dt);
    this.age += dt;

    if (this.age >= this.lifetime) {
      this.active = false;
      this.visible = false;
      return;
    }

    // Update particles
    const progress = this.age / this.lifetime;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.shape.opacity = 1 - progress;
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Render particles relative to origin - parent transform positions us correctly
    for (const p of this.particles) {
      p.shape.x = p.x;
      p.shape.y = p.y;
      p.shape.render();
    }
  }
}

// ==========================================================================
// HUD (Heads Up Display)
// ==========================================================================

class HUD extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    this.scoreText = new TextShape("SCORE: 0", {
      font: "20px monospace",
      color: "#ffffff",
      align: "left",
      baseline: "top",
    });

    this.livesText = new TextShape("LIVES: 3", {
      font: "20px monospace",
      color: "#00ff00",
      align: "right",
      baseline: "top",
    });

    this.messageText = new TextShape("", {
      font: "32px monospace",
      color: "#ffff00",
      align: "center",
      baseline: "middle",
    });
  }

  update(dt) {
    super.update(dt);
    this.scoreText.text = `SCORE: ${this.game.score}`;
    this.livesText.text = `LIVES: ${this.game.lives}`;
  }

  draw() {
    super.draw();

    // Score (top left)
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.scoreText.render();

    // Lives (top right)
    this.livesText.x = this.game.width - 20;
    this.livesText.y = 20;
    this.livesText.render();

    // Center message
    if (this.messageText.text) {
      this.messageText.x = this.game.width / 2;
      this.messageText.y = this.game.height / 2;
      this.messageText.render();
    }
  }

  showMessage(text) {
    this.messageText.text = text;
  }

  hideMessage() {
    this.messageText.text = "";
  }
}

// ==========================================================================
// Starfield Background
// ==========================================================================

class Starfield extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.stars = [];

    // Initialize stars immediately (use constants for reliable positioning)
    const starCount = 100;
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 1 + Math.random() * 2,
        speed: 20 + Math.random() * 40,
        shape: new Circle(1 + Math.random() * 2, {
          color: `rgba(255,255,255,${0.3 + Math.random() * 0.7})`,
        }),
      });
    }
  }

  update(dt) {
    super.update(dt);

    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * CANVAS_WIDTH;
      }
    }
  }

  draw() {
    super.draw();

    for (const star of this.stars) {
      star.shape.x = star.x;
      star.shape.y = star.y;
      star.shape.render();
    }
  }
}

// ==========================================================================
// Main Game
// ==========================================================================

export class SpaceGame extends Game {
  constructor(canvas) {
    super(canvas);
    // Use fixed dimensions for predictable gameplay
    // The canvas element's width/height attributes define the drawing buffer
    this.backgroundColor = "#000011";
  }

  init() {
    super.init();
    this.initKeyboard();

    // Game state
    this.score = 0;
    this.lives = 3;
    this.gameState = "playing"; // playing, gameover, win
    this.alienDirection = 1; // 1 = right, -1 = left
    this.alienMoveTimer = 0;
    this.alienMoveInterval = 1; // seconds between moves
    this.levelStartY = 80;

    // Collections
    this.bullets = [];
    this.aliens = [];
    this.explosions = [];

    // Create starfield background
    this.starfield = new Starfield(this);
    this.pipeline.add(this.starfield);

    // Create player at bottom center (use constants for reliable positioning)
    this.player = new Player(this, {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
    });
    this.pipeline.add(this.player);

    // Create aliens
    this.spawnAliens();

    // Create HUD
    this.hud = new HUD(this);
    this.pipeline.add(this.hud);

    // FPS counter
    this.fpsCounter = new FPSCounter(this, {
      color: "#666666",
      anchor: "bottom-left",
    });
    this.pipeline.add(this.fpsCounter);
  }

  spawnAliens() {
    // Clear existing aliens
    for (const alien of this.aliens) {
      this.pipeline.remove(alien);
    }
    this.aliens = [];

    // Calculate starting position to center the alien grid (use constants)
    const gridWidth = ALIEN_COLS * ALIEN_SPACING_X;
    const startX = (CANVAS_WIDTH - gridWidth) / 2 + ALIEN_SPACING_X / 2;

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        const alien = new Alien(this, {
          x: startX + col * ALIEN_SPACING_X,
          y: this.levelStartY + row * ALIEN_SPACING_Y,
          row: row,
          col: col,
        });
        this.aliens.push(alien);
        this.pipeline.add(alien);
      }
    }
  }

  spawnPlayerBullet(x, y) {
    const bullet = new Bullet(this, {
      x: x,
      y: y,
      speed: BULLET_SPEED,
      direction: -1,
      isPlayerBullet: true,
    });
    this.bullets.push(bullet);
    this.pipeline.add(bullet);
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
  }

  spawnExplosion(x, y, color) {
    const explosion = new Explosion(this, {
      x: x,
      y: y,
      color: color,
    });
    this.explosions.push(explosion);
    this.pipeline.add(explosion);
  }

  update(dt) {
    super.update(dt);

    if (this.gameState !== "playing") {
      // Check for restart
      if (Keys.isDown(Keys.SPACE)) {
        this.restart();
      }
      return;
    }

    // Update aliens movement
    this.updateAliens(dt);

    // Alien shooting
    this.alienShooting();

    // Check collisions
    this.checkCollisions();

    // Clean up dead objects
    this.cleanup();

    // Check win condition
    if (this.getAliveAliens().length === 0) {
      this.win();
    }
  }

  updateAliens(dt) {
    this.alienMoveTimer += dt;

    if (this.alienMoveTimer >= this.alienMoveInterval) {
      this.alienMoveTimer = 0;

      const aliveAliens = this.getAliveAliens();
      if (aliveAliens.length === 0) return;

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

      // Speed up as fewer aliens remain
      const speedMultiplier = 1 + (ALIEN_ROWS * ALIEN_COLS - aliveAliens.length) * 0.02;
      this.alienMoveInterval = Math.max(0.1, 1 / speedMultiplier);
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

    // Random chance to shoot from bottom aliens
    for (const alien of bottomAliens.values()) {
      if (Math.random() < ALIEN_SHOOT_CHANCE) {
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
            this.score += alien.points;
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
  }

  intersects(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  playerHit() {
    this.lives--;
    this.spawnExplosion(this.player.x, this.player.y, "#ff0000");

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

    // Remove finished explosions
    this.explosions = this.explosions.filter((e) => {
      if (!e.active) {
        this.pipeline.remove(e);
        return false;
      }
      return true;
    });
  }

  gameOver() {
    this.gameState = "gameover";
    this.hud.showMessage("GAME OVER\nPress SPACE to restart");
    this.player.visible = false;
  }

  win() {
    this.gameState = "win";
    this.hud.showMessage("YOU WIN!\nScore: " + this.score + "\nPress SPACE to restart");
  }

  restart() {
    // Reset game state
    this.score = 0;
    this.lives = 3;
    this.gameState = "playing";
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.alienMoveInterval = 1;
    this.hud.hideMessage();

    // Clear bullets and explosions
    for (const bullet of this.bullets) {
      this.pipeline.remove(bullet);
    }
    this.bullets = [];

    for (const explosion of this.explosions) {
      this.pipeline.remove(explosion);
    }
    this.explosions = [];

    // Reset player (use constants for reliable positioning)
    this.player.x = CANVAS_WIDTH / 2;
    this.player.y = CANVAS_HEIGHT - 50;
    this.player.visible = true;
    this.player.opacity = 1;
    this.player.canShoot = true;

    // Respawn aliens
    this.spawnAliens();
  }
}

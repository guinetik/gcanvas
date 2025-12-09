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
  Star,
  Button,
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
const ALIEN_BASE_ROWS = 4;
const ALIEN_COLS = 11;
const MAX_ALIEN_ROWS = 8;
const ALIEN_WIDTH = 30;
const ALIEN_HEIGHT = 20;
const ALIEN_SPACING_X = 40;
const ALIEN_SPACING_Y = 35;
const ALIEN_MOVE_SPEED = 30;
const ALIEN_DROP_DISTANCE = 20;
const ALIEN_SHOOT_CHANCE = 0.002;
const ALIEN_BULLET_SPEED = 200;

// Power-up constants
const POWERUP_SPAWN_CHANCE = 0.0003; // Per frame chance for 1-Up (rare)
const STARPOWER_SPAWN_CHANCE = 0.001; // Star power (more common for fun)
const POWERUP_FALL_SPEED = 80;
const POWERUP_SIZE = 24;
const STARPOWER_DURATION = 8; // Seconds of invincibility

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

    // Classic arcade-style spaceship using grouped shapes
    this.ship = new Group({});

    // Main hull (center body)
    const hull = new Rectangle({
      width: 16,
      height: 12,
      y: 2,
      color: "#00ff00",
    });

    // Cannon (top center)
    const cannon = new Rectangle({
      width: 4,
      height: 10,
      y: -8,
      color: "#00ff00",
    });

    // Cannon tip
    const cannonTip = new Rectangle({
      width: 2,
      height: 4,
      y: -14,
      color: "#88ff88",
    });

    // Left wing
    const leftWing = new Rectangle({
      width: 10,
      height: 6,
      x: -13,
      y: 5,
      color: "#00dd00",
    });

    // Right wing
    const rightWing = new Rectangle({
      width: 10,
      height: 6,
      x: 13,
      y: 5,
      color: "#00dd00",
    });

    // Left wing detail
    const leftWingTip = new Rectangle({
      width: 4,
      height: 4,
      x: -19,
      y: 6,
      color: "#00aa00",
    });

    // Right wing detail
    const rightWingTip = new Rectangle({
      width: 4,
      height: 4,
      x: 19,
      y: 6,
      color: "#00aa00",
    });

    // Engine glow left
    const engineLeft = new Rectangle({
      width: 4,
      height: 4,
      x: -6,
      y: 10,
      color: "#ffaa00",
    });

    // Engine glow right
    const engineRight = new Rectangle({
      width: 4,
      height: 4,
      x: 6,
      y: 10,
      color: "#ffaa00",
    });

    this.ship.add(hull);
    this.ship.add(cannon);
    this.ship.add(cannonTip);
    this.ship.add(leftWing);
    this.ship.add(rightWing);
    this.ship.add(leftWingTip);
    this.ship.add(rightWingTip);
    this.ship.add(engineLeft);
    this.ship.add(engineRight);

    // Store engine refs for animation
    this.engineLeft = engineLeft;
    this.engineRight = engineRight;
    this.engineTimer = 0;

    // Banking/tilt when moving
    this.targetTilt = 0;
    this.currentTilt = 0;
    this.maxTilt = 15; // Max degrees of rotation
    this.tiltSpeed = 8; // How fast to reach target tilt

    this.canShoot = true;
    this.shootCooldown = 0.25; // seconds
    this.shootTimer = 0;

    // Star power state
    this.starPower = false;
    this.starPowerTimer = 0;
    this.starPowerFlash = 0;

    // Store hull ref for star power glow
    this.hull = hull;
    this.originalHullColor = "#00ff00";
  }

  update(dt) {
    super.update(dt);

    // Only allow movement during active gameplay
    const canMove = this.game.gameState === "playing";

    // Handle movement (arrow keys and WASD)
    const movingLeft = canMove && (Keys.isDown(Keys.LEFT) || Keys.isDown("a") || Keys.isDown("A"));
    const movingRight = canMove && (Keys.isDown(Keys.RIGHT) || Keys.isDown("d") || Keys.isDown("D"));

    if (movingLeft) {
      this.x -= PLAYER_SPEED * dt;
      this.targetTilt = -this.maxTilt;
    }
    if (movingRight) {
      this.x += PLAYER_SPEED * dt;
      this.targetTilt = this.maxTilt;
    }
    if (!movingLeft && !movingRight) {
      this.targetTilt = 0;
    }

    // Smoothly interpolate current tilt toward target
    this.currentTilt += (this.targetTilt - this.currentTilt) * this.tiltSpeed * dt;

    // Clamp to screen bounds (only during gameplay)
    if (canMove) {
      const halfWidth = PLAYER_WIDTH / 2;
      this.x = Math.max(halfWidth, Math.min(this.game.width - halfWidth, this.x));
    }

    // Animate engine flicker
    this.engineTimer += dt * 20;
    const flicker = Math.sin(this.engineTimer) > 0;
    this.engineLeft.color = flicker ? "#ffaa00" : "#ff6600";
    this.engineRight.color = flicker ? "#ff6600" : "#ffaa00";

    // Star power timer and effects
    if (this.starPower) {
      this.starPowerTimer -= dt;
      this.starPowerFlash += dt * 15;

      // Rainbow/golden glow effect
      const hue = (Math.sin(this.starPowerFlash) + 1) / 2;
      const colors = ["#ffff00", "#ff8800", "#ffff00", "#ffffff"];
      const colorIndex = Math.floor(this.starPowerFlash * 2) % colors.length;
      this.hull.color = colors[colorIndex];

      // End star power
      if (this.starPowerTimer <= 0) {
        this.starPower = false;
        this.hull.color = this.originalHullColor;
        this.shootCooldown = 0.25; // Reset to normal
      }
    }

    // Shooting cooldown (faster during star power)
    const currentCooldown = this.starPower ? 0.08 : this.shootCooldown;
    if (!this.canShoot) {
      this.shootTimer += dt;
      if (this.shootTimer >= currentCooldown) {
        this.canShoot = true;
        this.shootTimer = 0;
      }
    }

    // Handle shooting (only during active gameplay)
    if (Keys.isDown(Keys.SPACE) && this.canShoot && this.game.gameState === "playing") {
      this.shoot();
    }
  }

  activateStarPower() {
    this.starPower = true;
    this.starPowerTimer = STARPOWER_DURATION;
    this.starPowerFlash = 0;
  }

  shoot() {
    if (!this.canShoot) return;
    this.canShoot = false;
    this.game.spawnPlayerBullet(this.x, this.y - PLAYER_HEIGHT);
  }

  draw() {
    super.draw();
    // Render ship at origin - parent transform already positions us correctly
    this.ship.x = 0;
    this.ship.y = 0;
    this.ship.rotation = this.currentTilt; // Apply banking tilt
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

    // Create laser-style bullet with glow effect
    this.shape = new Group({});

    if (this.isPlayerBullet) {
      // Player bullet - bright yellow/white laser
      const glow = new Rectangle({
        width: BULLET_WIDTH + 4,
        height: BULLET_HEIGHT + 2,
        color: "rgba(255, 255, 0, 0.3)",
      });
      const core = new Rectangle({
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        color: "#ffff00",
      });
      const center = new Rectangle({
        width: 2,
        height: BULLET_HEIGHT - 2,
        color: "#ffffff",
      });
      this.shape.add(glow);
      this.shape.add(core);
      this.shape.add(center);
    } else {
      // Enemy bullet - menacing red plasma
      const glow = new Rectangle({
        width: BULLET_WIDTH + 4,
        height: BULLET_HEIGHT + 2,
        color: "rgba(255, 0, 0, 0.3)",
      });
      const core = new Rectangle({
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        color: "#ff3333",
      });
      const center = new Rectangle({
        width: 2,
        height: BULLET_HEIGHT - 2,
        color: "#ff8888",
      });
      this.shape.add(glow);
      this.shape.add(core);
      this.shape.add(center);
    }
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

    // Different alien designs based on row - classic Space Invaders style
    if (this.row === 0) {
      // Top row - Squid/UFO type (30 points) - magenta/pink
      this.points = 30;

      // Dome head
      const head = new Circle(8, { y: -2, color: "#ff0088" });

      // Body
      const body = new Rectangle({ width: 20, height: 8, y: 4, color: "#ff0088" });

      // Eyes
      const leftEye = new Circle(2, { x: -4, y: -3, color: "#ffffff" });
      const rightEye = new Circle(2, { x: 4, y: -3, color: "#ffffff" });
      const leftPupil = new Circle(1, { x: -4, y: -3, color: "#000000" });
      const rightPupil = new Circle(1, { x: 4, y: -3, color: "#000000" });

      // Tentacles
      const tent1 = new Rectangle({ width: 3, height: 6, x: -8, y: 10, color: "#cc0066" });
      const tent2 = new Rectangle({ width: 3, height: 8, x: -3, y: 11, color: "#cc0066" });
      const tent3 = new Rectangle({ width: 3, height: 8, x: 3, y: 11, color: "#cc0066" });
      const tent4 = new Rectangle({ width: 3, height: 6, x: 8, y: 10, color: "#cc0066" });

      group.add(head);
      group.add(body);
      group.add(leftEye);
      group.add(rightEye);
      group.add(leftPupil);
      group.add(rightPupil);
      group.add(tent1);
      group.add(tent2);
      group.add(tent3);
      group.add(tent4);

    } else if (this.row <= 2) {
      // Middle rows - Crab type (20 points) - cyan
      this.points = 20;

      // Main body
      const body = new Rectangle({ width: 22, height: 10, color: "#00ffff" });

      // Head bump
      const headBump = new Rectangle({ width: 10, height: 6, y: -6, color: "#00ffff" });

      // Eyes
      const leftEye = new Rectangle({ width: 4, height: 4, x: -6, y: -2, color: "#000033" });
      const rightEye = new Rectangle({ width: 4, height: 4, x: 6, y: -2, color: "#000033" });

      // Claws - left
      const leftArm = new Rectangle({ width: 4, height: 6, x: -14, y: -2, color: "#00cccc" });
      const leftClaw = new Rectangle({ width: 6, height: 4, x: -16, y: -6, color: "#00cccc" });

      // Claws - right
      const rightArm = new Rectangle({ width: 4, height: 6, x: 14, y: -2, color: "#00cccc" });
      const rightClaw = new Rectangle({ width: 6, height: 4, x: 16, y: -6, color: "#00cccc" });

      // Legs
      const leg1 = new Rectangle({ width: 3, height: 5, x: -8, y: 8, color: "#00aaaa" });
      const leg2 = new Rectangle({ width: 3, height: 5, x: 0, y: 8, color: "#00aaaa" });
      const leg3 = new Rectangle({ width: 3, height: 5, x: 8, y: 8, color: "#00aaaa" });

      group.add(body);
      group.add(headBump);
      group.add(leftEye);
      group.add(rightEye);
      group.add(leftArm);
      group.add(leftClaw);
      group.add(rightArm);
      group.add(rightClaw);
      group.add(leg1);
      group.add(leg2);
      group.add(leg3);

    } else {
      // Bottom rows - Octopus/Basic type (10 points) - green
      this.points = 10;

      // Round head
      const head = new Circle(10, { y: -2, color: "#44ff44" });

      // Body extension
      const body = new Rectangle({ width: 16, height: 8, y: 6, color: "#44ff44" });

      // Eyes
      const leftEye = new Rectangle({ width: 4, height: 5, x: -4, y: -4, color: "#003300" });
      const rightEye = new Rectangle({ width: 4, height: 5, x: 4, y: -4, color: "#003300" });

      // Antennae
      const leftAntenna = new Rectangle({ width: 2, height: 6, x: -6, y: -12, color: "#22cc22" });
      const rightAntenna = new Rectangle({ width: 2, height: 6, x: 6, y: -12, color: "#22cc22" });
      const leftTip = new Circle(2, { x: -6, y: -16, color: "#88ff88" });
      const rightTip = new Circle(2, { x: 6, y: -16, color: "#88ff88" });

      // Tentacle legs
      const leg1 = new Rectangle({ width: 3, height: 6, x: -10, y: 12, color: "#22aa22" });
      const leg2 = new Rectangle({ width: 3, height: 8, x: -4, y: 13, color: "#22aa22" });
      const leg3 = new Rectangle({ width: 3, height: 8, x: 4, y: 13, color: "#22aa22" });
      const leg4 = new Rectangle({ width: 3, height: 6, x: 10, y: 12, color: "#22aa22" });

      group.add(head);
      group.add(body);
      group.add(leftEye);
      group.add(rightEye);
      group.add(leftAntenna);
      group.add(rightAntenna);
      group.add(leftTip);
      group.add(rightTip);
      group.add(leg1);
      group.add(leg2);
      group.add(leg3);
      group.add(leg4);
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
    this.lifetime = 0.4; // Shorter lifetime for better performance
    this.age = 0;
    this.baseColor = options.color || "#ffff00";

    // Color palette for explosion - varies based on base color
    const colors = this.baseColor === "#ffff00"
      ? ["#ffffff", "#ffff00", "#ffaa00", "#ff6600"] // Yellow explosion
      : ["#ffffff", "#ff8888", "#ff4444", "#ff0000"]; // Red explosion

    // Optimized particle count (8 circles + 3 squares = 11 total)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 100;
      const size = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        shape: new Circle(size, { color: color }),
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // Add some square debris
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const size = 2 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        shape: new Rectangle({ width: size, height: size, color: color }),
        rotSpeed: (Math.random() - 0.5) * 15,
        rotation: 0,
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

    // Update particles with gravity and fade
    const progress = this.age / this.lifetime;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt; // Gravity
      p.vx *= 0.99; // Air resistance

      // Fade and shrink
      p.shape.opacity = 1 - progress * progress;

      // Rotate debris
      if (p.rotation !== undefined) {
        p.rotation += p.rotSpeed * dt;
      }
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Render particles relative to origin - parent transform positions us correctly
    for (const p of this.particles) {
      p.shape.x = p.x;
      p.shape.y = p.y;
      if (p.rotation !== undefined) {
        p.shape.rotation = p.rotation * (180 / Math.PI); // Convert to degrees
      }
      p.shape.render();
    }
  }
}

// ==========================================================================
// Absorb Effect (particles fly toward player)
// ==========================================================================

class AbsorbEffect extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    this.particles = [];
    this.lifetime = 0.4; // Shorter lifetime for better performance
    this.age = 0;
    this.targetX = options.targetX || this.x;
    this.targetY = options.targetY || this.y;
    this.color = options.color || "#98fb98";

    // Create particles that will fly toward target (optimized count)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 25 + Math.random() * 15;
      const size = 3 + Math.random() * 3;

      this.particles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: size,
        shape: new Circle(size, {
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

    // Update target to follow player
    if (this.game.player) {
      this.targetX = this.game.player.x;
      this.targetY = this.game.player.y;
    }

    // Move particles toward target (relative to effect origin)
    const progress = this.age / this.lifetime;
    const targetRelX = this.targetX - this.x;
    const targetRelY = this.targetY - this.y;

    for (const p of this.particles) {
      // Lerp toward target
      p.x += (targetRelX - p.x) * dt * 5;
      p.y += (targetRelY - p.y) * dt * 5;

      // Shrink and fade
      p.shape.opacity = 1 - progress;
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    for (const p of this.particles) {
      p.shape.x = p.x;
      p.shape.y = p.y;
      p.shape.render();
    }
  }
}

// ==========================================================================
// Power-Up (1-Up)
// ==========================================================================

class PowerUp extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      ...options,
    });

    this.speed = POWERUP_FALL_SPEED;
    this.bobTime = Math.random() * Math.PI * 2;

    // Create 1-Up visual - pastel green life icon
    this.shape = new Group({});

    // Glowing background
    const glow = new Circle(POWERUP_SIZE / 2 + 4, {
      color: "rgba(144, 238, 144, 0.4)",
    });

    // Main body - pastel green
    const body = new Circle(POWERUP_SIZE / 2, {
      color: "#98fb98", // Pale green
    });

    // "1UP" text
    this.label = new TextShape("1UP", {
      font: "bold 10px monospace",
      color: "#ffffff",
      align: "center",
      baseline: "middle",
    });

    this.shape.add(glow);
    this.shape.add(body);

    // Store glow for animation
    this.glow = glow;
  }

  update(dt) {
    super.update(dt);

    // Fall down
    this.y += this.speed * dt;

    // Bob side to side
    this.bobTime += dt * 3;
    this.x += Math.sin(this.bobTime) * 30 * dt;

    // Pulse glow - pastel green
    const pulse = 0.4 + Math.sin(this.bobTime * 2) * 0.2;
    this.glow.color = `rgba(144, 238, 144, ${pulse})`;

    // Remove if off screen
    if (this.y > this.game.height + POWERUP_SIZE) {
      this.destroy();
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    this.shape.x = 0;
    this.shape.y = 0;
    this.shape.render();

    // Draw label on top
    this.label.x = 0;
    this.label.y = 0;
    this.label.render();
  }

  destroy() {
    this.active = false;
    this.visible = false;
  }

  getBounds() {
    return {
      x: this.x - POWERUP_SIZE / 2,
      y: this.y - POWERUP_SIZE / 2,
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
    };
  }
}

// ==========================================================================
// Star Power-Up (Invincibility)
// ==========================================================================

class StarPowerUp extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      ...options,
    });

    this.speed = POWERUP_FALL_SPEED * 0.8; // Slightly slower
    this.bobTime = Math.random() * Math.PI * 2;
    this.spinAngle = 0;

    // Create star visual using the Star shape
    this.shape = new Group({});

    // Glowing background
    const glow = new Circle(POWERUP_SIZE / 2 + 6, {
      color: "rgba(255, 215, 0, 0.4)",
    });

    // Main star - golden
    this.star = new Star(POWERUP_SIZE / 2, 5, 0.5, {
      color: "#ffd700", // Gold
    });

    // Inner highlight
    const innerStar = new Star(POWERUP_SIZE / 4, 5, 0.5, {
      color: "#ffec8b", // Light gold
    });

    this.shape.add(glow);
    this.shape.add(this.star);
    this.shape.add(innerStar);

    // Store refs for animation
    this.glow = glow;
    this.innerStar = innerStar;
  }

  update(dt) {
    super.update(dt);

    // Fall down
    this.y += this.speed * dt;

    // Bob side to side
    this.bobTime += dt * 3;
    this.x += Math.sin(this.bobTime) * 40 * dt;

    // Spin the star
    this.spinAngle += dt * 180; // Degrees per second
    this.star.rotation = this.spinAngle;
    this.innerStar.rotation = -this.spinAngle * 0.5;

    // Pulse glow
    const pulse = 0.4 + Math.sin(this.bobTime * 2) * 0.2;
    this.glow.color = `rgba(255, 215, 0, ${pulse})`;

    // Remove if off screen
    if (this.y > this.game.height + POWERUP_SIZE) {
      this.destroy();
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

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
      x: this.x - POWERUP_SIZE / 2,
      y: this.y - POWERUP_SIZE / 2,
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
    };
  }
}

// ==========================================================================
// HUD (Heads Up Display)
// ==========================================================================

class HUD extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    // Title - centered, below info bar
    this.titleText = new TextShape("SPACE INVADERS", {
      font: "bold 32px monospace",
      color: "#ffff00",
      align: "center",
      baseline: "top",
    });

    // Score - top left
    this.scoreText = new TextShape("SCORE: 0", {
      font: "20px monospace",
      color: "#ffffff",
      align: "left",
      baseline: "top",
    });

    // Level - top right
    this.levelText = new TextShape("LEVEL: 1", {
      font: "20px monospace",
      color: "#00ffff",
      align: "right",
      baseline: "top",
    });

    // Lives - bottom left (above FPS)
    this.livesText = new TextShape("LIVES: 3", {
      font: "18px monospace",
      color: "#00ff00",
      align: "left",
      baseline: "bottom",
    });

    // Center message
    this.messageText = new TextShape("", {
      font: "28px monospace",
      color: "#ffff00",
      align: "center",
      baseline: "middle",
    });
  }

  update(dt) {
    super.update(dt);
    this.scoreText.text = `SCORE: ${this.game.score}`;
    this.levelText.text = `LEVEL: ${this.game.level}`;
    this.livesText.text = `LIVES: ${this.game.lives}`;
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
    this.initialized = false;
  }

  initStars() {
    if (this.initialized || this.game.width === 0) return;
    this.initialized = true;

    // Optimized star count - cap at 100 stars max
    const area = this.game.width * this.game.height;
    const starCount = Math.min(100, Math.floor(area / 15000)); // ~1 star per 15000 pixels, max 100

    for (let i = 0; i < starCount; i++) {
      const size = 1 + Math.random() * 1.5;
      this.stars.push({
        x: Math.random() * this.game.width,
        y: Math.random() * this.game.height,
        size: size,
        speed: 15 + Math.random() * 30,
        shape: new Circle(size, {
          color: `rgba(255,255,255,${0.4 + Math.random() * 0.5})`,
        }),
      });
    }
  }

  update(dt) {
    super.update(dt);

    // Initialize stars on first update when dimensions are known
    if (!this.initialized) {
      this.initStars();
    }

    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.game.height) {
        star.y = 0;
        star.x = Math.random() * this.game.width;
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
    // Enable fluid sizing for fullscreen display
    this.enableFluidSize();
    this.backgroundColor = "#000011";
  }

  init() {
    // Prevent re-initialization on resume from alt-tab
    if (this._spaceGameInitialized) {
      return;
    }
    this._spaceGameInitialized = true;

    super.init();
    this.initKeyboard();

    // Game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameState = "ready"; // ready, playing, gameover, win, levelcomplete, flyoff, flyin
    this.alienDirection = 1; // 1 = right, -1 = left
    this.alienMoveTimer = 0;
    this.baseMoveInterval = 1; // Base seconds between moves (decreases with level)
    this.alienMoveInterval = this.baseMoveInterval;
    this.levelStartY = 170; // Below title and score display
    this.levelTransitionTimer = 0;
    this.shipAnimationTimer = 0;
    this.shipStartY = 0; // For fly-in animation

    // Collections
    this.bullets = [];
    this.aliens = [];
    this.explosions = [];
    this.powerups = [];

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
        // Assign row type based on position ratio (for varied alien types)
        const rowRatio = row / alienRows;
        let rowType;
        if (rowRatio < 0.2) {
          rowType = 0; // Top ~20% are squid (30 pts)
        } else if (rowRatio < 0.5) {
          rowType = 1; // Next ~30% are crab (20 pts)
        } else {
          rowType = 3; // Bottom ~50% are octopus (10 pts)
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

  update(dt) {
    super.update(dt);

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

    // Handle level complete - show message then fly off
    if (this.gameState === "levelcomplete") {
      this.levelTransitionTimer += dt;
      if (this.levelTransitionTimer >= 1.5) {
        this.gameState = "flyoff";
        this.shipAnimationTimer = 0;
      }
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

    // Check collisions
    this.checkCollisions();

    // Check power-up collection
    this.checkPowerUpCollection();

    // Clean up dead objects
    this.cleanup();

    // Check win condition - advance to next level
    if (this.getAliveAliens().length === 0) {
      this.levelComplete();
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

  playerHit() {
    // Invincible during star power!
    if (this.player.starPower) {
      // Still show a small effect to indicate hit was blocked
      this.spawnExplosion(this.player.x, this.player.y, "#ffd700");
      return;
    }

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
  }

  startPlaying() {
    // Hide play button and start the game
    if (this.playButton) {
      this.pipeline.remove(this.playButton);
      this.playButton = null;
    }
    this.gameState = "playing";
    this.hud.hideMessage();
  }

  gameOver() {
    this.gameState = "gameover";
    this.hud.showMessage(`GAME OVER\n\nFinal Score: ${this.score}\nReached Level: ${this.level}`);
    this.player.visible = false;

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
    this.score += levelBonus;

    this.hud.showMessage(`LEVEL ${this.level} COMPLETE!\n\n+${levelBonus} BONUS\n\nGet Ready...`);
  }

  prepareNextLevel() {
    // Called when ship flies off - set up the next level
    this.level++;
    this.alienDirection = 1;
    this.alienMoveTimer = 0;

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

    // Reset player horizontal position (y is animated)
    this.player.x = this.width / 2;
    this.player.canShoot = true;
    // Keep star power through level transitions (reward!)

    // Spawn new wave of aliens
    this.spawnAliens();
  }

  win() {
    // This is now only called if you somehow beat all possible levels
    this.gameState = "win";
    this.hud.showMessage(`CONGRATULATIONS!\n\nYOU ARE A SPACE CHAMPION!\n\nFinal Score: ${this.score}`);

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

  restart() {
    // Remove play again button if present
    if (this.playButton) {
      this.pipeline.remove(this.playButton);
      this.playButton = null;
    }

    // Reset game state
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.gameState = "playing";
    this.alienDirection = 1;
    this.alienMoveTimer = 0;
    this.baseMoveInterval = 1;
    this.alienMoveInterval = this.baseMoveInterval;
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

    // Clear power-ups
    for (const powerup of this.powerups) {
      this.pipeline.remove(powerup);
    }
    this.powerups = [];

    // Reset player position and state
    this.player.x = this.width / 2;
    this.player.y = this.height - 90;
    this.player.visible = true;
    this.player.opacity = 1;
    this.player.canShoot = true;
    // Reset star power on full restart
    this.player.starPower = false;
    this.player.starPowerTimer = 0;
    this.player.hull.color = this.player.originalHullColor;

    // Respawn aliens
    this.spawnAliens();
  }
}

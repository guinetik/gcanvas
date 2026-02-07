import { GameObject, Rectangle, Circle, Group, Keys, Painter } from "/gcanvas.es.min.js";
import {
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  STARPOWER_DURATION,
  STARPOWER_SPEED_MULTIPLIER,
  SHIELD_MAX_ENERGY,
  SHIELD_DRAIN_RATE,
  SHIELD_RECHARGE_RATE,
  SHIELD_RECHARGE_DELAY,
} from "./constants.js";

export class Player extends GameObject {
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
      origin: "center",
    });

    // Cannon (top center)
    const cannon = new Rectangle({
      width: 4,
      height: 10,
      y: -8,
      color: "#00ff00",
      origin: "center",
    });

    // Cannon tip
    const cannonTip = new Rectangle({
      width: 2,
      height: 4,
      y: -14,
      color: "#88ff88",
      origin: "center",
    });

    // Left wing
    const leftWing = new Rectangle({
      width: 10,
      height: 6,
      x: -13,
      y: 5,
      color: "#00dd00",
      origin: "center",
    });

    // Right wing
    const rightWing = new Rectangle({
      width: 10,
      height: 6,
      x: 13,
      y: 5,
      color: "#00dd00",
      origin: "center",
    });

    // Left wing detail
    const leftWingTip = new Rectangle({
      width: 4,
      height: 4,
      x: -19,
      y: 6,
      color: "#00aa00",
      origin: "center",
    });

    // Right wing detail
    const rightWingTip = new Rectangle({
      width: 4,
      height: 4,
      x: 19,
      y: 6,
      color: "#00aa00",
      origin: "center",
    });

    // Engine glow left
    const engineLeft = new Rectangle({
      width: 4,
      height: 4,
      x: -6,
      y: 10,
      color: "#ffaa00",
      origin: "center",
    });

    // Engine glow right
    const engineRight = new Rectangle({
      width: 4,
      height: 4,
      x: 6,
      y: 10,
      color: "#ffaa00",
      origin: "center",
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

    // Store refs for animation and color changes
    this.engineLeft = engineLeft;
    this.engineRight = engineRight;
    this.engineTimer = 0;
    this.cannon = cannon;
    this.cannonTip = cannonTip;
    this.leftWing = leftWing;
    this.rightWing = rightWing;
    this.leftWingTip = leftWingTip;
    this.rightWingTip = rightWingTip;

    // Banking/tilt when moving
    this.targetTilt = 0;
    this.currentTilt = 0;
    this.maxTilt = 15; // Max degrees of rotation
    this.tiltSpeed = 8; // How fast to reach target tilt

    this.canShoot = true;
    this.shootCooldown = 0.25; // seconds (base cooldown)
    this.shootTimer = 0;

    // Star power state
    this.starPower = false;
    this.starPowerTimer = 0;
    this.starPowerFlash = 0;

    // Store hull ref for star power glow
    this.hull = hull;
    this.originalHullColor = "#00ff00";

    // Upgrades - applied as player progresses
    this.speedMultiplier = 1.0; // Movement speed multiplier
    this.shootCooldownMultiplier = 1.0; // Lower = faster shooting
    this.tripleShot = false; // Shoots 3 bullets in spread pattern

    // Shield system (unlocked after level 9 boss)
    this.shieldUnlocked = false;
    this.shieldActive = false;
    this.shieldEnergy = SHIELD_MAX_ENERGY;
    this.shieldRechargeDelay = 0; // Time before recharge starts
    this.shieldFlash = 0; // For visual effect

    // Mobile touch controls
    this.touchActive = false;
    this.touchX = 0;
    this.setupTouchControls();
  }

  /**
   * Sets up touch event handlers for mobile play
   */
  setupTouchControls() {
    const canvas = this.game.canvas;

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.touchActive = true;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      this.touchX = touch.clientX - rect.left;
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (this.touchActive) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        this.touchX = touch.clientX - rect.left;
      }
    }, { passive: false });

    canvas.addEventListener("touchend", () => {
      this.touchActive = false;
    });

    canvas.addEventListener("touchcancel", () => {
      this.touchActive = false;
    });
  }

  /**
   * Apply upgrade after completing a level
   * Ship color progression: Green → Blue → Yellow → Red
   */
  applyUpgrade(upgradeType) {
    switch (upgradeType) {
      case "speed1":
        // After level 3 boss - faster movement, BLUE ship
        this.speedMultiplier = 1.4; // 40% faster (very noticeable)
        this.hull.color = "#0088ff";
        this.originalHullColor = "#0088ff";
        this.cannon.color = "#0088ff";
        this.cannonTip.color = "#44aaff";
        this.leftWing.color = "#0066dd";
        this.rightWing.color = "#0066dd";
        this.leftWingTip.color = "#0044aa";
        this.rightWingTip.color = "#0044aa";
        break;
      case "firerate1":
        // After level 4 - faster shooting, YELLOW ship
        this.shootCooldownMultiplier = 0.6; // 40% faster shooting
        this.hull.color = "#ffdd00";
        this.originalHullColor = "#ffdd00";
        this.cannon.color = "#ffdd00";
        this.cannonTip.color = "#ffff44";
        this.leftWing.color = "#ddbb00";
        this.rightWing.color = "#ddbb00";
        this.leftWingTip.color = "#aa8800";
        this.rightWingTip.color = "#aa8800";
        break;
      case "speed2":
        // After level 5 - even faster movement (keep yellow, brighter)
        this.speedMultiplier = 1.7; // 70% faster total
        this.hull.color = "#ffff00";
        this.originalHullColor = "#ffff00";
        this.cannonTip.color = "#ffffff";
        break;
      case "tripleshot":
        // After level 6 boss - triple shot, RED ship (final form)
        this.tripleShot = true;
        this.hull.color = "#ff0000";
        this.originalHullColor = "#ff0000";
        this.cannon.color = "#ff0000";
        this.cannonTip.color = "#ff4444";
        this.leftWing.color = "#dd0000";
        this.rightWing.color = "#dd0000";
        this.leftWingTip.color = "#aa0000";
        this.rightWingTip.color = "#aa0000";
        break;
      case "shield":
        // After level 9 boss - unlock shield ability
        this.shieldUnlocked = true;
        this.shieldEnergy = SHIELD_MAX_ENERGY;
        break;
    }
  }

  /**
   * Reset upgrades (on game restart)
   */
  resetUpgrades() {
    this.speedMultiplier = 1.0;
    this.shootCooldownMultiplier = 1.0;
    this.tripleShot = false;

    // Reset shield
    this.shieldUnlocked = false;
    this.shieldActive = false;
    this.shieldEnergy = SHIELD_MAX_ENERGY;
    this.shieldRechargeDelay = 0;

    // Reset colors to original green
    this.hull.color = "#00ff00";
    this.originalHullColor = "#00ff00";
    this.cannon.color = "#00ff00";
    this.cannonTip.color = "#88ff88";
    this.leftWing.color = "#00dd00";
    this.rightWing.color = "#00dd00";
    this.leftWingTip.color = "#00aa00";
    this.rightWingTip.color = "#00aa00";
  }

  update(dt) {
    super.update(dt);

    // Only allow movement during active gameplay (including boss fight)
    const canMove = this.game.gameState === "playing" || this.game.gameState === "bossfight";

    // Handle movement (arrow keys and WASD)
    let movingLeft = canMove && (Keys.isDown(Keys.LEFT) || Keys.isDown("a") || Keys.isDown("A"));
    let movingRight = canMove && (Keys.isDown(Keys.RIGHT) || Keys.isDown("d") || Keys.isDown("D"));

    // Touch controls - move toward touch position
    if (this.touchActive && canMove) {
      const deadzone = 20; // pixels from ship center before moving
      const diff = this.touchX - this.x;
      if (Math.abs(diff) > deadzone) {
        movingLeft = diff < 0;
        movingRight = diff > 0;
      }
    }

    // Speed boost during star power + upgrade multiplier
    let speed = PLAYER_SPEED * this.speedMultiplier;
    if (this.starPower) {
      speed *= STARPOWER_SPEED_MULTIPLIER;
    }

    if (movingLeft) {
      this.x -= speed * dt;
      this.targetTilt = -this.maxTilt;
    }
    if (movingRight) {
      this.x += speed * dt;
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

    // Shooting cooldown (faster during star power, affected by upgrade)
    let currentCooldown = this.shootCooldown * this.shootCooldownMultiplier;
    if (this.starPower) {
      currentCooldown = 0.08; // Star power overrides with very fast shooting
    }
    if (!this.canShoot) {
      this.shootTimer += dt;
      if (this.shootTimer >= currentCooldown) {
        this.canShoot = true;
        this.shootTimer = 0;
      }
    }

    // Handle shooting (only during active gameplay, including boss fight)
    // Touch = auto-fire, keyboard = space bar
    const wantsToShoot = Keys.isDown(Keys.SPACE) || this.touchActive;
    if (wantsToShoot && this.canShoot && canMove) {
      this.shoot();
    }

    // Shield system
    if (this.shieldUnlocked && canMove) {
      const shiftPressed = Keys.isDown(Keys.SHIFT);

      if (shiftPressed && this.shieldEnergy > 0) {
        // Activate shield
        this.shieldActive = true;
        this.shieldEnergy -= SHIELD_DRAIN_RATE * dt;
        this.shieldEnergy = Math.max(0, this.shieldEnergy);
        this.shieldRechargeDelay = SHIELD_RECHARGE_DELAY;
        this.shieldFlash += dt * 10;
      } else {
        // Deactivate shield
        this.shieldActive = false;

        // Recharge after delay
        if (this.shieldRechargeDelay > 0) {
          this.shieldRechargeDelay -= dt;
        } else {
          this.shieldEnergy += SHIELD_RECHARGE_RATE * dt;
          this.shieldEnergy = Math.min(SHIELD_MAX_ENERGY, this.shieldEnergy);
        }
      }
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

    if (this.tripleShot) {
      // Triple shot: center + two angled bullets
      this.game.spawnPlayerBullet(this.x, this.y - PLAYER_HEIGHT, 0); // Center
      this.game.spawnPlayerBullet(this.x - 8, this.y - PLAYER_HEIGHT, -15); // Left angle
      this.game.spawnPlayerBullet(this.x + 8, this.y - PLAYER_HEIGHT, 15); // Right angle
    } else {
      this.game.spawnPlayerBullet(this.x, this.y - PLAYER_HEIGHT, 0);
    }
  }

  draw() {
    super.draw();

    // Render ship first
    this.ship.x = 0;
    this.ship.y = 0;
    this.ship.rotation = this.currentTilt; // Apply banking tilt
    this.ship.render();

    // Draw shield arc on top if unlocked (shows energy level as arc size)
    if (this.shieldUnlocked && this.shieldEnergy > 0) {
      const ctx = Painter.ctx;
      const energyPercent = this.shieldEnergy / SHIELD_MAX_ENERGY;

      // Arc radius and thickness
      const radius = 30;
      const lineWidth = this.shieldActive ? 4 : 2;

      // Arc spans from energyPercent (full = 180 degrees, empty = 0)
      // Arc goes from left to right across front of ship
      const arcAngle = Math.PI * energyPercent; // 0 to PI based on energy
      const startAngle = Math.PI + (Math.PI - arcAngle) / 2; // Centered at top
      const endAngle = startAngle + arcAngle;

      // Color based on state - yellow/gold tones
      let strokeColor, alpha;
      let o = ctx.globalAlpha;
      if (this.shieldActive) {
        // Active shield - bright gold with pulse
        const pulse = 0.6 + Math.sin(this.shieldFlash) * 0.4;
        strokeColor = `rgba(255, 255, 255, ${pulse})`;
      } else if (this.shieldRechargeDelay > 0) {
        // Recharge delay - dim orange
        strokeColor = "rgba(255, 255, 255, 1)";
      } else {
        // Recharging - gradually brightening yellow
        const brightness = 0.3 + energyPercent * 0.5;
        strokeColor = `rgba(255, 255, 255, ${brightness})`;
      }
      ctx.save();

      // Explicitly prevent any fill
      ctx.fillStyle = "transparent";

      // Draw arc stroke only
      ctx.beginPath();
      ctx.arc(0, -5, radius, startAngle, endAngle);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      // Clear the path to prevent any accidental fills later
      ctx.beginPath();

      ctx.restore();
    }
  }

  /**
   * Check if shield is currently protecting the player
   */
  isShielded() {
    return this.shieldActive && this.shieldEnergy > 0;
  }
}

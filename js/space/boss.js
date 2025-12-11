import { GameObject, Rectangle } from "/gcanvas.es.min.js";
import { Alien } from "./alien.js";
import {
  ALIEN_WIDTH,
  ALIEN_HEIGHT,
  BOSS_SCALE,
  BOSS_BASE_HEALTH,
  BOSS_BASE_POINTS,
  BOSS_BASE_MISSILE_INTERVAL,
  BOSS_BASE_MINION_INTERVAL,
  BOSS_BASE_MAX_MINIONS,
  BOSS_BASE_MOVE_SPEED,
  GAUNTLET_BOSS_SCALE,
  GAUNTLET_BOSS_HEALTH_MULTIPLIER,
  GAUNTLET_BOSS_COLORS,
} from "./constants.js";

/**
 * Boss alien - uses composition to scale up a regular alien shape
 * Difficulty scales with boss type:
 * Type 0 = Squid (pink) - Level 3 boss (easiest, missiles only)
 * Type 1 = Octopus (green) - Level 6 boss (medium, missiles + lasers)
 * Type 2 = Crab (cyan) - Level 9 boss (hardest, missiles + lasers + lightning)
 *
 * Gauntlet mode: Larger scale, different colors, more health
 */
export class Boss extends GameObject {
  constructor(game, options = {}) {
    // Gauntlet mode uses larger scale - must determine before super()
    const isGauntlet = options.isGauntlet || false;
    const scale = isGauntlet ? GAUNTLET_BOSS_SCALE : BOSS_SCALE;

    const width = ALIEN_WIDTH * scale;
    const height = ALIEN_HEIGHT * scale;

    super(game, {
      width: width,
      height: height,
      ...options,
    });

    this.isGauntlet = isGauntlet;
    this.scale = scale;

    // Boss type determines which alien row shape to use AND difficulty scaling
    // 0 = octopus (row 3), 1 = squid (row 0), 2 = crab (row 1)
    this.bossType = options.bossType || 0;

    // Scale difficulty based on boss type (0, 1, 2)
    const difficultyScale = 1 + this.bossType * 0.5; // 1.0, 1.5, 2.0

    // Gauntlet bosses have extra health
    const gauntletMultiplier = this.isGauntlet ? GAUNTLET_BOSS_HEALTH_MULTIPLIER : 1;

    // Health scales up: 30, 45, 60 (or 45, 68, 90 in gauntlet)
    this.health = Math.floor(BOSS_BASE_HEALTH * difficultyScale * gauntletMultiplier);
    this.maxHealth = this.health;

    // Points scale up: 1000, 2000, 3000 (doubled in gauntlet)
    this.points = BOSS_BASE_POINTS * (this.bossType + 1) * (this.isGauntlet ? 2 : 1);

    // Animation
    this.animTime = 0;
    this.hitFlashTime = 0;
    this.isFlashing = false;

    // Movement - faster for harder bosses
    this.moveDirection = 1;
    this.moveSpeed = BOSS_BASE_MOVE_SPEED * (1 + this.bossType * 0.3); // 35, 45.5, 56

    // Attack intervals - shorter for harder bosses
    // Non-signature abilities are 20% slower to reduce spam
    // Signature: Boss 0 = missiles, Boss 1 = lasers, Boss 2 = lightning
    let baseMissileInterval = BOSS_BASE_MISSILE_INTERVAL / difficultyScale;
    if (this.bossType >= 1) {
      // Missiles are non-signature for bosses 1 & 2, slow down 20%
      baseMissileInterval *= 1.2;
    }
    this.missileInterval = baseMissileInterval;

    this.minionInterval = BOSS_BASE_MINION_INTERVAL / difficultyScale;
    this.maxMinions = BOSS_BASE_MAX_MINIONS + this.bossType * 2; // 2, 4, 6

    // Boss type 1+ (Octopus, Crab) use lasers
    this.usesLasers = this.bossType >= 1;
    if (this.bossType === 1) {
      // Boss 1: Lasers are signature - tuned down 10% from 1.8 to 2.0
      this.laserInterval = 2.0;
    } else if (this.bossType === 2) {
      // Boss 2: Lasers are non-signature - 20% slower
      this.laserInterval = 2.2;
    }

    // Boss type 2 (Crab/final) uses lightning as signature move
    this.usesLightning = this.bossType === 2;
    this.lightningInterval = 2.5;

    // Attack timers
    this.missileTimer = 0;
    this.minionTimer = 0;
    this.laserTimer = 0;
    this.lightningTimer = 0;
    this.minionCount = 0; // Track active minions

    // Entry animation
    this.entering = true;
    this.entryProgress = 0;
    this.targetY = options.targetY || 150;
    this.startY = -height;

    // Create shape using composition - instantiate an Alien and reuse its shape
    this.shape = this.createShape();

    // Health bar
    this.healthBarBg = new Rectangle({
      width: width,
      height: 8,
      color: "#333333",
    });
    this.healthBarFg = new Rectangle({
      width: width,
      height: 8,
      color: "#ff0000",
    });
  }

  createShape() {
    // Map boss type to the appropriate alien row
    // Type 0 (Level 3) = Squid (pink) -> row 0
    // Type 1 (Level 6) = Octopus (green) -> row 3
    // Type 2 (Level 9) = Crab (cyan) -> row 1 (final boss!)
    const rowMapping = [0, 3, 1];
    const alienRow = rowMapping[this.bossType] ?? 0;

    // Create a temporary alien to get its shape
    const tempAlien = new Alien(this.game, { row: alienRow });
    const shape = tempAlien.shape;

    // Disable caching since boss scales up (would cause pixelation if cached at small size)
    shape.cacheRendering = false;

    // Apply scale transform (using instance scale which differs in gauntlet mode)
    shape.transform.scale(this.scale);

    // In gauntlet mode, recolor the shape with custom gauntlet colors
    if (this.isGauntlet) {
      const colors = GAUNTLET_BOSS_COLORS[this.bossType];
      this.recolorShape(shape, colors);
    }

    return shape;
  }

  /**
   * Recursively recolor all shapes in a group with gauntlet colors
   */
  recolorShape(shape, colors) {
    if (shape.children) {
      // It's a group - recursively recolor children
      for (const child of shape.children) {
        this.recolorShape(child, colors);
      }
    } else if (shape.color) {
      // It's a shape with a color - determine which tier based on brightness
      const hex = shape.color.toLowerCase();
      // Check if it's a dark color (eyes, etc) - keep them dark
      if (hex.includes("00") && !hex.includes("ff") && !hex.includes("dd") && !hex.includes("cc") && !hex.includes("aa") && !hex.includes("88")) {
        shape.color = colors.dark;
      } else if (hex.includes("cc") || hex.includes("aa") || hex.includes("88") || hex.includes("66")) {
        // Secondary/darker accent colors
        shape.color = colors.secondary;
      } else {
        // Primary bright colors
        shape.color = colors.primary;
      }
    }
  }

  update(dt) {
    super.update(dt);
    this.animTime += dt;

    // Entry animation - descend from top
    if (this.entering) {
      this.entryProgress += dt * 0.5; // 2 seconds to enter
      if (this.entryProgress >= 1) {
        this.entryProgress = 1;
        this.entering = false;
      }
      // Ease out cubic
      const eased = 1 - Math.pow(1 - this.entryProgress, 3);
      this.y = this.startY + (this.targetY - this.startY) * eased;
      return; // Don't attack while entering
    }

    // Horizontal movement - drift back and forth
    this.x += this.moveSpeed * this.moveDirection * dt;

    // Bounce off screen edges
    const halfWidth = this.width / 2;
    if (this.x < halfWidth + 20) {
      this.x = halfWidth + 20;
      this.moveDirection = 1;
    } else if (this.x > this.game.width - halfWidth - 20) {
      this.x = this.game.width - halfWidth - 20;
      this.moveDirection = -1;
    }

    // Attack timers
    this.missileTimer += dt;
    this.minionTimer += dt;
    if (this.usesLasers) {
      this.laserTimer += dt;
    }
    if (this.usesLightning) {
      this.lightningTimer += dt;
    }

    // Fire missiles at player
    if (this.missileTimer >= this.missileInterval) {
      this.missileTimer = 0;
      this.fireMissile();
    }

    // Fire lasers (boss type 1 special attack)
    if (this.usesLasers && this.laserTimer >= this.laserInterval) {
      this.laserTimer = 0;
      this.fireLaser();
    }

    // Fire lightning (boss type 2 special attack)
    if (this.usesLightning && this.lightningTimer >= this.lightningInterval) {
      this.lightningTimer = 0;
      this.fireLightning();
    }

    // Spawn minions
    if (this.minionTimer >= this.minionInterval && this.minionCount < this.maxMinions) {
      this.minionTimer = 0;
      this.spawnMinion();
    }

    // Hit flash effect
    if (this.isFlashing) {
      this.hitFlashTime -= dt;
      if (this.hitFlashTime <= 0) {
        this.isFlashing = false;
      }
    }
  }

  fireMissile() {
    // Fire a missile from boss position toward player
    if (this.game.spawnBossMissile) {
      this.game.spawnBossMissile(this.x, this.y + this.height / 2);
    }
  }

  fireLaser() {
    // Fire a laser beam directly at player's current position - forces them to move
    if (this.game.spawnLaserBeam) {
      this.game.spawnLaserBeam(this.game.player.x);
    }
  }

  fireLightning() {
    // Fire lightning - the ultimate "pay attention" move
    if (this.game.spawnLightning) {
      this.game.spawnLightning();
    }
  }

  spawnMinion() {
    // Spawn a minion that will float to a position
    if (this.game.spawnBossMinion) {
      const targetX = 100 + Math.random() * (this.game.width - 200);
      const targetY = 200 + Math.random() * 150;

      this.game.spawnBossMinion(this.x, this.y, targetX, targetY, this.bossType);
      this.minionCount++;
    }
  }

  onMinionDestroyed() {
    this.minionCount = Math.max(0, this.minionCount - 1);
  }

  takeDamage() {
    this.health--;
    this.isFlashing = true;
    this.hitFlashTime = 0.1;

    if (this.health <= 0) {
      this.destroy();
      return true; // Boss defeated
    }
    return false;
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Wobble animation
    const wobble = Math.sin(this.animTime * 3) * 3;

    // Flash white when hit
    if (this.isFlashing) {
      this.shape.opacity = 0.5;
    } else {
      this.shape.opacity = 1;
    }

    // Render boss shape
    this.shape.x = 0;
    this.shape.y = wobble;
    this.shape.render();

    // Render health bar above boss (further up to avoid overlap with shape)
    const healthPercent = this.health / this.maxHealth;
    this.healthBarBg.x = 0;
    this.healthBarBg.y = -this.height / 2 - 40;
    this.healthBarBg.render();

    this.healthBarFg.width = this.width * healthPercent;
    this.healthBarFg.x = -(this.width * (1 - healthPercent)) / 2;
    this.healthBarFg.y = -this.height / 2 - 40;

    // Color based on health
    if (healthPercent > 0.5) {
      this.healthBarFg.color = "#00ff00";
    } else if (healthPercent > 0.25) {
      this.healthBarFg.color = "#ffff00";
    } else {
      this.healthBarFg.color = "#ff0000";
    }
    this.healthBarFg.render();
  }

  destroy() {
    this.active = false;
    this.visible = false;
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

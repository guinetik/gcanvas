import { GameObject, Motion } from "../../../src/index.js";
import { Alien } from "./alien.js";
import {
  ALIEN_WIDTH,
  ALIEN_HEIGHT,
  ALIEN_BULLET_SPEED,
  MINION_SCALE,
  MINION_FLOAT_RADIUS,
  MINION_FLOAT_SPEED,
  MINION_BASE_SHOOT_CHANCE,
  MINION_BASE_HEALTH,
} from "./constants.js";

/**
 * BossMinion - smaller versions of the boss alien that float around and shoot
 * Uses Motion.float for patrol-like floating movement
 * Difficulty scales with minion type (matches boss type)
 */
export class BossMinion extends GameObject {
  constructor(game, options = {}) {
    const width = ALIEN_WIDTH * MINION_SCALE;
    const height = ALIEN_HEIGHT * MINION_SCALE;

    super(game, {
      width: width,
      height: height,
      ...options,
    });

    // Type matches the boss type (0=squid, 1=crab, 2=octopus)
    this.minionType = options.minionType || 0;

    // Scale difficulty based on minion type
    this.health = MINION_BASE_HEALTH + this.minionType; // 2, 3, 4
    this.shootChance = MINION_BASE_SHOOT_CHANCE * (1 + this.minionType * 0.5); // 0.006, 0.009, 0.012
    this.points = 50 * (this.minionType + 1); // 50, 100, 150

    // Entry animation - fly to target position
    this.entering = true;
    this.entryProgress = 0;
    this.startX = options.startX || this.x;
    this.startY = options.startY || this.y;
    this.targetX = options.targetX || this.game.width / 2;
    this.targetY = options.targetY || 250;

    // Float animation state
    this.floatTime = 0;
    this.floatState = null;

    // Attack state
    this.animTime = 0;
    this.hitFlashTime = 0;
    this.isFlashing = false;

    // Reference to boss (for notifying when destroyed)
    this.boss = options.boss || null;

    // Create shape using composition - same as Boss but smaller
    this.shape = this.createShape();
  }

  createShape() {
    // Map minion type to the appropriate alien row (must match Boss rowMapping!)
    // Type 0 = Squid (pink) -> row 0
    // Type 1 = Octopus (green) -> row 3
    // Type 2 = Crab (cyan) -> row 1
    const rowMapping = [0, 3, 1];
    const alienRow = rowMapping[this.minionType] ?? 3;

    // Create a temporary alien to get its shape
    const tempAlien = new Alien(this.game, { row: alienRow });
    const shape = tempAlien.shape;

    // Apply scale transform to make it MINION_SCALE times the size
    shape.transform.scale(MINION_SCALE);

    return shape;
  }

  update(dt) {
    super.update(dt);
    this.animTime += dt;

    // Entry animation - fly to target position
    if (this.entering) {
      this.entryProgress += dt * 2; // 0.5 seconds to reach target
      if (this.entryProgress >= 1) {
        this.entryProgress = 1;
        this.entering = false;
        // Set position exactly at target for float center
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        // Ease out cubic interpolation
        const eased = 1 - Math.pow(1 - this.entryProgress, 3);
        this.x = this.startX + (this.targetX - this.startX) * eased;
        this.y = this.startY + (this.targetY - this.startY) * eased;
      }
      return; // Don't shoot while entering
    }

    // Float animation using Motion.float
    this.floatTime += dt;
    const floatResult = Motion.float(
      { x: this.targetX, y: this.targetY }, // Center point
      this.floatTime,
      10, // Duration of one full cycle
      MINION_FLOAT_SPEED,
      0.5, // Randomness
      MINION_FLOAT_RADIUS,
      true, // Loop
      null, // No easing
      {}, // No callbacks
      this.floatState
    );

    this.x = floatResult.x;
    this.y = floatResult.y;
    this.floatState = floatResult.state;

    // Shooting - random chance per frame (scaled by minion type)
    if (Math.random() < this.shootChance) {
      this.shoot();
    }

    // Hit flash effect
    if (this.isFlashing) {
      this.hitFlashTime -= dt;
      if (this.hitFlashTime <= 0) {
        this.isFlashing = false;
      }
    }
  }

  shoot() {
    // Fire a bullet downward toward player
    if (this.game.spawnAlienBullet) {
      this.game.spawnAlienBullet(this.x, this.y + this.height / 2, ALIEN_BULLET_SPEED);
    }
  }

  takeDamage() {
    this.health--;
    this.isFlashing = true;
    this.hitFlashTime = 0.1;

    if (this.health <= 0) {
      this.destroy();
      return true; // Minion defeated
    }
    return false;
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Wobble animation
    const wobble = Math.sin(this.animTime * 6) * 2;

    // Flash when hit
    if (this.isFlashing) {
      this.shape.opacity = 0.5;
    } else {
      this.shape.opacity = 1;
    }

    // Render minion shape
    this.shape.x = 0;
    this.shape.y = wobble;
    this.shape.render();
  }

  destroy() {
    this.active = false;
    this.visible = false;

    // Notify boss that this minion was destroyed
    if (this.boss && this.boss.onMinionDestroyed) {
      this.boss.onMinionDestroyed();
    }
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

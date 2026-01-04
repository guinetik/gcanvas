/**
 * Enemy - Enemy fighter system for StarFaux
 *
 * Enemies spawn far away (high Z, at horizon) and move
 * toward the camera (Z decreases). When Z < 0, they've passed.
 */

import { Painter, Easing } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

/**
 * Individual enemy fighter
 */
class Enemy {
  constructor() {
    this.reset();
  }

  reset() {
    this.worldX = 0;
    this.worldY = 0;
    this.worldZ = 0;
    this.alive = false;
    this.health = 1;
    this.size = CONFIG.enemy.types.fighter.size;
    this.scoreValue = CONFIG.enemy.types.fighter.score;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.damageFlash = 0;  // Flash timer when hit
    // Spawn animation
    this.spawnTime = 0;
    this.spawnDuration = 0.5;  // Half second spawn animation
    this.spawnProgress = 0;
  }

  init(x, y, z) {
    const cfg = CONFIG.enemy.types.fighter;
    this.worldX = x;
    this.worldY = y;
    this.worldZ = z;
    this.alive = true;
    this.health = cfg.health;
    this.size = cfg.size;
    this.scoreValue = cfg.score;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2;
    // Reset spawn animation
    this.spawnTime = 0;
    this.spawnProgress = 0;
  }

  update(dt) {
    if (!this.alive) return;

    // Update spawn animation
    if (this.spawnProgress < 1) {
      this.spawnTime += dt;
      this.spawnProgress = Math.min(1, this.spawnTime / this.spawnDuration);
    }

    // Move TOWARD camera (Z decreases)
    // Also factor in the "rails speed" - world moves toward us
    this.worldZ -= (CONFIG.rails.speed + CONFIG.enemy.types.fighter.speed) * dt;

    // Slight wobble movement for visual interest
    this.worldX += Math.sin(this.worldZ * 0.02) * 0.3;

    // Rotation animation
    this.rotation += this.rotationSpeed * dt;

    // Damage flash decay
    if (this.damageFlash > 0) {
      this.damageFlash -= dt * 5;  // Flash fades quickly
    }

    // Check if passed camera (despawn)
    if (this.worldZ < CONFIG.enemy.despawnDistance) {
      this.alive = false;
    }
  }

  takeDamage() {
    this.health--;
    this.damageFlash = 1;  // Start flash
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  render(ctx, camera, resScale = 1, groundY = 0) {
    if (!this.alive) return;

    const projected = camera.project(this.worldX, this.worldY, this.worldZ);

    // Don't render if behind camera
    if (projected.scale <= 0) return;

    // Don't render if too small (too far away)
    if (projected.scale < 0.08) return;

    // Calculate spawn animation values using easing
    const spawnEased = Easing.easeOutBack(this.spawnProgress);
    const spawnScale = spawnEased;
    const spawnAlpha = Easing.easeOutQuad(this.spawnProgress);

    // Draw shadow on ground (also affected by spawn)
    if (this.spawnProgress > 0.3) {
      this.drawShadow(ctx, camera, resScale * spawnScale, groundY, spawnAlpha);
    }

    ctx.save();
    ctx.translate(projected.x, projected.y);
    ctx.rotate(this.rotation);

    // Apply spawn scale animation (easeOutBack gives a nice overshoot pop-in)
    const totalScale = projected.scale * resScale * spawnScale;
    ctx.scale(totalScale, totalScale);

    // Apply spawn alpha (fade in)
    ctx.globalAlpha = spawnAlpha;

    // Apply damage flash - make whole ship white
    if (this.damageFlash > 0) {
      ctx.globalAlpha = (0.3 + this.damageFlash * 0.7) * spawnAlpha;
    }

    this.drawFighter(ctx, this.damageFlash > 0);

    ctx.restore();
  }

  /**
   * Draw shadow on ground plane to help judge depth
   */
  drawShadow(ctx, camera, resScale, groundY, spawnAlpha = 1) {
    // Project shadow position (same X/Z but at ground level)
    const shadowProjected = camera.project(this.worldX, groundY, this.worldZ);
    if (shadowProjected.scale <= 0) return;

    const shadowSize = this.size * 0.6 * shadowProjected.scale * resScale;
    const alpha = Math.min(0.4, shadowProjected.scale * 2) * spawnAlpha;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#000000";

    // Ellipse shadow (wider than tall for ground projection)
    ctx.beginPath();
    ctx.ellipse(shadowProjected.x, shadowProjected.y, shadowSize, shadowSize * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw enemy fighter shape
   */
  drawFighter(ctx, isFlashing = false) {
    const size = this.size;
    const color = isFlashing ? "#ffffff" : CONFIG.enemy.types.fighter.color;

    // Main body - angular fighter shape
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);           // Top point
    ctx.lineTo(-size * 0.5, size * 0.3);  // Bottom left
    ctx.lineTo(-size * 0.2, size * 0.1);  // Inner left
    ctx.lineTo(0, size * 0.4);            // Bottom center
    ctx.lineTo(size * 0.2, size * 0.1);   // Inner right
    ctx.lineTo(size * 0.5, size * 0.3);   // Bottom right
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = isFlashing ? "#ffffff" : "#aa2222";
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, 0);
    ctx.lineTo(-size * 0.8, size * 0.2);
    ctx.lineTo(-size * 0.5, size * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(size * 0.3, 0);
    ctx.lineTo(size * 0.8, size * 0.2);
    ctx.lineTo(size * 0.5, size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#ffff00";
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Outline for visibility
    ctx.strokeStyle = "#ff6666";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.lineTo(-size * 0.5, size * 0.3);
    ctx.lineTo(size * 0.5, size * 0.3);
    ctx.closePath();
    ctx.stroke();
  }
}

/**
 * EnemySpawner - Manages enemy spawning and lifecycle
 */
export class EnemySpawner {
  constructor(game, camera) {
    this.game = game;
    this.camera = camera;

    // Enemy pool
    this.pool = [];
    this.active = [];

    // Pre-allocate enemy pool
    for (let i = 0; i < 30; i++) {
      this.pool.push(new Enemy());
    }

    // Spawn timing
    this.spawnTimer = 0;
    this.nextSpawnTime = CONFIG.enemy.spawnInterval;
  }

  update(dt) {
    // Spawn new enemies
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnWave();
      this.spawnTimer = 0;
      this.nextSpawnTime = CONFIG.enemy.spawnInterval +
        (Math.random() - 0.5) * CONFIG.enemy.spawnVariance * 2;
    }

    // Update active enemies
    for (let i = this.active.length - 1; i >= 0; i--) {
      const enemy = this.active[i];
      enemy.update(dt);

      // Return dead enemies to pool
      if (!enemy.alive) {
        enemy.reset();
        this.pool.push(enemy);
        this.active.splice(i, 1);
      }
    }
  }

  /**
   * Spawn a wave of enemies
   */
  spawnWave() {
    const patterns = ["single", "pair", "vFormation", "line"];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    // Spawn far away (high Z = at horizon)
    const spawnZ = CONFIG.enemy.spawnDistance;
    // Use scaled bounds for spawn positions
    const scale = this.game.scaleFactor || 1;
    const bounds = {
      x: CONFIG.player.bounds.x * scale,
      y: CONFIG.player.bounds.y * scale
    };

    switch (pattern) {
      case "single":
        // Spawn anywhere across the wide playfield
        this.spawnEnemy(
          (Math.random() - 0.5) * bounds.x * 1.8,
          (Math.random() - 0.5) * bounds.y,
          spawnZ
        );
        break;

      case "pair":
        // Wide pair spread across arena
        this.spawnEnemy(-bounds.x * 0.7, 0, spawnZ);
        this.spawnEnemy(bounds.x * 0.7, 0, spawnZ);
        break;

      case "vFormation":
        // Spread V formation across wider area
        this.spawnEnemy(0, -bounds.y * 0.3, spawnZ);
        this.spawnEnemy(-bounds.x * 0.6, bounds.y * 0.1, spawnZ + 100);
        this.spawnEnemy(bounds.x * 0.6, bounds.y * 0.1, spawnZ + 100);
        break;

      case "line":
        // Line spread across full width
        for (let i = 0; i < 4; i++) {
          this.spawnEnemy(
            -bounds.x * 0.8 + i * (bounds.x * 0.53),
            0,
            spawnZ + i * 80
          );
        }
        break;
    }
  }

  /**
   * Spawn a single enemy at position
   */
  spawnEnemy(x, y, z) {
    let enemy;

    if (this.pool.length > 0) {
      enemy = this.pool.pop();
    } else {
      enemy = new Enemy();
    }

    enemy.init(x, y, z);
    this.active.push(enemy);
  }

  render() {
    const ctx = Painter.ctx;
    const resScale = this.game.scaleFactor || 1;
    const groundY = CONFIG.terrain.yPosition;

    // Sort by Z for proper depth rendering (furthest first = highest Z first)
    this.active.sort((a, b) => b.worldZ - a.worldZ);

    for (const enemy of this.active) {
      enemy.render(ctx, this.camera, resScale, groundY);
    }
  }

  /**
   * Get all active enemies for collision detection
   */
  getActiveEnemies() {
    return this.active;
  }

  /**
   * Reset all enemies (on game restart)
   */
  reset() {
    for (const enemy of this.active) {
      enemy.reset();
      this.pool.push(enemy);
    }
    this.active = [];
    this.spawnTimer = 0;
  }
}

/**
 * StarFaux - A StarFox64-style rail shooter
 *
 * Classic on-rails shooter with:
 * - Pseudo-3D perspective via Camera3D
 * - Wireframe terrain + flat-shaded ships
 * - Player movement, shooting, enemy waves
 *
 * Coordinate Convention:
 * - Camera stays at Z=0, looking into positive Z (toward horizon)
 * - Objects spawn far away (high positive Z) and move toward camera (Z decreases)
 * - When Z <= 0, objects have passed the camera
 */

import { Game, Camera3D, Painter, Keys } from "../../../src/index.js";
import { CONFIG } from "./config.js";
import { Terrain } from "./terrain.js";
import { Player } from "./player.js";
import { LaserPool } from "./laser.js";
import { EnemySpawner } from "./enemy.js";
import { HUD } from "./hud.js";

export class StarfauxGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = CONFIG.colors.background;
  }

  init() {
    super.init();

    // Game state
    this.score = 0;
    this.gameOver = false;
    this.distance = 0;  // Total distance "traveled"
    this.explosionParticles = [];  // Active explosion particles

    // Camera shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Calculate scale factor based on resolution
    this.updateScaleFactor();

    // Center of screen (for projection offset)
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    // Initialize Camera3D for 3D projection
    // Camera positioned ABOVE ground plane - terrain fills ~80% of bottom half
    const cameraHeight = -this.height * 0.35;  // Less extreme = terrain stops before bottom
    this.camera = new Camera3D({
      perspective: CONFIG.rails.perspective * this.scaleFactor,
      rotationX: CONFIG.rails.tiltX,
      rotationY: 0,
      x: 0,
      y: cameraHeight,
      z: 0,
    });

    // Camera target values for smooth interpolation (creates ship-world coupling)
    this.cameraTargetRotX = CONFIG.rails.tiltX;
    this.cameraTargetRotY = 0;

    // Create terrain (wireframe grid)
    this.terrain = new Terrain(this, this.camera);

    // Create player ship
    this.player = new Player(this, this.camera);

    // Create laser pool
    this.laserPool = new LaserPool(this, this.camera);

    // Create enemy spawner
    this.enemySpawner = new EnemySpawner(this, this.camera);

    // Create HUD
    this.hud = new HUD(this);
    this.pipeline.add(this.hud);
  }

  update(dt) {
    if (this.gameOver) {
      // Check for restart
      if (Keys.isDown(Keys.SPACE)) {
        this.restart();
      }
      return;
    }

    super.update(dt);

    // Track distance traveled (for spawning, terrain scrolling)
    this.distance += CONFIG.rails.speed * dt;

    // Update game systems
    this.player.update(dt);

    // Update camera to react to player movement (creates world-ship coupling)
    this.updateCameraReaction(dt);

    this.terrain.update(dt);
    this.laserPool.update(dt);
    this.enemySpawner.update(dt);

    // Check collisions
    this.checkCollisions();

    // Update explosion particles
    this.updateExplosions(dt);

    // Update camera shake
    this.updateShake(dt);

    // Update HUD
    this.hud.setScore(this.score);
    this.hud.setHealth(this.player.health);
  }

  /**
   * Update explosion particles
   */
  updateExplosions(dt) {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.age += dt;

      if (p.age >= p.life) {
        this.explosionParticles.splice(i, 1);
        continue;
      }

      // Move particle
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Gravity and drag
      p.vy += 200 * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  /**
   * Render explosion particles
   */
  renderExplosions(ctx) {
    const scale = this.scaleFactor || 1;

    for (const p of this.explosionParticles) {
      const projected = this.camera.project(p.x, p.y, p.z);
      if (projected.scale <= 0) continue;

      const progress = p.age / p.life;
      const alpha = 1 - progress;
      const size = p.size * projected.scale * scale * (1 + progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10 * scale;

      ctx.beginPath();
      ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  render() {
    // Clear and set up context (but don't render pipeline yet)
    Painter.setContext(this.ctx);
    if (this.running) {
      this.clear();
    }

    // Render in depth order: terrain -> enemies -> explosions -> lasers -> player
    Painter.useCtx((ctx) => {
      ctx.save();
      // Apply camera shake offset
      ctx.translate(
        this.centerX + this.shakeOffsetX,
        this.centerY + this.shakeOffsetY
      );

      this.terrain.render();
      this.enemySpawner.render();
      this.renderExplosions(ctx);
      this.laserPool.render();
      this.player.render();

      ctx.restore();
    });

    // HUD renders on top AFTER game world
    this.pipeline.render();

    // Game over overlay
    if (this.gameOver) {
      this.renderGameOver();
    }
  }

  /**
   * Update camera rotation to react to player movement
   * Only subtle vertical tilt - no horizontal rotation (looks weird)
   */
  updateCameraReaction(dt) {
    const rails = CONFIG.rails;
    const bounds = CONFIG.player.bounds;

    // Calculate normalized player Y position (-1 to 1)
    const normalizedY = this.player.offsetY / bounds.y;

    // When player moves up, camera tilts slightly less (looking more forward)
    // No X movement reaction - horizontal rotation looks weird
    this.cameraTargetRotX = rails.tiltX - normalizedY * rails.cameraReactY;

    // Smoothly interpolate camera to target (creates inertia feeling)
    const lag = rails.cameraLag * dt;
    this.camera.rotationX += (this.cameraTargetRotX - this.camera.rotationX) * lag;
    // Keep Y rotation at 0
    this.camera.rotationY = 0;
  }

  /**
   * Fire a laser from the player's position straight ahead
   */
  fireLaser(x, y) {
    // Laser starts at ship position and travels straight forward
    this.laserPool.fire(x, y, CONFIG.player.shipZ);
  }

  /**
   * Check all collisions between lasers and enemies
   */
  checkCollisions() {
    const lasers = this.laserPool.getActiveLasers();
    const enemies = this.enemySpawner.getActiveEnemies();

    // Laser vs Enemy
    for (const laser of lasers) {
      if (!laser.alive) continue;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;

        if (this.checkCollision3D(laser, enemy)) {
          laser.alive = false;
          enemy.takeDamage();
          if (!enemy.alive) {
            this.score += enemy.scoreValue;
            this.spawnExplosion(enemy.worldX, enemy.worldY, enemy.worldZ);
          }
        }
      }
    }

    // Player vs Enemy
    if (!this.player.isInvincible) {
      const playerZ = CONFIG.player.shipZ;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;

        // Only check collision when enemy is near player's Z
        if (Math.abs(enemy.worldZ - playerZ) < 60) {
          if (this.checkPlayerCollision(enemy)) {
            this.player.takeDamage();
            enemy.alive = false;
            this.spawnExplosion(enemy.worldX, enemy.worldY, enemy.worldZ);

            if (this.player.health <= 0) {
              this.triggerGameOver();
            }
          }
        }
      }

      // Player vs Terrain - use actual ship Y position (includes screenY offset)
      const shipY = this.player.offsetY + CONFIG.player.screenY * this.scaleFactor;
      if (this.terrain.checkPlayerCollision(this.player.offsetX, shipY)) {
        this.player.takeDamage();

        // Strong bounce - set position AND velocity to push ship up
        this.player.offsetY = -this.player.boundsY * 0.5;  // Move to upper half of play area
        this.player.velocityY = -600 * this.scaleFactor;  // Strong upward velocity

        // Camera shake feedback - stronger and longer
        this.triggerShake(25, 0.4);

        if (this.player.health <= 0) {
          this.triggerGameOver();
        }
      }
    }
  }

  /**
   * Trigger camera shake effect
   */
  triggerShake(intensity, duration) {
    this.shakeIntensity = intensity * this.scaleFactor;
    this.shakeDuration = duration;
    this.shakeTime = 0;  // Reset shake timer for consistent pattern
  }

  /**
   * Update camera shake
   */
  updateShake(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeTime = (this.shakeTime || 0) + dt;

      // Sine-based shake for smoother, more consistent rumble
      const decay = Math.max(0, this.shakeDuration / 0.4);
      const intensity = this.shakeIntensity * decay;
      const freq = 30;  // Shake frequency

      this.shakeOffsetX = Math.sin(this.shakeTime * freq) * intensity;
      this.shakeOffsetY = Math.cos(this.shakeTime * freq * 1.3) * intensity * 0.7;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /**
   * 2D collision check - only X and Z matter (like classic rail shooters)
   * Ignores Y height difference since lasers and enemies are on different planes visually
   */
  checkCollision3D(a, b) {
    const dx = a.worldX - b.worldX;
    const dz = a.worldZ - b.worldZ;
    // Ignore Y - if laser is at same X and Z as enemy, it's a hit
    const dist = Math.sqrt(dx * dx + dz * dz);
    const combinedSize = (a.size + b.size);
    return dist < combinedSize;
  }

  /**
   * Check collision between player and an enemy (X only, Z already checked)
   */
  checkPlayerCollision(enemy) {
    const dx = this.player.offsetX - enemy.worldX;
    // Just check X distance - Z is already filtered before this is called
    const dist = Math.abs(dx);
    const combinedSize = (CONFIG.player.size + enemy.size);
    return dist < combinedSize;
  }

  /**
   * Spawn explosion effect at position
   */
  spawnExplosion(x, y, z) {
    // Create particles for explosion
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      this.explosionParticles.push({
        x, y, z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,  // Slight upward bias
        vz: (Math.random() - 0.5) * 60,
        life: 0.4 + Math.random() * 0.2,
        age: 0,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? "#ffff00" : "#ff6600",
      });
    }
  }

  /**
   * Trigger game over state
   */
  triggerGameOver() {
    this.gameOver = true;
  }

  /**
   * Render game over screen
   */
  renderGameOver() {
    const scale = this.scaleFactor || 1;

    Painter.useCtx((ctx) => {
      // Darken background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, this.width, this.height);

      // Game Over text - scale fonts with resolution
      ctx.fillStyle = CONFIG.colors.hud;
      ctx.font = `bold ${48 * scale}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", this.centerX, this.centerY - 40 * scale);

      ctx.font = `${24 * scale}px monospace`;
      ctx.fillText(`Final Score: ${this.score}`, this.centerX, this.centerY + 20 * scale);
      ctx.fillText("Press SPACE to restart", this.centerX, this.centerY + 60 * scale);
    });
  }

  /**
   * Restart the game
   */
  restart() {
    this.score = 0;
    this.gameOver = false;
    this.distance = 0;
    this.player.reset();
    this.laserPool.reset();
    this.enemySpawner.reset();
  }

  /**
   * Calculate scale factor based on current resolution vs reference
   * This ensures the game looks consistent across different screen sizes
   */
  updateScaleFactor() {
    const refWidth = CONFIG.referenceWidth;
    const refHeight = CONFIG.referenceHeight;

    // Use the larger dimension's ratio to ensure everything fits
    // For 4K (3840x2160), this gives us ~2.0 scale factor
    this.scaleFactor = Math.max(
      this.width / refWidth,
      this.height / refHeight
    );

    // Also calculate terrain width based on actual screen width
    this.terrainWidth = this.width * (CONFIG.terrain.widthMultiplier || 6);
  }

  /**
   * Handle window resize - recalculate all resolution-dependent values
   */
  onResize() {
    this.updateScaleFactor();

    // Update center coordinates
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    // Guard: these don't exist yet during constructor (enableFluidSize runs before init)
    if (!this.camera) return;

    // Update camera for new resolution
    this.camera.perspective = CONFIG.rails.perspective * this.scaleFactor;
    this.camera.y = -this.height * 0.35;  // Camera height scales with screen

    // Notify terrain of new dimensions
    if (this.terrain) {
      this.terrain.updateDimensions();
    }

    // Update player bounds for new resolution
    if (this.player) {
      this.player.updateBounds();
    }
  }

  /**
   * Get scaled value - multiply by scale factor for resolution independence
   */
  scaled(value) {
    return value * this.scaleFactor;
  }
}

// Bootstrap
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new StarfauxGame(canvas);
  game.start();
});

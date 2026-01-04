/**
 * Player - The Arwing-style player ship for StarFaux
 *
 * The ship is viewed from BEHIND (3rd person), positioned in the
 * lower portion of the screen. Player moves left/right/up/down only.
 * Crosshair is locked to ship position - lasers fire straight ahead.
 */

import { Keys, Painter } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

export class Player {
  constructor(game, camera) {
    this.game = game;
    this.camera = camera;

    // Ship position offset from center (keyboard controlled)
    this.offsetX = 0;
    this.offsetY = 0;

    // Velocity for physics-based movement
    this.velocityX = 0;
    this.velocityY = 0;

    // Visual banking (rotation based on horizontal movement)
    this.bankAngle = 0;
    this.targetBank = 0;

    // Pitch angle (tilt up/down based on vertical movement)
    this.pitchAngle = 0;

    // Shooting
    this.fireTimer = 0;

    // Health and invincibility
    this.health = CONFIG.player.maxHealth;
    this.isInvincible = false;
    this.invincibilityTimer = 0;

    // Visual flash when invincible
    this.flashTimer = 0;
    this.visible = true;

    // Calculate scaled bounds
    this.updateBounds();
  }

  /**
   * Update movement bounds based on current screen size
   */
  updateBounds() {
    const scale = this.game.scaleFactor || 1;
    this.boundsX = CONFIG.player.bounds.x * scale;
    this.boundsY = CONFIG.player.bounds.y * scale;
  }

  update(dt) {
    const cfg = CONFIG.player;
    const scale = this.game.scaleFactor || 1;
    const accel = cfg.acceleration * scale;
    const maxSpeed = cfg.moveSpeed * scale;

    // Track input for banking
    this.targetBank = 0;
    let inputX = 0;
    let inputY = 0;

    // Handle movement input - builds acceleration, not direct position
    if (Keys.isDown(Keys.LEFT) || Keys.isDown(Keys.A)) {
      inputX = -1;
      this.targetBank = -cfg.bankAngle;
    }
    if (Keys.isDown(Keys.RIGHT) || Keys.isDown(Keys.D)) {
      inputX = 1;
      this.targetBank = cfg.bankAngle;
    }
    if (Keys.isDown(Keys.UP) || Keys.isDown(Keys.W)) {
      inputY = -1;  // Up = negative Y
    }
    if (Keys.isDown(Keys.DOWN) || Keys.isDown(Keys.S)) {
      inputY = 1;   // Down = positive Y
    }

    // Apply acceleration based on input
    if (inputX !== 0) {
      this.velocityX += inputX * accel * dt;
    }
    if (inputY !== 0) {
      // Climbing (going up, inputY = -1) is harder than falling
      const resistance = inputY < 0 ? cfg.climbResistance : 1.0;
      this.velocityY += inputY * accel * resistance * dt;
    }

    // Apply gravity (always pulls down = positive Y)
    this.velocityY += cfg.gravity * scale * dt;

    // Apply damping (drag) - velocity decays when no input
    if (inputX === 0) {
      this.velocityX *= cfg.damping;
    }
    if (inputY === 0) {
      this.velocityY *= cfg.damping;
    }

    // Clamp velocity to max speed
    this.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocityX));
    this.velocityY = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocityY));

    // Apply velocity to position
    this.offsetX += this.velocityX * dt;
    this.offsetY += this.velocityY * dt;

    // Clamp position to bounds (with velocity bounce-back)
    if (this.offsetX < -this.boundsX) {
      this.offsetX = -this.boundsX;
      this.velocityX *= -0.3;  // Soft bounce
    } else if (this.offsetX > this.boundsX) {
      this.offsetX = this.boundsX;
      this.velocityX *= -0.3;
    }
    if (this.offsetY < -this.boundsY) {
      this.offsetY = -this.boundsY;
      this.velocityY *= -0.3;
    } else if (this.offsetY > this.boundsY) {
      this.offsetY = this.boundsY;
      this.velocityY *= -0.3;
    }

    // Smooth banking interpolation (also affected by velocity for more natural feel)
    const velocityBank = (this.velocityX / maxSpeed) * cfg.bankAngle * 0.5;
    this.bankAngle += (this.targetBank + velocityBank - this.bankAngle) * cfg.bankSpeed * dt;

    // Pitch based on INPUT, not velocity - returns to neutral when keys released
    const maxPitch = 0.35;  // Max pitch angle in radians
    const targetPitch = -inputY * maxPitch;  // -1 (up key) = positive pitch (nose up), 1 (down key) = negative pitch (nose down)
    this.pitchAngle += (targetPitch - this.pitchAngle) * cfg.bankSpeed * dt;

    // Handle shooting
    this.fireTimer -= dt;
    if (Keys.isDown(Keys.SPACE) && this.fireTimer <= 0) {
      this.shoot();
      this.fireTimer = cfg.fireRate;
    }

    // Handle invincibility
    if (this.isInvincible) {
      this.invincibilityTimer -= dt;
      this.flashTimer += dt;

      // Flash visibility based on config blink rate
      const blinkRate = CONFIG.player.blinkRate || 0.1;
      this.visible = Math.floor(this.flashTimer / blinkRate) % 2 === 0;

      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.visible = true;
      }
    }
  }

  shoot() {
    // Fire from ship position straight ahead
    const cfg = CONFIG.player;
    const resScale = this.game.scaleFactor || 1;
    const shipY = this.offsetY + cfg.screenY * resScale;
    this.game.fireLaser(this.offsetX, shipY);
  }

  takeDamage() {
    if (this.isInvincible) return;

    this.health--;
    this.isInvincible = true;
    this.invincibilityTimer = CONFIG.player.invincibilityTime || 1.5;
    this.flashTimer = 0;
  }

  reset() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.bankAngle = 0;
    this.pitchAngle = 0;
    this.health = CONFIG.player.maxHealth;
    this.isInvincible = false;
    this.visible = true;
  }

  render() {
    if (!this.visible) return;

    const ctx = Painter.ctx;
    const cfg = CONFIG.player;

    // First render the shadow (on ground plane)
    this.renderShadow(ctx);

    // Then render the crosshair (ahead of ship, where we're aiming)
    this.renderCrosshair(ctx);

    // Then render the ship (behind crosshair, lower on screen)
    this.renderShip(ctx);
  }

  /**
   * Render shadow on the ground plane
   */
  renderShadow(ctx) {
    const camera = this.camera;
    const cfg = CONFIG.player;
    const resScale = this.game.scaleFactor || 1;

    // Shadow is projected onto ground (y = 0)
    const groundY = 0;
    const shadowZ = cfg.shipZ;

    // Project shadow position
    const projected = camera.project(this.offsetX, groundY, shadowZ);

    if (projected.scale <= 0) return;

    // Shadow size scales with ship height above ground
    // Higher ship = smaller, more diffuse shadow
    const shipY = this.offsetY + cfg.screenY * resScale;
    const heightAboveGround = Math.abs(shipY - groundY);
    const shadowScale = Math.max(0.3, 1 - heightAboveGround / 400);
    const shadowSize = cfg.size * projected.scale * resScale * shadowScale;

    // Shadow opacity also fades with height
    const shadowAlpha = Math.max(0.1, 0.5 * shadowScale);

    ctx.save();
    ctx.globalAlpha = shadowAlpha;
    ctx.fillStyle = "#333333";  // Gray shadow for better visibility

    // Draw ellipse shadow
    ctx.beginPath();
    ctx.ellipse(
      projected.x,
      projected.y,
      shadowSize * 1.5,     // Wider
      shadowSize * 0.4,     // Flatter (perspective)
      0, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render the targeting crosshair (locked to ship position)
   */
  renderCrosshair(ctx) {
    const camera = this.camera;
    const cfg = CONFIG.player;
    const scale = this.game.scaleFactor || 1;

    // Crosshair is at same X/Y as ship but further into the screen
    const projected = camera.project(this.offsetX, this.offsetY, cfg.crosshairZ);

    if (projected.scale <= 0) return;

    // Scale crosshair size with resolution
    const size = 25 * projected.scale * scale;

    ctx.save();
    ctx.translate(projected.x, projected.y);

    ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";  // Red crosshair
    ctx.lineWidth = 2 * scale;

    // Square bracket crosshair like StarFox
    const half = size;
    const corner = size * 0.3;

    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(-half, -half + corner);
    ctx.lineTo(-half, -half);
    ctx.lineTo(-half + corner, -half);
    // Top-right corner
    ctx.moveTo(half - corner, -half);
    ctx.lineTo(half, -half);
    ctx.lineTo(half, -half + corner);
    // Bottom-right corner
    ctx.moveTo(half, half - corner);
    ctx.lineTo(half, half);
    ctx.lineTo(half - corner, half);
    // Bottom-left corner
    ctx.moveTo(-half + corner, half);
    ctx.lineTo(-half, half);
    ctx.lineTo(-half, half - corner);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render the ship from behind (3rd person view)
   */
  renderShip(ctx) {
    const camera = this.camera;
    const cfg = CONFIG.player;
    const resScale = this.game.scaleFactor || 1;

    // Ship is closer to camera than crosshair, and offset down on screen
    const shipY = this.offsetY + cfg.screenY * resScale;  // Push ship down visually (scaled)
    const projected = camera.project(this.offsetX, shipY, cfg.shipZ);

    if (projected.scale <= 0) return;

    ctx.save();
    ctx.translate(projected.x, projected.y);

    // Apply bank rotation (left/right tilt)
    ctx.rotate(this.bankAngle);

    // Apply both perspective scale AND resolution scale
    const baseScale = projected.scale * resScale;
    ctx.scale(baseScale, baseScale);

    // Apply pitch by skewing the Y axis (simulates 3D tilt toward/away from camera)
    // At neutral (pitchAngle = 0): no transform applied
    // Pitching up (positive): ship leans back, appears compressed vertically
    // Pitching down (negative): ship leans forward
    if (Math.abs(this.pitchAngle) > 0.01) {
      const pitchSkew = Math.sin(this.pitchAngle) * 0.4;
      const pitchScale = 1 - Math.abs(this.pitchAngle) * 0.3;  // Compress when pitched
      ctx.transform(1, pitchSkew, 0, pitchScale, 0, 0);
    }

    // Draw ship from BEHIND (we see the back of it)
    this.drawShipFromBehind(ctx);

    ctx.restore();
  }

  /**
   * Draw the ship as seen from behind
   * We see the engines, back of wings, tail
   */
  drawShipFromBehind(ctx) {
    const colors = CONFIG.colors;
    const size = CONFIG.player.size;

    // Main fuselage (back view - wider at back)
    ctx.fillStyle = colors.player;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);           // Top (nose pointing away)
    ctx.lineTo(-size * 0.3, -size * 0.4); // Upper left
    ctx.lineTo(-size * 0.4, size * 0.4);  // Lower left
    ctx.lineTo(0, size * 0.2);            // Bottom center
    ctx.lineTo(size * 0.4, size * 0.4);   // Lower right
    ctx.lineTo(size * 0.3, -size * 0.4);  // Upper right
    ctx.closePath();
    ctx.fill();

    // Left wing (seen from above/behind)
    ctx.fillStyle = colors.playerAccent;
    ctx.beginPath();
    ctx.moveTo(-size * 0.35, -size * 0.2);
    ctx.lineTo(-size * 1.3, size * 0.1);
    ctx.lineTo(-size * 1.1, size * 0.3);
    ctx.lineTo(-size * 0.4, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(size * 0.35, -size * 0.2);
    ctx.lineTo(size * 1.3, size * 0.1);
    ctx.lineTo(size * 1.1, size * 0.3);
    ctx.lineTo(size * 0.4, size * 0.2);
    ctx.closePath();
    ctx.fill();

    // Engine glows (3 engines like Arwing)
    // Thruster intensity based on vertical movement
    // Going UP (negative velocityY) = MORE thrust (climbing)
    // Going DOWN (positive velocityY) = LESS thrust (falling/gliding)
    const maxSpeed = CONFIG.player.moveSpeed * (this.game.scaleFactor || 1);
    const thrustFactor = 1 - (this.velocityY / maxSpeed);  // 0.5 to 1.5 range roughly
    const thrustIntensity = Math.max(0.3, Math.min(2.0, thrustFactor));

    // Flame length extends when thrusting hard
    const flameLength = size * 0.15 * thrustIntensity;
    const flameFlicker = 1 + Math.sin(Date.now() * 0.02) * 0.15;  // Subtle flicker

    // Color shifts from orange (idle) to bright yellow-white (full thrust)
    const r = Math.min(255, Math.floor(255));
    const g = Math.min(255, Math.floor(100 + thrustIntensity * 80));
    const b = Math.min(255, Math.floor(thrustIntensity * 60));
    const thrustColor = `rgb(${r}, ${g}, ${b})`;

    ctx.fillStyle = thrustColor;
    ctx.shadowColor = thrustIntensity > 1 ? "#ffff00" : "#ff8800";
    ctx.shadowBlur = 10 + thrustIntensity * 10;

    // Center engine (main thruster)
    ctx.beginPath();
    ctx.ellipse(0, size * 0.3, size * 0.15, size * 0.1 * flameFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center engine flame trail (extends when climbing)
    if (thrustIntensity > 0.8) {
      const trailLength = flameLength * flameFlicker;
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, size * 0.35);
      ctx.lineTo(0, size * 0.35 + trailLength);
      ctx.lineTo(size * 0.1, size * 0.35);
      ctx.closePath();
      ctx.fill();
    }

    // Left engine
    ctx.beginPath();
    ctx.ellipse(-size * 0.5, size * 0.25, size * 0.1, size * 0.07 * flameFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left engine flame trail
    if (thrustIntensity > 0.8) {
      const trailLength = flameLength * 0.7 * flameFlicker;
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, size * 0.28);
      ctx.lineTo(-size * 0.5, size * 0.28 + trailLength);
      ctx.lineTo(-size * 0.45, size * 0.28);
      ctx.closePath();
      ctx.fill();
    }

    // Right engine
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.25, size * 0.1, size * 0.07 * flameFlicker, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right engine flame trail
    if (thrustIntensity > 0.8) {
      const trailLength = flameLength * 0.7 * flameFlicker;
      ctx.beginPath();
      ctx.moveTo(size * 0.45, size * 0.28);
      ctx.lineTo(size * 0.5, size * 0.28 + trailLength);
      ctx.lineTo(size * 0.55, size * 0.28);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // Tail fin
    ctx.fillStyle = colors.player;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.8);
    ctx.lineTo(-size * 0.08, -size * 0.3);
    ctx.lineTo(size * 0.08, -size * 0.3);
    ctx.closePath();
    ctx.fill();

    // Wing detail lines
    ctx.strokeStyle = colors.player;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, 0);
    ctx.lineTo(-size * 1.1, size * 0.2);
    ctx.moveTo(size * 0.5, 0);
    ctx.lineTo(size * 1.1, size * 0.2);
    ctx.stroke();
  }
}

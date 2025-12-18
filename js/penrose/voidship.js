/**
 * VoidShip - Player ship in the void dimension (inside black hole)
 *
 * A purple-tinted ship for navigating the singularity void.
 * Uses direct position control (no physics) - the void doesn't
 * follow normal spacetime rules.
 *
 * @extends GameObject
 */

import { GameObject, Group, Keys, Rectangle } from "/gcanvas.es.min.js";
import { CONFIG } from "./constants.js";

const COLLISION_RADIUS = 15;

export class VoidShip extends GameObject {
  constructor(game) {
    super(game);

    // Screen coordinates (not Penrose - we're inside the singularity)
    this.x = 0;
    this.y = 0;

    // Build ship visual (purple-tinted version of main ship)
    this.shipGroup = new Group({});

    // Main body
    const body = new Rectangle({
      width: 12,
      height: 16,
      color: "#a0f",
    });

    // Nose
    const nose = new Rectangle({
      width: 4,
      height: 8,
      y: -10,
      color: "#a0f",
    });

    // Wings
    const leftWing = new Rectangle({
      width: 8,
      height: 6,
      x: -10,
      y: 4,
      color: "#80a",
    });
    const rightWing = new Rectangle({
      width: 8,
      height: 6,
      x: 10,
      y: 4,
      color: "#80a",
    });

    // Engine glow (purple flames)
    this.engineLeft = new Rectangle({
      width: 4,
      height: 4,
      x: -4,
      y: 10,
      color: "#f0f",
    });
    this.engineRight = new Rectangle({
      width: 4,
      height: 4,
      x: 4,
      y: 10,
      color: "#c0f",
    });

    this.shipGroup.add(body);
    this.shipGroup.add(nose);
    this.shipGroup.add(leftWing);
    this.shipGroup.add(rightWing);
    this.shipGroup.add(this.engineLeft);
    this.shipGroup.add(this.engineRight);

    this.engineTimer = 0;
  }

  /**
   * Reset ship to center of screen
   */
  reset() {
    this.x = this.game.width / 2;
    this.y = this.game.height / 2;
  }

  /**
   * Update ship position based on input
   * Direct position control - no velocity/physics in the void
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);

    const leftPressed = Keys.isDown("a") || Keys.isDown("A") || Keys.isDown(Keys.LEFT);
    const rightPressed = Keys.isDown("d") || Keys.isDown("D") || Keys.isDown(Keys.RIGHT);
    const upPressed = Keys.isDown("w") || Keys.isDown("W") || Keys.isDown(Keys.UP);
    const downPressed = Keys.isDown("s") || Keys.isDown("S") || Keys.isDown(Keys.DOWN);

    const speed = CONFIG.voidShipSpeed;

    if (leftPressed) this.x -= speed * dt;
    if (rightPressed) this.x += speed * dt;
    if (upPressed) this.y -= speed * dt;
    if (downPressed) this.y += speed * dt;

    // Clamp to screen bounds (with margin)
    const margin = 30;
    this.x = Math.max(margin, Math.min(this.game.width - margin, this.x));
    this.y = Math.max(margin, Math.min(this.game.height - margin, this.y));

    // Engine flicker
    this.engineTimer += dt * 20;
    const flicker = Math.sin(this.engineTimer) > 0;
    this.engineLeft.color = flicker ? "#f0f" : "#c0f";
    this.engineRight.color = flicker ? "#c0f" : "#f0f";
  }

  /**
   * Render the void ship
   */
  render() {
    this.shipGroup.x = this.x;
    this.shipGroup.y = this.y;
    this.shipGroup.render();
  }

  /**
   * Get collision circle for this ship (screen coordinates)
   * @returns {{ x: number, y: number, radius: number }}
   */
  getCircle() {
    return {
      x: this.x,
      y: this.y,
      radius: COLLISION_RADIUS,
    };
  }
}

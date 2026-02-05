import { GameObject, Circle, Star, Group } from "../../../src/index.js";
import { POWERUP_SIZE, POWERUP_FALL_SPEED } from "./constants.js";

export class StarPowerUp extends GameObject {
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

    // Glowing background - centered
    const glow = new Circle(POWERUP_SIZE / 2 + 6, {
      color: "rgba(255, 215, 0, 0.4)",
      origin: "center",
    });

    // Main star - golden, centered
    this.star = new Star(POWERUP_SIZE / 2, 5, 0.5, {
      color: "#ffd700", // Gold
      origin: "center",
    });

    // Inner highlight - centered
    const innerStar = new Star(POWERUP_SIZE / 4, 5, 0.5, {
      color: "#ffec8b", // Light gold
      origin: "center",
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

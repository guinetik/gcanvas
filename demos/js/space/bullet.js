import { GameObject, Rectangle, Group } from "../../../src/index.js";
import { BULLET_SPEED, BULLET_WIDTH, BULLET_HEIGHT } from "./constants.js";

export class Bullet extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: BULLET_WIDTH,
      height: BULLET_HEIGHT,
      ...options,
    });

    this.speed = options.speed || BULLET_SPEED;
    this.direction = options.direction || -1; // -1 = up, 1 = down
    this.isPlayerBullet = options.isPlayerBullet !== false;

    // Angle for spread shots (degrees, 0 = straight, negative = left, positive = right)
    this.angle = (options.angle || 0) * Math.PI / 180; // Convert to radians
    this.velocityX = Math.sin(this.angle) * this.speed;
    this.velocityY = Math.cos(this.angle) * this.speed * this.direction;

    // Create laser-style bullet with glow effect (cached for performance)
    this.shape = new Group({ cacheRendering: true });

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

    // Move with angle support
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;

    // Remove if off screen
    if (this.y < -BULLET_HEIGHT || this.y > this.game.height + BULLET_HEIGHT ||
        this.x < -BULLET_WIDTH || this.x > this.game.width + BULLET_WIDTH) {
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

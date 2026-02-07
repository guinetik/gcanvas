import { GameObject, Circle, TextShape, Group } from "/gcanvas.es.min.js";
import { POWERUP_SIZE, POWERUP_FALL_SPEED } from "./constants.js";

export class PowerUp extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      ...options,
    });

    this.speed = POWERUP_FALL_SPEED;
    this.bobTime = Math.random() * Math.PI * 2;

    // Create 1-Up visual - pastel green life icon (cached for performance)
    this.shape = new Group({ cacheRendering: true });

    // Glowing background - centered
    const glow = new Circle(POWERUP_SIZE / 2 + 4, {
      color: "rgba(144, 238, 144, 0.4)",
      origin: "center",
    });

    // Main body - pastel green, centered
    const body = new Circle(POWERUP_SIZE / 2, {
      color: "#98fb98", // Pale green
      origin: "center",
    });

    // "1UP" text - centered via align/baseline
    this.label = new TextShape("1UP", {
      font: "bold 10px monospace",
      color: "#ffffff",
      align: "center",
      baseline: "middle",
      origin: "center",
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

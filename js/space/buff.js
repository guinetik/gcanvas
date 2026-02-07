import { GameObject, Circle } from "/gcanvas.es.min.js";

export class AbsorbEffect extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    this.particles = [];
    this.lifetime = 0.4; // Shorter lifetime for better performance
    this.age = 0;
    this.targetX = options.targetX || this.x;
    this.targetY = options.targetY || this.y;
    this.color = options.color || "#98fb98";

    // Create particles that will fly toward target (optimized count)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 25 + Math.random() * 15;
      const size = 3 + Math.random() * 3;

      this.particles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: size,
        shape: new Circle(size, {
          color: this.color,
          origin: "center",
        }),
      });
    }
  }

  update(dt) {
    super.update(dt);
    this.age += dt;

    if (this.age >= this.lifetime) {
      this.active = false;
      this.visible = false;
      return;
    }

    // Update target to follow player
    if (this.game.player) {
      this.targetX = this.game.player.x;
      this.targetY = this.game.player.y;
    }

    // Move particles toward target (relative to effect origin)
    const progress = this.age / this.lifetime;
    const targetRelX = this.targetX - this.x;
    const targetRelY = this.targetY - this.y;

    for (const p of this.particles) {
      // Lerp toward target
      p.x += (targetRelX - p.x) * dt * 5;
      p.y += (targetRelY - p.y) * dt * 5;

      // Shrink and fade
      p.shape.opacity = 1 - progress;
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    for (const p of this.particles) {
      p.shape.x = p.x;
      p.shape.y = p.y;
      p.shape.render();
    }
  }
}

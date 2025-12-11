import { GameObject, Rectangle, Circle } from "/gcanvas.es.min.js";

export class Explosion extends GameObject {
  constructor(game, options = {}) {
    super(game, options);

    this.particles = [];
    this.lifetime = 0.4; // Shorter lifetime for better performance
    this.age = 0;
    this.baseColor = options.color || "#ffff00";

    // Color palette for explosion - varies based on base color
    const colors = this.baseColor === "#ffff00"
      ? ["#ffffff", "#ffff00", "#ffaa00", "#ff6600"] // Yellow explosion
      : ["#ffffff", "#ff8888", "#ff4444", "#ff0000"]; // Red explosion

    // Optimized particle count (8 circles + 3 squares = 11 total)
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 100;
      const size = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        shape: new Circle(size, { color: color }),
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }

    // Add some square debris
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const size = 2 + Math.random() * 3;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        shape: new Rectangle({ width: size, height: size, color: color }),
        rotSpeed: (Math.random() - 0.5) * 15,
        rotation: 0,
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

    // Update particles with gravity and fade
    const progress = this.age / this.lifetime;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 100 * dt; // Gravity
      p.vx *= 0.99; // Air resistance

      // Fade and shrink
      p.shape.opacity = 1 - progress * progress;

      // Rotate debris
      if (p.rotation !== undefined) {
        p.rotation += p.rotSpeed * dt;
      }
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Render particles relative to origin - parent transform positions us correctly
    for (const p of this.particles) {
      p.shape.x = p.x;
      p.shape.y = p.y;
      if (p.rotation !== undefined) {
        p.shape.rotation = p.rotation * (180 / Math.PI); // Convert to degrees
      }
      p.shape.render();
    }
  }
}

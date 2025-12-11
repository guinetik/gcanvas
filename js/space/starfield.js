import { GameObject, Circle } from "/gcanvas.es.min.js";

export class Starfield extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.stars = [];
    this.initialized = false;
  }

  initStars() {
    if (this.initialized || this.game.width === 0) return;
    this.initialized = true;

    // Optimized star count - cap at 100 stars max
    const area = this.game.width * this.game.height;
    const starCount = Math.min(100, Math.floor(area / 15000)); // ~1 star per 15000 pixels, max 100

    for (let i = 0; i < starCount; i++) {
      const size = 1 + Math.random() * 1.5;
      this.stars.push({
        x: Math.random() * this.game.width,
        y: Math.random() * this.game.height,
        size: size,
        speed: 15 + Math.random() * 30,
        shape: new Circle(size, {
          color: `rgba(255,255,255,${0.4 + Math.random() * 0.5})`,
        }),
      });
    }
  }

  update(dt) {
    super.update(dt);

    // Initialize stars on first update when dimensions are known
    if (!this.initialized) {
      this.initStars();
    }

    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.game.height) {
        star.y = 0;
        star.x = Math.random() * this.game.width;
      }
    }
  }

  draw() {
    super.draw();

    for (const star of this.stars) {
      star.shape.x = star.x;
      star.shape.y = star.y;
      star.shape.render();
    }
  }
}

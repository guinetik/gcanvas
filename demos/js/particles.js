import {
  Game,
  GameObject,
  FPSCounter,
  Button,
  Scene,
  Text,
} from "../../src/game";
import { Painter } from "../../src/painter";
import * as Shapes from "../../src/shapes";

class ParticlesGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
    this.NUM_PARTICLES = 500;
  }

  init() {
    super.init();
    this.mouse = { x: this.width / 2, y: this.height / 2 };
    // Create particle scene (below UI)
    this.particleScene = new Scene(this);
    this.pipeline.add(this.particleScene);
    // Create UI scene (above particles)
    this.uiScene = new Scene(this);
    this.pipeline.add(this.uiScene);
    // Add buttons
    this.uiScene.add(
      new Button(this, {
        x: 70,
        y: 80,
        text: "Clear",
        onClick: this.clearParticles.bind(this),
      })
    );
    this.uiScene.add(
      new Button(this, {
        x: 70,
        y: 130,
        text: "Reset",
        onClick: () => {
          Painter.clear();
          this.clearParticles();
          this.spawnParticles();
        },
      })
    );
    this.particlesCounter = this.uiScene.add(
      new Text(this, "Particles", {
        x: 10,
        y: 160,
      })
    );
    // Input logic...
    this.events.on("mousemove", (e) => {
      this.mouse.x = e.x;
      this.mouse.y = e.y;
      if (this.isDown) {
        const p = new Particle(this, this.mouse.x, this.mouse.y);
        this.particleScene.add(p);
        this.particles.push(p);
      }
    });
    this.events.on("inputdown", () => (this.isDown = true));
    this.events.on("inputup", () => (this.isDown = false));
    // Add particles
    this.spawnParticles();
    // Add FPS
    this.uiScene.add(
      new FPSCounter(this, { color: "white", anchor: "bottom-right" })
    );
  }

  update(dt) {
    super.update(dt);
    this.particlesCounter.text = `Particles: ${this.particles.length}`;
    this.particleScene.update(dt);
  }

  /**
   * Clear the particles
   */
  clearParticles() {
    this.particles.forEach((particle) => {
      this.particleScene.remove(particle);
    });
    this.particles = [];
  }

  /**
   * Spawn all particles
   */
  spawnParticles() {
    this.particles = [];
    for (let i = 0; i < this.NUM_PARTICLES; i++) {
      const particle = new Particle(this);
      this.particleScene.add(particle);
      this.particles.push(particle);
    }
  }

  /**Override clear function to give pseudo trailling effect */
  clear() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

class Particle extends GameObject {
  constructor(game, _x, _y) {
    super(game);
    this.size = Math.random() * 5 + 5;
    this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    this.reset();
    this.x = _x || Math.random() * game.width;
    this.y = _y || Math.random() * game.height;
    this.shape = this.createRandomShape(this.x, this.y, this.size, this.color);
    this.spin = (Math.random() - 0.5) * 0.2;
  }

  createRandomShape(x, y, size, color) {
    const r = Math.random();
    if (r < 0.5) {
      return new Shapes.Circle(x, y, size, {
        fillColor: color,
      });
    } else if (r < 0.66) {
      return new Shapes.Square(x, y, size, {
        fillColor: color,
      });
    } else if (r < 0.83) {
      return new Shapes.Triangle(x, y, size * 2, {
        fillColor: color,
      });
    } else {
      return new Shapes.Star(x, y, size, 5, 0.5, {
        fillColor: color,
      });
    }
  }

  reset() {
    this.x = Math.random() * this.game.width;
    this.y = Math.random() * this.game.height;
    this.vx = Math.random() * 2 - 1;
    this.vy = Math.random() * 2 - 1;
  }

  update(dt) {
    const mouseX = this.game.mouse.x;
    const mouseY = this.game.mouse.y;

    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    //console.log("dx", dx, "dy", dy, "dist", dist);

    const force = Math.max((100 - dist) / 100, 0);
    const fx = dx / dist;
    const fy = dy / dist;

    this.vx += fx * force * 0.6 + (Math.random() - 0.5) * 0.5;
    this.vy += fy * force * 0.6 + (Math.random() - 0.5) * 0.5;

    this.vx *= 0.95;
    this.vy *= 0.95;

    this.x += this.vx;
    this.y += this.vy;

    const w = this.game.width;
    const h = this.game.height;

    if (this.x < 0 || this.x > w) this.vx *= -1;
    if (this.y < 0 || this.y > h) this.vy *= -1;

    this.x = Math.max(0, Math.min(w, this.x));
    this.y = Math.max(0, Math.min(h, this.y));

    this.shape.x = this.x;
    this.shape.y = this.y;
    this.shape.rotation += this.spin + (this.vx + this.vy) * 0.05;
  }

  render() {
    this.shape.draw();
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new ParticlesGame(canvas);
  game.init();
  game.start();
});

import {
  Game,
  GameObject,
  FPSCounter,
  Button,
  Scene,
  Text,
  Painter,
  Circle,
  Square,
  Triangle,
  Star,
  VerticalLayout,
  applyAnchor,
  Position,
  ShapeGOFactory,
  Rectangle,
} from "/gcanvas.es.min.js";

class ParticlesGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
    this.NUM_PARTICLES = 500;
    this.MARGIN = 0;
  }

  init() {
    super.init();
    this.mouse = { x: this.width / 2, y: this.height / 2 };
    // Create particle scene (below UI)
    this.particleScene = new Scene(this, {
      width: this.width - this.MARGIN * 2,
      height: this.height - this.MARGIN * 2,
      debug: false,
      debugColor: "#0f0",
      origin: "center",
    });
    this.pipeline.add(this.particleScene);
    // Create UI scene (above particles)
    this.uiScene = new Scene(this, {
      debug: false,
      debugColor: "#0f0",
      width: 160,
      height: 150,
    });
    this.pipeline.add(this.uiScene);
    // Background rectangle
    const bgRect = ShapeGOFactory.create(
      this,
      new Rectangle({
        width: 148,
        height: 130,
        color: Painter.colors.rgba(0, 0, 0, 0.5),
      }),
    );
    bgRect.x = 75;
    bgRect.y = 65;
    this.uiScene.add(bgRect);
    // Buttons layout - centered in UI scene
    this.buttons = new VerticalLayout(this, {
      padding: 10,
      spacing: 8,
      origin: "center",
      align: "center",
      debug: false,
      debugColor: "magenta",
    });
    this.buttons.x = 75;
    this.buttons.y = 75;
    this.uiScene.add(this.buttons);
    // Add buttons
    this.buttons.add(
      new Button(this, {
        text: "Clear",
        width: 120,
        debug: false,
        debugColor: "yellow",
        onClick: this.clearParticles.bind(this),
      }),
    );
    this.buttons.add(
      new Button(this, {
        text: "Reset",
        width: 120,
        debug: false,
        debugColor: "yellow",
        onClick: () => {
          Painter.clear();
          this.clearParticles();
          this.spawnParticles();
        },
      }),
    );
    this.particlesCounter = this.buttons.add(
      new Text(this, "Particles", {
        width: 120,
        height: 24,
        color: "white",
        align: "center",
        baseline: "middle",
        origin: "center",
        debug: false,
        debugColor: "cyan",
      }),
    );
    // Anchor UI to bottom-left
    applyAnchor(this.uiScene, {
      anchor: Position.BOTTOM_LEFT,
      anchorMargin: 10,
    });
    // Input logic...
    this.freeToCreate = true;
    this.events.on("inputmove", (e) => {
      if (e.touches && e.touches.length > 0) {
        // Multi-touch support
        const rect = this.canvas.getBoundingClientRect();
        for (let i = 0; i < e.touches.length; i++) {
          const touch = e.touches[i];
          const tx = touch.clientX - rect.left - this.particleScene.x;
          const ty = touch.clientY - rect.top - this.particleScene.y;
          this.mouse.x = tx;
          this.mouse.y = ty;
          this.createParticle();
        }
      } else {
        // Normalized mouse/single-touch
        this.mouse.x = e.x - this.particleScene.x;
        this.mouse.y = e.y - this.particleScene.y;
        this.createParticle();
      }
    });
    this.events.on("inputdown", () => (this.isDown = this.createParticle()));
    this.events.on("inputup", () => (this.isDown = false));
    // Add particles
    this.spawnParticles();
    // Add FPS
    this.pipeline.add(
      new FPSCounter(this, { color: "white", anchor: "bottom-right" }),
    );
  }

  createParticle() {
    if (this.isDown && this.freeToCreate) {
      this.freeToCreate = false;
      const p = new Particle(this, this.mouse.x, this.mouse.y);
      p._particleId = this.particles.length;
      this.particleScene.add(p);
      p.vx = 10;
      p.vy = 10;
      p.reset(this.mouse.x, this.mouse.y);
      this.particles.push(p);
      setTimeout(() => {
        this.freeToCreate = true;
        p.x = this.mouse.x;
        p.y = this.mouse.y;
      }, 1);
      //console.log(x, y)
    }
    return true;
  }

  #prevWidth = 0;
  #prevHeight = 0;
  update(dt) {
    // Update scene dimensions based on game dimensions (full screen)
    this.particleScene.width = this.width;
    this.particleScene.height = this.height;
    // Center the scene in the game
    this.particleScene.x = this.width / 2;
    this.particleScene.y = this.height / 2;

    this.particlesCounter.text = `Particles: ${this.particles.length}`;
    super.update(dt);
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
      particle._particleId = i;
      this.particleScene.add(particle);
      this.particles.push(particle);
      particle.reset();
    }
  }

  /**Override clear function to give pseudo trailling effect */
  clear() {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.21)";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
}

class Particle extends GameObject {
  constructor(game, _x, _y) {
    super(game, { crisp: false });
    this.size = Math.random() * 5 + 5;
    this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    this.x = _x == undefined ? 0 : _x;
    this.y = _y == undefined ? 0 : _y;
    this.shape = this.createRandomShape();
    this.spin = (Math.random() - 0.5) * 0.2;
    this._influenceRadius = 100;
    this.resetVelocity();
  }

  createRandomShape() {
    const r = Math.random();
    const options = {
      color: this.color,
      cacheRendering: true,
      origin: "center",
    };
    if (r < 0.5) {
      return new Circle(this.size, options);
    } else if (r < 0.66) {
      return new Square(this.size, options);
    } else if (r < 0.83) {
      return new Triangle(this.size * 2, options);
    } else {
      return new Star(this.size, 5, 0.5, options);
    }
  }

  draw() {
    super.draw();
    this.shape.render();
  }

  resetVelocity() {
    this.vx = Math.random() * 2 + 1;
    this.vy = Math.random() * 2 + 1;
  }

  reset(x, y) {
    const { width, height } = this.parent;
    this.x = (Math.random() - 0.5) * width;
    this.y = (Math.random() - 0.5) * height;
    this.resetVelocity();
  }

  update(dt) {
    const { mouse } = this.game;
    const { width, height } = this.parent;
    const halfWidth = width * 0.5 - this.size;
    const halfHeight = height * 0.5 - this.size;
    const timeScale = dt * 60;

    // ---- Mouse repulsion (optimized) ----
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const distSq = dx * dx + dy * dy;
    const maxDistSq = 10000; // 100^2

    if (distSq < maxDistSq && distSq > 0) {
      const invDist = 1 / Math.sqrt(distSq);
      const force = (100 - distSq * invDist) * 0.006; // 0.6/100

      this.vx += dx * invDist * force;
      this.vy += dy * invDist * force;

      // Add some randomness but less frequently for performance
      if (Math.random() < 0.1) {
        this.vx += (Math.random() - 0.5) * 0.5;
        this.vy += (Math.random() - 0.5) * 0.5;
      }
    }

    // ---- Movement physics ----
    this.vx *= 0.98;
    this.vy *= 0.98;

    // Store previous position for rotation calculation
    const prevX = this.x;
    const prevY = this.y;

    // Update position with slight acceleration
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 1.019;
    this.vy *= 1.019;

    // ---- Boundary handling (optimized) ----
    const bounce = 0.8;
    const randomPush = 0.5;

    if (this.x < -halfWidth) {
      this.x = -halfWidth;
      this.vx = Math.abs(this.vx) * bounce;
      this.vy += (Math.random() - 0.5) * randomPush;
    } else if (this.x > halfWidth) {
      this.x = halfWidth;
      this.vx = -Math.abs(this.vx) * bounce;
      this.vy += (Math.random() - 0.5) * randomPush;
    }

    if (this.y < -halfHeight) {
      this.y = -halfHeight;
      this.vy = Math.abs(this.vy) * bounce;
      this.vx += (Math.random() - 0.5) * randomPush;
    } else if (this.y > halfHeight) {
      this.y = halfHeight;
      this.vy = -Math.abs(this.vy) * bounce;
      this.vx += (Math.random() - 0.5) * randomPush;
    }
    const moveX = this.x - prevX;
    const moveY = this.y - prevY;

    this.rotation += this.spin * timeScale;

    super.update(dt);
  }
}

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new ParticlesGame(canvas);
  game.start();
});

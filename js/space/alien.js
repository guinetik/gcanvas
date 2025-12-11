import { GameObject, Rectangle, Circle, Group } from "/gcanvas.es.min.js";
import { ALIEN_WIDTH, ALIEN_HEIGHT } from "./constants.js";

export class Alien extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: ALIEN_WIDTH,
      height: ALIEN_HEIGHT,
      ...options,
    });

    this.row = options.row || 0;
    this.col = options.col || 0;
    this.points = options.points || 10;
    this.animTime = Math.random() * 2; // Offset animation

    // Create alien shape based on row
    this.shape = this.createShape();
  }

  createShape() {
    const group = new Group({ cacheRendering: true });

    // Different alien designs based on row - classic Space Invaders style
    if (this.row === 0) {
      // Top row - Squid/UFO type (30 points) - magenta/pink
      this.points = 30;

      // Dome head
      const head = new Circle(8, { y: -2, color: "#ff0088" });

      // Body
      const body = new Rectangle({ width: 20, height: 8, y: 4, color: "#ff0088" });

      // Eyes
      const leftEye = new Circle(2, { x: -4, y: -3, color: "#ffffff" });
      const rightEye = new Circle(2, { x: 4, y: -3, color: "#ffffff" });
      const leftPupil = new Circle(1, { x: -4, y: -3, color: "#000000" });
      const rightPupil = new Circle(1, { x: 4, y: -3, color: "#000000" });

      // Tentacles
      const tent1 = new Rectangle({ width: 3, height: 6, x: -8, y: 10, color: "#cc0066" });
      const tent2 = new Rectangle({ width: 3, height: 8, x: -3, y: 11, color: "#cc0066" });
      const tent3 = new Rectangle({ width: 3, height: 8, x: 3, y: 11, color: "#cc0066" });
      const tent4 = new Rectangle({ width: 3, height: 6, x: 8, y: 10, color: "#cc0066" });

      group.add(head);
      group.add(body);
      group.add(leftEye);
      group.add(rightEye);
      group.add(leftPupil);
      group.add(rightPupil);
      group.add(tent1);
      group.add(tent2);
      group.add(tent3);
      group.add(tent4);

    } else if (this.row <= 2) {
      // Middle rows - Crab type (20 points) - CYAN/ELECTRIC BLUE (spacey)
      this.points = 20;

      // Main body
      const body = new Rectangle({ width: 22, height: 10, color: "#00ddff" });

      // Head bump
      const headBump = new Rectangle({ width: 10, height: 6, y: -6, color: "#00ddff" });

      // Eyes
      const leftEye = new Rectangle({ width: 4, height: 4, x: -6, y: -2, color: "#003344" });
      const rightEye = new Rectangle({ width: 4, height: 4, x: 6, y: -2, color: "#003344" });

      // Claws - left
      const leftArm = new Rectangle({ width: 4, height: 6, x: -14, y: -2, color: "#00aacc" });
      const leftClaw = new Rectangle({ width: 6, height: 4, x: -16, y: -6, color: "#00aacc" });

      // Claws - right
      const rightArm = new Rectangle({ width: 4, height: 6, x: 14, y: -2, color: "#00aacc" });
      const rightClaw = new Rectangle({ width: 6, height: 4, x: 16, y: -6, color: "#00aacc" });

      // Legs
      const leg1 = new Rectangle({ width: 3, height: 5, x: -8, y: 8, color: "#0088aa" });
      const leg2 = new Rectangle({ width: 3, height: 5, x: 0, y: 8, color: "#0088aa" });
      const leg3 = new Rectangle({ width: 3, height: 5, x: 8, y: 8, color: "#0088aa" });

      group.add(body);
      group.add(headBump);
      group.add(leftEye);
      group.add(rightEye);
      group.add(leftArm);
      group.add(leftClaw);
      group.add(rightArm);
      group.add(rightClaw);
      group.add(leg1);
      group.add(leg2);
      group.add(leg3);

    } else {
      // Bottom rows - Octopus/Basic type (10 points) - green
      this.points = 10;

      // Round head
      const head = new Circle(10, { y: -2, color: "#44ff44" });

      // Body extension
      const body = new Rectangle({ width: 16, height: 8, y: 6, color: "#44ff44" });

      // Eyes
      const leftEye = new Rectangle({ width: 4, height: 5, x: -4, y: -4, color: "#003300" });
      const rightEye = new Rectangle({ width: 4, height: 5, x: 4, y: -4, color: "#003300" });

      // Antennae
      const leftAntenna = new Rectangle({ width: 2, height: 6, x: -6, y: -12, color: "#22cc22" });
      const rightAntenna = new Rectangle({ width: 2, height: 6, x: 6, y: -12, color: "#22cc22" });
      const leftTip = new Circle(2, { x: -6, y: -16, color: "#88ff88" });
      const rightTip = new Circle(2, { x: 6, y: -16, color: "#88ff88" });

      // Tentacle legs
      const leg1 = new Rectangle({ width: 3, height: 6, x: -10, y: 12, color: "#22aa22" });
      const leg2 = new Rectangle({ width: 3, height: 8, x: -4, y: 13, color: "#22aa22" });
      const leg3 = new Rectangle({ width: 3, height: 8, x: 4, y: 13, color: "#22aa22" });
      const leg4 = new Rectangle({ width: 3, height: 6, x: 10, y: 12, color: "#22aa22" });

      group.add(head);
      group.add(body);
      group.add(leftEye);
      group.add(rightEye);
      group.add(leftAntenna);
      group.add(rightAntenna);
      group.add(leftTip);
      group.add(rightTip);
      group.add(leg1);
      group.add(leg2);
      group.add(leg3);
      group.add(leg4);
    }

    return group;
  }

  update(dt) {
    super.update(dt);
    this.animTime += dt;
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    // Add subtle animation - render at origin with wobble offset
    // Parent transform already positions us correctly
    const wobble = Math.sin(this.animTime * 5) * 2;

    this.shape.x = 0;
    this.shape.y = wobble;
    this.shape.render();
  }

  destroy() {
    this.active = false;
    this.visible = false;
  }

  getBounds() {
    return {
      x: this.x - ALIEN_WIDTH / 2,
      y: this.y - ALIEN_HEIGHT / 2,
      width: ALIEN_WIDTH,
      height: ALIEN_HEIGHT,
    };
  }
}

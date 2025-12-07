// IsometricGame.js
import {
    Game,
    GameObject,
    Painter
} from "/gcanvas.es.min.js";
class IsometricGrid extends GameObject {
  constructor(game) {
    super(game);
  }

  update(dt) {
    // Nothing special needed here
  }

  render() {
    // Draw the grid lines and origin dot using the Painter API
    Painter.colors.setStrokeColor("#ccc");
    Painter.lines.setLineWidth(1);

    for (let x = -this.game.gridSize; x <= this.game.gridSize; x++) {
      const start = this.game.toIsometric(x, -this.game.gridSize);
      const end = this.game.toIsometric(x, this.game.gridSize);
      Painter.lines.line(start.x, start.y, end.x, end.y);
    }

    for (let y = -this.game.gridSize; y <= this.game.gridSize; y++) {
      const start = this.game.toIsometric(-this.game.gridSize, y);
      const end = this.game.toIsometric(this.game.gridSize, y);
      Painter.lines.line(start.x, start.y, end.x, end.y);
    }

    // Draw the origin in red for reference
    const origin = this.game.toIsometric(0, 0);
    Painter.shapes.fillCircle(origin.x, origin.y, 5, "#FF0000");
  }
}

class Ball extends GameObject {
  constructor(game) {
    super(game);
    this.resetPosition();

    this.baseRadius = 10;    // Base size of the ball
    this.color = "#3498db";
    this.jumpPower = 8;
    this.gravity = 0.5;
    this.velocityY = 0;
    this.isJumping = false;
    this.speed = 1;

    // Inertia
    this.velocityX = 0;
    this.velocityZ = 0;
    this.friction = 0.92;         // Slows the ball each frame
    this.bounceFactorWall = 0.8;  // Bounciness against the grid edges
  }

  resetPosition() {
    this.x = 0;
    this.y = 0;
    this.z = 0; // "Height" above the ground
    this.velocityX = 0;
    this.velocityZ = 0;
    this.velocityY = 0;
    this.isJumping = false;
  }

  update(dt) {
    // Using dt in seconds, but original code assumed 60 FPS as baseline:
    const frameSpeed = this.speed * (dt / (1 / 60)); // dt ~0.0167 at 60fps

    // Apply friction
    this.velocityX *= this.friction;
    this.velocityZ *= this.friction;

    // Move in only one direction at a time (per the old code) w/a/s/d:
    let movementInput = false;

    if (this.game.keys.w && !movementInput) {
      this.velocityZ -= frameSpeed * 0.05;
      movementInput = true;
    } else if (this.game.keys.s && !movementInput) {
      this.velocityZ += frameSpeed * 0.05;
      movementInput = true;
    } else if (this.game.keys.a && !movementInput) {
      this.velocityX -= frameSpeed * 0.05;
      movementInput = true;
    } else if (this.game.keys.d && !movementInput) {
      this.velocityX += frameSpeed * 0.05;
      movementInput = true;
    }

    // Apply horizontal velocity to the ball’s isometric X/Y
    this.x += this.velocityX;
    this.y += this.velocityZ;

    // Jump
    if (this.game.keys.space && !this.isJumping) {
      this.velocityY = this.jumpPower;
      this.isJumping = true;
    }

    // Gravity
    this.velocityY -= this.gravity;
    this.z += this.velocityY;

    // Collide with the ground (z=0)
    if (this.z < 0) {
      this.z = 0;
      this.velocityY *= -0.5; // bounce back
      if (Math.abs(this.velocityY) < 0.5) {
        this.velocityY = 0;
        this.isJumping = false;
      }
    }

    // Boundary collisions in X/Y
    const hitboxRadius = this.baseRadius / this.game.tileWidth;
    const effectiveBoundary = this.game.gridSize - hitboxRadius;

    // X boundary
    if (this.x < -effectiveBoundary) {
      this.x = -effectiveBoundary;
      this.velocityX = Math.abs(this.velocityX) * this.bounceFactorWall;
    } else if (this.x > effectiveBoundary) {
      this.x = effectiveBoundary;
      this.velocityX = -Math.abs(this.velocityX) * this.bounceFactorWall;
    }

    // Y boundary
    if (this.y < -effectiveBoundary) {
      this.y = -effectiveBoundary;
      this.velocityZ = Math.abs(this.velocityZ) * this.bounceFactorWall;
    } else if (this.y > effectiveBoundary) {
      this.y = effectiveBoundary;
      this.velocityZ = -Math.abs(this.velocityZ) * this.bounceFactorWall;
    }
  }

  render() {
    // Convert (x,y) to isometric coordinates
    const isoPos = this.game.toIsometric(this.x, this.y);

    // Distance from center in the y dimension for perspective scaling
    const distanceFromCenter = Math.abs(this.y);
    const maxDistance = this.game.gridSize;
    // Range from 0.7 at the top to 1.3 at the bottom
    const depthScale = 0.7 + (distanceFromCenter / maxDistance) * 0.6;

    // Factor in how “high” the ball is (z). The higher it is, the smaller it looks.
    const heightFactor = Math.max(0.7, 1 - Math.abs(this.z) / 200);

    // Overall perspective-based radius
    const perspectiveRadius =
      (this.baseRadius * this.game.gridSize) / 4 * heightFactor * depthScale;

    // The ball moves upward visually by ~0.7 * z
    const elevation = Math.abs(this.z) * 0.7;

    // Shadow (below the ball)
    const shadowScale = Math.max(0.2, 1 - Math.abs(this.z) / 100);
    const shadowAlpha = Math.max(0.1, 0.3 - Math.abs(this.z) / 300);

    // Draw the shadow
    Painter.shapes.fillEllipse(
      isoPos.x,
      isoPos.y + perspectiveRadius / 2,
      perspectiveRadius * shadowScale,
      (perspectiveRadius / 2) * shadowScale,
      0,
      `rgba(0, 0, 0, ${shadowAlpha})`
    );

    // Draw the ball
    Painter.shapes.fillCircle(
      isoPos.x,
      isoPos.y - elevation,
      perspectiveRadius,
      this.color
    );

    // Outline to add depth
    Painter.shapes.strokeCircle(
      isoPos.x,
      isoPos.y - elevation,
      perspectiveRadius,
      "#2980b9",
      2
    );
  }
}

export class IsometricGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#ecf0f1"; // Light gray background
    // We'll track keyboard states in a map, just like the original code.
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      space: false,
    };

    // Attach raw DOM listeners for keys. 
    // (The new engine has an Input system, but we’ll mimic your old approach.)
    window.addEventListener("keydown", (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          this.keys.w = true;
          break;
        case "a":
          this.keys.a = true;
          break;
        case "s":
          this.keys.s = true;
          break;
        case "d":
          this.keys.d = true;
          break;
        case " ":
        case "spacebar":
          this.keys.space = true;
          break;
      }
    });
    window.addEventListener("keyup", (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
          this.keys.w = false;
          break;
        case "a":
          this.keys.a = false;
          break;
        case "s":
          this.keys.s = false;
          break;
        case "d":
          this.keys.d = false;
          break;
        case " ":
        case "spacebar":
          this.keys.space = false;
          break;
      }
    });
  }

  init() {
    super.init();

    // Basic isometric parameters
    this.gridSize = 10;
    this.tileWidth = 64;

    // Add our game objects
    this.pipeline.add(new IsometricGrid(this));
    this.pipeline.add(new Ball(this));
  }

  /**
   * Convert 2D grid coordinates (x,y) to an isometric projection.
   * We'll center the grid on the canvas for convenience.
   */
  toIsometric(x, y) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Simple “diamond” isometric:
    // isoX = (x - y) * (tileWidth/2)
    // isoY = (x + y) * (tileWidth/4)
    // plus the canvas center offset
    return {
      x: centerX + (x - y) * (this.tileWidth / 2),
      y: centerY + (x + y) * (this.tileWidth / 4),
    };
  }
}
// Export the game class
export default IsometricGame;
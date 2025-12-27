import { GameObject, Group, Keys, Rectangle } from "../../../src/index.js";
import { CONFIG } from "./constants.js";
// ============================================================================
// PENROSE SHIP
// ============================================================================

export class PenroseShip extends GameObject {
  constructor(game) {
    super(game);

    // Position in Penrose coordinates (u = space, v = time)
    this.u = 0;
    this.v = CONFIG.shipStartV;

    // Heading angle (direction ship is traveling, 0 = straight up/forward)
    this.heading = 0;

    // Velocity is now derived from heading for compatibility
    this.velocity = 0;

    // Time progression speed (accelerates)
    this.timeSpeed = CONFIG.shipTimeSpeed;

    // Worldline trail
    this.worldline = [];

    // Ship visual (simple triangle pointing up)
    this.shipGroup = new Group({});

    // Main body
    const body = new Rectangle({
      width: 12,
      height: 16,
      color: "#0f0",
    });

    // Nose
    const nose = new Rectangle({
      width: 4,
      height: 8,
      y: -10,
      color: "#0f0",
    });

    // Wings
    const leftWing = new Rectangle({
      width: 8,
      height: 6,
      x: -10,
      y: 4,
      color: "#0a0",
    });
    const rightWing = new Rectangle({
      width: 8,
      height: 6,
      x: 10,
      y: 4,
      color: "#0a0",
    });

    // Engine glow
    this.engineLeft = new Rectangle({
      width: 4,
      height: 4,
      x: -4,
      y: 10,
      color: "#fa0",
    });
    this.engineRight = new Rectangle({
      width: 4,
      height: 4,
      x: 4,
      y: 10,
      color: "#f60",
    });

    this.shipGroup.add(body);
    this.shipGroup.add(nose);
    this.shipGroup.add(leftWing);
    this.shipGroup.add(rightWing);
    this.shipGroup.add(this.engineLeft);
    this.shipGroup.add(this.engineRight);

    this.engineTimer = 0;
    this.alive = true;

    // Death animation
    this.deathProgress = 0;
    this.deathBlackHole = null;
    this.deathFade = 0; // 0 to 1, when 1 = fully faded

    // Ergosphere status (set by game)
    this.inErgosphere = false;

    // Boost status (set by game)
    this.boostMultiplier = 1;

    // Edge detection
    this.hitSpatialInfinity = false;

    // Collision radius (for circle collision)
    this.radius = 0.02;
  }

  /**
   * Get circle bounds for collision detection (Penrose coordinates)
   */
  getCircle() {
    return { x: this.u, y: this.v, radius: this.radius };
  }

  reset() {
    this.u = 0;
    this.v = CONFIG.shipStartV;
    this.heading = 0;
    this.velocity = 0;
    this.timeSpeed = CONFIG.shipTimeSpeed;
    this.worldline = [];
    this.alive = true;
    this.deathProgress = 0;
    this.deathBlackHole = null;
    this.deathFade = 0;
    this.inErgosphere = false;
    this.boostMultiplier = 1;
    this.hitSpatialInfinity = false;
  }

  update(dt) {
    if (!this.alive) {
      // Death animation - get pulled to singularity SLOWLY
      this.deathProgress += dt * CONFIG.deathAttractionSpeed;
      if (this.deathBlackHole) {
        const t = Math.min(this.deathProgress, 1);
        const eased = t * t * t; // Cubic easing - starts slow, speeds up
        this.u += (this.deathBlackHole.u - this.u) * eased * dt * 1.5;
        this.v += (this.deathBlackHole.v - this.v) * eased * dt * 1.5;

        // Check if we've reached the singularity (close to center)
        const dist = Math.sqrt(
          Math.pow(this.u - this.deathBlackHole.u, 2) +
            Math.pow(this.v - this.deathBlackHole.v, 2),
        );
        if (dist < 0.02) {
          // Start fading out
          this.deathFade += dt / CONFIG.deathFadeDuration;
        }
      }
      return;
    }

    // Time always advances (accelerating) - boosted when using Kerr energy
    this.timeSpeed *= Math.pow(CONFIG.shipAcceleration, dt);
    this.v += this.timeSpeed * this.boostMultiplier * dt;

    // Steering input - changes heading (direction you're traveling)
    const leftPressed =
      Keys.isDown("a") || Keys.isDown("A") || Keys.isDown(Keys.LEFT);
    const rightPressed =
      Keys.isDown("d") || Keys.isDown("D") || Keys.isDown(Keys.RIGHT);

    if (leftPressed) {
      this.heading -= CONFIG.shipSteering * dt;
    }
    if (rightPressed) {
      this.heading += CONFIG.shipSteering * dt;
    }

    // When not steering, heading springs back to center
    if (!leftPressed && !rightPressed) {
      this.heading *= 0.92; // Decay toward 0
    }

    // Clamp heading (can't go more than ~60 degrees off forward - would be spacelike!)
    const maxHeading = Math.PI / 3; // 60 degrees
    this.heading = Math.max(-maxHeading, Math.min(maxHeading, this.heading));

    // Update velocity for compatibility (used by camera rotation)
    this.velocity = this.heading;

    // Movement based on heading direction
    // sin(heading) gives lateral movement, heading=0 means straight up
    this.u += Math.sin(this.heading) * this.timeSpeed * dt;

    // Clamp to diamond bounds (|u| + |v| <= 1)
    // Hitting the edge = spatial infinity (i0) - you can never reach it!
    const maxU = Math.max(0, 1 - Math.abs(this.v));
    const prevU = this.u;
    this.u = Math.max(-maxU, Math.min(maxU, this.u));

    // If we hit spatial infinity, kill velocity - you can't escape to infinity
    if (this.u !== prevU) {
      this.velocity *= 0.3; // Bounce back effect
      this.hitSpatialInfinity = true;
    } else {
      this.hitSpatialInfinity = false;
    }

    // Record worldline
    this.worldline.push({ u: this.u, v: this.v });
    if (this.worldline.length > CONFIG.worldlineMaxLength) {
      this.worldline.shift();
    }

    // Engine flicker
    this.engineTimer += dt * 20;
    const flicker = Math.sin(this.engineTimer) > 0;
    this.engineLeft.color = flicker ? "#fa0" : "#f60";
    this.engineRight.color = flicker ? "#f60" : "#fa0";
  }

  die(blackHole) {
    this.alive = false;
    this.deathBlackHole = blackHole;
    this.deathProgress = 0;
  }
}

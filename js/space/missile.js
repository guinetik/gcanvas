import { GameObject, Rectangle, Triangle, Circle, Group, Motion, Easing } from "/gcanvas.es.min.js";
import { MISSILE_DURATION, MISSILE_WIDTH, MISSILE_HEIGHT } from "./constants.js";

export class Missile extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: MISSILE_WIDTH,
      height: MISSILE_HEIGHT,
      ...options,
    });

    // Bezier curve points
    this.startPoint = [options.x, options.y];

    // Target is where the player WAS when missile spawned (not tracking)
    // Extend past the screen so missile flies through
    const targetX = options.targetX || game.player.x;
    const targetY = (options.targetY || game.player.y) + 150; // Go past the player
    this.endPoint = [targetX, targetY];

    // Create curved control points for interesting trajectory
    // Randomize which side the curve bends
    const curveDirection = Math.random() > 0.5 ? 1 : -1;
    const curveIntensity = 100 + Math.random() * 150; // How much it curves

    // Control point 1: near start, curved to one side
    this.controlPoint1 = [
      this.startPoint[0] + curveDirection * curveIntensity,
      this.startPoint[1] + (this.endPoint[1] - this.startPoint[1]) * 0.3
    ];

    // Control point 2: near end, curved to same side (smooth S-curve if opposite)
    const curve2Direction = Math.random() > 0.7 ? -curveDirection : curveDirection;
    this.controlPoint2 = [
      this.endPoint[0] + curve2Direction * curveIntensity * 0.5,
      this.endPoint[1] - (this.endPoint[1] - this.startPoint[1]) * 0.3
    ];

    this.elapsedTime = 0;
    this.duration = MISSILE_DURATION;
    this.trailPoints = []; // For visual trail effect
    this.hasCorrected = false; // One-time mid-flight course correction
    this.correctionTime = 0.45 + Math.random() * 0.15; // Correct at 45-60% of flight (later)

    // Create torpedo visual: |_________________|>
    // All positions relative to center (0,0), pointing RIGHT (cached for performance)
    this.shape = new Group({ cacheRendering: true });

    const bodyLength = MISSILE_WIDTH - MISSILE_HEIGHT;
    const halfBody = bodyLength / 2;

    // Main body - centered, long rectangle
    const body = new Rectangle({
      width: bodyLength,
      height: MISSILE_HEIGHT,
      color: "#cc3300",
      origin: "center",
    });
    // body stays at x=0 (centered)

    // Lighter stripe on body for depth
    const stripe = new Rectangle({
      width: bodyLength,
      height: MISSILE_HEIGHT / 3,
      color: "#ff4400",
      origin: "center",
    });
    // stripe stays at x=0 (centered)

    // Nose cone - triangle at the RIGHT end (front)
    const nose = new Triangle(MISSILE_HEIGHT, {
      color: "#ff6600",
      rotation: 90,
      origin: "center",
    });
    nose.x = halfBody + MISSILE_HEIGHT / 3; // Right edge of body + small offset

    // Engine exhaust at the LEFT end (back)
    this.engineGlow = new Circle(MISSILE_HEIGHT / 2, {
      color: "#ffaa00",
      origin: "center",
    });
    this.engineGlow.x = -halfBody - MISSILE_HEIGHT / 3; // Left edge of body - small offset

    // Warning indicator
    this.warningFlash = 0;

    this.shape.add(body);
    this.shape.add(stripe);
    this.shape.add(nose);
    this.shape.add(this.engineGlow);
  }

  update(dt) {
    super.update(dt);

    this.elapsedTime += dt;

    // Mid-flight course correction - track player's current position ONCE
    const progress = this.elapsedTime / this.duration;
    if (!this.hasCorrected && progress >= this.correctionTime) {
      this.hasCorrected = true;

      // New trajectory starts from current position
      this.startPoint = [this.x, this.y];

      // New target is player's CURRENT position (+ offset to fly past)
      const newTargetX = this.game.player.x;
      const newTargetY = this.game.player.y + 150;
      this.endPoint = [newTargetX, newTargetY];

      // Recalculate control points for the new curve
      const curveDirection = Math.random() > 0.5 ? 1 : -1;
      const curveIntensity = 80 + Math.random() * 100;

      this.controlPoint1 = [
        this.startPoint[0] + curveDirection * curveIntensity * 0.5,
        this.startPoint[1] + (this.endPoint[1] - this.startPoint[1]) * 0.3
      ];
      this.controlPoint2 = [
        this.endPoint[0] + curveDirection * curveIntensity * 0.3,
        this.endPoint[1] - (this.endPoint[1] - this.startPoint[1]) * 0.2
      ];

      // Reset timing for remaining journey
      this.elapsedTime = 0;
      this.duration = this.duration * (1 - this.correctionTime); // Remaining time
    }

    // Get position from bezier curve
    const result = Motion.bezier(
      this.startPoint,
      this.controlPoint1,
      this.controlPoint2,
      this.endPoint,
      this.elapsedTime,
      this.duration,
      false, // no loop
      false, // no yoyo
      Easing.easeInQuad // Accelerate as it approaches
    );

    // Store previous position for rotation calculation
    const prevX = this.x;
    const prevY = this.y;

    this.x = result.x;
    this.y = result.y;

    // Calculate rotation to face movement direction
    const dx = this.x - prevX;
    const dy = this.y - prevY;
    if (dx !== 0 || dy !== 0) {
      this.shape.rotation = Math.atan2(dy, dx) * (180 / Math.PI);
    }

    // Store trail points
    this.trailPoints.push({ x: this.x, y: this.y, age: 0 });
    if (this.trailPoints.length > 10) {
      this.trailPoints.shift();
    }
    // Age trail points
    for (const point of this.trailPoints) {
      point.age += dt;
    }

    // Engine flicker
    this.warningFlash += dt * 20;
    const flicker = Math.sin(this.warningFlash) > 0;
    this.engineGlow.color = flicker ? "#ffff00" : "#ff6600";

    // Destroy when animation completes or goes off screen
    if (result.complete || this.y > this.game.height + 50 ||
        this.x < -50 || this.x > this.game.width + 50) {
      this.destroy();
    }
  }

  draw() {
    if (!this.visible) return;

    // Draw trail first (behind missile)
    for (let i = 0; i < this.trailPoints.length; i++) {
      const point = this.trailPoints[i];
      const alpha = (1 - point.age * 3) * (i / this.trailPoints.length) * 0.6;
      if (alpha > 0) {
        const size = (MISSILE_HEIGHT / 2) * (i / this.trailPoints.length);
        const trail = new Circle(size, {
          color: `rgba(255, 100, 0, ${alpha})`,
          origin: "center",
        });
        trail.x = point.x;
        trail.y = point.y;
        trail.render();
      }
    }

    super.draw();
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
      x: this.x - MISSILE_WIDTH / 2,
      y: this.y - MISSILE_HEIGHT / 2,
      width: MISSILE_WIDTH,
      height: MISSILE_HEIGHT,
    };
  }
}

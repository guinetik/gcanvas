import { GameObject, Painter } from "../../../src/index.js";

/**
 * Lightning - Animated branching lightning strike obstacle
 *
 * Phases:
 * 1. Tracing (0.4s): Bolt draws itself downward, branches split as trace reaches them
 * 2. Active (0.3s): Full bolt visible, bright flash, damages player
 * 3. Fade (0.2s): Opacity fades out
 *
 * Unlocked after defeating boss 2 (level 7+)
 */
export class Lightning extends GameObject {
  constructor(game, options = {}) {
    super(game, {
      width: game.width,
      height: game.height,
      ...options,
    });

    // Start at top center with slight variance
    this.startX = options.x ?? game.width / 2 + (Math.random() - 0.5) * 100;

    // Generate full lightning tree at spawn (2-4 branches total)
    this.maxBranches = 2 + Math.floor(Math.random() * 3);
    this.segments = []; // All line segments: [{x1, y1, x2, y2, branch}]
    this.generateLightning();

    // Animation
    this.progress = 0;
    this.traceSpeed = 2.5; // Complete trace in ~0.4s
    this.phase = "tracing"; // tracing -> active -> fade

    this.activeDuration = 0.3;
    this.fadeDuration = 0.2;
    this.activeTimer = 0;
    this.fadeTimer = 0;
    this.opacity = 1;

    this.canDamage = false;
    this.hasHitPlayer = false;
  }

  generateLightning() {
    // Build main trunk + branches as flat array of segments
    let x = this.startX;
    let y = 0;
    const segmentHeight = 50;
    let branchCount = 0;

    // Main trunk - jagged path from top to bottom
    while (y < this.game.height) {
      const nextY = Math.min(y + segmentHeight, this.game.height);
      const jitter = (Math.random() - 0.5) * 50;
      const nextX = Math.max(30, Math.min(this.game.width - 30, x + jitter));

      this.segments.push({ x1: x, y1: y, x2: nextX, y2: nextY, branch: 0 });

      // Chance to spawn a branch (not too early, not too late)
      if (y > 100 && y < this.game.height - 200 && Math.random() < 0.35 && branchCount < this.maxBranches - 1) {
        branchCount++;
        this.generateBranch(nextX, nextY, branchCount);
      }

      x = nextX;
      y = nextY;
    }
  }

  generateBranch(startX, startY, branchId) {
    // Branch goes diagonally outward
    const direction = Math.random() > 0.5 ? 1 : -1;
    let x = startX;
    let y = startY;
    const segmentHeight = 50;

    // Branch is shorter than main trunk (3-6 segments)
    const branchLength = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < branchLength && y < this.game.height; i++) {
      const nextY = Math.min(y + segmentHeight, this.game.height);
      const drift = direction * (20 + Math.random() * 30);
      const jitter = (Math.random() - 0.5) * 30;
      const nextX = Math.max(30, Math.min(this.game.width - 30, x + drift + jitter));

      this.segments.push({ x1: x, y1: y, x2: nextX, y2: nextY, branch: branchId });

      x = nextX;
      y = nextY;
    }
  }

  update(dt) {
    super.update(dt);

    if (this.phase === "tracing") {
      this.progress += dt * this.traceSpeed;
      if (this.progress >= 1) {
        this.progress = 1;
        this.phase = "active";
        this.canDamage = true;
      }
    } else if (this.phase === "active") {
      this.activeTimer += dt;
      if (this.activeTimer >= this.activeDuration) {
        this.phase = "fade";
        this.canDamage = false;
      }
    } else if (this.phase === "fade") {
      this.fadeTimer += dt;
      this.opacity = 1 - this.fadeTimer / this.fadeDuration;
      if (this.fadeTimer >= this.fadeDuration) {
        this.destroy();
      }
    }
  }

  draw() {
    if (!this.visible) return;
    super.draw();

    const ctx = Painter.ctx;
    ctx.save();

    // Reset transform since we're drawing in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // How far down has the trace reached?
    const currentTraceY = this.progress * this.game.height;

    for (const seg of this.segments) {
      // Skip segments not yet reached by the trace
      if (seg.y1 > currentTraceY) continue;

      // Calculate how much of this segment to draw
      let drawX2 = seg.x2;
      let drawY2 = seg.y2;

      if (seg.y2 > currentTraceY) {
        // Partial segment - interpolate to current trace position
        const t = (currentTraceY - seg.y1) / (seg.y2 - seg.y1);
        drawX2 = seg.x1 + (seg.x2 - seg.x1) * t;
        drawY2 = currentTraceY;
      }

      this.drawSegment(ctx, seg.x1, seg.y1, drawX2, drawY2, seg.branch);
    }

    ctx.restore();
  }

  drawSegment(ctx, x1, y1, x2, y2, branch) {
    const isBranch = branch > 0;

    if (this.phase === "tracing") {
      // Tracing phase - cyan/purple electric glow
      // Outer glow
      ctx.strokeStyle = `rgba(100, 150, 255, ${0.4 * this.opacity})`;
      ctx.lineWidth = isBranch ? 8 : 12;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Inner bright line
      ctx.strokeStyle = `rgba(200, 220, 255, ${0.9 * this.opacity})`;
      ctx.lineWidth = isBranch ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

    } else if (this.phase === "active") {
      // Active phase - bright white flash
      // Wide outer glow
      ctx.strokeStyle = `rgba(150, 180, 255, ${0.6 * this.opacity})`;
      ctx.lineWidth = isBranch ? 16 : 24;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Medium glow
      ctx.strokeStyle = `rgba(200, 220, 255, ${0.8 * this.opacity})`;
      ctx.lineWidth = isBranch ? 8 : 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Bright core
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
      ctx.lineWidth = isBranch ? 3 : 4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

    } else if (this.phase === "fade") {
      // Fade phase - decreasing opacity
      ctx.strokeStyle = `rgba(150, 180, 255, ${0.4 * this.opacity})`;
      ctx.lineWidth = isBranch ? 10 : 16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 * this.opacity})`;
      ctx.lineWidth = isBranch ? 2 : 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  destroy() {
    this.active = false;
    this.visible = false;
  }

  /**
   * Get bounding box for collision detection
   * Returns off-screen bounds when not in damage phase
   */
  getBounds() {
    if (!this.canDamage) {
      return { x: -1000, y: -1000, width: 0, height: 0 };
    }

    // Return bounding box of entire lightning
    const xs = this.segments.flatMap((s) => [s.x1, s.x2]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    return {
      x: minX - 15,
      y: 0,
      width: maxX - minX + 30,
      height: this.game.height,
    };
  }

  /**
   * More precise collision check - tests player against each segment
   */
  checkCollision(playerBounds) {
    if (!this.canDamage) return false;

    const px = playerBounds.x;
    const py = playerBounds.y;
    const pw = playerBounds.width;
    const ph = playerBounds.height;

    for (const seg of this.segments) {
      // Simple line-rect collision using bounding box of segment
      const segMinX = Math.min(seg.x1, seg.x2) - 10;
      const segMaxX = Math.max(seg.x1, seg.x2) + 10;
      const segMinY = Math.min(seg.y1, seg.y2);
      const segMaxY = Math.max(seg.y1, seg.y2);

      // Check if player rect overlaps segment bounding box
      if (
        px < segMaxX &&
        px + pw > segMinX &&
        py < segMaxY &&
        py + ph > segMinY
      ) {
        return true;
      }
    }
    return false;
  }
}

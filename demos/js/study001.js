/**
 * Study 001 - Grid Bounce
 *
 * Inspired by @okazz_ - Colored circles bouncing between grid points
 * with motion trails.
 *
 * Features:
 * - Grid of anchor dots using fluent API
 * - Colored circles that tween between adjacent grid points
 * - Motion trail effect via semi-transparent clear
 * - Staggered movement timing
 * - Fully responsive
 */

import { gcanvas, Easing } from "../../src/index.js";

// Configuration
const CONFIG = {
  // Grid settings
  gridSpacing: 40,
  dotRadius: 2,
  dotColor: "rgba(80, 80, 80, 0.6)",

  // Circle settings
  circleRadius: 8,
  circleDensity: 0.35,

  // Animation settings
  moveDuration: 0.3,
  moveInterval: { min: 0.5, max: 2.0 },

  // Trail effect
  trailAlpha: 0.12,

  // Colors
  colors: [
    "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#00C7BE",
    "#007AFF", "#5856D6", "#AF52DE", "#FF2D55", "#FFFFFF",
  ],
};

/**
 * Circle state for animation
 */
class CircleState {
  constructor(gridX, gridY, spacing) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.targetGridX = gridX;
    this.targetGridY = gridY;
    this.spacing = spacing;

    this.x = gridX * spacing;
    this.y = gridY * spacing;

    this.isMoving = false;
    this.moveProgress = 0;
    this.startX = this.x;
    this.startY = this.y;
    this.endX = this.x;
    this.endY = this.y;

    this.nextMoveTime = Math.random() * CONFIG.moveInterval.max;
    this.timeSinceLastMove = 0;
  }

  pickNewTarget(maxGridX, maxGridY) {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    const valid = directions.filter(d => {
      const newX = this.gridX + d.dx;
      const newY = this.gridY + d.dy;
      return newX >= 0 && newX <= maxGridX && newY >= 0 && newY <= maxGridY;
    });

    if (valid.length === 0) return;

    const dir = valid[Math.floor(Math.random() * valid.length)];
    this.targetGridX = this.gridX + dir.dx;
    this.targetGridY = this.gridY + dir.dy;

    this.startX = this.x;
    this.startY = this.y;
    this.endX = this.targetGridX * this.spacing;
    this.endY = this.targetGridY * this.spacing;
    this.isMoving = true;
    this.moveProgress = 0;
  }

  update(dt, maxGridX, maxGridY) {
    if (this.isMoving) {
      this.moveProgress += dt / CONFIG.moveDuration;

      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.isMoving = false;
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        this.x = this.endX;
        this.y = this.endY;
        this.timeSinceLastMove = 0;
        this.nextMoveTime = CONFIG.moveInterval.min +
          Math.random() * (CONFIG.moveInterval.max - CONFIG.moveInterval.min);
      } else {
        const t = Easing.easeInOutCubic(this.moveProgress);
        this.x = this.startX + (this.endX - this.startX) * t;
        this.y = this.startY + (this.endY - this.startY) * t;
      }
    } else {
      this.timeSinceLastMove += dt;
      if (this.timeSinceLastMove >= this.nextMoveTime) {
        this.pickNewTarget(maxGridX, maxGridY);
      }
    }
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: "#000", fluid: true });
  const scene = game.scene("main");
  const gameInstance = game.game;

  // Debounced resize handling
  let resizeTimeout = null;
  let needsRebuild = false;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Clear canvas fully before rebuild
      gameInstance.ctx.fillStyle = "#000";
      gameInstance.ctx.fillRect(0, 0, gameInstance.width, gameInstance.height);
      needsRebuild = true;
    }, 100);
  };

  window.addEventListener("resize", handleResize);

  // State
  let gridCols = 0;
  let gridRows = 0;
  let offsetX = 0;
  let offsetY = 0;
  let circles = [];

  // Override clear for trail effect + direct dot rendering
  gameInstance.clear = function () {
    const ctx = this.ctx;

    // Trail effect
    ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.trailAlpha})`;
    ctx.fillRect(0, 0, gameInstance.width, gameInstance.height);

    // Draw grid dots directly in a single batched path (no GameObject overhead)
    ctx.fillStyle = CONFIG.dotColor;
    ctx.beginPath();
    const spacing = CONFIG.gridSpacing;
    const r = CONFIG.dotRadius;
    const twoPi = Math.PI * 2;

    for (let x = 0; x <= gridCols; x++) {
      for (let y = 0; y <= gridRows; y++) {
        const px = x * spacing + offsetX;
        const py = y * spacing + offsetY;

        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, twoPi);
      }
    }
    ctx.fill();
  };

  /**
   * Setup grid based on current size
   */
  function setupGrid() {
    const spacing = CONFIG.gridSpacing;
    const padding = spacing;
    const w = gameInstance.width;
    const h = gameInstance.height;

    gridCols = Math.floor((w - padding * 2) / spacing);
    gridRows = Math.floor((h - padding * 2) / spacing);
    offsetX = (w - gridCols * spacing) / 2;
    offsetY = (h - gridRows * spacing) / 2;

    // Clear existing circles
    circles = [];

    // Create bouncing circles
    const occupied = new Set();
    const totalPositions = (gridCols + 1) * (gridRows + 1);
    const numCircles = Math.floor(totalPositions * CONFIG.circleDensity);

    for (let i = 0; i < numCircles; i++) {
      let gx, gy, key;
      let attempts = 0;

      do {
        gx = Math.floor(Math.random() * (gridCols + 1));
        gy = Math.floor(Math.random() * (gridRows + 1));
        key = `${gx},${gy}`;
        attempts++;
      } while (occupied.has(key) && attempts < 100);

      if (attempts >= 100) continue;
      occupied.add(key);

      const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      const name = `circle_${i}`;

      const state = new CircleState(gx, gy, spacing);

      scene.go({ x: state.x + offsetX, y: state.y + offsetY, name })
        .circle({ radius: CONFIG.circleRadius, fill: color });

      circles.push({ name, state, color });
    }
  }

  // Initial setup
  setupGrid();

  // Update loop
  game.on("update", (dt, ctx) => {
    // Check for resize (debounced flag)
    if (needsRebuild) {
      needsRebuild = false;

      // Clear scene completely and rebuild
      scene.sceneInstance.clear();
      // Clear refs
      for (const c of circles) {
        delete ctx.refs[c.name];
      }

      setupGrid();
    }

    // Update circle positions
    for (const c of circles) {
      c.state.update(dt, gridCols, gridRows);

      const go = ctx.refs[c.name];
      if (go) {
        go.x = c.state.x + offsetX;
        go.y = c.state.y + offsetY;
      }
    }
  });

  // Click to randomize colors
  game.on("click", (ctx) => {
    for (const c of circles) {
      const newColor = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      c.color = newColor;

      const go = ctx.refs[c.name];
      if (go && go._fluentShape) {
        go._fluentShape.color = newColor;
      }
    }
  });

  game.start();
});

/**
 * Study 002 - Hex Grid
 *
 * Inspired by @okazz_ - Triangular lattice with ring circles
 *
 * Features:
 * - Triangular/hexagonal lattice (6 directions)
 * - Ring circles with center dots
 * - Visible grid lines
 * - Light background
 */

import { gcanvas, Easing } from "../../src/index.js";

// Configuration
const CONFIG = {
  // Grid settings
  gridSpacing: 50,
  dotRadius: 4,
  dotColor: "#333",
  lineColor: "rgba(0, 0, 0, 0.03)",
  lineWidth: 1,

  // Circle settings
  circleRadius: 14,
  circleDensity: 0.3,

  // Animation settings
  moveDuration: 0.25,
  moveInterval: { min: 0.4, max: 1.5 },

  // Trail effect
  trailAlpha: 0.15,

  // Background
  bgColor: "#F5F5F0",

  // Colors
  colors: [
    "#E63946", "#F4A261", "#E9C46A", "#2A9D8F", "#00B4D8",
    "#0077B6", "#7209B7", "#F72585", "#4CC9F0", "#80ED99",
  ],
};

// Triangular grid row height factor (sin 60°)
const ROW_HEIGHT = Math.sin(Math.PI / 3); // ~0.866

/**
 * Get pixel position for a grid cell
 */
function gridToPixel(col, row, spacing, offsetX, offsetY) {
  const x = col * spacing + (row % 2) * (spacing / 2) + offsetX;
  const y = row * spacing * ROW_HEIGHT + offsetY;
  return { x, y };
}

/**
 * Get valid neighbors for a triangular lattice cell
 */
function getNeighbors(col, row, maxCol, maxRow) {
  const neighbors = [];
  const isOddRow = row % 2 === 1;

  // Horizontal neighbors (always valid pattern)
  const directions = [
    { dc: -1, dr: 0 },  // left
    { dc: 1, dr: 0 },   // right
  ];

  // Diagonal neighbors depend on row parity
  if (isOddRow) {
    directions.push(
      { dc: 0, dr: -1 },   // up-left
      { dc: 1, dr: -1 },   // up-right
      { dc: 0, dr: 1 },    // down-left
      { dc: 1, dr: 1 },    // down-right
    );
  } else {
    directions.push(
      { dc: -1, dr: -1 },  // up-left
      { dc: 0, dr: -1 },   // up-right
      { dc: -1, dr: 1 },   // down-left
      { dc: 0, dr: 1 },    // down-right
    );
  }

  for (const { dc, dr } of directions) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc <= maxCol && nr >= 0 && nr <= maxRow) {
      neighbors.push({ col: nc, row: nr });
    }
  }

  return neighbors;
}

/**
 * Circle state for animation
 */
class CircleState {
  constructor(col, row, spacing) {
    this.col = col;
    this.row = row;
    this.targetCol = col;
    this.targetRow = row;
    this.spacing = spacing;

    this.x = 0;
    this.y = 0;

    this.isMoving = false;
    this.moveProgress = 0;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;

    this.nextMoveTime = Math.random() * CONFIG.moveInterval.max;
    this.timeSinceLastMove = 0;
  }

  updatePosition(offsetX, offsetY) {
    const pos = gridToPixel(this.col, this.row, this.spacing, offsetX, offsetY);
    this.x = pos.x;
    this.y = pos.y;
  }

  pickNewTarget(maxCol, maxRow, offsetX, offsetY) {
    const neighbors = getNeighbors(this.col, this.row, maxCol, maxRow);
    if (neighbors.length === 0) return;

    const target = neighbors[Math.floor(Math.random() * neighbors.length)];
    this.targetCol = target.col;
    this.targetRow = target.row;

    this.startX = this.x;
    this.startY = this.y;

    const endPos = gridToPixel(this.targetCol, this.targetRow, this.spacing, offsetX, offsetY);
    this.endX = endPos.x;
    this.endY = endPos.y;

    this.isMoving = true;
    this.moveProgress = 0;
  }

  update(dt, maxCol, maxRow, offsetX, offsetY) {
    if (this.isMoving) {
      this.moveProgress += dt / CONFIG.moveDuration;

      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.isMoving = false;
        this.col = this.targetCol;
        this.row = this.targetRow;
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
        this.pickNewTarget(maxCol, maxRow, offsetX, offsetY);
      }
    }
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const scene = game.scene("main");
  const gameInstance = game.game;

  // Debounced resize handling
  let resizeTimeout = null;
  let needsRebuild = false;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Clear canvas fully before rebuild
      gameInstance.ctx.fillStyle = CONFIG.bgColor;
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

  // Override clear for trail effect + grid lines (layer 1)
  gameInstance.clear = function () {
    const ctx = this.ctx;

    // Trail effect with light background
    ctx.fillStyle = `rgba(245, 245, 240, ${CONFIG.trailAlpha})`;
    ctx.fillRect(0, 0, gameInstance.width, gameInstance.height);

    const spacing = CONFIG.gridSpacing;

    // Draw grid lines (bottom layer)
    ctx.strokeStyle = CONFIG.lineColor;
    ctx.lineWidth = CONFIG.lineWidth;
    ctx.beginPath();

    for (let row = 0; row <= gridRows; row++) {
      for (let col = 0; col <= gridCols; col++) {
        const pos = gridToPixel(col, row, spacing, offsetX, offsetY);
        const neighbors = getNeighbors(col, row, gridCols, gridRows);

        // Only draw lines to neighbors with higher index to avoid duplicates
        for (const n of neighbors) {
          if (n.row > row || (n.row === row && n.col > col)) {
            const nPos = gridToPixel(n.col, n.row, spacing, offsetX, offsetY);
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(nPos.x, nPos.y);
          }
        }
      }
    }
    ctx.stroke();
  };

  // Draw grid dots on TOP of everything (layer 3)
  function drawGridDots(ctx) {
    ctx.fillStyle = CONFIG.dotColor;
    ctx.beginPath();
    const spacing = CONFIG.gridSpacing;
    const r = CONFIG.dotRadius;
    const twoPi = Math.PI * 2;

    for (let row = 0; row <= gridRows; row++) {
      for (let col = 0; col <= gridCols; col++) {
        const pos = gridToPixel(col, row, spacing, offsetX, offsetY);
        ctx.moveTo(pos.x + r, pos.y);
        ctx.arc(pos.x, pos.y, r, 0, twoPi);
      }
    }
    ctx.fill();
  }

  // Override render to add dots on top after pipeline
  const originalRender = gameInstance.render.bind(gameInstance);
  gameInstance.render = function () {
    originalRender();
    drawGridDots(this.ctx);
  };

  /**
   * Setup grid based on current size
   */
  function setupGrid() {
    const spacing = CONFIG.gridSpacing;
    const padding = spacing;
    const w = gameInstance.width;
    const h = gameInstance.height;

    // Calculate grid dimensions
    gridCols = Math.floor((w - padding * 2) / spacing);
    gridRows = Math.floor((h - padding * 2) / (spacing * ROW_HEIGHT));

    // Center the grid
    const gridWidth = gridCols * spacing + spacing / 2; // Account for offset rows
    const gridHeight = gridRows * spacing * ROW_HEIGHT;
    offsetX = (w - gridWidth) / 2 + spacing / 4;
    offsetY = (h - gridHeight) / 2;

    // Clear existing circles
    circles = [];

    // Create bouncing circles
    const occupied = new Set();
    const totalPositions = (gridCols + 1) * (gridRows + 1);
    const numCircles = Math.floor(totalPositions * CONFIG.circleDensity);

    for (let i = 0; i < numCircles; i++) {
      let col, row, key;
      let attempts = 0;

      do {
        col = Math.floor(Math.random() * (gridCols + 1));
        row = Math.floor(Math.random() * (gridRows + 1));
        key = `${col},${row}`;
        attempts++;
      } while (occupied.has(key) && attempts < 100);

      if (attempts >= 100) continue;
      occupied.add(key);

      const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      const name = `circle_${i}`;

      const state = new CircleState(col, row, spacing);
      state.updatePosition(offsetX, offsetY);

      // Create filled circle (layer 2 - grid dots render on top)
      scene.go({ x: state.x, y: state.y, name })
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
      c.state.update(dt, gridCols, gridRows, offsetX, offsetY);

      const go = ctx.refs[c.name];
      if (go) {
        go.x = c.state.x;
        go.y = c.state.y;
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

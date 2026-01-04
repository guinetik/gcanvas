/**
 * Study 003 - Circuit
 *
 * Generative circuit patterns with traversing dots.
 *
 * Features:
 * - Random maze-like circuit connections
 * - Ring nodes at grid intersections
 * - White dots that traverse the circuit paths
 * - Click to regenerate
 */

import { gcanvas, Easing } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  // Grid settings
  gridSpacing: 40,
  nodeRadius: 8,
  nodeLineWidth: 2.5,
  nodeColor: "rgba(255, 255, 255, 0.5)",
  nodeFill: "#000",

  // Path settings
  pathWidth: 1.5,
  pathColor: "rgba(255, 255, 255, 0.4)",
  connectionProbability: 0.5,

  // Traveler settings
  travelerRadius: 4,
  travelerColor: "#fff",
  travelerCount: 0.25, // Percentage of connected nodes with travelers
  travelerSpeedMin: 30, // Pixels per second
  travelerSpeedMax: 120,

  // Background
  bgColor: "#000",
};

/**
 * Traveler - moves along circuit paths
 */
class Traveler {
  constructor(startNode, graph, spacing) {
    this.graph = graph;
    this.spacing = spacing;
    this.currentNode = startNode;
    this.targetNode = null;
    this.x = startNode.x;
    this.y = startNode.y;
    this.progress = 0;
    this.isMoving = false;
    this.startX = this.x;
    this.startY = this.y;
    this.endX = this.x;
    this.endY = this.y;
    this.waitTime = Math.random() * 0.5;
    // Random speed for this traveler
    this.speed = CONFIG.travelerSpeedMin +
      Math.random() * (CONFIG.travelerSpeedMax - CONFIG.travelerSpeedMin);
  }

  pickNextTarget() {
    const neighbors = this.graph.getConnections(this.currentNode.col, this.currentNode.row);
    if (neighbors.length === 0) return false;

    // Pick random connected neighbor
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    this.targetNode = this.graph.getNode(next.col, next.row);

    if (!this.targetNode) return false;

    this.startX = this.x;
    this.startY = this.y;
    this.endX = this.targetNode.x;
    this.endY = this.targetNode.y;
    this.progress = 0;
    this.isMoving = true;
    return true;
  }

  update(dt) {
    if (this.isMoving) {
      const distance = Math.sqrt(
        Math.pow(this.endX - this.startX, 2) + Math.pow(this.endY - this.startY, 2)
      );
      const duration = distance / this.speed;
      this.progress += dt / duration;

      if (this.progress >= 1) {
        this.progress = 1;
        this.isMoving = false;
        this.x = this.endX;
        this.y = this.endY;
        this.currentNode = this.targetNode;
        this.waitTime = 0.1 + Math.random() * 0.3;
      } else {
        const t = Easing.easeInOutQuad(this.progress);
        this.x = this.startX + (this.endX - this.startX) * t;
        this.y = this.startY + (this.endY - this.startY) * t;
      }
    } else {
      this.waitTime -= dt;
      if (this.waitTime <= 0) {
        this.pickNextTarget();
      }
    }
  }
}

/**
 * Circuit Graph - manages nodes and connections
 */
class CircuitGraph {
  constructor() {
    this.nodes = new Map();
    this.connections = new Map();
  }

  clear() {
    this.nodes.clear();
    this.connections.clear();
  }

  addNode(col, row, x, y) {
    const key = `${col},${row}`;
    this.nodes.set(key, { col, row, x, y });
  }

  getNode(col, row) {
    return this.nodes.get(`${col},${row}`);
  }

  addConnection(col1, row1, col2, row2) {
    const key1 = `${col1},${row1}`;
    const key2 = `${col2},${row2}`;

    if (!this.connections.has(key1)) {
      this.connections.set(key1, []);
    }
    if (!this.connections.has(key2)) {
      this.connections.set(key2, []);
    }

    // Add bidirectional connection
    this.connections.get(key1).push({ col: col2, row: row2 });
    this.connections.get(key2).push({ col: col1, row: row1 });
  }

  getConnections(col, row) {
    return this.connections.get(`${col},${row}`) || [];
  }

  hasConnection(col1, row1, col2, row2) {
    const conns = this.getConnections(col1, row1);
    return conns.some(c => c.col === col2 && c.row === row2);
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const scene = game.scene("main");
  const gameInstance = game.game;

  // State
  let gridCols = 0;
  let gridRows = 0;
  let offsetX = 0;
  let offsetY = 0;
  let graph = new CircuitGraph();
  let travelers = [];

  // Debounced resize
  let resizeTimeout = null;
  let needsRebuild = false;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      gameInstance.ctx.fillStyle = CONFIG.bgColor;
      gameInstance.ctx.fillRect(0, 0, gameInstance.width, gameInstance.height);
      needsRebuild = true;
    }, 100);
  };

  window.addEventListener("resize", handleResize);

  /**
   * Generate random circuit
   */
  function generateCircuit() {
    const spacing = CONFIG.gridSpacing;
    const padding = spacing * 1.5;
    const w = gameInstance.width;
    const h = gameInstance.height;

    gridCols = Math.floor((w - padding * 2) / spacing);
    gridRows = Math.floor((h - padding * 2) / spacing);
    offsetX = (w - gridCols * spacing) / 2;
    offsetY = (h - gridRows * spacing) / 2;

    // Clear previous
    graph.clear();
    travelers = [];

    // Create nodes
    for (let row = 0; row <= gridRows; row++) {
      for (let col = 0; col <= gridCols; col++) {
        const x = col * spacing + offsetX;
        const y = row * spacing + offsetY;
        graph.addNode(col, row, x, y);
      }
    }

    // Create random connections (only right and down to avoid duplicates)
    for (let row = 0; row <= gridRows; row++) {
      for (let col = 0; col <= gridCols; col++) {
        // Connect right
        if (col < gridCols && Math.random() < CONFIG.connectionProbability) {
          graph.addConnection(col, row, col + 1, row);
        }
        // Connect down
        if (row < gridRows && Math.random() < CONFIG.connectionProbability) {
          graph.addConnection(col, row, col, row + 1);
        }
      }
    }

    // Create travelers on random connected nodes
    const nodeList = Array.from(graph.nodes.values());
    const connectedNodes = nodeList.filter(n => graph.getConnections(n.col, n.row).length > 0);
    const numTravelers = Math.floor(connectedNodes.length * CONFIG.travelerCount);

    for (let i = 0; i < numTravelers && connectedNodes.length > 0; i++) {
      const idx = Math.floor(Math.random() * connectedNodes.length);
      const node = connectedNodes.splice(idx, 1)[0];
      travelers.push(new Traveler(node, graph, spacing));
    }
  }

  /**
   * Draw the circuit (nodes and paths)
   */
  function drawCircuit(ctx) {
    const spacing = CONFIG.gridSpacing;

    // Draw connections first (under nodes)
    ctx.strokeStyle = CONFIG.pathColor;
    ctx.lineWidth = CONFIG.pathWidth;
    ctx.lineCap = "round";

    const drawnConnections = new Set();

    for (const [key, node] of graph.nodes) {
      const connections = graph.getConnections(node.col, node.row);

      for (const conn of connections) {
        // Avoid drawing same connection twice
        const connKey = [key, `${conn.col},${conn.row}`].sort().join("-");
        if (drawnConnections.has(connKey)) continue;
        drawnConnections.add(connKey);

        const targetNode = graph.getNode(conn.col, conn.row);
        if (!targetNode) continue;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    }

    // Draw nodes (only where connections exist)
    ctx.fillStyle = CONFIG.nodeFill;
    ctx.strokeStyle = CONFIG.nodeColor;
    ctx.lineWidth = CONFIG.nodeLineWidth;

    for (const [key, node] of graph.nodes) {
      // Only draw nodes that have at least one connection
      const connections = graph.getConnections(node.col, node.row);
      if (connections.length === 0) continue;

      ctx.beginPath();
      ctx.arc(node.x, node.y, CONFIG.nodeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Draw travelers (on top of everything)
    ctx.fillStyle = CONFIG.travelerColor;
    for (const traveler of travelers) {
      ctx.beginPath();
      ctx.arc(traveler.x, traveler.y, CONFIG.travelerRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Generate initial circuit
  generateCircuit();

  // Custom render - no trail effect, just redraw
  gameInstance.clear = function () {
    this.ctx.fillStyle = CONFIG.bgColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
    drawCircuit(this.ctx);
  };

  // Update loop
  game.on("update", (dt, ctx) => {
    if (needsRebuild) {
      needsRebuild = false;
      generateCircuit();
    }

    // Update travelers
    for (const traveler of travelers) {
      traveler.update(dt);
    }
  });

  // Click to regenerate
  game.on("click", () => {
    generateCircuit();
  });

  game.start();
});

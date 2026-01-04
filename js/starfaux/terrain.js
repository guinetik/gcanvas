/**
 * Terrain - Wireframe ground grid with Perlin noise deformation for StarFaux
 *
 * Uses Perlin noise to create smooth, procedural terrain that the
 * grid deforms to - just like classic StarFox SNES/N64!
 *
 * Pattern borrowed from spacetime.js: pre-compute grid vertices,
 * update heights per frame, project all then draw.
 */

import { Painter, Noise } from "/gcanvas.es.min.js";
import { CONFIG } from "./config.js";

export class Terrain {
  constructor(game, camera) {
    this.game = game;
    this.camera = camera;
    this.config = CONFIG.terrain;

    // Seed the noise for consistent terrain
    Noise.seed(42);

    // Grid dimensions from config
    this.numRows = this.config.totalRows || 80;
    this.numCols = this.config.numCols || 60;

    // Calculate dynamic width based on screen dimensions
    this.updateDimensions();

    // Pre-compute flat grid structure (will be updated each frame)
    this.gridVertices = [];

    // Track the nearest visible row for ground fill
    this.nearestVisibleRow = null;
  }

  /**
   * Update terrain dimensions based on current screen size
   * Called on init and resize
   */
  updateDimensions() {
    // Width scales with screen width to always reach edges
    const multiplier = this.config.widthMultiplier || 6;
    this.terrainWidth = this.game.width * multiplier;

    // Column spacing adapts to maintain grid density
    this.colSpacing = this.terrainWidth / this.numCols;
  }

  update(dt) {
    // Rebuild grid vertices each frame based on current scroll position
    this.buildGridVertices();
  }

  /**
   * Build grid of vertices at current scroll position with terrain heights
   */
  buildGridVertices() {
    const cfg = this.config;
    // Use dynamic width calculated in updateDimensions
    const halfWidth = this.terrainWidth / 2;
    const groundY = cfg.yPosition;
    const colSpacing = this.colSpacing;

    // Use config values for grid density
    const nearSpacing = cfg.nearSpacing || 25;
    const totalRows = this.numRows;
    const startZ = cfg.nearPlaneZ || 50;

    this.gridVertices = [];
    this.nearestVisibleRow = null;

    // Calculate scroll offset based on our actual spacing
    const scrollOffset = this.game.distance % nearSpacing;

    for (let row = 0; row < totalRows; row++) {
      const rowVertices = [];

      // Start grid at bottom of screen, scrolling smoothly
      const lineZ = startZ + row * nearSpacing - scrollOffset;

      // Skip if behind camera
      if (lineZ <= 0) {
        this.gridVertices.push(null);
        continue;
      }

      // World Z for this row
      const worldZ = this.game.distance + lineZ;

      for (let col = 0; col <= this.numCols; col++) {
        const worldX = -halfWidth + col * colSpacing;

        // Get terrain height at this point using Perlin noise
        const terrainHeight = this.getHeightAt(worldX, worldZ);

        // Y position: ground minus terrain height (terrain rises UP = negative Y)
        const y = groundY - terrainHeight;

        rowVertices.push({
          worldX,
          worldZ,
          localZ: lineZ,  // Z relative to camera for projection
          y,
          height: terrainHeight,
        });
      }

      this.gridVertices.push(rowVertices);
    }
  }

  /**
   * Get terrain height at a world position
   * Canyon-style: dramatic mountains on edges, mostly flat middle with occasional features
   */
  getHeightAt(worldX, worldZ) {
    const cfg = this.config.features;
    const maxH = cfg.maxHeight;

    // How far from center (0 = center, 1 = edge)
    const halfWidth = this.terrainWidth / 2;
    const edgeFactor = Math.abs(worldX) / halfWidth;

    // DRAMATIC canyon walls - steep mountains on left/right margins
    // Use steeper curve (power of 3) and higher multiplier for more pronounced edges
    const edgeHeight = Math.pow(edgeFactor, 3) * maxH * 1.8;

    // Add dramatic noise variation to canyon walls - jagged peaks
    const wallNoise = Noise.perlin2(worldX * 0.004, worldZ * 0.004);
    const wallVariation = wallNoise * maxH * 0.6 * edgeFactor;

    // Secondary ridge detail on edges
    const ridgeNoise = Noise.perlin2(worldX * 0.012, worldZ * 0.008);
    const ridges = Math.max(0, ridgeNoise) * maxH * 0.3 * Math.pow(edgeFactor, 2);

    // TALL obstacle mountains in the middle - these are the main hazards to dodge
    const obstaclePeakNoise = Noise.perlin2(worldX * 0.002 + 200, worldZ * 0.0015);
    let obstaclePeak = 0;
    if (obstaclePeakNoise > 0.4 && edgeFactor < 0.5) {
      // Tall, sharp mountains that require dodging
      const sharpness = Noise.perlin2(worldX * 0.02, worldZ * 0.02);
      obstaclePeak = (obstaclePeakNoise - 0.4) * 8 * maxH * Math.max(0.5, sharpness + 0.5);
    }

    // Additional scattered tall spires in the middle
    const spireNoise = Noise.perlin2(worldX * 0.004 + 300, worldZ * 0.003 + 100);
    let spire = 0;
    if (spireNoise > 0.5 && edgeFactor < 0.4) {
      spire = (spireNoise - 0.5) * 6 * maxH;
    }

    // Depressions/valleys in the middle (negative contribution to make dips)
    const valleyNoise = Noise.perlin2(worldX * 0.002 + 50, worldZ * 0.002 + 50);
    let valley = 0;
    if (valleyNoise < -0.3 && edgeFactor < 0.4) {
      // Create subtle dips/depressions
      valley = (valleyNoise + 0.3) * maxH * 0.2;  // Negative value = depression
    }

    // Rolling hills in middle area (gentle undulation)
    const hillNoise = Noise.perlin2(worldX * 0.003, worldZ * 0.003);
    const middleHills = Math.max(0, hillNoise * 0.5 + 0.1) * maxH * 0.2 * (1 - edgeFactor);

    // Combine all layers
    let height = edgeHeight + wallVariation + ridges + obstaclePeak + spire + valley + middleHills;

    // Ensure non-negative
    height = Math.max(0, height);

    return height;
  }

  /**
   * Check if player collides with terrain
   */
  checkPlayerCollision(playerX, playerY) {
    const playerWorldZ = this.game.distance + CONFIG.player.shipZ;
    const terrainHeight = this.getHeightAt(playerX, playerWorldZ);

    // Only check collision for reasonably tall terrain
    const collisionThreshold = this.config.features.collisionHeight || 100;
    if (terrainHeight < collisionThreshold) {
      return false;  // Terrain too short to collide
    }

    // groundY is 0, terrainHeight is positive (e.g. 200)
    // surfaceY = 0 - 200 = -200 (negative = higher on screen)
    // playerY is from offsetY + screenY, can be negative (high) or positive (low)
    // Player collides if their Y is GREATER than surfaceY (lower on screen = into mountain)
    const groundY = this.config.yPosition;
    const surfaceY = groundY - terrainHeight;

    // Small buffer for ship size
    const collisionBuffer = 30;
    return playerY > surfaceY + collisionBuffer;
  }

  render(parallaxOffsetY = 0) {
    const ctx = Painter.ctx;

    // Store parallax for use in sky rendering
    this.parallaxOffsetY = parallaxOffsetY;

    // Render sky gradient first (behind everything)
    this.renderSky(ctx);

    // Fill the gap between horizon and terrain with dark color
    this.renderHorizonFill(ctx);

    // Build projection data
    const projected = this.buildProjectedGrid();

    // Render the grid lines - NO ground fill, just clean lines like Joy Division
    this.renderGridLines(ctx, projected);
  }

  /**
   * Fill the area below the horizon to eliminate the gap
   */
  renderHorizonFill(ctx) {
    const w = this.game.width;
    const h = this.game.height;
    const groundY = this.config.yPosition;

    // Horizon stays FIXED - no parallax
    const horizonPoint = this.camera.project(0, groundY, 10000);
    const horizonY = horizonPoint.y;

    // Fill from horizon down (but not all the way - leave room for HUD)
    // The fill height should just cover the gap, terrain lines will render on top
    const fillHeight = h * 0.6;  // Fill about 60% down from horizon

    const gradient = ctx.createLinearGradient(0, horizonY, 0, horizonY + fillHeight);
    gradient.addColorStop(0, "#001a00");    // Very dark green at horizon
    gradient.addColorStop(0.5, "#000800");  // Darker
    gradient.addColorStop(1, "#000000");    // Black

    ctx.fillStyle = gradient;
    ctx.fillRect(-w, horizonY, w * 2, fillHeight);
  }

  /**
   * Build projected grid data for rendering
   */
  buildProjectedGrid() {
    const camera = this.camera;
    const projected = [];

    // Track nearest visible row for ground fill
    this.nearestVisibleRow = null;

    for (let row = 0; row < this.gridVertices.length; row++) {
      const rowVerts = this.gridVertices[row];
      if (!rowVerts) {
        projected.push(null);
        continue;
      }

      const rowProjected = [];
      let hasVisiblePoints = false;

      for (const vertex of rowVerts) {
        const p = camera.project(vertex.worldX, vertex.y, vertex.localZ);

        if (p.scale > 0.008) {
          rowProjected.push({
            x: p.x,
            y: p.y,
            scale: p.scale,
            height: vertex.height,
          });
          hasVisiblePoints = true;
        } else {
          rowProjected.push(null);
        }
      }

      projected.push(rowProjected);

      // Track the nearest (first) visible row for ground fill
      if (hasVisiblePoints && !this.nearestVisibleRow) {
        this.nearestVisibleRow = rowProjected;
      }
    }

    return projected;
  }

  /**
   * Draw grid lines from projected data - Joy Division style (horizontal only)
   * Like the Unknown Pleasures album cover - stacked waveform lines
   * Mountains above horizon render as black silhouettes for contrast
   */
  renderGridLines(ctx, projected) {
    const scale = this.game.scaleFactor || 1;
    const groundY = this.config.yPosition;

    // Horizon stays FIXED
    const horizonPoint = this.camera.project(0, groundY, 10000);
    const horizonY = horizonPoint.y;

    // Joy Division style horizontal waveform lines
    for (let row = 0; row < projected.length; row++) {
      const rowPoints = projected[row];
      if (!rowPoints) continue;

      // Each line is one continuous stroke - consistent color
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      let started = false;

      for (let col = 0; col < rowPoints.length; col++) {
        const point = rowPoints[col];
        if (!point) {
          if (started) ctx.stroke();
          ctx.beginPath();
          started = false;
          continue;
        }

        if (!started) {
          ctx.moveTo(point.x, point.y);
          started = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      if (started) ctx.stroke();
    }
  }

  /**
   * Render black silhouettes for mountain peaks that extend above the horizon
   * This creates contrast against the bright sun/sky
   */
  renderSilhouettes(ctx, projected, horizonY, scale) {
    ctx.fillStyle = "#000000";

    // Process each row - fill area from line to horizon if above horizon
    for (let row = projected.length - 1; row >= 0; row--) {
      const rowPoints = projected[row];
      if (!rowPoints) continue;

      // Check if any points in this row are above horizon
      let hasAboveHorizon = false;
      for (const point of rowPoints) {
        if (point && point.y < horizonY) {
          hasAboveHorizon = true;
          break;
        }
      }

      if (!hasAboveHorizon) continue;

      // Draw filled polygon from the line down to horizon
      ctx.beginPath();
      let started = false;
      let firstX = 0;

      for (let col = 0; col < rowPoints.length; col++) {
        const point = rowPoints[col];
        if (!point) continue;

        // Only include points above or near horizon
        const y = Math.min(point.y, horizonY);

        if (!started) {
          firstX = point.x;
          ctx.moveTo(point.x, y);
          started = true;
        } else {
          ctx.lineTo(point.x, y);
        }
      }

      if (started) {
        // Close the shape by going down to horizon and back
        const lastPoint = rowPoints[rowPoints.length - 1] || rowPoints.find(p => p);
        if (lastPoint) {
          ctx.lineTo(lastPoint.x, horizonY + 2);  // Go to horizon
          ctx.lineTo(firstX, horizonY + 2);       // Go back along horizon
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  /**
   * Get color based on terrain height - green with brighter peaks
   */
  getHeightColor(height) {
    // Green terrain - brighter for peaks like classic StarFox
    if (height < 5) {
      return "#005500";  // Flat ground - dark green
    } else if (height < 40) {
      return "#007700";  // Low hills - medium green
    } else if (height < 80) {
      return "#00aa00";  // Medium hills - brighter green
    } else {
      return "#00ff00";  // Peaks - bright green
    }
  }

  renderSky(ctx) {
    const camera = this.camera;
    const groundY = this.config.yPosition;
    const scale = this.game.scaleFactor || 1;
    const w = this.game.width;
    const h = this.game.height;

    // Horizon stays FIXED - no parallax on sky/horizon
    const horizonPoint = camera.project(0, groundY, 10000);
    const horizonY = horizonPoint.y;

    // === DARK PURPLE/MAGENTA SKY - contrasts with green terrain ===

    // Dark purple gradient sky - complementary to green
    const skyGradient = ctx.createLinearGradient(0, -h / 2, 0, horizonY);
    skyGradient.addColorStop(0, "#050008");      // Near black with purple tint
    skyGradient.addColorStop(0.3, "#0a0012");    // Very dark purple
    skyGradient.addColorStop(0.5, "#120020");    // Dark purple
    skyGradient.addColorStop(0.7, "#1a0030");    // Medium purple
    skyGradient.addColorStop(0.85, "#220040");   // Lighter purple near horizon
    skyGradient.addColorStop(1, "#2a0050");      // Purple at horizon
    ctx.fillStyle = skyGradient;
    ctx.fillRect(-w, -h / 2, w * 2, horizonY + h / 2);

    // === TERMINAL SUN ===
    const sunRadius = 120 * scale;
    const sunY = horizonY - sunRadius * 0.4;  // Sun sitting on horizon

    // Sun glow (outer) - green/cyan glow against purple sky
    const glowGradient = ctx.createRadialGradient(0, sunY, sunRadius * 0.5, 0, sunY, sunRadius * 2.5);
    glowGradient.addColorStop(0, "rgba(100, 255, 150, 0.4)");
    glowGradient.addColorStop(0.4, "rgba(0, 255, 100, 0.2)");
    glowGradient.addColorStop(0.7, "rgba(0, 200, 100, 0.1)");
    glowGradient.addColorStop(1, "rgba(50, 0, 80, 0)");
    ctx.fillStyle = glowGradient;
    ctx.fillRect(-w, horizonY - sunRadius * 3, w * 2, sunRadius * 3);

    // Sun body - gradient from white/cyan to green
    const sunGradient = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
    sunGradient.addColorStop(0, "#eeffff");      // White/cyan top
    sunGradient.addColorStop(0.25, "#88ffcc");   // Cyan-green
    sunGradient.addColorStop(0.5, "#00ff88");    // Bright green-cyan
    sunGradient.addColorStop(0.75, "#00cc66");   // Medium green
    sunGradient.addColorStop(1, "#006633");      // Dark green bottom

    ctx.save();
    // Clip sun to above horizon (sun setting)
    ctx.beginPath();
    ctx.rect(-w, -h, w * 2, horizonY + h);
    ctx.clip();

    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(0, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // No scanlines - clean sun
    ctx.restore();

    // === CLOUDS ===
    this.renderSynthwaveClouds(ctx, horizonY, scale);

    // === HORIZON LINE ===
    ctx.strokeStyle = "#00ff88";  // Cyan-green horizon to match sun
    ctx.lineWidth = 2 * scale;
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 15 * scale;
    ctx.beginPath();
    ctx.moveTo(-w, horizonY);
    ctx.lineTo(w, horizonY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /**
   * Render synthwave-style geometric clouds
   */
  renderSynthwaveClouds(ctx, horizonY, scale) {
    const w = this.game.width;
    const h = this.game.height;

    // Scroll clouds slowly based on game distance
    const scrollOffset = (this.game.distance * 0.02) % (w * 2);

    ctx.save();
    ctx.globalAlpha = 0.25;

    // Layer 1: Far clouds (slower, smaller) - dark purple
    const farOffset = scrollOffset * 0.3;
    this.drawCloudLayer(ctx, horizonY - 180 * scale, 40 * scale, farOffset, 5, "#442266", scale);

    // Layer 2: Mid clouds - purple/magenta
    const midOffset = scrollOffset * 0.5;
    this.drawCloudLayer(ctx, horizonY - 120 * scale, 30 * scale, midOffset, 4, "#663388", scale);

    // Layer 3: Near clouds (faster, larger) - cyan-green glow
    const nearOffset = scrollOffset * 0.8;
    this.drawCloudLayer(ctx, horizonY - 60 * scale, 20 * scale, nearOffset, 3, "#00cc88", scale);

    ctx.restore();
  }

  /**
   * Draw a single layer of geometric clouds
   */
  drawCloudLayer(ctx, y, height, offset, count, color, scale) {
    const w = this.game.width;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * scale;

    for (let i = 0; i < count; i++) {
      // Position clouds across the sky with offset for scrolling
      const baseX = (i / count) * w * 2 - w + offset;
      const x = ((baseX + w * 2) % (w * 2)) - w;  // Wrap around

      // Draw geometric cloud shape (horizontal lines stacked)
      const cloudWidth = (80 + Math.sin(i * 1.5) * 40) * scale;
      const lineCount = 3 + (i % 2);

      for (let j = 0; j < lineCount; j++) {
        const lineY = y + j * (height / lineCount);
        const lineWidth = cloudWidth * (1 - j * 0.15);  // Taper toward bottom
        ctx.beginPath();
        ctx.moveTo(x - lineWidth / 2, lineY);
        ctx.lineTo(x + lineWidth / 2, lineY);
        ctx.stroke();
      }
    }
  }

  /**
   * Render ground fill - dark gradient at bottom ~15% of screen
   */
  renderGroundFill(ctx) {
    const w = this.game.width;
    const halfH = this.game.height / 2;

    // Fill bottom 15% with dark gradient
    const fillHeight = halfH * 0.3;  // 15% of screen height
    const fillStart = halfH - fillHeight;

    const gradient = ctx.createLinearGradient(0, fillStart, 0, halfH);
    gradient.addColorStop(0, "rgba(0, 15, 0, 0)");      // Transparent at top
    gradient.addColorStop(0.3, "rgba(0, 10, 0, 0.7)");
    gradient.addColorStop(1, "rgba(0, 5, 5, 1)");       // Solid dark at bottom

    ctx.fillStyle = gradient;
    ctx.fillRect(-w, fillStart, w * 2, fillHeight + 50);
  }

  reset() {
    // Nothing to reset - terrain is procedural
  }
}

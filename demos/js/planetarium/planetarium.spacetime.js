/**
 * Planetarium — Spacetime curvature grid.
 *
 * Renders a 3D grid that warps around the Sun showing how mass curves
 * spacetime (the "rubber sheet" analogy). Based on the spacetime demo.
 *
 * @module planetarium/spacetime
 */

import { Painter } from "../../../src/index.js";

const GRID_SIZE = 600;       // Grid extends from -GRID_SIZE/2 to +GRID_SIZE/2
const GRID_RESOLUTION = 40;  // Number of grid lines per axis
const WELL_DEPTH = 120;      // Depth of the gravity well (pixels)
const WELL_WIDTH = 80;       // Width of the Gaussian well (pixels)
const GRID_COLOR = "rgba(0, 140, 255, 0.15)";
const GRID_HIGHLIGHT = "rgba(60, 180, 255, 0.3)";

export class SpacetimeGrid {
  constructor() {
    this.vertices = null;
    this._initGrid();
  }

  _initGrid() {
    this.vertices = [];
    const half = GRID_SIZE / 2;

    for (let i = 0; i <= GRID_RESOLUTION; i++) {
      const row = [];
      for (let j = 0; j <= GRID_RESOLUTION; j++) {
        const x = (i / GRID_RESOLUTION - 0.5) * GRID_SIZE;
        const z = (j / GRID_RESOLUTION - 0.5) * GRID_SIZE;
        row.push({ x, y: 0, z });
      }
      this.vertices.push(row);
    }
  }

  /**
   * Update vertex Y values based on Sun's gravity well.
   * Gaussian profile: y = depth * exp(-r² / 2σ²)
   * @param {number} time - for subtle breathing animation
   */
  update(time) {
    const pulse = 1 + 0.03 * Math.sin(time * 1.5);
    const depth = WELL_DEPTH * pulse;
    const sigma2 = WELL_WIDTH * WELL_WIDTH * 2;

    for (let i = 0; i <= GRID_RESOLUTION; i++) {
      for (let j = 0; j <= GRID_RESOLUTION; j++) {
        const v = this.vertices[i][j];
        const r2 = v.x * v.x + v.z * v.z;
        // Positive Y = downward well (camera looks down, so well goes "into" the screen)
        v.y = -depth * Math.exp(-r2 / sigma2);
      }
    }
  }

  /**
   * Render the curved grid.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera3D} camera
   * @param {number} centerX - Screen center X
   * @param {number} centerY - Screen center Y
   * @param {number} zoom - Current zoom
   */
  draw(ctx, camera, centerX, centerY, zoom) {
    // Project all vertices
    const projected = this.vertices.map(row =>
      row.map(v => {
        const proj = camera.project(v.x, v.y, v.z);
        return {
          x: centerX + proj.x * zoom,
          y: centerY + proj.y * zoom,
        };
      })
    );

    // Draw grid lines along X
    for (let i = 0; i <= GRID_RESOLUTION; i++) {
      const isMain = i % 5 === 0;
      ctx.strokeStyle = isMain ? GRID_HIGHLIGHT : GRID_COLOR;
      ctx.lineWidth = isMain ? 1.0 : 0.5;
      ctx.beginPath();
      for (let j = 0; j <= GRID_RESOLUTION; j++) {
        const p = projected[i][j];
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Draw grid lines along Z
    for (let j = 0; j <= GRID_RESOLUTION; j++) {
      const isMain = j % 5 === 0;
      ctx.strokeStyle = isMain ? GRID_HIGHLIGHT : GRID_COLOR;
      ctx.lineWidth = isMain ? 1.0 : 0.5;
      ctx.beginPath();
      for (let i = 0; i <= GRID_RESOLUTION; i++) {
        const p = projected[i][j];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
}

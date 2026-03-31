/**
 * Planetarium — Spacetime curvature grid.
 *
 * Renders a 3D grid that warps around the Sun and planets, showing how
 * mass curves spacetime (the "rubber sheet" analogy).
 *
 * @module planetarium/spacetime
 */

import { Painter } from "../../../src/index.js";

const GRID_SIZE = 1300;
const GRID_RESOLUTION = 160;
const GRID_COLOR = "rgba(0, 160, 255, 0.25)";

// Sun well parameters
const SUN_DEPTH = 120;
const SUN_WIDTH = 80;

// Planet well parameters (exaggerated so they're visible)
const PLANET_DEPTH_SCALE = 25;  // base depth for planets
const PLANET_WIDTH_SCALE = 20;  // base width for planet wells

export class SpacetimeGrid {
  constructor() {
    this.vertices = null;
    this._initGrid();
  }

  _initGrid() {
    this.vertices = [];
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
   * Update vertex Y values based on Sun + planet gravity wells.
   * @param {number} time - for subtle breathing animation
   * @param {Array} planets - array of CelestialBody (worldX/Z positions)
   */
  update(time, planets) {
    const pulse = 1 + 0.03 * Math.sin(time * 1.5);
    const sunDepth = SUN_DEPTH * pulse;
    const sunSigma2 = SUN_WIDTH * SUN_WIDTH * 2;

    for (let i = 0; i <= GRID_RESOLUTION; i++) {
      for (let j = 0; j <= GRID_RESOLUTION; j++) {
        const v = this.vertices[i][j];

        // Sun well
        const r2 = v.x * v.x + v.z * v.z;
        let y = sunDepth * Math.exp(-r2 / sunSigma2);

        // Planet wells — each planet creates a smaller well at its position
        if (planets) {
          for (let p = 0; p < planets.length; p++) {
            const body = planets[p];
            const dx = v.x - body.worldX;
            const dz = v.z - body.worldZ;
            const dr2 = dx * dx + dz * dz;
            // Scale well size by display radius (bigger planet = bigger well)
            const pRadius = body.data.display.radius;
            const pDepth = PLANET_DEPTH_SCALE * (pRadius / 0.007); // normalized to Earth
            const pWidth = PLANET_WIDTH_SCALE * (pRadius / 0.007);
            const pSigma2 = pWidth * pWidth * 2;
            y += pDepth * Math.exp(-dr2 / pSigma2);
          }
        }

        v.y = y;
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
    const projected = this.vertices.map(row =>
      row.map(v => {
        const proj = camera.project(v.x, v.y, v.z);
        return {
          x: centerX + proj.x * zoom,
          y: centerY + proj.y * zoom,
        };
      })
    );

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.4;

    for (let i = 0; i <= GRID_RESOLUTION; i++) {
      ctx.beginPath();
      for (let j = 0; j <= GRID_RESOLUTION; j++) {
        const p = projected[i][j];
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let j = 0; j <= GRID_RESOLUTION; j++) {
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

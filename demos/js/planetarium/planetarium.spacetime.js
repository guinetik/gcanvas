/**
 * Planetarium — Spacetime curvature grid.
 *
 * Renders a 3D grid that warps around the Sun and planets, showing how
 * mass curves spacetime (the "rubber sheet" analogy).
 *
 * Grid segments are colored by curvature intensity — more deformation = brighter.
 * From a top-down view this creates visible circles of color around each mass.
 *
 * @module planetarium/spacetime
 */

import { Painter } from "../../../src/index.js";

const GRID_SIZE = 1300;
const GRID_RESOLUTION = 100;

// Base grid color (flat regions)
const BASE_R = 0, BASE_G = 100, BASE_B = 200;
const BASE_ALPHA = 0.3;
// Curvature color (deformed regions)
const CURVE_R = 80, CURVE_G = 200, CURVE_B = 255;
const MAX_CURVE_ALPHA = 0.55;

// Sun well parameters — tight width so it doesn't bleed into planet orbits
const SUN_DEPTH = 70;
const SUN_WIDTH = 35;

// Planet well parameters (exaggerated so they're visible)
const PLANET_DEPTH_SCALE = 25;
const PLANET_WIDTH_SCALE = 20;

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

        // Planet wells
        if (planets) {
          for (let p = 0; p < planets.length; p++) {
            const body = planets[p];
            const dx = v.x - body.worldX;
            const dz = v.z - body.worldZ;
            const dr2 = dx * dx + dz * dz;
            const pRadius = body.data.display.radius;
            const pDepth = PLANET_DEPTH_SCALE * (pRadius / 0.007);
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
   * Get curvature intensity at a vertex (0 = flat, 1 = max deformation).
   * Normalized against sun depth as the maximum expected value.
   */
  _curvature(v) {
    return Math.min(1, v.y / SUN_DEPTH);
  }

  /**
   * Get color string for a curvature value.
   * Flat = dim base blue, curved = bright cyan.
   */
  _curveColor(t) {
    const r = BASE_R + (CURVE_R - BASE_R) * t;
    const g = BASE_G + (CURVE_G - BASE_G) * t;
    const b = BASE_B + (CURVE_B - BASE_B) * t;
    const a = BASE_ALPHA + (MAX_CURVE_ALPHA - BASE_ALPHA) * t;
    return `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
  }

  /**
   * Render the curved grid with curvature-based coloring.
   * Each segment is colored by the average curvature of its two endpoints.
   */
  draw(ctx, camera, centerX, centerY, zoom) {
    // Project all vertices and compute curvature
    const N = GRID_RESOLUTION;
    const proj = new Array(N + 1);
    const curv = new Array(N + 1);

    for (let i = 0; i <= N; i++) {
      proj[i] = new Array(N + 1);
      curv[i] = new Array(N + 1);
      for (let j = 0; j <= N; j++) {
        const v = this.vertices[i][j];
        const p = camera.project(v.x, v.y, v.z);
        proj[i][j] = {
          x: centerX + p.x * zoom,
          y: centerY + p.y * zoom,
        };
        curv[i][j] = this._curvature(v);
      }
    }

    ctx.lineWidth = 0.4;

    // Draw lines along X — segment by segment for per-segment color
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j < N; j++) {
        const t = (curv[i][j] + curv[i][j + 1]) * 0.5;
        ctx.strokeStyle = this._curveColor(t);
        ctx.beginPath();
        ctx.moveTo(proj[i][j].x, proj[i][j].y);
        ctx.lineTo(proj[i][j + 1].x, proj[i][j + 1].y);
        ctx.stroke();
      }
    }

    // Draw lines along Z — segment by segment
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i < N; i++) {
        const t = (curv[i][j] + curv[i + 1][j]) * 0.5;
        ctx.strokeStyle = this._curveColor(t);
        ctx.beginPath();
        ctx.moveTo(proj[i][j].x, proj[i][j].y);
        ctx.lineTo(proj[i + 1][j].x, proj[i + 1][j].y);
        ctx.stroke();
      }
    }
  }
}

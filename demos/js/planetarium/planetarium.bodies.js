/**
 * Planetarium — CelestialBody.
 *
 * Wraps a Sphere3D with Keplerian orbital state and orbit path rendering.
 * Each body computes its own 3D position from orbital elements via kepler.js,
 * projects through a Camera3D, and draws itself + its orbit path.
 *
 * @module planetarium/bodies
 */

import { Sphere3D, Painter } from "../../../src/index.js";
import { orbitalPosition3D, orbitPathPoints } from "../../../src/math/kepler.js";
import { CONFIG } from "./planetarium.config.js";

export class CelestialBody {
  /**
   * @param {Object} data - Body definition from planetarium.data.js
   * @param {Object} camera - Camera3D instance
   * @param {number} minDim - Min screen dimension for radius scaling
   * @param {CelestialBody} [parent=null] - Parent body (for moons)
   */
  constructor(data, camera, minDim, parent = null) {
    this.name = data.name;
    this.data = data;
    this.parent = parent;
    this.camera = camera;

    // Sphere3D rendering
    const radius = data.display.radius * minDim;
    const sphereOpts = { camera };
    if (data.display.shaderType) {
      sphereOpts.useShader = true;
      sphereOpts.shaderType = data.display.shaderType;
      sphereOpts.shaderUniforms = { ...data.display.shaderUniforms };
    }
    this.sphere = new Sphere3D(radius, sphereOpts);
    this.displayRadius = radius;

    // 3D world position
    this.worldX = 0;
    this.worldY = 0;
    this.worldZ = 0;

    // Projected screen position (set each frame)
    this.screenX = 0;
    this.screenY = 0;
    this.depth = 0;
    this.scale = 1;

    // Orbit path cache (recomputed on resize, not per frame)
    this.orbitPathCache = null;
    if (data.orbit) {
      this.orbitPathCache = orbitPathPoints(data.orbit, CONFIG.display.orbitPathSegments);
    }

    // Ring data (Saturn)
    this.ring = data.display.ring || null;

    // Randomize starting epoch so planets don't all start aligned
    if (data.orbit) {
      data.orbit.epoch = -Math.random() * data.orbit.period;
    }
  }

  /**
   * Update world position from orbital mechanics.
   * @param {number} simTime - Simulation time in days
   */
  update(simTime) {
    if (!this.data.orbit) return; // Sun stays at origin

    const pos = orbitalPosition3D(this.data.orbit, simTime);
    if (this.parent) {
      this.worldX = this.parent.worldX + pos.x;
      this.worldY = this.parent.worldY + pos.y;
      this.worldZ = this.parent.worldZ + pos.z;
    } else {
      this.worldX = pos.x;
      this.worldY = pos.y;
      this.worldZ = pos.z;
    }
  }

  /**
   * Project world position through camera.
   * @param {number} centerX - Screen center X
   * @param {number} centerY - Screen center Y
   * @param {number} zoom - Current zoom level
   */
  project(centerX, centerY, zoom) {
    const proj = this.camera.project(this.worldX, this.worldY, this.worldZ);
    this.screenX = centerX + proj.x * zoom;
    this.screenY = centerY + proj.y * zoom;
    this.depth = proj.z;
    this.scale = proj.scale * zoom;
  }

  /**
   * Draw the sphere at its projected position.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.scale <= 0) return; // behind camera

    // Use a damped scale — keep depth ordering but prevent size blowup.
    // sqrt brings the scale closer to 1.0 while preserving relative depth.
    const drawScale = Math.sqrt(this.scale);

    ctx.save();
    ctx.translate(this.screenX, this.screenY);
    ctx.scale(drawScale, drawScale);
    this.sphere.draw();
    ctx.restore();

    // Saturn ring
    if (this.ring) {
      this.drawRing(ctx);
    }
  }

  /**
   * Draw Saturn-style ring as a projected 3D ellipse.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawRing(ctx) {
    const ringRadius = this.displayRadius * this.ring.outerRadius * this.scale;
    const innerRadius = this.displayRadius * this.ring.innerRadius * this.scale;
    const tiltFactor = Math.abs(Math.cos(this.ring.tilt + this.camera.rotationX));

    ctx.save();
    ctx.translate(this.screenX, this.screenY);
    ctx.globalAlpha = 0.25;

    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius, ringRadius * tiltFactor, 0, 0, Math.PI * 2);
    ctx.strokeStyle = this.ring.color;
    ctx.lineWidth = Math.max(1, (ringRadius - innerRadius) * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw the orbit path as projected 3D line segments.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} centerX - Screen center X
   * @param {number} centerY - Screen center Y
   * @param {number} zoom - Current zoom level
   */
  drawOrbitPath(ctx, centerX, centerY, zoom) {
    if (!this.orbitPathCache) return;

    const points = this.orbitPathCache;
    const isMoon = this.parent != null;
    const color = isMoon ? CONFIG.display.moonOrbitPathColor : CONFIG.display.orbitPathColor;
    const lineWidth = isMoon ? CONFIG.display.moonOrbitPathLineWidth : CONFIG.display.orbitPathLineWidth;

    const offsetX = isMoon ? this.parent.worldX : 0;
    const offsetY = isMoon ? this.parent.worldY : 0;
    const offsetZ = isMoon ? this.parent.worldZ : 0;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const proj = this.camera.project(
        p.x + offsetX,
        p.y + offsetY,
        p.z + offsetZ
      );
      const sx = centerX + proj.x * zoom;
      const sy = centerY + proj.y * zoom;

      if (!started) {
        ctx.moveTo(sx, sy);
        started = true;
      } else {
        ctx.lineTo(sx, sy);
      }
    }

    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Update display radius after screen resize.
   * @param {number} minDim - New min screen dimension
   */
  resize(minDim) {
    this.displayRadius = this.data.display.radius * minDim;
    this.sphere.radius = this.displayRadius;
    this.sphere._generateGeometry();
  }
}

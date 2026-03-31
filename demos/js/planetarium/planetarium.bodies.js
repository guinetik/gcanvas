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

/**
 * Swap Kepler XY-plane output to Camera3D XZ-plane (Y=up).
 * Kepler: orbits in XY, Z = inclination out-of-plane
 * Camera3D: Y is up, XZ is the ground plane
 */
function keplerToWorld(pos) {
  return { x: pos.x, y: pos.z, z: pos.y };
}

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

    // 3D world position (camera space: X=right, Y=up, Z=into screen)
    this.worldX = 0;
    this.worldY = 0;
    this.worldZ = 0;

    // Projected screen position (set each frame)
    this.screenX = 0;
    this.screenY = 0;
    this.depth = 0;
    this.scale = 1;

    // Orbit path cache — pre-convert to world coords
    this.orbitPathCache = null;
    if (data.orbit) {
      const keplerPoints = orbitPathPoints(data.orbit, CONFIG.display.orbitPathSegments);
      this.orbitPathCache = keplerPoints.map(keplerToWorld);
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
   * @param {boolean} grEnabled - Apply GR precession to argument of periapsis
   */
  update(simTime) {
    if (!this.data.orbit) return; // Sun stays at origin

    const pos = keplerToWorld(orbitalPosition3D(this.data.orbit, simTime));
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
    // Store for ring/label drawing
    this._centerX = centerX;
    this._centerY = centerY;
    this._zoom = zoom;
  }

  /**
   * Draw the sphere at its projected position.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.scale <= 0) return; // behind camera

    ctx.save();
    ctx.translate(this.screenX, this.screenY);
    ctx.scale(this.scale, this.scale);
    this.sphere.draw();
    ctx.restore();

    // Saturn ring — drawn as projected 3D ellipse
    if (this.ring) {
      this.drawRing(ctx);
    }
  }

  /**
   * Draw Saturn-style ring as a filled band projected through camera.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawRing(ctx) {
    const segments = 64;
    const outerR = this.ring.outerRadius * this.displayRadius;
    const innerR = this.ring.innerRadius * this.displayRadius;
    const tilt = this.ring.tilt;
    const zoom = this._zoom;
    const cx = this._centerX;
    const cy = this._centerY;

    // Project ring point at given radius and angle
    const projectRingPoint = (radius, angle) => {
      const lx = Math.cos(angle) * radius;
      const ly = Math.sin(angle) * radius * Math.sin(tilt);
      const lz = Math.sin(angle) * radius * Math.cos(tilt);
      const proj = this.camera.project(
        this.worldX + lx,
        this.worldY + ly,
        this.worldZ + lz
      );
      return { x: cx + proj.x * zoom, y: cy + proj.y * zoom };
    };

    ctx.save();
    ctx.fillStyle = this.ring.color;
    ctx.beginPath();

    // Outer edge forward
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const p = projectRingPoint(outerR, angle);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }

    // Inner edge backward (creates a ring shape)
    for (let i = segments; i >= 0; i--) {
      const angle = (i / segments) * Math.PI * 2;
      const p = projectRingPoint(innerR, angle);
      ctx.lineTo(p.x, p.y);
    }

    ctx.closePath();
    ctx.fill();
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

    // For moons, offset to parent's current world position
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

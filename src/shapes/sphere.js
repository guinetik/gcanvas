import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Sphere - A 3D-looking isometric sphere with rotation support.
 *
 * Supports:
 * - Customizable colors with gradient options
 * - Full bounding box
 * - Rotation around X, Y, and Z axes
 * - Adjustable segment count for smoother appearance
 *
 * Note: This is a 2.5D visual illusion — not actual 3D rendering.
 */
export class Sphere extends Shape {
  /**
   * Create a sphere
   * @param {number} x - X position (center of the sphere)
   * @param {number} y - Y position (center of the sphere)
   * @param {number} radius - Radius of the sphere
   * @param {object} options - Customization options
   * @param {string} [options.color] - Main color of the sphere
   * @param {string} [options.highlightColor] - Optional highlight color for lighting effect
   * @param {number} [options.hSegments] - Number of horizontal segments
   * @param {number} [options.vSegments] - Number of vertical segments
   * @param {boolean} [options.wireframe] - Whether to render as wireframe
   * @param {string} [options.stroke] - Color of wireframe or outline
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(radius = 50, options = {}) {
    super(options);
    this.radius = radius;

    // Number of segments used to approximate the sphere
    this.hSegments = options.hSegments || 16; // Horizontal segments (longitude)
    this.vSegments = options.vSegments || 12; // Vertical segments (latitude)

    // Colors
    this.color = options.color || "#6495ED";
    this.highlightColor = options.highlightColor || "#FFFFFF"; // For gradient effect
    this.wireframe = options.wireframe || false;
    this.stroke = options.stroke || "#333333";
    this.lineWidth = options.lineWidth || 1;

    // Rotation angles (in radians)
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;
  }

  /**
   * Set rotation angles
   * @param {number} x - Rotation around X axis in radians
   * @param {number} y - Rotation around Y axis in radians
   * @param {number} z - Rotation around Z axis in radians
   */
  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this; // Enable method chaining
  }

  /**
   * Rotate the sphere incrementally
   * @param {number} x - Increment for X rotation in radians
   * @param {number} y - Increment for Y rotation in radians
   * @param {number} z - Increment for Z rotation in radians
   */
  rotate(x, y, z) {
    this.rotationX += x;
    this.rotationY += y;
    this.rotationZ += z;
    return this; // Enable method chaining
  }

  /**
   * Calculate color based on surface normal direction for lighting effect
   * @param {number} x - Normal x component
   * @param {number} y - Normal y component
   * @param {number} z - Normal z component
   * @returns {string} - Color in hex or rgba format
   */
  calculateSurfaceColor(x, y, z) {
    // Simple lighting model
    // Light source is at (1, 1, 1) normalized
    const lightDir = {
      x: 1 / Math.sqrt(3),
      y: 1 / Math.sqrt(3),
      z: 1 / Math.sqrt(3),
    };

    // Dot product between normal and light direction gives lighting intensity
    let intensity = x * lightDir.x + y * lightDir.y + z * lightDir.z;
    intensity = Math.max(0.3, intensity); // Ambient light level

    // If we have a highlight color, blend based on intensity
    if (this.highlightColor) {
      // Simple hex color blending based on intensity
      const baseColor = this.hexToRgb(this.color);
      const highlightColor = this.hexToRgb(this.highlightColor);

      // Blend colors
      const r = Math.round(
        baseColor.r * (1 - intensity) + highlightColor.r * intensity
      );
      const g = Math.round(
        baseColor.g * (1 - intensity) + highlightColor.g * intensity
      );
      const b = Math.round(
        baseColor.b * (1 - intensity) + highlightColor.b * intensity
      );

      return `rgb(${r}, ${g}, ${b})`;
    }

    // Simple intensity adjustment of base color
    const baseColor = this.hexToRgb(this.color);
    const r = Math.min(255, Math.round(baseColor.r * intensity));
    const g = Math.min(255, Math.round(baseColor.g * intensity));
    const b = Math.min(255, Math.round(baseColor.b * intensity));

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Helper to convert hex color to RGB
   * @param {string} hex - Color in hex format
   * @returns {object} - RGB components
   */
  hexToRgb(hex) {
    // Default fallback color
    const defaultColor = { r: 100, g: 100, b: 255 };

    // Handle non-hex inputs
    if (!hex || typeof hex !== "string") return defaultColor;

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(
      shorthandRegex,
      (m, r, g, b) => r + r + g + g + b + b
    );

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : defaultColor;
  }

  /**
   * Internal draw logic
   */
  draw() {
    super.draw();
    const r = this.radius;
    /**
     * Apply 3D rotation to a point
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {{x: number, y: number, z: number}}
     */
    const rotate3D = (x, y, z) => {
      // Apply X-axis rotation
      let y1 = y;
      let z1 = z;
      y = y1 * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
      z = y1 * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);

      // Apply Y-axis rotation
      let x1 = x;
      z1 = z;
      x = x1 * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
      z = -x1 * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);

      // Apply Z-axis rotation
      x1 = x;
      y1 = y;
      x = x1 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
      y = x1 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);

      return { x, y, z };
    };

    /**
     * Isometric projection of 3D point
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {{x: number, y: number, z: number}}
     */
    const iso = (x, y, z) => {
      // Apply rotations first
      const rotated = rotate3D(x, y, z);

      // Then apply isometric projection
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return {
        x: isoX,
        y: isoY,
        z: rotated.z,
        nx: rotated.x / r, // Normalized x for normal vector
        ny: rotated.y / r, // Normalized y for normal vector
        nz: rotated.z / r, // Normalized z for normal vector
      };
    };

    // Generate sphere points
    const spherePoints = [];

    // Generate grid of points on the sphere
    for (let vi = 0; vi <= this.vSegments; vi++) {
      const row = [];
      const v = vi / this.vSegments;
      const phi = Math.PI * v - Math.PI / 2; // Vertical angle (-PI/2 to PI/2)

      for (let hi = 0; hi <= this.hSegments; hi++) {
        const u = hi / this.hSegments;
        const theta = 2 * Math.PI * u; // Horizontal angle (0 to 2*PI)

        // Convert spherical coordinates to Cartesian
        const x = r * Math.cos(phi) * Math.cos(theta);
        const y = r * Math.cos(phi) * Math.sin(theta);
        const z = r * Math.sin(phi);

        // Add projected point to row
        row.push(iso(x, y, z));
      }

      spherePoints.push(row);
    }

    // Create faces from point grid
    const faces = [];

    for (let vi = 0; vi < this.vSegments; vi++) {
      for (let hi = 0; hi < this.hSegments; hi++) {
        // Get the four corners of this grid cell
        const p00 = spherePoints[vi][hi];
        const p10 = spherePoints[vi][hi + 1];
        const p01 = spherePoints[vi + 1][hi];
        const p11 = spherePoints[vi + 1][hi + 1];

        // Calculate average Z value for depth sorting
        const avgZ = (p00.z + p10.z + p01.z + p11.z) / 4;

        // Calculate average normal for color computation
        const avgNx = (p00.nx + p10.nx + p01.nx + p11.nx) / 4;
        const avgNy = (p00.ny + p10.ny + p01.ny + p11.ny) / 4;
        const avgNz = (p00.nz + p10.nz + p01.nz + p11.nz) / 4;

        faces.push({
          points: [p00, p10, p11, p01],
          z: avgZ,
          color: this.calculateSurfaceColor(avgNx, avgNy, avgNz),
        });
      }
    }
    // Sort faces by depth (back to front)
    faces.sort((a, b) => b.z - a.z);
    // Draw faces in depth order
    if (this.wireframe) {
      // Draw as wireframe
      for (const face of faces) {
        const pts = face.points;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          Painter.lines.line(
            pts[i].x,
            pts[i].y,
            pts[j].x,
            pts[j].y,
            this.stroke,
            this.lineWidth
          );
        }
      }
    }
    for (const face of faces) {
      Painter.shapes.polygon(
        face.points,
        face.color,
        this.stroke,
        this.lineWidth
      );
    }
  }

  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    // For a sphere, the bounding box is straightforward
    const projectionFactor = 1.5; // Approximation for isometric projection
    const diameter = this.radius * 2 * projectionFactor;

    return {
      x: this.x - diameter / 2,
      y: this.y - diameter / 2,
      width: diameter,
      height: diameter,
    };
  }
}

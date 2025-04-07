import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";

/**
 * Cone - A 3D-looking isometric cone with rotation support.
 *
 * Supports:
 * - Bottom circular face and side triangular segments
 * - Full bounding box
 * - Face visibility control
 * - Rotation around X, Y, and Z axes
 * - Adjustable segment count for smoother curves
 *
 * Note: This is a 2.5D visual illusion — not actual 3D rendering.
 */
export class Cone extends Shape {
  /**
   * Create a cone
   * @param {number} x - X position (center of the cone)
   * @param {number} y - Y position (center of the cone)
   * @param {number} radius - Radius of the cone base
   * @param {number} height - Height of the cone
   * @param {object} options - Customization options
   * @param {string} [options.bottomColor] - Color of the bottom face
   * @param {string} [options.sideColor] - Color of the side face(s)
   * @param {number} [options.segments] - Number of segments to approximate the curved surface
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.strokeColor] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(x, y, radius = 50, height = 100, options = {}) {
    super(x, y, options);
    this.radius = radius;
    this.height = height;

    // Number of segments used to approximate the circle
    this.segments = options.segments || 24;

    // Colors for each face
    this.bottomColor = options.bottomColor || "#eee";
    this.sideColor = options.sideColor || "#aaa";

    this.strokeColor = options.strokeColor || null;
    this.lineWidth = options.lineWidth || 1;

    // Rotation angles (in radians)
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;

    /** @type {Array<'bottom'|'side'>} */
    this.visibleFaces = options.visibleFaces || ["bottom", "side"];
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
   * Rotate the cone incrementally
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
   * Internal draw logic
   */
  draw() {
    this.applyConstraints();

    const r = this.radius;
    const h = this.height; // Height from base to apex
    const hh = h / 2; // Half height for positioning

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
      return { x: isoX, y: isoY, z: rotated.z }; // Include z for depth sorting
    };

    // Apex of the cone (top point)
    const apex = iso(0, 0, hh);

    // Generate points for the base circle
    const basePoints = [];

    // Calculate segment angle
    const angleStep = (Math.PI * 2) / this.segments;

    // Generate base circle points
    for (let i = 0; i < this.segments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      // Project 3D points to 2D
      basePoints.push(iso(x, y, -hh)); // Base circle at -halfHeight
    }

    // Create side faces (triangles from apex to base)
    const sideFaces = [];
    for (let i = 0; i < this.segments; i++) {
      const nextIdx = (i + 1) % this.segments;

      // Each side face is a triangle: apex, current base point, next base point
      sideFaces.push({
        points: [apex, basePoints[i], basePoints[nextIdx]],
        // Calculate depth as average Z-value of the three points
        z: (apex.z + basePoints[i].z + basePoints[nextIdx].z) / 3,
      });
    }

    // Prepare faces for depth sorting
    const facesWithDepth = [];

    // Add bottom face if visible
    if (this.visibleFaces.includes("bottom")) {
      facesWithDepth.push({
        type: "bottom",
        points: [...basePoints].reverse(), // Reverse for correct winding
        z: -hh, // Z-value of the base
      });
    }

    // Add side faces if visible
    if (this.visibleFaces.includes("side")) {
      facesWithDepth.push(
        ...sideFaces.map((face) => ({
          type: "side",
          points: face.points,
          z: face.z,
        }))
      );
    }

    // Sort faces by depth (back to front)
    facesWithDepth.sort((a, b) => b.z - a.z);

    // Draw faces in depth order
    this.renderWithTransform(() => {
      for (const face of facesWithDepth) {
        const color =
          face.type === "bottom" ? this.bottomColor : this.sideColor;
        Painter.polygon(face.points, color, this.strokeColor, this.lineWidth);
      }
    });
  }

  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    // Calculate actual bounds based on isometric projection
    const projectionFactor = 1.5; // Approximation for isometric projection
    const maxDimension = Math.max(this.radius * 2, this.height);
    const adjustedSize = maxDimension * projectionFactor;

    return {
      x: this.x - adjustedSize / 2,
      y: this.y - adjustedSize / 2,
      width: adjustedSize,
      height: adjustedSize,
    };
  }
}

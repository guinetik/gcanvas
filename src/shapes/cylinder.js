import { Shape } from "/gcanvas/src/shapes/shape.js";
import { Painter } from "/gcanvas/src/painter.js";

/**
 * Cylinder - A 3D-looking isometric cylinder with rotation support.
 *
 * Supports:
 * - Top, bottom and side faces with individual colors
 * - Full bounding box
 * - Face visibility control
 * - Rotation around X, Y, and Z axes
 * - Adjustable segment count for smoother curves
 *
 * Note: This is a 2.5D visual illusion — not actual 3D rendering.
 */
export class Cylinder extends Shape {
  /**
   * Create a cylinder
   * @param {number} x - X position (center of the cylinder)
   * @param {number} y - Y position (center of the cylinder)
   * @param {number} radius - Radius of the cylinder
   * @param {number} height - Height of the cylinder
   * @param {object} options - Customization options
   * @param {string} [options.topColor] - Color of the top face
   * @param {string} [options.bottomColor] - Color of the bottom face
   * @param {string} [options.sideColor] - Color of the side face
   * @param {number} [options.segments] - Number of segments to approximate the curved surface
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.strokeColor] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(x, y, radius = 40, height = 80, options = {}) {
    super(x, y, options);
    this.radius = radius;
    this.height = height;

    // Number of segments used to approximate the circle
    this.segments = options.segments || 24;

    // Colors for each face
    this.topColor = options.topColor || "#FF00FF";
    this.bottomColor = options.bottomColor || "#FF0FFF";
    this.sideColor = options.sideColor || "#00FF00";

    this.strokeColor = options.strokeColor || "#000000";
    this.lineWidth = options.lineWidth || 1;

    // Rotation angles (in radians)
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;

    /** @type {Array<'top'|'bottom'|'side'>} */
    this.visibleFaces = options.visibleFaces || ["top", "bottom", "side"];
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
   * Rotate the cylinder incrementally
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
    const h = this.height / 2; // Half height for positioning

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

    // Generate points for top and bottom circles
    const topPoints = [];
    const bottomPoints = [];

    // Calculate segment angle
    const angleStep = (Math.PI * 2) / this.segments;

    // Generate circle points
    for (let i = 0; i < this.segments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      // Project 3D points to 2D
      topPoints.push(iso(x, y, h));
      bottomPoints.push(iso(x, y, -h));
    }

    // Create side faces (quads between top and bottom points)
    const sideFaces = [];
    for (let i = 0; i < this.segments; i++) {
      const nextIdx = (i + 1) % this.segments;
      sideFaces.push({
        points: [
          bottomPoints[i],
          bottomPoints[nextIdx],
          topPoints[nextIdx],
          topPoints[i],
        ],
        // Each segment gets its own depth for proper sorting
        z:
          (topPoints[i].z +
            topPoints[nextIdx].z +
            bottomPoints[i].z +
            bottomPoints[nextIdx].z) /
          4,
      });
    }

    // Prepare faces for depth sorting
    const facesWithDepth = [];

    // Add top face if visible
    if (this.visibleFaces.includes("top")) {
      facesWithDepth.push({
        type: "top",
        points: topPoints,
        z: h, // Average Z of top face
      });
    }

    // Add bottom face if visible
    if (this.visibleFaces.includes("bottom")) {
      facesWithDepth.push({
        type: "bottom",
        points: [...bottomPoints].reverse(), // Reverse for correct winding
        z: -h, // Average Z of bottom face
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
        let color;

        switch (face.type) {
          case "top":
            color = this.topColor;
            break;
          case "bottom":
            color = this.bottomColor;
            break;
          case "side":
            color = this.sideColor;
            break;
        }

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

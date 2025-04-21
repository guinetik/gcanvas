import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Cube - A 3D-looking isometric cube built from 6 square faces with rotation support.
 *
 * Supports:
 * - Individual face colors
 * - Full bounding box
 * - Face visibility control (top, bottom, left, right, front, back)
 * - Rotation around X, Y, and Z axes
 *
 * Note: This is a 2.5D visual illusion — not actual 3D rendering.
 */
export class Cube extends Shape {
  /**
   * Create a cube
   * @param {number} x - X position (center of the cube)
   * @param {number} y - Y position (center of the cube)
   * @param {number} size - Size of the cube (edge length)
   * @param {object} options - Customization options
   * @param {string} [options.faceTopColor] - Color of the top face
   * @param {string} [options.faceBottomColor] - Color of the bottom face
   * @param {string} [options.faceLeftColor] - Color of the left face
   * @param {string} [options.faceRightColor] - Color of the right face
   * @param {string} [options.faceFrontColor] - Color of the front face
   * @param {string} [options.faceBackColor] - Color of the back face
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.strokeColor] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(size = 50, options = {}) {
    super(options);
    this.size = size;

    this.faceTopColor = options.faceTopColor || "#eee";
    this.faceBottomColor = options.faceBottomColor || "#ccc";
    this.faceLeftColor = options.faceLeftColor || "#aaa";
    this.faceRightColor = options.faceRightColor || "#888";
    this.faceFrontColor = options.faceFrontColor || "#666";
    this.faceBackColor = options.faceBackColor || "#444";

    this.strokeColor = options.strokeColor || null;
    this.lineWidth = options.lineWidth || 1;

    // Rotation angles (in radians)
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;

    /** @type {Array<'top'|'bottom'|'left'|'right'|'front'|'back'>} */
    this.visibleFaces = options.visibleFaces || [
      "top",
      "left",
      "right",
      "front",
      "back",
      "bottom",
    ];
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
   * Rotate the cube incrementally
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
    super.draw();
    const s = this.size;
    // Half size for positioning around center point
    const hs = s / 2;

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
     * @returns {{x: number, y: number}}
     */
    const iso = (x, y, z) => {
      // Apply rotations first
      const rotated = rotate3D(x, y, z);

      // Then apply isometric projection
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return { x: isoX, y: isoY };
    };

    // 8 corners of the cube, centered on the origin
    const p = {
      p0: iso(-hs, -hs, -hs), // bottom front left
      p1: iso(hs, -hs, -hs), // bottom front right
      p2: iso(hs, hs, -hs), // bottom back right
      p3: iso(-hs, hs, -hs), // bottom back left
      p4: iso(-hs, -hs, hs), // top front left
      p5: iso(hs, -hs, hs), // top front right
      p6: iso(hs, hs, hs), // top back right
      p7: iso(-hs, hs, hs), // top back left
    };

    // Faces mapped to corner points
    const faces = {
      top: {
        points: [p.p4, p.p5, p.p6, p.p7],
        color: this.faceTopColor,
        normal: [0, 0, 1],
      },
      bottom: {
        points: [p.p0, p.p1, p.p2, p.p3],
        color: this.faceBottomColor,
        normal: [0, 0, -1],
      },
      left: {
        points: [p.p0, p.p4, p.p7, p.p3],
        color: this.faceLeftColor,
        normal: [-1, 0, 0],
      },
      right: {
        points: [p.p1, p.p5, p.p6, p.p2],
        color: this.faceRightColor,
        normal: [1, 0, 0],
      },
      front: {
        points: [p.p0, p.p1, p.p5, p.p4],
        color: this.faceFrontColor,
        normal: [0, -1, 0],
      },
      back: {
        points: [p.p3, p.p2, p.p6, p.p7],
        color: this.faceBackColor,
        normal: [0, 1, 0],
      },
    };

    // Calculate visibility based on face normals after rotation
    const visibleFacesWithDepth = this.visibleFaces
      .map((key) => {
        const face = faces[key];
        if (!face) return null;

        // Calculate face center for z-ordering
        const center = face.points.reduce(
          (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
          { x: 0, y: 0 }
        );
        center.x /= face.points.length;
        center.y /= face.points.length;

        // Calculate approximate depth
        // Higher value = farther back
        const depth = center.x * center.x + center.y * center.y;

        return { key, face, depth };
      })
      .filter((item) => item !== null)
      .sort((a, b) => b.depth - a.depth); // Sort by depth (back to front)

    // Draw faces in depth order
    visibleFacesWithDepth.forEach(({ key, face }) => {
      if (face?.color) {
        Painter.shapes.polygon(
          face.points,
          face.color,
          this.strokeColor,
          this.lineWidth
        );
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
    const adjustedSize = this.size * projectionFactor;

    return {
      x: this.x - adjustedSize / 2,
      y: this.y - adjustedSize / 2,
      width: adjustedSize,
      height: adjustedSize,
    };
  }
}

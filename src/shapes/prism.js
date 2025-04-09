import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

/**
 * Prism - A 3D-looking isometric triangular prism with rotation support.
 * 
 * Supports:
 * - Individual face colors
 * - Full bounding box
 * - Face visibility control (top, bottom, left, right, front, back)
 * - Rotation around X, Y, and Z axes
 * 
 * Note: This is a 2.5D visual illusion — not actual 3D rendering.
 */
export class Prism extends Shape {
  /**
   * Create a triangular prism
   * @param {number} x - X position (center of the prism)
   * @param {number} y - Y position (center of the prism)
   * @param {number} width - Width of the prism
   * @param {number} height - Height of the triangular face
   * @param {number} depth - Depth/length of the prism
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
  constructor(x, y, width = 80, height = 60, depth = 100, options = {}) {
    super(x, y, options);
    this.width = width;
    this.height = height;
    this.depth = depth;

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
    this.visibleFaces = options.visibleFaces || ["top", "left", "right", "front", "back", "bottom"];
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
   * Rotate the prism incrementally
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
    const w = this.width / 2;   // Half width for positioning
    const h = this.height / 2;  // Half height for positioning
    const d = this.depth / 2;   // Half depth for positioning

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
      return { x: isoX, y: isoY, z: rotated.z }; // Include z for depth sorting
    };

    // Define vertices for the triangular prism
    const p = {
      // Front triangular face
      p0: iso(-w, -d, -h),  // Front bottom left
      p1: iso(w, -d, -h),   // Front bottom right
      p2: iso(0, -d, h),    // Front top center
      
      // Back triangular face
      p3: iso(-w, d, -h),   // Back bottom left
      p4: iso(w, d, -h),    // Back bottom right
      p5: iso(0, d, h),     // Back top center
    };

    // Faces mapped to corner points
    const faces = {
      // Triangular front and back faces
      front: { points: [p.p0, p.p1, p.p2], color: this.faceFrontColor },
      back:  { points: [p.p3, p.p4, p.p5], color: this.faceBackColor },
      
      // Rectangular side faces
      bottom: { points: [p.p0, p.p1, p.p4, p.p3], color: this.faceBottomColor },
      right:  { points: [p.p1, p.p2, p.p5, p.p4], color: this.faceRightColor },
      left:   { points: [p.p0, p.p2, p.p5, p.p3], color: this.faceLeftColor }
    };

    // Calculate visibility based on depth sorting
    const visibleFacesWithDepth = this.visibleFaces
      .filter(key => faces[key])
      .map(key => {
        const face = faces[key];
        
        // Calculate face center for z-ordering
        const centerX = face.points.reduce((sum, pt) => sum + pt.x, 0) / face.points.length;
        const centerY = face.points.reduce((sum, pt) => sum + pt.y, 0) / face.points.length;
        const centerZ = face.points.reduce((sum, pt) => sum + (pt.z || 0), 0) / face.points.length;
        
        // Calculate approximate depth
        // Higher value = farther back
        const depth = centerX * centerX + centerY * centerY + centerZ * centerZ;
        
        return { key, face, depth };
      })
      .sort((a, b) => b.depth - a.depth); // Sort by depth (back to front)

    // Draw faces in depth order
    this.renderWithTransform(() => {
      visibleFacesWithDepth.forEach(({ key, face }) => {
        if (face?.color) {
          Painter.polygon(face.points, face.color, this.strokeColor, this.lineWidth);
        }
      });
    });
  }

  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    // Calculate actual bounds based on isometric projection
    const projectionFactor = 1.5; // Approximation for isometric projection
    const maxDimension = Math.max(this.width, this.height, this.depth);
    const adjustedSize = maxDimension * projectionFactor;
    
    return {
      x: this.x - adjustedSize/2,
      y: this.y - adjustedSize/2,
      width: adjustedSize,
      height: adjustedSize
    };
  }
}
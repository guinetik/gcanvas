import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Sphere3D - A true 3D sphere that integrates with Camera3D
 *
 * Unlike the 2D Sphere class which uses isometric projection,
 * this sphere works with Scene3D and Camera3D to provide true
 * 3D rotation and perspective projection.
 *
 * Features:
 * - Integrates with Camera3D rotation state
 * - Supports solid colors and gradients
 * - Debug wireframe mode
 * - Depth-sorted face rendering
 * - Surface normal-based lighting
 *
 * @example
 * const sphere = new Sphere3D(50, {
 *   color: Painter.colors.radialGradient(0, 0, 0, 0, 0, 50, [
 *     { offset: 0, color: "#000" },
 *     { offset: 1, color: "#333" }
 *   ]),
 *   camera: this.camera,
 *   debug: true
 * });
 */
export class Sphere3D extends Shape {
    /**
     * Create a 3D sphere
     * @param {number} radius - Sphere radius
     * @param {object} options - Configuration options
     * @param {string|CanvasGradient} [options.color] - Fill color or gradient
     * @param {Camera3D} [options.camera] - Camera for rotation (optional, can be set later)
     * @param {boolean} [options.debug=false] - Show wireframe
     * @param {number} [options.segments=20] - Number of latitude/longitude segments
     * @param {string} [options.stroke] - Wireframe line color
     * @param {number} [options.lineWidth=1] - Wireframe line width
     */
    constructor(radius, options = {}) {
        super(options);

        this.radius = radius;
        this.camera = options.camera ?? null;
        this.debug = options.debug ?? false;
        this.segments = options.segments ?? 20;

        // Generate sphere geometry
        this._generateGeometry();
    }

    /**
     * Set or update the camera reference
     * @param {Camera3D} camera - Camera instance
     */
    setCamera(camera) {
        this.camera = camera;
        return this;
    }

    /**
     * Generate sphere vertices and faces using UV parameterization
     * @private
     */
    _generateGeometry() {
        this.vertices = [];
        this.faces = [];

        const latSegments = this.segments;
        const lonSegments = this.segments * 2;

        // Generate vertices
        for (let lat = 0; lat <= latSegments; lat++) {
            const theta = (lat * Math.PI) / latSegments; // 0 to PI
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= lonSegments; lon++) {
                const phi = (lon * 2 * Math.PI) / lonSegments; // 0 to 2PI
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                // Spherical to Cartesian coordinates
                const x = this.radius * sinTheta * cosPhi;
                const y = this.radius * cosTheta;
                const z = this.radius * sinTheta * sinPhi;

                // Store vertex with its normal (normalized position vector)
                this.vertices.push({
                    x,
                    y,
                    z,
                    nx: sinTheta * cosPhi,
                    ny: cosTheta,
                    nz: sinTheta * sinPhi,
                });
            }
        }

        // Generate faces (quads split into triangles)
        for (let lat = 0; lat < latSegments; lat++) {
            for (let lon = 0; lon < lonSegments; lon++) {
                const first = lat * (lonSegments + 1) + lon;
                const second = first + lonSegments + 1;

                // Two triangles per quad
                this.faces.push([first, second, first + 1]);
                this.faces.push([second, second + 1, first + 1]);
            }
        }
    }

    /**
     * Calculate lighting intensity based on surface normal
     * @param {number} nx - Normal x component
     * @param {number} ny - Normal y component
     * @param {number} nz - Normal z component
     * @returns {number} Intensity 0-1
     * @private
     */
    _calculateLighting(nx, ny, nz) {
        // Simple directional light from top-right-front
        const lightX = 0.5;
        const lightY = 0.7;
        const lightZ = 0.5;
        const lightLen = Math.sqrt(
            lightX * lightX + lightY * lightY + lightZ * lightZ
        );

        // Normalized light direction
        const lx = lightX / lightLen;
        const ly = lightY / lightLen;
        const lz = lightZ / lightLen;

        // Dot product for diffuse lighting
        let intensity = nx * lx + ny * ly + nz * lz;

        // Clamp and add ambient light
        intensity = Math.max(0, intensity) * 0.7 + 0.3;

        return intensity;
    }

    /**
     * Apply lighting to a color
     * @param {string} color - Base color (hex format)
     * @param {number} intensity - Light intensity 0-1
     * @returns {string} RGB color string
     * @private
     */
    _applyLighting(color, intensity) {
        // If it's a gradient or non-hex color, return as-is
        if (!color || typeof color !== "string" || !color.startsWith("#")) {
            return color;
        }

        // Parse hex color
        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Apply intensity
        const lr = Math.round(r * intensity);
        const lg = Math.round(g * intensity);
        const lb = Math.round(b * intensity);

        return `rgb(${lr}, ${lg}, ${lb})`;
    }

    /**
     * Main render method
     */
    draw() {
        super.draw();

        if (!this.camera) {
            // Fallback: draw a simple circle if no camera
            if (this.color) {
                Painter.shapes.fillCircle(0, 0, this.radius, this.color);
            }
            if (this.debug && this.stroke) {
                Painter.shapes.strokeCircle(0, 0, this.radius, this.stroke, this.lineWidth);
            }
            return;
        }

        // Project all vertices and normals through the camera
        const projectedVertices = this.vertices.map((v) => {
            const projected = this.camera.project(v.x, v.y, v.z);

            // Rotate normals using the same rotation sequence as Camera3D.project
            // (Z, then Y, then X)
            let nx = v.nx;
            let ny = v.ny;
            let nz = v.nz;

            // Rotate around Z axis (roll)
            if (this.camera.rotationZ !== 0) {
                const cosZ = Math.cos(this.camera.rotationZ);
                const sinZ = Math.sin(this.camera.rotationZ);
                const nx0 = nx;
                const ny0 = ny;
                nx = nx0 * cosZ - ny0 * sinZ;
                ny = nx0 * sinZ + ny0 * cosZ;
            }

            // Rotate around Y axis (horizontal spin)
            const cosY = Math.cos(this.camera.rotationY);
            const sinY = Math.sin(this.camera.rotationY);
            const nx1 = nx * cosY - nz * sinY;
            const nz1 = nx * sinY + nz * cosY;

            // Rotate around X axis (vertical tilt)
            const cosX = Math.cos(this.camera.rotationX);
            const sinX = Math.sin(this.camera.rotationX);
            const ny1 = ny * cosX - nz1 * sinX;
            const nz2 = ny * sinX + nz1 * cosX;

            return {
                ...projected,
                nx: nx1,
                ny: ny1,
                nz: nz2,
            };
        });

        if (this.debug) {
            this.trace("Sphere3D.draw: projected vertices", projectedVertices.length);
        }

        // Build face list with depth and lighting
        const renderFaces = [];

        for (const face of this.faces) {
            const v0 = projectedVertices[face[0]];
            const v1 = projectedVertices[face[1]];
            const v2 = projectedVertices[face[2]];

            // Skip if any vertex is behind camera
            if (
                v0.z < -this.camera.perspective + 10 ||
                v1.z < -this.camera.perspective + 10 ||
                v2.z < -this.camera.perspective + 10
            ) {
                continue;
            }

            // Calculate average depth for sorting
            const avgZ = (v0.z + v1.z + v2.z) / 3;

            // Calculate average normal for lighting and backface culling
            const avgNx = (v0.nx + v1.nx + v2.nx) / 3;
            const avgNy = (v0.ny + v1.ny + v2.ny) / 3;
            const avgNz = (v0.nz + v1.nz + v2.nz) / 3;

            // Backface culling: skip faces pointing away from camera
            // In camera space after rotations, Z points into the screen (away from user).
            // A face is visible if its view-space normal points towards the user (negative Z).
            // Wait, Camera3D.project uses z2 = y * sinX + z1 * cosX; and scale = perspective / (perspective + z2)
            // If z2 is positive, it's further away.
            // So if normal.z is positive, it's pointing away from the user.
            if (avgNz > 0.1) {
                continue;
            }

            const intensity = this._calculateLighting(avgNx, avgNy, avgNz);

            renderFaces.push({
                vertices: [v0, v1, v2],
                avgZ,
                intensity,
            });
        }

        // Sort back to front
        renderFaces.sort((a, b) => b.avgZ - a.avgZ);

        // Render faces
        for (const face of renderFaces) {
            const points = face.vertices.map((v) => ({ x: v.x, y: v.y }));

            if (this.debug) {
                // Wireframe mode
                Painter.ctx.beginPath();
                Painter.ctx.moveTo(points[0].x, points[0].y);
                Painter.ctx.lineTo(points[1].x, points[1].y);
                Painter.ctx.lineTo(points[2].x, points[2].y);
                Painter.ctx.closePath();

                if (this.stroke) {
                    Painter.ctx.strokeStyle = this.stroke;
                    Painter.ctx.lineWidth = this.lineWidth ?? 1;
                    Painter.ctx.stroke();
                }
            } else {
                // Filled mode with lighting
                if (this.color) {
                    const faceColor = this._applyLighting(this.color, face.intensity);

                    Painter.ctx.beginPath();
                    Painter.ctx.moveTo(points[0].x, points[0].y);
                    Painter.ctx.lineTo(points[1].x, points[1].y);
                    Painter.ctx.lineTo(points[2].x, points[2].y);
                    Painter.ctx.closePath();

                    Painter.ctx.fillStyle = faceColor;
                    Painter.ctx.fill();
                }
            }
        }
    }

    /**
     * Calculate bounding box
     */
    calculateBounds() {
        const size = this.radius * 2;
        return { x: this.x, y: this.y, width: size, height: size };
    }
}

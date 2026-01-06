import { Shape } from "./shape.js";
import { Plane3D } from "./plane3d.js";
import { Painter } from "../painter/painter.js";

/**
 * Cube3D - A 3D cube composed of 6 Plane3D faces
 *
 * This cube integrates with Camera3D for proper 3D projection and rendering.
 * Each face is a Plane3D that can have its own color, texture, or shader.
 *
 * Features:
 * - Composed of 6 Plane3D faces for flexibility
 * - Integrates with Camera3D for rotation and perspective
 * - Self-rotation around any axis
 * - Individual face colors
 * - Automatic depth sorting and backface culling
 *
 * @example
 * // Basic cube with solid colors
 * const cube = new Cube3D(100, {
 *   camera: this.camera,
 *   faceColors: {
 *     front: "#FF0000",
 *     back: "#00FF00",
 *     top: "#FFFFFF",
 *     bottom: "#FFFF00",
 *     left: "#0000FF",
 *     right: "#FFA500",
 *   },
 * });
 */
export class Cube3D extends Shape {
    /**
     * Create a 3D cube
     * @param {number} size - Cube edge length
     * @param {object} options - Configuration options
     * @param {number} [options.x=0] - X position in 3D space
     * @param {number} [options.y=0] - Y position in 3D space
     * @param {number} [options.z=0] - Z position in 3D space
     * @param {Camera3D} [options.camera] - Camera for projection
     * @param {boolean} [options.debug=false] - Show wireframe
     * @param {string} [options.stroke] - Wireframe line color
     * @param {number} [options.lineWidth=1] - Wireframe line width
     * @param {number} [options.selfRotationX=0] - Self-rotation around X axis (radians)
     * @param {number} [options.selfRotationY=0] - Self-rotation around Y axis (radians)
     * @param {number} [options.selfRotationZ=0] - Self-rotation around Z axis (radians)
     * @param {Object} [options.faceColors] - Colors for each face
     * @param {string} [options.faceColors.front="#FF0000"] - Front face color
     * @param {string} [options.faceColors.back="#FFA500"] - Back face color
     * @param {string} [options.faceColors.top="#FFFFFF"] - Top face color
     * @param {string} [options.faceColors.bottom="#FFFF00"] - Bottom face color
     * @param {string} [options.faceColors.left="#00FF00"] - Left face color
     * @param {string} [options.faceColors.right="#0000FF"] - Right face color
     */
    constructor(size, options = {}) {
        super(options);

        this.size = size;

        // 3D position
        this.x = options.x ?? 0;
        this.y = options.y ?? 0;
        this.z = options.z ?? 0;

        // Camera reference
        this.camera = options.camera ?? null;

        // Rendering options
        this.debug = options.debug ?? false;

        // Self-rotation (radians)
        this.selfRotationX = options.selfRotationX ?? 0;
        this.selfRotationY = options.selfRotationY ?? 0;
        this.selfRotationZ = options.selfRotationZ ?? 0;

        // Face colors (default: Rubik's cube colors)
        this.faceColors = {
            front: options.faceColors?.front ?? "#B71234",   // Red
            back: options.faceColors?.back ?? "#FF5800",     // Orange
            top: options.faceColors?.top ?? "#FFFFFF",       // White
            bottom: options.faceColors?.bottom ?? "#FFD500", // Yellow
            left: options.faceColors?.left ?? "#009B48",     // Green
            right: options.faceColors?.right ?? "#0046AD",   // Blue
        };

        // Edge stroke styling
        this.stroke = options.stroke ?? null;
        this.lineWidth = options.lineWidth ?? 1;

        // Sticker mode - renders colored sticker inset from face edge
        this.stickerMode = options.stickerMode ?? false;
        this.stickerMargin = options.stickerMargin ?? 0.15; // Margin as fraction of face size
        this.stickerBackgroundColor = options.stickerBackgroundColor ?? "#0A0A0A"; // Black plastic

        // Face configurations (relative position and orientation)
        // Each face is defined by:
        // - localPos: position relative to cube center
        // - faceRotX, faceRotY: rotation to orient the face correctly
        this._faceConfigs = this._createFaceConfigs();
    }

    /**
     * Create face configuration data
     * Defines the 6 faces with their local positions and orientations
     * @private
     */
    _createFaceConfigs() {
        const hs = this.size / 2;

        return {
            // Front face (z = -hs, facing -Z / towards camera)
            front: {
                localPos: { x: 0, y: 0, z: -hs },
                faceRotX: 0,
                faceRotY: 0,
                color: this.faceColors.front,
            },
            // Back face (z = +hs, facing +Z / away from camera)
            back: {
                localPos: { x: 0, y: 0, z: hs },
                faceRotX: 0,
                faceRotY: Math.PI,
                color: this.faceColors.back,
            },
            // Top face (y = -hs, facing -Y / up)
            top: {
                localPos: { x: 0, y: -hs, z: 0 },
                faceRotX: -Math.PI / 2,
                faceRotY: 0,
                color: this.faceColors.top,
            },
            // Bottom face (y = +hs, facing +Y / down)
            bottom: {
                localPos: { x: 0, y: hs, z: 0 },
                faceRotX: Math.PI / 2,
                faceRotY: 0,
                color: this.faceColors.bottom,
            },
            // Left face (x = -hs, facing -X / left)
            left: {
                localPos: { x: -hs, y: 0, z: 0 },
                faceRotX: 0,
                faceRotY: Math.PI / 2,
                color: this.faceColors.left,
            },
            // Right face (x = +hs, facing +X / right)
            right: {
                localPos: { x: hs, y: 0, z: 0 },
                faceRotX: 0,
                faceRotY: -Math.PI / 2,
                color: this.faceColors.right,
            },
        };
    }

    /**
     * Set or update the camera reference
     * @param {Camera3D} camera - Camera instance
     * @returns {Cube3D} this for chaining
     */
    setCamera(camera) {
        this.camera = camera;
        return this;
    }

    /**
     * Update face colors
     * @param {Object} colors - Color object with face names as keys
     * @returns {Cube3D} this for chaining
     */
    setFaceColors(colors) {
        Object.assign(this.faceColors, colors);
        // Update face configs
        for (const [name, config] of Object.entries(this._faceConfigs)) {
            if (colors[name]) {
                config.color = colors[name];
            }
        }
        return this;
    }

    /**
     * Apply self-rotation to a point
     * @param {number} x - X component
     * @param {number} y - Y component
     * @param {number} z - Z component
     * @returns {{x: number, y: number, z: number}} Rotated point
     * @private
     */
    _applySelfRotation(x, y, z) {
        // Rotate around Y axis first
        if (this.selfRotationY !== 0) {
            const cosY = Math.cos(this.selfRotationY);
            const sinY = Math.sin(this.selfRotationY);
            const x1 = x * cosY - z * sinY;
            const z1 = x * sinY + z * cosY;
            x = x1;
            z = z1;
        }

        // Rotate around X axis
        if (this.selfRotationX !== 0) {
            const cosX = Math.cos(this.selfRotationX);
            const sinX = Math.sin(this.selfRotationX);
            const y1 = y * cosX - z * sinX;
            const z1 = y * sinX + z * cosX;
            y = y1;
            z = z1;
        }

        // Rotate around Z axis
        if (this.selfRotationZ !== 0) {
            const cosZ = Math.cos(this.selfRotationZ);
            const sinZ = Math.sin(this.selfRotationZ);
            const x1 = x * cosZ - y * sinZ;
            const y1 = x * sinZ + y * cosZ;
            x = x1;
            y = y1;
        }

        return { x, y, z };
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

        const lx = lightX / lightLen;
        const ly = lightY / lightLen;
        const lz = lightZ / lightLen;

        let intensity = nx * lx + ny * ly + nz * lz;
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
        if (!color || typeof color !== "string" || !color.startsWith("#")) {
            return color;
        }

        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

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
            // Fallback: draw a simple square if no camera
            const hs = this.size / 2;
            if (this.faceColors.front) {
                Painter.shapes.fillRect(-hs, -hs, this.size, this.size, this.faceColors.front);
            }
            return;
        }

        const ctx = Painter.ctx;
        const hs = this.size / 2;

        // Check if any self-rotation is applied
        const hasSelfRotation =
            this.selfRotationX !== 0 ||
            this.selfRotationY !== 0 ||
            this.selfRotationZ !== 0;

        // Build list of faces with their transformed data
        const facesToRender = [];

        for (const [name, config] of Object.entries(this._faceConfigs)) {
            // Get face local position
            let { x: lx, y: ly, z: lz } = config.localPos;

            // Apply cube's self-rotation to face position
            if (hasSelfRotation) {
                const rotated = this._applySelfRotation(lx, ly, lz);
                lx = rotated.x;
                ly = rotated.y;
                lz = rotated.z;
            }

            // Calculate world position (cube position + rotated face offset)
            const worldX = this.x + lx;
            const worldY = this.y + ly;
            const worldZ = this.z + lz;

            // Calculate face normal (initially pointing outward from face center)
            // Start with the normal pointing in the direction the face is facing
            let nx = 0, ny = 0, nz = 0;
            if (name === "front") { nx = 0; ny = 0; nz = -1; }
            else if (name === "back") { nx = 0; ny = 0; nz = 1; }
            else if (name === "top") { nx = 0; ny = -1; nz = 0; }
            else if (name === "bottom") { nx = 0; ny = 1; nz = 0; }
            else if (name === "left") { nx = -1; ny = 0; nz = 0; }
            else if (name === "right") { nx = 1; ny = 0; nz = 0; }

            // Apply cube's self-rotation to normal
            if (hasSelfRotation) {
                const rotatedN = this._applySelfRotation(nx, ny, nz);
                nx = rotatedN.x;
                ny = rotatedN.y;
                nz = rotatedN.z;
            }

            // Apply camera rotation to normal for view-space culling
            let vnx = nx, vny = ny, vnz = nz;

            // Z axis rotation
            if (this.camera.rotationZ !== 0) {
                const cosZ = Math.cos(this.camera.rotationZ);
                const sinZ = Math.sin(this.camera.rotationZ);
                const nx0 = vnx;
                const ny0 = vny;
                vnx = nx0 * cosZ - ny0 * sinZ;
                vny = nx0 * sinZ + ny0 * cosZ;
            }

            // Y axis rotation
            const cosY = Math.cos(this.camera.rotationY);
            const sinY = Math.sin(this.camera.rotationY);
            const nx1 = vnx * cosY - vnz * sinY;
            const nz1 = vnx * sinY + vnz * cosY;

            // X axis rotation
            const cosX = Math.cos(this.camera.rotationX);
            const sinX = Math.sin(this.camera.rotationX);
            const ny1 = vny * cosX - nz1 * sinX;
            const nz2 = vny * sinX + nz1 * cosX;

            // Backface culling: skip faces pointing away from camera
            if (nz2 > 0.01) {
                continue;
            }

            // Project face center
            const projected = this.camera.project(worldX, worldY, worldZ);

            // Skip if behind camera
            if (projected.z < -this.camera.perspective + 10) {
                continue;
            }

            // Calculate lighting based on rotated normal
            const intensity = this._calculateLighting(nx1, ny1, nz2);

            // Calculate face vertices (quad corners)
            const faceVertices = this._getFaceVertices(name, config, hasSelfRotation);

            facesToRender.push({
                name,
                config,
                projected,
                vertices: faceVertices,
                depth: projected.z,
                intensity,
                nx: nx1,
                ny: ny1,
                nz: nz2,
            });
        }

        // Sort faces by depth (back to front)
        facesToRender.sort((a, b) => b.depth - a.depth);

        // Render each visible face
        for (const face of facesToRender) {
            this._renderFace(ctx, face);
        }
    }

    /**
     * Get the 4 corner vertices of a face in world space
     * @param {string} name - Face name
     * @param {Object} config - Face configuration
     * @param {boolean} hasSelfRotation - Whether self-rotation is applied
     * @returns {Array} Array of 4 projected vertices
     * @private
     */
    _getFaceVertices(name, config, hasSelfRotation) {
        const hs = this.size / 2;

        // Define corner offsets based on face orientation
        let corners;

        switch (name) {
            case "front":
                corners = [
                    { x: -hs, y: -hs, z: -hs },
                    { x: hs, y: -hs, z: -hs },
                    { x: hs, y: hs, z: -hs },
                    { x: -hs, y: hs, z: -hs },
                ];
                break;
            case "back":
                corners = [
                    { x: hs, y: -hs, z: hs },
                    { x: -hs, y: -hs, z: hs },
                    { x: -hs, y: hs, z: hs },
                    { x: hs, y: hs, z: hs },
                ];
                break;
            case "top":
                corners = [
                    { x: -hs, y: -hs, z: hs },
                    { x: hs, y: -hs, z: hs },
                    { x: hs, y: -hs, z: -hs },
                    { x: -hs, y: -hs, z: -hs },
                ];
                break;
            case "bottom":
                corners = [
                    { x: -hs, y: hs, z: -hs },
                    { x: hs, y: hs, z: -hs },
                    { x: hs, y: hs, z: hs },
                    { x: -hs, y: hs, z: hs },
                ];
                break;
            case "left":
                corners = [
                    { x: -hs, y: -hs, z: hs },
                    { x: -hs, y: -hs, z: -hs },
                    { x: -hs, y: hs, z: -hs },
                    { x: -hs, y: hs, z: hs },
                ];
                break;
            case "right":
                corners = [
                    { x: hs, y: -hs, z: -hs },
                    { x: hs, y: -hs, z: hs },
                    { x: hs, y: hs, z: hs },
                    { x: hs, y: hs, z: -hs },
                ];
                break;
        }

        // Apply self-rotation and projection
        return corners.map((corner) => {
            let { x, y, z } = corner;

            if (hasSelfRotation) {
                const rotated = this._applySelfRotation(x, y, z);
                x = rotated.x;
                y = rotated.y;
                z = rotated.z;
            }

            // Add cube position
            x += this.x;
            y += this.y;
            z += this.z;

            // Project through camera
            return this.camera.project(x, y, z);
        });
    }

    /**
     * Render a single face
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} face - Face data
     * @private
     */
    _renderFace(ctx, face) {
        const { vertices, config, intensity } = face;

        // Apply lighting to face color
        const faceColor = this._applyLighting(config.color, intensity);

        // Draw quad as path
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();

        if (this.debug) {
            // Wireframe mode
            ctx.strokeStyle = this.stroke || "#fff";
            ctx.lineWidth = this.lineWidth ?? 1;
            ctx.stroke();
        } else if (this.stickerMode) {
            // Sticker mode: black plastic background with inset colored sticker
            const bgColor = this._applyLighting(this.stickerBackgroundColor, intensity);
            ctx.fillStyle = bgColor;
            ctx.fill();

            // Draw sticker stroke (grid lines on the plastic)
            if (this.stroke) {
                ctx.strokeStyle = this.stroke;
                ctx.lineWidth = this.lineWidth ?? 1;
                ctx.stroke();
            }

            // Calculate inset sticker vertices
            const stickerVerts = this._getInsetVertices(vertices, this.stickerMargin);

            // Draw the colored sticker
            ctx.beginPath();
            ctx.moveTo(stickerVerts[0].x, stickerVerts[0].y);
            for (let i = 1; i < stickerVerts.length; i++) {
                ctx.lineTo(stickerVerts[i].x, stickerVerts[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = faceColor;
            ctx.fill();
        } else {
            // Standard filled mode
            ctx.fillStyle = faceColor;
            ctx.fill();

            // Optional stroke
            if (this.stroke) {
                ctx.strokeStyle = this.stroke;
                ctx.lineWidth = this.lineWidth ?? 1;
                ctx.stroke();
            }
        }
    }

    /**
     * Calculate inset vertices for sticker rendering
     * @param {Array} vertices - Original quad vertices
     * @param {number} margin - Margin as fraction (0-0.5)
     * @returns {Array} Inset vertices
     * @private
     */
    _getInsetVertices(vertices, margin) {
        // Calculate center of the quad
        let cx = 0, cy = 0;
        for (const v of vertices) {
            cx += v.x;
            cy += v.y;
        }
        cx /= vertices.length;
        cy /= vertices.length;

        // Inset each vertex towards the center
        const insetFactor = 1 - margin * 2; // e.g., margin=0.15 -> factor=0.7
        return vertices.map(v => ({
            x: cx + (v.x - cx) * insetFactor,
            y: cy + (v.y - cy) * insetFactor,
        }));
    }

    /**
     * Get the center point in world coordinates
     * @returns {{x: number, y: number, z: number}}
     */
    getCenter() {
        return { x: this.x, y: this.y, z: this.z };
    }

    /**
     * Get bounding box for the cube
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBounds() {
        const hs = this.size / 2;
        return {
            x: this.x - hs,
            y: this.y - hs,
            width: this.size,
            height: this.size,
        };
    }
}

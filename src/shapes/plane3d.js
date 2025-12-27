import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
import { WebGLRenderer } from "../webgl/webgl-renderer.js";
import { PLANE_SHADERS } from "../webgl/shaders/plane-shaders.js";

/**
 * Plane3D - A true 3D plane that integrates with Camera3D
 *
 * A flat rectangular surface in 3D space with proper perspective projection,
 * lighting, and optional WebGL shader effects.
 *
 * Features:
 * - Integrates with Camera3D for rotation and perspective
 * - Self-rotation around any axis
 * - Solid color with lighting
 * - Image texture support
 * - WebGL shader support (gradient, grid, checkerboard)
 * - Double-sided rendering option
 *
 * @example
 * // Basic plane with Canvas 2D rendering
 * const plane = new Plane3D(100, 80, {
 *   color: "#4A90D9",
 *   camera: this.camera,
 * });
 *
 * @example
 * // Plane with WebGL gradient shader
 * const gradientPlane = new Plane3D(100, 80, {
 *   camera: this.camera,
 *   useShader: true,
 *   shaderType: "gradient",
 *   shaderUniforms: {
 *     uColor1: [1.0, 0.2, 0.4],
 *     uColor2: [0.2, 0.4, 1.0],
 *     uAngle: Math.PI / 4,
 *   },
 * });
 */
export class Plane3D extends Shape {
    // Shared WebGL renderer for all shader-enabled planes
    static _glRenderer = null;
    static _glRendererSize = { width: 0, height: 0 };

    /**
     * Get or create shared WebGL renderer
     * @param {number} width - Required width
     * @param {number} height - Required height
     * @returns {WebGLRenderer|null}
     * @private
     */
    static _getGLRenderer(width, height) {
        if (!Plane3D._glRenderer) {
            Plane3D._glRenderer = new WebGLRenderer(width, height);
            Plane3D._glRendererSize = { width, height };
        } else if (
            Plane3D._glRendererSize.width !== width ||
            Plane3D._glRendererSize.height !== height
        ) {
            Plane3D._glRenderer.resize(width, height);
            Plane3D._glRendererSize = { width, height };
        }
        return Plane3D._glRenderer;
    }

    /**
     * Create a 3D plane
     * @param {number} width - Plane width
     * @param {number} height - Plane height
     * @param {object} options - Configuration options
     * @param {number} [options.x=0] - X position in 3D space
     * @param {number} [options.y=0] - Y position in 3D space
     * @param {number} [options.z=0] - Z position in 3D space
     * @param {string} [options.color="#888"] - Fill color (hex format)
     * @param {Camera3D} [options.camera] - Camera for projection
     * @param {boolean} [options.debug=false] - Show wireframe
     * @param {string} [options.stroke] - Wireframe line color
     * @param {number} [options.lineWidth=1] - Wireframe line width
     * @param {boolean} [options.doubleSided=false] - Render both sides
     * @param {HTMLImageElement} [options.texture] - Image texture
     * @param {number} [options.selfRotationX=0] - Self-rotation around X axis (radians)
     * @param {number} [options.selfRotationY=0] - Self-rotation around Y axis (radians)
     * @param {number} [options.selfRotationZ=0] - Self-rotation around Z axis (radians)
     * @param {boolean} [options.useShader=false] - Use WebGL shader rendering
     * @param {string} [options.shaderType='gradient'] - Shader type: 'gradient', 'grid', 'checkerboard'
     * @param {Object} [options.shaderUniforms={}] - Custom shader uniforms
     */
    constructor(width, height, options = {}) {
        super(options);

        this.planeWidth = width;
        this.planeHeight = height;

        // 3D position
        this.x = options.x ?? 0;
        this.y = options.y ?? 0;
        this.z = options.z ?? 0;

        // Camera reference
        this.camera = options.camera ?? null;

        // Rendering options
        this.debug = options.debug ?? false;
        this.doubleSided = options.doubleSided ?? true;  // Default to double-sided for standalone planes
        this.texture = options.texture ?? null;

        // Self-rotation (radians)
        this.selfRotationX = options.selfRotationX ?? 0;
        this.selfRotationY = options.selfRotationY ?? 0;
        this.selfRotationZ = options.selfRotationZ ?? 0;

        // WebGL shader options
        this.useShader = options.useShader ?? false;
        this.shaderType = options.shaderType ?? "gradient";
        this.shaderUniforms = options.shaderUniforms ?? {};
        this._shaderInitialized = false;

        // Generate plane geometry
        this._generateGeometry();
    }

    /**
     * Set or update the camera reference
     * @param {Camera3D} camera - Camera instance
     * @returns {Plane3D} this for chaining
     */
    setCamera(camera) {
        this.camera = camera;
        return this;
    }

    /**
     * Set texture image
     * @param {HTMLImageElement} image - Image element
     * @returns {Plane3D} this for chaining
     */
    setTexture(image) {
        this.texture = image;
        return this;
    }

    /**
     * Update shader uniforms dynamically
     * @param {Object} uniforms - Uniform name -> value pairs
     * @returns {Plane3D} this for chaining
     */
    setShaderUniforms(uniforms) {
        Object.assign(this.shaderUniforms, uniforms);
        return this;
    }

    /**
     * Generate plane geometry (4 vertices, 2 triangular faces)
     * @private
     */
    _generateGeometry() {
        const hw = this.planeWidth / 2;
        const hh = this.planeHeight / 2;

        // 4 vertices with normals and UVs
        // Plane at z=0, facing -Z (towards camera by default)
        this.vertices = [
            { x: -hw, y: -hh, z: 0, nx: 0, ny: 0, nz: -1, u: 0, v: 0 }, // top-left
            { x:  hw, y: -hh, z: 0, nx: 0, ny: 0, nz: -1, u: 1, v: 0 }, // top-right
            { x:  hw, y:  hh, z: 0, nx: 0, ny: 0, nz: -1, u: 1, v: 1 }, // bottom-right
            { x: -hw, y:  hh, z: 0, nx: 0, ny: 0, nz: -1, u: 0, v: 1 }, // bottom-left
        ];

        // 2 triangular faces (CCW winding)
        this.faces = [
            [0, 1, 2], // upper-right triangle
            [0, 2, 3], // lower-left triangle
        ];
    }

    /**
     * Get fragment shader source for the current shader type
     * @returns {string}
     * @private
     */
    _getFragmentShader() {
        switch (this.shaderType) {
            case "gradient":
                return PLANE_SHADERS.gradient;
            case "grid":
                return PLANE_SHADERS.grid;
            case "checkerboard":
                return PLANE_SHADERS.checkerboard;
            case "noise":
                return PLANE_SHADERS.noise;
            default:
                return PLANE_SHADERS.gradient;
        }
    }

    /**
     * Initialize or update the WebGL shader
     * @param {number} renderWidth - Render width
     * @param {number} renderHeight - Render height
     * @private
     */
    _initShader(renderWidth, renderHeight) {
        const gl = Plane3D._getGLRenderer(renderWidth, renderHeight);
        if (!gl || !gl.isAvailable()) {
            return false;
        }

        const programName = `plane_${this.shaderType}`;
        const vertexShader = PLANE_SHADERS.vertex;
        const fragmentShader = this._getFragmentShader();

        try {
            gl.useProgram(programName, vertexShader, fragmentShader);
            this._shaderInitialized = true;
            return true;
        } catch (e) {
            console.warn("Plane3D shader init failed:", e);
            return false;
        }
    }

    /**
     * Render plane using WebGL shader
     * @param {CanvasRenderingContext2D} ctx - 2D context for compositing
     * @param {number} screenX - Screen X position
     * @param {number} screenY - Screen Y position
     * @param {number} screenWidth - Screen width after projection
     * @param {number} screenHeight - Screen height after projection
     * @returns {boolean} True if shader rendering succeeded
     * @private
     */
    _renderWithShader(ctx, screenX, screenY, screenWidth, screenHeight) {
        // Ensure minimum size for rendering
        const renderSize = Math.max(
            Math.ceil(Math.max(screenWidth, screenHeight)),
            16
        );

        if (!this._shaderInitialized) {
            if (!this._initShader(renderSize, renderSize)) {
                return false;
            }
        }

        const gl = Plane3D._getGLRenderer(renderSize, renderSize);
        if (!gl || !gl.isAvailable()) {
            return false;
        }

        // Ensure correct program is active
        const programName = `plane_${this.shaderType}`;
        gl.useProgram(programName, PLANE_SHADERS.vertex, this._getFragmentShader());

        // Set common uniforms
        const time = performance.now() / 1000;
        gl.setUniforms({
            uTime: time,
            uResolution: [renderSize, renderSize],
        });

        // Set shader-specific uniforms
        gl.setUniforms(this.shaderUniforms);

        // Render
        gl.render();

        // Composite onto 2D canvas at the projected position
        const drawX = screenX - screenWidth / 2;
        const drawY = screenY - screenHeight / 2;
        gl.compositeOnto(ctx, drawX, drawY, screenWidth, screenHeight);

        return true;
    }

    /**
     * Apply self-rotation to a point (vertex or normal)
     * @param {number} x - X component
     * @param {number} y - Y component
     * @param {number} z - Z component
     * @returns {{x: number, y: number, z: number}} Rotated point
     * @private
     */
    _applySelfRotation(x, y, z) {
        // Rotate around Y axis first (most common for spinning objects)
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
            // Fallback: draw a simple rectangle if no camera
            if (this.color) {
                Painter.shapes.fillRect(
                    -this.planeWidth / 2,
                    -this.planeHeight / 2,
                    this.planeWidth,
                    this.planeHeight,
                    this.color
                );
            }
            return;
        }

        // Check if any self-rotation is applied
        const hasSelfRotation =
            this.selfRotationX !== 0 ||
            this.selfRotationY !== 0 ||
            this.selfRotationZ !== 0;

        // Project all vertices
        const projectedVertices = this.vertices.map((v) => {
            let vx = v.x;
            let vy = v.y;
            let vz = v.z;
            let nx = v.nx;
            let ny = v.ny;
            let nz = v.nz;

            // Apply self-rotation
            if (hasSelfRotation) {
                const rotatedPos = this._applySelfRotation(vx, vy, vz);
                vx = rotatedPos.x;
                vy = rotatedPos.y;
                vz = rotatedPos.z;

                const rotatedNormal = this._applySelfRotation(nx, ny, nz);
                nx = rotatedNormal.x;
                ny = rotatedNormal.y;
                nz = rotatedNormal.z;
            }

            // Project through camera
            const projected = this.camera.project(
                vx + this.x,
                vy + this.y,
                vz + this.z
            );

            // Rotate normals through camera rotation
            // Z axis rotation
            if (this.camera.rotationZ !== 0) {
                const cosZ = Math.cos(this.camera.rotationZ);
                const sinZ = Math.sin(this.camera.rotationZ);
                const nx0 = nx;
                const ny0 = ny;
                nx = nx0 * cosZ - ny0 * sinZ;
                ny = nx0 * sinZ + ny0 * cosZ;
            }

            // Y axis rotation
            const cosY = Math.cos(this.camera.rotationY);
            const sinY = Math.sin(this.camera.rotationY);
            const nx1 = nx * cosY - nz * sinY;
            const nz1 = nx * sinY + nz * cosY;

            // X axis rotation
            const cosX = Math.cos(this.camera.rotationX);
            const sinX = Math.sin(this.camera.rotationX);
            const ny1 = ny * cosX - nz1 * sinX;
            const nz2 = ny * sinX + nz1 * cosX;

            return {
                ...projected,
                nx: nx1,
                ny: ny1,
                nz: nz2,
                u: v.u,
                v: v.v,
            };
        });

        // Calculate average normal for backface culling
        const avgNz =
            (projectedVertices[0].nz +
                projectedVertices[1].nz +
                projectedVertices[2].nz +
                projectedVertices[3].nz) /
            4;

        // Backface culling (unless double-sided)
        if (!this.doubleSided && avgNz > 0.1) {
            return; // Face is pointing away from camera
        }

        // Calculate average depth for z-sorting (used by parent containers)
        const avgZ =
            (projectedVertices[0].z +
                projectedVertices[1].z +
                projectedVertices[2].z +
                projectedVertices[3].z) /
            4;

        // Check if any vertex is behind camera
        const behindCamera = projectedVertices.some(
            (v) => v.z < -this.camera.perspective + 10
        );
        if (behindCamera) {
            return;
        }

        // For WebGL shader rendering, calculate screen bounds
        if (this.useShader && !this.debug) {
            const xs = projectedVertices.map((v) => v.x);
            const ys = projectedVertices.map((v) => v.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const screenWidth = maxX - minX;
            const screenHeight = maxY - minY;
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            // Get canvas transform for absolute positioning
            const ctx = Painter.ctx;
            const transform = ctx.getTransform();
            const sceneX = transform.e;
            const sceneY = transform.f;

            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            const success = this._renderWithShader(
                ctx,
                sceneX + centerX,
                sceneY + centerY,
                screenWidth,
                screenHeight
            );
            ctx.restore();

            if (success) {
                return;
            }
            // Fall through to Canvas 2D if shader failed
        }

        // Canvas 2D rendering path
        const ctx = Painter.ctx;

        // Calculate lighting based on normal direction
        let avgNx =
            (projectedVertices[0].nx +
                projectedVertices[1].nx +
                projectedVertices[2].nx +
                projectedVertices[3].nx) /
            4;
        let avgNy =
            (projectedVertices[0].ny +
                projectedVertices[1].ny +
                projectedVertices[2].ny +
                projectedVertices[3].ny) /
            4;

        // Flip normal for lighting when viewing the back side
        let lightNx = avgNx;
        let lightNy = avgNy;
        let lightNz = avgNz;
        if (this.doubleSided && avgNz > 0) {
            lightNx = -avgNx;
            lightNy = -avgNy;
            lightNz = -avgNz;
        }
        const intensity = this._calculateLighting(lightNx, lightNy, lightNz);

        // Render as two triangles
        for (const face of this.faces) {
            const v0 = projectedVertices[face[0]];
            const v1 = projectedVertices[face[1]];
            const v2 = projectedVertices[face[2]];

            if (this.debug) {
                // Wireframe mode
                ctx.beginPath();
                ctx.moveTo(v0.x, v0.y);
                ctx.lineTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.closePath();

                if (this.stroke) {
                    ctx.strokeStyle = this.stroke;
                    ctx.lineWidth = this.lineWidth ?? 1;
                    ctx.stroke();
                }
            } else if (this.texture) {
                // Texture mapping (simplified - for accurate perspective would need more complex math)
                this._renderTexturedTriangle(ctx, v0, v1, v2);
            } else if (this.color) {
                // Solid color with lighting
                const faceColor = this._applyLighting(this.color, intensity);

                ctx.beginPath();
                ctx.moveTo(v0.x, v0.y);
                ctx.lineTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.closePath();
                ctx.fillStyle = faceColor;
                ctx.fill();
            }
        }
    }

    /**
     * Render a textured triangle (simplified affine mapping)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} v0 - Vertex 0 with x, y, u, v
     * @param {Object} v1 - Vertex 1 with x, y, u, v
     * @param {Object} v2 - Vertex 2 with x, y, u, v
     * @private
     */
    _renderTexturedTriangle(ctx, v0, v1, v2) {
        if (!this.texture || !this.texture.complete) {
            return;
        }

        const img = this.texture;
        const imgW = img.width;
        const imgH = img.height;

        // Use affine texture mapping (works well for roughly planar surfaces)
        // Transform from UV space to screen space

        // Source triangle in texture coordinates
        const su0 = v0.u * imgW;
        const sv0 = v0.v * imgH;
        const su1 = v1.u * imgW;
        const sv1 = v1.v * imgH;
        const su2 = v2.u * imgW;
        const sv2 = v2.v * imgH;

        // Destination triangle in screen coordinates
        const dx0 = v0.x;
        const dy0 = v0.y;
        const dx1 = v1.x;
        const dy1 = v1.y;
        const dx2 = v2.x;
        const dy2 = v2.y;

        // Calculate affine transformation matrix
        // This maps from texture space to screen space
        const det =
            (su1 - su0) * (sv2 - sv0) - (su2 - su0) * (sv1 - sv0);

        if (Math.abs(det) < 0.0001) {
            return; // Degenerate triangle
        }

        const a =
            ((dx1 - dx0) * (sv2 - sv0) - (dx2 - dx0) * (sv1 - sv0)) / det;
        const b =
            ((dx2 - dx0) * (su1 - su0) - (dx1 - dx0) * (su2 - su0)) / det;
        const c = dx0 - a * su0 - b * sv0;
        const d =
            ((dy1 - dy0) * (sv2 - sv0) - (dy2 - dy0) * (sv1 - sv0)) / det;
        const e =
            ((dy2 - dy0) * (su1 - su0) - (dy1 - dy0) * (su2 - su0)) / det;
        const f = dy0 - d * su0 - e * sv0;

        ctx.save();

        // Clip to triangle
        ctx.beginPath();
        ctx.moveTo(dx0, dy0);
        ctx.lineTo(dx1, dy1);
        ctx.lineTo(dx2, dy2);
        ctx.closePath();
        ctx.clip();

        // Apply transformation and draw image
        ctx.setTransform(a, d, b, e, c, f);
        ctx.drawImage(img, 0, 0);

        ctx.restore();
    }

    /**
     * Get the center point in world coordinates
     * @returns {{x: number, y: number, z: number}}
     */
    getCenter() {
        return { x: this.x, y: this.y, z: this.z };
    }

    /**
     * Get bounding box for the plane
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getBounds() {
        // Simple bounds based on plane dimensions
        // Note: This doesn't account for rotation
        return {
            x: this.x - this.planeWidth / 2,
            y: this.y - this.planeHeight / 2,
            width: this.planeWidth,
            height: this.planeHeight,
        };
    }
}

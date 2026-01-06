/**
 * WebGLRenderer - Lightweight WebGL utility for gcanvas
 *
 * Provides WebGL rendering capabilities for shapes that need shader effects.
 * Renders to an offscreen canvas that can be composited onto the main 2D canvas.
 *
 * Features:
 * - Shader compilation and caching
 * - Uniform management
 * - Offscreen rendering with compositing
 * - Fallback detection for systems without WebGL
 *
 * @example
 * const renderer = new WebGLRenderer(800, 600);
 * renderer.useProgram('sphere', vertexShader, fragmentShader);
 * renderer.setUniforms({ uTime: performance.now() / 1000 });
 * renderer.render();
 * renderer.compositeOnto(mainCtx, x, y);
 */
export class WebGLRenderer {
    /**
     * Create a WebGL renderer
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // Create offscreen canvas
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;

        // Get WebGL context
        // Use premultipliedAlpha: true for correct compositing onto Canvas 2D
        this.gl = this.canvas.getContext("webgl", {
            alpha: true,
            premultipliedAlpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
        });

        if (!this.gl) {
            console.warn("WebGL not available, falling back to Canvas 2D");
            this.available = false;
            return;
        }

        this.available = true;

        // Enable alpha blending for premultiplied alpha
        // With premultiplied alpha: output = src + dest * (1 - src_alpha)
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // Set initial viewport (important - WebGL doesn't always default correctly)
        gl.viewport(0, 0, width, height);

        // Program cache
        this.programs = new Map();
        this.currentProgram = null;

        // Uniform locations cache
        this.uniformLocations = new Map();

        // Track if attributes need rebinding (after resize)
        this._needsAttributeRebind = false;

        // Create fullscreen quad for rendering
        this._createQuad();
    }

    /**
     * Check if WebGL is available
     * @returns {boolean}
     */
    isAvailable() {
        return this.available;
    }

    /**
     * Resize the renderer
     * @param {number} width - New width
     * @param {number} height - New height
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
        if (this.gl) {
            this.gl.viewport(0, 0, width, height);
            // Flag that attributes need rebinding after resize
            this._needsAttributeRebind = true;
        }
    }

    /**
     * Create a fullscreen quad for rendering
     * @private
     */
    _createQuad() {
        const gl = this.gl;

        // Vertex positions (fullscreen quad as two triangles)
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);

        // UV coordinates
        const uvs = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ]);

        // Position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // UV buffer
        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    }

    /**
     * Compile a shader
     * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
     * @param {string} source - Shader source code
     * @returns {WebGLShader|null}
     * @private
     */
    _compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compile error:", gl.getShaderInfoLog(shader));
            console.error("Source:", source);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    /**
     * Create or get a shader program
     * @param {string} name - Program name for caching
     * @param {string} vertexSource - Vertex shader source
     * @param {string} fragmentSource - Fragment shader source
     * @returns {WebGLProgram|null}
     */
    useProgram(name, vertexSource, fragmentSource) {
        if (!this.available) return null;

        const gl = this.gl;

        // Check cache
        if (this.programs.has(name)) {
            const program = this.programs.get(name);
            gl.useProgram(program);
            this.currentProgram = name;

            // Rebind attributes if needed (after resize or context change)
            if (this._needsAttributeRebind) {
                this._bindAttributes(program);
                this._needsAttributeRebind = false;
            }

            return program;
        }

        // Compile shaders
        const vertexShader = this._compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) {
            return null;
        }

        // Link program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link error:", gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }

        // Cache program
        this.programs.set(name, program);
        this.uniformLocations.set(name, new Map());

        // Use the program
        gl.useProgram(program);
        this.currentProgram = name;

        // Setup attribute locations
        this._bindAttributes(program);

        return program;
    }

    /**
     * Bind vertex attributes for a program
     * @param {WebGLProgram} program - The program to bind attributes for
     * @private
     */
    _bindAttributes(program) {
        const gl = this.gl;
        const positionLoc = gl.getAttribLocation(program, "aPosition");
        const uvLoc = gl.getAttribLocation(program, "aUv");

        if (positionLoc !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.enableVertexAttribArray(positionLoc);
            gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        }

        if (uvLoc !== -1) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.enableVertexAttribArray(uvLoc);
            gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
        }
    }

    /**
     * Get uniform location (cached)
     * @param {string} name - Uniform name
     * @returns {WebGLUniformLocation|null}
     * @private
     */
    _getUniformLocation(name) {
        const gl = this.gl;
        const program = this.programs.get(this.currentProgram);
        const cache = this.uniformLocations.get(this.currentProgram);

        if (!cache.has(name)) {
            cache.set(name, gl.getUniformLocation(program, name));
        }

        return cache.get(name);
    }

    /**
     * Set uniforms for the current program
     * @param {Object} uniforms - Object of uniform name -> value pairs
     */
    setUniforms(uniforms) {
        if (!this.available || !this.currentProgram) return;

        const gl = this.gl;

        for (const [name, value] of Object.entries(uniforms)) {
            const location = this._getUniformLocation(name);
            if (location === null) continue;

            if (typeof value === "number") {
                gl.uniform1f(location, value);
            } else if (Array.isArray(value)) {
                switch (value.length) {
                    case 2:
                        gl.uniform2fv(location, value);
                        break;
                    case 3:
                        gl.uniform3fv(location, value);
                        break;
                    case 4:
                        gl.uniform4fv(location, value);
                        break;
                }
            } else if (value instanceof Float32Array) {
                if (value.length === 9) {
                    gl.uniformMatrix3fv(location, false, value);
                } else if (value.length === 16) {
                    gl.uniformMatrix4fv(location, false, value);
                }
            }
        }
    }

    /**
     * Set a color uniform (converts hex to RGB floats)
     * @param {string} name - Uniform name
     * @param {string} color - Hex color string (e.g., "#FF8800")
     */
    setColorUniform(name, color) {
        if (!this.available || !this.currentProgram) return;

        const hex = color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        const location = this._getUniformLocation(name);
        if (location !== null) {
            this.gl.uniform3f(location, r, g, b);
        }
    }

    /**
     * Clear the canvas
     * @param {number} r - Red (0-1)
     * @param {number} g - Green (0-1)
     * @param {number} b - Blue (0-1)
     * @param {number} a - Alpha (0-1)
     */
    clear(r = 0, g = 0, b = 0, a = 0) {
        if (!this.available) return;
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /**
     * Render the current program to the canvas
     */
    render() {
        if (!this.available || !this.currentProgram) return;
        const gl = this.gl;
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /**
     * Composite the WebGL canvas onto a 2D canvas context
     * @param {CanvasRenderingContext2D} ctx - Target 2D context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} [width] - Optional width (defaults to canvas width)
     * @param {number} [height] - Optional height (defaults to canvas height)
     */
    compositeOnto(ctx, x, y, width, height) {
        if (!this.available) return;
        ctx.drawImage(
            this.canvas,
            x, y,
            width ?? this.canvas.width,
            height ?? this.canvas.height
        );
    }

    /**
     * Get the WebGL canvas element
     * @returns {HTMLCanvasElement}
     */
    getCanvas() {
        return this.canvas;
    }

    /**
     * Destroy the renderer and free resources
     */
    destroy() {
        if (!this.available) return;

        const gl = this.gl;

        // Delete programs
        for (const program of this.programs.values()) {
            gl.deleteProgram(program);
        }

        // Delete buffers
        gl.deleteBuffer(this.positionBuffer);
        gl.deleteBuffer(this.uvBuffer);

        this.programs.clear();
        this.uniformLocations.clear();
    }
}

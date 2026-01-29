/**
 * WebGLParticleRenderer - GPU-accelerated particle rendering via point sprites
 *
 * Renders particles using WebGL GL_POINTS with gl_PointSize for GPU acceleration.
 * Works alongside the existing ParticleSystem which handles state management,
 * pooling, and updaters on the CPU.
 *
 * Features:
 * - Pre-allocated buffers for zero-allocation rendering
 * - Multiple shape presets (circle, glow, square)
 * - Additive or alpha blending modes
 * - Automatic fallback detection
 * - Compositing onto Canvas 2D
 *
 * @example
 * const renderer = new WebGLParticleRenderer(10000);
 * renderer.updateParticles(projectedParticles);
 * renderer.render(particleCount);
 * renderer.compositeOnto(ctx, 0, 0);
 */

import {
    POINT_SPRITE_VERTEX,
    POINT_SPRITE_CIRCLE_FRAGMENT,
    POINT_SPRITE_GLOW_FRAGMENT,
    POINT_SPRITE_SQUARE_FRAGMENT,
    POINT_SPRITE_SOFT_SQUARE_FRAGMENT,
} from './shaders/point-sprite-shaders.js';

export class WebGLParticleRenderer {
    /**
     * Create a WebGL particle renderer
     * @param {number} maxParticles - Maximum particle capacity (pre-allocated)
     * @param {Object} options - Configuration options
     * @param {number} options.width - Initial canvas width
     * @param {number} options.height - Initial canvas height
     * @param {string} options.shape - Particle shape: 'circle', 'glow', 'square', 'softSquare'
     * @param {string} options.blendMode - Blend mode: 'additive' or 'alpha'
     */
    constructor(maxParticles = 10000, options = {}) {
        this.maxParticles = maxParticles;
        this.width = options.width || 800;
        this.height = options.height || 600;
        this.shape = options.shape || 'circle';
        this.blendMode = options.blendMode || 'alpha';

        // Create offscreen canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Get WebGL context
        this.gl = this.canvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: true,
            antialias: false,  // Points don't need AA
            preserveDrawingBuffer: true,
        });

        if (!this.gl) {
            console.warn('WebGL not available for particle rendering');
            this.available = false;
            return;
        }

        this.available = true;

        // Pre-allocate typed arrays (reused each frame)
        this._positions = new Float32Array(maxParticles * 2);
        this._sizes = new Float32Array(maxParticles);
        this._colors = new Float32Array(maxParticles * 4);

        // Setup WebGL
        this._initGL();
        this._createBuffers();
        this._compileShaders();
        this._setupBlending();
    }

    /**
     * Check if WebGL is available
     * @returns {boolean}
     */
    isAvailable() {
        return this.available;
    }

    /**
     * Initialize WebGL state
     * @private
     */
    _initGL() {
        const gl = this.gl;
        gl.viewport(0, 0, this.width, this.height);
        gl.enable(gl.BLEND);
    }

    /**
     * Setup blending mode
     * @private
     */
    _setupBlending() {
        const gl = this.gl;

        if (this.blendMode === 'additive') {
            // Additive blending (screen/lighter mode)
            // With premultiplied alpha: src + dest
            gl.blendFunc(gl.ONE, gl.ONE);
        } else {
            // Standard alpha blending with premultiplied alpha
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        }
    }

    /**
     * Set blend mode
     * @param {string} mode - 'additive' or 'alpha'
     */
    setBlendMode(mode) {
        this.blendMode = mode;
        if (this.available) {
            this._setupBlending();
        }
    }

    /**
     * Create GPU buffers for particle data
     * @private
     */
    _createBuffers() {
        const gl = this.gl;

        // Position buffer (vec2 per particle)
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._positions, gl.DYNAMIC_DRAW);

        // Size buffer (float per particle)
        this.sizeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._sizes, gl.DYNAMIC_DRAW);

        // Color buffer (vec4 per particle)
        this.colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this._colors, gl.DYNAMIC_DRAW);
    }

    /**
     * Compile point sprite shaders
     * @private
     */
    _compileShaders() {
        const gl = this.gl;

        // Select fragment shader based on shape
        let fragmentSource;
        switch (this.shape) {
            case 'glow':
                fragmentSource = POINT_SPRITE_GLOW_FRAGMENT;
                break;
            case 'square':
                fragmentSource = POINT_SPRITE_SQUARE_FRAGMENT;
                break;
            case 'softSquare':
                fragmentSource = POINT_SPRITE_SOFT_SQUARE_FRAGMENT;
                break;
            case 'circle':
            default:
                fragmentSource = POINT_SPRITE_CIRCLE_FRAGMENT;
                break;
        }

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, POINT_SPRITE_VERTEX);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
            this.available = false;
            return;
        }

        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
            this.available = false;
            return;
        }

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            this.available = false;
            return;
        }

        gl.useProgram(this.program);

        // Get attribute locations
        this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
        this.aSize = gl.getAttribLocation(this.program, 'aSize');
        this.aColor = gl.getAttribLocation(this.program, 'aColor');

        // Get uniform locations
        this.uResolution = gl.getUniformLocation(this.program, 'uResolution');

        // Set initial resolution
        gl.uniform2f(this.uResolution, this.width, this.height);

        // Clean up shader objects
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    }

    /**
     * Change particle shape (recompiles fragment shader)
     * @param {string} shape - 'circle', 'glow', 'square', or 'softSquare'
     */
    setShape(shape) {
        if (shape === this.shape) return;
        this.shape = shape;

        if (this.available) {
            // Delete old program
            if (this.program) {
                this.gl.deleteProgram(this.program);
            }
            // Recompile with new fragment shader
            this._compileShaders();
        }
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

        if (this.available) {
            const gl = this.gl;
            gl.viewport(0, 0, width, height);
            gl.useProgram(this.program);
            gl.uniform2f(this.uResolution, width, height);
        }
    }

    /**
     * Update particle data in GPU buffers
     *
     * @param {Array} particles - Array of projected particles with screen coords
     *   Each particle should have: { x, y, size, color: {r, g, b, a} }
     *   Colors should be 0-255 for RGB, 0-1 for alpha
     * @returns {number} Number of particles updated
     */
    updateParticles(particles) {
        if (!this.available) return 0;

        const count = Math.min(particles.length, this.maxParticles);
        const gl = this.gl;

        // Fill typed arrays
        for (let i = 0; i < count; i++) {
            const p = particles[i];
            const i2 = i * 2;
            const i4 = i * 4;

            // Position (screen coords)
            this._positions[i2] = p.x;
            this._positions[i2 + 1] = p.y;

            // Size
            this._sizes[i] = p.size;

            // Color (normalize RGB to 0-1)
            const color = p.color;
            // For premultiplied alpha, multiply RGB by alpha
            const a = color.a !== undefined ? color.a : 1;
            const r = (color.r / 255) * a;
            const g = (color.g / 255) * a;
            const b = (color.b / 255) * a;

            this._colors[i4] = r;
            this._colors[i4 + 1] = g;
            this._colors[i4 + 2] = b;
            this._colors[i4 + 3] = a;
        }

        // Upload to GPU via bufferSubData (faster than bufferData for partial updates)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._positions.subarray(0, count * 2));

        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._sizes.subarray(0, count));

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this._colors.subarray(0, count * 4));

        return count;
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
     * Render particles to the WebGL canvas
     * @param {number} count - Number of particles to render
     */
    render(count) {
        if (!this.available || count === 0) return;

        const gl = this.gl;

        gl.useProgram(this.program);

        // Bind position attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.aPosition);
        gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

        // Bind size attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
        gl.enableVertexAttribArray(this.aSize);
        gl.vertexAttribPointer(this.aSize, 1, gl.FLOAT, false, 0, 0);

        // Bind color attribute
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.enableVertexAttribArray(this.aColor);
        gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, 0, 0);

        // Draw all particles in a single call
        gl.drawArrays(gl.POINTS, 0, count);
    }

    /**
     * Composite the WebGL canvas onto a 2D canvas context
     * @param {CanvasRenderingContext2D} ctx - Target 2D context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} [width] - Optional width
     * @param {number} [height] - Optional height
     */
    compositeOnto(ctx, x = 0, y = 0, width, height) {
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

        // Delete program
        if (this.program) {
            gl.deleteProgram(this.program);
        }

        // Delete buffers
        gl.deleteBuffer(this.positionBuffer);
        gl.deleteBuffer(this.sizeBuffer);
        gl.deleteBuffer(this.colorBuffer);

        // Clear typed arrays
        this._positions = null;
        this._sizes = null;
        this._colors = null;
    }
}

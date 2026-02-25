/**
 * Point Sprite Shaders for WebGL Particle Rendering
 *
 * These shaders render particles as GL_POINTS with gl_PointSize.
 * Used by WebGLParticleRenderer for GPU-accelerated particle systems.
 */

// =============================================================================
// VERTEX SHADER
// =============================================================================

/**
 * Point sprite vertex shader
 * Takes screen-space positions (already projected by Camera3D on CPU)
 * and converts to clip space for rendering.
 */
export const POINT_SPRITE_VERTEX = `
precision highp float;

attribute vec2 aPosition;   // Screen position (pixels, already projected)
attribute float aSize;      // Point size in pixels
attribute vec4 aColor;      // RGBA color (0-1 range)

varying vec4 vColor;

uniform vec2 uResolution;   // Canvas dimensions

void main() {
    // Convert from pixel coords to clip space (-1 to 1)
    vec2 clipPos = (aPosition / uResolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;  // Flip Y (canvas Y is down, GL Y is up)

    gl_Position = vec4(clipPos, 0.0, 1.0);
    gl_PointSize = aSize;
    vColor = aColor;
}
`;

// =============================================================================
// FRAGMENT SHADERS
// =============================================================================

/**
 * Circle fragment shader with soft anti-aliased edge
 * Most common particle shape - smooth circular particles
 */
export const POINT_SPRITE_CIRCLE_FRAGMENT = `
precision mediump float;

varying vec4 vColor;

void main() {
    // gl_PointCoord is 0-1 UV within the point quad
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    // Discard pixels outside circle
    if (dist > 0.5) {
        discard;
    }

    // Soft edge for anti-aliasing
    float alpha = vColor.a * (1.0 - smoothstep(0.4, 0.5, dist));
    gl_FragColor = vec4(vColor.rgb, alpha);
}
`;

/**
 * Circle fragment shader with glow effect
 * Particles have a bright core that fades outward
 */
export const POINT_SPRITE_GLOW_FRAGMENT = `
precision mediump float;

varying vec4 vColor;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    if (dist > 0.5) {
        discard;
    }

    // Sharp bright core (white-hot center)
    float core = smoothstep(0.18, 0.0, dist);

    // Soft halo with moderate falloff
    float halo = exp(-dist * dist * 18.0);

    // Anti-aliased edge
    float edge = smoothstep(0.5, 0.4, dist);

    // Combine: core dominates center, halo provides glow
    float intensity = max(core, halo * 0.6) * edge;

    // Core shifts toward white, halo carries the star color
    vec3 color = mix(vColor.rgb, vec3(1.0), core * 0.6);
    float alpha = vColor.a * intensity;

    gl_FragColor = vec4(color * alpha, alpha);
}
`;

/**
 * Square fragment shader (no clipping)
 * Fastest option - just outputs the color directly
 */
export const POINT_SPRITE_SQUARE_FRAGMENT = `
precision mediump float;

varying vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
`;

/**
 * Soft square fragment shader with rounded corners
 */
export const POINT_SPRITE_SOFT_SQUARE_FRAGMENT = `
precision mediump float;

varying vec4 vColor;

void main() {
    vec2 coord = abs(gl_PointCoord - vec2(0.5)) * 2.0;  // 0 at center, 1 at edge
    float d = max(coord.x, coord.y);

    // Soft edge
    float alpha = vColor.a * (1.0 - smoothstep(0.8, 1.0, d));
    gl_FragColor = vec4(vColor.rgb, alpha);
}
`;

// =============================================================================
// SHADER PRESETS
// =============================================================================

/**
 * Pre-configured shader combinations for common use cases
 */
export const POINT_SPRITE_PRESETS = {
    circle: {
        vertex: POINT_SPRITE_VERTEX,
        fragment: POINT_SPRITE_CIRCLE_FRAGMENT,
    },
    glow: {
        vertex: POINT_SPRITE_VERTEX,
        fragment: POINT_SPRITE_GLOW_FRAGMENT,
    },
    square: {
        vertex: POINT_SPRITE_VERTEX,
        fragment: POINT_SPRITE_SQUARE_FRAGMENT,
    },
    softSquare: {
        vertex: POINT_SPRITE_VERTEX,
        fragment: POINT_SPRITE_SOFT_SQUARE_FRAGMENT,
    },
};

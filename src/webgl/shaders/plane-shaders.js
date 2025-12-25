/**
 * Plane Shaders for WebGL Rendering
 *
 * These shaders render 2D patterns onto a plane quad.
 * Unlike sphere shaders which use ray-sphere intersection,
 * these shaders work directly with UV coordinates.
 */

// =============================================================================
// VERTEX SHADER
// =============================================================================

/**
 * Standard vertex shader for plane rendering
 * Simply passes through position and UV coordinates
 */
export const PLANE_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUv;

varying vec2 vUv;

void main() {
    vUv = aUv;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// =============================================================================
// COMMON SHADER FUNCTIONS
// =============================================================================

/**
 * Common functions included in all plane fragment shaders
 */
export const PLANE_COMMON = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;

// =============================================================================
// NOISE FUNCTIONS
// =============================================================================

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2D Value noise
float noise2D(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM (Fractional Brownian Motion)
float fbm2D(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise2D(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}
`;

// =============================================================================
// GRADIENT SHADER
// =============================================================================

/**
 * Linear gradient shader
 * Uniforms:
 * - uColor1: Start color [r, g, b] (0-1)
 * - uColor2: End color [r, g, b] (0-1)
 * - uAngle: Gradient angle in radians (0 = horizontal, PI/2 = vertical)
 */
export const GRADIENT_FRAGMENT = `
${PLANE_COMMON}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uAngle;

void main() {
    vec2 uv = vUv;

    // Calculate gradient direction from angle
    vec2 dir = vec2(cos(uAngle), sin(uAngle));

    // Project UV onto gradient direction
    // Center at 0.5 so gradient goes through middle
    float t = dot(uv - 0.5, dir) + 0.5;
    t = clamp(t, 0.0, 1.0);

    // Interpolate colors
    vec3 color = mix(uColor1, uColor2, t);

    gl_FragColor = vec4(color, 1.0);
}
`;

// =============================================================================
// GRID SHADER
// =============================================================================

/**
 * Grid pattern shader
 * Uniforms:
 * - uLineColor: Grid line color [r, g, b] (0-1)
 * - uBackgroundColor: Background color [r, g, b] (0-1)
 * - uGridSize: Number of grid cells (e.g., 8.0 = 8x8 grid)
 * - uLineWidth: Line width as fraction of cell (e.g., 0.05)
 */
export const GRID_FRAGMENT = `
${PLANE_COMMON}

uniform vec3 uLineColor;
uniform vec3 uBackgroundColor;
uniform float uGridSize;
uniform float uLineWidth;

void main() {
    vec2 uv = vUv;

    // Scale UV to grid space
    vec2 grid = fract(uv * uGridSize);

    // Calculate distance to nearest grid line
    float lineX = min(grid.x, 1.0 - grid.x);
    float lineY = min(grid.y, 1.0 - grid.y);

    // Smoothstep for anti-aliased lines
    float halfWidth = uLineWidth * 0.5;
    float edgeSmooth = 0.01;

    float lineAlphaX = 1.0 - smoothstep(halfWidth - edgeSmooth, halfWidth + edgeSmooth, lineX);
    float lineAlphaY = 1.0 - smoothstep(halfWidth - edgeSmooth, halfWidth + edgeSmooth, lineY);
    float lineAlpha = max(lineAlphaX, lineAlphaY);

    // Mix colors
    vec3 color = mix(uBackgroundColor, uLineColor, lineAlpha);

    gl_FragColor = vec4(color, 1.0);
}
`;

// =============================================================================
// CHECKERBOARD SHADER
// =============================================================================

/**
 * Checkerboard pattern shader
 * Uniforms:
 * - uColor1: First square color [r, g, b] (0-1)
 * - uColor2: Second square color [r, g, b] (0-1)
 * - uSize: Number of squares per side (e.g., 8.0 = 8x8)
 */
export const CHECKERBOARD_FRAGMENT = `
${PLANE_COMMON}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uSize;

void main() {
    vec2 uv = vUv;

    // Calculate which square we're in
    vec2 cell = floor(uv * uSize);

    // Alternating pattern based on cell coordinates
    float checker = mod(cell.x + cell.y, 2.0);

    // Select color
    vec3 color = mix(uColor1, uColor2, checker);

    gl_FragColor = vec4(color, 1.0);
}
`;

// =============================================================================
// NOISE SHADER
// =============================================================================

/**
 * Animated noise pattern shader
 * Uniforms:
 * - uColor1: Base color [r, g, b] (0-1)
 * - uColor2: Secondary color [r, g, b] (0-1)
 * - uNoiseScale: Scale of the noise pattern (e.g., 4.0)
 * - uAnimSpeed: Animation speed (e.g., 0.5)
 */
export const NOISE_FRAGMENT = `
${PLANE_COMMON}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uNoiseScale;
uniform float uAnimSpeed;

void main() {
    vec2 uv = vUv;

    // Animated noise
    float n = fbm2D(uv * uNoiseScale + uTime * uAnimSpeed, 4);

    // Map noise to colors
    vec3 color = mix(uColor1, uColor2, n);

    gl_FragColor = vec4(color, 1.0);
}
`;

// =============================================================================
// RADIAL GRADIENT SHADER
// =============================================================================

/**
 * Radial gradient shader
 * Uniforms:
 * - uColor1: Center color [r, g, b] (0-1)
 * - uColor2: Edge color [r, g, b] (0-1)
 * - uCenterX: Center X position (0-1, default 0.5)
 * - uCenterY: Center Y position (0-1, default 0.5)
 * - uRadius: Gradient radius (default 0.5)
 */
export const RADIAL_GRADIENT_FRAGMENT = `
${PLANE_COMMON}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uCenterX;
uniform float uCenterY;
uniform float uRadius;

void main() {
    vec2 uv = vUv;
    vec2 center = vec2(uCenterX, uCenterY);

    // Calculate distance from center
    float dist = length(uv - center);

    // Normalize by radius
    float t = clamp(dist / uRadius, 0.0, 1.0);

    // Interpolate colors
    vec3 color = mix(uColor1, uColor2, t);

    gl_FragColor = vec4(color, 1.0);
}
`;

// =============================================================================
// STRIPES SHADER
// =============================================================================

/**
 * Stripe pattern shader
 * Uniforms:
 * - uColor1: First stripe color [r, g, b] (0-1)
 * - uColor2: Second stripe color [r, g, b] (0-1)
 * - uStripeCount: Number of stripes
 * - uAngle: Stripe angle in radians
 */
export const STRIPES_FRAGMENT = `
${PLANE_COMMON}

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uStripeCount;
uniform float uAngle;

void main() {
    vec2 uv = vUv;

    // Rotate UV by angle
    vec2 center = vec2(0.5);
    vec2 rotated = uv - center;
    float c = cos(uAngle);
    float s = sin(uAngle);
    rotated = vec2(rotated.x * c - rotated.y * s, rotated.x * s + rotated.y * c);
    rotated += center;

    // Create stripes along one axis
    float stripe = floor(mod(rotated.x * uStripeCount, 2.0));

    // Select color
    vec3 color = mix(uColor1, uColor2, stripe);

    gl_FragColor = vec4(color, 1.0);
}
`;

// =============================================================================
// SHADER EXPORT
// =============================================================================

export const PLANE_SHADERS = {
    vertex: PLANE_VERTEX,
    common: PLANE_COMMON,
    gradient: GRADIENT_FRAGMENT,
    grid: GRID_FRAGMENT,
    checkerboard: CHECKERBOARD_FRAGMENT,
    noise: NOISE_FRAGMENT,
    radialGradient: RADIAL_GRADIENT_FRAGMENT,
    stripes: STRIPES_FRAGMENT,
};

export default PLANE_SHADERS;

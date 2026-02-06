/**
 * @module webgl/shaders/clifford-point-shaders
 * @description Procedural Clifford attractor shaders (GL_POINTS).
 *
 * This shader iterates the Clifford map directly in the vertex shader.
 * The attribute buffer contains random seeds in \([-1,1]\).
 *
 * Unlike `point-sprite-shaders.js` (which expects CPU-provided screen-space points),
 * these shaders generate positions procedurally on the GPU.
 *
 * Clifford equations:
 *   x_{n+1} = sin(a·y_n) + c·cos(a·x_n)
 *   y_{n+1} = sin(b·x_n) + d·cos(b·y_n)
 */

import {
  POINT_SPRITE_CIRCLE_FRAGMENT,
  POINT_SPRITE_GLOW_FRAGMENT,
  POINT_SPRITE_SOFT_SQUARE_FRAGMENT,
  POINT_SPRITE_SQUARE_FRAGMENT,
} from "./point-sprite-shaders.js";

/**
 * Maximum iterations supported by the vertex shader.
 * Increase carefully: higher values cost GPU time.
 * @type {number}
 */
export const CLIFFORD_MAX_ITERATIONS = 200;

/**
 * Procedural Clifford vertex shader.
 *
 * Uniforms:
 * - `uTime`: seconds
 * - `uParams`: vec4(a,b,c,d)
 * - `uIterations`: number of iterations to apply (0..CLIFFORD_MAX_ITERATIONS)
 * - `uTransform`: 2D transform in clip space (mat3)
 * - `uZoom`: zoom factor (multiplies the attractor)
 * - `uPointScale`: base scale mapping attractor space to clip space
 * - `uPointSize`: gl_PointSize (pixels)
 * - `uColorMode`: 0 = flat `uColor`, 1 = Lorenz-style speed→hue ramp
 * - `uColor`: RGBA (0..1) used when `uColorMode=0`
 * - `uHueRange`: vec2(minHue, maxHue) degrees (fast→slow mapping like Lorenz)
 * - `uMaxSpeed`: speed normalization threshold
 * - `uSaturation`: 0..1
 * - `uLightness`: 0..1
 * - `uAlpha`: 0..1
 * - `uHueOffset`: degrees (e.g. time*hueShiftSpeed)
 */
export const CLIFFORD_POINT_VERTEX = `
precision highp float;

attribute vec2 aPosition; // random seed in [-1, 1]

uniform float uTime;
uniform vec4 uParams;      // (a, b, c, d)
uniform int uIterations;   // 0..${CLIFFORD_MAX_ITERATIONS}
uniform mat3 uTransform;   // clip-space transform
uniform float uZoom;
uniform float uPointScale;
uniform float uPointSize;
uniform int uColorMode;
uniform vec4 uColor;       // non-premultiplied RGBA (0..1)
uniform vec2 uHueRange;    // (minHue, maxHue)
uniform float uMaxSpeed;
uniform float uSaturation; // 0..1
uniform float uLightness;  // 0..1
uniform float uAlpha;      // 0..1
uniform float uHueOffset;  // degrees

varying vec4 vColor;

// HSL to RGB (all 0..1). Based on a compact shader formulation.
vec3 hsl2rgb(vec3 hsl) {
  vec3 rgb = clamp(abs(mod(hsl.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  float c = (1.0 - abs(2.0 * hsl.z - 1.0)) * hsl.y;
  return (rgb - 0.5) * c + hsl.z;
}

void main() {
  vec2 p = aPosition;
  vec2 lastDelta = vec2(0.0);

  // Clifford iterative map
  // x' = sin(a*y) + c*cos(a*x)
  // y' = sin(b*x) + d*cos(b*y)
  for (int i = 0; i < ${CLIFFORD_MAX_ITERATIONS}; i++) {
    if (i >= uIterations) break;
    vec2 prev = p;
    float x = sin(uParams.x * p.y) + uParams.z * cos(uParams.x * p.x);
    float y = sin(uParams.y * p.x) + uParams.w * cos(uParams.y * p.y);
    p = vec2(x, y);
    lastDelta = p - prev;
  }

  // Map attractor space into clip space
  vec3 transformed = uTransform * vec3(p * uPointScale * uZoom, 1.0);
  gl_Position = vec4(transformed.xy, 0.0, 1.0);
  gl_PointSize = uPointSize;

  // Color
  vec4 c;
  if (uColorMode == 1) {
    float speed = length(lastDelta);
    float speedNorm = clamp(speed / max(uMaxSpeed, 0.0001), 0.0, 1.0);
    float baseHue = uHueRange.y - speedNorm * (uHueRange.y - uHueRange.x);
    float hue = mod(baseHue + uHueOffset, 360.0);
    vec3 rgb = hsl2rgb(vec3(hue / 360.0, clamp(uSaturation, 0.0, 1.0), clamp(uLightness, 0.0, 1.0)));
    c = vec4(rgb, clamp(uAlpha, 0.0, 1.0));
  } else {
    c = uColor;
  }

  // Premultiply in shader (renderer uses premultipliedAlpha for compositing)
  c.rgb *= c.a;
  vColor = c;
}
`;

/**
 * Fragment shaders for procedural points.
 * Re-uses the point sprite shapes.
 */
export const CLIFFORD_POINT_FRAGMENTS = {
  circle: POINT_SPRITE_CIRCLE_FRAGMENT,
  glow: POINT_SPRITE_GLOW_FRAGMENT,
  square: POINT_SPRITE_SQUARE_FRAGMENT,
  softSquare: POINT_SPRITE_SOFT_SQUARE_FRAGMENT,
};


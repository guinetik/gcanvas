/**
 * GLSL shader sources for the WebGL Attractor Pipeline.
 *
 * 5 shader programs:
 *   1. Attractor lines — GPU color math, energy flow, sparks
 *   2. Background      — animated FBM noise with vignette
 *   3. Bright extract  — bloom threshold pass
 *   4. Blur            — separable Gaussian blur (used twice: H + V)
 *   5. Composite       — additive bloom merge + tonemap
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. ATTRACTOR LINES
// ─────────────────────────────────────────────────────────────────────────────

export const ATTRACTOR_LINE_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute float aSpeedNorm;
attribute float aAge;
attribute float aBlink;
attribute float aSegIdx;

varying float vSpeedNorm;
varying float vAge;
varying float vBlink;
varying float vSegIdx;

uniform vec2 uResolution;

void main() {
    vec2 clipPos = (aPosition / uResolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;
    gl_Position = vec4(clipPos, 0.0, 1.0);

    vSpeedNorm = aSpeedNorm;
    vAge       = aAge;
    vBlink     = aBlink;
    vSegIdx    = aSegIdx;
}
`;

export const ATTRACTOR_LINE_FRAGMENT = `
precision mediump float;

varying float vSpeedNorm;
varying float vAge;
varying float vBlink;
varying float vSegIdx;

uniform float uTime;
uniform float uMinHue;
uniform float uMaxHue;
uniform float uSaturation;
uniform float uLightness;
uniform float uMaxAlpha;
uniform float uHueOffset;
uniform float uIntensityBoost;
uniform float uSaturationBoost;
uniform float uAlphaBoost;
uniform float uEnergyIntensity;
uniform float uEnergySpeed;
uniform float uSparkThreshold;

// HSL to RGB conversion
vec3 hsl2rgb(float h, float s, float l) {
    h = mod(h, 360.0) / 360.0;
    s = clamp(s, 0.0, 1.0);
    l = clamp(l, 0.0, 1.0);

    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;

    vec3 rgb;
    float hSeg = h * 6.0;
    if      (hSeg < 1.0) rgb = vec3(c, x, 0.0);
    else if (hSeg < 2.0) rgb = vec3(x, c, 0.0);
    else if (hSeg < 3.0) rgb = vec3(0.0, c, x);
    else if (hSeg < 4.0) rgb = vec3(0.0, x, c);
    else if (hSeg < 5.0) rgb = vec3(x, 0.0, c);
    else                  rgb = vec3(c, 0.0, x);

    return rgb + m;
}

void main() {
    // Speed -> hue
    float baseHue = uMaxHue - vSpeedNorm * (uMaxHue - uMinHue);
    float hue = mod(baseHue + uHueOffset, 360.0);

    // Blink modulation
    float sat = min(1.0, (uSaturation / 100.0) * (1.0 + vBlink * (uSaturationBoost - 1.0)));
    float lit = min(1.0, (uLightness / 100.0) * (1.0 + vBlink * (uIntensityBoost - 1.0)));

    // Convert to RGB first — energy modulation applied in RGB for HDR range
    vec3 color = hsl2rgb(hue, sat, lit);

    // Energy flow: layered sinusoids boost brightness (HDR)
    float energy1 = sin(vSegIdx * 6.2832 * 2.0 - uTime * uEnergySpeed * 1.0) * 0.5 + 0.5;
    float energy2 = sin(vSegIdx * 6.2832 * 5.0 - uTime * uEnergySpeed * 1.7) * 0.5 + 0.5;
    float energy3 = sin(vSegIdx * 6.2832 * 11.0 - uTime * uEnergySpeed * 2.3) * 0.5 + 0.5;
    float energy = energy1 * 0.5 + energy2 * 0.3 + energy3 * 0.2;
    color *= 1.0 + energy * uEnergyIntensity * 3.5;

    // Sparks: sharp bright HDR flashes (two layers like codepen)
    float sparkWave1 = sin(vSegIdx * 150.0 - uTime * 8.0);
    float sparkWave2 = cos(vSegIdx * 200.0 + uTime * 6.0);
    float spark = step(uSparkThreshold, sparkWave1) + step(uSparkThreshold + 0.005, sparkWave2) * 0.7;
    color += color * spark * uEnergyIntensity * 4.0;

    // Age -> alpha decay
    float alpha = (1.0 - vAge) * uMaxAlpha * (1.0 + vBlink * (uAlphaBoost - 1.0));
    alpha = clamp(alpha, 0.0, 1.0);

    // Premultiplied alpha output
    gl_FragColor = vec4(color * alpha, alpha);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// 2. BACKGROUND — Animated FBM noise with vignette
// ─────────────────────────────────────────────────────────────────────────────

export const BACKGROUND_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV = aUV;
}
`;

export const BACKGROUND_FRAGMENT = `
precision mediump float;

varying vec2 vUV;

uniform float uTime;
uniform vec3 uBaseColor;
uniform float uFogDensity;
uniform float uNoiseScale;
uniform float uAnimSpeed;

// Hash-based value noise (WebGL 1 compatible, no textures needed)
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = vUV;

    // Two noise layers moving in different directions
    float t = uTime * uAnimSpeed;
    float n1 = fbm(uv * uNoiseScale + vec2(t * 0.3, t * 0.1));
    float n2 = fbm(uv * uNoiseScale * 1.5 + vec2(-t * 0.2, t * 0.25));
    float n = (n1 + n2) * 0.5;

    // Vignette darkening at edges
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 2.0;
    vignette = clamp(vignette, 0.0, 1.0);

    // Combine base color with noise
    vec3 color = uBaseColor * (0.5 + n * 0.5) * vignette;
    float alpha = uFogDensity * vignette;

    gl_FragColor = vec4(color * alpha, alpha);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// 3. BLOOM BRIGHT EXTRACT
// ─────────────────────────────────────────────────────────────────────────────

export const BRIGHT_EXTRACT_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV = aUV;
}
`;

export const BRIGHT_EXTRACT_FRAGMENT = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uTexture;
uniform float uThreshold;

void main() {
    vec4 color = texture2D(uTexture, vUV);
    float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float brightness = smoothstep(uThreshold, uThreshold + 0.15, luminance);
    gl_FragColor = color * brightness;
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// 4. BLOOM BLUR (separable Gaussian, used for H and V pass)
// ─────────────────────────────────────────────────────────────────────────────

export const BLUR_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV = aUV;
}
`;

export const BLUR_FRAGMENT = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uTexture;
uniform vec2 uDirection;
uniform float uRadius;

void main() {
    // 9-tap Gaussian (sigma ~2.5)
    float weights[5];
    weights[0] = 0.2270270;
    weights[1] = 0.1945946;
    weights[2] = 0.1216216;
    weights[3] = 0.0540541;
    weights[4] = 0.0162162;

    vec4 color = texture2D(uTexture, vUV) * weights[0];

    for (int i = 1; i < 5; i++) {
        vec2 offset = uDirection * float(i) * uRadius;
        color += texture2D(uTexture, vUV + offset) * weights[i];
        color += texture2D(uTexture, vUV - offset) * weights[i];
    }

    gl_FragColor = color;
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// 5. BLOOM COMPOSITE — merge scene + bloom
// ─────────────────────────────────────────────────────────────────────────────

export const COMPOSITE_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV = aUV;
}
`;

export const COMPOSITE_FRAGMENT = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uSceneTexture;
uniform sampler2D uBloomTexture;
uniform float uBloomStrength;

void main() {
    vec4 scene = texture2D(uSceneTexture, vUV);
    vec4 bloom = texture2D(uBloomTexture, vUV);

    // Additive blend (HDR values clamp naturally on canvas composite)
    vec3 color = scene.rgb + bloom.rgb * uBloomStrength;

    float alpha = clamp(scene.a + bloom.a * uBloomStrength, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
}
`;

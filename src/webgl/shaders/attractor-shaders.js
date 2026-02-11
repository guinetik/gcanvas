/**
 * GLSL shader sources for the WebGL Attractor Pipeline.
 *
 * 6 shader programs:
 *   1. Attractor lines — GPU color math, energy flow, sparks, depth fog, iridescence
 *   2. Background      — animated FBM noise with vignette
 *   3. Bright extract  — bloom threshold pass
 *   4. Blur            — separable Gaussian blur (used twice: H + V)
 *   5. Composite       — additive bloom merge
 *   6. Post-process    — chromatic aberration, ACES tonemapping, color grading, film grain
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
attribute float aDepth;

varying float vSpeedNorm;
varying float vAge;
varying float vBlink;
varying float vSegIdx;
varying float vDepth;

uniform vec2 uResolution;

void main() {
    vec2 clipPos = (aPosition / uResolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;
    gl_Position = vec4(clipPos, 0.0, 1.0);

    vSpeedNorm = aSpeedNorm;
    vAge       = aAge;
    vBlink     = aBlink;
    vSegIdx    = aSegIdx;
    vDepth     = aDepth;
}
`;

export const ATTRACTOR_LINE_FRAGMENT = `
precision mediump float;

varying float vSpeedNorm;
varying float vAge;
varying float vBlink;
varying float vSegIdx;
varying float vDepth;

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

// Depth fog uniforms
uniform float uDepthFogEnabled;
uniform float uDepthFogDensity;
uniform float uDepthFogEnergyFalloff;

// Iridescence uniforms
uniform float uIridescenceEnabled;
uniform float uIridescenceIntensity;
uniform float uIridescenceSpeed;
uniform float uIridescenceScale;

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

// Iridescence: cos-based rainbow shift
vec3 iridescence(float idx, float time, float scale, float speed) {
    float phase = idx * scale + time * speed;
    return vec3(
        cos(phase) * 0.5 + 0.5,
        cos(phase + 2.094) * 0.5 + 0.5,
        cos(phase + 4.189) * 0.5 + 0.5
    );
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

    // Iridescence: rainbow color shifting along the trail
    if (uIridescenceEnabled > 0.5) {
        vec3 iri = iridescence(vSegIdx, uTime, uIridescenceScale, uIridescenceSpeed);
        color = mix(color, color * iri * 2.0, uIridescenceIntensity);
    }

    // Depth-based energy falloff: distant segments get less energy shimmer
    float depthFactor = 1.0;
    if (uDepthFogEnabled > 0.5) {
        depthFactor = mix(1.0, 1.0 - vDepth, uDepthFogEnergyFalloff);
        depthFactor = clamp(depthFactor, 0.0, 1.0);
    }

    // Energy flow: layered sinusoids boost brightness (HDR)
    float energy1 = sin(vSegIdx * 6.2832 * 2.0 - uTime * uEnergySpeed * 1.0) * 0.5 + 0.5;
    float energy2 = sin(vSegIdx * 6.2832 * 5.0 - uTime * uEnergySpeed * 1.7) * 0.5 + 0.5;
    float energy3 = sin(vSegIdx * 6.2832 * 11.0 - uTime * uEnergySpeed * 2.3) * 0.5 + 0.5;
    float energy4 = sin(vSegIdx * 6.2832 * 17.0 - uTime * uEnergySpeed * 3.1) * 0.5 + 0.5;
    float energy = energy1 * 0.4 + energy2 * 0.25 + energy3 * 0.2 + energy4 * 0.15;
    color *= 1.0 + energy * uEnergyIntensity * 3.5 * depthFactor;

    // Sparks: sharp bright HDR flashes (two layers like codepen)
    float sparkWave1 = sin(vSegIdx * 150.0 - uTime * 8.0);
    float sparkWave2 = cos(vSegIdx * 200.0 + uTime * 6.0);
    float spark = step(uSparkThreshold, sparkWave1) + step(uSparkThreshold + 0.005, sparkWave2) * 0.7;
    color += color * spark * uEnergyIntensity * 4.0 * depthFactor;

    // Fresnel-like rim glow: brightness boost at mid-depth range
    if (uDepthFogEnabled > 0.5) {
        float rim = 1.0 - abs(vDepth - 0.4) * 2.0;
        rim = clamp(rim, 0.0, 1.0) * 0.3;
        color *= 1.0 + rim;
    }

    // Age -> alpha decay
    float alpha = (1.0 - vAge) * uMaxAlpha * (1.0 + vBlink * (uAlphaBoost - 1.0));
    alpha = clamp(alpha, 0.0, 1.0);

    // Depth fog: smoothstep fade on alpha for distant segments
    if (uDepthFogEnabled > 0.5) {
        float fogFade = 1.0 - smoothstep(0.3, 1.0, vDepth * uDepthFogDensity);
        alpha *= fogFade;
    }

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

    // Additive blend (HDR values preserved for post-processing)
    vec3 color = scene.rgb + bloom.rgb * uBloomStrength;

    float alpha = clamp(scene.a + bloom.a * uBloomStrength, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST-PROCESS — chromatic aberration, ACES tonemapping, color grading
// ─────────────────────────────────────────────────────────────────────────────

export const POST_PROCESS_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    vUV = aUV;
}
`;

export const POST_PROCESS_FRAGMENT = `
precision mediump float;

varying vec2 vUV;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

// Chromatic aberration
uniform float uChromAbEnabled;
uniform float uChromAbStrength;
uniform float uChromAbFalloff;

// Color grading
uniform float uColorGradingEnabled;
uniform float uExposure;
uniform float uVignetteStrength;
uniform float uVignetteRadius;
uniform float uGrainIntensity;
uniform float uWarmth;

// Hash for film grain
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// ACES filmic tonemapping
vec3 acesTonemap(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
    vec2 uv = vUV;
    vec2 center = uv - 0.5;
    float dist = length(center);

    // Sample with alpha from center tap (input is premultiplied)
    vec4 centerSample = texture2D(uTexture, uv);
    float alpha = centerSample.a;
    vec3 color;

    if (uChromAbEnabled > 0.5) {
        // Radial chromatic aberration: R inward, B outward, G center
        float aberration = uChromAbStrength * pow(dist, uChromAbFalloff);
        vec2 dir = normalize(center + 0.0001); // avoid div by zero

        vec2 uvR = uv - dir * aberration;
        vec2 uvB = uv + dir * aberration;

        color.r = texture2D(uTexture, uvR).r;
        color.g = centerSample.g;
        color.b = texture2D(uTexture, uvB).b;
    } else {
        color = centerSample.rgb;
    }

    if (uColorGradingEnabled > 0.5) {
        // Exposure
        color *= uExposure;

        // ACES filmic tonemapping
        color = acesTonemap(color);

        // Warm shadow tinting: add warmth in dark regions
        float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        float shadowMask = 1.0 - smoothstep(0.0, 0.4, luminance);
        color += vec3(0.1, 0.05, 0.0) * shadowMask * uWarmth;

        // Vignette (subtle — background already has its own vignette)
        float vignette = smoothstep(uVignetteRadius, uVignetteRadius - uVignetteStrength, dist);
        color *= vignette;

        // Film grain
        float grain = hash(uv * uResolution + fract(uTime * 7.0)) - 0.5;
        color += grain * uGrainIntensity;
    }

    // Pass through — input is already premultiplied, processing preserves that
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
}
`;

// Post-process shader — chromatic aberration, ACES tonemapping, color grading, film grain.
// Port of POST_PROCESS_FRAGMENT from src/webgl/shaders/attractor-shaders.js.

struct Uniforms {
    resolution: vec2f,
    time: f32,
    chromAbEnabled: f32,
    chromAbStrength: f32,
    chromAbFalloff: f32,
    colorGradingEnabled: f32,
    exposure: f32,
    vignetteStrength: f32,
    vignetteRadius: f32,
    grainIntensity: f32,
    warmth: f32,
    bleach: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn acesTonemap(x: vec3f) -> vec3f {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let center = uv - 0.5;
    let dist = length(center);

    let centerSample = textureSample(tex, texSampler, uv);
    let alpha = centerSample.a;
    var color: vec3f;

    if (u.chromAbEnabled > 0.5) {
        let aberration = u.chromAbStrength * pow(dist, u.chromAbFalloff);
        let dir = normalize(center + 0.0001);

        let uvR = uv - dir * aberration;
        let uvB = uv + dir * aberration;

        color.r = textureSample(tex, texSampler, uvR).r;
        color.g = centerSample.g;
        color.b = textureSample(tex, texSampler, uvB).b;
    } else {
        color = centerSample.rgb;
    }

    if (u.colorGradingEnabled > 0.5) {
        color *= u.exposure;
        color = acesTonemap(color);

        let luminance = dot(color, vec3f(0.2126, 0.7152, 0.0722));

        // Bleach to white when at least two channels are high — i.e. the
        // color is actually desaturating through overexposure, not just a
        // pure saturated hue. Using the median channel (not max, not
        // luminance) ignores pure-hue peaks like a bright red (1,0,0) while
        // letting genuinely-blown cores (1, 0.9, 0.8) go white.
        let mx = max(color.r, max(color.g, color.b));
        let mn = min(color.r, min(color.g, color.b));
        let medianChannel = color.r + color.g + color.b - mx - mn;
        let bleach = smoothstep(0.75, 1.0, medianChannel) * u.bleach;
        color = mix(color, vec3f(1.0), bleach);

        let shadowMask = 1.0 - smoothstep(0.0, 0.4, luminance);
        color += vec3f(0.1, 0.05, 0.0) * shadowMask * u.warmth;

        let vignette = smoothstep(u.vignetteRadius, u.vignetteRadius - u.vignetteStrength, dist);
        color *= vignette;

        let grain = hash(uv * u.resolution + fract(u.time * 7.0)) - 0.5;
        color += grain * u.grainIntensity;
    }

    color = clamp(color, vec3f(0.0), vec3f(1.0));
    return vec4f(color, alpha);
}
